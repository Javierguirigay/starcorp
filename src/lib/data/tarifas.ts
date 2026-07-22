import type { TarifaServicio } from "../types";

/* Catálogo de tarifas referenciales de servicios (USD). La tarifa es solo
   referencial y negociable por cliente; la descripción del servicio es constante.
   Alimenta el selector de "Equipo / concepto" del reporte de servicio.
   Todas de LOTER: el catálogo se aísla por empresa (empresaId). */
const TARIFAS_RAW: Omit<TarifaServicio, "empresaId">[] = [
  { id: 1, descripcion: "SERVICIO DE ALQUILER DE LUMINARIA MARCA COLEMAN TIPO JIRAFA", categoria: "luminaria", unidad: "dia", tarifaRef: 70, activo: true },
  { id: 2, descripcion: "SERVICIO DE ALQUILER DE LUMINARIA MARCA MAGNUN (I) TIPO JIRAFA", categoria: "luminaria", unidad: "dia", tarifaRef: 70, activo: true },
  { id: 3, descripcion: "SERVICIO DE ALQUILER DE LUMINARIA MARCA MAGNUN (II) TIPO JIRAFA", categoria: "luminaria", unidad: "dia", tarifaRef: 70, activo: true },
  { id: 4, descripcion: "SERVICIO DE TRASLADO DE LUMINARIAS (IDA Y VUELTA)", categoria: "traslado", unidad: "servicio", tarifaRef: 160, activo: true, notas: "3 unidades" },
  { id: 5, descripcion: "SERVICIO DE ALQUILER DE GENERADOR DE 35 KVA", categoria: "generador", unidad: "dia", tarifaRef: 105, activo: true },
  { id: 6, descripcion: "SERVICIO DE TRASLADO DE GENERADOR DE 35 KVA (IDA Y VUELTA)", categoria: "traslado", unidad: "servicio", tarifaRef: 150, activo: true, notas: "1 unidad" },
];

export const TARIFAS_SEED: TarifaServicio[] = TARIFAS_RAW.map((t) => ({
  ...t,
  empresaId: "loter",
}));

export const NEXT_TARIFA_ID = 7;
