import { Hammer } from "lucide-react";
import type { Empresa } from "@/lib/types";
import type { ModuloDef } from "@/lib/modulos";
import { PageHeader } from "@/components/layout/PageHeader";

/**
 * Pantalla de módulo "en preparación": el módulo ya figura en el menú de la
 * empresa pero su implementación por empresa (datos/branding) aún no está
 * lista. También sirve de placeholder por diseño para el Sistema de Catering
 * de ETM, que se estructurará más adelante.
 */
export function ModuloEnPreparacion({ empresa, def }: { empresa: Empresa; def: ModuloDef }) {
  return (
    <>
      <PageHeader
        title={def.label}
        breadcrumb={[empresa.nombre, def.seccion === "operaciones" ? "Operaciones" : "Administración", def.label]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center shadow-card">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gold-500/10 text-gold-600">
            <Hammer className="h-7 w-7" />
          </span>
          <h2 className="font-display text-lg font-700 text-navy-950">{def.label}</h2>
          <p className="mt-1 text-sm font-600 text-navy-700">{empresa.nombre}</p>
          <p className="mt-4 text-sm text-slate-500">
            {def.nota ??
              "Este módulo está en preparación para esta empresa. Lo habilitaremos en un próximo avance."}
          </p>
          <span className="mt-6 inline-flex items-center rounded-full bg-navy-50 px-3 py-1 text-xs font-600 uppercase tracking-wide text-navy-600">
            Próximamente
          </span>
        </div>
      </main>
    </>
  );
}
