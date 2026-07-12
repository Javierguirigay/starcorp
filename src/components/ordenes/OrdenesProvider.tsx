"use client";

/**
 * Estado compartido de las Órdenes (compra, entrega y requerimiento), montado
 * en el layout de la app para sobrevivir a la navegación entre sus pestañas.
 * Fase mock: todo en memoria, mismo patrón que FacturacionProvider.
 * El número correlativo (OC/OE/OR-0001) se asigna al crear, en el reducer, para
 * que dos altas seguidas no se pisen.
 */
import { createContext, useContext, useMemo, useReducer } from "react";
import type { Orden, TipoOrden } from "@/lib/types";
import { NEXT_ORDEN_ID, ORDENES_SEED } from "@/lib/data/ordenes";
import { siguienteNumeroOrden } from "@/lib/negocio/ordenes";

/** Datos del formulario: el id y el número los pone el reducer. */
export type OrdenDatos = Omit<Orden, "id" | "numero">;

interface EstadoOrdenes {
  ordenes: Orden[];
  nextOrdenId: number;
}

type AccionOrdenes =
  | { tipo: "crearOrden"; datos: OrdenDatos }
  | { tipo: "editarOrden"; id: number; datos: OrdenDatos }
  | { tipo: "eliminarOrden"; id: number };

const ESTADO_INICIAL: EstadoOrdenes = {
  ordenes: ORDENES_SEED,
  nextOrdenId: NEXT_ORDEN_ID,
};

function reducer(estado: EstadoOrdenes, accion: AccionOrdenes): EstadoOrdenes {
  switch (accion.tipo) {
    case "crearOrden":
      return {
        ...estado,
        ordenes: [
          ...estado.ordenes,
          {
            id: estado.nextOrdenId,
            numero: siguienteNumeroOrden(accion.datos.tipo, estado.ordenes),
            ...accion.datos,
          },
        ],
        nextOrdenId: estado.nextOrdenId + 1,
      };

    case "editarOrden":
      // Conserva número y tipo (el correlativo ya está emitido).
      return {
        ...estado,
        ordenes: estado.ordenes.map((o) =>
          o.id === accion.id ? { ...o, ...accion.datos, numero: o.numero, tipo: o.tipo } : o
        ),
      };

    case "eliminarOrden":
      return { ...estado, ordenes: estado.ordenes.filter((o) => o.id !== accion.id) };
  }
}

interface OrdenesContexto {
  ordenes: Orden[];
  ordenesDe: (tipo: TipoOrden) => Orden[];
  crearOrden: (datos: OrdenDatos) => void;
  editarOrden: (id: number, datos: OrdenDatos) => void;
  eliminarOrden: (id: number) => void;
}

const Contexto = createContext<OrdenesContexto | null>(null);

export function OrdenesProvider({ children }: { children: React.ReactNode }) {
  const [estado, dispatch] = useReducer(reducer, ESTADO_INICIAL);

  const valor = useMemo<OrdenesContexto>(
    () => ({
      ordenes: estado.ordenes,
      // Lo último creado arriba.
      ordenesDe: (tipo) =>
        estado.ordenes.filter((o) => o.tipo === tipo).sort((a, b) => b.id - a.id),
      crearOrden: (datos) => dispatch({ tipo: "crearOrden", datos }),
      editarOrden: (id, datos) => dispatch({ tipo: "editarOrden", id, datos }),
      eliminarOrden: (id) => dispatch({ tipo: "eliminarOrden", id }),
    }),
    [estado]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useOrdenes(): OrdenesContexto {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useOrdenes debe usarse dentro de <OrdenesProvider>");
  return ctx;
}
