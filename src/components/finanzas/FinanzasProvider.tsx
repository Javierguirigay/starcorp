"use client";

/**
 * Estado compartido de Finanzas (Context + useReducer), montado en el layout
 * de la app para sobrevivir a la navegación entre páginas. Fuente única de:
 *   - la tasa Bs/USD global (Nómina la lee/escribe desde aquí),
 *   - las categorías y transacciones financieras por empresa,
 *   - el historial de movimientos del Grupo.
 * Los movimientos automáticos (nómina, transferencias) viven en el reducer,
 * no en la UI que los dispara, para servir igual a futuras empresas.
 * Fase mock: todo en memoria; la forma (arrays planos + empresaId) está
 * pensada para migrar a tablas con FK sin reestructurar.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import type {
  CategoriaFinanciera,
  MovimientoGrupo,
  PagoHistorial,
  TipoCategoria,
  TipoTransaccion,
  TransaccionFinanciera,
} from "@/lib/types";
import {
  CATEGORIAS_SEED,
  MOVIMIENTOS_GRUPO_SEED,
  NEXT_CATEGORIA_ID,
  NEXT_MOVIMIENTO_ID,
  NEXT_TRANSACCION_ID,
  TRANSACCIONES_SEED,
} from "@/lib/data/finanzas";
import { EMPRESAS } from "@/lib/data/empresas";
import { TASA_INICIAL } from "@/lib/data/empleados";
import { USUARIO_ACTUAL } from "@/lib/config";
import {
  espejosDeTransferencia,
  puedeEliminarCategoria,
  transaccionDeCompra,
  transaccionDeFactura,
  transaccionDeNomina,
  type CobroFacturaDatos,
  type PagoCompraDatos,
} from "@/lib/negocio/finanzas";

/* ===================== Estado y acciones ===================== */

/**
 * Origen de la tasa vigente:
 *   cargando — consultando /api/tasa-bcv;
 *   ok       — vino del BCV (fechaISO = fecha de publicación);
 *   manual   — el usuario la editó a mano (manda sobre el auto-fetch);
 *   error    — BCV no disponible; se conserva el valor que hubiera.
 * Solo afecta la tasa VIGENTE: los snapshots históricos (tasaBs/tasa de cada
 * registro) no se tocan.
 */
export interface TasaBcvInfo {
  estado: "cargando" | "ok" | "manual" | "error";
  fechaISO?: string;
}

interface EstadoFinanzas {
  tasaTexto: string; // "36.50" — fuente única de la tasa global
  tasaBcv: TasaBcvInfo;
  categorias: CategoriaFinanciera[];
  transacciones: TransaccionFinanciera[];
  movimientosGrupo: MovimientoGrupo[];
  nextCategoriaId: number;
  nextTransaccionId: number;
  nextMovimientoId: number;
}

/** Datos de una transacción manual (alta o edición). */
export interface TransaccionDatos {
  empresaId: string;
  tipo: TipoTransaccion;
  categoriaId: number;
  montoUSD: number;
  fecha: string; // ISO
  descripcion: string;
}

/** Datos del formulario de transferencia entre empresas del grupo. */
export interface TransferenciaDatos {
  origenKey: string;
  destinoKey: string;
  moneda: "USD" | "Bs";
  monto: number;
  fecha: string; // ISO
  descripcion: string;
}

type AccionFinanzas =
  | { tipo: "setTasa"; texto: string }
  // forzar: true cuando lo pide el usuario (botón ↻) — pisa la tasa manual.
  | { tipo: "tasaBcvCargando" }
  | { tipo: "tasaBcvOk"; tasa: number; fechaISO: string; forzar: boolean }
  | { tipo: "tasaBcvError"; forzar: boolean }
  | { tipo: "crearCategoria"; empresaId: string; nombre: string; tipoCategoria: TipoCategoria }
  | { tipo: "editarCategoria"; id: number; nombre: string; tipoCategoria: TipoCategoria }
  | { tipo: "eliminarCategoria"; id: number }
  | { tipo: "crearTransaccion"; datos: TransaccionDatos }
  | { tipo: "editarTransaccion"; id: number; datos: TransaccionDatos }
  | { tipo: "eliminarTransaccion"; id: number }
  | { tipo: "registrarTransferenciaGrupo"; datos: TransferenciaDatos }
  | { tipo: "registrarPagoNomina"; pago: PagoHistorial; empresaId: string }
  | { tipo: "registrarCobroFactura"; datos: CobroFacturaDatos; empresaId: string }
  | { tipo: "registrarPagoCompra"; datos: PagoCompraDatos; empresaId: string };

const ESTADO_INICIAL: EstadoFinanzas = {
  tasaTexto: TASA_INICIAL.toFixed(2), // fallback si el BCV no responde
  tasaBcv: { estado: "cargando" },
  categorias: CATEGORIAS_SEED,
  transacciones: TRANSACCIONES_SEED,
  movimientosGrupo: MOVIMIENTOS_GRUPO_SEED,
  nextCategoriaId: NEXT_CATEGORIA_ID,
  nextTransaccionId: NEXT_TRANSACCION_ID,
  nextMovimientoId: NEXT_MOVIMIENTO_ID,
};

/** Misma derivación que usaba NominaModule: texto inválido ⇒ 0. */
function tasaDe(estado: EstadoFinanzas): number {
  const n = parseFloat(estado.tasaTexto);
  return isNaN(n) ? 0 : n;
}

function nombreEmpresa(key: string): string {
  return EMPRESAS.find((e) => e.key === key)?.nombre ?? key;
}

function reducer(estado: EstadoFinanzas, accion: AccionFinanzas): EstadoFinanzas {
  switch (accion.tipo) {
    case "setTasa":
      // Edición manual: manda sobre el auto-fetch (solo ↻ explícito la pisa).
      return { ...estado, tasaTexto: accion.texto, tasaBcv: { estado: "manual" } };

    case "tasaBcvCargando":
      return { ...estado, tasaBcv: { ...estado.tasaBcv, estado: "cargando" } };

    case "tasaBcvOk":
      if (estado.tasaBcv.estado === "manual" && !accion.forzar) return estado;
      return {
        ...estado,
        tasaTexto: accion.tasa.toFixed(2),
        tasaBcv: { estado: "ok", fechaISO: accion.fechaISO },
      };

    case "tasaBcvError":
      if (estado.tasaBcv.estado === "manual" && !accion.forzar) return estado;
      return { ...estado, tasaBcv: { ...estado.tasaBcv, estado: "error" } };

    case "crearCategoria":
      return {
        ...estado,
        categorias: [
          ...estado.categorias,
          {
            id: estado.nextCategoriaId,
            nombre: accion.nombre,
            tipo: accion.tipoCategoria,
            empresaId: accion.empresaId,
          },
        ],
        nextCategoriaId: estado.nextCategoriaId + 1,
      };

    case "editarCategoria":
      return {
        ...estado,
        categorias: estado.categorias.map((c) => {
          if (c.id !== accion.id || c.protegida) return c;
          // Con transacciones asociadas solo se permite renombrar: cambiar el
          // tipo dejaría movimientos ya registrados en una categoría del flujo
          // contrario.
          const enUso = estado.transacciones.some((t) => t.categoriaId === c.id);
          return { ...c, nombre: accion.nombre, tipo: enUso ? c.tipo : accion.tipoCategoria };
        }),
      };

    case "eliminarCategoria": {
      const cat = estado.categorias.find((c) => c.id === accion.id);
      // Defensa además del disable en la UI.
      if (!cat || !puedeEliminarCategoria(cat, estado.transacciones).ok) return estado;
      return { ...estado, categorias: estado.categorias.filter((c) => c.id !== accion.id) };
    }

    case "crearTransaccion":
      return {
        ...estado,
        transacciones: [
          ...estado.transacciones,
          {
            id: estado.nextTransaccionId,
            ...accion.datos,
            tasaBs: tasaDe(estado),
            origen: "manual",
          },
        ],
        nextTransaccionId: estado.nextTransaccionId + 1,
      };

    case "editarTransaccion":
      return {
        ...estado,
        transacciones: estado.transacciones.map((t) =>
          // Solo manuales; conserva tasaBs/origen/referenciaId (snapshot histórico).
          t.id === accion.id && t.origen === "manual" ? { ...t, ...accion.datos } : t
        ),
      };

    case "eliminarTransaccion":
      return {
        ...estado,
        transacciones: estado.transacciones.filter(
          (t) => t.id !== accion.id || t.origen !== "manual"
        ),
      };

    case "registrarTransferenciaGrupo": {
      const d = accion.datos;
      const mov: MovimientoGrupo = {
        id: estado.nextMovimientoId,
        fecha: d.fecha,
        tipo: "Transferencia",
        origenKey: d.origenKey,
        destinoKey: d.destinoKey,
        origenNombre: nombreEmpresa(d.origenKey),
        destinoNombre: nombreEmpresa(d.destinoKey),
        moneda: d.moneda,
        monto: d.monto,
        tasaBs: tasaDe(estado),
        descripcion: d.descripcion,
        usuario: USUARIO_ACTUAL.nombre,
      };
      // Espejo automático en cada extremo con finanzas habilitadas (hoy: LOTER).
      const espejos = espejosDeTransferencia(mov, estado.categorias).map((t, i) => ({
        ...t,
        id: estado.nextTransaccionId + i,
      }));
      return {
        ...estado,
        movimientosGrupo: [mov, ...estado.movimientosGrupo],
        nextMovimientoId: estado.nextMovimientoId + 1,
        transacciones: [...estado.transacciones, ...espejos],
        nextTransaccionId: estado.nextTransaccionId + espejos.length,
      };
    }

    case "registrarPagoNomina": {
      // Idempotencia: un pago genera una sola salida (doble clic / StrictMode).
      const yaExiste = estado.transacciones.some(
        (t) =>
          t.empresaId === accion.empresaId &&
          t.origen === "nomina" &&
          t.referenciaId === accion.pago.id
      );
      if (yaExiste) return estado;
      const nueva = transaccionDeNomina(
        accion.pago,
        estado.categorias,
        accion.empresaId,
        tasaDe(estado)
      );
      if (!nueva) return estado; // empresa sin finanzas habilitadas
      return {
        ...estado,
        transacciones: [...estado.transacciones, { ...nueva, id: estado.nextTransaccionId }],
        nextTransaccionId: estado.nextTransaccionId + 1,
      };
    }

    case "registrarCobroFactura": {
      const yaExiste = estado.transacciones.some(
        (t) =>
          t.empresaId === accion.empresaId &&
          t.origen === "factura" &&
          t.referenciaId === accion.datos.id
      );
      if (yaExiste) return estado;
      const nueva = transaccionDeFactura(accion.datos, estado.categorias, accion.empresaId);
      if (!nueva) return estado;
      return {
        ...estado,
        transacciones: [...estado.transacciones, { ...nueva, id: estado.nextTransaccionId }],
        nextTransaccionId: estado.nextTransaccionId + 1,
      };
    }

    case "registrarPagoCompra": {
      const yaExiste = estado.transacciones.some(
        (t) =>
          t.empresaId === accion.empresaId &&
          t.origen === "compra" &&
          t.referenciaId === accion.datos.id
      );
      if (yaExiste) return estado;
      const nueva = transaccionDeCompra(accion.datos, accion.empresaId, tasaDe(estado));
      if (!nueva) return estado;
      return {
        ...estado,
        transacciones: [...estado.transacciones, { ...nueva, id: estado.nextTransaccionId }],
        nextTransaccionId: estado.nextTransaccionId + 1,
      };
    }
  }
}

/* ===================== Context + hook ===================== */

interface FinanzasContexto {
  tasaTexto: string;
  /** Tasa numérica derivada (texto inválido ⇒ 0). */
  tasa: number;
  setTasaTexto: (texto: string) => void;
  /** Origen/fecha de la tasa vigente (BCV, manual, error). */
  tasaBcv: TasaBcvInfo;
  /** Re-consulta la tasa BCV a pedido del usuario (pisa la tasa manual). */
  refrescarTasaBcv: () => void;
  categorias: CategoriaFinanciera[];
  transacciones: TransaccionFinanciera[];
  movimientosGrupo: MovimientoGrupo[];
  /** Id que recibirá la próxima categoría (para seleccionarla al crearla al vuelo). */
  nextCategoriaId: number;
  categoriasDe: (empresaId: string) => CategoriaFinanciera[];
  transaccionesDe: (empresaId: string) => TransaccionFinanciera[];
  crearCategoria: (empresaId: string, nombre: string, tipo: TipoCategoria) => void;
  editarCategoria: (id: number, nombre: string, tipo: TipoCategoria) => void;
  eliminarCategoria: (id: number) => void;
  crearTransaccion: (datos: TransaccionDatos) => void;
  editarTransaccion: (id: number, datos: TransaccionDatos) => void;
  eliminarTransaccion: (id: number) => void;
  registrarTransferenciaGrupo: (datos: TransferenciaDatos) => void;
  registrarPagoNomina: (pago: PagoHistorial, empresaId: string) => void;
  registrarCobroFactura: (datos: CobroFacturaDatos, empresaId: string) => void;
  registrarPagoCompra: (datos: PagoCompraDatos, empresaId: string) => void;
}

const Contexto = createContext<FinanzasContexto | null>(null);

export function FinanzasProvider({ children }: { children: React.ReactNode }) {
  const [estado, dispatch] = useReducer(reducer, ESTADO_INICIAL);

  // Trae la tasa BCV vía /api/tasa-bcv. Con forzar=false (carga inicial) el
  // reducer la ignora si el usuario ya editó a mano; repetirla es inocuo
  // (StrictMode), así que no hace falta guard de montaje.
  const consultarTasaBcv = useCallback(async (forzar: boolean) => {
    if (forzar) dispatch({ tipo: "tasaBcvCargando" });
    try {
      const res = await fetch("/api/tasa-bcv");
      const json: unknown = await res.json();
      const { tasa, fechaISO } = json as { tasa?: unknown; fechaISO?: unknown };
      if (!res.ok || typeof tasa !== "number" || typeof fechaISO !== "string") throw new Error();
      dispatch({ tipo: "tasaBcvOk", tasa, fechaISO, forzar });
    } catch {
      dispatch({ tipo: "tasaBcvError", forzar });
    }
  }, []);

  useEffect(() => {
    consultarTasaBcv(false);
  }, [consultarTasaBcv]);

  const valor = useMemo<FinanzasContexto>(
    () => ({
      tasaTexto: estado.tasaTexto,
      tasa: tasaDe(estado),
      setTasaTexto: (texto) => dispatch({ tipo: "setTasa", texto }),
      tasaBcv: estado.tasaBcv,
      refrescarTasaBcv: () => consultarTasaBcv(true),
      categorias: estado.categorias,
      transacciones: estado.transacciones,
      movimientosGrupo: estado.movimientosGrupo,
      nextCategoriaId: estado.nextCategoriaId,
      categoriasDe: (empresaId) => estado.categorias.filter((c) => c.empresaId === empresaId),
      transaccionesDe: (empresaId) =>
        estado.transacciones.filter((t) => t.empresaId === empresaId),
      crearCategoria: (empresaId, nombre, tipoCategoria) =>
        dispatch({ tipo: "crearCategoria", empresaId, nombre, tipoCategoria }),
      editarCategoria: (id, nombre, tipoCategoria) =>
        dispatch({ tipo: "editarCategoria", id, nombre, tipoCategoria }),
      eliminarCategoria: (id) => dispatch({ tipo: "eliminarCategoria", id }),
      crearTransaccion: (datos) => dispatch({ tipo: "crearTransaccion", datos }),
      editarTransaccion: (id, datos) => dispatch({ tipo: "editarTransaccion", id, datos }),
      eliminarTransaccion: (id) => dispatch({ tipo: "eliminarTransaccion", id }),
      registrarTransferenciaGrupo: (datos) =>
        dispatch({ tipo: "registrarTransferenciaGrupo", datos }),
      registrarPagoNomina: (pago, empresaId) =>
        dispatch({ tipo: "registrarPagoNomina", pago, empresaId }),
      registrarCobroFactura: (datos, empresaId) =>
        dispatch({ tipo: "registrarCobroFactura", datos, empresaId }),
      registrarPagoCompra: (datos, empresaId) =>
        dispatch({ tipo: "registrarPagoCompra", datos, empresaId }),
    }),
    [estado, consultarTasaBcv]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useFinanzas(): FinanzasContexto {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useFinanzas debe usarse dentro de <FinanzasProvider>");
  return ctx;
}
