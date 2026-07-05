/**
 * Configuración central del sistema STARCORP GROUP.
 * Transcripción de config.php del boceto original.
 *
 * FASE ACTUAL: sin conexión a base de datos. El usuario en sesión es
 * simulado; cambia `rol` para ver cómo se adapta el menú lateral.
 */
import type { Usuario } from "./types";

export const APP_NAME = "STARCORP GROUP";
export const APP_TAGLINE = "Control Operativo y Administrativo";
export const APP_VERSION = "v0.2 · Migración Next.js";

/* Datos fiscales de LOTER, C.A. (agente de retención) */
export const LOTER_RAZON = "LOTER, C.A.";
export const LOTER_RIF = "J-31717295-7";
export const LOTER_DIRECCION =
  "Av. Bolívar con Av. Juncal, Edificio Pichel, Piso 1, Oficina 14, Maturín, Estado Monagas.";
export const LOTER_TELEFONO = "+58 (414) 394-3555";

/* Usuario en sesión (simulado, como en config.php).
   Roles previstos: 'administradora' y 'operaciones'. */
export const USUARIO_ACTUAL: Usuario = {
  nombre: "Administradora",
  rol: "administradora", // 'administradora' | 'operaciones'
  inicial: "A",
};
