/**
 * Gating por rol. Transcripción de la función puede() de includes/sidebar.php.
 */
import type { Rol } from "./types";

export type Area =
  | "inicio"
  | "operaciones"
  | "nomina"
  | "finanzas"
  | "facturas"
  | "control-administrativo"
  | "tarifas"
  | "ordenes"
  | "inventario"
  | "mantenimiento";

const AREAS_OPERACIONES: Area[] = [
  "inicio",
  "operaciones",
  "inventario",
  "mantenimiento",
];

export function puede(rol: Rol, area: Area): boolean {
  if (rol === "administradora") return true; // ve todo
  if (rol === "operaciones") return AREAS_OPERACIONES.includes(area);
  return false;
}
