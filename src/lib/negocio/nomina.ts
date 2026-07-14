/**
 * Cálculo de nómina. Réplica exacta de las funciones del boceto:
 *   salario_diario = salario_base_mensual / 30   (ambas categorías)
 *   días del período: Semanal = 7, Quincenal = 15
 *   descuento = faltas * salario_diario
 *   neto      = (días - faltas) * salario_diario
 */
import type { CategoriaPago, Empleado, PagoHistorial } from "../types";
import { fmtISO } from "../format";
import { obtenerQuincena, rangoQuincena, type RangoFechas } from "./quincenas";

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

export interface CalculoPagoAdelanto extends CalculoPago {
  /** Adelanto efectivamente aplicado (≤ bruto tras faltas; garantiza neto ≥ 0). */
  descAdelanto: number;
}

/**
 * Igual que calcular(), restando además el adelanto pendiente del empleado.
 * Salvaguarda: nunca genera neto negativo; si el adelanto supera el bruto
 * disponible, se aplica solo hasta dejar neto = 0 y el remanente queda
 * pendiente para el próximo pago.
 */
export function calcularConAdelanto(
  emp: Pick<Empleado, "base" | "categoria">,
  faltasMarcadas: number,
  adelantoPendienteUSD: number
): CalculoPagoAdelanto {
  const c = calcular(emp, faltasMarcadas);
  const descAdelanto = Math.min(Math.max(adelantoPendienteUSD, 0), c.neto);
  return { ...c, descAdelanto, neto: c.neto - descAdelanto };
}

/** Redondeo a 2 decimales como el original: +x.toFixed(2). */
export function round2(n: number): number {
  return +n.toFixed(2);
}

/* ---------------- Períodos de pago (Desde/Hasta) ---------------- */

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Lunes y domingo de la semana (lun–dom) que contiene la fecha ISO. */
export function rangoSemana(fechaISO: string): RangoFechas {
  const m = ISO_RE.exec(fechaISO ?? "");
  if (!m) return { desde: fechaISO, hasta: fechaISO };
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  // getDay(): 0=Dom … 6=Sáb. Retroceso hasta el lunes = (getDay()+6)%7.
  const offsetLunes = (new Date(anio, mes - 1, dia).getDay() + 6) % 7;
  const lunes = new Date(anio, mes - 1, dia - offsetLunes);
  const domingo = new Date(anio, mes - 1, dia - offsetLunes + 6);
  return { desde: fmtISO(lunes), hasta: fmtISO(domingo) };
}

/**
 * Período que corresponde a HOY según la categoría: la semana lunes–domingo en
 * curso (Semanal) o la quincena calendario 1–15 / 16–fin de mes (Quincenal).
 */
export function periodoActual(categoria: CategoriaPago, hoyISO: string): RangoFechas {
  if (categoria === "Semanal") return rangoSemana(hoyISO);
  const q = obtenerQuincena(hoyISO);
  if (!q) return { desde: hoyISO, hasta: hoyISO };
  return rangoQuincena(q.anio, q.mes, q.quincena);
}

/**
 * Deriva el HASTA a partir de un DESDE elegido a mano (pago adelantado): el
 * DESDE se respeta tal cual. Semanal → DESDE + 6 días; Quincenal → fin de la
 * quincena calendario que contiene el DESDE.
 */
export function periodoDesde(categoria: CategoriaPago, desdeISO: string): RangoFechas {
  const m = ISO_RE.exec(desdeISO ?? "");
  if (!m) return { desde: desdeISO, hasta: desdeISO };
  if (categoria === "Semanal") {
    const domingo = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 6);
    return { desde: desdeISO, hasta: fmtISO(domingo) };
  }
  const q = obtenerQuincena(desdeISO);
  if (!q) return { desde: desdeISO, hasta: desdeISO };
  return { desde: desdeISO, hasta: rangoQuincena(q.anio, q.mes, q.quincena).hasta };
}

/**
 * Busca en el historial un pago de la MISMA categoría cuyo período se solape con
 * [desde, hasta]. Dos rangos ISO (yyyy-mm-dd) se solapan si
 *   a.desde <= b.hasta && b.desde <= a.hasta
 * (comparación lexicográfica de strings ISO, correcta para fechas). Sirve para
 * impedir pagar dos veces la misma semana/quincena aunque las fechas se hayan
 * corrido a mano (pago adelantado). Devuelve el primer pago que solapa, o null.
 */
export function periodoYaPagado(
  historial: PagoHistorial[],
  categoria: CategoriaPago,
  desde: string,
  hasta: string
): PagoHistorial | null {
  return (
    historial.find(
      (h) => h.categoria === categoria && h.desde <= hasta && desde <= h.hasta
    ) ?? null
  );
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
