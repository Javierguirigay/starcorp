import type { CategoriaEquipo, Equipo } from "../types";

/* Catálogo de categorías (de config.php). */
export const CATEGORIAS_EQUIPO: Record<CategoriaEquipo, string> = {
  petrolero: "Equipos petroleros",
  oficina: "Equipos de oficina",
  herramienta: "Herramientas",
  vehiculo: "Vehículos",
};

/* Catálogo de equipos. El "código" es su propio nombre. El estado
   (Disponible/Asignado/Mantenimiento) NO se guarda: se deriva de las órdenes
   de mantenimiento y asignaciones (derivarEstadoEquipo). Chuto trae ficha y
   consumibles de ejemplo (referencian ids de CONSUMIBLES_SEED). */
const EQUIPOS_RAW: Omit<Equipo, "empresaId">[] = [
  {
    id: 1,
    codigo: "Chuto",
    categoria: "vehiculo",
    ubicacion: "Base GO Wireline",
    ficha: {
      marca: "Mack",
      modelo: "CH613",
      serial: "1M2AA18Y0XW000000",
      motor: "Mack E7 350 HP",
      notas: "Unidad de arrastre para lowboy.",
    },
    consumibles: [
      { rol: "Aceite", consumibleId: 1 },
      { rol: "Filtro de aceite", consumibleId: 2 },
      { rol: "Filtro de combustible", consumibleId: 3 },
      { rol: "Filtro de aire", consumibleId: 4 },
      { rol: "Neumáticos", consumibleId: 8 },
    ],
  },
  { id: 2, codigo: "Tanque (Frac-Tank)", categoria: "petrolero", ubicacion: "Patio LOTER" },
  { id: 3, codigo: "Vacuum", categoria: "petrolero", ubicacion: "Patio LOTER" },
  { id: 4, codigo: "Luminaria #1", categoria: "petrolero", ubicacion: "Pozo SBC-37" },
  { id: 5, codigo: "Luminaria #2", categoria: "petrolero", ubicacion: "Pozo SBC-37" },
  { id: 6, codigo: "Luminaria #3", categoria: "petrolero", ubicacion: "Pozo SBC-37" },
  {
    id: 7,
    codigo: "Generador",
    categoria: "petrolero",
    ubicacion: "Taller",
    ficha: { marca: "Cummins", modelo: "C150D5", motor: "Cummins 6BT" },
    consumibles: [
      { rol: "Aceite", consumibleId: 1 },
      { rol: "Filtro de aceite", consumibleId: 2 },
      { rol: "Correa", consumibleId: 5 },
    ],
  },
  { id: 8, codigo: "Lowboy", categoria: "petrolero", ubicacion: "Patio LOTER" },
];

/* Todos de LOTER: el inventario se aísla por empresa (empresaId). */
export const EQUIPOS: Equipo[] = EQUIPOS_RAW.map((e) => ({ ...e, empresaId: "loter" }));

/* Los ids no se reciclan: el 9 fue "Traslado" (eliminado del catálogo). */
export const NEXT_EQUIPO_ID = 10;
