"use client";

/**
 * KPI "Saldo consolidado" del dashboard: suma de los saldos reales de todas
 * las empresas. Cliente porque lee el libro mayor del FinanzasProvider.
 */
import { Wallet } from "lucide-react";
import { EMPRESAS } from "@/lib/data/empresas";
import { money } from "@/lib/format";
import { saldoConsolidado, saldosDeEmpresas } from "@/lib/negocio/finanzas";
import { KpiCard } from "@/components/ui/KpiCard";
import { useFinanzas } from "./FinanzasProvider";

export function SaldoConsolidadoKpi() {
  const { transacciones } = useFinanzas();
  const total = saldoConsolidado(saldosDeEmpresas(EMPRESAS, transacciones));

  return (
    <KpiCard
      label="Saldo consolidado"
      valor={money(total.usd)}
      sub={`${money(total.bs, "Bs")} equivalente`}
      icon={Wallet}
      tone="gold"
    />
  );
}
