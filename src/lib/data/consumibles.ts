import type { Consumible } from "../types";

/* Catálogo inicial de consumibles/repuestos con control de existencias.
   Los equipos (data/equipos.ts) referencian estos ids en su ficha. */
const CONSUMIBLES_RAW: Omit<Consumible, "empresaId">[] = [
  { id: 1, nombre: "Aceite de motor 15W40", tipo: "Aceite", unidad: "litro", cantidad: 40, stockMinimo: 20, ubicacion: "Almacén LOTER" },
  { id: 2, nombre: "Filtro de aceite", tipo: "Filtro", unidad: "unidad", cantidad: 8, stockMinimo: 4, ubicacion: "Almacén LOTER" },
  { id: 3, nombre: "Filtro de combustible", tipo: "Filtro", unidad: "unidad", cantidad: 3, stockMinimo: 4, ubicacion: "Almacén LOTER" },
  { id: 4, nombre: "Filtro de aire", tipo: "Filtro", unidad: "unidad", cantidad: 5, stockMinimo: 3, ubicacion: "Almacén LOTER" },
  { id: 5, nombre: "Correa de motor", tipo: "Correa", unidad: "unidad", cantidad: 2, stockMinimo: 2, ubicacion: "Almacén LOTER" },
  { id: 6, nombre: "Batería 12V", tipo: "Batería", unidad: "unidad", cantidad: 3, stockMinimo: 2, ubicacion: "Almacén LOTER" },
  { id: 7, nombre: "Refrigerante", tipo: "Refrigerante", unidad: "litro", cantidad: 15, stockMinimo: 10, ubicacion: "Almacén LOTER" },
  { id: 8, nombre: "Neumático 1100R20", tipo: "Neumático", unidad: "unidad", cantidad: 4, stockMinimo: 4, ubicacion: "Patio LOTER" },
];

/* Todos de LOTER (empresaId). */
export const CONSUMIBLES_SEED: Consumible[] = CONSUMIBLES_RAW.map((c) => ({
  ...c,
  empresaId: "loter",
}));

export const NEXT_CONSUMIBLE_ID = 9;
