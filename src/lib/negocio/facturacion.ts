/**
 * Cálculos puros del sub-módulo Facturación (ventas).
 *
 * Casos de verificación (documentos reales en /docs/referencias):
 *   Prefactura 066: 1×$250 + 2×$260 → subtotal $770,00; IVA $123,20; total $893,20.
 *   Factura 000116 (066 a tasa 602,33, conversión POR UNITARIO):
 *     $250,00 → Bs 150.582,50; $260,00 → Bs 156.605,80;
 *     subtotal Bs 463.794,10; IVA Bs 74.207,06; total Bs 538.001,16.
 */
import type { Cliente, Factura, PeriodoServicio, RenglonFactura } from "../types";
import { round2 } from "./nomina";
import { diasEntre } from "./fechas";
import { ALICUOTA_IVA } from "./retenciones";
import type { RangoFechas } from "./quincenas";
import { enRango } from "./quincenas";
import { agregarResumenFiscal, type ResumenFiscal } from "./resumenFiscal";

/* ---------------- Totales de documento ---------------- */

export interface TotalesDocumento {
  subtotal: number;
  iva: number;
  total: number;
}

export function totalRenglon(r: Pick<RenglonFactura, "can" | "pUnit">): number {
  return round2(r.can * r.pUnit);
}

export function totalesRenglones(renglones: RenglonFactura[]): TotalesDocumento {
  const subtotal = round2(renglones.reduce((s, r) => s + totalRenglon(r), 0));
  const iva = round2(subtotal * ALICUOTA_IVA);
  return { subtotal, iva, total: round2(subtotal + iva) };
}

/** Conversión USD → Bs POR PRECIO UNITARIO: se convierte cada p.unit y los
    totales se recalculan en Bs a partir de los unitarios convertidos. */
export function convertirRenglonesATasa(
  renglones: RenglonFactura[],
  tasa: number
): RenglonFactura[] {
  return renglones.map((r) => ({ ...r, pUnit: round2(r.pUnit * tasa) }));
}

/* ---------------- Correlativos y fechas de documento ---------------- */

/** Siguiente correlativo: máximo numérico + 1, con ancho fijo ("066" → "069"). */
export function siguienteNumero(numeros: string[], ancho = 3): string {
  const max = numeros.reduce((m, n) => {
    const v = parseInt(n, 10);
    return Number.isNaN(v) ? m : Math.max(m, v);
  }, 0);
  return String(max + 1).padStart(ancho, "0");
}

/** ISO → "13/06/2026" (formato de los renglones del documento real). */
export function fechaDoc(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso ?? "";
}

/** ISO → "2/7/2026" (formato de la fecha del encabezado del documento real). */
export function fechaDocCorta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : iso ?? "";
}

/* ---------------- Reporte de servicio → pre-factura ---------------- */

/** Días del rango inclusive (auto-calculado, editable en el formulario). */
export function diasDePeriodo(desde: string, hasta: string): number {
  const d = diasEntre(desde, hasta);
  return d === "" ? 0 : d;
}

/** Renglón sugerido desde un período de servicio: CAN = días, descripción =
    concepto + rango de fechas, P. UNIT = tarifa referencial del catálogo (0 si
    fue texto libre). El usuario edita todo antes de guardar la pre-factura. */
export function renglonDeReporte(
  p: PeriodoServicio
): { can: number; descripcion: string; pUnit: number } {
  return {
    can: p.dias,
    descripcion: `${p.concepto} DEL ${fechaDoc(p.desde)} AL ${fechaDoc(p.hasta)}`,
    pUnit: p.tarifaRef ?? 0,
  };
}

/* ---------------- Libro de ventas (débitos fiscales) ---------------- */

export interface FilaLibroVentas {
  numOp: number;
  fecha: string; // ISO
  numeroFactura: string;
  numeroControl: string;
  cliente: string;
  rif: string;
  totalConIvaBs: number;
  baseImponibleBs: number;
  alicuota: number; // 16
  debitoFiscalBs: number;
}

export interface TotalesLibroVentas {
  totalConIvaBs: number;
  baseImponibleBs: number;
  debitoFiscalBs: number;
}

/** Filas del libro auto-alimentadas por las facturas emitidas en el rango,
    orden cronológico y N° de operación secuencial. */
export function filasLibroVentas(
  facturas: Factura[],
  clientes: Cliente[],
  rango: RangoFechas
): FilaLibroVentas[] {
  return facturas
    .filter((f) => enRango(f.fechaEmision, rango))
    .sort((a, b) =>
      a.fechaEmision === b.fechaEmision ? a.id - b.id : a.fechaEmision < b.fechaEmision ? -1 : 1
    )
    .map((f, i) => {
      const t = totalesRenglones(f.renglones);
      const c = clientes.find((x) => x.id === f.clienteId);
      return {
        numOp: i + 1,
        fecha: f.fechaEmision,
        numeroFactura: f.numeroFactura,
        numeroControl: f.numeroControl,
        cliente: c?.razonSocial ?? "—",
        rif: c?.rif ?? "—",
        totalConIvaBs: t.total,
        baseImponibleBs: t.subtotal,
        alicuota: 16,
        debitoFiscalBs: t.iva,
      };
    });
}

export function totalesLibroVentas(filas: FilaLibroVentas[]): TotalesLibroVentas {
  return {
    totalConIvaBs: round2(filas.reduce((s, f) => s + f.totalConIvaBs, 0)),
    baseImponibleBs: round2(filas.reduce((s, f) => s + f.baseImponibleBs, 0)),
    debitoFiscalBs: round2(filas.reduce((s, f) => s + f.debitoFiscalBs, 0)),
  };
}

/** Sección de DÉBITOS del "Resumen de Débitos y Créditos Fiscales IVA",
    calculada desde las facturas emitidas del mes (misma agregación genérica
    que el resumen de créditos de compras). Solo se emite gravado a alícuota
    general 16 %: no-gravadas/adicional/reducida quedan en 0,00. */
export function resumenDebitosMes(facturas: Factura[], rango: RangoFechas): ResumenFiscal {
  return agregarResumenFiscal(
    facturas.map((f) => {
      const t = totalesRenglones(f.renglones);
      return { fecha: f.fechaEmision, baseBs: t.subtotal, impuestoBs: t.iva, noGravadasBs: 0 };
    }),
    rango
  );
}
