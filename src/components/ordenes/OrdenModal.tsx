"use client";

/**
 * Alta/edición de una orden. Los campos de cabecera dependen del tipo
 * (proveedor+condiciones en compra, destinatario+locación+transporte en
 * entrega, solicitante+motivo en requerimiento) y solo la orden de compra
 * lleva precios y totales.
 *
 * Renglones vinculables al inventario: en entrega (consumibles y equipos
 * disponibles) y en compra (solo consumibles). Al guardar una orden de
 * entrega se valida el stock (bloqueante) y se aplica al inventario:
 * descuento de consumibles, asignación (salida temporal) o baja (definitiva)
 * de equipos, todo registrado en el kardex con la referencia OE-xxxx.
 */
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ModoSalidaEquipo, Orden, RenglonOrden, TipoOrden } from "@/lib/types";
import { fmtISO, formatNumberVE, parseVES } from "@/lib/format";
import { renglonVacio, TITULO_ORDEN, totalesOrden, totalRenglonOrden } from "@/lib/negocio/ordenes";
import { equiposDisponibles, estadoStock } from "@/lib/negocio/inventario";
import { validarStockSalidas } from "@/lib/negocio/movimientosInventario";
import { round2 } from "@/lib/negocio/nomina";
import { Modal } from "@/components/ui/Modal";
import { useInventario } from "@/components/inventario/InventarioProvider";
import { UbicacionSelect } from "@/components/inventario/UbicacionSelect";
import { ArticuloCombo, type OpcionArticulo } from "@/components/inventario/ArticuloCombo";
import { empresaUsaInventario } from "@/lib/modulos";
import { useOrdenes, type OrdenDatos } from "./OrdenesProvider";

/** Sufijo impreso en el PDF para distinguir la venta/baja del préstamo. */
const SUFIJO_DEFINITIVA = " (entrega definitiva)";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

const ETIQUETA_CONTRAPARTE: Record<TipoOrden, string> = {
  compra: "Proveedor",
  entrega: "Destinatario",
  requerimiento: "Solicitante",
};

/**
 * Los montos del renglón se editan como TEXTO, no como número derivado: si el
 * value del input se recalcula con formatNumberVE en cada tecla, el cursor
 * queda atrapado detrás de los decimales ("1,00" + "0" -> parsea 1,001 ->
 * vuelve a "1,00") y no se puede ni borrar ni escribir cifras largas. Mismo
 * patrón que los montos de Finanzas (montoTexto + parseVES al usarlo).
 */
type RenglonDraft = Omit<RenglonOrden, "cantidad" | "precioUnitBs"> & {
  cantidadTexto: string;
  precioTexto: string;
};

/** Número -> texto editable: los enteros van limpios ("1", no "1,00"). */
const textoNum = (n: number | undefined): string =>
  !n ? "" : Number.isInteger(n) ? String(n) : formatNumberVE(n);

const aDraft = (r: RenglonOrden): RenglonDraft => ({
  unidad: r.unidad,
  descripcion: r.descripcion,
  ...(r.refInventario ? { refInventario: r.refInventario } : {}),
  cantidadTexto: textoNum(r.cantidad),
  precioTexto: textoNum(r.precioUnitBs),
});

const aRenglon = (d: RenglonDraft): RenglonOrden => ({
  cantidad: parseVES(d.cantidadTexto),
  unidad: d.unidad,
  descripcion: d.descripcion,
  precioUnitBs: parseVES(d.precioTexto),
  ...(d.refInventario ? { refInventario: d.refInventario } : {}),
});

export function OrdenModal({
  tipo,
  orden,
  plantilla,
  onToast,
  onClose,
}: {
  tipo: TipoOrden;
  orden: Orden | null;
  /** Valores iniciales para un ALTA prellenada (ej. requerimiento generado
      desde un mantenimiento). Ignorada al editar (orden != null). */
  plantilla?: OrdenDatos;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const ord = useOrdenes();
  const inv = useInventario();
  const conPrecios = tipo === "compra";
  // Vínculo con inventario: entrega (consumibles + equipos) y compra (solo
  // consumibles). El requerimiento es una solicitud: texto libre. Además, solo
  // las empresas con Inventario operativo (hoy LOTER) enlazan al kardex; para
  // las demás la orden es un documento de texto.
  const conInventario = tipo !== "requerimiento" && empresaUsaInventario(ord.empresa.key);
  const conEquipos = tipo === "entrega";

  const catalogoConsumibles = [...inv.consumibles].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es")
  );
  const disponibles = equiposDisponibles(inv.equipos, inv.mantenimientos, inv.asignaciones);

  const [fecha, setFecha] = useState(orden?.fecha ?? plantilla?.fecha ?? fmtISO(new Date()));
  const [contraparteNombre, setContraparteNombre] = useState(
    orden?.contraparteNombre ?? plantilla?.contraparteNombre ?? ""
  );
  const [contraparteRif, setContraparteRif] = useState(
    orden?.contraparteRif ?? plantilla?.contraparteRif ?? ""
  );
  const [condicionesPago, setCondicionesPago] = useState(orden?.condicionesPago ?? "");
  const [locacion, setLocacion] = useState(orden?.locacion ?? "");
  const [transporte, setTransporte] = useState(orden?.transporte ?? "");
  const [motivo, setMotivo] = useState(orden?.motivo ?? plantilla?.motivo ?? "");
  const [observaciones, setObservaciones] = useState(
    orden?.observaciones ?? plantilla?.observaciones ?? ""
  );
  const [elaboradoPor, setElaboradoPor] = useState(
    orden?.elaboradoPor ?? plantilla?.elaboradoPor ?? ""
  );
  const [aprobadoPor, setAprobadoPor] = useState(orden?.aprobadoPor ?? plantilla?.aprobadoPor ?? "");
  const [recibidoPor, setRecibidoPor] = useState(orden?.recibidoPor ?? "");
  const [renglones, setRenglones] = useState<RenglonDraft[]>(
    (orden?.renglones.length
      ? orden.renglones
      : plantilla?.renglones.length
        ? plantilla.renglones
        : [renglonVacio()]
    ).map(aDraft)
  );

  const totales = totalesOrden(renglones.map(aRenglon));

  const cambiar = (i: number, campo: keyof RenglonDraft, valor: string) =>
    setRenglones((prev) => prev.map((r, j) => (j === i ? { ...r, [campo]: valor } : r)));

  /**
   * Sugerencias del buscador de artículo. `equipoFila` es el equipo ya elegido
   * en ese renglón: se conserva como opción aunque no derive "Disponible"
   * (caso edición: lo tomó esta misma orden).
   */
  const opcionesArticulo = (equipoFila?: { id: number; codigo: string }): OpcionArticulo[] => {
    const opciones: OpcionArticulo[] = catalogoConsumibles.map((c) => ({
      valor: `c:${c.id}`,
      etiqueta: c.nombre,
      detalle: `${c.cantidad} ${c.unidad}`,
      grupo: "Consumibles",
    }));
    if (!conEquipos) return opciones;
    if (equipoFila && !disponibles.some((d) => d.id === equipoFila.id))
      opciones.push({ valor: `e:${equipoFila.id}`, etiqueta: equipoFila.codigo, grupo: "Equipos disponibles" });
    return opciones.concat(
      disponibles.map((e) => ({
        valor: `e:${e.id}`,
        etiqueta: e.codigo,
        detalle: e.ubicacion,
        grupo: "Equipos disponibles",
      }))
    );
  };

  const vincular = (i: number, valor: string) => {
    setRenglones((prev) =>
      prev.map((r, j) => {
        if (j !== i) return r;
        if (valor === "") {
          // Desvincular: se conserva el texto del catálogo como punto de
          // partida editable en lugar de dejar la fila en blanco.
          const libre = { ...r };
          delete libre.refInventario;
          return libre;
        }
        const [clase, idStr] = valor.split(":");
        const id = Number(idStr);
        if (clase === "c") {
          const c = inv.consumiblePorId(id);
          if (!c) return r;
          return {
            ...r,
            descripcion: c.nombre,
            unidad: c.unidad,
            refInventario: { clase: "consumible" as const, id },
          };
        }
        const e = inv.equipoPorId(id);
        if (!e) return r;
        // Los equipos son piezas únicas: salen de a 1.
        return {
          ...r,
          cantidadTexto: "1",
          unidad: "Und",
          descripcion: e.codigo,
          refInventario: { clase: "equipo" as const, id, modoSalida: "temporal" as const },
        };
      })
    );
  };

  const cambiarModo = (i: number, modo: ModoSalidaEquipo) =>
    setRenglones((prev) =>
      prev.map((r, j) =>
        j === i && r.refInventario?.clase === "equipo"
          ? { ...r, refInventario: { ...r.refInventario, modoSalida: modo } }
          : r
      )
    );

  /** Descripción final del renglón: para los vinculados se recalcula del
      catálogo (snapshot fresco) y la salida definitiva lleva su sufijo. */
  const descripcionFinal = (r: RenglonOrden): string => {
    const ref = r.refInventario;
    if (ref?.clase === "consumible") return inv.consumiblePorId(ref.id)?.nombre ?? r.descripcion.trim();
    if (ref?.clase === "equipo") {
      const base = inv.equipoPorId(ref.id)?.codigo ?? r.descripcion.trim().replace(SUFIJO_DEFINITIVA, "");
      return ref.modoSalida === "definitiva" ? base + SUFIJO_DEFINITIVA : base;
    }
    return r.descripcion.trim();
  };

  const guardar = () => {
    if (!contraparteNombre.trim())
      return onToast(`Indica el ${ETIQUETA_CONTRAPARTE[tipo].toLowerCase()}`);
    if (!elaboradoPor.trim())
      return onToast(tipo === "requerimiento" ? "Indica quién solicita" : "Indica quién elabora");
    // Un renglón con contenido pero sin cantidad se avisa en vez de descartarse
    // en silencio: descartarlo hacía "desaparecer" lo que el usuario escribió.
    const conContenido = renglones.map(aRenglon).filter((r) => r.refInventario || r.descripcion.trim());
    if (!conContenido.length) return onToast("Agrega al menos un renglón con descripción");
    const sinCantidad = conContenido.findIndex((r) => !(r.cantidad > 0));
    if (sinCantidad >= 0) return onToast(`Indica la cantidad del renglón ${sinCantidad + 1}`);

    const limpios = conContenido.map((r) => ({
      cantidad: r.refInventario?.clase === "equipo" ? 1 : round2(r.cantidad),
      unidad: r.unidad.trim() || "Und",
      descripcion: descripcionFinal(r),
      ...(conPrecios ? { precioUnitBs: round2(r.precioUnitBs ?? 0) } : {}),
      ...(r.refInventario ? { refInventario: r.refInventario } : {}),
    }));

    // Validación de stock BLOQUEANTE: entregar sin existencias corrompe el
    // kardex; si el físico difiere, se corrige antes con una entrada/ajuste.
    if (conInventario && tipo === "entrega") {
      const errores = validarStockSalidas(
        limpios,
        inv.consumibles,
        inv.equipos,
        inv.estadoDe,
        inv.movimientos,
        orden?.id
      );
      if (errores.length) return onToast(errores[0]);
    }

    const datos = {
      tipo,
      fecha,
      contraparteNombre: contraparteNombre.trim(),
      ...(contraparteRif.trim() ? { contraparteRif: contraparteRif.trim() } : {}),
      renglones: limpios,
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
      // Editar una entrega ya aplicada: revertir → guardar → reaplicar. Los
      // dispatch se procesan en orden, así el stock refleja solo la versión final.
      if (conInventario && tipo === "entrega") inv.revertirOrden(orden.id);
      ord.editarOrden(orden.id, datos);
      if (conInventario && tipo === "entrega")
        inv.aplicarOrdenEntrega({ ...orden, ...datos, id: orden.id, numero: orden.numero, tipo });
      onToast(`${TITULO_ORDEN[tipo]} ${orden.numero} actualizada`);
    } else {
      const nueva = ord.crearOrden(datos);
      if (conInventario && tipo === "entrega") inv.aplicarOrdenEntrega(nueva);
      onToast(`${TITULO_ORDEN[tipo]} registrada`);
    }
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={orden ? `Editar ${TITULO_ORDEN[tipo]} ${orden.numero}` : `Nueva ${TITULO_ORDEN[tipo]}`}
      subtitle={conPrecios ? "Montos en Bs · IVA 16% automático" : ord.empresa.nombre}
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
                <UbicacionSelect value={locacion} onChange={setLocacion} permitirLibre />
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
              onClick={() => setRenglones((p) => [...p, aDraft(renglonVacio())])}
              className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar renglón
            </button>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th className="pb-1 font-600">{conInventario ? "Artículo / Descripción" : "Descripción"}</th>
                <th className="pb-1 font-600">Cant.</th>
                <th className="pb-1 font-600">Unidad</th>
                {conPrecios && <th className="pb-1 text-right font-600">P. Unit. Bs</th>}
                {conPrecios && <th className="pb-1 text-right font-600">Total Bs</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {renglones.map((r, i) => {
                const esEquipo = r.refInventario?.clase === "equipo";
                const consumible =
                  r.refInventario?.clase === "consumible"
                    ? inv.consumiblePorId(r.refInventario.id)
                    : undefined;
                const cantidad = parseVES(r.cantidadTexto);
                const sinStock = !!consumible && cantidad > consumible.cantidad;
                // El equipo elegido se conserva como opción aunque ya no derive
                // "Disponible" (caso edición: lo tomó esta misma orden).
                const equipoActual = esEquipo ? inv.equipoPorId(r.refInventario!.id) : undefined;
                return (
                <tr key={i} className="align-top">
                  <td className="w-[38%] py-1 pr-2">
                    {conInventario ? (
                      <ArticuloCombo
                        value={r.descripcion}
                        vinculado={!!r.refInventario}
                        opciones={opcionesArticulo(equipoActual)}
                        onTexto={(t) => cambiar(i, "descripcion", t)}
                        onElegir={(valor) => vincular(i, valor)}
                        onDesvincular={() => vincular(i, "")}
                      />
                    ) : (
                      <input
                        type="text"
                        value={r.descripcion}
                        onChange={(e) => cambiar(i, "descripcion", e.target.value)}
                        placeholder="Descripción del renglón"
                        className={inputCls}
                      />
                    )}
                      {consumible && (
                        <p
                          className={`mt-1 text-[11px] ${
                            sinStock
                              ? "font-600 text-rose-600"
                              : estadoStock(consumible) === "ok"
                                ? "text-slate-400"
                                : "text-amber-600"
                          }`}
                        >
                          Stock: {consumible.cantidad} {consumible.unidad} · {consumible.ubicacion}
                        </p>
                      )}
                      {esEquipo && (
                        <select
                          value={r.refInventario!.modoSalida ?? "temporal"}
                          onChange={(e) => cambiarModo(i, e.target.value as ModoSalidaEquipo)}
                          className="mt-1 w-48 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-navy-700 outline-none focus:border-navy-400"
                        >
                          <option value="temporal">Salida temporal (a campo)</option>
                          <option value="definitiva">Salida definitiva (venta / baja)</option>
                        </select>
                    )}
                  </td>
                  {/* El ancho de estos campos lo reparte la columna de la tabla:
                      llenan su celda con w-full, no lleven anchos fijos. */}
                  <td className="py-1 pr-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={esEquipo ? "1" : r.cantidadTexto}
                      onChange={(e) => cambiar(i, "cantidadTexto", e.target.value)}
                      placeholder="0"
                      readOnly={esEquipo}
                      title={esEquipo ? "Los equipos salen de a 1 por renglón" : undefined}
                      className={`${inputCls} text-right font-mono ${esEquipo ? "bg-slate-50 text-slate-500" : ""}`}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="text"
                      value={r.unidad}
                      onChange={(e) => cambiar(i, "unidad", e.target.value)}
                      readOnly={!!r.refInventario}
                      className={`${inputCls} ${r.refInventario ? "bg-slate-50 text-slate-500" : ""}`}
                    />
                  </td>
                  {conPrecios && (
                    <td className="py-1 pr-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={r.precioTexto}
                        onChange={(e) => cambiar(i, "precioTexto", e.target.value)}
                        placeholder="0,00"
                        className={`${inputCls} text-right font-mono`}
                      />
                    </td>
                  )}
                  {conPrecios && (
                    <td className="py-1 pr-2 text-right font-mono text-sm text-navy-900">
                      {formatNumberVE(totalRenglonOrden(aRenglon(r)))}
                    </td>
                  )}
                  <td className="py-1 text-right">
                    <button
                      onClick={() =>
                        setRenglones((p) =>
                          p.length === 1 ? [aDraft(renglonVacio())] : p.filter((_, j) => j !== i)
                        )
                      }
                      title="Quitar renglón"
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
                );
              })}
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
