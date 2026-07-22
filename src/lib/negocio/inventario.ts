/**
 * Cálculos puros de Inventario, Mantenimiento y Asignación: estado de stock
 * de un consumible, último servicio de un equipo, agregados por estado y el
 * estado derivado del equipo (fuente de verdad: órdenes + asignaciones).
 */
import type {
  Asignacion,
  Consumible,
  DatosOrdenAsignacion,
  Equipo,
  EstadoEquipo,
  EstadoMantenimiento,
  RegistroMantenimiento,
} from "../types";
import { normalizarTexto } from "../format";

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

/** Estado automático del equipo: la baja persistida (venta/retiro) manda
    sobre todo; luego "En taller" sobre la asignación (un equipo asignado
    puede dañarse y entrar al taller). */
export function derivarEstadoEquipo(
  equipo: Pick<Equipo, "codigo" | "baja">,
  mantenimientos: RegistroMantenimiento[],
  asignaciones: Asignacion[]
): EstadoEquipo {
  if (equipo.baja) return "Retirado";
  if (enTaller(equipo.codigo, mantenimientos)) return "Mantenimiento";
  if (tieneAsignacionActiva(equipo.codigo, asignaciones)) return "Asignado";
  return "Disponible";
}

/** Equipos del inventario activo (sin baja/venta). */
export function equiposActivos(equipos: Equipo[]): Equipo[] {
  return equipos.filter((e) => !e.baja);
}

/** Equipos asignables: solo los que derivan a "Disponible" (ni retirados, ni
    en taller, ni ya asignados). Regla única de bloqueo de asignación. */
export function equiposDisponibles(
  equipos: Equipo[],
  mantenimientos: RegistroMantenimiento[],
  asignaciones: Asignacion[]
): Equipo[] {
  return equipos.filter((e) => derivarEstadoEquipo(e, mantenimientos, asignaciones) === "Disponible");
}

/* ---------------- Búsqueda por texto en las tablas ----------------
   Mismo criterio que filtrarMovimientos (kardex): un "blob" con los campos
   visibles de la fila, normalizado, y `includes`. Texto vacío no filtra. */

/** Filtra equipos por código, ubicación y ficha técnica (marca/modelo/serial). */
export function filtrarEquipos(equipos: Equipo[], texto: string): Equipo[] {
  const q = normalizarTexto(texto.trim());
  if (!q) return equipos;
  return equipos.filter((e) => {
    const f = e.ficha;
    const blob = `${e.codigo} ${e.ubicacion ?? ""} ${f?.marca ?? ""} ${f?.modelo ?? ""} ${
      f?.serial ?? ""
    }`;
    return normalizarTexto(blob).includes(q);
  });
}

/** Filtra consumibles por nombre, tipo y ubicación. */
export function filtrarConsumibles(consumibles: Consumible[], texto: string): Consumible[] {
  const q = normalizarTexto(texto.trim());
  if (!q) return consumibles;
  return consumibles.filter((c) =>
    normalizarTexto(`${c.nombre} ${c.tipo} ${c.ubicacion ?? ""}`).includes(q)
  );
}

/** Filtra asignaciones por ID, cliente/proyecto, equipos y observaciones. */
export function filtrarAsignaciones(asignaciones: Asignacion[], texto: string): Asignacion[] {
  const q = normalizarTexto(texto.trim());
  if (!q) return asignaciones;
  return asignaciones.filter((a) =>
    normalizarTexto(
      `${a.id} ${a.cliente} ${a.equipos.join(" ")} ${a.observaciones}`
    ).includes(q)
  );
}

/** Conteos de asignaciones para los KPIs del módulo. "En curso" son las
    activas que aún no tienen fecha «hasta» (se fija al finalizar). */
export function resumenAsignaciones(asignaciones: Asignacion[]): {
  activas: number;
  enCurso: number;
  finalizadas: number;
} {
  let activas = 0;
  let enCurso = 0;
  let finalizadas = 0;
  for (const a of asignaciones) {
    if (a.estado === "Activo") {
      activas += 1;
      if (!a.hasta) enCurso += 1;
    } else finalizadas += 1;
  }
  return { activas, enCurso, finalizadas };
}

/** Asignaciones que pertenecen a la MISMA orden de asignación (mismo nro. de
    requerimiento y cliente). Un guardado crea una asignación por equipo, pero
    el documento impreso es uno solo con todos ellos. Sin nro. de documento
    (histórico semilla u orden de entrega) la asignación va sola. */
export function asignacionesDeLaOrden(a: Asignacion, todas: Asignacion[]): Asignacion[] {
  const numero = a.documento?.numero;
  if (!numero) return [a];
  return todas.filter((o) => o.documento?.numero === numero && o.cliente === a.cliente);
}

/** Arma los datos del PDF "Orden de asignación" a partir del historial, para
    poder reimprimirla cuando ya no existe el formulario. Si la asignación no
    guardó cabecera, se reconstruye con lo que sí se sabe: el ID hace de número
    de referencia y la fecha "desde" de fecha del documento. */
export function armarOrdenAsignacion(
  a: Asignacion,
  todas: Asignacion[]
): DatosOrdenAsignacion {
  const grupo = asignacionesDeLaOrden(a, todas);
  const doc = a.documento;
  return {
    numero: doc?.numero ?? a.id,
    fecha: doc?.fecha ?? a.desde,
    cliente: a.cliente,
    observaciones: doc?.observaciones ?? "",
    entregadoPor: doc?.entregadoPor ?? "",
    recibidoPor: doc?.recibidoPor ?? "",
    filas: grupo.map((o) => ({
      id: o.id,
      // Una asignación puede cubrir varios equipos (histórico y órdenes de
      // entrega): en el documento van en una sola línea, como se registraron.
      equipo: o.equipos.join(", "),
      desde: o.desde,
      hasta: o.hasta,
      dias: o.dias,
      observaciones: o.observaciones,
    })),
  };
}

/** Clientes/proyectos ya usados, ordenados, para sugerir al escribir. */
export function clientesDeAsignaciones(asignaciones: Asignacion[]): string[] {
  return [...new Set(asignaciones.map((a) => a.cliente).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es")
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
