import type { Insumo, Preparado } from "../types";

/* Inventario de MONACO (eventos y banquetes). Arranca vacío: insumos y
   preparados se cargan desde la app (fase mock, en memoria). */
export const INSUMOS_SEED: Insumo[] = [];
export const NEXT_INSUMO_ID = 1;

export const PREPARADOS_SEED: Preparado[] = [];
export const NEXT_PREPARADO_ID = 1;

/* Sugerencias para los campos de texto libre. */
export const CATEGORIAS_INSUMO = [
  "Carnes",
  "Aves",
  "Pescados y mariscos",
  "Vegetales",
  "Frutas",
  "Lácteos",
  "Secos y granos",
  "Panadería",
  "Bebidas",
  "Desechables",
  "Condimentos",
];

export const UNIDADES_INSUMO = ["kg", "g", "L", "ml", "unidad", "docena", "bandeja"];

export const UBICACIONES_INSUMO = ["Nevera", "Congelador", "Despensa", "Barra", "Almacén"];
