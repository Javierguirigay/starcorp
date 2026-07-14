"use client";

/**
 * Estado compartido de Finanzas (Context + useReducer), montado en el layout
 * de la app para sobrevivir a la navegación entre páginas. Fuente única de:
 *   - la tasa Bs/USD global (Nómina la lee/escribe desde aquí),
 *   - las cuentas, categorías y transacciones financieras por empresa,
 *   - los traspasos entre cuentas propias y el historial del Grupo.
 * Los movimientos automáticos (nómina, transferencias) viven en el reducer,
 * no en la UI que los dispara, para servir igual a futuras empresas.
 * Fase mock: todo en memoria; la forma (arrays planos + empresaId) está
 * pensada para migrar a tablas con FK sin reestructurar.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import type {
  CategoriaFinanciera,
  CuentaFinanciera,
  Moneda,
  MovimientoGrupo,
  PagoHistorial,
  TipoCategoria,
  TipoTransaccion,
  TransaccionFinanciera,
  TraspasoInterno,
} from "@/lib/types";
import {
  CATEGORIAS_SEED,
  CUENTAS_SEED,
  MOVIMIENTOS_GRUPO_SEED,
  NEXT_CATEGORIA_ID,
  NEXT_CUENTA_ID,
  NEXT_MOVIMIENTO_ID,
  NEXT_TRANSACCION_ID,
  NEXT_TRASPASO_ID,
  TRANSACCIONES_SEED,
  TRASPASOS_SEED,
} from "@/lib/data/finanzas";
import { EMPRESAS } from "@/lib/data/empresas";
import { TASA_INICIAL } from "@/lib/data/empleados";
import { USUARIO_ACTUAL } from "@/lib/config";
import {
  cuentaPredeterminada,
  espejosDeTransferencia,
  espejosDeTraspaso,
  puedeEliminarCategoria,
  puedeEliminarCuenta,
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
  cuentas: CuentaFinanciera[];
  transacciones: TransaccionFinanciera[];
  traspasos: TraspasoInterno[];
  movimientosGrupo: MovimientoGrupo[];
  nextCategoriaId: number;
  nextCuentaId: number;
  nextTransaccionId: number;
  nextTraspasoId: number;
  nextMovimientoId: number;
}

/** Datos de una transacción manual (alta o edición). La moneda se deriva de
    la cuenta en el reducer; el monto es NATIVO en esa moneda. */
export interface TransaccionDatos {
  empresaId: string;
  cuentaId: number;
  tipo: TipoTransaccion;
  categoriaId: number;
  monto: number;
  fecha: string; // ISO
  descripcion: string;
  observaciones?: string;
}

/** Datos del formulario de cuenta (alta o edición). */
export interface CuentaDatos {
  nombre: string;
  moneda: Moneda;
  predeterminada: boolean;
  activa: boolean;
}

/** Datos de un traspaso entre cuentas propias (alta o edición). Las monedas
    se derivan de las cuentas en el reducer. */
export interface TraspasoDatos {
  empresaId: string;
  cuentaOrigenId: number;
  cuentaDestinoId: number;
  montoOrigen: number;
  montoDestino: number;
  fecha: string; // ISO
  descripcion: string;
  observaciones?: string;
}

/** Datos del formulario de transferencia entre empresas del grupo. Las
    monedas se derivan de las cuentas elegidas en el reducer. */
export interface TransferenciaDatos {
  origenKey: string;
  destinoKey: string;
  cuentaOrigenId: number;
  cuentaDestinoId: number;
  montoOrigen: number;
  montoDestino: number;
  fecha: string; // ISO
  descripcion: string;
  observaciones?: string;
}

/** Campos editables de un movimiento del grupo (id, usuario y tasa snapshot se conservan). */
export type MovimientoGrupoDatos = Omit<MovimientoGrupo, "id" | "usuario" | "tasaBs">;

type AccionFinanzas =
  | { tipo: "setTasa"; texto: string }
  // forzar: true cuando lo pide el usuario (botón ↻) — pisa la tasa manual.
  | { tipo: "tasaBcvCargando" }
  | { tipo: "tasaBcvOk"; tasa: number; fechaISO: string; forzar: boolean }
  | { tipo: "tasaBcvError"; forzar: boolean }
  | { tipo: "crearCategoria"; empresaId: string; nombre: string; tipoCategoria: TipoCategoria }
  | { tipo: "editarCategoria"; id: number; nombre: string; tipoCategoria: TipoCategoria }
  | { tipo: "eliminarCategoria"; id: number }
  | { tipo: "crearCuenta"; empresaId: string; datos: CuentaDatos }
  | { tipo: "editarCuenta"; id: number; datos: CuentaDatos }
  | { tipo: "eliminarCuenta"; id: number }
  | { tipo: "crearTransaccion"; datos: TransaccionDatos }
  | { tipo: "editarTransaccion"; id: number; datos: TransaccionDatos }
  | { tipo: "eliminarTransaccion"; id: number }
  | { tipo: "registrarTraspaso"; datos: TraspasoDatos }
  | { tipo: "editarTraspaso"; id: number; datos: TraspasoDatos }
  | { tipo: "eliminarTraspaso"; id: number }
  | { tipo: "registrarTransferenciaGrupo"; datos: TransferenciaDatos }
  | { tipo: "editarMovimientoGrupo"; id: number; datos: MovimientoGrupoDatos }
  | { tipo: "eliminarMovimientoGrupo"; id: number }
  | { tipo: "registrarPagoNomina"; pago: PagoHistorial; empresaId: string; cuentaId: number }
  | { tipo: "registrarCobroFactura"; datos: CobroFacturaDatos; empresaId: string; cuentaId: number }
  | { tipo: "registrarPagoCompra"; datos: PagoCompraDatos; empresaId: string; cuentaId: number }
  | { tipo: "eliminarPagoCompra"; facturaRecibidaId: number; empresaId: string };

const ESTADO_INICIAL: EstadoFinanzas = {
  tasaTexto: TASA_INICIAL.toFixed(2), // fallback si el BCV no responde
  tasaBcv: { estado: "cargando" },
  categorias: CATEGORIAS_SEED,
  cuentas: CUENTAS_SEED,
  transacciones: TRANSACCIONES_SEED,
  traspasos: TRASPASOS_SEED,
  movimientosGrupo: MOVIMIENTOS_GRUPO_SEED,
  nextCategoriaId: NEXT_CATEGORIA_ID,
  nextCuentaId: NEXT_CUENTA_ID,
  nextTransaccionId: NEXT_TRANSACCION_ID,
  nextTraspasoId: NEXT_TRASPASO_ID,
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

function cuentaDe(estado: EstadoFinanzas, id: number): CuentaFinanciera | undefined {
  return estado.cuentas.find((c) => c.id === id);
}

/** Marca `id` como predeterminada de su empresa desmarcando la anterior. */
function conPredeterminada(cuentas: CuentaFinanciera[], id: number, empresaId: string) {
  return cuentas.map((c) =>
    c.empresaId !== empresaId ? c : { ...c, predeterminada: c.id === id }
  );
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

    case "crearCuenta": {
      const nueva: CuentaFinanciera = {
        id: estado.nextCuentaId,
        empresaId: accion.empresaId,
        ...accion.datos,
      };
      const cuentas = nueva.predeterminada
        ? conPredeterminada([...estado.cuentas, nueva], nueva.id, nueva.empresaId)
        : [...estado.cuentas, nueva];
      return { ...estado, cuentas, nextCuentaId: estado.nextCuentaId + 1 };
    }

    case "editarCuenta": {
      const previa = cuentaDe(estado, accion.id);
      if (!previa) return estado;
      // La moneda es inmutable con movimientos: cambiaría el valor de filas ya
      // registradas en su moneda nativa.
      const enUso = estado.transacciones.some((t) => t.cuentaId === accion.id);
      const moneda = enUso ? previa.moneda : accion.datos.moneda;
      // La única predeterminada no puede dejar de serlo ni desactivarse aquí:
      // se reasigna marcando otra cuenta como predeterminada.
      const datos =
        previa.predeterminada && (!accion.datos.predeterminada || !accion.datos.activa)
          ? { ...accion.datos, predeterminada: true, activa: true }
          : accion.datos;
      let cuentas = estado.cuentas.map((c) =>
        c.id === accion.id ? { ...c, ...datos, moneda } : c
      );
      if (datos.predeterminada && !previa.predeterminada)
        cuentas = conPredeterminada(cuentas, accion.id, previa.empresaId);
      return { ...estado, cuentas };
    }

    case "eliminarCuenta": {
      const cuenta = cuentaDe(estado, accion.id);
      // Defensa además del disable en la UI.
      if (
        !cuenta ||
        !puedeEliminarCuenta(cuenta, estado.transacciones, estado.traspasos, estado.movimientosGrupo)
          .ok
      )
        return estado;
      return { ...estado, cuentas: estado.cuentas.filter((c) => c.id !== accion.id) };
    }

    case "crearTransaccion": {
      const cuenta = cuentaDe(estado, accion.datos.cuentaId);
      if (!cuenta) return estado;
      return {
        ...estado,
        transacciones: [
          ...estado.transacciones,
          {
            id: estado.nextTransaccionId,
            ...accion.datos,
            moneda: cuenta.moneda,
            tasaBs: tasaDe(estado),
            origen: "manual",
          },
        ],
        nextTransaccionId: estado.nextTransaccionId + 1,
      };
    }

    case "editarTransaccion": {
      const cuenta = cuentaDe(estado, accion.datos.cuentaId);
      if (!cuenta) return estado;
      return {
        ...estado,
        transacciones: estado.transacciones.map((t) =>
          // Solo manuales; conserva tasaBs/origen/referenciaId (snapshot
          // histórico). La moneda se re-deriva por si cambió la cuenta.
          t.id === accion.id && t.origen === "manual"
            ? { ...t, ...accion.datos, moneda: cuenta.moneda }
            : t
        ),
      };
    }

    case "eliminarTransaccion":
      return {
        ...estado,
        transacciones: estado.transacciones.filter(
          (t) => t.id !== accion.id || t.origen !== "manual"
        ),
      };

    case "registrarTraspaso": {
      const d = accion.datos;
      const origen = cuentaDe(estado, d.cuentaOrigenId);
      const destino = cuentaDe(estado, d.cuentaDestinoId);
      if (!origen || !destino) return estado;
      const traspaso: TraspasoInterno = {
        id: estado.nextTraspasoId,
        ...d,
        monedaOrigen: origen.moneda,
        monedaDestino: destino.moneda,
        tasaBs: tasaDe(estado),
      };
      const espejos = espejosDeTraspaso(traspaso, estado.categorias).map((t, i) => ({
        ...t,
        id: estado.nextTransaccionId + i,
      }));
      return {
        ...estado,
        traspasos: [traspaso, ...estado.traspasos],
        nextTraspasoId: estado.nextTraspasoId + 1,
        transacciones: [...estado.transacciones, ...espejos],
        nextTransaccionId: estado.nextTransaccionId + espejos.length,
      };
    }

    case "editarTraspaso": {
      const previo = estado.traspasos.find((t) => t.id === accion.id);
      const origen = cuentaDe(estado, accion.datos.cuentaOrigenId);
      const destino = cuentaDe(estado, accion.datos.cuentaDestinoId);
      if (!previo || !origen || !destino) return estado;
      // La tasa snapshot se conserva (histórico fiel); las monedas se
      // re-derivan por si cambiaron las cuentas.
      const actualizado: TraspasoInterno = {
        ...previo,
        ...accion.datos,
        monedaOrigen: origen.moneda,
        monedaDestino: destino.moneda,
      };
      // Regenera las dos piernas espejo para que los saldos queden consistentes.
      const sinEspejos = estado.transacciones.filter(
        (t) => !(t.origen === "traspaso" && t.referenciaId === accion.id)
      );
      const nuevosEspejos = espejosDeTraspaso(actualizado, estado.categorias).map((t, i) => ({
        ...t,
        id: estado.nextTransaccionId + i,
      }));
      return {
        ...estado,
        traspasos: estado.traspasos.map((t) => (t.id === accion.id ? actualizado : t)),
        transacciones: [...sinEspejos, ...nuevosEspejos],
        nextTransaccionId: estado.nextTransaccionId + nuevosEspejos.length,
      };
    }

    case "eliminarTraspaso":
      return {
        ...estado,
        traspasos: estado.traspasos.filter((t) => t.id !== accion.id),
        // Arrastra las dos piernas espejo.
        transacciones: estado.transacciones.filter(
          (t) => !(t.origen === "traspaso" && t.referenciaId === accion.id)
        ),
      };

    case "registrarTransferenciaGrupo": {
      const d = accion.datos;
      const origen = cuentaDe(estado, d.cuentaOrigenId);
      const destino = cuentaDe(estado, d.cuentaDestinoId);
      if (!origen || !destino) return estado;
      const mov: MovimientoGrupo = {
        id: estado.nextMovimientoId,
        fecha: d.fecha,
        tipo: "Transferencia",
        origenKey: d.origenKey,
        destinoKey: d.destinoKey,
        cuentaOrigenId: d.cuentaOrigenId,
        cuentaDestinoId: d.cuentaDestinoId,
        origenNombre: nombreEmpresa(d.origenKey),
        destinoNombre: nombreEmpresa(d.destinoKey),
        monedaOrigen: origen.moneda,
        montoOrigen: d.montoOrigen,
        monedaDestino: destino.moneda,
        montoDestino: d.montoDestino,
        tasaBs: tasaDe(estado),
        descripcion: d.descripcion,
        observaciones: d.observaciones,
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

    case "editarMovimientoGrupo": {
      const previo = estado.movimientosGrupo.find((m) => m.id === accion.id);
      if (!previo) return estado;
      // La tasa snapshot y el usuario originales se conservan (histórico fiel).
      const actualizado: MovimientoGrupo = { ...previo, ...accion.datos };
      // Invariante fila-cuenta-moneda: los extremos con cuenta usan la moneda
      // de esa cuenta, elija lo que elija el modal.
      const cuentaOrigen =
        actualizado.cuentaOrigenId !== undefined
          ? cuentaDe(estado, actualizado.cuentaOrigenId)
          : undefined;
      const cuentaDestino =
        actualizado.cuentaDestinoId !== undefined
          ? cuentaDe(estado, actualizado.cuentaDestinoId)
          : undefined;
      if (cuentaOrigen) actualizado.monedaOrigen = cuentaOrigen.moneda;
      if (cuentaDestino) actualizado.monedaDestino = cuentaDestino.moneda;
      // Se regeneran los espejos de la transferencia: quitar los previos (por
      // referenciaId) y recrearlos si sigue siendo transferencia, para que los
      // saldos de las empresas queden consistentes.
      const sinEspejos = estado.transacciones.filter(
        (t) => !(t.origen === "transferencia" && t.referenciaId === accion.id)
      );
      const nuevosEspejos =
        actualizado.tipo === "Transferencia"
          ? espejosDeTransferencia(actualizado, estado.categorias).map((t, i) => ({
              ...t,
              id: estado.nextTransaccionId + i,
            }))
          : [];
      return {
        ...estado,
        movimientosGrupo: estado.movimientosGrupo.map((m) =>
          m.id === accion.id ? actualizado : m
        ),
        transacciones: [...sinEspejos, ...nuevosEspejos],
        nextTransaccionId: estado.nextTransaccionId + nuevosEspejos.length,
      };
    }

    case "eliminarMovimientoGrupo":
      return {
        ...estado,
        movimientosGrupo: estado.movimientosGrupo.filter((m) => m.id !== accion.id),
        // Arrastra los espejos de la transferencia (si los tenía) para no dejar
        // salidas/entradas huérfanas que descuadren los saldos.
        transacciones: estado.transacciones.filter(
          (t) => !(t.origen === "transferencia" && t.referenciaId === accion.id)
        ),
      };

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
        cuentaDe(estado, accion.cuentaId) ?? cuentaPredeterminada(estado.cuentas, accion.empresaId),
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
      const nueva = transaccionDeFactura(
        accion.datos,
        estado.categorias,
        accion.empresaId,
        cuentaDe(estado, accion.cuentaId) ?? cuentaPredeterminada(estado.cuentas, accion.empresaId)
      );
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
      const nueva = transaccionDeCompra(
        accion.datos,
        accion.empresaId,
        cuentaDe(estado, accion.cuentaId) ?? cuentaPredeterminada(estado.cuentas, accion.empresaId),
        tasaDe(estado)
      );
      if (!nueva) return estado;
      return {
        ...estado,
        transacciones: [...estado.transacciones, { ...nueva, id: estado.nextTransaccionId }],
        nextTransaccionId: estado.nextTransaccionId + 1,
      };
    }

    // Reversa del pago automático al eliminar la factura recibida que lo originó.
    case "eliminarPagoCompra":
      return {
        ...estado,
        transacciones: estado.transacciones.filter(
          (t) =>
            !(
              t.empresaId === accion.empresaId &&
              t.origen === "compra" &&
              t.referenciaId === accion.facturaRecibidaId
            )
        ),
      };
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
  cuentas: CuentaFinanciera[];
  transacciones: TransaccionFinanciera[];
  traspasos: TraspasoInterno[];
  movimientosGrupo: MovimientoGrupo[];
  /** Id que recibirá la próxima categoría (para seleccionarla al crearla al vuelo). */
  nextCategoriaId: number;
  categoriasDe: (empresaId: string) => CategoriaFinanciera[];
  cuentasDe: (empresaId: string) => CuentaFinanciera[];
  cuentaPredeterminadaDe: (empresaId: string) => CuentaFinanciera | undefined;
  transaccionesDe: (empresaId: string) => TransaccionFinanciera[];
  crearCategoria: (empresaId: string, nombre: string, tipo: TipoCategoria) => void;
  editarCategoria: (id: number, nombre: string, tipo: TipoCategoria) => void;
  eliminarCategoria: (id: number) => void;
  crearCuenta: (empresaId: string, datos: CuentaDatos) => void;
  editarCuenta: (id: number, datos: CuentaDatos) => void;
  eliminarCuenta: (id: number) => void;
  crearTransaccion: (datos: TransaccionDatos) => void;
  editarTransaccion: (id: number, datos: TransaccionDatos) => void;
  eliminarTransaccion: (id: number) => void;
  registrarTraspaso: (datos: TraspasoDatos) => void;
  editarTraspaso: (id: number, datos: TraspasoDatos) => void;
  eliminarTraspaso: (id: number) => void;
  registrarTransferenciaGrupo: (datos: TransferenciaDatos) => void;
  editarMovimientoGrupo: (id: number, datos: MovimientoGrupoDatos) => void;
  eliminarMovimientoGrupo: (id: number) => void;
  registrarPagoNomina: (pago: PagoHistorial, empresaId: string, cuentaId: number) => void;
  registrarCobroFactura: (datos: CobroFacturaDatos, empresaId: string, cuentaId: number) => void;
  registrarPagoCompra: (datos: PagoCompraDatos, empresaId: string, cuentaId: number) => void;
  /** Revierte la salida automática de una compra (al eliminar la factura recibida). */
  eliminarPagoCompra: (facturaRecibidaId: number, empresaId: string) => void;
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
      cuentas: estado.cuentas,
      transacciones: estado.transacciones,
      traspasos: estado.traspasos,
      movimientosGrupo: estado.movimientosGrupo,
      nextCategoriaId: estado.nextCategoriaId,
      categoriasDe: (empresaId) => estado.categorias.filter((c) => c.empresaId === empresaId),
      cuentasDe: (empresaId) => estado.cuentas.filter((c) => c.empresaId === empresaId),
      cuentaPredeterminadaDe: (empresaId) => cuentaPredeterminada(estado.cuentas, empresaId),
      transaccionesDe: (empresaId) =>
        estado.transacciones.filter((t) => t.empresaId === empresaId),
      crearCategoria: (empresaId, nombre, tipoCategoria) =>
        dispatch({ tipo: "crearCategoria", empresaId, nombre, tipoCategoria }),
      editarCategoria: (id, nombre, tipoCategoria) =>
        dispatch({ tipo: "editarCategoria", id, nombre, tipoCategoria }),
      eliminarCategoria: (id) => dispatch({ tipo: "eliminarCategoria", id }),
      crearCuenta: (empresaId, datos) => dispatch({ tipo: "crearCuenta", empresaId, datos }),
      editarCuenta: (id, datos) => dispatch({ tipo: "editarCuenta", id, datos }),
      eliminarCuenta: (id) => dispatch({ tipo: "eliminarCuenta", id }),
      crearTransaccion: (datos) => dispatch({ tipo: "crearTransaccion", datos }),
      editarTransaccion: (id, datos) => dispatch({ tipo: "editarTransaccion", id, datos }),
      eliminarTransaccion: (id) => dispatch({ tipo: "eliminarTransaccion", id }),
      registrarTraspaso: (datos) => dispatch({ tipo: "registrarTraspaso", datos }),
      editarTraspaso: (id, datos) => dispatch({ tipo: "editarTraspaso", id, datos }),
      eliminarTraspaso: (id) => dispatch({ tipo: "eliminarTraspaso", id }),
      registrarTransferenciaGrupo: (datos) =>
        dispatch({ tipo: "registrarTransferenciaGrupo", datos }),
      editarMovimientoGrupo: (id, datos) =>
        dispatch({ tipo: "editarMovimientoGrupo", id, datos }),
      eliminarMovimientoGrupo: (id) => dispatch({ tipo: "eliminarMovimientoGrupo", id }),
      registrarPagoNomina: (pago, empresaId, cuentaId) =>
        dispatch({ tipo: "registrarPagoNomina", pago, empresaId, cuentaId }),
      registrarCobroFactura: (datos, empresaId, cuentaId) =>
        dispatch({ tipo: "registrarCobroFactura", datos, empresaId, cuentaId }),
      registrarPagoCompra: (datos, empresaId, cuentaId) =>
        dispatch({ tipo: "registrarPagoCompra", datos, empresaId, cuentaId }),
      eliminarPagoCompra: (facturaRecibidaId, empresaId) =>
        dispatch({ tipo: "eliminarPagoCompra", facturaRecibidaId, empresaId }),
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
