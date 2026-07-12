"use client";

/**
 * Pestaña Reporte de Servicio: listado con filtros, alta/edición con visor
 * del PDF escaneado y selección de UNO O VARIOS reportes pendientes del
 * MISMO cliente para crear una pre-factura.
 */
import { useEffect, useState } from "react";
import { Eye, FilePlus2, Pencil, Plus, Trash2 } from "lucide-react";
import type { ReporteServicio } from "@/lib/types";
import { formatFechaVE } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { useFacturacion } from "../FacturacionProvider";
import { BadgeEstadoDoc } from "../badges";
import { VisorPdf } from "../VisorPdf";
import { ReporteModal } from "./ReporteModal";
import { PrefacturaModal } from "./PrefacturaModal";

const selectCls =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

type ModalAbierto =
  | { tipo: "reporte"; id: number | null }
  | { tipo: "prefactura" }
  | { tipo: "verPdf"; id: number }
  | null;

export function ReportesTab() {
  const fac = useFacturacion();
  const [filtroCliente, setFiltroCliente] = useState<number | "">("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendiente" | "prefacturado">("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [modal, setModal] = useState<ModalAbierto>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const visibles = fac.reportes
    .filter(
      (r) =>
        (filtroCliente === "" || r.clienteId === filtroCliente) &&
        (filtroEstado === "todos" || r.estado === filtroEstado) &&
        (!desde || r.fecha >= desde) &&
        (!hasta || r.fecha <= hasta)
    )
    .sort((a, b) => (a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1));

  // Solo se pueden combinar reportes pendientes del MISMO cliente.
  const clienteSeleccion =
    seleccion.length > 0 ? fac.reportes.find((r) => r.id === seleccion[0])?.clienteId : undefined;

  const toggleSeleccion = (r: ReporteServicio) => {
    if (r.estado !== "pendiente") return;
    setSeleccion((prev) =>
      prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id]
    );
  };

  const eliminar = (r: ReporteServicio) => {
    if (!confirm(`¿Eliminar el reporte N° ${r.numeroControl}?`)) return;
    if (r.pdfUrl) URL.revokeObjectURL(r.pdfUrl);
    fac.eliminarReporte(r.id);
    setSeleccion((prev) => prev.filter((id) => id !== r.id));
    setToast("Reporte eliminado");
  };

  const reportesSeleccionados = fac.reportes.filter((r) => seleccion.includes(r.id));

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-700 text-navy-950">Reportes de servicio</h2>
            <p className="text-xs text-slate-400">
              PDF escaneados transcritos a mano · selecciona reportes pendientes de un mismo
              cliente para pre-facturarlos
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {seleccion.length > 0 && (
              <button
                onClick={() => setModal({ tipo: "prefactura" })}
                className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-sm font-600 text-navy-950 hover:bg-gold-400"
              >
                <FilePlus2 className="h-4 w-4" /> Crear Pre-Factura ({seleccion.length})
              </button>
            )}
            <button
              onClick={() => setModal({ tipo: "reporte", id: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
            >
              <Plus className="h-[18px] w-[18px]" /> Nuevo reporte
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Cliente</label>
            <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value === "" ? "" : Number(e.target.value))} className={selectCls}>
              <option value="">Todos</option>
              {fac.clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.razonSocial}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Estado</label>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)} className={selectCls}>
              <option value="todos">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="prefacturado">Prefacturados</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={selectCls} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={selectCls} />
          </div>
        </div>

        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="w-10 px-5 py-3"></th>
                <th className="px-5 py-3 font-600">N° Control</th>
                <th className="px-5 py-3 font-600">Fecha</th>
                <th className="px-5 py-3 font-600">Cliente</th>
                <th className="px-5 py-3 font-600">Pozo / Locación</th>
                <th className="px-5 py-3 font-600">Equipo</th>
                <th className="px-5 py-3 text-center font-600">Períodos</th>
                <th className="px-5 py-3 font-600">Estado</th>
                <th className="px-5 py-3 text-right font-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-400">
                    No hay reportes para estos filtros.
                  </td>
                </tr>
              ) : (
                visibles.map((r) => {
                  const bloqueado =
                    r.estado !== "pendiente" ||
                    (clienteSeleccion !== undefined && r.clienteId !== clienteSeleccion);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={seleccion.includes(r.id)}
                          disabled={bloqueado && !seleccion.includes(r.id)}
                          onChange={() => toggleSeleccion(r)}
                          title={
                            r.estado !== "pendiente"
                              ? "Ya prefacturado"
                              : bloqueado
                                ? "Solo reportes del mismo cliente"
                                : "Seleccionar para pre-facturar"
                          }
                          className="h-4 w-4 rounded border-slate-300 accent-[#0F2742] disabled:opacity-30"
                        />
                      </td>
                      <td className="px-5 py-3 font-mono font-600 text-navy-900">{r.numeroControl}</td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                        {formatFechaVE(r.fecha)}
                      </td>
                      <td className="px-5 py-3 text-navy-900">
                        {fac.clientePorId(r.clienteId)?.razonSocial ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {r.pozo}
                        <span className="block text-xs text-slate-400">{r.locacion}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{r.tipoEquipo}</td>
                      <td className="px-5 py-3 text-center font-mono text-slate-600">
                        {r.periodos.length}
                      </td>
                      <td className="px-5 py-3">
                        <BadgeEstadoDoc estado={r.estado} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title={r.pdfUrl ? "Ver PDF escaneado" : "Sin PDF asociado"}
                            disabled={!r.pdfUrl}
                            onClick={() => setModal({ tipo: "verPdf", id: r.id })}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-navy-50 hover:text-navy-700 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            title={r.estado === "pendiente" ? "Editar" : "Prefacturado: no editable"}
                            disabled={r.estado !== "pendiente"}
                            onClick={() => setModal({ tipo: "reporte", id: r.id })}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            title={r.estado === "pendiente" ? "Eliminar" : "Prefacturado: no eliminable"}
                            disabled={r.estado !== "pendiente"}
                            onClick={() => eliminar(r)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent"
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

      {modal?.tipo === "reporte" && (
        <ReporteModal
          key={modal.id ?? "nuevo"}
          reporte={modal.id !== null ? fac.reportes.find((r) => r.id === modal.id) ?? null : null}
          onToast={setToast}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === "prefactura" && reportesSeleccionados.length > 0 && (
        <PrefacturaModal
          prefactura={null}
          reportes={reportesSeleccionados}
          onToast={setToast}
          onGuardada={() => setSeleccion([])}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === "verPdf" &&
        (() => {
          const r = fac.reportes.find((x) => x.id === modal.id);
          if (!r?.pdfUrl) return null;
          return (
            <Modal
              onClose={() => setModal(null)}
              title={`Reporte N° ${r.numeroControl}`}
              subtitle={r.pdfNombre ?? "PDF escaneado"}
              maxWidth="max-w-4xl"
            >
              <div className="h-[70vh]">
                <VisorPdf url={r.pdfUrl} nombre={r.pdfNombre} />
              </div>
            </Modal>
          );
        })()}

      {toast && <Toast mensaje={toast} />}
    </>
  );
}
