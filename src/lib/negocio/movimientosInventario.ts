/**
 * Movimientos de inventario (kardex): funciones puras que derivan, validan y
 * filtran los movimientos generados por las órdenes de entrega/compra y las
 * entradas manuales. El provider aplica la matemática; aquí no hay estado.
 * OJO: distinto de negocio/… de Finanzas (Movimiento = dinero entre empresas).
 */
import type {
  Consumible,
  Equipo,
  EstadoEquipo,
  MaterialMantenimiento,
  MovimientoInventario,
  Orden,
  RegistroMantenimiento,
  RenglonOrden,
  TipoMovInventario,
} from "../types";
import { normalizarTexto } from "../format";

export type MovimientoInventarioDatos = Omit<MovimientoInventario, "id" | "empresaId">;

export const ETIQUETA_MOV: Record<TipoMovInventario, string> = {
  entrada: "Entrada",
  salida: "Salida",
  salida_definitiva: "Salida definitiva",
  retorno: "Retorno",
  ajuste: "Ajuste",
};

export const REFERENCIA_MANUAL = "Manual";

/** Referencia legible de un mantenimiento en el kardex: "MTTO-0005". */
export function referenciaMantenimiento(id: number): string {
  return "MTTO-" + String(id).padStart(4, "0");
}

/** Delta que el movimiento aplica al stock del consumible: entradas y
    retornos suman, salidas restan; "ajuste" trae el delta con signo. */
export function deltaStock(m: Pick<MovimientoInventario, "tipo" | "cantidad">): number {
  switch (m.tipo) {
    case "entrada":
    case "retorno":
      return m.cantidad;
    case "salida":
    case "salida_definitiva":
      return -m.cantidad;
    case "ajuste":
      return m.cantidad;
  }
}

/** Consumo previo de un documento por consumible (para validar su edición
    como si no existiera: el stock actual ya tiene su descuento aplicado).
    `esPropio` identifica los movimientos del documento (por ordenId o
    mantenimientoId). */
function consumoPrevioPorConsumible(
  movimientos: MovimientoInventario[],
  esPropio: (m: MovimientoInventario) => boolean
): Map<number, number> {
  const consumo = new Map<number, number>();
  for (const m of movimientos) {
    if (!esPropio(m) || m.clase !== "consumible") continue;
    consumo.set(m.articuloId, (consumo.get(m.articuloId) ?? 0) - deltaStock(m));
  }
  return consumo;
}

/**
 * Errores de los renglones de una orden de entrega contra el inventario
 * (vacío = válida). Los renglones sin refInventario (texto libre) no se
 * validan. Al editar una orden ya aplicada se pasan sus movimientos previos
 * + ordenId para descontar su propio consumo del stock exigido.
 */
export function validarStockSalidas(
  renglones: RenglonOrden[],
  consumibles: Consumible[],
  equipos: Equipo[],
  estadoDe: (codigo: string) => EstadoEquipo,
  movimientosPrevios: MovimientoInventario[] = [],
  ordenId?: number
): string[] {
  const errores: string[] = [];
  const previo =
    ordenId !== undefined
      ? consumoPrevioPorConsumible(movimientosPrevios, (m) => m.ordenId === ordenId)
      : new Map<number, number>();

  // Consumibles: se agrega lo pedido por artículo (puede repetirse en renglones).
  const pedido = new Map<number, number>();
  for (const r of renglones) {
    if (r.refInventario?.clase !== "consumible") continue;
    pedido.set(r.refInventario.id, (pedido.get(r.refInventario.id) ?? 0) + r.cantidad);
  }
  for (const [id, cantidad] of pedido) {
    const c = consumibles.find((x) => x.id === id);
    if (!c) {
      errores.push("Un consumible del renglón ya no existe en el catálogo");
      continue;
    }
    const disponible = c.cantidad + (previo.get(id) ?? 0);
    if (cantidad > disponible)
      errores.push(`${c.nombre}: solicita ${cantidad}, hay ${disponible} ${c.unidad}`);
  }

  // Equipos: piezas únicas, disponibles y sin repetir en la orden.
  const vistos = new Set<number>();
  for (const r of renglones) {
    if (r.refInventario?.clase !== "equipo") continue;
    const e = equipos.find((x) => x.id === r.refInventario!.id);
    if (!e) {
      errores.push("Un equipo del renglón ya no existe en el inventario");
      continue;
    }
    if (vistos.has(e.id)) {
      errores.push(`${e.codigo}: repetido en la orden`);
      continue;
    }
    vistos.add(e.id);
    if (r.cantidad !== 1) errores.push(`${e.codigo}: los equipos salen de a 1 por renglón`);
    if (!r.refInventario.modoSalida)
      errores.push(`${e.codigo}: indica el modo de salida (temporal o definitiva)`);
    // Lo tomado por esta misma orden no bloquea su edición.
    const tomadoPorEstaOrden =
      ordenId !== undefined &&
      (e.baja?.ordenId === ordenId ||
        movimientosPrevios.some(
          (m) => m.ordenId === ordenId && m.clase === "equipo" && m.articuloId === e.id
        ));
    if (tomadoPorEstaOrden) continue;
    if (e.baja) {
      errores.push(`${e.codigo}: retirado del inventario (${e.baja.motivo})`);
    } else {
      const estado = estadoDe(e.codigo);
      if (estado !== "Disponible") errores.push(`${e.codigo}: no está disponible (${estado})`);
    }
  }

  return errores;
}

/** Movimientos (sin id) que produce una orden de entrega: uno por renglón
    vinculado. La ubicación registrada es la de ORIGEN del artículo. */
export function movimientosDeEntrega(
  orden: Orden,
  consumibles: Consumible[],
  equipos: Equipo[]
): MovimientoInventarioDatos[] {
  const movs: MovimientoInventarioDatos[] = [];
  for (const r of orden.renglones) {
    const ref = r.refInventario;
    if (!ref) continue;
    if (ref.clase === "consumible") {
      const c = consumibles.find((x) => x.id === ref.id);
      if (!c) continue;
      movs.push({
        fecha: orden.fecha,
        clase: "consumible",
        articuloId: c.id,
        articuloNombre: c.nombre,
        cantidad: r.cantidad,
        unidad: c.unidad,
        ubicacion: c.ubicacion,
        tipo: "salida",
        origen: "orden_entrega",
        ordenId: orden.id,
        referencia: orden.numero,
        ...(orden.locacion ? { nota: `Entregado en ${orden.locacion}` } : {}),
      });
    } else {
      const e = equipos.find((x) => x.id === ref.id);
      if (!e) continue;
      movs.push({
        fecha: orden.fecha,
        clase: "equipo",
        articuloId: e.id,
        articuloNombre: e.codigo,
        cantidad: 1,
        ubicacion: e.ubicacion,
        tipo: ref.modoSalida === "definitiva" ? "salida_definitiva" : "salida",
        origen: "orden_entrega",
        ordenId: orden.id,
        referencia: orden.numero,
        ...(orden.locacion ? { nota: `Entregado en ${orden.locacion}` } : {}),
      });
    }
  }
  return movs;
}

/** Movimientos (sin id) de la recepción de una orden de compra: una entrada
    por renglón vinculado a consumible, en la ubicación de recepción. */
export function movimientosDeRecepcion(
  orden: Orden,
  ubicacion: string,
  fecha: string,
  consumibles: Consumible[]
): MovimientoInventarioDatos[] {
  const movs: MovimientoInventarioDatos[] = [];
  for (const r of orden.renglones) {
    if (r.refInventario?.clase !== "consumible") continue;
    const c = consumibles.find((x) => x.id === r.refInventario!.id);
    if (!c) continue;
    movs.push({
      fecha,
      clase: "consumible",
      articuloId: c.id,
      articuloNombre: c.nombre,
      cantidad: r.cantidad,
      unidad: c.unidad,
      ubicacion,
      tipo: "entrada",
      origen: "orden_compra",
      ordenId: orden.id,
      referencia: orden.numero,
    });
  }
  return movs;
}

/**
 * Errores de los materiales de un mantenimiento contra el inventario (vacío =
 * válido para COMPLETAR). Solo valida filas vinculadas (texto libre no afecta
 * stock). Al editar un mantenimiento ya completado se pasan sus movimientos
 * previos + mantenimientoId para descontar su propio consumo del stock exigido.
 */
export function validarStockMateriales(
  materiales: MaterialMantenimiento[],
  consumibles: Consumible[],
  movimientosPrevios: MovimientoInventario[] = [],
  mantenimientoId?: number
): string[] {
  const errores: string[] = [];
  const previo =
    mantenimientoId !== undefined
      ? consumoPrevioPorConsumible(movimientosPrevios, (m) => m.mantenimientoId === mantenimientoId)
      : new Map<number, number>();

  // Se agrega lo pedido por consumible (puede repetirse en filas).
  const pedido = new Map<number, number>();
  for (const mat of materiales) {
    if (mat.consumibleId === undefined) continue;
    pedido.set(mat.consumibleId, (pedido.get(mat.consumibleId) ?? 0) + mat.cantidad);
  }
  for (const [id, cantidad] of pedido) {
    const c = consumibles.find((x) => x.id === id);
    if (!c) {
      errores.push(
        "Un material vinculado ya no existe en el catálogo: pásalo a texto libre para completar"
      );
      continue;
    }
    const disponible = c.cantidad + (previo.get(id) ?? 0);
    if (cantidad > disponible)
      errores.push(`${c.nombre}: solicita ${cantidad}, hay ${disponible} ${c.unidad}`);
  }
  return errores;
}

/** Movimientos (sin id) que produce COMPLETAR un mantenimiento: una salida
    por material vinculado (texto libre no genera movimiento). */
export function movimientosDeMantenimiento(
  registro: RegistroMantenimiento,
  consumibles: Consumible[]
): MovimientoInventarioDatos[] {
  const movs: MovimientoInventarioDatos[] = [];
  for (const mat of registro.materiales ?? []) {
    if (mat.consumibleId === undefined) continue;
    const c = consumibles.find((x) => x.id === mat.consumibleId);
    if (!c) continue;
    movs.push({
      fecha: registro.realizado || registro.programado,
      clase: "consumible",
      articuloId: c.id,
      articuloNombre: c.nombre,
      cantidad: mat.cantidad,
      unidad: c.unidad,
      ubicacion: c.ubicacion,
      tipo: "salida",
      origen: "mantenimiento",
      mantenimientoId: registro.id,
      referencia: referenciaMantenimiento(registro.id),
      nota: `Mantenimiento ${registro.tipo.toLowerCase()} de ${registro.equipo}`,
    });
  }
  return movs;
}

/**
 * Renglones para la Orden de Requerimiento prellenada desde un mantenimiento:
 * de los vinculados va SOLO el faltante (pedido − stock, omitiendo 0); los de
 * texto libre y los vinculados cuyo consumible ya no existe van completos.
 * Sin refInventario: el requerimiento es una solicitud de compra, texto libre.
 */
export function faltantesParaRequerimiento(
  materiales: MaterialMantenimiento[],
  consumibles: Consumible[]
): RenglonOrden[] {
  const renglones: RenglonOrden[] = [];
  const pedido = new Map<number, { cantidad: number; snapshot: MaterialMantenimiento }>();
  for (const mat of materiales) {
    if (mat.consumibleId === undefined) {
      if (mat.descripcion.trim() && mat.cantidad > 0)
        renglones.push({ cantidad: mat.cantidad, unidad: mat.unidad, descripcion: mat.descripcion });
      continue;
    }
    const previo = pedido.get(mat.consumibleId);
    pedido.set(mat.consumibleId, {
      cantidad: (previo?.cantidad ?? 0) + mat.cantidad,
      snapshot: mat,
    });
  }
  for (const [id, { cantidad, snapshot }] of pedido) {
    const c = consumibles.find((x) => x.id === id);
    if (!c) {
      renglones.push({ cantidad, unidad: snapshot.unidad, descripcion: snapshot.descripcion });
      continue;
    }
    const faltante = Math.max(0, cantidad - c.cantidad);
    if (faltante > 0)
      renglones.push({ cantidad: faltante, unidad: c.unidad, descripcion: c.nombre });
  }
  return renglones;
}

export interface FiltroKardex {
  tipo?: TipoMovInventario | "todos";
  /** Busca en nombre de artículo, referencia y nota (sin acentos ni mayúsculas). */
  texto?: string;
  desde?: string; // ISO
  hasta?: string; // ISO
}

export function filtrarMovimientos(
  movs: MovimientoInventario[],
  f: FiltroKardex
): MovimientoInventario[] {
  const texto = f.texto ? normalizarTexto(f.texto.trim()) : "";
  return movs.filter((m) => {
    if (f.tipo && f.tipo !== "todos" && m.tipo !== f.tipo) return false;
    if (f.desde && m.fecha < f.desde) return false;
    if (f.hasta && m.fecha > f.hasta) return false;
    if (texto) {
      const blob = normalizarTexto(`${m.articuloNombre} ${m.referencia} ${m.nota ?? ""}`);
      if (!blob.includes(texto)) return false;
    }
    return true;
  });
}
