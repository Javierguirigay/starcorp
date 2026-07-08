/**
 * Tipos del dominio STARCORP GROUP.
 * Derivados de las estructuras de datos de ejemplo del boceto PHP.
 */

export type Rol = "administradora" | "operaciones";

export interface Usuario {
  nombre: string;
  rol: Rol;
  inicial: string;
}

/* ---------------- Empresas ---------------- */

export interface Empresa {
  key: string;
  nombre: string;
  rif: string;
  activa: boolean;
}

/** Saldos de ejemplo por empresa (strings pre-formateados, como en el boceto). */
export interface SaldoEmpresa {
  key: string;
  nombre: string;
  usd: string;
  bs: string;
  activa: boolean;
}

/* ---------------- Equipos e inventario ---------------- */

export type CategoriaEquipo = "petrolero" | "oficina" | "herramienta" | "vehiculo";

export type EstadoEquipo = "Disponible" | "Asignado" | "Mantenimiento";

export interface Equipo {
  codigo: string;
  categoria: CategoriaEquipo;
  estado: EstadoEquipo;
  ubicacion: string;
}

/** Dataset propio de la vista de Equipos (tarjetas con detalle operativo). */
export interface EquipoDetalle {
  nombre: string;
  estado: EstadoEquipo;
  ubicacion: string;
  asignacion: string; // 'cliente · S-00x' o '—'
  mantenimiento: "Al día" | "En taller" | "Pendiente";
  proximo: string; // 'dd/mm/yyyy' | 'En curso'
}

/* ---------------- Mantenimiento ---------------- */

export type EstadoMantenimiento = "En taller" | "Pendiente" | "Programado" | "Completado";

export interface RegistroMantenimiento {
  equipo: string;
  tipo: "Correctivo" | "Preventivo";
  programado: string; // dd/mm/yyyy
  realizado: string; // dd/mm/yyyy | '—' | 'En curso'
  estado: EstadoMantenimiento;
  tecnico: string;
  observaciones: string;
}

/* ---------------- Finanzas ---------------- */

export type TipoMovimiento = "Entrada" | "Transferencia" | "Retiro";

export interface Movimiento {
  fecha: string; // dd/mm/yyyy
  tipo: TipoMovimiento;
  origen: string;
  destino: string;
  moneda: "USD" | "Bs";
  monto: string; // pre-formateado, como el boceto
  descripcion: string;
  usuario: string;
}

/** Movimiento resumido que muestra el dashboard. */
export interface MovimientoDashboard {
  fecha: string;
  tipo: TipoMovimiento;
  descripcion: string;
  empresa: string;
  monto: string; // '+$ 12.500' / '−$ 6.300'
  positivo: boolean;
}

/* ---------------- Facturas ---------------- */

export type EstadoFactura = "Cobrada" | "Pendiente" | "Pagada";

export interface Factura {
  numero: string;
  proveedor: string;
  fecha: string; // dd/mm/yyyy
  monto: string; // pre-formateado es-VE
  moneda: "$" | "Bs";
  estado: EstadoFactura;
  tipo: "Emitida" | "Recibida";
}

/* ---------------- Nómina ---------------- */

export type CategoriaPago = "Semanal" | "Quincenal";
export type EstatusEmpleado = "Activo" | "Permiso" | "Inactivo";

export interface DatosBancarios {
  banco: string;
  tipo: "Corriente" | "Ahorro";
  cuenta: string;
  titular: string;
  cedula: string;
  pagomovil: string;
}

export interface Empleado {
  id: number;
  nombre: string;
  cargo: string;
  dpto: string;
  categoria: CategoriaPago;
  /** Salario base mensual en USD. */
  base: number;
  ingreso: string; // ISO yyyy-mm-dd
  estatus: EstatusEmpleado;
  banco: DatosBancarios;
}

export type EstadoAdelanto = "pendiente" | "descontado";

/** Porción de un adelanto descontada en un pago concreto. */
export interface AplicacionAdelanto {
  pagoId: number; // PagoHistorial.id
  montoUSD: number;
}

export interface AdelantoSueldo {
  id: number;
  empleadoId: number;
  montoUSD: number;
  fecha: string; // ISO yyyy-mm-dd; se muestra dd-mm-yyyy
  /** 'pendiente' mientras quede remanente por descontar. */
  estado: EstadoAdelanto;
  /** Acumulado ya descontado (0..montoUSD); el remanente pasa al próximo pago. */
  montoDescontadoUSD: number;
  aplicaciones: AplicacionAdelanto[];
  /** Pago que lo dejó saldado ('descontado'). */
  pagoNominaId?: number;
  nota?: string;
}

export interface DetallePago {
  nombre: string;
  faltas: number;
  dias: number;
  diario: number;
  desc: number;
  neto: number;
  /** Adelanto descontado en este pago (pagos previos a la función: undefined = 0). */
  descAdelanto?: number;
  /* Snapshot del empleado al momento del pago, para recibos PDF fieles
     aunque el empleado se edite o elimine después. Pagos del seed: undefined. */
  empId?: number;
  cargo?: string;
  dpto?: string;
  /** Salario base mensual (USD) al momento del pago. */
  base?: number;
  banco?: DatosBancarios;
}

export interface PagoHistorial {
  id: number;
  categoria: CategoriaPago;
  desde: string; // ISO
  hasta: string; // ISO
  registrado: string; // ISO
  totalUsd: number;
  totalDesc: number;
  /** Suma de descAdelanto del detalle (pagos previos: undefined = 0). */
  totalAdelanto?: number;
  /** Tasa Bs/USD congelada al registrar el pago (pagos previos: se usa la vigente). */
  tasa?: number;
  detalle: DetallePago[];
}

/* ---------------- Asignación de equipos ---------------- */

export interface Asignacion {
  id: string; // S-00x
  cliente: string;
  equipos: string;
  desde: string; // dd/mm/yyyy
  hasta: string; // dd/mm/yyyy
  dias: number;
  estado: "Activo" | "Finalizado";
  observaciones: string;
}

/* ---------------- Retenciones ---------------- */

export type PorcentajeRetencion = 75 | 100;

export interface LineaRetencion {
  /** Identificador estable de la fila en la UI. */
  id: number;
  /** N° de operación mostrado/editable. */
  numOp: string;
  fechaDoc: string;
  numFactura: string;
  numControl: string;
  notaDebito: string;
  notaCredito: string;
  tipo: "01" | "02" | "03";
  /** Entradas de monto en formato es-VE (texto tal cual lo escribe el usuario). */
  totalConIva: string;
  sinCredito: string;
  baseImponible: string;
}
