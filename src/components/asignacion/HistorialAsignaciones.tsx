"use client";

/**
 * Historial de asignaciones leído del provider (vivo: incluye las órdenes
 * guardadas en la sesión). Finalizar una asignación libera sus equipos al
 * instante, porque el estado del equipo se deriva de las asignaciones activas.
 */
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { Asignacion } from "@/lib/types";
import { formatFechaVE } from "@/lib/format";
import { useInventario } from "@/components/inventario/InventarioProvider";
import { Toast } from "@/components/ui/Toast";
import { FinalizarAsignacionModal } from "./FinalizarAsignacionModal";

export function HistorialAsignaciones() {
  const inv = useInventario();
  const [finalizando, setFinalizando] = useState<Asignacion | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-display text-base font-700 text-navy-950">
            Historial de asignaciones
          </h2>
          <p className="text-xs text-slate-400">
            Al finalizar una asignación, sus equipos vuelven a estar disponibles
          </p>
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
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {inv.asignaciones.map((h) => (
              <tr key={h.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3 font-mono text-xs font-600 text-navy-700">{h.id}</td>
                <td className="px-5 py-3 text-navy-900">{h.cliente}</td>
                <td className="px-5 py-3 text-slate-600">{h.equipos.join(", ")}</td>
                <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                  {formatFechaVE(h.desde)}
                </td>
                <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                  {h.hasta ? formatFechaVE(h.hasta) : <span className="text-slate-400">En curso</span>}
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
                <td className="px-5 py-3 text-right">
                  {h.estado === "Activo" && (
                    <button
                      onClick={() => setFinalizando(h)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-600 text-navy-700 hover:bg-slate-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Finalizar
                    </button>
                  )}
                </td>
              </tr>
            ))}
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
      {toast && <Toast mensaje={toast} />}
    </section>
  );
}
