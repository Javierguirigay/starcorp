"use client";

/**
 * Estado compartido de Inventario, Mantenimiento y Asignación de equipos
 * (Context + useReducer), montado en el layout de la app para sobrevivir a la
 * navegación. Fase mock: todo en memoria. Mantiene equipos (con ficha y
 * consumibles vinculados), el catálogo de consumibles con stock, el catálogo
 * de ubicaciones, el kardex de movimientos, los registros de mantenimiento y
 * las asignaciones. El estado de cada equipo no se guarda (salvo la baja):
 * se deriva de órdenes y asignaciones (estadoDe).
 *
 * Alcance del stock: es GLOBAL por consumible; `Consumible.ubicacion` es su
 * almacén principal. No hay stock multi-ubicación en esta fase, pero el kardex
 * registra la ubicación de cada movimiento.
 */
import { createContext, useContext, useMemo, useReducer } from "react";
import type {
  Asignacion,
  Consumible,
  Empresa,
  Equipo,
  EstadoEquipo,
  MovimientoInventario,
  Orden,
  RegistroMantenimiento,
  Ubicacion,
} from "@/lib/types";
import { EMPRESAS } from "@/lib/data/empresas";
import { EQUIPOS, NEXT_EQUIPO_ID } from "@/lib/data/equipos";
import { CONSUMIBLES_SEED, NEXT_CONSUMIBLE_ID } from "@/lib/data/consumibles";
import { MANTENIMIENTOS, NEXT_MANTENIMIENTO_ID } from "@/lib/data/mantenimiento";
import { ASIGNACIONES, SIGUIENTE_ASIG } from "@/lib/data/asignaciones";
import { UBICACIONES_SEED, NEXT_UBICACION_ID } from "@/lib/data/ubicaciones";
import { MOVIMIENTOS_INV_SEED, NEXT_MOV_INV_ID } from "@/lib/data/movimientosInventario";
import { derivarEstadoEquipo } from "@/lib/negocio/inventario";
import {
  deltaStock,
  movimientosDeEntrega,
  movimientosDeMantenimiento,
  movimientosDeRecepcion,
  REFERENCIA_MANUAL,
  type MovimientoInventarioDatos,
} from "@/lib/negocio/movimientosInventario";
import { fmtISO } from "@/lib/format";

// Los "Datos" que arma la UI no llevan empresaId: lo estampa el reducer con la
// empresa activa (o lo heredan de su entidad de origen).
export type EquipoDatos = Omit<Equipo, "id" | "empresaId">;
export type ConsumibleDatos = Omit<Consumible, "id" | "empresaId">;
export type MantenimientoDatos = Omit<RegistroMantenimiento, "id" | "empresaId">;
export type AsignacionDatos = Omit<Asignacion, "id" | "empresaId">;
export type UbicacionDatos = Omit<Ubicacion, "id" | "empresaId">;

/** Entrada manual de stock (o ajuste de conteo, con delta con signo). */
export interface EntradaConsumibleDatos {
  consumibleId: number;
  /** Unidades que entran; si esAjuste, delta con signo (±). */
  cantidad: number;
  ubicacion: string;
  fecha: string; // ISO
  nota?: string;
  esAjuste?: boolean;
}

/** Retorno de una salida temporal: finaliza la asignación y reingresa el equipo. */
export interface RetornoDatos {
  hasta: string; // ISO
  dias: number;
  /** Ubicación a la que regresa el equipo. */
  ubicacion: string;
  /** Número del documento de origen (ej. "OE-0003"); default "Manual". */
  referencia?: string;
}

interface EstadoInventario {
  equipos: Equipo[];
  consumibles: Consumible[];
  mantenimientos: RegistroMantenimiento[];
  asignaciones: Asignacion[];
  ubicaciones: Ubicacion[];
  movimientos: MovimientoInventario[];
  nextEquipoId: number;
  nextConsumibleId: number;
  nextMantenimientoId: number;
  siguienteAsig: number;
  nextUbicacionId: number;
  nextMovInvId: number;
}

type Accion =
  | { tipo: "crearEquipo"; empresaId: string; datos: EquipoDatos }
  | { tipo: "editarEquipo"; id: number; datos: EquipoDatos }
  | { tipo: "eliminarEquipo"; id: number }
  | { tipo: "crearConsumible"; empresaId: string; datos: ConsumibleDatos }
  | { tipo: "editarConsumible"; id: number; datos: ConsumibleDatos; fechaAjuste?: string }
  | { tipo: "eliminarConsumible"; id: number }
  | { tipo: "ajustarStockConsumible"; id: number; delta: number }
  | { tipo: "crearMantenimiento"; registro: RegistroMantenimiento }
  | { tipo: "editarMantenimiento"; id: number; datos: MantenimientoDatos }
  | { tipo: "eliminarMantenimiento"; id: number }
  | { tipo: "aplicarMantenimiento"; registro: RegistroMantenimiento }
  | { tipo: "revertirMantenimiento"; mantenimientoId: number }
  | { tipo: "crearAsignaciones"; empresaId: string; filas: AsignacionDatos[] }
  | { tipo: "finalizarAsignacion"; id: string; hasta: string; dias: number }
  | { tipo: "crearUbicacion"; empresaId: string; datos: UbicacionDatos }
  | { tipo: "editarUbicacion"; id: number; datos: UbicacionDatos }
  | { tipo: "eliminarUbicacion"; id: number }
  | { tipo: "registrarEntradaConsumible"; datos: EntradaConsumibleDatos }
  | { tipo: "aplicarOrdenEntrega"; orden: Orden }
  | { tipo: "aplicarRecepcionCompra"; orden: Orden; ubicacion: string; fecha: string }
  | { tipo: "revertirOrden"; ordenId: number }
  | { tipo: "registrarRetorno"; asignacionId: string; datos: RetornoDatos };

const ESTADO_INICIAL: EstadoInventario = {
  equipos: EQUIPOS,
  consumibles: CONSUMIBLES_SEED,
  mantenimientos: MANTENIMIENTOS,
  asignaciones: ASIGNACIONES,
  ubicaciones: UBICACIONES_SEED,
  movimientos: MOVIMIENTOS_INV_SEED,
  nextEquipoId: NEXT_EQUIPO_ID,
  nextConsumibleId: NEXT_CONSUMIBLE_ID,
  nextMantenimientoId: NEXT_MANTENIMIENTO_ID,
  siguienteAsig: SIGUIENTE_ASIG,
  nextUbicacionId: NEXT_UBICACION_ID,
  nextMovInvId: NEXT_MOV_INV_ID,
};

/** Anexa movimientos (sin id) al kardex asignando ids consecutivos. */
function conMovimientos(
  estado: EstadoInventario,
  movs: MovimientoInventarioDatos[],
  empresaId: string
): Pick<EstadoInventario, "movimientos" | "nextMovInvId"> {
  return {
    movimientos: [
      ...estado.movimientos,
      ...movs.map((m, i) => ({ id: estado.nextMovInvId + i, empresaId, ...m })),
    ],
    nextMovInvId: estado.nextMovInvId + movs.length,
  };
}

function reducer(estado: EstadoInventario, accion: Accion): EstadoInventario {
  switch (accion.tipo) {
    case "crearEquipo":
      return {
        ...estado,
        equipos: [
          ...estado.equipos,
          { id: estado.nextEquipoId, empresaId: accion.empresaId, ...accion.datos },
        ],
        nextEquipoId: estado.nextEquipoId + 1,
      };
    case "editarEquipo":
      return {
        ...estado,
        equipos: estado.equipos.map((e) =>
          // La baja (si existe) se conserva: el formulario de edición no la maneja.
          e.id === accion.id
            ? { id: e.id, empresaId: e.empresaId, ...accion.datos, ...(e.baja ? { baja: e.baja } : {}) }
            : e
        ),
      };
    case "eliminarEquipo":
      return { ...estado, equipos: estado.equipos.filter((e) => e.id !== accion.id) };

    case "crearConsumible":
      return {
        ...estado,
        consumibles: [
          ...estado.consumibles,
          { id: estado.nextConsumibleId, empresaId: accion.empresaId, ...accion.datos },
        ],
        nextConsumibleId: estado.nextConsumibleId + 1,
      };
    case "editarConsumible": {
      const actual = estado.consumibles.find((c) => c.id === accion.id);
      if (!actual) return estado;
      // Si la edición cambia la cantidad, el kardex registra un ajuste con la
      // diferencia para no perder la pista del stock.
      const diff = accion.datos.cantidad - actual.cantidad;
      const ajuste =
        diff !== 0 && accion.fechaAjuste
          ? conMovimientos(estado, [
              {
                fecha: accion.fechaAjuste,
                clase: "consumible",
                articuloId: actual.id,
                articuloNombre: accion.datos.nombre,
                cantidad: diff,
                unidad: accion.datos.unidad,
                ubicacion: accion.datos.ubicacion,
                tipo: "ajuste",
                origen: "manual",
                referencia: REFERENCIA_MANUAL,
                nota: "Edición de consumible",
              },
            ], actual.empresaId)
          : {};
      return {
        ...estado,
        ...ajuste,
        consumibles: estado.consumibles.map((c) =>
          c.id === accion.id ? { id: c.id, empresaId: c.empresaId, ...accion.datos } : c
        ),
      };
    }
    case "eliminarConsumible":
      return {
        ...estado,
        consumibles: estado.consumibles.filter((c) => c.id !== accion.id),
        // Se limpian las referencias en los equipos que lo usaban.
        equipos: estado.equipos.map((e) =>
          e.consumibles?.some((x) => x.consumibleId === accion.id)
            ? { ...e, consumibles: e.consumibles.filter((x) => x.consumibleId !== accion.id) }
            : e
        ),
      };
    case "ajustarStockConsumible":
      return {
        ...estado,
        consumibles: estado.consumibles.map((c) =>
          c.id === accion.id ? { ...c, cantidad: Math.max(0, c.cantidad + accion.delta) } : c
        ),
      };

    case "crearMantenimiento":
      // El registro llega completo (id calculado en el provider, para poder
      // retornarlo al llamador y aplicarlo al inventario si nace Completado).
      return {
        ...estado,
        mantenimientos: [...estado.mantenimientos, accion.registro],
        nextMantenimientoId: Math.max(estado.nextMantenimientoId, accion.registro.id) + 1,
      };
    case "editarMantenimiento":
      return {
        ...estado,
        mantenimientos: estado.mantenimientos.map((m) =>
          m.id === accion.id ? { id: m.id, empresaId: m.empresaId, ...accion.datos } : m
        ),
      };
    case "eliminarMantenimiento":
      return {
        ...estado,
        mantenimientos: estado.mantenimientos.filter((m) => m.id !== accion.id),
      };

    case "aplicarMantenimiento": {
      const registro = accion.registro;
      // Solo un mantenimiento Completado consume materiales; guard anti doble
      // descuento por mantenimientoId (mismo patrón que las órdenes).
      if (registro.estado !== "Completado") return estado;
      if (estado.movimientos.some((m) => m.mantenimientoId === registro.id)) return estado;
      const movs = movimientosDeMantenimiento(registro, estado.consumibles);
      if (!movs.length) return estado;
      const descuento = new Map<number, number>();
      for (const m of movs)
        descuento.set(m.articuloId, (descuento.get(m.articuloId) ?? 0) + m.cantidad);
      return {
        ...estado,
        consumibles: estado.consumibles.map((c) =>
          descuento.has(c.id)
            ? { ...c, cantidad: Math.max(0, c.cantidad - descuento.get(c.id)!) }
            : c
        ),
        ...conMovimientos(estado, movs, registro.empresaId),
      };
    }

    case "revertirMantenimiento": {
      // Reversión por borrado, como revertirOrden: invierte el descuento de
      // cada movimiento del mantenimiento y los elimina del kardex.
      const movsMtto = estado.movimientos.filter(
        (m) => m.mantenimientoId === accion.mantenimientoId
      );
      if (!movsMtto.length) return estado;
      let consumibles = estado.consumibles;
      for (const m of movsMtto) {
        if (m.clase !== "consumible") continue;
        consumibles = consumibles.map((c) =>
          c.id === m.articuloId ? { ...c, cantidad: Math.max(0, c.cantidad - deltaStock(m)) } : c
        );
      }
      return {
        ...estado,
        consumibles,
        movimientos: estado.movimientos.filter(
          (m) => m.mantenimientoId !== accion.mantenimientoId
        ),
      };
    }

    case "crearAsignaciones":
      // Batch de una orden: ids S-00x consecutivos desde el contador.
      return {
        ...estado,
        asignaciones: [
          ...estado.asignaciones,
          ...accion.filas.map((f, i) => ({
            id: "S-" + String(estado.siguienteAsig + 1 + i).padStart(3, "0"),
            empresaId: accion.empresaId,
            ...f,
          })),
        ],
        siguienteAsig: estado.siguienteAsig + accion.filas.length,
      };
    case "finalizarAsignacion":
      // Al finalizar se fija la fecha "hasta" y los días del servicio; los
      // equipos quedan libres solos (estado derivado).
      return {
        ...estado,
        asignaciones: estado.asignaciones.map((a) =>
          a.id === accion.id
            ? { ...a, estado: "Finalizado", hasta: accion.hasta, dias: accion.dias }
            : a
        ),
      };

    case "crearUbicacion":
      return {
        ...estado,
        ubicaciones: [
          ...estado.ubicaciones,
          { id: estado.nextUbicacionId, empresaId: accion.empresaId, ...accion.datos },
        ],
        nextUbicacionId: estado.nextUbicacionId + 1,
      };
    case "editarUbicacion": {
      const actual = estado.ubicaciones.find((u) => u.id === accion.id);
      if (!actual) return estado;
      const renombrada = actual.nombre !== accion.datos.nombre;
      return {
        ...estado,
        ubicaciones: estado.ubicaciones.map((u) =>
          u.id === accion.id ? { id: u.id, empresaId: u.empresaId, ...accion.datos } : u
        ),
        // El rename cascada sobre el estado actual (no sobre el kardex, que es
        // historial y conserva el nombre vigente al momento del movimiento).
        ...(renombrada
          ? {
              consumibles: estado.consumibles.map((c) =>
                c.ubicacion === actual.nombre ? { ...c, ubicacion: accion.datos.nombre } : c
              ),
              equipos: estado.equipos.map((e) =>
                e.ubicacion === actual.nombre ? { ...e, ubicacion: accion.datos.nombre } : e
              ),
            }
          : {}),
      };
    }
    case "eliminarUbicacion": {
      const u = estado.ubicaciones.find((x) => x.id === accion.id);
      if (!u) return estado;
      // En uso: no se elimina (la UI ofrece desactivarla en su lugar).
      const enUso =
        estado.consumibles.some((c) => c.ubicacion === u.nombre) ||
        estado.equipos.some((e) => e.ubicacion === u.nombre);
      if (enUso) return estado;
      return { ...estado, ubicaciones: estado.ubicaciones.filter((x) => x.id !== accion.id) };
    }

    case "registrarEntradaConsumible": {
      const d = accion.datos;
      const c = estado.consumibles.find((x) => x.id === d.consumibleId);
      if (!c || d.cantidad === 0) return estado;
      return {
        ...estado,
        consumibles: estado.consumibles.map((x) =>
          x.id === c.id ? { ...x, cantidad: Math.max(0, x.cantidad + d.cantidad) } : x
        ),
        ...conMovimientos(estado, [
          {
            fecha: d.fecha,
            clase: "consumible",
            articuloId: c.id,
            articuloNombre: c.nombre,
            cantidad: d.cantidad,
            unidad: c.unidad,
            ubicacion: d.ubicacion,
            tipo: d.esAjuste ? "ajuste" : "entrada",
            origen: "manual",
            referencia: REFERENCIA_MANUAL,
            ...(d.nota ? { nota: d.nota } : {}),
          },
        ], c.empresaId),
      };
    }

    case "aplicarOrdenEntrega": {
      const orden = accion.orden;
      // Guard anti doble descuento: si la orden ya generó movimientos, no-op.
      if (estado.movimientos.some((m) => m.ordenId === orden.id)) return estado;
      const movs = movimientosDeEntrega(orden, estado.consumibles, estado.equipos);
      if (!movs.length) return estado;

      // Descuento de stock por consumible (puede repetirse en renglones).
      const descuento = new Map<number, number>();
      for (const m of movs)
        if (m.clase === "consumible")
          descuento.set(m.articuloId, (descuento.get(m.articuloId) ?? 0) + m.cantidad);

      // Equipos: temporal → asignación activa + traslado; definitiva → baja.
      const nuevasAsig: Asignacion[] = [];
      let equipos = estado.equipos;
      let nAsig = estado.siguienteAsig;
      for (const r of orden.renglones) {
        const ref = r.refInventario;
        if (ref?.clase !== "equipo") continue;
        const e = equipos.find((x) => x.id === ref.id);
        if (!e) continue;
        if (ref.modoSalida === "definitiva") {
          equipos = equipos.map((x) =>
            x.id === e.id
              ? {
                  ...x,
                  baja: {
                    fecha: orden.fecha,
                    motivo: "venta" as const,
                    referencia: orden.numero,
                    ordenId: orden.id,
                  },
                }
              : x
          );
        } else {
          nAsig += 1;
          nuevasAsig.push({
            id: "S-" + String(nAsig).padStart(3, "0"),
            empresaId: orden.empresaId,
            cliente: orden.contraparteNombre,
            equipos: [e.codigo],
            desde: orden.fecha,
            hasta: "",
            dias: 0,
            estado: "Activo",
            observaciones: `Salida por ${orden.numero}`,
            ordenId: orden.id,
          });
          if (orden.locacion)
            equipos = equipos.map((x) =>
              x.id === e.id ? { ...x, ubicacion: orden.locacion! } : x
            );
        }
      }

      return {
        ...estado,
        consumibles: estado.consumibles.map((c) =>
          descuento.has(c.id)
            ? { ...c, cantidad: Math.max(0, c.cantidad - descuento.get(c.id)!) }
            : c
        ),
        equipos,
        asignaciones: [...estado.asignaciones, ...nuevasAsig],
        siguienteAsig: nAsig,
        ...conMovimientos(estado, movs, orden.empresaId),
      };
    }

    case "aplicarRecepcionCompra": {
      const { orden, ubicacion, fecha } = accion;
      if (estado.movimientos.some((m) => m.ordenId === orden.id)) return estado;
      const movs = movimientosDeRecepcion(orden, ubicacion, fecha, estado.consumibles);
      if (!movs.length) return estado;
      const entrada = new Map<number, number>();
      for (const m of movs)
        entrada.set(m.articuloId, (entrada.get(m.articuloId) ?? 0) + m.cantidad);
      return {
        ...estado,
        consumibles: estado.consumibles.map((c) =>
          entrada.has(c.id) ? { ...c, cantidad: c.cantidad + entrada.get(c.id)! } : c
        ),
        ...conMovimientos(estado, movs, orden.empresaId),
      };
    }

    case "revertirOrden": {
      // Reversión por borrado (no contraasiento): invierte el efecto de cada
      // movimiento de la orden y los elimina del kardex.
      const movsOrden = estado.movimientos.filter((m) => m.ordenId === accion.ordenId);
      if (!movsOrden.length) return estado;

      let consumibles = estado.consumibles;
      let equipos = estado.equipos;
      for (const m of movsOrden) {
        if (m.clase === "consumible") {
          consumibles = consumibles.map((c) =>
            c.id === m.articuloId
              ? { ...c, cantidad: Math.max(0, c.cantidad - deltaStock(m)) }
              : c
          );
        } else if (m.tipo === "salida_definitiva") {
          equipos = equipos.map((e) =>
            e.id === m.articuloId && e.baja?.ordenId === accion.ordenId
              ? { ...e, baja: undefined }
              : e
          );
        } else if (m.tipo === "salida") {
          // El movimiento guardó la ubicación de ORIGEN: el equipo regresa a ella.
          equipos = equipos.map((e) =>
            e.id === m.articuloId ? { ...e, ubicacion: m.ubicacion } : e
          );
        }
      }

      return {
        ...estado,
        consumibles,
        equipos,
        asignaciones: estado.asignaciones.filter((a) => a.ordenId !== accion.ordenId),
        movimientos: estado.movimientos.filter((m) => m.ordenId !== accion.ordenId),
      };
    }

    case "registrarRetorno": {
      const a = estado.asignaciones.find((x) => x.id === accion.asignacionId);
      if (!a || a.estado !== "Activo") return estado;
      const d = accion.datos;
      const movs: MovimientoInventarioDatos[] = [];
      for (const codigo of a.equipos) {
        const e = estado.equipos.find((x) => x.codigo === codigo && x.empresaId === a.empresaId);
        if (!e) continue;
        movs.push({
          fecha: d.hasta,
          clase: "equipo",
          articuloId: e.id,
          articuloNombre: e.codigo,
          cantidad: 1,
          ubicacion: d.ubicacion,
          tipo: "retorno",
          origen: a.ordenId !== undefined ? "orden_entrega" : "manual",
          ...(a.ordenId !== undefined ? { ordenId: a.ordenId } : {}),
          referencia: d.referencia ?? REFERENCIA_MANUAL,
        });
      }
      return {
        ...estado,
        asignaciones: estado.asignaciones.map((x) =>
          x.id === a.id ? { ...x, estado: "Finalizado", hasta: d.hasta, dias: d.dias } : x
        ),
        equipos: estado.equipos.map((e) =>
          a.equipos.includes(e.codigo) && e.empresaId === a.empresaId
            ? { ...e, ubicacion: d.ubicacion }
            : e
        ),
        ...conMovimientos(estado, movs, a.empresaId),
      };
    }
  }
}

interface InventarioContexto extends EstadoInventario {
  equipoPorId: (id: number) => Equipo | undefined;
  consumiblePorId: (id: number) => Consumible | undefined;
  /** Estado derivado del equipo (por código): baja > taller > asignación > disponible. */
  estadoDe: (codigo: string) => EstadoEquipo;
  crearEquipo: (datos: EquipoDatos) => void;
  editarEquipo: (id: number, datos: EquipoDatos) => void;
  eliminarEquipo: (id: number) => void;
  crearConsumible: (datos: ConsumibleDatos) => void;
  editarConsumible: (id: number, datos: ConsumibleDatos) => void;
  eliminarConsumible: (id: number) => void;
  ajustarStockConsumible: (id: number, delta: number) => void;
  /** Crea el mantenimiento y lo RETORNA (con id): permite aplicarlo al
      inventario si nace Completado (mismo patrón que crearOrden). */
  crearMantenimiento: (datos: MantenimientoDatos) => RegistroMantenimiento;
  editarMantenimiento: (id: number, datos: MantenimientoDatos) => void;
  eliminarMantenimiento: (id: number) => void;
  /** Descuenta los materiales vinculados de un mantenimiento Completado
      (idempotente: no-op si ya generó movimientos o no está Completado). */
  aplicarMantenimiento: (registro: RegistroMantenimiento) => void;
  /** Invierte y elimina los movimientos de un mantenimiento (editar/eliminar). */
  revertirMantenimiento: (mantenimientoId: number) => void;
  crearAsignaciones: (filas: AsignacionDatos[]) => void;
  finalizarAsignacion: (id: string, hasta: string, dias: number) => void;
  crearUbicacion: (datos: UbicacionDatos) => void;
  editarUbicacion: (id: number, datos: UbicacionDatos) => void;
  /** No-op si la ubicación está en uso por consumibles/equipos. */
  eliminarUbicacion: (id: number) => void;
  registrarEntradaConsumible: (datos: EntradaConsumibleDatos) => void;
  /** Aplica los descuentos/asignaciones/bajas de una orden de entrega
      (idempotente: no-op si la orden ya generó movimientos). */
  aplicarOrdenEntrega: (orden: Orden) => void;
  /** Suma el stock de los renglones vinculados de una orden de compra recibida. */
  aplicarRecepcionCompra: (orden: Orden, ubicacion: string, fecha: string) => void;
  /** Invierte y elimina los movimientos de una orden (editar/eliminar documento). */
  revertirOrden: (ordenId: number) => void;
  /** Finaliza una asignación de salida temporal reingresando el equipo. */
  registrarRetorno: (asignacionId: string, datos: RetornoDatos) => void;
}

/* El provider (montado en el layout) guarda el inventario de TODAS las empresas;
   el scope por empresa lo aplica `useInventario()` leyendo la empresa activa de
   EmpresaContexto. Así los consumidores (tabs de Inventario, Órdenes,
   Mantenimiento, Asignación) reciben las colecciones ya filtradas y las acciones
   con empresaId inyectado, sin cambiar. */
interface RawInventario {
  estado: EstadoInventario;
  dispatch: (accion: Accion) => void;
}

const RawContexto = createContext<RawInventario | null>(null);

/* Empresa activa del inventario. Por defecto LOTER: Mantenimiento y Asignación
   (solo LOTER) no envuelven scope y siguen viendo LOTER, como hoy. */
const EMPRESA_LOTER = EMPRESAS.find((e) => e.key === "loter")!;
const EmpresaContexto = createContext<Empresa>(EMPRESA_LOTER);

/** Fija la empresa activa del inventario para el subárbol (lo usan la página de
    Inventario y Gestión de Órdenes, que integra el stock de su empresa). */
export function InventarioEmpresaScope({
  empresa,
  children,
}: {
  empresa: Empresa;
  children: React.ReactNode;
}) {
  return <EmpresaContexto.Provider value={empresa}>{children}</EmpresaContexto.Provider>;
}

export function InventarioProvider({ children }: { children: React.ReactNode }) {
  const [estado, dispatch] = useReducer(reducer, ESTADO_INICIAL);
  const raw = useMemo<RawInventario>(() => ({ estado, dispatch }), [estado]);
  return <RawContexto.Provider value={raw}>{children}</RawContexto.Provider>;
}

export function useInventario(): InventarioContexto {
  const raw = useContext(RawContexto);
  if (!raw) throw new Error("useInventario debe usarse dentro de <InventarioProvider>");
  const empresa = useContext(EmpresaContexto);
  const { estado, dispatch } = raw;

  return useMemo<InventarioContexto>(() => {
    const eid = empresa.key;
    const equipos = estado.equipos.filter((e) => e.empresaId === eid);
    const consumibles = estado.consumibles.filter((c) => c.empresaId === eid);
    const mantenimientos = estado.mantenimientos.filter((m) => m.empresaId === eid);
    const asignaciones = estado.asignaciones.filter((a) => a.empresaId === eid);
    const ubicaciones = estado.ubicaciones.filter((u) => u.empresaId === eid);
    const movimientos = estado.movimientos.filter((m) => m.empresaId === eid);

    return {
      equipos,
      consumibles,
      mantenimientos,
      asignaciones,
      ubicaciones,
      movimientos,
      nextEquipoId: estado.nextEquipoId,
      nextConsumibleId: estado.nextConsumibleId,
      nextMantenimientoId: estado.nextMantenimientoId,
      siguienteAsig: estado.siguienteAsig,
      nextUbicacionId: estado.nextUbicacionId,
      nextMovInvId: estado.nextMovInvId,
      // Búsquedas dentro del scope (código puede repetirse entre empresas).
      equipoPorId: (id) => equipos.find((e) => e.id === id),
      consumiblePorId: (id) => consumibles.find((c) => c.id === id),
      estadoDe: (codigo) =>
        derivarEstadoEquipo(
          equipos.find((e) => e.codigo === codigo) ?? { codigo },
          mantenimientos,
          asignaciones
        ),
      crearEquipo: (datos) => dispatch({ tipo: "crearEquipo", empresaId: eid, datos }),
      editarEquipo: (id, datos) => dispatch({ tipo: "editarEquipo", id, datos }),
      eliminarEquipo: (id) => dispatch({ tipo: "eliminarEquipo", id }),
      crearConsumible: (datos) => dispatch({ tipo: "crearConsumible", empresaId: eid, datos }),
      editarConsumible: (id, datos) =>
        dispatch({ tipo: "editarConsumible", id, datos, fechaAjuste: fmtISO(new Date()) }),
      eliminarConsumible: (id) => dispatch({ tipo: "eliminarConsumible", id }),
      ajustarStockConsumible: (id, delta) =>
        dispatch({ tipo: "ajustarStockConsumible", id, delta }),
      crearMantenimiento: (datos) => {
        // id determinista sobre el estado actual (un alta por tick).
        const registro: RegistroMantenimiento = {
          id: estado.nextMantenimientoId,
          empresaId: eid,
          ...datos,
        };
        dispatch({ tipo: "crearMantenimiento", registro });
        return registro;
      },
      editarMantenimiento: (id, datos) => dispatch({ tipo: "editarMantenimiento", id, datos }),
      eliminarMantenimiento: (id) => dispatch({ tipo: "eliminarMantenimiento", id }),
      aplicarMantenimiento: (registro) => dispatch({ tipo: "aplicarMantenimiento", registro }),
      revertirMantenimiento: (mantenimientoId) =>
        dispatch({ tipo: "revertirMantenimiento", mantenimientoId }),
      crearAsignaciones: (filas) => dispatch({ tipo: "crearAsignaciones", empresaId: eid, filas }),
      finalizarAsignacion: (id, hasta, dias) =>
        dispatch({ tipo: "finalizarAsignacion", id, hasta, dias }),
      crearUbicacion: (datos) => dispatch({ tipo: "crearUbicacion", empresaId: eid, datos }),
      editarUbicacion: (id, datos) => dispatch({ tipo: "editarUbicacion", id, datos }),
      eliminarUbicacion: (id) => dispatch({ tipo: "eliminarUbicacion", id }),
      registrarEntradaConsumible: (datos) =>
        dispatch({ tipo: "registrarEntradaConsumible", datos }),
      aplicarOrdenEntrega: (orden) => dispatch({ tipo: "aplicarOrdenEntrega", orden }),
      aplicarRecepcionCompra: (orden, ubicacion, fecha) =>
        dispatch({ tipo: "aplicarRecepcionCompra", orden, ubicacion, fecha }),
      revertirOrden: (ordenId) => dispatch({ tipo: "revertirOrden", ordenId }),
      registrarRetorno: (asignacionId, datos) =>
        dispatch({ tipo: "registrarRetorno", asignacionId, datos }),
    };
  }, [estado, dispatch, empresa]);
}
