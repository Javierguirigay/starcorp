"use client";

/**
 * Estado compartido de las Órdenes (compra, entrega y requerimiento), montado
 * en el layout de la app para sobrevivir a la navegación entre sus pestañas.
 * Fase mock: todo en memoria, mismo patrón que FacturacionProvider — el
 * provider guarda TODAS las empresas y `useOrdenes()` se scopea a la empresa
 * activa (default LOTER) leyendo OrdenesEmpresaScope; así los consumidores
 * reciben las órdenes ya filtradas y `crearOrden` estampa el empresaId.
 * El número correlativo (OC/OE/OR-0001) se asigna por empresa al crear.
 */
import { createContext, useContext, useMemo, useReducer } from "react";
import type { Empresa, Orden, TipoOrden } from "@/lib/types";
import { NEXT_ORDEN_ID, ORDENES_SEED } from "@/lib/data/ordenes";
import { EMPRESAS } from "@/lib/data/empresas";
import { siguienteNumeroOrden } from "@/lib/negocio/ordenes";

/** Datos del formulario: el id, el número y el empresaId los pone el provider. */
export type OrdenDatos = Omit<Orden, "id" | "numero" | "empresaId">;

interface EstadoOrdenes {
  ordenes: Orden[];
  nextOrdenId: number;
}

type AccionOrdenes =
  | { tipo: "crearOrden"; orden: Orden }
  | { tipo: "editarOrden"; id: number; datos: OrdenDatos }
  | { tipo: "eliminarOrden"; id: number }
  | { tipo: "marcarCompraRecibida"; id: number; fecha: string; ubicacion: string }
  | { tipo: "revertirRecepcionCompra"; id: number };

const ESTADO_INICIAL: EstadoOrdenes = {
  ordenes: ORDENES_SEED,
  nextOrdenId: NEXT_ORDEN_ID,
};

function reducer(estado: EstadoOrdenes, accion: AccionOrdenes): EstadoOrdenes {
  switch (accion.tipo) {
    case "crearOrden":
      // La orden llega completa (id/número/empresaId calculados en el provider,
      // para poder retornarla al llamador y estampar la referencia en el kardex).
      return {
        ...estado,
        ordenes: [...estado.ordenes, accion.orden],
        nextOrdenId: Math.max(estado.nextOrdenId, accion.orden.id) + 1,
      };

    case "editarOrden":
      // Conserva número, tipo y empresaId (el correlativo ya está emitido).
      return {
        ...estado,
        ordenes: estado.ordenes.map((o) =>
          o.id === accion.id ? { ...o, ...accion.datos, numero: o.numero, tipo: o.tipo } : o
        ),
      };

    case "eliminarOrden":
      return { ...estado, ordenes: estado.ordenes.filter((o) => o.id !== accion.id) };

    case "marcarCompraRecibida":
      return {
        ...estado,
        ordenes: estado.ordenes.map((o) =>
          o.id === accion.id && o.tipo === "compra"
            ? {
                ...o,
                estado: "recibida",
                recibidaEn: accion.fecha,
                ubicacionRecepcion: accion.ubicacion,
              }
            : o
        ),
      };

    case "revertirRecepcionCompra":
      return {
        ...estado,
        ordenes: estado.ordenes.map((o) =>
          o.id === accion.id
            ? { ...o, estado: "pendiente", recibidaEn: undefined, ubicacionRecepcion: undefined }
            : o
        ),
      };
  }
}

interface OrdenesContexto {
  /** Empresa activa cuyo scope refleja este contexto. */
  empresa: Empresa;
  ordenes: Orden[];
  ordenesDe: (tipo: TipoOrden) => Orden[];
  /** Crea la orden y la RETORNA (con id, número y empresaId): permite al
      llamador aplicarla al inventario estampando ordenId/referencia en el kardex. */
  crearOrden: (datos: OrdenDatos) => Orden;
  editarOrden: (id: number, datos: OrdenDatos) => void;
  eliminarOrden: (id: number) => void;
  marcarCompraRecibida: (id: number, fecha: string, ubicacion: string) => void;
  revertirRecepcionCompra: (id: number) => void;
}

interface RawOrdenes {
  estado: EstadoOrdenes;
  dispatch: (accion: AccionOrdenes) => void;
}

const RawContexto = createContext<RawOrdenes | null>(null);

const EMPRESA_LOTER = EMPRESAS.find((e) => e.key === "loter")!;
const EmpresaContexto = createContext<Empresa>(EMPRESA_LOTER);

/** Fija la empresa activa para el subárbol (lo usa GestionOrdenesModule). */
export function OrdenesEmpresaScope({
  empresa,
  children,
}: {
  empresa: Empresa;
  children: React.ReactNode;
}) {
  return <EmpresaContexto.Provider value={empresa}>{children}</EmpresaContexto.Provider>;
}

export function OrdenesProvider({ children }: { children: React.ReactNode }) {
  const [estado, dispatch] = useReducer(reducer, ESTADO_INICIAL);
  const raw = useMemo<RawOrdenes>(() => ({ estado, dispatch }), [estado]);
  return <RawContexto.Provider value={raw}>{children}</RawContexto.Provider>;
}

export function useOrdenes(): OrdenesContexto {
  const raw = useContext(RawContexto);
  if (!raw) throw new Error("useOrdenes debe usarse dentro de <OrdenesProvider>");
  const empresa = useContext(EmpresaContexto);
  const { estado, dispatch } = raw;

  return useMemo<OrdenesContexto>(() => {
    const eid = empresa.key;
    const propias = estado.ordenes.filter((o) => o.empresaId === eid);
    return {
      empresa,
      ordenes: propias,
      ordenesDe: (tipo) => propias.filter((o) => o.tipo === tipo).sort((a, b) => b.id - a.id),
      crearOrden: (datos) => {
        // Correlativo por empresa; id global (una alta por tick: los modales
        // cierran al guardar, no hay altas concurrentes).
        const orden: Orden = {
          id: estado.nextOrdenId,
          empresaId: eid,
          numero: siguienteNumeroOrden(datos.tipo, propias),
          ...datos,
        };
        dispatch({ tipo: "crearOrden", orden });
        return orden;
      },
      editarOrden: (id, datos) => dispatch({ tipo: "editarOrden", id, datos }),
      eliminarOrden: (id) => dispatch({ tipo: "eliminarOrden", id }),
      marcarCompraRecibida: (id, fecha, ubicacion) =>
        dispatch({ tipo: "marcarCompraRecibida", id, fecha, ubicacion }),
      revertirRecepcionCompra: (id) => dispatch({ tipo: "revertirRecepcionCompra", id }),
    };
  }, [estado, dispatch, empresa]);
}
