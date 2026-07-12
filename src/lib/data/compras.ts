/**
 * Seeds del sub-módulo Gestión de Compras, transcritos del libro de compras
 * real de JULIO 2026 y del comprobante de retención 20260700000061
 * (/docs/referencias). Verificación del período: compras con IVA 328.752,70;
 * base imponible 283.407,50; créditos fiscales 45.345,20; todas con retención
 * del 75 % (comprobantes 20260700000054 … 20260700000061).
 */
import type { FacturaRecibida, Proveedor, Retencion } from "../types";
import { lineaDesdeCompra, totalizarLineas } from "../negocio/retenciones";

export const PROVEEDORES_SEED: Proveedor[] = [
  { id: 1, razonSocial: "INBIOBRI, C.A.", rif: "J-312509430", direccion: "Zona Industrial, Calle 4, Galpón 12, Maturín, Estado Monagas", tipo: "Suministros industriales" },
  { id: 2, razonSocial: "MANGUERAS Y CONEXIONES M.B, C.A.", rif: "J-31094257-9", direccion: "Av. Alirio Ugarte Pelayo, Local M.B, Maturín, Estado Monagas", tipo: "Repuestos e insumos" },
  { id: 3, razonSocial: "FRENOS Y SILENCIADORES GUSTAVO C.A", rif: "J-30220699-5", direccion: "Av. Libertador, Sector Centro, Maturín, Estado Monagas", tipo: "Taller automotriz" },
  { id: 4, razonSocial: "FRIO CENTER MONAGAS 248832, C.A", rif: "J-50333430-4", direccion: "Calle Bolívar, Local 24, Maturín, Estado Monagas", tipo: "Refrigeración" },
  { id: 5, razonSocial: "SOLUCION MR. LIMPIATODO, C.A", rif: "J-50076217-8", direccion: "Av. Raúl Leoni, Centro Comercial El Parque, Maturín, Estado Monagas", tipo: "Artículos de limpieza" },
  { id: 6, razonSocial: "EMPRENDIMIENTO EDRIMER ESPINOZA", rif: "J-50612209-0", direccion: "Vía Principal La Cruz de la Paloma, Maturín, Estado Monagas", tipo: "Servicios generales" },
  { id: 7, razonSocial: "EL REY DEL SYNTEC, C.A.", rif: "J-29851354-3", direccion: "Av. Bolívar, Sector Las Avenidas, Maturín, Estado Monagas", tipo: "Lubricantes" },
  { id: 8, razonSocial: "FASCINACION AUTOTIENDA, C.A.", rif: "J-500074735", direccion: "Carrera 9 con Calle 26-A, Edif. Centro Empresarial Fascinación, Piso Mezzanina, Local Nro. 01, Sector Centro, Maturín, Estado Monagas", tipo: "Autopartes" },
];

export const NEXT_PROVEEDOR_ID = 9;

/* Las 8 operaciones del libro real de julio (retencionId 1..8 = 75 % c/u). */
export const FACTURAS_RECIBIDAS_SEED: FacturaRecibida[] = [
  { id: 1, proveedorId: 1, numeroFactura: "5529", numeroControl: "Z7C7041516", fecha: "2026-07-02", tipoTransaccion: "01", totalConIvaBs: 31982.44, sinCreditoBs: 0, baseImponibleBs: 27571.07, impuestoIvaBs: 4411.37, estado: "pendiente", retencionId: 1 },
  { id: 2, proveedorId: 2, numeroFactura: "17411", numeroControl: "ZZP0001841", fecha: "2026-07-02", tipoTransaccion: "01", totalConIvaBs: 75526.06, sinCreditoBs: 0, baseImponibleBs: 65108.67, impuestoIvaBs: 10417.39, estado: "pendiente", retencionId: 2 },
  { id: 3, proveedorId: 3, numeroFactura: "004073", numeroControl: "1FC7000690", fecha: "2026-07-02", tipoTransaccion: "01", totalConIvaBs: 37102.6, sinCreditoBs: 0, baseImponibleBs: 31985.0, impuestoIvaBs: 5117.6, estado: "pendiente", retencionId: 3 },
  { id: 4, proveedorId: 2, numeroFactura: "17516", numeroControl: "ZZP0001841", fecha: "2026-07-08", tipoTransaccion: "01", totalConIvaBs: 4065.61, sinCreditoBs: 0, baseImponibleBs: 3504.84, impuestoIvaBs: 560.77, estado: "pendiente", retencionId: 4 },
  { id: 5, proveedorId: 4, numeroFactura: "000050", numeroControl: "00-001900", fecha: "2026-07-08", tipoTransaccion: "01", totalConIvaBs: 2721.27, sinCreditoBs: 0, baseImponibleBs: 2345.92, impuestoIvaBs: 375.35, estado: "pendiente", retencionId: 5 },
  { id: 6, proveedorId: 5, numeroFactura: "003122", numeroControl: "00-006122", fecha: "2026-07-09", tipoTransaccion: "01", totalConIvaBs: 2760.0, sinCreditoBs: 0, baseImponibleBs: 2379.31, impuestoIvaBs: 380.69, estado: "pendiente", retencionId: 6 },
  { id: 7, proveedorId: 6, numeroFactura: "000249", numeroControl: "00-000249", fecha: "2026-07-10", tipoTransaccion: "01", totalConIvaBs: 166362.27, sinCreditoBs: 0, baseImponibleBs: 143415.75, impuestoIvaBs: 22946.52, estado: "pendiente", retencionId: 7 },
  { id: 8, proveedorId: 7, numeroFactura: "02509", numeroControl: "Z6B3001431", fecha: "2026-07-10", tipoTransaccion: "01", totalConIvaBs: 8232.45, sinCreditoBs: 0, baseImponibleBs: 7096.94, impuestoIvaBs: 1135.51, estado: "pendiente", retencionId: 8 },
];

export const NEXT_FACTURA_RECIBIDA_ID = 9;

/* Comprobantes 20260700000054..61 (correlativo del período julio 2026),
   uno por compra, todos al 75 %, emitidos el 11/07/2026 (fecha del
   comprobante real de referencia). */
export const RETENCIONES_SEED: Retencion[] = FACTURAS_RECIBIDAS_SEED.map((compra, i) => {
  const linea = lineaDesdeCompra(compra, 1, 75);
  const totales = totalizarLineas([linea]);
  return {
    id: i + 1,
    comprobante: `202607${String(54 + i).padStart(8, "0")}`,
    fechaEmision: "2026-07-11",
    periodoAnio: 2026,
    periodoMes: 7,
    proveedorId: compra.proveedorId,
    pct: 75,
    facturaRecibidaId: compra.id,
    lineas: [linea],
    ...totales,
  };
});

export const NEXT_RETENCION_ID = 9;
