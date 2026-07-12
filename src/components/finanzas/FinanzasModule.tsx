"use client";

/**
 * Módulo Finanzas con pestañas: Grupo (vista original) + una pestaña por
 * empresa del conglomerado. Las empresas sin finanzas habilitadas se muestran
 * deshabilitadas con badge "Pronto" (patrón del sidebar).
 */
import { useState } from "react";
import { FINANZAS_TABS } from "@/lib/data/finanzas";
import { EMPRESAS } from "@/lib/data/empresas";
import { useFinanzas } from "./FinanzasProvider";
import { GrupoTab } from "./GrupoTab";
import { FinanzasEmpresa } from "./FinanzasEmpresa";

const tabCls = (activo: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-600 ${
    activo ? "bg-navy-900 text-white" : "text-slate-500 hover:text-navy-900"
  }`;

export function FinanzasModule() {
  const [tab, setTab] = useState<string>("grupo");
  // Tasa Bs/USD global: la misma que usa Nómina (fuente única en el provider).
  const { tasaTexto, setTasaTexto } = useFinanzas();

  const empresaActiva = EMPRESAS.find((e) => e.key === tab);

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="inline-flex flex-wrap items-center gap-1 self-start rounded-xl border border-slate-200 bg-white p-1">
          {FINANZAS_TABS.map((t) =>
            t.habilitada ? (
              <button key={t.key} onClick={() => setTab(t.key)} className={tabCls(tab === t.key)}>
                {t.label}
              </button>
            ) : (
              <button
                key={t.key}
                disabled
                title="Disponible próximamente"
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-600 text-slate-300"
              >
                {t.label}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-600 uppercase tracking-wide text-slate-400">
                  Pronto
                </span>
              </button>
            )
          )}
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">
            Tasa (Bs / USD)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-600 text-slate-400">
              Bs
            </span>
            <input
              type="number"
              step="0.01"
              value={tasaTexto}
              onChange={(e) => setTasaTexto(e.target.value)}
              className="w-36 rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-right font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
            />
          </div>
        </div>
      </div>

      {tab === "grupo" ? (
        <GrupoTab />
      ) : empresaActiva ? (
        <FinanzasEmpresa empresa={empresaActiva} />
      ) : null}
    </>
  );
}
