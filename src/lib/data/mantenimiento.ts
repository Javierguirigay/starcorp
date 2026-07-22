import type { RegistroMantenimiento } from "../types";

/* Registros de mantenimiento (fechas ISO; realizado vacío = aún no realizado). */
const MANTENIMIENTOS_RAW: Omit<RegistroMantenimiento, "empresaId">[] = [
  { id: 1, equipo: "Generador", tipo: "Correctivo", programado: "2026-06-07", realizado: "", estado: "En taller", tecnico: "Equipo LOTER", observaciones: "Correa del motor y aspa dañadas (Luminaria #1)." },
  { id: 2, equipo: "Tanque (Frac-Tank)", tipo: "Preventivo", programado: "2026-06-25", realizado: "", estado: "Pendiente", tecnico: "Por asignar", observaciones: "Prueba hidrostática programada." },
  { id: 3, equipo: "Vacuum", tipo: "Preventivo", programado: "2026-08-02", realizado: "", estado: "Programado", tecnico: "Por asignar", observaciones: "Revisión de bomba de vacío." },
  { id: 4, equipo: "Luminaria #1", tipo: "Correctivo", programado: "2026-06-08", realizado: "2026-06-08", estado: "Completado", tecnico: "Equipo LOTER", observaciones: "Reemplazo de aspa, reparación in situ." },
  { id: 5, equipo: "Chuto", tipo: "Preventivo", programado: "2026-07-20", realizado: "", estado: "Programado", tecnico: "Por asignar", observaciones: "Cambio de aceite y revisión general." },
];

/* Todos de LOTER (empresaId). */
export const MANTENIMIENTOS: RegistroMantenimiento[] = MANTENIMIENTOS_RAW.map((m) => ({
  ...m,
  empresaId: "loter",
}));

export const NEXT_MANTENIMIENTO_ID = 6;
