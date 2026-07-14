"use client";

/**
 * Grilla "Saldos por empresa" del dashboard: mismo saldo real que muestran las
 * tarjetas del tab Grupo (balance del libro mayor de cada empresa).
 */
import { EMPRESAS } from "@/lib/data/empresas";
import type { Moneda } from "@/lib/types";
import { money } from "@/lib/format";
import { saldosDeEmpresas, SIMBOLO_MONEDA } from "@/lib/negocio/finanzas";
import { useFinanzas } from "./FinanzasProvider";

export function SaldosEmpresasGrid() {
  const { transacciones, cuentas, tasa } = useFinanzas();
  const saldos = saldosDeEmpresas(EMPRESAS, cuentas, transacciones, tasa);

  return (
    <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2">
      {saldos.map((s) => (
        <div key={s.key} className="bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-600 text-navy-900">
              <span
                className={`h-2 w-2 rounded-full ${s.activa ? "bg-emerald-500" : "bg-slate-300"}`}
              ></span>
              {s.nombre}
            </span>
            {s.activa && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-600 text-emerald-700">
                Activa
              </span>
            )}
          </div>
          <p className="mt-3 font-mono text-2xl font-600 text-navy-950">
            {money(s.consolidadoUSD)}
          </p>
          <p className="truncate font-mono text-sm text-slate-400">
            {(Object.entries(s.porMoneda) as [Moneda, number][])
              .map(([m, x]) => money(x, SIMBOLO_MONEDA[m]))
              .join(" · ") || "Sin cuentas"}
          </p>
        </div>
      ))}
    </div>
  );
}
