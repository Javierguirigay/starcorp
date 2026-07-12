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

/* ---------------- Finanzas por empresa ---------------- */

export type TipoTransaccion = "entrada" | "salida";

export type OrigenTransaccion = "manual" | "nomina" | "transferencia" | "factura" | "compra";

/** 'ambas' cubre categorías válidas para entrada y salida (Transferencias del Grupo). */
export type TipoCategoria = TipoTransaccion | "ambas";

/** Marca de categoría de sistema: los movimientos automáticos la buscan por
    este campo (no por nombre) para sobrevivir a renombres. */
export type CategoriaSistema = "nomina" | "transferencias" | "facturas";

export interface CategoriaFinanciera {
  id: number;
  nombre: string;
  tipo: TipoCategoria;
  empresaId: string; // Empresa.key
  /** Categorías de sistema: no editables ni eliminables. */
  protegida?: boolean;
  sistema?: CategoriaSistema;
}

export interface TransaccionFinanciera {
  id: number;
  empresaId: string; // Empresa.key
  tipo: TipoTransaccion;
  categoriaId: number;
  /** SIEMPRE en USD; Bs = montoUSD × tasaBs. */
  montoUSD: number;
  /** Tasa Bs/USD congelada al registrar (histórico fiel). */
  tasaBs: number;
  fecha: string; // ISO yyyy-mm-dd; se muestra dd-mm-yyyy
  descripcion: string;
  origen: OrigenTransaccion;
  /** PagoHistorial.id ('nomina'), MovimientoGrupo.id ('transferencia'),
      Factura.id ('factura') o FacturaRecibida.id ('compra'). */
  referenciaId?: number;
}

/** Movimiento del historial del Grupo con estado (sucesor del Movimiento estático). */
export interface MovimientoGrupo {
  id: number;
  fecha: string; // ISO yyyy-mm-dd
  tipo: TipoMovimiento;
  /** Empresa.key cuando el extremo es una empresa del grupo. */
  origenKey?: string;
  destinoKey?: string;
  /** Texto libre para extremos externos ("IESV (cliente)", "Nómina"). */
  origenNombre: string;
  destinoNombre: string;
  moneda: "USD" | "Bs";
  monto: number;
  /** Tasa Bs/USD vigente al registrar (para el espejo por empresa). */
  tasaBs: number;
  descripcion: string;
  usuario: string;
}

/* ---------------- Facturación (ventas) ---------------- */

export interface Cliente {
  id: number;
  razonSocial: string;
  rif: string;
  domicilio: string;
  telefono: string;
}

/** Renglón de período de servicio de un reporte (cada luminaria/equipo puede
    iniciar en fecha distinta; los días se auto-calculan pero son editables). */
export interface PeriodoServicio {
  id: number;
  concepto: string;
  desde: string; // ISO yyyy-mm-dd
  hasta: string; // ISO
  dias: number;
}

export type EstadoReporte = "pendiente" | "prefacturado";

/** Reporte de servicio de campo (PDF escaneado + transcripción manual). */
export interface ReporteServicio {
  id: number;
  numeroControl: string; // ej. "00384"
  fecha: string; // ISO
  clienteId: number;
  locacion: string;
  pozo: string; // ej. MUC-102, SBC-37
  tipoEquipo: string; // Generador, Luminarias…
  placas?: string;
  descripcion: string;
  periodos: PeriodoServicio[];
  supervisorNombre: string;
  supervisorCI: string;
  estado: EstadoReporte;
  /** Object URL del PDF subido (vive solo la sesión, fase mock). */
  pdfUrl?: string;
  pdfNombre?: string;
}

export interface RenglonFactura {
  id: number;
  can: number;
  descripcion: string;
  /** Prefactura: USD. Factura: Bs (ya convertido por unitario a la tasa snapshot). */
  pUnit: number;
}

export type EstadoPreFactura = "borrador" | "emitida" | "facturada";

/** Pre-factura en USD (documento previo al talonario fiscal). */
export interface PreFactura {
  id: number;
  numero: string; // correlativo "066", editable
  fecha: string; // ISO
  clienteId: number;
  condicionesPago: string;
  renglones: RenglonFactura[];
  /** Última línea de la columna descripción ("LOCACION: POZO SBC-37"). */
  locacion: string;
  estado: EstadoPreFactura;
  reporteIds: number[];
}

export type EstadoFactura = "pendiente" | "cobrada";

/** Factura fiscal en Bs, creada siempre desde una pre-factura. */
export interface Factura {
  id: number;
  prefacturaId: number;
  /** Manuales: deben coincidir con el talonario fiscal pre-impreso. */
  numeroFactura: string;
  numeroControl: string;
  fechaEmision: string; // ISO
  clienteId: number;
  /** Tasa Bs/USD congelada al generar (conversión por precio unitario). */
  tasaBs: number;
  renglones: RenglonFactura[]; // pUnit en Bs
  locacion: string;
  condicionesPago: string;
  /** Fecha pactada de cobro (ISO). Sin ella la factura no vence. */
  fechaVencimiento?: string;
  estado: EstadoFactura;
}

/* ---------------- Gestión de compras ---------------- */

export interface Proveedor {
  id: number;
  razonSocial: string;
  rif: string;
  direccion: string;
  /** Tipo de proveedor (texto libre: Repuestos, Servicios…). */
  tipo: string;
}

export type EstadoCompra = "pendiente" | "pagada";

/** Tipo de transacción del libro fiscal (01-Registro, 02-Complemento, 03-Anulación). */
export type TipoTransaccionCompra = "01" | "02" | "03";

/** Factura de compra recibida de un proveedor. Montos en Bs. */
export interface FacturaRecibida {
  id: number;
  proveedorId: number;
  numeroFactura: string;
  numeroControl: string;
  fecha: string; // ISO (fecha del documento)
  notaDebito?: string;
  notaCredito?: string;
  facturaAfectada?: string;
  tipoTransaccion: TipoTransaccionCompra;
  totalConIvaBs: number;
  /** Compras sin derecho a crédito fiscal (default 0). */
  sinCreditoBs: number;
  baseImponibleBs: number;
  impuestoIvaBs: number;
  /** Fecha pactada de pago (ISO). Sin ella la compra no vence. */
  fechaVencimiento?: string;
  estado: EstadoCompra;
  /** Object URL del PDF subido (vive solo la sesión, fase mock). */
  pdfUrl?: string;
  pdfNombre?: string;
  /** Retención IVA generada sobre esta factura (si existe). */
  retencionId?: number;
}

/** Línea de detalle de un comprobante de retención (montos numéricos en Bs). */
export interface RetencionLinea {
  numOp: number;
  fechaDoc: string; // ISO
  numFactura: string;
  numControl: string;
  notaDebito?: string;
  notaCredito?: string;
  facturaAfectada?: string;
  tipoTransaccion: TipoTransaccionCompra;
  totalConIvaBs: number;
  sinCreditoBs: number;
  baseImponibleBs: number;
  impuestoIvaBs: number;
  ivaRetenidoBs: number;
}

/** Comprobante de retención de IVA (Providencia SNAT/2025/000054). */
export interface Retencion {
  id: number;
  /** AAAAMM + correlativo de 8 dígitos (ej. "20260700000061"), editable. */
  comprobante: string;
  fechaEmision: string; // ISO
  periodoAnio: number;
  periodoMes: number; // 1-12
  proveedorId: number;
  pct: PorcentajeRetencion;
  facturaRecibidaId?: number;
  lineas: RetencionLinea[];
  totalConIvaBs: number;
  totalSinCreditoBs: number;
  totalBaseBs: number;
  totalImpuestoBs: number;
  totalRetenidoBs: number;
}

/* ---------------- Gestión de órdenes ---------------- */

export type TipoOrden = "compra" | "entrega" | "requerimiento";

/** Renglón de una orden. precioUnitBs solo aplica a la orden de compra. */
export interface RenglonOrden {
  cantidad: number;
  unidad: string;
  descripcion: string;
  precioUnitBs?: number;
}

/**
 * Orden de compra / entrega / requerimiento. Un solo tipo con discriminante:
 * comparten cabecera, renglones y firmas; los campos propios de cada tipo son
 * opcionales (condicionesPago en compra, locacion/transporte en entrega,
 * motivo en requerimiento).
 */
export interface Orden {
  id: number;
  tipo: TipoOrden;
  numero: string; // OC-0001 / OE-0001 / OR-0001
  fecha: string; // ISO
  /** Proveedor (compra), destinatario (entrega) o solicitante (requerimiento). */
  contraparteNombre: string;
  contraparteRif?: string;
  renglones: RenglonOrden[];
  observaciones?: string;
  elaboradoPor: string;
  aprobadoPor?: string;
  recibidoPor?: string;
  condicionesPago?: string; // compra
  locacion?: string; // entrega
  transporte?: string; // entrega
  motivo?: string; // requerimiento
}

/* ---------------- Plantilla de impresión (factura fiscal) ---------------- */

export interface PosicionMm {
  x: number;
  y: number;
}

export type CampoPlantilla =
  | "razonSocial"
  | "fecha"
  | "domicilio"
  | "telefono"
  | "rif"
  | "condiciones"
  | "renglones" // origen del área de renglones (x = columna CAN)
  | "alicuota" // el "16" del % de IVA
  | "subtotal"
  | "iva"
  | "total";

/** Offsets en mm para imprimir SOLO los datos sobre el papel fiscal pre-impreso. */
export interface CalibracionPlantilla {
  campos: Record<CampoPlantilla, PosicionMm>;
  /** Offset global de página (se suma a todos los campos). */
  global: PosicionMm;
  alturaFilaMm: number;
  /** Columnas del área de renglones: descripción (izq.) y montos (borde derecho). */
  colDescXMm: number;
  colPUnitXMm: number;
  colTotalXMm: number;
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
