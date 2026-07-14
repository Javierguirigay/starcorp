/**
 * Libro mayor por cuenta: funciones puras del módulo de Finanzas.
 *
 * Cada fila del libro afecta exactamente UNA cuenta en SU moneda nativa
 * (invariante: fila.moneda === cuenta.moneda). El saldo de una cuenta es la
 * suma exacta de sus filas; el balance de una empresa es el consolidado de
 * sus cuentas a la tasa VIGENTE (USDT 1:1 con USD, VES / tasa).
 *
 * OJO: con este modelo Balance ≠ ingresos − egresos necesariamente: las
 * conversiones de moneda y la deriva de la tasa sobre cuentas VES separan
 * ambas cifras. Los equivalentes históricos por fila usan su tasa congelada
 * al registrar (tasaBs), nunca la vigente.
 *
 * Las operaciones de dos cuentas (traspasos internos y transferencias del
 * Grupo) se registran como un padre + 2 filas espejo (salida en origen,
 * entrada en destino) enlazadas por origen + referenciaId.
 */
import type {
  CategoriaFinanciera,
  CategoriaSistema,
  CuentaFinanciera,
  Empresa,
  Moneda,
  MovimientoGrupo,
  OrigenTransaccion,
  PagoHistorial,
  TipoTransaccion,
  TransaccionFinanciera,
  TraspasoInterno,
} from "../types";
import { formatFechaVE } from "../format";
import { round2 } from "./nomina";

/* ---------------- Monedas y conversión ---------------- */

export const MONEDAS: Moneda[] = ["VES", "USD", "USDT"];

export const SIMBOLO_MONEDA: Record<Moneda, string> = {
  USD: "$",
  USDT: "USDT",
  VES: "Bs",
};

/**
 * Conversión entre monedas con una tasa Bs/USD dada. USD y USDT valen 1:1;
 * VES entra/sale vía la tasa. Identidad si origen y destino coinciden.
 * Tasa inválida (<= 0) devuelve 0 para no propagar Infinity/NaN.
 */
export function convertirMonto(monto: number, de: Moneda, a: Moneda, tasaBs: number): number {
  if (de === a) return round2(monto);
  const usd = de === "VES" ? (tasaBs > 0 ? monto / tasaBs : 0) : monto;
  return round2(a === "VES" ? usd * tasaBs : usd);
}

/** Equivalente USD de una fila con SU tasa snapshot (USDT 1:1). */
export function montoUSDde(t: TransaccionFinanciera): number {
  return convertirMonto(t.monto, t.moneda, "USD", t.tasaBs);
}

/** Equivalente Bs de una fila con su tasa snapshot (VES es el nativo). */
export function montoBs(t: TransaccionFinanciera): number {
  return convertirMonto(t.monto, t.moneda, "VES", t.tasaBs);
}

/* ---------------- Totales y subtotales ---------------- */

export interface TotalesFinancieros {
  entradasUSD: number;
  entradasBs: number;
  salidasUSD: number;
  salidasBs: number;
}

/** Orígenes que mueven dinero entre cuentas propias o del grupo: no son
    ingresos ni egresos operativos y quedan fuera de los KPIs de totales. */
export const ORIGENES_NO_OPERATIVOS: OrigenTransaccion[] = ["traspaso", "transferencia"];

/** Suma de equivalentes USD y Bs (cada fila con su snapshot). */
export function subtotales(ts: TransaccionFinanciera[]): { usd: number; bs: number } {
  return {
    usd: round2(ts.reduce((s, t) => s + montoUSDde(t), 0)),
    bs: round2(ts.reduce((s, t) => s + montoBs(t), 0)),
  };
}

/**
 * Ingresos y egresos OPERATIVOS en equivalentes USD/Bs con snapshot:
 * excluye traspasos y transferencias (mueven dinero, no lo generan ni lo
 * gastan). El balance ya no sale de aquí: es el consolidado de saldos.
 */
export function calcularTotales(ts: TransaccionFinanciera[]): TotalesFinancieros {
  const operativas = ts.filter((t) => !ORIGENES_NO_OPERATIVOS.includes(t.origen));
  const entradas = subtotales(filtrarPorTipo(operativas, "entrada"));
  const salidas = subtotales(filtrarPorTipo(operativas, "salida"));
  return {
    entradasUSD: entradas.usd,
    entradasBs: entradas.bs,
    salidasUSD: salidas.usd,
    salidasBs: salidas.bs,
  };
}

/* ---------------- Cuentas y saldos ---------------- */

export interface SaldoCuenta {
  cuenta: CuentaFinanciera;
  /** Saldo exacto en la moneda nativa de la cuenta. */
  saldo: number;
}

/** Saldo de una cuenta en su moneda nativa: entradas − salidas de sus filas
    (incluye traspasos y transferencias: sí mueven el saldo). */
export function saldoDeCuenta(cuentaId: number, ts: TransaccionFinanciera[]): number {
  return round2(
    ts.reduce(
      (s, t) => (t.cuentaId === cuentaId ? s + (t.tipo === "entrada" ? t.monto : -t.monto) : s),
      0
    )
  );
}

export function saldosPorCuenta(
  cuentas: CuentaFinanciera[],
  ts: TransaccionFinanciera[]
): SaldoCuenta[] {
  return cuentas.map((cuenta) => ({ cuenta, saldo: saldoDeCuenta(cuenta.id, ts) }));
}

/** Totales por moneda (solo monedas con alguna cuenta). */
export function saldosPorMoneda(saldos: SaldoCuenta[]): Partial<Record<Moneda, number>> {
  const out: Partial<Record<Moneda, number>> = {};
  for (const { cuenta, saldo } of saldos) {
    out[cuenta.moneda] = round2((out[cuenta.moneda] ?? 0) + saldo);
  }
  return out;
}

/** Consolidado en USD a la tasa VIGENTE: USDT 1:1, VES / tasa (0 si inválida). */
export function consolidadoUSD(saldos: SaldoCuenta[], tasaVigente: number): number {
  return round2(
    saldos.reduce((s, x) => s + convertirMonto(x.saldo, x.cuenta.moneda, "USD", tasaVigente), 0)
  );
}

export interface SaldoEmpresaCalculado {
  key: string;
  nombre: string;
  activa: boolean;
  /** Suma de los saldos de sus cuentas en USD a la tasa vigente. */
  consolidadoUSD: number;
  porMoneda: Partial<Record<Moneda, number>>;
}

/**
 * Saldo de cada empresa = consolidado de sus cuentas a la tasa vigente, el
 * mismo número que muestra el KPI "Balance" de su pestaña. Una empresa sin
 * cuentas o sin movimientos queda en 0.
 */
export function saldosDeEmpresas(
  empresas: Empresa[],
  cuentas: CuentaFinanciera[],
  ts: TransaccionFinanciera[],
  tasaVigente: number
): SaldoEmpresaCalculado[] {
  return empresas.map((e) => {
    const saldos = saldosPorCuenta(cuentasDeEmpresa(cuentas, e.key), ts);
    return {
      key: e.key,
      nombre: e.nombre,
      activa: e.activa,
      consolidadoUSD: consolidadoUSD(saldos, tasaVigente),
      porMoneda: saldosPorMoneda(saldos),
    };
  });
}

/** Saldo consolidado del grupo en USD: suma de los saldos de todas las empresas. */
export function saldoConsolidado(saldos: SaldoEmpresaCalculado[]): number {
  return round2(saldos.reduce((s, e) => s + e.consolidadoUSD, 0));
}

export function cuentasDeEmpresa(
  cuentas: CuentaFinanciera[],
  empresaId: string,
  soloActivas = false
): CuentaFinanciera[] {
  return cuentas.filter((c) => c.empresaId === empresaId && (!soloActivas || c.activa));
}

export function cuentaPredeterminada(
  cuentas: CuentaFinanciera[],
  empresaId: string
): CuentaFinanciera | undefined {
  return cuentas.find((c) => c.empresaId === empresaId && c.predeterminada);
}

export function puedeEliminarCuenta(
  cuenta: CuentaFinanciera,
  transacciones: TransaccionFinanciera[],
  traspasos: TraspasoInterno[],
  movimientosGrupo: MovimientoGrupo[]
): { ok: boolean; motivo?: string } {
  if (cuenta.predeterminada)
    return { ok: false, motivo: "Es la cuenta predeterminada: asigna otra primero" };
  if (transacciones.some((t) => t.cuentaId === cuenta.id))
    return { ok: false, motivo: "Tiene movimientos asociados" };
  if (traspasos.some((t) => t.cuentaOrigenId === cuenta.id || t.cuentaDestinoId === cuenta.id))
    return { ok: false, motivo: "Tiene traspasos asociados" };
  if (movimientosGrupo.some((m) => m.cuentaOrigenId === cuenta.id || m.cuentaDestinoId === cuenta.id))
    return { ok: false, motivo: "Tiene movimientos del Grupo asociados" };
  return { ok: true };
}

/**
 * Valida que la cuenta tenga fondos para un egreso/traspaso en su moneda
 * nativa. Tolerancia de medio centavo: mover el saldo completo no debe
 * fallar por redondeo. `ts` debe excluir los espejos del propio movimiento
 * al editar (para que el monto que se liberará cuente como disponible).
 */
export function fondosSuficientes(
  cuentaId: number,
  montoNativo: number,
  ts: TransaccionFinanciera[]
): { ok: boolean; disponible: number } {
  const disponible = saldoDeCuenta(cuentaId, ts);
  return { ok: montoNativo <= disponible + 0.005, disponible };
}

/* ---------------- Filtros y orden ---------------- */

export function filtrarPorTipo(
  ts: TransaccionFinanciera[],
  tipo: TipoTransaccion
): TransaccionFinanciera[] {
  return ts.filter((t) => t.tipo === tipo);
}

export interface FiltrosTransacciones {
  tipo: TipoTransaccion | "todas";
  /** null = todas las categorías. */
  categoriaId: number | null;
  /** null = todas las cuentas. */
  cuentaId: number | null;
  /** ISO yyyy-mm-dd; vacío = sin límite. */
  desde: string;
  hasta: string;
}

export const SIN_FILTROS: FiltrosTransacciones = {
  tipo: "todas",
  categoriaId: null,
  cuentaId: null,
  desde: "",
  hasta: "",
};

export function filtrarTransacciones(
  ts: TransaccionFinanciera[],
  f: FiltrosTransacciones
): TransaccionFinanciera[] {
  return ts.filter(
    (t) =>
      (f.tipo === "todas" || t.tipo === f.tipo) &&
      (f.categoriaId === null || t.categoriaId === f.categoriaId) &&
      (f.cuentaId === null || t.cuentaId === f.cuentaId) &&
      (!f.desde || t.fecha >= f.desde) &&
      (!f.hasta || t.fecha <= f.hasta)
  );
}

/** Descripción legible de los filtros activos (subtítulo de los reportes PDF). */
export function resumenFiltros(
  f: FiltrosTransacciones,
  categorias: CategoriaFinanciera[],
  cuentas: CuentaFinanciera[]
): string {
  const partes: string[] = [];
  if (f.tipo !== "todas")
    partes.push(f.tipo === "entrada" ? "Tipo: Entradas" : "Tipo: Salidas");
  if (f.categoriaId !== null) {
    const cat = categorias.find((c) => c.id === f.categoriaId);
    partes.push(`Categoría: ${cat?.nombre ?? f.categoriaId}`);
  }
  if (f.cuentaId !== null) {
    const cuenta = cuentas.find((c) => c.id === f.cuentaId);
    partes.push(`Cuenta: ${cuenta?.nombre ?? f.cuentaId}`);
  }
  if (f.desde) partes.push(`Desde ${formatFechaVE(f.desde)}`);
  if (f.hasta) partes.push(`Hasta ${formatFechaVE(f.hasta)}`);
  return partes.length ? `Filtros: ${partes.join(" · ")}` : "Sin filtros";
}

/** Fecha descendente; desempate por id descendente (lo último registrado arriba). */
export function ordenarPorFechaDesc(ts: TransaccionFinanciera[]): TransaccionFinanciera[] {
  return [...ts].sort((a, b) =>
    a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1
  );
}

/* ---------------- Categorías ---------------- */

/** Categorías de una empresa aplicables a un tipo de flujo ('ambas' cuenta en los dos). */
export function categoriasParaTipo(
  categorias: CategoriaFinanciera[],
  empresaId: string,
  tipo: TipoTransaccion
): CategoriaFinanciera[] {
  return categorias.filter(
    (c) => c.empresaId === empresaId && (c.tipo === tipo || c.tipo === "ambas")
  );
}

/** Categoría de sistema (Nómina / Transferencias / Traspasos) de una empresa.
    Que exista es lo que habilita los movimientos automáticos para esa empresa. */
export function categoriaSistema(
  categorias: CategoriaFinanciera[],
  empresaId: string,
  sistema: CategoriaSistema
): CategoriaFinanciera | undefined {
  return categorias.find((c) => c.empresaId === empresaId && c.sistema === sistema);
}

export function puedeEliminarCategoria(
  cat: CategoriaFinanciera,
  transacciones: TransaccionFinanciera[]
): { ok: boolean; motivo?: string } {
  if (cat.protegida) return { ok: false, motivo: "Categoría de sistema: no se puede eliminar" };
  if (transacciones.some((t) => t.categoriaId === cat.id))
    return { ok: false, motivo: "Tiene transacciones asociadas" };
  return { ok: true };
}

/* ---------------- Movimientos automáticos ---------------- */

export type NuevaTransaccion = Omit<TransaccionFinanciera, "id">;

export function descripcionNomina(pago: PagoHistorial): string {
  return `Nómina ${pago.categoria.toLowerCase()} ${formatFechaVE(pago.desde)} → ${formatFechaVE(
    pago.hasta
  )}`;
}

/**
 * Salida automática por pago de nómina de una empresa, sobre la cuenta
 * elegida (monto convertido a su moneda con la tasa snapshot del pago).
 * null si la empresa no tiene categoría de sistema 'nomina'.
 */
export function transaccionDeNomina(
  pago: PagoHistorial,
  categorias: CategoriaFinanciera[],
  empresaId: string,
  cuenta: CuentaFinanciera | undefined,
  tasaVigente: number
): NuevaTransaccion | null {
  const cat = categoriaSistema(categorias, empresaId, "nomina");
  if (!cat || !cuenta) return null;
  const tasa = pago.tasa ?? tasaVigente;
  return {
    empresaId,
    cuentaId: cuenta.id,
    tipo: "salida",
    categoriaId: cat.id,
    moneda: cuenta.moneda,
    monto: convertirMonto(pago.totalUsd, "USD", cuenta.moneda, tasa),
    tasaBs: tasa,
    fecha: pago.registrado,
    descripcion: descripcionNomina(pago),
    origen: "nomina",
    referenciaId: pago.id,
  };
}

/** Datos mínimos del cobro de una factura de venta (montos en Bs). */
export interface CobroFacturaDatos {
  id: number; // Factura.id
  numeroFactura: string;
  totalBs: number;
  /** Tasa snapshot de la factura (conversión del movimiento). */
  tasaBs: number;
  fecha: string; // ISO (fecha del cobro)
  clienteNombre: string;
}

/**
 * Entrada automática por cobro de una factura de venta, sobre la cuenta
 * elegida (una cuenta VES recibe los Bs exactos de la factura). null si la
 * empresa no tiene categoría de sistema 'facturas' o la tasa es inválida.
 */
export function transaccionDeFactura(
  d: CobroFacturaDatos,
  categorias: CategoriaFinanciera[],
  empresaId: string,
  cuenta: CuentaFinanciera | undefined
): NuevaTransaccion | null {
  const cat = categoriaSistema(categorias, empresaId, "facturas");
  if (!cat || !cuenta || d.tasaBs <= 0) return null;
  return {
    empresaId,
    cuentaId: cuenta.id,
    tipo: "entrada",
    categoriaId: cat.id,
    moneda: cuenta.moneda,
    monto: convertirMonto(d.totalBs, "VES", cuenta.moneda, d.tasaBs),
    tasaBs: d.tasaBs,
    fecha: d.fecha,
    descripcion: `Cobro Factura N° ${d.numeroFactura} — ${d.clienteNombre}`,
    origen: "factura",
    referenciaId: d.id,
  };
}

/** Datos mínimos del pago de una factura de compra (montos en Bs). */
export interface PagoCompraDatos {
  id: number; // FacturaRecibida.id
  numeroFactura: string;
  totalBs: number;
  proveedorNombre: string;
  fecha: string; // ISO (fecha del pago)
  /** Categoría de salida elegida en el modal (default "Gastos Operativos"). */
  categoriaId: number;
}

/**
 * Salida automática por pago de una factura de compra, sobre la cuenta
 * elegida (conversión con la tasa vigente, snapshot del momento del pago).
 * null si tasa inválida o sin cuenta.
 */
export function transaccionDeCompra(
  d: PagoCompraDatos,
  empresaId: string,
  cuenta: CuentaFinanciera | undefined,
  tasaVigente: number
): NuevaTransaccion | null {
  if (!cuenta || tasaVigente <= 0) return null;
  return {
    empresaId,
    cuentaId: cuenta.id,
    tipo: "salida",
    categoriaId: d.categoriaId,
    moneda: cuenta.moneda,
    monto: convertirMonto(d.totalBs, "VES", cuenta.moneda, tasaVigente),
    tasaBs: tasaVigente,
    fecha: d.fecha,
    descripcion: `Pago Factura ${d.numeroFactura} — ${d.proveedorNombre}`,
    origen: "compra",
    referenciaId: d.id,
  };
}

/* ---------------- Espejos (operaciones de dos cuentas) ---------------- */

interface ExtremoEspejo {
  empresaId?: string;
  cuentaId?: number;
  tipo: TipoTransaccion;
  moneda: Moneda;
  monto: number;
  descripcion: string;
}

/** Fila espejo de un extremo, si su empresa tiene la categoría de sistema
    requerida y el extremo tiene cuenta. */
function espejoDeExtremo(
  ex: ExtremoEspejo,
  categorias: CategoriaFinanciera[],
  sistema: CategoriaSistema,
  origen: OrigenTransaccion,
  tasaBs: number,
  fecha: string,
  referenciaId: number
): NuevaTransaccion | null {
  if (!ex.empresaId || ex.cuentaId === undefined) return null;
  const cat = categoriaSistema(categorias, ex.empresaId, sistema);
  if (!cat) return null;
  return {
    empresaId: ex.empresaId,
    cuentaId: ex.cuentaId,
    tipo: ex.tipo,
    categoriaId: cat.id,
    moneda: ex.moneda,
    monto: ex.monto,
    tasaBs,
    fecha,
    descripcion: ex.descripcion,
    origen,
    referenciaId,
  };
}

/**
 * Movimientos espejo de una transferencia del Grupo: salida en la cuenta
 * origen y entrada en la destino, solo para extremos que son empresas del
 * grupo con cuenta y categoría de sistema 'transferencias'. Cada pierna va
 * en la moneda/monto de su lado (permite conversión implícita).
 */
export function espejosDeTransferencia(
  mov: MovimientoGrupo,
  categorias: CategoriaFinanciera[]
): NuevaTransaccion[] {
  const extremos: ExtremoEspejo[] = [
    {
      empresaId: mov.origenKey,
      cuentaId: mov.cuentaOrigenId,
      tipo: "salida",
      moneda: mov.monedaOrigen,
      monto: mov.montoOrigen,
      descripcion: `Transferencia a ${mov.destinoNombre} — ${mov.descripcion}`,
    },
    {
      empresaId: mov.destinoKey,
      cuentaId: mov.cuentaDestinoId,
      tipo: "entrada",
      moneda: mov.monedaDestino,
      monto: mov.montoDestino,
      descripcion: `Transferencia desde ${mov.origenNombre} — ${mov.descripcion}`,
    },
  ];
  return extremos
    .map((ex) =>
      espejoDeExtremo(ex, categorias, "transferencias", "transferencia", mov.tasaBs, mov.fecha, mov.id)
    )
    .filter((t): t is NuevaTransaccion => t !== null);
}

/**
 * Filas espejo de un traspaso entre cuentas propias: salida en la cuenta
 * origen y entrada en la destino (misma empresa). Requiere la categoría de
 * sistema 'traspasos'; sin ella no se genera nada (empresa sin finanzas).
 */
export function espejosDeTraspaso(
  tr: TraspasoInterno,
  categorias: CategoriaFinanciera[]
): NuevaTransaccion[] {
  const esConversion = tr.monedaOrigen !== tr.monedaDestino;
  const etiqueta = esConversion ? "Conversión" : "Traspaso";
  const extremos: ExtremoEspejo[] = [
    {
      empresaId: tr.empresaId,
      cuentaId: tr.cuentaOrigenId,
      tipo: "salida",
      moneda: tr.monedaOrigen,
      monto: tr.montoOrigen,
      descripcion: `${etiqueta} entre cuentas — ${tr.descripcion}`,
    },
    {
      empresaId: tr.empresaId,
      cuentaId: tr.cuentaDestinoId,
      tipo: "entrada",
      moneda: tr.monedaDestino,
      monto: tr.montoDestino,
      descripcion: `${etiqueta} entre cuentas — ${tr.descripcion}`,
    },
  ];
  return extremos
    .map((ex) =>
      espejoDeExtremo(ex, categorias, "traspasos", "traspaso", tr.tasaBs, tr.fecha, tr.id)
    )
    .filter((t): t is NuevaTransaccion => t !== null);
}
