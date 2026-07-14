"use client";

/**
 * Estado compartido de Facturación y Gestión de Compras (Context + useReducer),
 * montado en el layout de la app (dentro de FinanzasProvider) para sobrevivir
 * a la navegación. Fase mock: todo en memoria; los PDFs subidos se guardan
 * como object URLs que viven solo la sesión.
 *
 * La integración con Finanzas usa el patrón de dos llamadas existente
 * (como NominaModule): la UI despacha aquí la acción local (marcar cobrada /
 * pagada) y llama además a la acción del FinanzasProvider
 * (registrarCobroFactura / registrarPagoCompra), que tiene su propio guard
 * de idempotencia.
 */
import { createContext, useContext, useMemo, useReducer } from "react";
import type {
  CalibracionPlantilla,
  CampoPlantilla,
  Cliente,
  CuentaPorPagar,
  Factura,
  FacturaRecibida,
  PosicionMm,
  PreFactura,
  Proveedor,
  ReporteServicio,
  Retencion,
  TarifaServicio,
} from "@/lib/types";
import {
  CALIBRACION_DEFAULT,
  CLIENTES_SEED,
  FACTURAS_SEED,
  NEXT_CLIENTE_ID,
  NEXT_FACTURA_ID,
  NEXT_PREFACTURA_ID,
  NEXT_REPORTE_ID,
  PREFACTURAS_SEED,
  REPORTES_SEED,
} from "@/lib/data/facturacion";
import {
  CUENTAS_POR_PAGAR_SEED,
  FACTURAS_RECIBIDAS_SEED,
  NEXT_CUENTA_POR_PAGAR_ID,
  NEXT_FACTURA_RECIBIDA_ID,
  NEXT_PROVEEDOR_ID,
  NEXT_RETENCION_ID,
  PROVEEDORES_SEED,
  RETENCIONES_SEED,
} from "@/lib/data/compras";
import { NEXT_TARIFA_ID, TARIFAS_SEED } from "@/lib/data/tarifas";
import { convertirRenglonesATasa, siguienteNumero } from "@/lib/negocio/facturacion";
import { siguienteComprobante } from "@/lib/negocio/retenciones";

/* ===================== Estado y acciones ===================== */

interface EstadoFacturacion {
  clientes: Cliente[];
  proveedores: Proveedor[];
  reportes: ReporteServicio[];
  prefacturas: PreFactura[];
  facturas: Factura[];
  facturasRecibidas: FacturaRecibida[];
  cuentasPorPagar: CuentaPorPagar[];
  retenciones: Retencion[];
  tarifas: TarifaServicio[];
  calibracion: CalibracionPlantilla;
  nextClienteId: number;
  nextProveedorId: number;
  nextReporteId: number;
  nextPrefacturaId: number;
  nextFacturaId: number;
  nextFacturaRecibidaId: number;
  nextCuentaPorPagarId: number;
  nextRetencionId: number;
  nextTarifaId: number;
}

export type ReporteDatos = Omit<ReporteServicio, "id" | "estado">;
export type TarifaDatos = Omit<TarifaServicio, "id">;
export type PrefacturaDatos = Omit<PreFactura, "id" | "estado" | "reporteIds">;
export type FacturaRecibidaDatos = Omit<FacturaRecibida, "id" | "estado" | "retencionId">;
export type CuentaPorPagarDatos = Omit<CuentaPorPagar, "id" | "estado" | "facturaRecibidaId">;
export type RetencionDatos = Omit<Retencion, "id">;

export interface GenerarFacturaDatos {
  numeroFactura: string;
  numeroControl: string;
  fechaEmision: string; // ISO
  tasaBs: number;
}

type Accion =
  | { tipo: "crearCliente"; datos: Omit<Cliente, "id"> }
  | { tipo: "crearProveedor"; datos: Omit<Proveedor, "id"> }
  | { tipo: "crearReporte"; datos: ReporteDatos }
  | { tipo: "editarReporte"; id: number; datos: ReporteDatos }
  | { tipo: "eliminarReporte"; id: number }
  | { tipo: "crearPrefactura"; datos: PrefacturaDatos; reporteIds: number[] }
  | { tipo: "editarPrefactura"; id: number; datos: PrefacturaDatos }
  | { tipo: "emitirPrefactura"; id: number }
  | { tipo: "eliminarPrefactura"; id: number }
  | { tipo: "generarFactura"; prefacturaId: number; datos: GenerarFacturaDatos }
  | { tipo: "marcarFacturaCobrada"; id: number }
  | { tipo: "crearFacturaRecibida"; datos: FacturaRecibidaDatos }
  | { tipo: "editarFacturaRecibida"; id: number; datos: FacturaRecibidaDatos }
  | { tipo: "eliminarFacturaRecibida"; id: number }
  // Cuentas por pagar (Control Administrativo): modelo propio no fiscal.
  | { tipo: "crearCuentaPorPagar"; datos: CuentaPorPagarDatos }
  | { tipo: "editarCuentaPorPagar"; id: number; datos: CuentaPorPagarDatos }
  | { tipo: "eliminarCuentaPorPagar"; id: number }
  | { tipo: "setVencimientoCuentaPorPagar"; id: number; fecha: string }
  // Pago: convierte la cuenta por pagar en factura recibida (ya pagada).
  | { tipo: "pagarCuentaPorPagar"; id: number; datos: FacturaRecibidaDatos }
  // Vencimiento editable desde la cartera (Control Administrativo).
  | { tipo: "setVencimientoFactura"; id: number; fecha: string }
  | { tipo: "crearRetencion"; datos: RetencionDatos }
  | { tipo: "eliminarRetencion"; id: number }
  // Gestión de Tarifas (catálogo de servicios referenciales).
  | { tipo: "crearTarifa"; datos: TarifaDatos }
  | { tipo: "editarTarifa"; id: number; datos: TarifaDatos }
  | { tipo: "eliminarTarifa"; id: number }
  | { tipo: "setCalibracionCampo"; campo: CampoPlantilla; pos: PosicionMm }
  | { tipo: "setCalibracionBase"; valores: Partial<Omit<CalibracionPlantilla, "campos">> }
  | { tipo: "resetCalibracion" };

const ESTADO_INICIAL: EstadoFacturacion = {
  clientes: CLIENTES_SEED,
  proveedores: PROVEEDORES_SEED,
  reportes: REPORTES_SEED,
  prefacturas: PREFACTURAS_SEED,
  facturas: FACTURAS_SEED,
  facturasRecibidas: FACTURAS_RECIBIDAS_SEED,
  cuentasPorPagar: CUENTAS_POR_PAGAR_SEED,
  retenciones: RETENCIONES_SEED,
  tarifas: TARIFAS_SEED,
  calibracion: CALIBRACION_DEFAULT,
  nextClienteId: NEXT_CLIENTE_ID,
  nextProveedorId: NEXT_PROVEEDOR_ID,
  nextReporteId: NEXT_REPORTE_ID,
  nextPrefacturaId: NEXT_PREFACTURA_ID,
  nextFacturaId: NEXT_FACTURA_ID,
  nextFacturaRecibidaId: NEXT_FACTURA_RECIBIDA_ID,
  nextCuentaPorPagarId: NEXT_CUENTA_POR_PAGAR_ID,
  nextRetencionId: NEXT_RETENCION_ID,
  nextTarifaId: NEXT_TARIFA_ID,
};

function reducer(estado: EstadoFacturacion, accion: Accion): EstadoFacturacion {
  switch (accion.tipo) {
    case "crearCliente":
      return {
        ...estado,
        clientes: [...estado.clientes, { id: estado.nextClienteId, ...accion.datos }],
        nextClienteId: estado.nextClienteId + 1,
      };

    case "crearProveedor":
      return {
        ...estado,
        proveedores: [...estado.proveedores, { id: estado.nextProveedorId, ...accion.datos }],
        nextProveedorId: estado.nextProveedorId + 1,
      };

    case "crearReporte":
      return {
        ...estado,
        reportes: [
          ...estado.reportes,
          { id: estado.nextReporteId, ...accion.datos, estado: "pendiente" },
        ],
        nextReporteId: estado.nextReporteId + 1,
      };

    case "editarReporte":
      return {
        ...estado,
        reportes: estado.reportes.map((r) =>
          // Prefacturados quedan congelados (ya alimentaron una pre-factura).
          r.id === accion.id && r.estado === "pendiente" ? { ...r, ...accion.datos } : r
        ),
      };

    case "eliminarReporte":
      return {
        ...estado,
        reportes: estado.reportes.filter((r) => r.id !== accion.id || r.estado !== "pendiente"),
      };

    case "crearPrefactura": {
      const nueva: PreFactura = {
        id: estado.nextPrefacturaId,
        ...accion.datos,
        estado: "borrador",
        reporteIds: accion.reporteIds,
      };
      return {
        ...estado,
        prefacturas: [...estado.prefacturas, nueva],
        nextPrefacturaId: estado.nextPrefacturaId + 1,
        reportes: estado.reportes.map((r) =>
          accion.reporteIds.includes(r.id) ? { ...r, estado: "prefacturado" } : r
        ),
      };
    }

    case "editarPrefactura":
      return {
        ...estado,
        prefacturas: estado.prefacturas.map((p) =>
          p.id === accion.id && p.estado !== "facturada" ? { ...p, ...accion.datos } : p
        ),
      };

    case "emitirPrefactura":
      return {
        ...estado,
        prefacturas: estado.prefacturas.map((p) =>
          p.id === accion.id && p.estado === "borrador" ? { ...p, estado: "emitida" } : p
        ),
      };

    case "eliminarPrefactura": {
      const pf = estado.prefacturas.find((p) => p.id === accion.id);
      if (!pf || pf.estado !== "borrador") return estado;
      return {
        ...estado,
        prefacturas: estado.prefacturas.filter((p) => p.id !== accion.id),
        // Sus reportes vuelven a estar disponibles para pre-facturar.
        reportes: estado.reportes.map((r) =>
          pf.reporteIds.includes(r.id) ? { ...r, estado: "pendiente" } : r
        ),
      };
    }

    case "generarFactura": {
      const pf = estado.prefacturas.find((p) => p.id === accion.prefacturaId);
      if (!pf || pf.estado === "facturada" || accion.datos.tasaBs <= 0) return estado;
      const factura: Factura = {
        id: estado.nextFacturaId,
        prefacturaId: pf.id,
        numeroFactura: accion.datos.numeroFactura,
        numeroControl: accion.datos.numeroControl,
        fechaEmision: accion.datos.fechaEmision,
        clienteId: pf.clienteId,
        tasaBs: accion.datos.tasaBs,
        // Conversión POR PRECIO UNITARIO a la tasa snapshot.
        renglones: convertirRenglonesATasa(pf.renglones, accion.datos.tasaBs),
        locacion: pf.locacion,
        condicionesPago: pf.condicionesPago,
        estado: "pendiente",
      };
      return {
        ...estado,
        facturas: [...estado.facturas, factura],
        nextFacturaId: estado.nextFacturaId + 1,
        prefacturas: estado.prefacturas.map((p) =>
          p.id === pf.id ? { ...p, estado: "facturada" } : p
        ),
      };
    }

    case "marcarFacturaCobrada":
      return {
        ...estado,
        facturas: estado.facturas.map((f) =>
          f.id === accion.id && f.estado === "pendiente" ? { ...f, estado: "cobrada" } : f
        ),
      };

    // Las facturas recibidas nacen PAGADAS: son compras ya pagadas de la
    // empresa (requisito para poder practicar la retención). El egreso se
    // asienta en Finanzas desde la UI (patrón de dos llamadas).
    case "crearFacturaRecibida":
      return {
        ...estado,
        facturasRecibidas: [
          ...estado.facturasRecibidas,
          { id: estado.nextFacturaRecibidaId, ...accion.datos, estado: "pagada" },
        ],
        nextFacturaRecibidaId: estado.nextFacturaRecibidaId + 1,
      };

    case "editarFacturaRecibida":
      return {
        ...estado,
        facturasRecibidas: estado.facturasRecibidas.map((c) =>
          // Con retención generada quedan congeladas.
          c.id === accion.id && !c.retencionId ? { ...c, ...accion.datos } : c
        ),
      };

    case "eliminarFacturaRecibida":
      return {
        ...estado,
        // Eliminable mientras no tenga retención (la reversa en Finanzas la
        // dispara la UI). Con retención generada queda congelada.
        facturasRecibidas: estado.facturasRecibidas.filter(
          (c) => c.id !== accion.id || !!c.retencionId
        ),
      };

    case "crearCuentaPorPagar":
      return {
        ...estado,
        cuentasPorPagar: [
          ...estado.cuentasPorPagar,
          { id: estado.nextCuentaPorPagarId, ...accion.datos, estado: "pendiente" },
        ],
        nextCuentaPorPagarId: estado.nextCuentaPorPagarId + 1,
      };

    case "editarCuentaPorPagar":
      return {
        ...estado,
        cuentasPorPagar: estado.cuentasPorPagar.map((d) =>
          d.id === accion.id && d.estado === "pendiente" ? { ...d, ...accion.datos } : d
        ),
      };

    case "eliminarCuentaPorPagar":
      return {
        ...estado,
        cuentasPorPagar: estado.cuentasPorPagar.filter(
          (d) => d.id !== accion.id || d.estado !== "pendiente"
        ),
      };

    case "setVencimientoCuentaPorPagar":
      return {
        ...estado,
        cuentasPorPagar: estado.cuentasPorPagar.map((d) =>
          d.id === accion.id ? { ...d, fechaVencimiento: accion.fecha || undefined } : d
        ),
      };

    // Pago de una cuenta por pagar: crea la factura recibida (ya pagada) con
    // los datos fiscales capturados y marca la cuenta como pagada, enlazándola.
    case "pagarCuentaPorPagar": {
      const cuenta = estado.cuentasPorPagar.find((d) => d.id === accion.id);
      if (!cuenta || cuenta.estado !== "pendiente") return estado;
      const nuevaId = estado.nextFacturaRecibidaId;
      return {
        ...estado,
        facturasRecibidas: [
          ...estado.facturasRecibidas,
          { id: nuevaId, ...accion.datos, estado: "pagada" },
        ],
        nextFacturaRecibidaId: nuevaId + 1,
        cuentasPorPagar: estado.cuentasPorPagar.map((d) =>
          d.id === accion.id ? { ...d, estado: "pagada", facturaRecibidaId: nuevaId } : d
        ),
      };
    }

    // Fecha vacía ⇒ se quita el vencimiento (la cuenta deja de vencer).
    case "setVencimientoFactura":
      return {
        ...estado,
        facturas: estado.facturas.map((f) =>
          f.id === accion.id ? { ...f, fechaVencimiento: accion.fecha || undefined } : f
        ),
      };

    case "crearRetencion": {
      // Comprobante único y, si nace de una factura, esta no debe tener otra.
      if (estado.retenciones.some((r) => r.comprobante === accion.datos.comprobante))
        return estado;
      const compra = accion.datos.facturaRecibidaId
        ? estado.facturasRecibidas.find((c) => c.id === accion.datos.facturaRecibidaId)
        : undefined;
      if (accion.datos.facturaRecibidaId && (!compra || compra.retencionId)) return estado;
      const id = estado.nextRetencionId;
      return {
        ...estado,
        retenciones: [...estado.retenciones, { id, ...accion.datos }],
        nextRetencionId: id + 1,
        facturasRecibidas: compra
          ? estado.facturasRecibidas.map((c) =>
              c.id === compra.id ? { ...c, retencionId: id } : c
            )
          : estado.facturasRecibidas,
      };
    }

    case "eliminarRetencion":
      return {
        ...estado,
        retenciones: estado.retenciones.filter((r) => r.id !== accion.id),
        facturasRecibidas: estado.facturasRecibidas.map((c) =>
          c.retencionId === accion.id ? { ...c, retencionId: undefined } : c
        ),
      };

    case "crearTarifa":
      return {
        ...estado,
        tarifas: [...estado.tarifas, { id: estado.nextTarifaId, ...accion.datos }],
        nextTarifaId: estado.nextTarifaId + 1,
      };

    case "editarTarifa":
      return {
        ...estado,
        tarifas: estado.tarifas.map((t) =>
          t.id === accion.id ? { id: t.id, ...accion.datos } : t
        ),
      };

    case "eliminarTarifa":
      return {
        ...estado,
        tarifas: estado.tarifas.filter((t) => t.id !== accion.id),
      };

    case "setCalibracionCampo":
      return {
        ...estado,
        calibracion: {
          ...estado.calibracion,
          campos: { ...estado.calibracion.campos, [accion.campo]: accion.pos },
        },
      };

    case "setCalibracionBase":
      return { ...estado, calibracion: { ...estado.calibracion, ...accion.valores } };

    case "resetCalibracion":
      return { ...estado, calibracion: CALIBRACION_DEFAULT };
  }
}

/* ===================== Context + hook ===================== */

interface FacturacionContexto {
  clientes: Cliente[];
  proveedores: Proveedor[];
  reportes: ReporteServicio[];
  prefacturas: PreFactura[];
  facturas: Factura[];
  facturasRecibidas: FacturaRecibida[];
  cuentasPorPagar: CuentaPorPagar[];
  retenciones: Retencion[];
  tarifas: TarifaServicio[];
  calibracion: CalibracionPlantilla;
  /** Ids que recibirá el próximo registro (autoselección al crear al vuelo). */
  nextClienteId: number;
  nextProveedorId: number;
  /** Id que recibirá la próxima factura recibida (para enlazar el pago en Finanzas). */
  nextFacturaRecibidaId: number;
  clientePorId: (id: number) => Cliente | undefined;
  proveedorPorId: (id: number) => Proveedor | undefined;
  retencionDeCompra: (facturaRecibidaId: number) => Retencion | undefined;
  siguienteNumeroPrefactura: () => string;
  siguienteComprobanteDe: (anio: number, mes: number) => string;
  crearCliente: (datos: Omit<Cliente, "id">) => void;
  crearProveedor: (datos: Omit<Proveedor, "id">) => void;
  crearReporte: (datos: ReporteDatos) => void;
  editarReporte: (id: number, datos: ReporteDatos) => void;
  eliminarReporte: (id: number) => void;
  crearPrefactura: (datos: PrefacturaDatos, reporteIds: number[]) => void;
  editarPrefactura: (id: number, datos: PrefacturaDatos) => void;
  emitirPrefactura: (id: number) => void;
  eliminarPrefactura: (id: number) => void;
  generarFactura: (prefacturaId: number, datos: GenerarFacturaDatos) => void;
  marcarFacturaCobrada: (id: number) => void;
  crearFacturaRecibida: (datos: FacturaRecibidaDatos) => void;
  editarFacturaRecibida: (id: number, datos: FacturaRecibidaDatos) => void;
  eliminarFacturaRecibida: (id: number) => void;
  crearCuentaPorPagar: (datos: CuentaPorPagarDatos) => void;
  editarCuentaPorPagar: (id: number, datos: CuentaPorPagarDatos) => void;
  eliminarCuentaPorPagar: (id: number) => void;
  setVencimientoCuentaPorPagar: (id: number, fecha: string) => void;
  pagarCuentaPorPagar: (id: number, datos: FacturaRecibidaDatos) => void;
  setVencimientoFactura: (id: number, fecha: string) => void;
  crearRetencion: (datos: RetencionDatos) => void;
  eliminarRetencion: (id: number) => void;
  crearTarifa: (datos: TarifaDatos) => void;
  editarTarifa: (id: number, datos: TarifaDatos) => void;
  eliminarTarifa: (id: number) => void;
  setCalibracionCampo: (campo: CampoPlantilla, pos: PosicionMm) => void;
  setCalibracionBase: (valores: Partial<Omit<CalibracionPlantilla, "campos">>) => void;
  resetCalibracion: () => void;
}

const Contexto = createContext<FacturacionContexto | null>(null);

export function FacturacionProvider({ children }: { children: React.ReactNode }) {
  const [estado, dispatch] = useReducer(reducer, ESTADO_INICIAL);

  const valor = useMemo<FacturacionContexto>(
    () => ({
      clientes: estado.clientes,
      proveedores: estado.proveedores,
      reportes: estado.reportes,
      prefacturas: estado.prefacturas,
      facturas: estado.facturas,
      facturasRecibidas: estado.facturasRecibidas,
      cuentasPorPagar: estado.cuentasPorPagar,
      retenciones: estado.retenciones,
      tarifas: estado.tarifas,
      calibracion: estado.calibracion,
      nextClienteId: estado.nextClienteId,
      nextProveedorId: estado.nextProveedorId,
      nextFacturaRecibidaId: estado.nextFacturaRecibidaId,
      clientePorId: (id) => estado.clientes.find((c) => c.id === id),
      proveedorPorId: (id) => estado.proveedores.find((p) => p.id === id),
      retencionDeCompra: (facturaRecibidaId) =>
        estado.retenciones.find((r) => r.facturaRecibidaId === facturaRecibidaId),
      siguienteNumeroPrefactura: () =>
        siguienteNumero(estado.prefacturas.map((p) => p.numero)),
      siguienteComprobanteDe: (anio, mes) =>
        siguienteComprobante(anio, mes, estado.retenciones.map((r) => r.comprobante)),
      crearCliente: (datos) => dispatch({ tipo: "crearCliente", datos }),
      crearProveedor: (datos) => dispatch({ tipo: "crearProveedor", datos }),
      crearReporte: (datos) => dispatch({ tipo: "crearReporte", datos }),
      editarReporte: (id, datos) => dispatch({ tipo: "editarReporte", id, datos }),
      eliminarReporte: (id) => dispatch({ tipo: "eliminarReporte", id }),
      crearPrefactura: (datos, reporteIds) =>
        dispatch({ tipo: "crearPrefactura", datos, reporteIds }),
      editarPrefactura: (id, datos) => dispatch({ tipo: "editarPrefactura", id, datos }),
      emitirPrefactura: (id) => dispatch({ tipo: "emitirPrefactura", id }),
      eliminarPrefactura: (id) => dispatch({ tipo: "eliminarPrefactura", id }),
      generarFactura: (prefacturaId, datos) =>
        dispatch({ tipo: "generarFactura", prefacturaId, datos }),
      marcarFacturaCobrada: (id) => dispatch({ tipo: "marcarFacturaCobrada", id }),
      crearFacturaRecibida: (datos) => dispatch({ tipo: "crearFacturaRecibida", datos }),
      editarFacturaRecibida: (id, datos) =>
        dispatch({ tipo: "editarFacturaRecibida", id, datos }),
      eliminarFacturaRecibida: (id) => dispatch({ tipo: "eliminarFacturaRecibida", id }),
      crearCuentaPorPagar: (datos) => dispatch({ tipo: "crearCuentaPorPagar", datos }),
      editarCuentaPorPagar: (id, datos) =>
        dispatch({ tipo: "editarCuentaPorPagar", id, datos }),
      eliminarCuentaPorPagar: (id) => dispatch({ tipo: "eliminarCuentaPorPagar", id }),
      setVencimientoCuentaPorPagar: (id, fecha) =>
        dispatch({ tipo: "setVencimientoCuentaPorPagar", id, fecha }),
      pagarCuentaPorPagar: (id, datos) => dispatch({ tipo: "pagarCuentaPorPagar", id, datos }),
      setVencimientoFactura: (id, fecha) => dispatch({ tipo: "setVencimientoFactura", id, fecha }),
      crearRetencion: (datos) => dispatch({ tipo: "crearRetencion", datos }),
      eliminarRetencion: (id) => dispatch({ tipo: "eliminarRetencion", id }),
      crearTarifa: (datos) => dispatch({ tipo: "crearTarifa", datos }),
      editarTarifa: (id, datos) => dispatch({ tipo: "editarTarifa", id, datos }),
      eliminarTarifa: (id) => dispatch({ tipo: "eliminarTarifa", id }),
      setCalibracionCampo: (campo, pos) => dispatch({ tipo: "setCalibracionCampo", campo, pos }),
      setCalibracionBase: (valores) => dispatch({ tipo: "setCalibracionBase", valores }),
      resetCalibracion: () => dispatch({ tipo: "resetCalibracion" }),
    }),
    [estado]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useFacturacion(): FacturacionContexto {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useFacturacion debe usarse dentro de <FacturacionProvider>");
  return ctx;
}
