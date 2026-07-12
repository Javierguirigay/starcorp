/**
 * Cálculos puros del sub-módulo Gestión de Compras (libro de compras y
 * resumen de créditos fiscales). Montos en Bs.
 *
 * Verificación (libro de compras real de julio 2026, /docs/referencias):
 *   8 operaciones → compras gravadas incl. IVA 328.752,70;
 *   base imponible 283.407,50; créditos fiscales 45.345,20.
 */
import type { FacturaRecibida, Proveedor, Retencion } from "../types";
import { round2 } from "./nomina";
import { ALICUOTA_IVA } from "./retenciones";
import type { RangoFechas } from "./quincenas";
import { enRango } from "./quincenas";
import { agregarResumenFiscal } from "./resumenFiscal";

/* ---------------- Auto-cálculo bidireccional del formulario ---------------- */

/** Base imponible desde el total con IVA: (total − sin crédito) / 1,16. */
export function baseDesdeTotal(totalConIvaBs: number, sinCreditoBs = 0): number {
  return round2((totalConIvaBs - sinCreditoBs) / (1 + ALICUOTA_IVA));
}

/** Total con IVA desde la base: base × 1,16 + sin crédito. */
export function totalDesdeBase(baseImponibleBs: number, sinCreditoBs = 0): number {
  return round2(baseImponibleBs * (1 + ALICUOTA_IVA) + sinCreditoBs);
}

export function impuestoDeBase(baseImponibleBs: number): number {
  return round2(baseImponibleBs * ALICUOTA_IVA);
}

/** Montos del formulario de factura recibida (Bs). */
export interface MontosFacturaRecibida {
  baseBs: number;
  impuestoBs: number;
  sinCreditoBs: number;
  totalBs: number;
  /** Editar el total dejó una base negativa (total < sin derecho a crédito). */
  baseNegativa?: true;
}

/**
 * Derivación bidireccional del formulario: el último campo editado manda.
 *   impuestoIVA        = baseImponible × 16%
 *   totalComprasConIVA = baseImponible + impuestoIVA + compraSinDerechoACredito
 * Editar el TOTAL invierte: base = (total − sinCredito) / 1,16.
 * Redondeo a 2 decimales en cada derivación.
 *
 * Ejemplos verificables (spec):
 *   a) base 10.000,00 / sin derecho 0,00      → IVA 1.600,00 → total 11.600,00
 *   b) base 10.000,00 / sin derecho 10.000,00 → IVA 1.600,00 → total 21.600,00
 */
export function derivarMontosFacturaRecibida(
  campoEditado: "base" | "sinCredito" | "total",
  valores: Pick<MontosFacturaRecibida, "baseBs" | "sinCreditoBs" | "totalBs">
): MontosFacturaRecibida {
  const sinCredito = round2(valores.sinCreditoBs);
  if (campoEditado === "total") {
    const total = round2(valores.totalBs);
    const base = baseDesdeTotal(total, sinCredito);
    if (base < 0) {
      return {
        baseBs: valores.baseBs,
        impuestoBs: impuestoDeBase(valores.baseBs),
        sinCreditoBs: sinCredito,
        totalBs: total,
        baseNegativa: true,
      };
    }
    return {
      baseBs: base,
      impuestoBs: impuestoDeBase(base),
      sinCreditoBs: sinCredito,
      totalBs: total,
    };
  }
  // Editaron base o sin-derecho: la fórmula directa manda.
  const base = round2(valores.baseBs);
  const impuesto = impuestoDeBase(base);
  return {
    baseBs: base,
    impuestoBs: impuesto,
    sinCreditoBs: sinCredito,
    totalBs: round2(base + impuesto + sinCredito),
  };
}

/* ---------------- Libro de compras ---------------- */

export interface FilaLibroCompras {
  numOp: number;
  fecha: string; // ISO
  rif: string;
  proveedor: string;
  numeroFactura: string;
  numeroControl: string;
  notaDebito: string;
  notaCredito: string;
  facturaAfectada: string;
  tipoTransaccion: string; // "Reg 01"
  comprasNoGravadasBs: number;
  comprasConIvaBs: number;
  baseImponibleBs: number;
  alicuota: number; // 16
  impuestoIvaBs: number;
  ivaRetenidoBs: number;
}

/** Filas auto-alimentadas por las facturas recibidas del rango (+ su retención
    para la columna "IVA Retenido (a terceros)"), orden cronológico. */
export function filasLibroCompras(
  compras: FacturaRecibida[],
  retenciones: Retencion[],
  proveedores: Proveedor[],
  rango: RangoFechas
): FilaLibroCompras[] {
  return compras
    .filter((c) => enRango(c.fecha, rango))
    .sort((a, b) => (a.fecha === b.fecha ? a.id - b.id : a.fecha < b.fecha ? -1 : 1))
    .map((c, i) => {
      const p = proveedores.find((x) => x.id === c.proveedorId);
      const ret = retenciones.find((r) => r.id === c.retencionId);
      return {
        numOp: i + 1,
        fecha: c.fecha,
        rif: p?.rif ?? "—",
        proveedor: p?.razonSocial ?? "—",
        numeroFactura: c.numeroFactura,
        numeroControl: c.numeroControl,
        notaDebito: c.notaDebito ?? "",
        notaCredito: c.notaCredito ?? "",
        facturaAfectada: c.facturaAfectada ?? "",
        tipoTransaccion: `Reg ${c.tipoTransaccion}`,
        comprasNoGravadasBs: c.sinCreditoBs,
        comprasConIvaBs: c.totalConIvaBs,
        baseImponibleBs: c.baseImponibleBs,
        alicuota: 16,
        impuestoIvaBs: c.impuestoIvaBs,
        // Retenido practicado al proveedor sobre esta factura (0 si aún no hay comprobante).
        ivaRetenidoBs: ret
          ? round2(
              ret.lineas
                .filter((l) => l.numFactura === c.numeroFactura)
                .reduce((s, l) => s + l.ivaRetenidoBs, 0) || ret.totalRetenidoBs
            )
          : 0,
      };
    });
}

/** Bloque RESUMEN del pie del libro (réplica del formato real): columnas
    BASE IMPONIBLE | CRÉDITO FISCAL. Importaciones y alícuotas adicional/
    reducida no aplican en esta fase (0,00). */
export interface ResumenLibroCompras {
  comprasNoGravadasBase: number;
  comprasInternasGeneralBase: number;
  comprasInternasGeneralCredito: number;
  totalBase: number;
  totalCredito: number;
  totalComprasConIva: number;
  totalIvaRetenido: number;
}

export function resumenLibroCompras(filas: FilaLibroCompras[]): ResumenLibroCompras {
  const noGravadas = round2(filas.reduce((s, f) => s + f.comprasNoGravadasBs, 0));
  const base = round2(filas.reduce((s, f) => s + f.baseImponibleBs, 0));
  const credito = round2(filas.reduce((s, f) => s + f.impuestoIvaBs, 0));
  return {
    comprasNoGravadasBase: noGravadas,
    comprasInternasGeneralBase: base,
    comprasInternasGeneralCredito: credito,
    totalBase: base,
    totalCredito: credito,
    totalComprasConIva: round2(filas.reduce((s, f) => s + f.comprasConIvaBs, 0)),
    totalIvaRetenido: round2(filas.reduce((s, f) => s + f.ivaRetenidoBs, 0)),
  };
}

/* ---------------- Resumen de créditos fiscales del mes ---------------- */

/** Sección de CRÉDITOS del "Resumen de Débitos y Créditos Fiscales IVA",
    calculada desde las compras y retenciones del mes completo. Las filas de
    retenciones (soportadas por LOTER como vendedor) no se rastrean en esta
    fase y se muestran en 0,00, como en el documento real de referencia. */
export interface ResumenCreditos {
  noGravadasBase: number;
  generalBase: number;
  generalCredito: number;
  totalBase: number;
  totalCredito: number;
  totalCreditosPeriodo: number;
  /** Retenciones de IVA practicadas a terceros en el período (informativo). */
  retencionesPracticadasBs: number;
}

export function resumenCreditosMes(
  compras: FacturaRecibida[],
  retenciones: Retencion[],
  rango: RangoFechas
): ResumenCreditos {
  // Misma agregación genérica que el resumen de débitos (ventas).
  const r = agregarResumenFiscal(
    compras.map((c) => ({
      fecha: c.fecha,
      baseBs: c.baseImponibleBs,
      impuestoBs: c.impuestoIvaBs,
      noGravadasBs: c.sinCreditoBs,
    })),
    rango
  );
  const practicadas = round2(
    retenciones
      .filter((x) => enRango(x.fechaEmision, rango))
      .reduce((s, x) => s + x.totalRetenidoBs, 0)
  );
  return {
    noGravadasBase: r.noGravadasBase,
    generalBase: r.generalBase,
    generalCredito: r.generalMonto,
    totalBase: r.totalBase,
    totalCredito: r.totalMonto,
    totalCreditosPeriodo: r.totalPeriodo,
    retencionesPracticadasBs: practicadas,
  };
}
