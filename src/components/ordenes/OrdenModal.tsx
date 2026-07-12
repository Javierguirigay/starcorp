"use client";

/**
 * Alta/edición de una orden. Los campos de cabecera dependen del tipo
 * (proveedor+condiciones en compra, destinatario+locación+transporte en
 * entrega, solicitante+motivo en requerimiento) y solo la orden de compra
 * lleva precios y totales.
 */
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Orden, RenglonOrden, TipoOrden } from "@/lib/types";
import { fmtISO, formatNumberVE, parseVES } from "@/lib/format";
import { renglonVacio, TITULO_ORDEN, totalesOrden, totalRenglonOrden } from "@/lib/negocio/ordenes";
import { round2 } from "@/lib/negocio/nomina";
import { Modal } from "@/components/ui/Modal";
import { useOrdenes } from "./OrdenesProvider";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

const ETIQUETA_CONTRAPARTE: Record<TipoOrden, string> = {
  compra: "Proveedor",
  entrega: "Destinatario",
  requerimiento: "Solicitante",
};

export function OrdenModal({
  tipo,
  orden,
  onToast,
  onClose,
}: {
  tipo: TipoOrden;
  orden: Orden | null;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const ord = useOrdenes();
  const conPrecios = tipo === "compra";

  const [fecha, setFecha] = useState(orden?.fecha ?? fmtISO(new Date()));
  const [contraparteNombre, setContraparteNombre] = useState(orden?.contraparteNombre ?? "");
  const [contraparteRif, setContraparteRif] = useState(orden?.contraparteRif ?? "");
  const [condicionesPago, setCondicionesPago] = useState(orden?.condicionesPago ?? "");
  const [locacion, setLocacion] = useState(orden?.locacion ?? "");
  const [transporte, setTransporte] = useState(orden?.transporte ?? "");
  const [motivo, setMotivo] = useState(orden?.motivo ?? "");
  const [observaciones, setObservaciones] = useState(orden?.observaciones ?? "");
  const [elaboradoPor, setElaboradoPor] = useState(orden?.elaboradoPor ?? "");
  const [aprobadoPor, setAprobadoPor] = useState(orden?.aprobadoPor ?? "");
  const [recibidoPor, setRecibidoPor] = useState(orden?.recibidoPor ?? "");
  const [renglones, setRenglones] = useState<RenglonOrden[]>(
    orden?.renglones.length ? orden.renglones : [renglonVacio()]
  );

  const totales = totalesOrden(renglones);

  const cambiar = (i: number, campo: keyof RenglonOrden, valor: string) => {
    setRenglones((prev) =>
      prev.map((r, j) => {
        if (j !== i) return r;
        if (campo === "cantidad") return { ...r, cantidad: parseVES(valor) };
        if (campo === "precioUnitBs") return { ...r, precioUnitBs: parseVES(valor) };
        return { ...r, [campo]: valor };
      })
    );
  };

  const guardar = () => {
    if (!contraparteNombre.trim())
      return onToast(`Indica el ${ETIQUETA_CONTRAPARTE[tipo].toLowerCase()}`);
    if (!elaboradoPor.trim())
      return onToast(tipo === "requerimiento" ? "Indica quién solicita" : "Indica quién elabora");
    const limpios = renglones.filter((r) => r.descripcion.trim() && r.cantidad > 0);
    if (!limpios.length) return onToast("Agrega al menos un renglón con descripción y cantidad");

    const datos = {
      tipo,
      fecha,
      contraparteNombre: contraparteNombre.trim(),
      ...(contraparteRif.trim() ? { contraparteRif: contraparteRif.trim() } : {}),
      renglones: limpios.map((r) => ({
        cantidad: round2(r.cantidad),
        unidad: r.unidad.trim() || "Und",
        descripcion: r.descripcion.trim(),
        ...(conPrecios ? { precioUnitBs: round2(r.precioUnitBs ?? 0) } : {}),
      })),
      ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
      elaboradoPor: elaboradoPor.trim(),
      ...(aprobadoPor.trim() ? { aprobadoPor: aprobadoPor.trim() } : {}),
      ...(recibidoPor.trim() ? { recibidoPor: recibidoPor.trim() } : {}),
      ...(conPrecios && condicionesPago.trim() ? { condicionesPago: condicionesPago.trim() } : {}),
      ...(tipo === "entrega" && locacion.trim() ? { locacion: locacion.trim() } : {}),
      ...(tipo === "entrega" && transporte.trim() ? { transporte: transporte.trim() } : {}),
      ...(tipo === "requerimiento" && motivo.trim() ? { motivo: motivo.trim() } : {}),
    };

    if (orden) {
      ord.editarOrden(orden.id, datos);
      onToast(`${TITULO_ORDEN[tipo]} ${orden.numero} actualizada`);
    } else {
      ord.crearOrden(datos);
      onToast(`${TITULO_ORDEN[tipo]} registrada`);
    }
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={orden ? `Editar ${TITULO_ORDEN[tipo]} ${orden.numero}` : `Nueva ${TITULO_ORDEN[tipo]}`}
      subtitle={conPrecios ? "Montos en Bs · IVA 16% automático" : "LOTER, C.A."}
      maxWidth="max-w-5xl"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
          >
            {orden ? "Guardar cambios" : "Registrar orden"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Cabecera */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-600 text-navy-900">
              {ETIQUETA_CONTRAPARTE[tipo]}
            </label>
            <input
              type="text"
              value={contraparteNombre}
              onChange={(e) => setContraparteNombre(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-600 text-navy-900">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-600 text-navy-900">RIF / C.I.</label>
            <input
              type="text"
              value={contraparteRif}
              onChange={(e) => setContraparteRif(e.target.value)}
              placeholder="Opcional"
              className={`${inputCls} font-mono`}
            />
          </div>

          {conPrecios && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-600 text-navy-900">
                Condiciones de pago
              </label>
              <input
                type="text"
                value={condicionesPago}
                onChange={(e) => setCondicionesPago(e.target.value)}
                placeholder="Ej. 30 días · Contado"
                className={inputCls}
              />
            </div>
          )}

          {tipo === "entrega" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">
                  Locación de entrega
                </label>
                <input
                  type="text"
                  value={locacion}
                  onChange={(e) => setLocacion(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">Transporte</label>
                <input
                  type="text"
                  value={transporte}
                  onChange={(e) => setTransporte(e.target.value)}
                  placeholder="Vehículo / chofer"
                  className={inputCls}
                />
              </div>
            </>
          )}

          {tipo === "requerimiento" && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-600 text-navy-900">Motivo</label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Justificación del requerimiento"
                className={inputCls}
              />
            </div>
          )}
        </div>

        {/* Renglones */}
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-600 uppercase tracking-wide text-slate-400">Renglones</p>
            <button
              onClick={() => setRenglones((p) => [...p, renglonVacio()])}
              className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar renglón
            </button>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th className="pb-1 font-600">Cant.</th>
                <th className="pb-1 font-600">Unidad</th>
                <th className="pb-1 font-600">Descripción</th>
                {conPrecios && <th className="pb-1 text-right font-600">P. Unit. Bs</th>}
                {conPrecios && <th className="pb-1 text-right font-600">Total Bs</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {renglones.map((r, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={r.cantidad === 0 ? "" : formatNumberVE(r.cantidad)}
                      onChange={(e) => cambiar(i, "cantidad", e.target.value)}
                      className={`${inputCls} w-20 text-right font-mono`}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="text"
                      value={r.unidad}
                      onChange={(e) => cambiar(i, "unidad", e.target.value)}
                      className={`${inputCls} w-24`}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="text"
                      value={r.descripcion}
                      onChange={(e) => cambiar(i, "descripcion", e.target.value)}
                      className={inputCls}
                    />
                  </td>
                  {conPrecios && (
                    <td className="py-1 pr-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={r.precioUnitBs ? formatNumberVE(r.precioUnitBs) : ""}
                        onChange={(e) => cambiar(i, "precioUnitBs", e.target.value)}
                        placeholder="0,00"
                        className={`${inputCls} w-28 text-right font-mono`}
                      />
                    </td>
                  )}
                  {conPrecios && (
                    <td className="py-1 pr-2 text-right font-mono text-sm text-navy-900">
                      {formatNumberVE(totalRenglonOrden(r))}
                    </td>
                  )}
                  <td className="py-1 text-right">
                    <button
                      onClick={() =>
                        setRenglones((p) =>
                          p.length === 1 ? [renglonVacio()] : p.filter((_, j) => j !== i)
                        )
                      }
                      title="Quitar renglón"
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {conPrecios && (
            <div className="mt-3 flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatNumberVE(totales.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>IVA 16%</span>
                  <span className="font-mono">{formatNumberVE(totales.iva)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-700 text-navy-950">
                  <span>Total Bs</span>
                  <span className="font-mono">{formatNumberVE(totales.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Observaciones y firmas */}
        <div>
          <label className="mb-1 block text-sm font-600 text-navy-900">Observaciones</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            placeholder="Opcional"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-600 text-navy-900">
              {tipo === "requerimiento"
                ? "Solicitado por"
                : tipo === "entrega"
                  ? "Entregado por"
                  : "Elaborado por"}
            </label>
            <input
              type="text"
              value={elaboradoPor}
              onChange={(e) => setElaboradoPor(e.target.value)}
              className={inputCls}
            />
          </div>
          {tipo !== "entrega" && (
            <div>
              <label className="mb-1 block text-sm font-600 text-navy-900">Aprobado por</label>
              <input
                type="text"
                value={aprobadoPor}
                onChange={(e) => setAprobadoPor(e.target.value)}
                placeholder="Opcional"
                className={inputCls}
              />
            </div>
          )}
          {tipo !== "requerimiento" && (
            <div>
              <label className="mb-1 block text-sm font-600 text-navy-900">Recibido por</label>
              <input
                type="text"
                value={recibidoPor}
                onChange={(e) => setRecibidoPor(e.target.value)}
                placeholder="Opcional"
                className={inputCls}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
