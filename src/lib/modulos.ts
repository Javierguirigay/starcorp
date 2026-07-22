/**
 * Registro central de módulos por empresa.
 *
 * Fuente única de qué módulos tiene cada empresa del conglomerado y cómo se
 * ubican en la navegación. Sustituye al array hardcodeado que vivía en el
 * Sidebar y desacopla "qué módulos existen" de "qué empresa está activa".
 *
 * - MODULOS: catálogo canónico de cada módulo (label, icono, ruta relativa a
 *   la empresa, sección del menú y `area` para el gating por rol existente
 *   `puede(rol, area)` de permissions.ts).
 * - MODULOS_POR_EMPRESA: qué módulos habilita cada empresa. `enPreparacion`
 *   marca un módulo aún no implementado para esa empresa (se muestra como
 *   "Próximamente"); a medida que se construye su aislamiento por empresa se
 *   quita la marca.
 *
 * Las rutas del App Router cuelgan de `/[empresa]/…`, así que la URL final de
 * un módulo es `/${empresa.key}${modulo.ruta}` (para LOTER esto reproduce las
 * URLs históricas `/loter/administracion/…` sin cambios).
 */
import {
  ChefHat,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Package,
  Scale,
  Tags,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Area } from "./permissions";
import { puede } from "./permissions";
import type { Empresa, Rol } from "./types";
import { EMPRESAS } from "./data/empresas";

export type SeccionModulo = "administracion" | "operaciones";

export interface ModuloDef {
  /** Identificador del módulo (clave en MODULOS y en MODULOS_POR_EMPRESA). */
  key: string;
  label: string;
  icon: LucideIcon;
  /** Ruta RELATIVA a la empresa, empezando con "/". La URL final es
      `/${empresa.key}${ruta}`. */
  ruta: string;
  seccion: SeccionModulo;
  /** Área para el gating por rol existente (`puede(rol, area)`). */
  area: Area;
  /** Nota para la pantalla "en preparación" (p. ej. el Catering aún por definir). */
  nota?: string;
}

/** Catálogo canónico de módulos del sistema. */
export const MODULOS: Record<string, ModuloDef> = {
  nomina: { key: "nomina", label: "Nómina del personal", icon: Users, ruta: "/administracion/nomina", seccion: "administracion", area: "nomina" },
  finanzas: { key: "finanzas", label: "Finanzas", icon: Wallet, ruta: "/administracion/finanzas", seccion: "administracion", area: "finanzas" },
  facturas: { key: "facturas", label: "Facturación y Compras", icon: FileText, ruta: "/administracion/facturas", seccion: "administracion", area: "facturas" },
  control: { key: "control", label: "Control Administrativo", icon: Scale, ruta: "/administracion/control-administrativo", seccion: "administracion", area: "control-administrativo" },
  tarifas: { key: "tarifas", label: "Gestión de Tarifas", icon: Tags, ruta: "/administracion/gestion-tarifas", seccion: "administracion", area: "tarifas" },
  ordenes: { key: "ordenes", label: "Gestión de Órdenes", icon: ClipboardCheck, ruta: "/administracion/gestion-ordenes", seccion: "administracion", area: "ordenes" },
  inventario: { key: "inventario", label: "Inventario", icon: Package, ruta: "/administracion/inventario", seccion: "administracion", area: "inventario" },
  catering: {
    key: "catering",
    label: "Sistema de Catering",
    icon: ChefHat,
    ruta: "/administracion/catering",
    seccion: "administracion",
    area: "catering",
    nota: "Módulo por estructurar: definiremos su alcance y de ahí saldrán sus submódulos.",
  },
  mantenimiento: { key: "mantenimiento", label: "Mantenimiento", icon: Wrench, ruta: "/operaciones/mantenimiento", seccion: "operaciones", area: "mantenimiento" },
  asignacion: { key: "asignacion", label: "Asignación de equipos", icon: ClipboardList, ruta: "/operaciones/asignacion-equipos", seccion: "operaciones", area: "operaciones" },
};

/** Un módulo habilitado para una empresa. */
export interface ModuloHabilitado {
  modulo: string; // clave en MODULOS
  /** Aún no implementado para esta empresa: se muestra como "Próximamente". */
  enPreparacion?: boolean;
}

/**
 * Qué módulos tiene cada empresa. LOTER conserva TODO su set actual (todos
 * listos). ETM/MONACO/AGROSTAR arrancan con sus módulos en `enPreparacion`
 * hasta completar su aislamiento de datos y branding; el Catering de ETM es
 * un placeholder por diseño (se estructura más adelante).
 */
export const MODULOS_POR_EMPRESA: Record<string, ModuloHabilitado[]> = {
  loter: [
    { modulo: "nomina" },
    { modulo: "finanzas" },
    { modulo: "facturas" },
    { modulo: "control" },
    { modulo: "tarifas" },
    { modulo: "ordenes" },
    { modulo: "inventario" },
    { modulo: "mantenimiento" },
    { modulo: "asignacion" },
  ],
  etm: [
    { modulo: "nomina" },
    { modulo: "facturas" },
    { modulo: "control" },
    { modulo: "ordenes" },
    { modulo: "inventario" },
    { modulo: "catering", enPreparacion: true },
  ],
  monaco: [
    { modulo: "nomina" },
    { modulo: "facturas" },
    { modulo: "control" },
    { modulo: "inventario" },
  ],
  agrostar: [
    { modulo: "control" },
    { modulo: "inventario" },
  ],
  daniel: [],
};

/** Empresa activa por key (solo empresas con `activa: true` cuentan). */
export function empresaActivaPorKey(key: string): Empresa | undefined {
  const e = EMPRESAS.find((x) => x.key === key);
  return e && e.activa ? e : undefined;
}

/** Slug de empresa activa de una ruta `/<empresa>/…`; si no hay, cae en LOTER. */
export function empresaDeRuta(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0];
  return seg && empresaActivaPorKey(seg) ? seg : "loter";
}

export interface ModuloEmpresa {
  def: ModuloDef;
  enPreparacion: boolean;
  /** URL absoluta del módulo para esta empresa. */
  href: string;
}

/** Módulos de una empresa (resueltos contra el catálogo), en orden de registro. */
export function modulosDe(empresaKey: string): ModuloEmpresa[] {
  return (MODULOS_POR_EMPRESA[empresaKey] ?? [])
    .map((h) => {
      const def = MODULOS[h.modulo];
      if (!def) return null;
      return { def, enPreparacion: !!h.enPreparacion, href: `/${empresaKey}${def.ruta}` };
    })
    .filter((m): m is ModuloEmpresa => m !== null);
}

/**
 * Acceso de una empresa a un módulo concreto. Devuelve null si la empresa no
 * está activa o no tiene el módulo (para `notFound()` en las páginas).
 */
export function accesoModulo(
  empresaKey: string,
  moduloKey: string
): { empresa: Empresa; def: ModuloDef; enPreparacion: boolean } | null {
  const empresa = empresaActivaPorKey(empresaKey);
  if (!empresa) return null;
  const hab = (MODULOS_POR_EMPRESA[empresaKey] ?? []).find((m) => m.modulo === moduloKey);
  const def = MODULOS[moduloKey];
  if (!hab || !def) return null;
  return { empresa, def, enPreparacion: !!hab.enPreparacion };
}

/** Primer módulo LISTO (no en preparación) visible para el rol; para redirigir
    al entrar a una empresa. */
export function primerModuloListo(empresaKey: string, rol: Rol): ModuloEmpresa | undefined {
  return modulosDe(empresaKey).find((m) => !m.enPreparacion && puede(rol, m.def.area));
}

/** La empresa tiene un módulo de Inventario OPERATIVO (no en preparación). Hoy
    solo LOTER; lo usan las Órdenes para decidir si enlazan renglones al kardex.
    Cuando MONACO/AGROSTAR tengan su inventario propio, se activará solo. */
export function empresaUsaInventario(empresaKey: string): boolean {
  const acc = accesoModulo(empresaKey, "inventario");
  return acc !== null && !acc.enPreparacion;
}
