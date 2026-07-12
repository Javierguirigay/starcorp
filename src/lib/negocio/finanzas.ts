/**
 * Libro mayor por empresa: funciones puras del módulo de Finanzas.
 * Todos los montos viven en USD (montoUSD); los Bs se derivan por fila con la
 * tasa congelada al registrar (tasaBs), nunca con la vigente.
 */
import type {
  CategoriaFinanciera,
  CategoriaSistema,
  Empresa,
  MovimientoGrupo,
  PagoHistorial,
  TipoTransaccion,
  TransaccionFinanciera,
} from "../types";
import { formatFechaVE } from "../format";
import { round2 } from "./nomina";

/* ---------------- Totales y subtotales ---------------- */

export interface TotalesFinancieros {
  entradasUSD: number;
  entradasBs: number;
  salidasUSD: number;
  salidasBs: number;
  balanceUSD: number;
  balanceBs: number;
}

/** Bs de una transacción con su tasa snapshot. */
export function montoBs(t: TransaccionFinanciera): number {
  return round2(t.montoUSD * t.tasaBs);
}

export function subtotales(ts: TransaccionFinanciera[]): { usd: number; bs: number } {
  return {
    usd: round2(ts.reduce((s, t) => s + t.montoUSD, 0)),
    bs: round2(ts.reduce((s, t) => s + montoBs(t), 0)),
  };
}

/** Entradas, salidas y balance (entradas − salidas) en USD y Bs. */
export function calcularTotales(ts: TransaccionFinanciera[]): TotalesFinancieros {
  const entradas = subtotales(filtrarPorTipo(ts, "entrada"));
  const salidas = subtotales(filtrarPorTipo(ts, "salida"));
  return {
    entradasUSD: entradas.usd,
    entradasBs: entradas.bs,
    salidasUSD: salidas.usd,
    salidasBs: salidas.bs,
    balanceUSD: round2(entradas.usd - salidas.usd),
    balanceBs: round2(entradas.bs - salidas.bs),
  };
}

/* ---------------- Saldos por empresa ---------------- */

export interface SaldoEmpresaCalculado {
  key: string;
  nombre: string;
  activa: boolean;
  balanceUSD: number;
  balanceBs: number;
}

/**
 * Saldo de cada empresa = balance de su propio libro mayor (entradas −
 * salidas), el mismo número que muestra el KPI "Balance" de su pestaña.
 * Una empresa sin transacciones queda en 0.
 */
export function saldosDeEmpresas(
  empresas: Empresa[],
  ts: TransaccionFinanciera[]
): SaldoEmpresaCalculado[] {
  return empresas.map((e) => {
    const { balanceUSD, balanceBs } = calcularTotales(ts.filter((t) => t.empresaId === e.key));
    return { key: e.key, nombre: e.nombre, activa: e.activa, balanceUSD, balanceBs };
  });
}

/** Saldo consolidado del grupo: suma de los saldos de todas las empresas. */
export function saldoConsolidado(saldos: SaldoEmpresaCalculado[]): { usd: number; bs: number } {
  return {
    usd: round2(saldos.reduce((s, e) => s + e.balanceUSD, 0)),
    bs: round2(saldos.reduce((s, e) => s + e.balanceBs, 0)),
  };
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
  /** ISO yyyy-mm-dd; vacío = sin límite. */
  desde: string;
  hasta: string;
}

export const SIN_FILTROS: FiltrosTransacciones = {
  tipo: "todas",
  categoriaId: null,
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
      (!f.desde || t.fecha >= f.desde) &&
      (!f.hasta || t.fecha <= f.hasta)
  );
}

/** Descripción legible de los filtros activos (subtítulo de los reportes PDF). */
export function resumenFiltros(
  f: FiltrosTransacciones,
  categorias: CategoriaFinanciera[]
): string {
  const partes: string[] = [];
  if (f.tipo !== "todas")
    partes.push(f.tipo === "entrada" ? "Tipo: Entradas" : "Tipo: Salidas");
  if (f.categoriaId !== null) {
    const cat = categorias.find((c) => c.id === f.categoriaId);
    partes.push(`Categoría: ${cat?.nombre ?? f.categoriaId}`);
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

/** Categoría de sistema (Nómina / Transferencias del Grupo) de una empresa.
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
 * Salida automática por pago de nómina de una empresa. null si la empresa no
 * tiene finanzas habilitadas (sin categoría de sistema 'nomina').
 */
export function transaccionDeNomina(
  pago: PagoHistorial,
  categorias: CategoriaFinanciera[],
  empresaId: string,
  tasaVigente: number
): NuevaTransaccion | null {
  const cat = categoriaSistema(categorias, empresaId, "nomina");
  if (!cat) return null;
  return {
    empresaId,
    tipo: "salida",
    categoriaId: cat.id,
    montoUSD: pago.totalUsd,
    tasaBs: pago.tasa ?? tasaVigente,
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
  /** Tasa snapshot de la factura (conversión a USD del movimiento). */
  tasaBs: number;
  fecha: string; // ISO (fecha del cobro)
  clienteNombre: string;
}

/**
 * Entrada automática por cobro de una factura de venta. null si la empresa no
 * tiene categoría de sistema 'facturas' o la tasa snapshot es inválida.
 */
export function transaccionDeFactura(
  d: CobroFacturaDatos,
  categorias: CategoriaFinanciera[],
  empresaId: string
): NuevaTransaccion | null {
  const cat = categoriaSistema(categorias, empresaId, "facturas");
  if (!cat || d.tasaBs <= 0) return null;
  return {
    empresaId,
    tipo: "entrada",
    categoriaId: cat.id,
    montoUSD: round2(d.totalBs / d.tasaBs),
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
 * Salida automática por pago de una factura de compra, convertida a USD con
 * la tasa vigente (snapshot del momento del pago). null si tasa inválida.
 */
export function transaccionDeCompra(
  d: PagoCompraDatos,
  empresaId: string,
  tasaVigente: number
): NuevaTransaccion | null {
  if (tasaVigente <= 0) return null;
  return {
    empresaId,
    tipo: "salida",
    categoriaId: d.categoriaId,
    montoUSD: round2(d.totalBs / tasaVigente),
    tasaBs: tasaVigente,
    fecha: d.fecha,
    descripcion: `Pago Factura ${d.numeroFactura} — ${d.proveedorNombre}`,
    origen: "compra",
    referenciaId: d.id,
  };
}

/**
 * Movimientos espejo de una transferencia del Grupo: salida en la empresa
 * origen y entrada en la destino, solo para extremos con finanzas habilitadas
 * (con categoría de sistema 'transferencias'). Transferencias en Bs se
 * convierten a USD con la tasa snapshot del movimiento.
 */
export function espejosDeTransferencia(
  mov: MovimientoGrupo,
  categorias: CategoriaFinanciera[]
): NuevaTransaccion[] {
  const montoUSD = mov.moneda === "USD" ? mov.monto : round2(mov.monto / mov.tasaBs);
  const extremos: { key?: string; tipo: TipoTransaccion; descripcion: string }[] = [
    {
      key: mov.origenKey,
      tipo: "salida",
      descripcion: `Transferencia a ${mov.destinoNombre} — ${mov.descripcion}`,
    },
    {
      key: mov.destinoKey,
      tipo: "entrada",
      descripcion: `Transferencia desde ${mov.origenNombre} — ${mov.descripcion}`,
    },
  ];
  const out: NuevaTransaccion[] = [];
  for (const ex of extremos) {
    if (!ex.key) continue;
    const cat = categoriaSistema(categorias, ex.key, "transferencias");
    if (!cat) continue;
    out.push({
      empresaId: ex.key,
      tipo: ex.tipo,
      categoriaId: cat.id,
      montoUSD,
      tasaBs: mov.tasaBs,
      fecha: mov.fecha,
      descripcion: ex.descripcion,
      origen: "transferencia",
      referenciaId: mov.id,
    });
  }
  return out;
}
