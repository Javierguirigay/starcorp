/**
 * Cartera (cuentas por cobrar y por pagar): funciones puras.
 * Por cobrar se deriva de las facturas de venta pendientes (no hay modelo
 * aparte). Por pagar se deriva del modelo propio CuentaPorPagar (notas de
 * entrega / facturas administrativas pendientes de pago).
 * Los montos viven en Bs (el equivalente en USD lo aplica la UI con la tasa
 * vigente, que no es un dato del documento).
 */
import type {
  Cliente,
  CuentaPorPagar,
  Factura,
  Proveedor,
  TipoDocPorPagar,
} from "../types";
import { totalesRenglones } from "./facturacion";
import { round2 } from "./nomina";

/** Días de antelación con los que una cuenta se considera "por vencer". */
export const DIAS_POR_VENCER = 7;

export type EstadoCartera = "sin-fecha" | "al-dia" | "por-vencer" | "vencida";

export interface FilaCartera {
  id: number;
  documento: string; // N° de factura
  contraparte: string; // cliente o proveedor
  rif: string;
  fecha: string; // ISO (emisión / documento)
  fechaVencimiento?: string; // ISO
  totalBs: number;
  estado: EstadoCartera;
  /** Días vencida (estado "vencida") o días que faltan (resto). 0 sin fecha. */
  dias: number;
}

/** Días completos entre dos fechas ISO (positivo si `hasta` es posterior). */
function diasEntre(desde: string, hasta: string): number {
  const MS_DIA = 86_400_000;
  return Math.round((Date.parse(`${hasta}T00:00:00`) - Date.parse(`${desde}T00:00:00`)) / MS_DIA);
}

/**
 * Estado de una cuenta según su vencimiento. Sin fecha pactada no puede
 * vencer: queda "sin-fecha" (la UI invita a ponérsela).
 */
export function estadoVencimiento(
  fechaVencimiento: string | undefined,
  hoy: string
): { estado: EstadoCartera; dias: number } {
  if (!fechaVencimiento) return { estado: "sin-fecha", dias: 0 };
  const restantes = diasEntre(hoy, fechaVencimiento);
  if (restantes < 0) return { estado: "vencida", dias: -restantes };
  if (restantes <= DIAS_POR_VENCER) return { estado: "por-vencer", dias: restantes };
  return { estado: "al-dia", dias: restantes };
}

/** Lo vencido primero, luego lo más próximo a vencer; sin fecha al final. */
function ordenarPorUrgencia<T extends FilaCartera>(filas: T[]): T[] {
  const peso: Record<EstadoCartera, number> = {
    vencida: 0,
    "por-vencer": 1,
    "al-dia": 2,
    "sin-fecha": 3,
  };
  return [...filas].sort((a, b) =>
    peso[a.estado] !== peso[b.estado]
      ? peso[a.estado] - peso[b.estado]
      : (a.fechaVencimiento ?? "") < (b.fechaVencimiento ?? "")
        ? -1
        : 1
  );
}

/** Facturas de venta aún no cobradas. El total se calcula desde los renglones. */
export function cuentasPorCobrar(
  facturas: Factura[],
  clientes: Cliente[],
  hoy: string
): FilaCartera[] {
  const filas = facturas
    .filter((f) => f.estado === "pendiente")
    .map((f) => {
      const c = clientes.find((x) => x.id === f.clienteId);
      const { estado, dias } = estadoVencimiento(f.fechaVencimiento, hoy);
      return {
        id: f.id,
        documento: f.numeroFactura,
        contraparte: c?.razonSocial ?? "—",
        rif: c?.rif ?? "—",
        fecha: f.fechaEmision,
        fechaVencimiento: f.fechaVencimiento,
        totalBs: totalesRenglones(f.renglones).total,
        estado,
        dias,
      };
    });
  return ordenarPorUrgencia(filas);
}

/** Fila de por pagar: además del común, lleva el tipo de documento. */
export interface FilaPorPagar extends FilaCartera {
  tipoDoc: TipoDocPorPagar;
}

/** Documentos por pagar (notas de entrega / facturas) aún pendientes de pago. */
export function cuentasPorPagar(
  docs: CuentaPorPagar[],
  proveedores: Proveedor[],
  hoy: string
): FilaPorPagar[] {
  const filas = docs
    .filter((d) => d.estado === "pendiente")
    .map((d) => {
      const p = proveedores.find((x) => x.id === d.proveedorId);
      const { estado, dias } = estadoVencimiento(d.fechaVencimiento, hoy);
      return {
        id: d.id,
        documento: d.numeroDocumento,
        contraparte: p?.razonSocial ?? "—",
        rif: p?.rif ?? "—",
        fecha: d.fecha,
        fechaVencimiento: d.fechaVencimiento,
        totalBs: d.totalBs,
        estado,
        dias,
        tipoDoc: d.tipo,
      };
    });
  return ordenarPorUrgencia(filas);
}

export interface TotalesCartera {
  pendienteBs: number;
  vencidoBs: number;
  porVencerBs: number;
  cantidad: number;
  cantidadVencidas: number;
}

export function totalesCartera(filas: FilaCartera[]): TotalesCartera {
  const suma = (fs: FilaCartera[]) => round2(fs.reduce((s, f) => s + f.totalBs, 0));
  const vencidas = filas.filter((f) => f.estado === "vencida");
  return {
    pendienteBs: suma(filas),
    vencidoBs: suma(vencidas),
    porVencerBs: suma(filas.filter((f) => f.estado === "por-vencer")),
    cantidad: filas.length,
    cantidadVencidas: vencidas.length,
  };
}
