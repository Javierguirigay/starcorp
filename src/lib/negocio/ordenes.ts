/**
 * Órdenes de compra / entrega / requerimiento: funciones puras.
 * Los montos (solo en la orden de compra) viven en Bs, con la misma alícuota
 * de IVA que el resto de la app.
 */
import type { Orden, RenglonOrden, TipoOrden } from "../types";
import type { TotalesDocumento } from "./facturacion";
import { round2 } from "./nomina";
import { ALICUOTA_IVA } from "./retenciones";

export const PREFIJO_ORDEN: Record<TipoOrden, string> = {
  compra: "OC",
  entrega: "OE",
  requerimiento: "OR",
};

export const TITULO_ORDEN: Record<TipoOrden, string> = {
  compra: "Orden de Compra",
  entrega: "Orden de Entrega",
  requerimiento: "Orden de Requerimiento",
};

/** Correlativo por tipo: OC-0001, OE-0001, OR-0001 (independientes entre sí). */
export function siguienteNumeroOrden(tipo: TipoOrden, ordenes: Orden[]): string {
  const prefijo = PREFIJO_ORDEN[tipo];
  const ultimo = ordenes
    .filter((o) => o.tipo === tipo)
    .reduce((max, o) => Math.max(max, parseInt(o.numero.split("-")[1] ?? "0", 10) || 0), 0);
  return `${prefijo}-${String(ultimo + 1).padStart(4, "0")}`;
}

export function totalRenglonOrden(r: RenglonOrden): number {
  return round2(r.cantidad * (r.precioUnitBs ?? 0));
}

/** Subtotal, IVA 16% y total de una orden de compra. */
export function totalesOrden(renglones: RenglonOrden[]): TotalesDocumento {
  const subtotal = round2(renglones.reduce((s, r) => s + totalRenglonOrden(r), 0));
  const iva = round2(subtotal * ALICUOTA_IVA);
  return { subtotal, iva, total: round2(subtotal + iva) };
}

/** Renglón vacío para la tabla editable del formulario. */
export function renglonVacio(): RenglonOrden {
  return { cantidad: 1, unidad: "Und", descripcion: "", precioUnitBs: 0 };
}
