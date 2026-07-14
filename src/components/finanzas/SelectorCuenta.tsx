"use client";

/**
 * Selector de cuenta financiera de una empresa (cuentas activas, con su
 * moneda visible). Compartido por los modales de Finanzas y por los flujos
 * automáticos de otros módulos (nómina, cobros, pagos de compras).
 */
import { useFinanzas } from "./FinanzasProvider";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function SelectorCuenta({
  empresaId,
  value,
  onChange,
  excluirId,
  className,
}: {
  empresaId: string;
  /** "" = sin selección. */
  value: number | "";
  onChange: (cuentaId: number | "") => void;
  /** Oculta una cuenta (ej. la cuenta origen en un traspaso). */
  excluirId?: number;
  className?: string;
}) {
  const finanzas = useFinanzas();
  const cuentas = finanzas
    .cuentasDe(empresaId)
    .filter((c) => c.activa && c.id !== excluirId);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      className={className ?? inputCls}
    >
      <option value="">Selecciona cuenta…</option>
      {cuentas.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nombre} ({c.moneda}){c.predeterminada ? " · predeterminada" : ""}
        </option>
      ))}
    </select>
  );
}
