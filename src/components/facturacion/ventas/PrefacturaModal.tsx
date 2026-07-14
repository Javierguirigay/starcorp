"use client";

/**
 * Editor de pre-factura (USD). Puede nacer desde cero o pre-llenada desde
 * reportes de servicio del mismo cliente: un renglón por período (CAN = días,
 * descripción = concepto + rango de fechas), todo editable; los traslados se
 * agregan como renglones manuales (CAN = 1).
 */
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { PreFactura, ReporteServicio } from "@/lib/types";
import { fmtISO, formatNumberVE, money, parseVES } from "@/lib/format";
import { renglonDeReporte, totalesRenglones } from "@/lib/negocio/facturacion";
import { round2 } from "@/lib/negocio/nomina";
import { Modal } from "@/components/ui/Modal";
import { useFacturacion } from "../FacturacionProvider";
import { ClienteModal } from "./ClienteModal";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

interface RenglonForm {
  key: number;
  canTexto: string;
  descripcion: string;
  pUnitTexto: string;
}

export function PrefacturaModal({
  prefactura,
  reportes,
  onToast,
  onGuardada,
  onClose,
}: {
  prefactura: PreFactura | null;
  /** Reportes pendientes seleccionados (creación desde reportes). */
  reportes?: ReporteServicio[];
  onToast: (msg: string) => void;
  onGuardada?: () => void;
  onClose: () => void;
}) {
  const fac = useFacturacion();

  const inicialRenglones = (): RenglonForm[] => {
    if (prefactura)
      return prefactura.renglones.map((r, i) => ({
        key: i + 1,
        canTexto: String(r.can),
        descripcion: r.descripcion,
        pUnitTexto: formatNumberVE(r.pUnit),
      }));
    if (reportes?.length)
      return reportes
        .flatMap((r) => r.periodos)
        .map((p, i) => {
          const sug = renglonDeReporte(p);
          return {
            key: i + 1,
            canTexto: String(sug.can),
            descripcion: sug.descripcion,
            // Precarga la tarifa referencial del catálogo (editable); vacío si fue texto libre.
            pUnitTexto: sug.pUnit ? formatNumberVE(sug.pUnit) : "",
          };
        });
    return [{ key: 1, canTexto: "1", descripcion: "", pUnitTexto: "" }];
  };

  const reporteBase = reportes?.[0];
  const [numero, setNumero] = useState(prefactura?.numero ?? fac.siguienteNumeroPrefactura());
  const [fecha, setFecha] = useState(prefactura?.fecha ?? fmtISO(new Date()));
  const [clienteId, setClienteId] = useState<number | "">(
    prefactura?.clienteId ?? reporteBase?.clienteId ?? ""
  );
  const [condiciones, setCondiciones] = useState(prefactura?.condicionesPago ?? "");
  const [locacion, setLocacion] = useState(
    prefactura?.locacion ?? (reporteBase?.pozo ? `POZO ${reporteBase.pozo}` : reporteBase?.locacion ?? "")
  );
  const [renglones, setRenglones] = useState<RenglonForm[]>(inicialRenglones);
  const [nextKey, setNextKey] = useState(renglones.length + 1);
  const [modalCliente, setModalCliente] = useState(false);

  const parseados = renglones.map((r, i) => ({
    id: i + 1,
    can: parseInt(r.canTexto, 10) || 0,
    descripcion: r.descripcion.trim(),
    pUnit: round2(parseVES(r.pUnitTexto)),
  }));
  const totales = totalesRenglones(parseados.filter((r) => r.can > 0));

  const editarRenglon = (key: number, cambios: Partial<RenglonForm>) =>
    setRenglones((prev) => prev.map((r) => (r.key === key ? { ...r, ...cambios } : r)));

  const guardar = () => {
    const num = numero.trim();
    if (!num) return onToast("Indica el número de la pre-factura");
    if (fac.prefacturas.some((p) => p.numero === num && p.id !== prefactura?.id))
      return onToast(`Ya existe la pre-factura N° ${num}`);
    if (!fecha) return onToast("Indica la fecha");
    if (clienteId === "") return onToast("Selecciona el cliente");
    const validos = parseados.filter((r) => r.can > 0 && r.descripcion);
    if (!validos.length)
      return onToast("Agrega al menos un renglón con cantidad y descripción");
    const datos = {
      numero: num,
      fecha,
      clienteId,
      condicionesPago: condiciones.trim(),
      renglones: validos.map((r, i) => ({ ...r, id: i + 1 })),
      locacion: locacion.trim(),
    };
    if (prefactura) {
      fac.editarPrefactura(prefactura.id, datos);
      onToast("Pre-factura actualizada");
    } else {
      fac.crearPrefactura(datos, reportes?.map((r) => r.id) ?? []);
      onToast(`Pre-factura N° ${num} creada (borrador)`);
      onGuardada?.();
    }
    onClose();
  };

  return (
    <>
      <Modal
        onClose={onClose}
        title={prefactura ? `Editar pre-factura N° ${prefactura.numero}` : "Nueva pre-factura"}
        subtitle={
          reportes?.length
            ? `Desde ${reportes.length} reporte(s) de servicio · montos en USD`
            : "Documento en USD · el correlativo es editable"
        }
        maxWidth="max-w-4xl"
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
              {prefactura ? "Guardar cambios" : "Crear pre-factura"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-600 text-navy-900">N° Pre-Factura</label>
              <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-600 text-navy-900">Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-600 text-navy-900">Cliente</label>
                <button
                  onClick={() => setModalCliente(true)}
                  className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
                >
                  <Plus className="h-3.5 w-3.5" /> Nuevo cliente
                </button>
              </div>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value === "" ? "" : Number(e.target.value))}
                className={inputCls}
              >
                <option value="">Selecciona…</option>
                {fac.clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.razonSocial}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-600 text-navy-900">Condiciones de pago</label>
              <input type="text" value={condiciones} onChange={(e) => setCondiciones(e.target.value)} placeholder="Ej: Contado" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-600 text-navy-900">Locación (última línea de la descripción)</label>
              <input type="text" value={locacion} onChange={(e) => setLocacion(e.target.value)} placeholder="POZO SBC-37" className={inputCls} />
            </div>
          </div>

          {/* Renglones */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-600 text-navy-900">Renglones</label>
              <button
                onClick={() => {
                  setRenglones((prev) => [
                    ...prev,
                    { key: nextKey, canTexto: "1", descripcion: "", pUnitTexto: "" },
                  ]);
                  setNextKey((k) => k + 1);
                }}
                className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
              >
                <Plus className="h-3.5 w-3.5" /> Añadir renglón (traslados: CAN = 1)
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="w-20 px-3 py-2 font-600">CAN</th>
                    <th className="px-3 py-2 font-600">Descripción</th>
                    <th className="w-32 px-3 py-2 text-right font-600">P. Unit. ($)</th>
                    <th className="w-28 px-3 py-2 text-right font-600">Total</th>
                    <th className="w-12 px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {renglones.map((r, i) => (
                    <tr key={r.key}>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          value={r.canTexto}
                          onChange={(e) => editarRenglon(r.key, { canTexto: e.target.value })}
                          className={`${inputCls} text-right font-mono`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <textarea
                          rows={2}
                          value={r.descripcion}
                          onChange={(e) => editarRenglon(r.key, { descripcion: e.target.value })}
                          placeholder="SERVICIO DE ALQUILER DE … DEL 13/06/2026 AL 01/07/2026"
                          className={`${inputCls} resize-none`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={r.pUnitTexto}
                          onChange={(e) => editarRenglon(r.key, { pUnitTexto: e.target.value })}
                          className={`${inputCls} text-right font-mono`}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-navy-900">
                        {money(round2(parseados[i].can * parseados[i].pUnit))}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          title="Quitar renglón"
                          onClick={() => setRenglones((prev) => prev.filter((x) => x.key !== r.key))}
                          disabled={renglones.length === 1}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50/60 font-600 text-navy-900">
                    <td colSpan={3} className="px-3 py-2 text-right">SUB - TOTAL</td>
                    <td className="px-3 py-2 text-right font-mono">{money(totales.subtotal)}</td>
                    <td />
                  </tr>
                  <tr className="bg-slate-50/60 font-600 text-navy-900">
                    <td colSpan={3} className="px-3 py-2 text-right">IVA 16%</td>
                    <td className="px-3 py-2 text-right font-mono">{money(totales.iva)}</td>
                    <td />
                  </tr>
                  <tr className="bg-slate-50/60 font-700 text-navy-950">
                    <td colSpan={3} className="px-3 py-2 text-right">TOTAL A PAGAR</td>
                    <td className="px-3 py-2 text-right font-mono">{money(totales.total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {modalCliente && (
        <ClienteModal
          onCreado={(id) => setClienteId(id)}
          onToast={onToast}
          onClose={() => setModalCliente(false)}
        />
      )}
    </>
  );
}
