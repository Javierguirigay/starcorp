"use client";

/**
 * Estado compartido de Inventario, Mantenimiento y Asignación de equipos
 * (Context + useReducer), montado en el layout de la app para sobrevivir a la
 * navegación. Fase mock: todo en memoria. Mantiene equipos (con ficha y
 * consumibles vinculados), el catálogo de consumibles con stock, los registros
 * de mantenimiento y las asignaciones. El estado de cada equipo no se guarda:
 * se deriva de órdenes y asignaciones (estadoDe).
 */
import { createContext, useContext, useMemo, useReducer } from "react";
import type { Asignacion, Consumible, Equipo, EstadoEquipo, RegistroMantenimiento } from "@/lib/types";
import { EQUIPOS, NEXT_EQUIPO_ID } from "@/lib/data/equipos";
import { CONSUMIBLES_SEED, NEXT_CONSUMIBLE_ID } from "@/lib/data/consumibles";
import { MANTENIMIENTOS, NEXT_MANTENIMIENTO_ID } from "@/lib/data/mantenimiento";
import { ASIGNACIONES, SIGUIENTE_ASIG } from "@/lib/data/asignaciones";
import { derivarEstadoEquipo } from "@/lib/negocio/inventario";

export type EquipoDatos = Omit<Equipo, "id">;
export type ConsumibleDatos = Omit<Consumible, "id">;
export type MantenimientoDatos = Omit<RegistroMantenimiento, "id">;
export type AsignacionDatos = Omit<Asignacion, "id">;

interface EstadoInventario {
  equipos: Equipo[];
  consumibles: Consumible[];
  mantenimientos: RegistroMantenimiento[];
  asignaciones: Asignacion[];
  nextEquipoId: number;
  nextConsumibleId: number;
  nextMantenimientoId: number;
  siguienteAsig: number;
}

type Accion =
  | { tipo: "crearEquipo"; datos: EquipoDatos }
  | { tipo: "editarEquipo"; id: number; datos: EquipoDatos }
  | { tipo: "eliminarEquipo"; id: number }
  | { tipo: "crearConsumible"; datos: ConsumibleDatos }
  | { tipo: "editarConsumible"; id: number; datos: ConsumibleDatos }
  | { tipo: "eliminarConsumible"; id: number }
  | { tipo: "ajustarStockConsumible"; id: number; delta: number }
  | { tipo: "crearMantenimiento"; datos: MantenimientoDatos }
  | { tipo: "editarMantenimiento"; id: number; datos: MantenimientoDatos }
  | { tipo: "eliminarMantenimiento"; id: number }
  | { tipo: "crearAsignaciones"; filas: AsignacionDatos[] }
  | { tipo: "finalizarAsignacion"; id: string; hasta: string; dias: number };

const ESTADO_INICIAL: EstadoInventario = {
  equipos: EQUIPOS,
  consumibles: CONSUMIBLES_SEED,
  mantenimientos: MANTENIMIENTOS,
  asignaciones: ASIGNACIONES,
  nextEquipoId: NEXT_EQUIPO_ID,
  nextConsumibleId: NEXT_CONSUMIBLE_ID,
  nextMantenimientoId: NEXT_MANTENIMIENTO_ID,
  siguienteAsig: SIGUIENTE_ASIG,
};

function reducer(estado: EstadoInventario, accion: Accion): EstadoInventario {
  switch (accion.tipo) {
    case "crearEquipo":
      return {
        ...estado,
        equipos: [...estado.equipos, { id: estado.nextEquipoId, ...accion.datos }],
        nextEquipoId: estado.nextEquipoId + 1,
      };
    case "editarEquipo":
      return {
        ...estado,
        equipos: estado.equipos.map((e) =>
          e.id === accion.id ? { id: e.id, ...accion.datos } : e
        ),
      };
    case "eliminarEquipo":
      return { ...estado, equipos: estado.equipos.filter((e) => e.id !== accion.id) };

    case "crearConsumible":
      return {
        ...estado,
        consumibles: [...estado.consumibles, { id: estado.nextConsumibleId, ...accion.datos }],
        nextConsumibleId: estado.nextConsumibleId + 1,
      };
    case "editarConsumible":
      return {
        ...estado,
        consumibles: estado.consumibles.map((c) =>
          c.id === accion.id ? { id: c.id, ...accion.datos } : c
        ),
      };
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
      return {
        ...estado,
        mantenimientos: [
          ...estado.mantenimientos,
          { id: estado.nextMantenimientoId, ...accion.datos },
        ],
        nextMantenimientoId: estado.nextMantenimientoId + 1,
      };
    case "editarMantenimiento":
      return {
        ...estado,
        mantenimientos: estado.mantenimientos.map((m) =>
          m.id === accion.id ? { id: m.id, ...accion.datos } : m
        ),
      };
    case "eliminarMantenimiento":
      return {
        ...estado,
        mantenimientos: estado.mantenimientos.filter((m) => m.id !== accion.id),
      };

    case "crearAsignaciones":
      // Batch de una orden: ids S-00x consecutivos desde el contador.
      return {
        ...estado,
        asignaciones: [
          ...estado.asignaciones,
          ...accion.filas.map((f, i) => ({
            id: "S-" + String(estado.siguienteAsig + 1 + i).padStart(3, "0"),
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
  }
}

interface InventarioContexto extends EstadoInventario {
  equipoPorId: (id: number) => Equipo | undefined;
  consumiblePorId: (id: number) => Consumible | undefined;
  /** Estado derivado del equipo (por código): taller > asignación > disponible. */
  estadoDe: (codigo: string) => EstadoEquipo;
  crearEquipo: (datos: EquipoDatos) => void;
  editarEquipo: (id: number, datos: EquipoDatos) => void;
  eliminarEquipo: (id: number) => void;
  crearConsumible: (datos: ConsumibleDatos) => void;
  editarConsumible: (id: number, datos: ConsumibleDatos) => void;
  eliminarConsumible: (id: number) => void;
  ajustarStockConsumible: (id: number, delta: number) => void;
  crearMantenimiento: (datos: MantenimientoDatos) => void;
  editarMantenimiento: (id: number, datos: MantenimientoDatos) => void;
  eliminarMantenimiento: (id: number) => void;
  crearAsignaciones: (filas: AsignacionDatos[]) => void;
  finalizarAsignacion: (id: string, hasta: string, dias: number) => void;
}

const Contexto = createContext<InventarioContexto | null>(null);

export function InventarioProvider({ children }: { children: React.ReactNode }) {
  const [estado, dispatch] = useReducer(reducer, ESTADO_INICIAL);

  const valor = useMemo<InventarioContexto>(
    () => ({
      ...estado,
      equipoPorId: (id) => estado.equipos.find((e) => e.id === id),
      consumiblePorId: (id) => estado.consumibles.find((c) => c.id === id),
      estadoDe: (codigo) =>
        derivarEstadoEquipo(codigo, estado.mantenimientos, estado.asignaciones),
      crearEquipo: (datos) => dispatch({ tipo: "crearEquipo", datos }),
      editarEquipo: (id, datos) => dispatch({ tipo: "editarEquipo", id, datos }),
      eliminarEquipo: (id) => dispatch({ tipo: "eliminarEquipo", id }),
      crearConsumible: (datos) => dispatch({ tipo: "crearConsumible", datos }),
      editarConsumible: (id, datos) => dispatch({ tipo: "editarConsumible", id, datos }),
      eliminarConsumible: (id) => dispatch({ tipo: "eliminarConsumible", id }),
      ajustarStockConsumible: (id, delta) =>
        dispatch({ tipo: "ajustarStockConsumible", id, delta }),
      crearMantenimiento: (datos) => dispatch({ tipo: "crearMantenimiento", datos }),
      editarMantenimiento: (id, datos) => dispatch({ tipo: "editarMantenimiento", id, datos }),
      eliminarMantenimiento: (id) => dispatch({ tipo: "eliminarMantenimiento", id }),
      crearAsignaciones: (filas) => dispatch({ tipo: "crearAsignaciones", filas }),
      finalizarAsignacion: (id, hasta, dias) =>
        dispatch({ tipo: "finalizarAsignacion", id, hasta, dias }),
    }),
    [estado]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useInventario(): InventarioContexto {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useInventario debe usarse dentro de <InventarioProvider>");
  return ctx;
}
