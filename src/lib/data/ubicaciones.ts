import type { Ubicacion } from "../types";

/* Catálogo inicial de ubicaciones: los 5 nombres ya usados por los seeds de
   equipos y consumibles (coinciden 1:1, sin migración). Administrable desde
   el módulo Inventario (botón "Ubicaciones"). */
const UBICACIONES_RAW: Omit<Ubicacion, "empresaId">[] = [
  { id: 1, nombre: "Almacén LOTER", tipo: "almacen", activa: true },
  { id: 2, nombre: "Patio LOTER", tipo: "patio", activa: true },
  { id: 3, nombre: "Base GO Wireline", tipo: "campo", activa: true },
  { id: 4, nombre: "Pozo SBC-37", tipo: "campo", activa: true },
  { id: 5, nombre: "Taller", tipo: "otro", activa: true },
];

/* Todas de LOTER (empresaId). */
export const UBICACIONES_SEED: Ubicacion[] = UBICACIONES_RAW.map((u) => ({
  ...u,
  empresaId: "loter",
}));

export const NEXT_UBICACION_ID = 6;
