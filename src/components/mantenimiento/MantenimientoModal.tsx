"use client";

/**
 * Programar / editar un mantenimiento. El equipo se elige del inventario
 * (select estricto: una orden "En taller" pone el equipo en estado
 * "Mantenimiento" y bloquea su asignación). Al marcar "Completado" se pide la
 * fecha de realización y qué se hizo (observaciones).
 *
 * Materiales: filas vinculadas al catálogo de consumibles (con chips de
 * sugerencia desde la ficha del equipo) o texto libre. Mientras no esté
 * Completado son planificados (hint de stock, sin descontar); al completar
 * se valida el stock (bloqueante) y se descuenta con referencia MTTO-xxxx.
 * "Generar requerimiento" abre la orden de requerimiento prellenada con los
 * faltantes.
 */
import { useState } from "react";
import { ClipboardList, Plus, X } from "lucide-react";
import type { EstadoMantenimiento, MaterialMantenimiento, RegistroMantenimiento } from "@/lib/types";
import { fmtISO, formatNumberVE, parseVES } from "@/lib/format";
import { estadoStock } from "@/lib/negocio/inventario";
import {
  faltantesParaRequerimiento,
  validarStockMateriales,
} from "@/lib/negocio/movimientosInventario";
import { round2 } from "@/lib/negocio/nomina";
import { Modal } from "@/components/ui/Modal";
import { useInventario } from "@/components/inventario/InventarioProvider";
import { ArticuloCombo, type OpcionArticulo } from "@/components/inventario/ArticuloCombo";
import { OrdenModal } from "@/components/ordenes/OrdenModal";
import type { OrdenDatos } from "@/components/ordenes/OrdenesProvider";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

const ESTADOS: EstadoMantenimiento[] = ["Programado", "Pendiente", "En taller", "Completado"];

/** Fila editable: la cantidad vive como texto mientras se escribe. */
type MaterialDraft = Omit<MaterialMantenimiento, "cantidad"> & { cantidadTexto: string };

const aDraft = (m: MaterialMantenimiento): MaterialDraft => ({
  unidad: m.unidad,
  descripcion: m.descripcion,
  ...(m.consumibleId !== undefined ? { consumibleId: m.consumibleId } : {}),
  cantidadTexto: !m.cantidad ? "" : Number.isInteger(m.cantidad) ? String(m.cantidad) : formatNumberVE(m.cantidad),
});

const aMaterial = (d: MaterialDraft): MaterialMantenimiento => ({
  cantidad: parseVES(d.cantidadTexto),
  unidad: d.unidad,
  descripcion: d.descripcion,
  ...(d.consumibleId !== undefined ? { consumibleId: d.consumibleId } : {}),
});

const TECNICOS_SUGERIDOS = [
  "Por asignar",
  "Equipo LOTER",
  "Carlos Loter",
  "Jaime Brito",
  "Mecánico Externo",
];

export function MantenimientoModal({
  registro,
  onToast,
  onClose,
}: {
  registro: RegistroMantenimiento | null;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const inv = useInventario();

  const [equipo, setEquipo] = useState(registro?.equipo ?? "");
  const [tipo, setTipo] = useState<RegistroMantenimiento["tipo"]>(registro?.tipo ?? "Preventivo");
  const [estado, setEstado] = useState<EstadoMantenimiento>(registro?.estado ?? "Programado");
  const [programado, setProgramado] = useState(registro?.programado ?? fmtISO(new Date()));
  const [realizado, setRealizado] = useState(registro?.realizado ?? "");
  const [tecnico, setTecnico] = useState(registro?.tecnico ?? "Por asignar");
  const [observaciones, setObservaciones] = useState(registro?.observaciones ?? "");
  // string → se muestra input para crear un técnico nuevo; null → select normal.
  const [nuevoTecnico, setNuevoTecnico] = useState<string | null>(null);
  // La cantidad se edita como TEXTO: reformatearla en cada tecla dejaba el
  // input inservible (no se podía borrar ni escribir cifras largas).
  const [materiales, setMateriales] = useState<MaterialDraft[]>(
    (registro?.materiales ?? []).map(aDraft)
  );
  // Plantilla de la orden de requerimiento prellenada (abre OrdenModal encima).
  const [plantillaOR, setPlantillaOR] = useState<OrdenDatos | null>(null);

  const esCompletado = estado === "Completado";

  const catalogo = [...inv.consumibles].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  // Opciones del buscador de artículo (mismo formato que los renglones de orden;
  // aquí solo consumibles: un mantenimiento no "consume" equipos).
  const opcionesMaterial: OpcionArticulo[] = catalogo.map((c) => ({
    valor: String(c.id),
    etiqueta: c.nombre,
    detalle: `${c.cantidad} ${c.unidad}`,
    grupo: "Consumibles",
  }));
  const equipoSel = inv.equipos.find((e) => e.codigo === equipo);
  // Sugerencias: consumibles vinculados en la ficha del equipo aún no agregados.
  const sugerencias = (equipoSel?.consumibles ?? []).filter(
    (s) =>
      inv.consumiblePorId(s.consumibleId) &&
      !materiales.some((m) => m.consumibleId === s.consumibleId)
  );

  const cambiarMaterial = (i: number, patch: Partial<MaterialDraft>) =>
    setMateriales((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const vincularMaterial = (i: number, valor: string) =>
    setMateriales((ms) =>
      ms.map((m, j) => {
        if (j !== i) return m;
        if (valor === "") {
          // Se suelta el vínculo pero se conserva el texto del catálogo: sirve
          // de punto de partida para editarlo como texto libre.
          const libre = { ...m };
          delete libre.consumibleId;
          return libre;
        }
        const c = inv.consumiblePorId(Number(valor));
        return c
          ? { ...m, consumibleId: c.id, descripcion: c.nombre, unidad: c.unidad }
          : m;
      })
    );

  const agregarSugerencia = (consumibleId: number) => {
    const c = inv.consumiblePorId(consumibleId);
    if (!c || materiales.some((m) => m.consumibleId === consumibleId)) return;
    setMateriales((ms) => [
      ...ms,
      { cantidadTexto: "1", unidad: c.unidad, descripcion: c.nombre, consumibleId },
    ]);
  };

  /** Filas válidas con descripción/unidad recalculadas del catálogo (snapshot fresco). */
  const limpiarMateriales = (): MaterialMantenimiento[] =>
    materiales
      .map(aMaterial)
      .filter((m) => (m.consumibleId !== undefined || m.descripcion.trim()) && m.cantidad > 0)
      .map((m) => {
        const c = m.consumibleId !== undefined ? inv.consumiblePorId(m.consumibleId) : undefined;
        return {
          cantidad: round2(m.cantidad),
          unidad: (c?.unidad ?? m.unidad.trim()) || "Und",
          descripcion: c?.nombre ?? m.descripcion.trim(),
          ...(m.consumibleId !== undefined ? { consumibleId: m.consumibleId } : {}),
        };
      });

  const generarRequerimiento = () => {
    if (!equipo.trim()) return onToast("Elige primero el equipo");
    const limpios = limpiarMateriales();
    if (!limpios.length) return onToast("Agrega materiales para generar el requerimiento");
    const faltantes = faltantesParaRequerimiento(limpios, inv.consumibles);
    if (!faltantes.length)
      return onToast("Sin faltantes: hay stock para todos los materiales");
    setPlantillaOR({
      tipo: "requerimiento",
      fecha: fmtISO(new Date()),
      contraparteNombre: tecnico.trim() || "Mantenimiento",
      renglones: faltantes,
      elaboradoPor: tecnico.trim() || "Por asignar",
      motivo: `Mantenimiento ${tipo.toLowerCase()} de ${equipo}`,
    });
  };

  // Técnicos sugeridos + los ya usados en registros + el actual (únicos).
  const opcionesTecnico = Array.from(
    new Set<string>([
      ...TECNICOS_SUGERIDOS,
      ...inv.mantenimientos.map((m) => m.tecnico).filter(Boolean),
      tecnico,
    ])
  );

  const crearTecnicoRapido = () => {
    const t = (nuevoTecnico ?? "").trim();
    if (!t) return onToast("Indica el nombre del técnico");
    setTecnico(t);
    setNuevoTecnico(null);
  };

  const guardar = () => {
    if (!equipo.trim()) return onToast("Indica el equipo");
    if (!programado) return onToast("Indica la fecha programada");
    if (esCompletado && !realizado) return onToast("Indica la fecha de realización");
    const materialesLimpios = limpiarMateriales();

    // Completar consume los materiales vinculados: validación BLOQUEANTE de
    // stock (misma política que la orden de entrega). Al editar un Completado
    // se descuenta su propio consumo previo del stock exigido.
    if (esCompletado && materialesLimpios.length) {
      const errores = validarStockMateriales(
        materialesLimpios,
        inv.consumibles,
        inv.movimientos,
        registro?.id
      );
      if (errores.length) return onToast(errores[0]);
    }

    const datos = {
      equipo: equipo.trim(),
      tipo,
      estado,
      programado,
      realizado: esCompletado ? realizado : "",
      tecnico: tecnico.trim() || "Por asignar",
      observaciones: observaciones.trim(),
      ...(materialesLimpios.length ? { materiales: materialesLimpios } : {}),
    };
    if (registro) {
      // Revertir → guardar → reaplicar: los dispatch del mismo tick se
      // procesan en orden, así el stock refleja solo la versión final
      // (cubre también Completado → no Completado: solo revierte).
      if (registro.estado === "Completado") inv.revertirMantenimiento(registro.id);
      inv.editarMantenimiento(registro.id, datos);
      if (esCompletado)
        inv.aplicarMantenimiento({ ...datos, id: registro.id, empresaId: registro.empresaId });
      onToast("Mantenimiento actualizado");
    } else {
      const nuevo = inv.crearMantenimiento(datos);
      if (esCompletado) inv.aplicarMantenimiento(nuevo);
      onToast("Mantenimiento programado");
    }
    onClose();
  };

  return (
    <>
    <Modal
      onClose={onClose}
      title={registro ? "Editar mantenimiento" : "Programar mantenimiento"}
      subtitle="Correctivo o preventivo por equipo · con materiales del inventario"
      maxWidth="max-w-3xl"
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
            {registro ? "Guardar cambios" : "Programar"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Equipo</label>
          <select className={inputCls} value={equipo} onChange={(e) => setEquipo(e.target.value)}>
            <option value="">Selecciona un equipo…</option>
            {/* Registro viejo cuyo equipo ya no está en inventario: se conserva. */}
            {equipo && !inv.equipos.some((e) => e.codigo === equipo) && (
              <option value={equipo}>{equipo} (fuera de inventario)</option>
            )}
            {[...inv.equipos]
              .sort((a, b) => a.codigo.localeCompare(b.codigo, "es"))
              .map((e) => (
                <option key={e.id} value={e.codigo}>
                  {e.codigo}
                </option>
              ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Tipo</label>
            <select
              className={inputCls}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as RegistroMantenimiento["tipo"])}
            >
              <option value="Preventivo">Preventivo</option>
              <option value="Correctivo">Correctivo</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Estado</label>
            <select
              className={inputCls}
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoMantenimiento)}
            >
              {ESTADOS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Fecha programada</label>
            <input
              type="date"
              className={inputCls}
              value={programado}
              onChange={(e) => setProgramado(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">
              Fecha realizada {esCompletado && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="date"
              className={inputCls}
              value={realizado}
              disabled={!esCompletado}
              onChange={(e) => setRealizado(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="block text-sm font-600 text-navy-900">Técnico</label>
            {nuevoTecnico === null && (
              <button
                type="button"
                onClick={() => setNuevoTecnico("")}
                className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
              >
                <Plus className="h-3.5 w-3.5" /> Nuevo técnico
              </button>
            )}
          </div>
          {nuevoTecnico === null ? (
            <select
              className={inputCls}
              value={tecnico}
              onChange={(e) => setTecnico(e.target.value)}
            >
              {opcionesTecnico.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                placeholder="Nombre del técnico"
                value={nuevoTecnico}
                onChange={(e) => setNuevoTecnico(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") crearTecnicoRapido();
                }}
                className={inputCls}
              />
              <button
                type="button"
                onClick={crearTecnicoRapido}
                className="whitespace-nowrap rounded-xl bg-navy-900 px-3 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
              >
                Crear
              </button>
              <button
                type="button"
                onClick={() => setNuevoTecnico(null)}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Materiales / repuestos */}
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-600 uppercase tracking-wide text-slate-400">
              Materiales / repuestos
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={generarRequerimiento}
                className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
              >
                <ClipboardList className="h-3.5 w-3.5" /> Generar requerimiento
              </button>
              <button
                type="button"
                onClick={() =>
                  setMateriales((ms) => [
                    ...ms,
                    { cantidadTexto: "1", unidad: "Und", descripcion: "" },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar material
              </button>
            </div>
          </div>

          {/* Sugerencias desde la ficha del equipo */}
          {sugerencias.length > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Usa {equipo}:</span>
              {sugerencias.map((s) => {
                const c = inv.consumiblePorId(s.consumibleId)!;
                return (
                  <button
                    key={s.consumibleId}
                    type="button"
                    onClick={() => agregarSugerencia(s.consumibleId)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-600 text-navy-700 hover:border-navy-300 hover:bg-navy-50"
                  >
                    <Plus className="h-3 w-3" /> {s.rol} · {c.nombre}
                  </button>
                );
              })}
            </div>
          )}

          {materiales.length === 0 ? (
            <p className="py-2 text-center text-xs text-slate-400">
              Sin materiales. Agrégalos del inventario o como texto libre.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-400">
                <span className="min-w-0 flex-1 font-600">Artículo / Descripción</span>
                <span className="w-20 shrink-0 font-600">Cant.</span>
                <span className="w-20 shrink-0 font-600">Unidad</span>
                <span className="w-9 shrink-0" />
              </div>
              {materiales.map((m, i) => {
                const consumible =
                  m.consumibleId !== undefined ? inv.consumiblePorId(m.consumibleId) : undefined;
                const sinStock = !!consumible && parseVES(m.cantidadTexto) > consumible.cantidad;
                return (
                  <div key={i} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <ArticuloCombo
                        value={m.descripcion}
                        vinculado={m.consumibleId !== undefined}
                        opciones={opcionesMaterial}
                        onTexto={(t) => cambiarMaterial(i, { descripcion: t })}
                        onElegir={(valor) => vincularMaterial(i, valor)}
                        onDesvincular={() => vincularMaterial(i, "")}
                      />
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
                          Stock: {consumible.cantidad} {consumible.unidad} ·{" "}
                          {consumible.ubicacion}
                        </p>
                      )}
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      title="Cantidad"
                      value={m.cantidadTexto}
                      placeholder="0"
                      onChange={(e) => cambiarMaterial(i, { cantidadTexto: e.target.value })}
                      className="w-20 shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-right font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                    />
                    <input
                      type="text"
                      title="Unidad"
                      value={m.unidad}
                      readOnly={m.consumibleId !== undefined}
                      onChange={(e) => cambiarMaterial(i, { unidad: e.target.value })}
                      className={`w-20 shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100 ${
                        m.consumibleId !== undefined ? "bg-slate-50 text-slate-500" : "bg-white"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setMateriales((ms) => ms.filter((_, j) => j !== i))}
                      title="Quitar material"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-2 text-[11px] text-slate-400">
            {esCompletado
              ? "Al guardar como Completado, los materiales vinculados descuentan stock (kardex MTTO)."
              : "Materiales planificados: el stock se descuenta al marcar el mantenimiento como Completado."}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">
            Observaciones {esCompletado && <span className="font-400 text-slate-400">(qué se hizo)</span>}
          </label>
          <textarea
            rows={2}
            className={inputCls}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>
      </div>
    </Modal>

    {/* Orden de requerimiento prellenada con los faltantes (apilada encima;
        este modal queda debajo para seguir guardando el mantenimiento). */}
    {plantillaOR && (
      <OrdenModal
        tipo="requerimiento"
        orden={null}
        plantilla={plantillaOR}
        onToast={onToast}
        onClose={() => setPlantillaOR(null)}
      />
    )}
    </>
  );
}
