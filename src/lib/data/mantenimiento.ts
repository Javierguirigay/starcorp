import type { RegistroMantenimiento } from "../types";

/* Registros de mantenimiento.php. */
export const MANTENIMIENTOS: RegistroMantenimiento[] = [
  { equipo: "Generador", tipo: "Correctivo", programado: "07/06/2026", realizado: "En curso", estado: "En taller", tecnico: "Equipo LOTER", observaciones: "Correa del motor y aspa dañadas (Luminaria #1)." },
  { equipo: "Tanque (Frac-Tank)", tipo: "Preventivo", programado: "25/06/2026", realizado: "—", estado: "Pendiente", tecnico: "Por asignar", observaciones: "Prueba hidrostática programada." },
  { equipo: "Vacuum", tipo: "Preventivo", programado: "02/08/2026", realizado: "—", estado: "Programado", tecnico: "Por asignar", observaciones: "Revisión de bomba de vacío." },
  { equipo: "Luminaria #1", tipo: "Correctivo", programado: "08/06/2026", realizado: "08/06/2026", estado: "Completado", tecnico: "Equipo LOTER", observaciones: "Reemplazo de aspa, reparación in situ." },
  { equipo: "Chuto", tipo: "Preventivo", programado: "20/07/2026", realizado: "—", estado: "Programado", tecnico: "Por asignar", observaciones: "Cambio de aceite y revisión general." },
];

/* KPIs del resumen (hardcodeados en el boceto, se mantienen). */
export const RESUMEN_MANTENIMIENTO = [
  { label: "Al día", valor: 6, icono: "check-circle", color: "text-emerald-600", fondo: "bg-emerald-50" },
  { label: "Pendientes", valor: 1, icono: "clock", color: "text-amber-600", fondo: "bg-amber-50" },
  { label: "En taller", valor: 1, icono: "wrench", color: "text-gold-600", fondo: "bg-gold-500/15" },
  { label: "Programados", valor: 2, icono: "calendar", color: "text-navy-700", fondo: "bg-navy-50" },
] as const;
