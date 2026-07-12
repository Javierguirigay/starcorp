import type {
  CategoriaFinanciera,
  MovimientoGrupo,
  TransaccionFinanciera,
} from "../types";
import { EMPRESAS } from "./empresas";
import { TASA_INICIAL } from "./empleados";

/* Pestañas del módulo Finanzas: Grupo + una por empresa del conglomerado.
   Activar una empresa nueva = ponerla con activa:true en EMPRESAS; su pestaña
   y sus categorías por defecto (CATEGORIAS_BASE) se generan solas. */
export interface FinanzasTab {
  key: string; // 'grupo' | Empresa.key
  label: string;
  habilitada: boolean;
}

export const FINANZAS_TABS: FinanzasTab[] = [
  { key: "grupo", label: "Grupo", habilitada: true },
  ...EMPRESAS.map((e) => ({
    key: e.key,
    label: e.nombre.replace(", C.A.", ""),
    habilitada: e.activa,
  })),
];

/* Categorías por defecto de cada empresa activa. Las de sistema (protegidas)
   reciben los movimientos automáticos de nómina, facturas y transferencias
   del grupo; sin ellas los generadores omiten a la empresa. Los ids de LOTER
   (1-6) se preservan porque TRANSACCIONES_SEED referencia esos categoriaId. */
const CATEGORIAS_BASE: Omit<CategoriaFinanciera, "id" | "empresaId">[] = [
  { nombre: "Gastos Administrativos", tipo: "salida" },
  { nombre: "Nómina", tipo: "salida", protegida: true, sistema: "nomina" },
  { nombre: "Gastos Operativos", tipo: "salida" },
  { nombre: "Gastos Personales del Dueño", tipo: "salida" },
  { nombre: "Ingresos por Servicios / Operaciones", tipo: "entrada", protegida: true, sistema: "facturas" },
  { nombre: "Transferencias del Grupo", tipo: "ambas", protegida: true, sistema: "transferencias" },
];

export const CATEGORIAS_SEED: CategoriaFinanciera[] = EMPRESAS.filter((e) => e.activa).flatMap(
  (e, i) =>
    CATEGORIAS_BASE.map((c, j) => ({
      ...c,
      id: i * CATEGORIAS_BASE.length + j + 1,
      empresaId: e.key,
    }))
);

export const NEXT_CATEGORIA_ID = CATEGORIAS_SEED.length + 1;

/* Historial del Grupo: transcripción de MOVIMIENTOS (finanzas.php) a fechas
   ISO, montos numéricos y keys de empresa donde el extremo es del grupo. */
export const MOVIMIENTOS_GRUPO_SEED: MovimientoGrupo[] = [
  { id: 1, fecha: "2026-06-17", tipo: "Entrada", destinoKey: "loter", origenNombre: "IESV (cliente)", destinoNombre: "LOTER, C.A.", moneda: "USD", monto: 12500, tasaBs: TASA_INICIAL, descripcion: "Pago servicios Pozo SBC-37", usuario: "Ana Salazar" },
  { id: 2, fecha: "2026-06-15", tipo: "Transferencia", origenKey: "loter", destinoKey: "etm", origenNombre: "LOTER, C.A.", destinoNombre: "ETM SUPPLY", moneda: "USD", monto: 8000, tasaBs: TASA_INICIAL, descripcion: "Capital de trabajo", usuario: "Administradora" },
  { id: 3, fecha: "2026-06-13", tipo: "Retiro", origenKey: "loter", origenNombre: "LOTER, C.A.", destinoNombre: "Nómina", moneda: "USD", monto: 6300, tasaBs: TASA_INICIAL, descripcion: "Pago quincenal personal", usuario: "Ana Salazar" },
  { id: 4, fecha: "2026-06-12", tipo: "Transferencia", origenKey: "monaco", destinoKey: "agrostar", origenNombre: "MONACO, C.A.", destinoNombre: "AGROSTAR", moneda: "Bs", monto: 450000, tasaBs: TASA_INICIAL, descripcion: "Aporte operativo", usuario: "Administradora" },
  { id: 5, fecha: "2026-06-11", tipo: "Entrada", destinoKey: "loter", origenNombre: "GO Wireline", destinoNombre: "LOTER, C.A.", moneda: "USD", monto: 2100, tasaBs: TASA_INICIAL, descripcion: "Prueba hidrostática", usuario: "Ana Salazar" },
];

export const NEXT_MOVIMIENTO_ID = 6;

/* Libro mayor de LOTER: entradas por servicios, gastos variados y dos
   movimientos automáticos enlazados a datos existentes (el pago de nómina
   seed id 101 y la transferencia seed id 2 del historial del grupo).
   Totales de referencia: entradas 18.000 / salidas 10.575 / balance 7.425 USD. */
export const TRANSACCIONES_SEED: TransaccionFinanciera[] = [
  { id: 1, empresaId: "loter", tipo: "entrada", categoriaId: 5, montoUSD: 12500, tasaBs: TASA_INICIAL, fecha: "2026-06-17", descripcion: "Pago servicios Pozo SBC-37 — IESV", origen: "manual" },
  { id: 2, empresaId: "loter", tipo: "entrada", categoriaId: 5, montoUSD: 3400, tasaBs: TASA_INICIAL, fecha: "2026-06-16", descripcion: "Alquiler de lowboy — cliente PDV", origen: "manual" },
  { id: 3, empresaId: "loter", tipo: "salida", categoriaId: 6, montoUSD: 8000, tasaBs: TASA_INICIAL, fecha: "2026-06-15", descripcion: "Transferencia a ETM SUPPLY — Capital de trabajo", origen: "transferencia", referenciaId: 2 },
  { id: 4, empresaId: "loter", tipo: "salida", categoriaId: 3, montoUSD: 640, tasaBs: TASA_INICIAL, fecha: "2026-06-14", descripcion: "Diésel unidades de vacuum", origen: "manual" },
  { id: 5, empresaId: "loter", tipo: "salida", categoriaId: 1, montoUSD: 120, tasaBs: TASA_INICIAL, fecha: "2026-06-12", descripcion: "Servicio de internet — oficina", origen: "manual" },
  { id: 6, empresaId: "loter", tipo: "entrada", categoriaId: 5, montoUSD: 2100, tasaBs: TASA_INICIAL, fecha: "2026-06-11", descripcion: "GO Wireline — Prueba hidrostática", origen: "manual" },
  { id: 7, empresaId: "loter", tipo: "salida", categoriaId: 4, montoUSD: 250, tasaBs: TASA_INICIAL, fecha: "2026-06-10", descripcion: "Compras personales del dueño", origen: "manual" },
  { id: 8, empresaId: "loter", tipo: "salida", categoriaId: 3, montoUSD: 380, tasaBs: TASA_INICIAL, fecha: "2026-06-09", descripcion: "Repuestos bomba de vacuum", origen: "manual" },
  { id: 9, empresaId: "loter", tipo: "salida", categoriaId: 1, montoUSD: 85, tasaBs: TASA_INICIAL, fecha: "2026-06-06", descripcion: "Papelería y consumibles", origen: "manual" },
  { id: 10, empresaId: "loter", tipo: "salida", categoriaId: 1, montoUSD: 200, tasaBs: TASA_INICIAL, fecha: "2026-06-04", descripcion: "Honorarios contables", origen: "manual" },
  { id: 11, empresaId: "loter", tipo: "salida", categoriaId: 2, montoUSD: 900, tasaBs: TASA_INICIAL, fecha: "2026-06-01", descripcion: "Nómina quincenal 16-05-2026 → 31-05-2026", origen: "nomina", referenciaId: 101 },
];

export const NEXT_TRANSACCION_ID = 12;
