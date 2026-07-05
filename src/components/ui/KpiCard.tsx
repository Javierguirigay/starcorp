import type { LucideIcon } from "lucide-react";

/** Tarjeta KPI del dashboard (tono navy o gold, como el boceto). */
export function KpiCard({
  label,
  valor,
  sub,
  icon: Icon,
  tone = "navy",
}: {
  label: string;
  valor: string;
  sub: string;
  icon: LucideIcon;
  tone?: "navy" | "gold";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-sm font-500 text-slate-500">{label}</p>
        <span
          className={`grid h-9 w-9 place-items-center rounded-xl ${
            tone === "gold" ? "bg-gold-500/15 text-gold-600" : "bg-navy-900/5 text-navy-700"
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-700 tracking-tight text-navy-950">{valor}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}
