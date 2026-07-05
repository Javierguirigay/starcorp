import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Forklift, Package, Wrench } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { EQUIPOS_DETALLE } from "@/lib/data/equipos";
import type { EstadoEquipo } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: `Equipos · ${APP_NAME}` };

/* Mapa literal de clases por estado (nunca clases construidas: la purga
   de Tailwind las eliminaría). */
const ESTILO_ESTADO: Record<EstadoEquipo, { dot: string; badge: string }> = {
  Disponible: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
  Asignado: { dot: "bg-navy-600", badge: "bg-navy-50 text-navy-700" },
  Mantenimiento: { dot: "bg-gold-500", badge: "bg-gold-500/15 text-gold-600" },
};

export default function EquiposPage() {
  return (
    <>
      <PageHeader title="Equipos" breadcrumb={["LOTER, C.A.", "Administración", "Equipos"]} />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center gap-3 text-sm text-slate-500">
          <Link
            href="/loter/administracion/inventario"
            className="inline-flex items-center gap-1.5 font-600 text-navy-700 hover:text-gold-600"
          >
            <Package className="h-4 w-4" /> Inventario
          </Link>
          <span className="text-slate-300">·</span>
          <Link
            href="/loter/administracion/mantenimiento"
            className="inline-flex items-center gap-1.5 font-600 text-navy-700 hover:text-gold-600"
          >
            <Wrench className="h-4 w-4" /> Mantenimiento
          </Link>
          <span className="text-slate-300">·</span>
          <Link
            href="/loter/operaciones/asignacion-equipos"
            className="inline-flex items-center gap-1.5 font-600 text-navy-700 hover:text-gold-600"
          >
            <ClipboardList className="h-4 w-4" /> Asignación
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {EQUIPOS_DETALLE.map((eq) => {
            const s = ESTILO_ESTADO[eq.estado];
            return (
              <div
                key={eq.nombre}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-navy-300"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy-900 text-gold-400">
                      <Forklift className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-display text-base font-700 text-navy-950">{eq.nombre}</p>
                      <p className="text-xs text-slate-400">Equipo petrolero</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full ${s.badge} px-2.5 py-1 text-xs font-600`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`}></span>
                    {eq.estado}
                  </span>
                </div>

                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Ubicación</dt>
                    <dd className="font-500 text-navy-900">{eq.ubicacion}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Asignación</dt>
                    <dd className="font-500 text-navy-900">{eq.asignacion}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Mantenimiento</dt>
                    <dd
                      className={`font-500 ${
                        eq.mantenimiento === "Pendiente" ? "text-gold-600" : "text-navy-900"
                      }`}
                    >
                      {eq.mantenimiento}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Próximo</dt>
                    <dd className="font-mono text-xs text-slate-500">{eq.proximo}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <Link
                    href="/loter/operaciones/asignacion-equipos"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-navy-50 py-2 text-xs font-600 text-navy-700 hover:bg-navy-100"
                  >
                    <ClipboardList className="h-4 w-4" /> Asignar
                  </Link>
                  <Link
                    href="/loter/administracion/mantenimiento"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-2 text-xs font-600 text-navy-700 hover:bg-slate-100"
                  >
                    <Wrench className="h-4 w-4" /> Mantenimiento
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
