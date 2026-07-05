/**
 * Cálculo de nómina. Réplica exacta de las funciones del boceto:
 *   salario_diario = salario_base_mensual / 30   (ambas categorías)
 *   días del período: Semanal = 7, Quincenal = 15
 *   descuento = faltas * salario_diario
 *   neto      = (días - faltas) * salario_diario
 */
import type { CategoriaPago, Empleado } from "../types";

export interface CalculoPago {
  dias: number;
  diario: number;
  faltas: number;
  desc: number;
  neto: number;
}

export function diasPeriodo(cat: CategoriaPago): number {
  return cat === "Semanal" ? 7 : 15;
}

export function diario(emp: Pick<Empleado, "base">): number {
  return emp.base / 30;
}

export function calcular(
  emp: Pick<Empleado, "base" | "categoria">,
  faltasMarcadas: number
): CalculoPago {
  const dp = diasPeriodo(emp.categoria);
  const d = diario(emp);
  const f = Math.min(faltasMarcadas, dp);
  return { dias: dp, diario: d, faltas: f, desc: f * d, neto: (dp - f) * d };
}

/** Redondeo a 2 decimales como el original: +x.toFixed(2). */
export function round2(n: number): number {
  return +n.toFixed(2);
}

/**
 * Rango de fechas ISO entre desde y hasta (inclusive), con el mismo
 * guard de 367 días del boceto. Devuelve [] si el rango es inválido.
 */
export function rangoFechas(desde: string, hasta: string): string[] {
  const out: string[] = [];
  const d = new Date(desde + "T00:00:00");
  const h = new Date(hasta + "T00:00:00");
  if (isNaN(d.getTime()) || isNaN(h.getTime()) || d > h) return out;
  let guard = 0;
  while (d <= h && guard < 367) {
    out.push(
      d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0")
    );
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return out;
}

export const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
