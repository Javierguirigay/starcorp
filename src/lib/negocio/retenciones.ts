/**
 * Cálculo del comprobante de retención de IVA.
 * Alícuota fija 16%; el % de retención (75 o 100) depende del proveedor.
 * Réplica de recalc() de retenciones.php.
 */
import { parseVES } from "../format";
import type { LineaRetencion, PorcentajeRetencion } from "../types";

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
