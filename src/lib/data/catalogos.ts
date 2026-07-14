/**
 * Catálogos de referencia para los formularios (bancos venezolanos y cargos).
 * Son listas de sugerencia/selección; los campos siguen siendo texto libre en
 * el dominio (Empleado.cargo, DatosBancarios.banco), así que se pueden ampliar
 * sin tocar los tipos.
 */

/** Bancos venezolanos vigentes (nombre comercial), ordenados alfabéticamente. */
export const BANCOS_VE: string[] = [
  "100% Banco",
  "Bancamiga",
  "Bancaribe",
  "Banco Activo",
  "Banco Agrícola de Venezuela",
  "Banco Bicentenario",
  "Banco Caroní",
  "Banco de Venezuela",
  "Banco del Tesoro",
  "Banco Exterior",
  "Banco Fondo Común (BFC)",
  "Banco Industrial de Venezuela",
  "Banco Mercantil",
  "Banco Nacional de Crédito (BNC)",
  "Banco Plaza",
  "Banco Sofitasa",
  "Banco Venezolano de Crédito",
  "Bancrecer",
  "Banesco",
  "Bangente",
  "Banplus",
  "BBVA Provincial",
  "DelSur Banco Universal",
  "Mi Banco",
  "N58 Banco Digital",
];

/**
 * Cargos base para sugerir en el formulario de empleado (además de los que ya
 * estén cargados en el sistema). La lista de sugerencias final se construye
 * uniendo estos con los cargos reales de los empleados existentes.
 */
export const CARGOS_BASE: string[] = [
  "Supervisor de campo",
  "Asistente administrativo",
  "Operador de vacuum",
  "Ayudante de patio",
  "Contadora",
  "Chofer (Lowboy)",
  "Gerente de operaciones",
  "Administrador",
  "Mecánico",
  "Soldador",
  "Obrero",
  "Vigilante",
  "Secretaria",
];
