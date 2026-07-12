"use client";

/**
 * Grilla "Saldos por empresa" del dashboard: mismo saldo real que muestran las
 * tarjetas del tab Grupo (balance del libro mayor de cada empresa).
 */
import { EMPRESAS } from "@/lib/data/empresas";
import { money } from "@/lib/format";
import { saldosDeEmpresas } from "@/lib/negocio/finanzas";
import { useFinanzas } from "./FinanzasProvider";

export function SaldosEmpresasGrid() {
  const { transacciones } = useFinanzas();
  const saldos = saldosDeEmpresas(EMPRESAS, transacciones);

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
          <p className="mt-3 font-mono text-2xl font-600 text-navy-950">{money(s.balanceUSD)}</p>
          <p className="font-mono text-sm text-slate-400">{money(s.balanceBs, "Bs")}</p>
        </div>
      ))}
    </div>
  );
}
