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

/** Estado derivado (nunca se guarda): "Mantenimiento" si tiene una orden
    "En taller", "Asignado" si figura en una asignación activa, si no
    "Disponible". Ver derivarEstadoEquipo() en negocio/inventario.ts. */
export type EstadoEquipo = "Disponible" | "Asignado" | "Mantenimiento";

/** Ficha técnica del equipo (identidad). Todos los campos opcionales; los
    mecánicos (motor) aplican sobre todo a petroleros/vehículos y `garantia` a
    oficina/herramienta. Los consumibles que usa viven en `Equipo.consumibles`. */
export interface FichaEquipo {
  marca?: string;
  modelo?: string;
  serial?: string;
  motor?: string;
  garantia?: string;
  notas?: string;
}

/** Consumible/repuesto vinculado a un equipo: rol (Aceite, Filtro de aceite…)
    + referencia al catálogo de consumibles (para ver stock). */
export interface EquipoConsumible {
  rol: string;
  consumibleId: number;
}

export interface Equipo {
  id: number;
  codigo: string; // nombre/código del equipo
  categoria: CategoriaEquipo;
  ubicacion: string;
  ficha?: FichaEquipo;
  /** Consumibles/repuestos que usa este equipo (para verificar stock). */
  consumibles?: EquipoConsumible[];
}

/* ---------------- Consumibles (repuestos con stock) ---------------- */

export type TipoConsumible =
  | "Aceite"
  | "Filtro"
  | "Correa"
  | "Batería"
  | "Refrigerante"
  | "Neumático"
  | "Otro";

/** Ítem del catálogo de consumibles con control de existencias. */
export interface Consumible {
  id: number;
  nombre: string;
  tipo: TipoConsumible;
  unidad: string; // "unidad", "litro", "juego"…
  cantidad: number; // existencias actuales
  stockMinimo: number; // umbral de aviso de bajo stock
  ubicacion: string;
}

/* ---------------- Mantenimiento ---------------- */

export type EstadoMantenimiento = "En taller" | "Pendiente" | "Programado" | "Completado";

export interface RegistroMantenimiento {
  id: number;
  equipo: string; // nombre del equipo (elegido del inventario)
  tipo: "Correctivo" | "Preventivo";
  programado: string; // ISO yyyy-mm-dd
  realizado: string; // ISO yyyy-mm-dd | "" (aún no realizado)
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

export type OrigenTransaccion =
  | "manual"
  | "nomina"
  | "transferencia"
  | "factura"
  | "compra"
  | "traspaso";

/** 'ambas' cubre categorías válidas para entrada y salida (Transferencias del Grupo). */
export type TipoCategoria = TipoTransaccion | "ambas";

/** Marca de categoría de sistema: los movimientos automáticos la buscan por
    este campo (no por nombre) para sobrevivir a renombres. */
export type CategoriaSistema = "nomina" | "transferencias" | "facturas" | "traspasos";

/** Monedas soportadas por las cuentas financieras (extensible). */
export type Moneda = "VES" | "USD" | "USDT";

/** Cuenta financiera de una empresa (banco, exchange, caja). El saldo se
    deriva de las transacciones; nunca se almacena. */
export interface CuentaFinanciera {
  id: number;
  empresaId: string; // Empresa.key
  nombre: string; // "Mercantil", "Binance", "Cuenta Principal"
  /** Inmutable una vez la cuenta tiene movimientos. */
  moneda: Moneda;
  /** Exactamente una por empresa (invariante del reducer): recibe los
      movimientos automáticos si el usuario no elige otra. */
  predeterminada: boolean;
  /** Desactivada: fuera de los selectores; su saldo sigue contando. */
  activa: boolean;
}

/** Traspaso entre cuentas de la MISMA empresa: transferencia (misma moneda)
    o conversión (monedas distintas). No es ingreso ni egreso: genera 2 filas
    espejo en el libro (origen 'traspaso', referenciaId = id). */
export interface TraspasoInterno {
  id: number;
  empresaId: string;
  cuentaOrigenId: number;
  cuentaDestinoId: number;
  /** Moneda de cada cuenta congelada al registrar. */
  monedaOrigen: Moneda;
  /** Monto nativo que sale de la cuenta origen (ej. 50.000 VES). */
  montoOrigen: number;
  monedaDestino: Moneda;
  /** Monto nativo que entra a la destino; editable si las monedas difieren. */
  montoDestino: number;
  /** Tasa Bs/USD vigente al registrar (equivalentes históricos). */
  tasaBs: number;
  fecha: string; // ISO yyyy-mm-dd
  descripcion: string;
  observaciones?: string;
}

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
  /** Cuenta afectada: cada fila del libro toca exactamente una cuenta. */
  cuentaId: number;
  tipo: TipoTransaccion;
  categoriaId: number;
  /** Moneda de la cuenta congelada al registrar (invariante: = cuenta.moneda). */
  moneda: Moneda;
  /** Monto NATIVO en `moneda`; el saldo por cuenta es la suma exacta de estos. */
  monto: number;
  /** Tasa Bs/USD congelada al registrar (equivalentes históricos). */
  tasaBs: number;
  fecha: string; // ISO yyyy-mm-dd; se muestra dd-mm-yyyy
  descripcion: string;
  observaciones?: string;
  origen: OrigenTransaccion;
  /** PagoHistorial.id ('nomina'), MovimientoGrupo.id ('transferencia'),
      Factura.id ('factura'), FacturaRecibida.id ('compra') o
      TraspasoInterno.id ('traspaso'). */
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
  /** Cuenta del extremo cuando es empresa del grupo (requerida en ese caso). */
  cuentaOrigenId?: number;
  cuentaDestinoId?: number;
  /** Texto libre para extremos externos ("IESV (cliente)", "Nómina"). */
  origenNombre: string;
  destinoNombre: string;
  monedaOrigen: Moneda;
  montoOrigen: number;
  /** Iguales al origen si no hay conversión de moneda. */
  monedaDestino: Moneda;
  montoDestino: number;
  /** Tasa Bs/USD vigente al registrar (para el espejo por empresa). */
  tasaBs: number;
  descripcion: string;
  observaciones?: string;
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
  /** USD referencial capturado al elegir el servicio del catálogo de tarifas
      (se precarga como P. Unit. de la pre-factura; opcional/texto libre). */
  tarifaRef?: number;
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

/* ---------------- Gestión de Tarifas (catálogo de servicios) ---------------- */

/** Unidad/período de la tarifa referencial. */
export type UnidadTarifa = "dia" | "hora" | "bloque8" | "servicio";
export const UNIDADES_TARIFA: Record<UnidadTarifa, string> = {
  dia: "Por día",
  hora: "Por hora",
  bloque8: "Bloque de 8 horas",
  servicio: "Servicio / traslado (precio único)",
};

export type CategoriaTarifa = "luminaria" | "generador" | "traslado" | "otro";
export const CATEGORIAS_TARIFA: Record<CategoriaTarifa, string> = {
  luminaria: "Luminarias",
  generador: "Generadores",
  traslado: "Traslados",
  otro: "Otros",
};

/** Servicio del catálogo con su tarifa REFERENCIAL (negociable por cliente; la
    descripción del servicio sí es constante). Alimenta el selector del reporte. */
export interface TarifaServicio {
  id: number;
  descripcion: string; // constante, ej. "SERVICIO DE ALQUILER DE LUMINARIA MARCA COLEMAN TIPO JIRAFA"
  categoria: CategoriaTarifa;
  unidad: UnidadTarifa;
  tarifaRef: number; // USD referencial (bare number, convención del repo)
  activo: boolean; // inactivo: no aparece en el selector del reporte, conserva historial
  notas?: string;
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

/* ---------------- Control administrativo (cuentas por pagar) ---------------- */

/** Documento por pagar: factura de proveedor o nota de entrega (aún no factura). */
export type TipoDocPorPagar = "factura" | "nota_entrega";

export type EstadoPorPagar = "pendiente" | "pagada";

/**
 * Cuenta por pagar: documento administrativo pendiente de pago (no fiscal).
 * No entra al Libro de Compras ni genera crédito/retención mientras esté
 * pendiente; al pagarse se convierte en una FacturaRecibida (ya pagada) y es
 * entonces cuando se capturan los datos fiscales.
 */
export interface CuentaPorPagar {
  id: number;
  tipo: TipoDocPorPagar;
  proveedorId: number;
  /** N° de la factura o de la nota de entrega. */
  numeroDocumento: string;
  fecha: string; // ISO (fecha del documento)
  /** Fecha pactada de pago (ISO). Sin ella la cuenta no vence. */
  fechaVencimiento?: string;
  /** Monto total del documento en Bs (referencial administrativo). */
  totalBs: number;
  descripcion?: string;
  estado: EstadoPorPagar;
  /** Object URL del PDF subido (vive solo la sesión, fase mock). */
  pdfUrl?: string;
  pdfNombre?: string;
  /** FacturaRecibida creada al pagarse (si ya se pagó/convirtió). */
  facturaRecibidaId?: number;
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
  equipos: string[]; // códigos de equipo del inventario
  desde: string; // ISO yyyy-mm-dd
  hasta: string; // ISO yyyy-mm-dd; "" mientras la asignación sigue en curso (sin fecha de fin)
  dias: number; // 0 mientras no tenga fecha "hasta" (en curso)
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
