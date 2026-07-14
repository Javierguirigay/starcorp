/**
 * Cálculos puros de Inventario, Mantenimiento y Asignación: estado de stock
 * de un consumible, último servicio de un equipo, agregados por estado y el
 * estado derivado del equipo (fuente de verdad: órdenes + asignaciones).
 */
import type {
  Asignacion,
  Consumible,
  Equipo,
  EstadoEquipo,
  EstadoMantenimiento,
  RegistroMantenimiento,
} from "../types";

export type EstadoStock = "ok" | "bajo" | "agotado";

/** Estado de existencias según cantidad vs stock mínimo. */
export function estadoStock(c: Pick<Consumible, "cantidad" | "stockMinimo">): EstadoStock {
  if (c.cantidad <= 0) return "agotado";
  if (c.cantidad <= c.stockMinimo) return "bajo";
  return "ok";
}

export const ETIQUETA_STOCK: Record<EstadoStock, string> = {
  ok: "En stock",
  bajo: "Bajo stock",
  agotado: "Agotado",
};

export interface UltimoServicio {
  fecha: string; // ISO
  tipo: RegistroMantenimiento["tipo"];
  tecnico: string;
  observaciones: string;
}

/** Último servicio realizado (mantenimiento Completado con fecha) de un equipo. */
export function ultimoServicio(
  equipo: string,
  mantenimientos: RegistroMantenimiento[]
): UltimoServicio | null {
  const completados = mantenimientos
    .filter((m) => m.equipo === equipo && m.estado === "Completado" && m.realizado)
    .sort((a, b) => (a.realizado < b.realizado ? 1 : -1));
  const u = completados[0];
  return u
    ? { fecha: u.realizado, tipo: u.tipo, tecnico: u.tecnico, observaciones: u.observaciones }
    : null;
}

export const ESTADOS_MANTENIMIENTO: EstadoMantenimiento[] = [
  "Programado",
  "Pendiente",
  "En taller",
  "Completado",
];

/* ---------------- Estado derivado del equipo ----------------
   Los equipos se referencian por su `codigo` (nombre); renombrar un equipo
   desvincula sus órdenes y asignaciones históricas. */

/** True si el equipo tiene una orden de mantenimiento "En taller".
    (Programado/Pendiente no bloquean: el equipo sigue operativo.) */
export function enTaller(codigo: string, mantenimientos: RegistroMantenimiento[]): boolean {
  return mantenimientos.some((m) => m.equipo === codigo && m.estado === "En taller");
}

/** True si el equipo figura en alguna asignación con estado "Activo". */
export function tieneAsignacionActiva(codigo: string, asignaciones: Asignacion[]): boolean {
  return asignaciones.some((a) => a.estado === "Activo" && a.equipos.includes(codigo));
}

/** Estado automático del equipo: "En taller" manda sobre la asignación
    (un equipo asignado puede dañarse y entrar al taller). */
export function derivarEstadoEquipo(
  codigo: string,
  mantenimientos: RegistroMantenimiento[],
  asignaciones: Asignacion[]
): EstadoEquipo {
  if (enTaller(codigo, mantenimientos)) return "Mantenimiento";
  if (tieneAsignacionActiva(codigo, asignaciones)) return "Asignado";
  return "Disponible";
}

/** Equipos asignables: solo los que derivan a "Disponible" (ni en taller ni
    ya asignados). Regla única de bloqueo de asignación. */
export function equiposDisponibles(
  equipos: Equipo[],
  mantenimientos: RegistroMantenimiento[],
  asignaciones: Asignacion[]
): Equipo[] {
  return equipos.filter(
    (e) => derivarEstadoEquipo(e.codigo, mantenimientos, asignaciones) === "Disponible"
  );
}

/** Cantidad de mantenimientos por estado (para KPIs). */
export function conteoPorEstado(
  mantenimientos: RegistroMantenimiento[]
): Record<EstadoMantenimiento, number> {
  const base: Record<EstadoMantenimiento, number> = {
    Programado: 0,
    Pendiente: 0,
    "En taller": 0,
    Completado: 0,
  };
  for (const m of mantenimientos) base[m.estado] += 1;
  return base;
}
