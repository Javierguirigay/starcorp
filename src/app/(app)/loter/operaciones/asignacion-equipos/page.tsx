import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { ASIGNACIONES } from "@/lib/data/asignaciones";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrdenAsignacion } from "@/components/asignacion/OrdenAsignacion";

export const metadata: Metadata = { title: `Asignación de equipos · ${APP_NAME}` };

export default function AsignacionEquiposPage() {
  return (
    <>
      <PageHeader
        title="Asignación de equipos"
        breadcrumb={["LOTER, C.A.", "Operaciones", "Asignación"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <OrdenAsignacion />

        {/* Historial (server-render, como el boceto) */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-700 text-navy-950">
                Historial de asignaciones
              </h2>
              <p className="text-xs text-slate-400">
                Requerimiento ASG-2026-001 · datos reales de la orden
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ASIGNACIONES.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-mono text-xs font-600 text-navy-700">{h.id}</td>
                    <td className="px-5 py-3 text-navy-900">{h.cliente}</td>
                    <td className="px-5 py-3 text-slate-600">{h.equipos}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                      {h.desde}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                      {h.hasta}
                    </td>
                    <td className="px-5 py-3 text-center font-mono font-600 text-navy-900">{h.dias}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
