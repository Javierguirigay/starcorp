/**
 * Cortes quincenales de los libros fiscales: del 1 al 15 y del 16 al fin de
 * mes (28/29/30/31 según el mes). Las fechas ISO se manipulan como strings
 * (mismo criterio que formatFechaVE) para evitar corrimientos de zona horaria;
 * new Date solo se usa con componentes numéricos (sin parseo de strings).
 *
 * Casos de verificación:
 *   rangoQuincena(2026, 2, 2) → { desde: "2026-02-16", hasta: "2026-02-28" }
 *   rangoQuincena(2028, 2, 2) → hasta "2028-02-29" (bisiesto)
 *   rangoQuincena(2026, 4, 2) → hasta "2026-04-30"
 *   rangoQuincena(2026, 7, 2) → hasta "2026-07-31"
 */
import { MESES } from "./retenciones";

export interface Quincena {
  anio: number;
  mes: number; // 1-12
  quincena: 1 | 2;
}

export interface RangoFechas {
  desde: string; // ISO
  hasta: string; // ISO
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Último día del mes (mes 1-12): día 0 del mes siguiente. */
export function ultimoDiaMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate();
}

/** Quincena a la que pertenece una fecha ISO. Fecha inválida → null. */
export function obtenerQuincena(fechaISO: string): Quincena | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaISO ?? "");
  if (!m) return null;
  return {
    anio: Number(m[1]),
    mes: Number(m[2]),
    quincena: Number(m[3]) <= 15 ? 1 : 2,
  };
}

export function rangoQuincena(anio: number, mes: number, quincena: 1 | 2): RangoFechas {
  if (quincena === 1) {
    return { desde: `${anio}-${pad2(mes)}-01`, hasta: `${anio}-${pad2(mes)}-15` };
  }
  return {
    desde: `${anio}-${pad2(mes)}-16`,
    hasta: `${anio}-${pad2(mes)}-${pad2(ultimoDiaMes(anio, mes))}`,
  };
}

/** Rango del mes completo (para el Resumen mensual). */
export function rangoMes(anio: number, mes: number): RangoFechas {
  return {
    desde: `${anio}-${pad2(mes)}-01`,
    hasta: `${anio}-${pad2(mes)}-${pad2(ultimoDiaMes(anio, mes))}`,
  };
}

/** ISO dentro del rango inclusive (comparación lexicográfica de strings ISO). */
export function enRango(fechaISO: string, rango: RangoFechas): boolean {
  return fechaISO >= rango.desde && fechaISO <= rango.hasta;
}

/** "JULIO 2026" */
export function etiquetaMes(anio: number, mes: number): string {
  return `${(MESES[mes - 1] ?? "").toUpperCase()} ${anio}`;
}

/** "JULIO 2026 — 1RA QUINCENA" */
export function etiquetaQuincena(anio: number, mes: number, quincena: 1 | 2): string {
  return `${etiquetaMes(anio, mes)} — ${quincena === 1 ? "1RA" : "2DA"} QUINCENA`;
}
