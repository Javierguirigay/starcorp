/**
 * Cálculo del comprobante de retención de IVA.
 * Alícuota fija 16%; el % de retención (75 o 100) depende del proveedor.
 * Réplica de recalc() de retenciones.php.
 */
import { parseVES } from "../format";
import type {
  FacturaRecibida,
  LineaRetencion,
  PorcentajeRetencion,
  RetencionLinea,
} from "../types";
import { round2 } from "./nomina";

export const ALICUOTA_IVA = 0.16;

export interface CalculoLinea {
  base: number;
  impuesto: number;
  retenido: number;
}

export function calcularLinea(
  baseImponible: string,
  pct: PorcentajeRetencion
): CalculoLinea {
  const base = parseVES(baseImponible);
  const impuesto = base * ALICUOTA_IVA;
  const retenido = impuesto * (pct / 100);
  return { base, impuesto, retenido };
}

export interface TotalesRetencion {
  base: number;
  impuesto: number;
  retenido: number;
}

export function totalizar(
  lineas: Pick<LineaRetencion, "baseImponible">[],
  pct: PorcentajeRetencion
): TotalesRetencion {
  let base = 0,
    impuesto = 0,
    retenido = 0;
  for (const l of lineas) {
    const c = calcularLinea(l.baseImponible, pct);
    base += c.base;
    impuesto += c.impuesto;
    retenido += c.retenido;
  }
  return { base, impuesto, retenido };
}

/* ---------------- Comprobantes persistidos (montos numéricos) ---------------- */

/**
 * Siguiente N° de comprobante: AAAAMM + correlativo de 8 dígitos
 * (ej. "20260700000061"). Correlativo = máximo del período + 1; si el período
 * no tiene comprobantes, continúa el máximo global (numeración corrida).
 */
export function siguienteComprobante(
  anio: number,
  mes: number,
  existentes: string[]
): string {
  const prefijo = `${anio}${String(mes).padStart(2, "0")}`;
  const sufijos = (lista: string[]) =>
    lista
      .map((c) => parseInt(c.slice(6), 10))
      .filter((n) => !Number.isNaN(n));
  const delPeriodo = sufijos(existentes.filter((c) => c.startsWith(prefijo)));
  const todos = sufijos(existentes);
  const max = delPeriodo.length ? Math.max(...delPeriodo) : todos.length ? Math.max(...todos) : 0;
  return prefijo + String(max + 1).padStart(8, "0");
}

/** IVA retenido de un impuesto según el % (75/100), redondeado a 2 decimales. */
export function retenidoDeImpuesto(impuesto: number, pct: PorcentajeRetencion): number {
  return round2(impuesto * (pct / 100));
}

/** Línea de comprobante pre-llenada desde una factura recibida. */
export function lineaDesdeCompra(
  compra: FacturaRecibida,
  numOp: number,
  pct: PorcentajeRetencion
): RetencionLinea {
  return {
    numOp,
    fechaDoc: compra.fecha,
    numFactura: compra.numeroFactura,
    numControl: compra.numeroControl,
    ...(compra.notaDebito ? { notaDebito: compra.notaDebito } : {}),
    ...(compra.notaCredito ? { notaCredito: compra.notaCredito } : {}),
    ...(compra.facturaAfectada ? { facturaAfectada: compra.facturaAfectada } : {}),
    tipoTransaccion: compra.tipoTransaccion,
    totalConIvaBs: compra.totalConIvaBs,
    sinCreditoBs: compra.sinCreditoBs,
    baseImponibleBs: compra.baseImponibleBs,
    impuestoIvaBs: compra.impuestoIvaBs,
    ivaRetenidoBs: retenidoDeImpuesto(compra.impuestoIvaBs, pct),
  };
}

export interface TotalesComprobante {
  totalConIvaBs: number;
  totalSinCreditoBs: number;
  totalBaseBs: number;
  totalImpuestoBs: number;
  totalRetenidoBs: number;
}

export function totalizarLineas(lineas: RetencionLinea[]): TotalesComprobante {
  return {
    totalConIvaBs: round2(lineas.reduce((s, l) => s + l.totalConIvaBs, 0)),
    totalSinCreditoBs: round2(lineas.reduce((s, l) => s + l.sinCreditoBs, 0)),
    totalBaseBs: round2(lineas.reduce((s, l) => s + l.baseImponibleBs, 0)),
    totalImpuestoBs: round2(lineas.reduce((s, l) => s + l.impuestoIvaBs, 0)),
    totalRetenidoBs: round2(lineas.reduce((s, l) => s + l.ivaRetenidoBs, 0)),
  };
}

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
