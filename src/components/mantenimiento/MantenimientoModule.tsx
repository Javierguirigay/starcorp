"use client";

/**
 * Módulo Mantenimiento: KPIs por estado, filtros (estado/equipo), programar y
 * editar/eliminar mantenimientos, y exportar a PDF (grupal según filtros o
 * historial individual de un equipo) con vista previa. Estado en InventarioProvider.
 */
import { useEffect, useState } from "react";
import { CalendarPlus, FileDown, FileText, Pencil, Trash2 } from "lucide-react";
import type { EstadoMantenimiento, RegistroMantenimiento } from "@/lib/types";
import { fmtISO, formatFechaVE } from "@/lib/format";
import {
  conteoPorEstado,
  ESTADOS_MANTENIMIENTO,
  ultimoServicio,
} from "@/lib/negocio/inventario";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { useInventario } from "@/components/inventario/InventarioProvider";
import { MantenimientoModal } from "./MantenimientoModal";

const BADGE: Record<EstadoMantenimiento, string> = {
  "En taller": "bg-gold-500/15 text-gold-600",
  Pendiente: "bg-amber-50 text-amber-700",
  Programado: "bg-navy-50 text-navy-700",
  Completado: "bg-emerald-50 text-emerald-700",
};

const KPI_TONO: Record<EstadoMantenimiento, string> = {
  Programado: "text-navy-700",
  Pendiente: "text-amber-600",
  "En taller": "text-gold-600",
  Completado: "text-emerald-600",
};

const selectCls =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

function fecha(iso: string): string {
  return iso ? formatFechaVE(iso) : "—";
}

export function MantenimientoModule() {
  const inv = useInventario();
  const [filtroEstado, setFiltroEstado] = useState<"todos" | EstadoMantenimiento>("todos");
  const [filtroEquipo, setFiltroEquipo] = useState<string>("todos");
  const [modal, setModal] = useState<{ id: number | null } | null>(null);
  const [generando, setGenerando] = useState(false);
  const [preview, setPreview] = useState<{ url: string; nombre: string; titulo: string } | null>(
    null
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  const conteo = conteoPorEstado(inv.mantenimientos);
  const equipos = [...new Set(inv.mantenimientos.map((m) => m.equipo))].sort((a, b) =>
    a.localeCompare(b, "es")
  );

  const visibles = [...inv.mantenimientos]
    .filter(
      (m) =>
        (filtroEstado === "todos" || m.estado === filtroEstado) &&
        (filtroEquipo === "todos" || m.equipo === filtroEquipo)
    )
    .sort((a, b) => (a.programado === b.programado ? b.id - a.id : a.programado < b.programado ? 1 : -1));

  const registroDe = (id: number) => inv.mantenimientos.find((m) => m.id === id) ?? null;

  const eliminar = (m: RegistroMantenimiento) => {
    if (!confirm(`¿Eliminar el mantenimiento de "${m.equipo}"?`)) return;
    inv.eliminarMantenimiento(m.id);
    setToast("Mantenimiento eliminado");
  };

  const aFila = (m: RegistroMantenimiento) => ({
    equipo: m.equipo,
    tipo: m.tipo,
    programado: fecha(m.programado),
    realizado: fecha(m.realizado),
    estado: m.estado,
    tecnico: m.tecnico,
    observaciones: m.observaciones,
  });

  /* Genera el PDF (grupal según filtros o historial de un equipo) y abre la
     vista previa. Import dinámico del renderer, como en finanzas. */
  const exportar = async (equipoIndividual?: string) => {
    if (generando) return;
    const lista = equipoIndividual
      ? [...inv.mantenimientos]
          .filter((m) => m.equipo === equipoIndividual)
          .sort((a, b) => (a.programado < b.programado ? 1 : -1))
      : visibles;
    if (!lista.length) {
      setToast("No hay mantenimientos que exportar");
      return;
    }
    setGenerando(true);
    try {
      const [docs, { generarPdfBlob, slug }] = await Promise.all([
        import("./pdf/documentos"),
        import("@/components/pdf/descargar"),
      ]);
      const hoy = fmtISO(new Date());
      let titulo: string;
      let subtitulo: string;
      let ultimoTexto: string | undefined;
      let nombre: string;
      if (equipoIndividual) {
        const u = ultimoServicio(equipoIndividual, inv.mantenimientos);
        titulo = `Historial de mantenimiento — ${equipoIndividual}`;
        subtitulo = `${lista.length} registro(s) · Generado el ${formatFechaVE(hoy)}`;
        ultimoTexto = u
          ? `${formatFechaVE(u.fecha)} · ${u.tipo} · ${u.tecnico} — ${u.observaciones}`
          : "Sin servicios completados registrados.";
        nombre = `mantenimiento_${slug(equipoIndividual)}_${formatFechaVE(hoy)}.pdf`;
      } else {
        const filtro =
          filtroEstado === "todos" ? "Todos los estados" : `Estado: ${filtroEstado}`;
        titulo = "Historial de Mantenimientos";
        subtitulo = `${filtro}${filtroEquipo === "todos" ? "" : ` · Equipo: ${filtroEquipo}`} · Generado el ${formatFechaVE(hoy)}`;
        nombre = `mantenimientos_${formatFechaVE(hoy)}.pdf`;
      }
      const doc = (
        <docs.ReporteMantenimientoDoc
          titulo={titulo}
          subtitulo={subtitulo}
          generado={formatFechaVE(hoy)}
          ultimoServicio={ultimoTexto}
          filas={lista.map(aFila)}
        />
      );
      const blob = await generarPdfBlob(doc);
      setPreview({ url: URL.createObjectURL(blob), nombre, titulo });
    } catch {
      setToast("No se pudo generar el PDF");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <>
      {/* KPIs por estado */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ESTADOS_MANTENIMIENTO.map((e) => (
          <div key={e} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <p className="text-xs font-600 uppercase tracking-wide text-slate-400">{e}</p>
            <p className={`mt-2 font-mono text-3xl font-700 ${KPI_TONO[e]}`}>{conteo[e]}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-700 text-navy-950">
              Historial de mantenimientos
            </h2>
            <p className="text-xs text-slate-400">
              Programa, actualiza y exporta los mantenimientos de los equipos
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportar()}
              disabled={generando}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" /> {generando ? "Generando…" : "Exportar PDF"}
            </button>
            <button
              onClick={() => setModal({ id: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
            >
              <CalendarPlus className="h-[18px] w-[18px]" /> Programar mantenimiento
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
              className={selectCls}
            >
              <option value="todos">Todos</option>
              {ESTADOS_MANTENIMIENTO.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Equipo</label>
            <select
              value={filtroEquipo}
              onChange={(e) => setFiltroEquipo(e.target.value)}
              className={selectCls}
            >
              <option value="todos">Todos</option>
              {equipos.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          {filtroEquipo !== "todos" && (
            <button
              onClick={() => exportar(filtroEquipo)}
              disabled={generando}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" /> Historial de {filtroEquipo}
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-600">Equipo</th>
                <th className="px-5 py-3 font-600">Tipo</th>
                <th className="px-5 py-3 font-600">Programado</th>
                <th className="px-5 py-3 font-600">Realizado</th>
                <th className="px-5 py-3 font-600">Estado</th>
                <th className="px-5 py-3 font-600">Técnico</th>
                <th className="px-5 py-3 font-600">Último servicio</th>
                <th className="px-5 py-3 text-right font-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">
                    No hay mantenimientos para estos filtros.
                  </td>
                </tr>
              ) : (
                visibles.map((m) => {
                  const u = ultimoServicio(m.equipo, inv.mantenimientos);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-600 text-navy-900">{m.equipo}</td>
                      <td className="px-5 py-3 text-slate-500">{m.tipo}</td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                        {fecha(m.programado)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                        {fecha(m.realizado)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${BADGE[m.estado]}`}>
                          {m.estado}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{m.tecnico}</td>
                      <td className="px-5 py-3 text-xs text-slate-500" title={u?.observaciones}>
                        {u ? `${formatFechaVE(u.fecha)} · ${u.observaciones}` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Editar"
                            onClick={() => setModal({ id: m.id })}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            title="Eliminar"
                            onClick={() => eliminar(m)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal && (
        <MantenimientoModal
          key={modal.id ?? "nuevo"}
          registro={modal.id !== null ? registroDe(modal.id) : null}
          onToast={setToast}
          onClose={() => setModal(null)}
        />
      )}

      {preview && (
        <Modal
          onClose={() => setPreview(null)}
          title={preview.titulo}
          subtitle={preview.nombre}
          maxWidth="max-w-5xl"
          footer={
            <>
              <button
                onClick={() => setPreview(null)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
              <button
                onClick={async () => {
                  const { descargarBlob } = await import("@/components/pdf/descargar");
                  descargarBlob(preview.url, preview.nombre);
                  setToast("PDF descargado");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
              >
                <FileDown className="h-4 w-4" /> Descargar
              </button>
            </>
          }
        >
          <iframe
            src={preview.url}
            title={preview.titulo}
            className="h-[70vh] w-full rounded-xl border border-slate-200 bg-slate-50"
          />
        </Modal>
      )}

      {toast && <Toast mensaje={toast} />}
    </>
  );
}
