import type { Semoviente } from "../types";

/* Inventario de semovientes (hato) de AGROSTAR. Se siembra un subconjunto FIEL
   y legible de la referencia real del usuario (docs/empresas/agrostar/
   referencias/…Semovientes.pdf); la hoja completa (~50) trae pareos y estatus
   ambiguos, así que el resto se carga/afinará desde la app. Sin arete registrado
   se usa "S/N" (el hato se identifica por nombre). */
const SEMOVIENTES_RAW: Omit<Semoviente, "id" | "empresaId">[] = [
  { numero: "S/N", categoria: "Novilla", nombre: "Caramelo", estatus: "Preñada" },
  { numero: "S/N", categoria: "Novilla", nombre: "Pimpollo", estatus: "Parida", fecha: "2026-02-26" },
  { numero: "S/N", categoria: "Novilla", nombre: "Botón de Oro", estatus: "Parió Hembra" },
  { numero: "S/N", categoria: "Novilla", nombre: "Hermosura", estatus: "Parió Hembra" },
  { numero: "S/N", categoria: "Vaca", nombre: "Llovisna", estatus: "Preñada", fecha: "2026-03-26" },
  { numero: "S/N", categoria: "Novilla", nombre: "Princesita", estatus: "Parió Hembra" },
  { numero: "S/N", categoria: "Vaca", nombre: "Ojo Negro", estatus: "Parió Macho" },
  { numero: "S/N", categoria: "Novilla", nombre: "Nucita", estatus: "Preñada" },
  { numero: "S/N", categoria: "Vaca", nombre: "Conejita", estatus: "Preñada", fecha: "2026-11-25" },
  { numero: "S/N", categoria: "Vaca", nombre: "Bozalito", estatus: "Horra-Preñada", fecha: "2025-10-01" },
  { numero: "S/N", categoria: "Vaca", nombre: "Blanquita", estatus: "Preñada", fecha: "2026-04-15" },
  { numero: "S/N", categoria: "Vaca", nombre: "Naranjita", estatus: "Preñada", fecha: "2025-10-01" },
  { numero: "S/N", categoria: "Vaca", nombre: "Pata Larga", estatus: "Perdida" },
  { numero: "S/N", categoria: "Mauta", nombre: "Giro", estatus: "" },
  { numero: "S/N", categoria: "Toro", nombre: "Lucerito", estatus: "" },
];

export const SEMOVIENTES_SEED: Semoviente[] = SEMOVIENTES_RAW.map((s, i) => ({
  id: i + 1,
  empresaId: "agrostar",
  ...s,
}));

export const NEXT_SEMOVIENTE_ID = SEMOVIENTES_SEED.length + 1;

/* Sugerencias para los campos de texto libre (no restringen el valor). */
export const CATEGORIAS_SEMOVIENTE = [
  "Vaca",
  "Novilla",
  "Mauta",
  "Maute",
  "Toro",
  "Torete",
  "Becerra Hembra",
  "Becerro Macho",
];

export const ESTATUS_SEMOVIENTE = [
  "Preñada",
  "Parida",
  "Parió Hembra",
  "Parió Macho",
  "Vacía",
  "Horra",
  "Horra-Preñada",
  "Renco",
  "Perdida",
];
