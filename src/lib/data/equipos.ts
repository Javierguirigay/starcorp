import type { CategoriaEquipo, Equipo, EquipoDetalle } from "../types";

/* Catálogo de categorías (de config.php). */
export const CATEGORIAS_EQUIPO: Record<CategoriaEquipo, string> = {
  petrolero: "Equipos petroleros",
  oficina: "Equipos de oficina",
  herramienta: "Herramientas",
  vehiculo: "Vehículos",
};

/* Catálogo de equipos (de config.php). El "código" es su propio nombre. */
export const EQUIPOS: Equipo[] = [
  { codigo: "Chuto", categoria: "petrolero", estado: "Asignado", ubicacion: "Base GO Wireline" },
  { codigo: "Tanque (Frac-Tank)", categoria: "petrolero", estado: "Disponible", ubicacion: "Patio LOTER" },
  { codigo: "Vacuum", categoria: "petrolero", estado: "Disponible", ubicacion: "Patio LOTER" },
  { codigo: "Luminaria #1", categoria: "petrolero", estado: "Asignado", ubicacion: "Pozo SBC-37" },
  { codigo: "Luminaria #2", categoria: "petrolero", estado: "Asignado", ubicacion: "Pozo SBC-37" },
  { codigo: "Luminaria #3", categoria: "petrolero", estado: "Asignado", ubicacion: "Pozo SBC-37" },
  { codigo: "Generador", categoria: "petrolero", estado: "Mantenimiento", ubicacion: "Taller" },
  { codigo: "Lowboy", categoria: "petrolero", estado: "Disponible", ubicacion: "Patio LOTER" },
  { codigo: "Traslado", categoria: "petrolero", estado: "Disponible", ubicacion: "Patio LOTER" },
];

/* Estado operativo por equipo para las tarjetas de la vista Equipos
   (dataset propio de equipos.php). */
export const EQUIPOS_DETALLE: EquipoDetalle[] = [
  { nombre: "Luminaria #1", estado: "Asignado", ubicacion: "Pozo SBC-37", asignacion: "IESV · S-005", mantenimiento: "Al día", proximo: "15/07/2026" },
  { nombre: "Luminaria #2", estado: "Asignado", ubicacion: "Pozo SBC-37", asignacion: "IESV · S-006", mantenimiento: "Al día", proximo: "15/07/2026" },
  { nombre: "Luminaria #3", estado: "Asignado", ubicacion: "Pozo SBC-37", asignacion: "IESV · S-007", mantenimiento: "Al día", proximo: "18/07/2026" },
  { nombre: "Generador", estado: "Mantenimiento", ubicacion: "Taller", asignacion: "—", mantenimiento: "En taller", proximo: "En curso" },
  { nombre: "Vacuum", estado: "Disponible", ubicacion: "Patio LOTER", asignacion: "—", mantenimiento: "Al día", proximo: "02/08/2026" },
  { nombre: "Chuto", estado: "Asignado", ubicacion: "Base GO Wireline", asignacion: "GO Wireline · S-004", mantenimiento: "Al día", proximo: "20/07/2026" },
  { nombre: "Tanque (Frac-Tank)", estado: "Disponible", ubicacion: "Patio LOTER", asignacion: "—", mantenimiento: "Pendiente", proximo: "25/06/2026" },
  { nombre: "Lowboy", estado: "Disponible", ubicacion: "Patio LOTER", asignacion: "—", mantenimiento: "Al día", proximo: "10/08/2026" },
  { nombre: "Traslado", estado: "Disponible", ubicacion: "Patio LOTER", asignacion: "—", mantenimiento: "Al día", proximo: "10/08/2026" },
];
