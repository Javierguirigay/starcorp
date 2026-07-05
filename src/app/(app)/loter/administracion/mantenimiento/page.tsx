import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Plus,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { MANTENIMIENTOS, RESUMEN_MANTENIMIENTO } from "@/lib/data/mantenimiento";
import type { EstadoMantenimiento } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: `Mantenimiento · ${APP_NAME}` };

const ICONOS: Record<string, LucideIcon> = {
  "check-circle": CheckCircle,
  clock: Clock,
  wrench: Wrench,
  calendar: Calendar,
};

const BADGE: Record<EstadoMantenimiento, string> = {
  "En taller": "bg-gold-500/15 text-gold-600",
  Pendiente: "bg-amber-50 text-amber-700",
  Programado: "bg-navy-50 text-navy-700",
  Completado: "bg-emerald-50 text-emerald-700",
};

export default function MantenimientoPage() {
  return (
    <>
      <PageHeader
        title="Mantenimiento"
        breadcrumb={["LOTER, C.A.", "Administración", "Mantenimiento"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Resumen */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {RESUMEN_MANTENIMIENTO.map((r) => {
            const Icon = ICONOS[r.icono];
            return (
              <div key={r.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${r.fondo} ${r.color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-display text-2xl font-700 text-navy-950">{r.valor}</p>
                <p className="text-xs text-slate-400">{r.label}</p>
              </div>
            );
          })}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            <Link
              href="/loter/administracion/equipos"
              className="inline-flex items-center gap-1.5 font-600 text-navy-700 hover:text-gold-600"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a Equipos
            </Link>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800">
            <Plus className="h-[18px] w-[18px]" /> Programar mantenimiento
          </button>
        </div>

        {/* Registro */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
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
                  <th className="px-5 py-3 font-600">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {MANTENIMIENTOS.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-5 py-3 font-600 text-navy-900">{r.equipo}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full ${
                          r.tipo === "Correctivo"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                        } px-2.5 py-1 text-xs font-600`}
                      >
                        {r.tipo}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                      {r.programado}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                      {r.realizado}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full ${BADGE[r.estado]} px-2.5 py-1 text-xs font-600`}>
                        {r.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{r.tecnico}</td>
                    <td className="max-w-xs px-5 py-3 text-xs text-slate-500">{r.observaciones}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
