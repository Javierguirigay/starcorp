"use client";

/**
 * Módulo Finanzas con pestañas: Grupo (vista original) + una pestaña por
 * empresa del conglomerado. Las empresas sin finanzas habilitadas se muestran
 * deshabilitadas con badge "Pronto" (patrón del sidebar).
 */
import { useState } from "react";
import { FINANZAS_TABS } from "@/lib/data/finanzas";
import { EMPRESAS } from "@/lib/data/empresas";
import { TasaInput } from "./TasaInput";
import { GrupoTab } from "./GrupoTab";
import { FinanzasEmpresa } from "./FinanzasEmpresa";

const tabCls = (activo: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-600 ${
    activo ? "bg-navy-900 text-white" : "text-slate-500 hover:text-navy-900"
  }`;

export function FinanzasModule() {
  const [tab, setTab] = useState<string>("grupo");

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

        <TasaInput />
      </div>

      {tab === "grupo" ? (
        <GrupoTab />
      ) : empresaActiva ? (
        <FinanzasEmpresa empresa={empresaActiva} />
      ) : null}
    </>
  );
}
