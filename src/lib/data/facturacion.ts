/**
 * Seeds del sub-módulo Facturación, transcritos de los documentos reales de
 * /docs/referencias (reportes 00384/00388, prefacturas 066/068 y factura
 * fiscal 000116 emitida desde la 066 a tasa 602,33).
 */
import type {
  CalibracionPlantilla,
  Cliente,
  Factura,
  PreFactura,
  ReporteServicio,
} from "../types";

export const CLIENTES_SEED: Cliente[] = [
  {
    id: 1,
    razonSocial: "GO WIRELINE SERVICES, C.A",
    rif: "J-50158526-1",
    domicilio: 'Calle Callejon Nro 05, Local S/N, Sector la "L", Ciudad Ojeda, Estado Zulia.',
    telefono: "",
  },
  {
    id: 2,
    razonSocial: "CORPORACION IESV C.A",
    rif: "J-40307201-9",
    domicilio: "ZONA INDUSTRIAL, CALLE 10, MANZANA 4, PARCELA 8, MATURIN MONAGAS",
    telefono: "0424-9068376",
  },
];

export const NEXT_CLIENTE_ID = 3;

export const REPORTES_SEED: ReporteServicio[] = [
  {
    id: 1,
    numeroControl: "00384",
    fecha: "2026-06-12",
    clienteId: 2,
    locacion: "Punta de Mata",
    pozo: "MUC-102",
    tipoEquipo: "Generador",
    descripcion:
      "Servicio de alquiler de generador de 35 KVA, pozo MUC-102, desde el 03/06/2026 al 12/06/2026; total de días de servicio: 10.",
    periodos: [
      {
        id: 1,
        concepto: "SERVICIO DE ALQUILER DE GENERADOR DE 35 KVA",
        desde: "2026-06-03",
        hasta: "2026-06-12",
        dias: 10,
      },
    ],
    supervisorNombre: "Carlos González",
    supervisorCI: "10.063.348",
    estado: "pendiente",
  },
  {
    id: 2,
    numeroControl: "00388",
    fecha: "2026-06-16",
    clienteId: 2,
    locacion: "Santa Bárbara",
    pozo: "SBC-37",
    tipoEquipo: "Luminarias",
    descripcion:
      "Servicio de alquiler de luminarias tipo jirafa, pozo SBC-37. Inicio de luminaria #1: 13/06/2026; #2: 14/06/2026; #3: 15/06/2026.",
    // Cada luminaria inicia en fecha distinta (formato real del reporte).
    periodos: [
      { id: 1, concepto: "SERVICIO DE ALQUILER DE LUMINARIA MARCA COLEMAN TIPO JIRAFA", desde: "2026-06-13", hasta: "2026-07-01", dias: 19 },
      { id: 2, concepto: "SERVICIO DE ALQUILER DE LUMINARIA MARCA MAGNUN (I) TIPO JIRAFA", desde: "2026-06-14", hasta: "2026-07-01", dias: 18 },
      { id: 3, concepto: "SERVICIO DE ALQUILER DE LUMINARIA MARCA MAGNUN (II) TIPO JIRAFA", desde: "2026-06-15", hasta: "2026-07-01", dias: 17 },
    ],
    supervisorNombre: "Carlos González",
    supervisorCI: "10.063.348",
    estado: "prefacturado",
  },
];

export const NEXT_REPORTE_ID = 3;

/* Prefactura 066: verificación 1×$250 + 2×$260 = $770,00; IVA $123,20; total $893,20. */
export const PREFACTURAS_SEED: PreFactura[] = [
  {
    id: 1,
    numero: "066",
    fecha: "2026-06-17",
    clienteId: 1,
    condicionesPago: "",
    renglones: [
      {
        id: 1,
        can: 1,
        descripcion:
          "SERVICIO DE ALQUILER DE CHUTO PARA TRASLADO DE VACUUM DESDE BASE GO WIRELINE SERVICES, ZONA INDUSTRIAL MATURIN HASTA BASE DE OPERACIONES LOTER, PUNTA DE MATA. (12/06/2026)",
        pUnit: 250,
      },
      {
        id: 2,
        can: 2,
        descripcion: "SERVICIO DE ALQUILER DE VACUUM DESDE (10/06/2026) HASTA (11/06/2026)",
        pUnit: 260,
      },
    ],
    locacion: "BASE GO WIRELINE SERVICES, C.A, ZONA INDUSTRIAL MATURIN",
    estado: "facturada",
    reporteIds: [],
  },
  {
    id: 2,
    numero: "068",
    fecha: "2026-07-02",
    clienteId: 2,
    condicionesPago: "",
    renglones: [
      { id: 1, can: 19, descripcion: "SERVICIO DE ALQUILER DE LUMINARIA MARCA COLEMAN TIPO JIRAFA DEL 13/06/2026 AL 01/07/2026", pUnit: 70 },
      { id: 2, can: 18, descripcion: "SERVICIO DE ALQUILER DE LUMINARIA MARCA MAGNUN (I) TIPO JIRAFA DEL 14/06/2026 AL 01/07/2026", pUnit: 70 },
      { id: 3, can: 17, descripcion: "SERVICIO DE ALQUILER DE LUMINARIA MARCA MAGNUN (II) TIPO JIRAFA DEL 15/06/2026 AL 01/07/2026", pUnit: 70 },
      { id: 4, can: 1, descripcion: "SERVICIO DE TRASLADO DE LUMINARIAS (IDA Y VUELTA) : 3 UNIDADES", pUnit: 160 },
      { id: 5, can: 18, descripcion: "SERVICIO DE ALQUILER DE GENERADOR DE 35 KVA DEL 14/06/2026 AL 01/07/2026", pUnit: 105 },
      { id: 6, can: 1, descripcion: "SERVICIO DE TRASLADO DE GENERADOR DE 35 KVA (IDA Y VUELTA) 1 UNIDAD", pUnit: 150 },
    ],
    locacion: "POZO SBC-37",
    estado: "emitida",
    reporteIds: [2],
  },
];

export const NEXT_PREFACTURA_ID = 3;

/* Factura 000116 (desde la 066 a tasa 602,33, conversión por unitario):
   $250 → Bs 150.582,50; $260 → Bs 156.605,80;
   subtotal Bs 463.794,10; IVA Bs 74.207,06; total Bs 538.001,16. */
export const FACTURAS_SEED: Factura[] = [
  {
    id: 1,
    prefacturaId: 1,
    numeroFactura: "000116",
    numeroControl: "00-000116",
    fechaEmision: "2026-06-18",
    clienteId: 1,
    tasaBs: 602.33,
    renglones: [
      {
        id: 1,
        can: 1,
        descripcion:
          "SERVICIO DE TRASLADO DE VACUUM DESDE LA BASE GO WIRELINE SERVICES, C.A., ZONA INDUSTRIAL DE MATURIN, HASTA LA BASE DE OPERACIONES LOTER, C.A. PUNTA DE MATA (12/06/2026).",
        pUnit: 150582.5,
      },
      {
        id: 2,
        can: 2,
        descripcion: "SERVICIO DE ALQUILER DE VACUUM DESDE EL 10/06/2026 HASTA EL 11/06/2026",
        pUnit: 156605.8,
      },
    ],
    locacion: "BASE GO WIRELINE SERVICES, C.A, ZONA INDUSTRIAL MATURIN",
    condicionesPago: "",
    estado: "pendiente",
  },
];

export const NEXT_FACTURA_ID = 2;

/* Posiciones por defecto de la plantilla de impresión (mm, carta), estimadas
   del PDF real "plantilla_impresion_factura"; el usuario las ajusta imprimiendo
   pruebas desde la pantalla de calibración. */
export const CALIBRACION_DEFAULT: CalibracionPlantilla = {
  campos: {
    razonSocial: { x: 54, y: 56 },
    fecha: { x: 163, y: 56 },
    domicilio: { x: 46, y: 63 },
    telefono: { x: 30, y: 77 },
    rif: { x: 150, y: 70 },
    condiciones: { x: 100, y: 77 },
    renglones: { x: 22, y: 88 },
    alicuota: { x: 152, y: 231 },
    subtotal: { x: 191, y: 224 },
    iva: { x: 191, y: 231 },
    total: { x: 191, y: 238 },
  },
  global: { x: 0, y: 0 },
  alturaFilaMm: 11,
  colDescXMm: 37,
  colPUnitXMm: 156,
  colTotalXMm: 191,
};
