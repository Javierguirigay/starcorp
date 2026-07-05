import type { Movimiento, MovimientoDashboard } from "../types";

/* Historial de finanzas.php. */
export const MOVIMIENTOS: Movimiento[] = [
  { fecha: "17/06/2026", tipo: "Entrada", origen: "IESV (cliente)", destino: "LOTER, C.A.", moneda: "USD", monto: "12.500", descripcion: "Pago servicios Pozo SBC-37", usuario: "Ana Salazar" },
  { fecha: "15/06/2026", tipo: "Transferencia", origen: "LOTER, C.A.", destino: "ETM SUPPLY", moneda: "USD", monto: "8.000", descripcion: "Capital de trabajo", usuario: "Administradora" },
  { fecha: "13/06/2026", tipo: "Retiro", origen: "LOTER, C.A.", destino: "Nómina", moneda: "USD", monto: "6.300", descripcion: "Pago quincenal personal", usuario: "Ana Salazar" },
  { fecha: "12/06/2026", tipo: "Transferencia", origen: "MONACO, C.A.", destino: "AGROSTAR", moneda: "Bs", monto: "450.000", descripcion: "Aporte operativo", usuario: "Administradora" },
  { fecha: "11/06/2026", tipo: "Entrada", origen: "GO Wireline", destino: "LOTER, C.A.", moneda: "USD", monto: "2.100", descripcion: "Prueba hidrostática", usuario: "Ana Salazar" },
];

/* Movimientos recientes del dashboard.php. */
export const MOVIMIENTOS_DASHBOARD: MovimientoDashboard[] = [
  { fecha: "17/06/2026", tipo: "Entrada", descripcion: "Pago IESV / Pozo SBC-37", empresa: "LOTER, C.A.", monto: "+$ 12.500", positivo: true },
  { fecha: "15/06/2026", tipo: "Transferencia", descripcion: "LOTER → ETM SUPPLY", empresa: "ETM SUPPLY", monto: "+$ 8.000", positivo: true },
  { fecha: "13/06/2026", tipo: "Retiro", descripcion: "Nómina quincenal", empresa: "LOTER, C.A.", monto: "−$ 6.300", positivo: false },
  { fecha: "11/06/2026", tipo: "Entrada", descripcion: "GO Wireline · Prueba hidrostática", empresa: "LOTER, C.A.", monto: "+$ 2.100", positivo: true },
];
