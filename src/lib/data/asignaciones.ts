import type { Asignacion } from "../types";

/* Historial real tomado de la orden ASG-2026-001 (asignacion-equipos.php). */
export const ASIGNACIONES: Asignacion[] = [
  { id: "S-001", cliente: "IESV / Pozo Muc-102", equipos: "Luminaria #1, Luminaria #2, Generador", desde: "03/06/2026", hasta: "12/06/2026", dias: 10, estado: "Finalizado", observaciones: "Equipos en locación" },
  { id: "S-002", cliente: "IESV / Pozo Muc-102", equipos: "Luminaria #3", desde: "04/06/2026", hasta: "12/06/2026", dias: 9, estado: "Finalizado", observaciones: "Equipo en locación" },
  { id: "S-003", cliente: "GO Wireline Services, C.A.", equipos: "Vacuum", desde: "10/06/2026", hasta: "11/06/2026", dias: 2, estado: "Finalizado", observaciones: "Prueba hidrostática con el equipo" },
  { id: "S-004", cliente: "GO Wireline Services, C.A.", equipos: "Chuto", desde: "12/06/2026", hasta: "12/06/2026", dias: 1, estado: "Finalizado", observaciones: "Equipo en base de operaciones LOTER" },
  { id: "S-005", cliente: "IESV / Pozo SBC-37", equipos: "Luminaria #1", desde: "13/06/2026", hasta: "17/06/2026", dias: 5, estado: "Activo", observaciones: "Equipo en locación" },
  { id: "S-006", cliente: "IESV / Pozo SBC-37", equipos: "Luminaria #2, Generador", desde: "14/06/2026", hasta: "17/06/2026", dias: 4, estado: "Activo", observaciones: "Equipo en locación" },
  { id: "S-007", cliente: "IESV / Pozo SBC-37", equipos: "Luminaria #3", desde: "15/06/2026", hasta: "17/06/2026", dias: 3, estado: "Activo", observaciones: "Equipo en locación" },
];

/* El contador de IDs S-00x del formulario arranca donde termina el historial. */
export const SIGUIENTE_ASIG = 7;
