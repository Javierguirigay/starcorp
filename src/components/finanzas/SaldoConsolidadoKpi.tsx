"use client";

/**
 * KPI "Saldo consolidado" del dashboard: suma de los saldos reales de las
 * cuentas de todas las empresas, en USD a la tasa vigente (USDT 1:1, VES a
 * tasa BCV). Cliente porque lee el libro mayor del FinanzasProvider.
 */
import { Wallet } from "lucide-react";
import { EMPRESAS } from "@/lib/data/empresas";
import { money } from "@/lib/format";
import { saldoConsolidado, saldosDeEmpresas } from "@/lib/negocio/finanzas";
import { KpiCard } from "@/components/ui/KpiCard";
import { useFinanzas } from "./FinanzasProvider";

export function SaldoConsolidadoKpi() {
  const { transacciones, cuentas, tasa } = useFinanzas();
  const total = saldoConsolidado(saldosDeEmpresas(EMPRESAS, cuentas, transacciones, tasa));

  return (
    <KpiCard
      label="Saldo consolidado"
      valor={money(total)}
      sub={tasa > 0 ? `${money(total * tasa, "Bs")} equivalente` : "Tasa no disponible"}
      icon={Wallet}
      tone="gold"
    />
  );
}
