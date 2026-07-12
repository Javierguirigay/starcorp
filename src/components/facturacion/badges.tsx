import type {
  EstadoCompra,
  EstadoFactura,
  EstadoPreFactura,
  EstadoReporte,
} from "@/lib/types";

type EstadoDocumento = EstadoReporte | EstadoPreFactura | EstadoFactura | EstadoCompra;

const MAPA: Record<EstadoDocumento, { etiqueta: string; cls: string }> = {
  pendiente: { etiqueta: "Pendiente", cls: "bg-amber-50 text-amber-700" },
  prefacturado: { etiqueta: "Prefacturado", cls: "bg-navy-50 text-navy-700" },
  borrador: { etiqueta: "Borrador", cls: "bg-slate-100 text-slate-600" },
  emitida: { etiqueta: "Emitida", cls: "bg-navy-50 text-navy-700" },
  facturada: { etiqueta: "Facturada", cls: "bg-emerald-50 text-emerald-700" },
  cobrada: { etiqueta: "Cobrada", cls: "bg-emerald-50 text-emerald-700" },
  pagada: { etiqueta: "Pagada", cls: "bg-emerald-50 text-emerald-700" },
};

export function BadgeEstadoDoc({ estado }: { estado: EstadoDocumento }) {
  const m = MAPA[estado];
  return (
    <span className={`whitespace-nowrap rounded-full ${m.cls} px-2.5 py-1 text-xs font-600`}>
      {m.etiqueta}
    </span>
  );
}
