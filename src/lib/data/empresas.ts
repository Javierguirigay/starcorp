import type { Empresa } from "../types";

/* Empresas del conglomerado (de config.php). rif vacío = no se muestra. */
export const EMPRESAS: Empresa[] = [
  { key: "loter", nombre: "LOTER, C.A.", rif: "J-31717295-7", activa: true },
  { key: "etm", nombre: "ETM SUPPLY", rif: "J-00000000-0", activa: true },
  { key: "monaco", nombre: "MONACO, C.A.", rif: "J-00000000-0", activa: true },
  { key: "agrostar", nombre: "AGROSTAR", rif: "J-00000000-0", activa: true },
  { key: "daniel", nombre: "Daniel Lopez", rif: "", activa: true },
];
