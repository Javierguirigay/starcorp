import type { Empresa, SaldoEmpresa } from "../types";

/* Empresas del conglomerado (de config.php). */
export const EMPRESAS: Empresa[] = [
  { key: "loter", nombre: "LOTER, C.A.", rif: "J-31717295-7", activa: true },
  { key: "etm", nombre: "ETM SUPPLY", rif: "J-00000000-0", activa: false },
  { key: "monaco", nombre: "MONACO, C.A.", rif: "J-00000000-0", activa: false },
  { key: "agrostar", nombre: "AGROSTAR", rif: "J-00000000-0", activa: false },
];

export const OTRAS_EMPRESAS = ["ETM SUPPLY", "MONACO, C.A.", "AGROSTAR"];

/* Saldos de ejemplo (de finanzas.php y dashboard.php). */
export const SALDOS: SaldoEmpresa[] = [
  { key: "loter", nombre: "LOTER, C.A.", usd: "92.400", bs: "3.385.560", activa: true },
  { key: "etm", nombre: "ETM SUPPLY", usd: "41.150", bs: "1.508.140", activa: false },
  { key: "monaco", nombre: "MONACO, C.A.", usd: "33.700", bs: "1.234.610", activa: false },
  { key: "agrostar", nombre: "AGROSTAR", usd: "17.000", bs: "623.040", activa: false },
];
