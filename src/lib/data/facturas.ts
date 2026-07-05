import type { Factura } from "../types";

/* Facturas de ejemplo (de facturas.php). */
export const FACTURAS: Factura[] = [
  { numero: "00012458", proveedor: "IESV", fecha: "17/06/2026", monto: "12.500,00", moneda: "$", estado: "Cobrada", tipo: "Emitida" },
  { numero: "00012457", proveedor: "GO Wireline Services, C.A.", fecha: "11/06/2026", monto: "2.100,00", moneda: "$", estado: "Pendiente", tipo: "Emitida" },
  { numero: "A-7782", proveedor: "Repuestos Monagas", fecha: "09/06/2026", monto: "3.480,00", moneda: "Bs", estado: "Pagada", tipo: "Recibida" },
  { numero: "00012456", proveedor: "IESV", fecha: "04/06/2026", monto: "9.750,00", moneda: "$", estado: "Cobrada", tipo: "Emitida" },
  { numero: "B-1109", proveedor: "Suministros Eléctricos CA", fecha: "02/06/2026", monto: "1.220,00", moneda: "Bs", estado: "Pendiente", tipo: "Recibida" },
  { numero: "00012455", proveedor: "GO Wireline Services, C.A.", fecha: "01/06/2026", monto: "4.300,00", moneda: "$", estado: "Cobrada", tipo: "Emitida" },
];

/* KPIs del "Resumen de junio" (hardcodeados en el boceto, se mantienen). */
export const RESUMEN_JUNIO = {
  emitidas: 4,
  recibidas: 2,
  porCobrar: "$ 2.100",
  totalEmitido: "$ 28.650",
};
