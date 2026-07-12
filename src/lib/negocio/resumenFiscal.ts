/**
 * Agregación genérica del "Resumen de Débitos y Créditos Fiscales IVA":
 * la misma forma sirve para la sección de CRÉDITOS (compras) y la de
 * DÉBITOS (ventas) — solo cambia de dónde salen las partidas.
 * Solo se opera con alícuota general 16 %: las filas de alícuota adicional
 * y reducida existen en la vista/PDF pero siempre en 0,00.
 */
import { round2 } from "./nomina";
import type { RangoFechas } from "./quincenas";
import { enRango } from "./quincenas";

/** Una operación del período: base imponible + impuesto (crédito o débito)
    + porción no gravada / sin derecho a crédito. */
export interface PartidaFiscal {
  fecha: string; // ISO
  baseBs: number;
  impuestoBs: number;
  noGravadasBs: number;
}

export interface ResumenFiscal {
  noGravadasBase: number;
  generalBase: number;
  /** Créditos (compras) o débitos (ventas) de la alícuota general. */
  generalMonto: number;
  totalBase: number;
  totalMonto: number;
  /** Total de créditos/débitos fiscales del período. */
  totalPeriodo: number;
}

export function agregarResumenFiscal(
  partidas: PartidaFiscal[],
  rango: RangoFechas
): ResumenFiscal {
  const delPeriodo = partidas.filter((p) => enRango(p.fecha, rango));
  const noGravadas = round2(delPeriodo.reduce((s, p) => s + p.noGravadasBs, 0));
  const base = round2(delPeriodo.reduce((s, p) => s + p.baseBs, 0));
  const monto = round2(delPeriodo.reduce((s, p) => s + p.impuestoBs, 0));
  return {
    noGravadasBase: noGravadas,
    generalBase: base,
    generalMonto: monto,
    totalBase: base,
    totalMonto: monto,
    totalPeriodo: monto,
  };
}
