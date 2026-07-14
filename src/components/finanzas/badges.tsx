import type { Moneda, OrigenTransaccion, TipoCategoria, TipoTransaccion } from "@/lib/types";

export function BadgeTipoTransaccion({ tipo }: { tipo: TipoTransaccion }) {
  return tipo === "entrada" ? (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-600 text-emerald-700">
      Entrada
    </span>
  ) : (
    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-600 text-rose-700">
      Salida
    </span>
  );
}

/** Igual que el de transacción pero cubre 'ambas' (CRUD de categorías). */
export function BadgeTipoCategoria({ tipo }: { tipo: TipoCategoria }) {
  if (tipo !== "ambas") return <BadgeTipoTransaccion tipo={tipo} />;
  return (
    <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-600 text-navy-700">
      Entrada / Salida
    </span>
  );
}

const MAPA_ORIGEN: Record<OrigenTransaccion, { etiqueta: string; cls: string }> = {
  manual: { etiqueta: "Manual", cls: "bg-slate-100 text-slate-600" },
  nomina: { etiqueta: "Nómina", cls: "bg-navy-50 text-navy-700" },
  transferencia: { etiqueta: "Transferencia", cls: "bg-gold-500/15 text-gold-600" },
  factura: { etiqueta: "Factura", cls: "bg-emerald-50 text-emerald-700" },
  compra: { etiqueta: "Compra", cls: "bg-amber-50 text-amber-700" },
  traspaso: { etiqueta: "Traspaso", cls: "bg-violet-50 text-violet-700" },
};

export function BadgeOrigen({ origen }: { origen: OrigenTransaccion }) {
  const m = MAPA_ORIGEN[origen];
  return (
    <span className={`whitespace-nowrap rounded-full ${m.cls} px-2.5 py-1 text-xs font-600`}>
      {m.etiqueta}
    </span>
  );
}

const MAPA_MONEDA: Record<Moneda, string> = {
  VES: "bg-amber-50 text-amber-700",
  USD: "bg-emerald-50 text-emerald-700",
  USDT: "bg-teal-50 text-teal-700",
};

export function BadgeMoneda({ moneda }: { moneda: Moneda }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full ${MAPA_MONEDA[moneda]} px-2 py-0.5 text-[11px] font-600`}
    >
      {moneda}
    </span>
  );
}
