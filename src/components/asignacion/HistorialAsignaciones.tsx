"use client";

/**
 * Historial de asignaciones leído del provider (vivo: incluye las órdenes
 * guardadas en la sesión). Finalizar una asignación libera sus equipos al
 * instante, porque el estado del equipo se deriva de las asignaciones activas.
 * Buscador por ID/cliente/equipo y filtro por estado, como el resto del sistema.
 */
import { useEffect, useState } from "react";
import { CheckCircle2, FileDown } from "lucide-react";
import type { Asignacion } from "@/lib/types";
import { formatFechaVE } from "@/lib/format";
import { armarOrdenAsignacion, filtrarAsignaciones } from "@/lib/negocio/inventario";
import { useInventario } from "@/components/inventario/InventarioProvider";
import { SearchInput } from "@/components/ui/SearchInput";
import { Toast } from "@/components/ui/Toast";
import { PdfPreviewModal, type PreviewPdf } from "@/components/facturacion/PdfPreviewModal";
import { FinalizarAsignacionModal } from "./FinalizarAsignacionModal";

type FiltroEstado = "todos" | Asignacion["estado"];

const FILTROS: [FiltroEstado, string][] = [
  ["todos", "Todas"],
  ["Activo", "Activas"],
  ["Finalizado", "Finalizadas"],
];

const selectCls =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function HistorialAsignaciones() {
  const inv = useInventario();
  const [finalizando, setFinalizando] = useState<Asignacion | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("todos");
  const [generando, setGenerando] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewPdf | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  /** Reimprime la orden de asignación de una fila del historial: el documento
      se rearma desde los datos guardados, sin depender del formulario. */
  const verOrden = async (a: Asignacion) => {
    if (generando) return;
    setGenerando(a.id);
    try {
      const [{ OrdenAsignacionDoc }, { generarPdfBlob, slug }] = await Promise.all([
        import("./pdf/documentoAsignacion"),
        import("@/components/pdf/descargar"),
      ]);
      const datos = armarOrdenAsignacion(a, inv.asignaciones);
      const blob = await generarPdfBlob(<OrdenAsignacionDoc datos={datos} />);
      setPreview({
        url: URL.createObjectURL(blob),
        nombre: `orden_asignacion_${slug(datos.numero)}.pdf`,
        titulo: "Orden de Asignación de Equipos",
      });
    } catch {
      setToast("No se pudo generar el PDF");
    } finally {
      setGenerando(null);
    }
  };

  const porEstado =
    estado === "todos" ? inv.asignaciones : inv.asignaciones.filter((a) => a.estado === estado);
  const visibles = filtrarAsignaciones(porEstado, busqueda);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-700 text-navy-950">
            Historial de asignaciones
          </h2>
          <p className="text-xs text-slate-400">
            Al finalizar una asignación, sus equipos vuelven a estar disponibles
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={busqueda}
            onChange={setBusqueda}
            placeholder="ID, cliente, equipo…"
            className="w-full sm:w-56"
          />
          <select
            aria-label="Filtrar por estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as FiltroEstado)}
            className={selectCls}
          >
            {FILTROS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="table-wrap">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-600">ID</th>
              <th className="px-5 py-3 font-600">Cliente / Proyecto</th>
              <th className="px-5 py-3 font-600">Equipo / Servicio</th>
              <th className="px-5 py-3 font-600">Desde</th>
              <th className="px-5 py-3 font-600">Hasta</th>
              <th className="px-5 py-3 text-center font-600">Días</th>
              <th className="px-5 py-3 font-600">Estado</th>
              <th className="px-5 py-3 font-600">Observaciones</th>
              <th className="px-5 py-3 text-right font-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visibles.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-400">
                  {inv.asignaciones.length === 0
                    ? "Todavía no hay asignaciones registradas."
                    : "Ninguna asignación coincide con la búsqueda."}
                </td>
              </tr>
            ) : (
              visibles.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs font-600 text-navy-700">
                    {h.id}
                  </td>
                  <td className="px-5 py-3 text-navy-900">{h.cliente}</td>
                  <td className="px-5 py-3 text-slate-600">{h.equipos.join(", ")}</td>
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                    {formatFechaVE(h.desde)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                    {h.hasta ? (
                      formatFechaVE(h.hasta)
                    ) : (
                      <span className="font-sans text-slate-400">En curso</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center font-mono font-600 text-navy-900">
                    {h.hasta && h.dias > 0 ? h.dias : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full ${
                        h.estado === "Activo"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      } px-2.5 py-1 text-xs font-600`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                      {h.estado}
                    </span>
                  </td>
                  <td className="max-w-xs px-5 py-3 text-xs text-slate-500">{h.observaciones}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title={`Orden de asignación ${h.documento?.numero ?? h.id} — PDF`}
                        disabled={generando !== null}
                        onClick={() => verOrden(h)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-navy-50 hover:text-navy-700 disabled:opacity-50"
                      >
                        <FileDown className="h-4 w-4" />
                      </button>
                      {h.estado === "Activo" && (
                        <button
                          onClick={() => setFinalizando(h)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-600 text-navy-700 hover:bg-slate-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Finalizar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {finalizando && (
        <FinalizarAsignacionModal
          asignacion={finalizando}
          onToast={setToast}
          onClose={() => setFinalizando(null)}
        />
      )}
      {preview && (
        <PdfPreviewModal preview={preview} onToast={setToast} onClose={() => setPreview(null)} />
      )}
      {toast && <Toast mensaje={toast} />}
    </section>
  );
}
