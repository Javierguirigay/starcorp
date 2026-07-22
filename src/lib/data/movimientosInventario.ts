import type { MovimientoInventario } from "../types";

/* Kardex de inventario (entradas/salidas/ajustes). Nace vacío: se alimenta de
   las órdenes de entrega/compra y de las entradas manuales.
   OJO: data/movimientos.ts es de FINANZAS (dinero entre empresas). */
export const MOVIMIENTOS_INV_SEED: MovimientoInventario[] = [];

export const NEXT_MOV_INV_ID = 1;
