import type { ConsumibleFinca, EquipoFinca } from "../types";

/* Equipos de finca y consumibles (aceites/filtros) de AGROSTAR. Arrancan
   vacíos: se cargan desde la app (fase mock, en memoria). */
export const EQUIPOS_FINCA_SEED: EquipoFinca[] = [];
export const NEXT_EQUIPO_FINCA_ID = 1;

export const CONSUMIBLES_FINCA_SEED: ConsumibleFinca[] = [];
export const NEXT_CONSUMIBLE_FINCA_ID = 1;

/* Sugerencias para los campos de texto libre. */
export const CATEGORIAS_EQUIPO_FINCA = [
  "Tractor",
  "Implemento",
  "Bomba de agua",
  "Vehículo",
  "Motor",
  "Herramienta",
  "Equipo de ordeño",
];

export const ESTADOS_EQUIPO_FINCA = ["Operativo", "En reparación", "Dado de baja"];

export const TIPOS_CONSUMIBLE_FINCA = [
  "Aceite",
  "Filtro de aceite",
  "Filtro de aire",
  "Filtro de combustible",
  "Grasa",
  "Refrigerante",
  "Correa",
  "Batería",
];

export const UNIDADES_CONSUMIBLE_FINCA = ["unidad", "litro", "galón", "juego"];

export const UBICACIONES_FINCA = ["Galpón", "Depósito", "Taller", "Almacén"];
