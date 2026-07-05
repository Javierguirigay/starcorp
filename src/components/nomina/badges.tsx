import type { CategoriaPago, EstatusEmpleado } from "@/lib/types";

export function BadgeCategoria({ categoria }: { categoria: CategoriaPago }) {
  return categoria === "Quincenal" ? (
    <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-600 text-navy-700">
      Quincenal
    </span>
  ) : (
    <span className="rounded-full bg-gold-500/15 px-2.5 py-1 text-xs font-600 text-gold-600">
      Semanal
    </span>
  );
}

const MAPA_ESTATUS: Record<EstatusEmpleado, string> = {
  Activo: "bg-emerald-50 text-emerald-700",
  Permiso: "bg-amber-50 text-amber-700",
  Inactivo: "bg-slate-100 text-slate-500",
};

export function BadgeEstatus({ estatus }: { estatus: EstatusEmpleado }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${MAPA_ESTATUS[estatus]} px-2.5 py-1 text-xs font-600`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
      {estatus}
    </span>
  );
}

/** Inicial del nombre para el avatar (réplica de inicial() del boceto). */
export function inicial(n: string): string {
  return (n || "?").trim().charAt(0).toUpperCase();
}

export function Avatar({ nombre, size = "h-9 w-9" }: { nombre: string; size?: string }) {
  return (
    <span
      className={`grid ${size} shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-600 text-gold-400`}
    >
      {inicial(nombre)}
    </span>
  );
}
