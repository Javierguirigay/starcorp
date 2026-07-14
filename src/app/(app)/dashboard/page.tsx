import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  ClipboardList,
  Forklift,
  Users,
  type LucideIcon,
} from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { MOVIMIENTOS_DASHBOARD } from "@/lib/data/movimientos";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { SaldoConsolidadoKpi } from "@/components/finanzas/SaldoConsolidadoKpi";
import { SaldosEmpresasGrid } from "@/components/finanzas/SaldosEmpresasGrid";

export const metadata: Metadata = { title: `Inicio · ${APP_NAME}` };

/* Datos de ejemplo (de dashboard.php). El saldo consolidado ya no vive aquí:
   se calcula desde el libro mayor (SaldoConsolidadoKpi). */
type Kpi = { label: string; valor: string; sub: string; icon: LucideIcon; tone: "navy" | "gold" };

const KPI_EMPLEADOS: Kpi = { label: "Empleados activos", valor: "24", sub: "18 quincenal · 6 semanal", icon: Users, tone: "navy" };
const KPIS_OPERACIONES: Kpi[] = [
  { label: "Equipos en locación", valor: "3 / 8", sub: "4 disponibles en patio", icon: Forklift, tone: "navy" },
  { label: "Asignaciones activas", valor: "3", sub: "Pozos SBC-37", icon: ClipboardList, tone: "navy" },
];

const ESTADO_EQUIPOS = [
  { l: "Asignados", n: 3, pct: 37, c: "bg-navy-700" },
  { l: "Disponibles", n: 4, pct: 50, c: "bg-emerald-500" },
  { l: "Mantenimiento", n: 1, pct: 13, c: "bg-gold-500" },
];

const BADGE_TIPO: Record<string, string> = {
  Entrada: "bg-emerald-50 text-emerald-700",
  Retiro: "bg-rose-50 text-rose-700",
  Transferencia: "bg-navy-50 text-navy-700",
};

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Inicio" breadcrumb={["STARCORP GROUP", "Inicio"]} />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard {...KPI_EMPLEADOS} />
          <SaldoConsolidadoKpi />
          {KPIS_OPERACIONES.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Saldos por empresa */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-card xl:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-display text-base font-700 text-navy-950">Saldos por empresa</h2>
                <p className="text-xs text-slate-400">
                  Balance del libro mayor de cada empresa · dólares y bolívares
                </p>
              </div>
              <Link
                href="/loter/administracion/finanzas"
                className="inline-flex items-center gap-1.5 text-sm font-600 text-navy-700 hover:text-gold-600"
              >
                Ir a Finanzas <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <SaldosEmpresasGrid />
          </section>

          {/* Estado de equipos */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-display text-base font-700 text-navy-950">Estado de equipos</h2>
              <Link
                href="/loter/administracion/inventario"
                className="text-sm font-600 text-navy-700 hover:text-gold-600"
              >
                Ver
              </Link>
            </div>
            <div className="space-y-3 p-5">
              {ESTADO_EQUIPOS.map((row) => (
                <div key={row.l}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-500 text-navy-800">{row.l}</span>
                    <span className="font-mono text-slate-500">{row.n} equipos</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${row.c}`} style={{ width: `${row.pct}%` }}></div>
                  </div>
                </div>
              ))}
              <div className="mt-4 rounded-xl bg-gold-500/10 p-3 text-xs text-navy-800">
                <span className="font-600">1 equipo</span> en mantenimiento:{" "}
                <span className="font-600">Generador</span> (taller).
              </div>
            </div>
          </section>
        </div>

        {/* Actividad reciente */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-700 text-navy-950">Movimientos recientes</h2>
              <p className="text-xs text-slate-400">Entradas, retiros y transferencias del conglomerado</p>
            </div>
            <Link
              href="/loter/administracion/finanzas"
              className="text-sm font-600 text-navy-700 hover:text-gold-600"
            >
              Ver historial
            </Link>
          </div>
          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-600">Fecha</th>
                  <th className="px-5 py-3 font-600">Tipo</th>
                  <th className="px-5 py-3 font-600">Descripción</th>
                  <th className="px-5 py-3 font-600">Empresa</th>
                  <th className="px-5 py-3 text-right font-600">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {MOVIMIENTOS_DASHBOARD.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-slate-500">{m.fecha}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full ${BADGE_TIPO[m.tipo]} px-2.5 py-1 text-xs font-600`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-navy-900">{m.descripcion}</td>
                    <td className="px-5 py-3 text-slate-500">{m.empresa}</td>
                    <td
                      className={`whitespace-nowrap px-5 py-3 text-right font-mono font-600 ${
                        m.positivo ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {m.monto}
                    </td>
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
