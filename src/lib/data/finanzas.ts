import type {
  CategoriaFinanciera,
  CuentaFinanciera,
  MovimientoGrupo,
  TransaccionFinanciera,
  TraspasoInterno,
} from "../types";
import { EMPRESAS } from "./empresas";
import { TASA_INICIAL } from "./empleados";
import { round2 } from "../negocio/nomina";

/* Pestañas del módulo Finanzas: Grupo + una por empresa del conglomerado.
   Activar una empresa nueva = ponerla con activa:true en EMPRESAS; su pestaña,
   sus categorías por defecto (CATEGORIAS_BASE) y su Cuenta Principal se
   generan solas. */
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

/* Una "Cuenta Principal" USD predeterminada por empresa: migración automática
   del modelo anterior (libro único por empresa). Todo el histórico seed cae
   aquí; el usuario luego crea sus cuentas reales (Mercantil, Binance, etc.). */
export const CUENTAS_SEED: CuentaFinanciera[] = EMPRESAS.map((e, i) => ({
  id: i + 1,
  empresaId: e.key,
  nombre: "Cuenta Principal",
  moneda: "USD",
  predeterminada: true,
  activa: true,
}));

export const NEXT_CUENTA_ID = EMPRESAS.length + 1;

/* Categorías por defecto de cada empresa activa. Las de sistema (protegidas)
   reciben los movimientos automáticos de nómina, facturas, transferencias
   del grupo y traspasos entre cuentas; sin ellas los generadores omiten a la
   empresa. Los ids de LOTER (1-6) se preservan porque TRANSACCIONES_SEED
   referencia esos categoriaId — la categoría de traspasos va ÚLTIMA por eso. */
const CATEGORIAS_BASE: Omit<CategoriaFinanciera, "id" | "empresaId">[] = [
  { nombre: "Gastos Administrativos", tipo: "salida" },
  { nombre: "Nómina", tipo: "salida", protegida: true, sistema: "nomina" },
  { nombre: "Gastos Operativos", tipo: "salida" },
  { nombre: "Gastos Personales del Dueño", tipo: "salida" },
  { nombre: "Ingresos por Servicios / Operaciones", tipo: "entrada", protegida: true, sistema: "facturas" },
  { nombre: "Transferencias del Grupo", tipo: "ambas", protegida: true, sistema: "transferencias" },
  { nombre: "Movimientos entre Cuentas", tipo: "ambas", protegida: true, sistema: "traspasos" },
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
   ISO, montos numéricos y keys/cuentas de empresa donde el extremo es del
   grupo (cuenta = Cuenta Principal de cada una). El mov 4 nació en Bs
   (450.000) y se normaliza a USD porque las Cuentas Principales son USD. */
export const MOVIMIENTOS_GRUPO_SEED: MovimientoGrupo[] = [
  { id: 1, fecha: "2026-06-17", tipo: "Entrada", destinoKey: "loter", cuentaDestinoId: 1, origenNombre: "IESV (cliente)", destinoNombre: "LOTER, C.A.", monedaOrigen: "USD", montoOrigen: 12500, monedaDestino: "USD", montoDestino: 12500, tasaBs: TASA_INICIAL, descripcion: "Pago servicios Pozo SBC-37", usuario: "Ana Salazar" },
  { id: 2, fecha: "2026-06-15", tipo: "Transferencia", origenKey: "loter", destinoKey: "etm", cuentaOrigenId: 1, cuentaDestinoId: 2, origenNombre: "LOTER, C.A.", destinoNombre: "ETM SUPPLY", monedaOrigen: "USD", montoOrigen: 8000, monedaDestino: "USD", montoDestino: 8000, tasaBs: TASA_INICIAL, descripcion: "Capital de trabajo", usuario: "Administradora" },
  { id: 3, fecha: "2026-06-13", tipo: "Retiro", origenKey: "loter", cuentaOrigenId: 1, origenNombre: "LOTER, C.A.", destinoNombre: "Nómina", monedaOrigen: "USD", montoOrigen: 6300, monedaDestino: "USD", montoDestino: 6300, tasaBs: TASA_INICIAL, descripcion: "Pago quincenal personal", usuario: "Ana Salazar" },
  { id: 4, fecha: "2026-06-12", tipo: "Transferencia", origenKey: "monaco", destinoKey: "agrostar", cuentaOrigenId: 3, cuentaDestinoId: 4, origenNombre: "MONACO, C.A.", destinoNombre: "AGROSTAR", monedaOrigen: "USD", montoOrigen: round2(450000 / TASA_INICIAL), monedaDestino: "USD", montoDestino: round2(450000 / TASA_INICIAL), tasaBs: TASA_INICIAL, descripcion: "Aporte operativo (Bs 450.000)", usuario: "Administradora" },
  { id: 5, fecha: "2026-06-11", tipo: "Entrada", destinoKey: "loter", cuentaDestinoId: 1, origenNombre: "GO Wireline", destinoNombre: "LOTER, C.A.", monedaOrigen: "USD", montoOrigen: 2100, monedaDestino: "USD", montoDestino: 2100, tasaBs: TASA_INICIAL, descripcion: "Prueba hidrostática", usuario: "Ana Salazar" },
];

export const NEXT_MOVIMIENTO_ID = 6;

/* Traspasos entre cuentas propias: sin seed (las empresas parten con una sola
   Cuenta Principal). */
export const TRASPASOS_SEED: TraspasoInterno[] = [];

export const NEXT_TRASPASO_ID = 1;

/* Libro mayor de LOTER sobre su Cuenta Principal (cuentaId 1, USD): entradas
   por servicios, gastos variados y dos movimientos automáticos enlazados a
   datos existentes (el pago de nómina seed id 101 y la transferencia seed
   id 2 del historial del grupo).
   Referencia: saldo Cuenta Principal = 18.000 − 10.575 = 7.425 USD. KPIs
   operativos: ingresos 18.000 / egresos 2.575 (la transferencia de 8.000 al
   grupo mueve saldo pero no es egreso operativo). */
export const TRANSACCIONES_SEED: TransaccionFinanciera[] = [
  { id: 1, empresaId: "loter", cuentaId: 1, tipo: "entrada", categoriaId: 5, moneda: "USD", monto: 12500, tasaBs: TASA_INICIAL, fecha: "2026-06-17", descripcion: "Pago servicios Pozo SBC-37 — IESV", origen: "manual" },
  { id: 2, empresaId: "loter", cuentaId: 1, tipo: "entrada", categoriaId: 5, moneda: "USD", monto: 3400, tasaBs: TASA_INICIAL, fecha: "2026-06-16", descripcion: "Alquiler de lowboy — cliente PDV", origen: "manual" },
  { id: 3, empresaId: "loter", cuentaId: 1, tipo: "salida", categoriaId: 6, moneda: "USD", monto: 8000, tasaBs: TASA_INICIAL, fecha: "2026-06-15", descripcion: "Transferencia a ETM SUPPLY — Capital de trabajo", origen: "transferencia", referenciaId: 2 },
  { id: 4, empresaId: "loter", cuentaId: 1, tipo: "salida", categoriaId: 3, moneda: "USD", monto: 640, tasaBs: TASA_INICIAL, fecha: "2026-06-14", descripcion: "Diésel unidades de vacuum", origen: "manual" },
  { id: 5, empresaId: "loter", cuentaId: 1, tipo: "salida", categoriaId: 1, moneda: "USD", monto: 120, tasaBs: TASA_INICIAL, fecha: "2026-06-12", descripcion: "Servicio de internet — oficina", origen: "manual" },
  { id: 6, empresaId: "loter", cuentaId: 1, tipo: "entrada", categoriaId: 5, moneda: "USD", monto: 2100, tasaBs: TASA_INICIAL, fecha: "2026-06-11", descripcion: "GO Wireline — Prueba hidrostática", origen: "manual" },
  { id: 7, empresaId: "loter", cuentaId: 1, tipo: "salida", categoriaId: 4, moneda: "USD", monto: 250, tasaBs: TASA_INICIAL, fecha: "2026-06-10", descripcion: "Compras personales del dueño", origen: "manual" },
  { id: 8, empresaId: "loter", cuentaId: 1, tipo: "salida", categoriaId: 3, moneda: "USD", monto: 380, tasaBs: TASA_INICIAL, fecha: "2026-06-09", descripcion: "Repuestos bomba de vacuum", origen: "manual" },
  { id: 9, empresaId: "loter", cuentaId: 1, tipo: "salida", categoriaId: 1, moneda: "USD", monto: 85, tasaBs: TASA_INICIAL, fecha: "2026-06-06", descripcion: "Papelería y consumibles", origen: "manual" },
  { id: 10, empresaId: "loter", cuentaId: 1, tipo: "salida", categoriaId: 1, moneda: "USD", monto: 200, tasaBs: TASA_INICIAL, fecha: "2026-06-04", descripcion: "Honorarios contables", origen: "manual" },
  { id: 11, empresaId: "loter", cuentaId: 1, tipo: "salida", categoriaId: 2, moneda: "USD", monto: 900, tasaBs: TASA_INICIAL, fecha: "2026-06-01", descripcion: "Nómina quincenal 16-05-2026 → 31-05-2026", origen: "nomina", referenciaId: 101 },
];

export const NEXT_TRANSACCION_ID = 12;
