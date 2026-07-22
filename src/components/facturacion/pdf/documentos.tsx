/**
 * Documentos PDF del sub-módulo Facturación: pre-factura / factura (registro),
 * plantilla de impresión sobre papel fiscal y libro de ventas.
 * Réplica de los formatos reales de /docs/referencias (prefacturas 066/068 y
 * factura 000116). Único módulo de facturación-ventas que importa
 * @react-pdf/renderer: cargarlo SIEMPRE con `await import(...)` desde un
 * handler de cliente.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CalibracionPlantilla, Cliente, Empresa, Factura, RenglonFactura } from "@/lib/types";
import { datosFiscalesDe } from "@/lib/empresaFiscal";
import { MembreteEmpresa, membreteDeEmpresa } from "@/components/pdf/Membrete";
import { formatNumberVE } from "@/lib/format";
import {
  fechaDoc,
  fechaDocCorta,
  totalesRenglones,
  totalRenglon,
  type FilaLibroVentas,
  type TotalesLibroVentas,
} from "@/lib/negocio/facturacion";

const NAVY = "#0F2742";
const GOLD = "#D08F00";
const NEGRO = "#111111";

/* Formato de los documentos reales: "$1.330,00" / "150.582,50" (sin espacio). */
const dinero = (n: number, sym = "") => sym + formatNumberVE(n);

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 8, color: NEGRO },
  /* Encabezado */
  cabecera: { flexDirection: "row", justifyContent: "space-between" },
  logoTexto: { width: 150 },
  logoLoter: { fontFamily: "Helvetica-Bold", fontSize: 26, color: NAVY, letterSpacing: 2 },
  logoSub: { fontFamily: "Helvetica-Bold", fontSize: 6, color: GOLD, letterSpacing: 2.4, marginTop: 1 },
  cabDerecha: { width: 300, alignItems: "flex-end" },
  cabRazon: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  cabLinea: { fontSize: 7, marginTop: 1.5, textAlign: "right" },
  cabRegla: { borderBottomWidth: 2, borderBottomColor: NEGRO, alignSelf: "stretch", marginTop: 3 },
  cabTelefonos: { fontSize: 7, marginTop: 2, textAlign: "right" },
  /* Recuadro del número */
  tituloCaja: {
    alignSelf: "flex-end",
    borderWidth: 1.5,
    borderColor: NEGRO,
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    minWidth: 220,
  },
  tituloFila: { flexDirection: "row", justifyContent: "space-between" },
  tituloTexto: { fontFamily: "Helvetica-Bold", fontSize: 12 },
  /* Recuadro del cliente */
  clienteCaja: { borderWidth: 1, borderColor: NEGRO, marginTop: 12, padding: 8 },
  clienteFila: { flexDirection: "row", marginVertical: 3 },
  etq: { fontFamily: "Helvetica-Bold", fontSize: 8 },
  val: { fontSize: 8, flexShrink: 1 },
  /* Tabla de renglones */
  tabla: { borderWidth: 1, borderColor: NEGRO, marginTop: 12 },
  tCab: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: NEGRO },
  tCabCelda: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textAlign: "center",
    paddingVertical: 3,
  },
  cuerpo: { position: "relative", height: 380 },
  fila: { flexDirection: "row" },
  cCan: { width: 34, textAlign: "center", paddingVertical: 4, paddingHorizontal: 2 },
  cDesc: { flex: 1, paddingVertical: 4, paddingHorizontal: 6 },
  cMonto: { width: 92, textAlign: "right", paddingVertical: 4, paddingHorizontal: 6 },
  cTotal: { width: 82, textAlign: "right", paddingVertical: 4, paddingHorizontal: 6 },
  sep: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: NEGRO },
  locacion: { position: "absolute", bottom: 6, left: 40, fontSize: 8 },
  /* Formato real: la línea horizontal de cada fila de totales abarca SOLO las
     columnas P. UNIT. y TOTAL; CAN y DESCRIPCIÓN quedan abiertas hasta abajo. */
  pieFila: { flexDirection: "row" },
  pieEtq: {
    width: 92,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: NEGRO,
  },
  pieVal: {
    width: 82,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textAlign: "right",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: NEGRO,
  },
});

/* Membrete de la empresa emisora (para LOTER reproduce su encabezado histórico
   vía DATOS_LOTER). */
function Encabezado({ empresa }: { empresa: Empresa }) {
  return <MembreteEmpresa datos={membreteDeEmpresa(empresa)} />;
}

/* ============ Pre-factura / Factura (registro interno) ============ */

export function DocumentoVenta({
  variante,
  numero,
  numeroControl,
  fecha,
  cliente,
  condicionesPago,
  renglones,
  locacion,
  empresa,
}: {
  variante: "prefactura" | "factura";
  numero: string;
  numeroControl?: string;
  fecha: string; // ISO
  cliente: Cliente;
  condicionesPago: string;
  renglones: RenglonFactura[];
  locacion: string;
  empresa: Empresa;
}) {
  const esPre = variante === "prefactura";
  const sym = esPre ? "$" : "";
  const bs = esPre ? "" : " Bs.";
  const t = totalesRenglones(renglones);
  // Separadores verticales alineados con los anchos de columna (34/flex/92/82).
  const sepIzq = 34;
  const sepMonto = 92 + 82;
  const sepTotal = 82;
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <Encabezado empresa={empresa} />

        <View style={s.tituloCaja}>
          <View style={s.tituloFila}>
            <Text style={s.tituloTexto}>{esPre ? "PREFACTURA Nº" : "FACTURA Nº"}</Text>
            <Text style={s.tituloTexto}>{numero}</Text>
          </View>
          {!esPre && (
            <View style={[s.tituloFila, { marginTop: 3 }]}>
              <Text style={s.tituloTexto}>CONTROL Nº</Text>
              <Text style={s.tituloTexto}>{numeroControl}</Text>
            </View>
          )}
        </View>

        <View style={s.clienteCaja}>
          <View style={[s.clienteFila, { justifyContent: "space-between" }]}>
            <Text style={{ flexShrink: 1 }}>
              <Text style={s.etq}>Nombre o Razón Social:   </Text>
              <Text style={s.val}>{cliente.razonSocial}</Text>
            </Text>
            <Text>
              <Text style={s.etq}>Fecha:   </Text>
              <Text style={s.val}>{fechaDocCorta(fecha)}</Text>
            </Text>
          </View>
          <View style={s.clienteFila}>
            <Text style={{ flexShrink: 1 }}>
              <Text style={s.etq}>Domicilio Fiscal:   </Text>
              <Text style={s.val}>{cliente.domicilio}</Text>
            </Text>
          </View>
          <View style={[s.clienteFila, { justifyContent: "space-between" }]}>
            <Text>
              <Text style={s.etq}>Teléfono:   </Text>
              <Text style={s.val}>{cliente.telefono}</Text>
            </Text>
            <Text style={{ width: 200 }}>
              <Text style={s.etq}>RIF. Nº   </Text>
              <Text style={s.val}>{cliente.rif}</Text>
            </Text>
          </View>
          <View style={s.clienteFila}>
            <Text>
              <Text style={s.etq}>Condiciones de Pago:   </Text>
              <Text style={s.val}>{condicionesPago}</Text>
            </Text>
          </View>
        </View>

        <View style={s.tabla}>
          <View style={s.tCab}>
            <Text style={[s.tCabCelda, { width: 34 }]}>CAN</Text>
            <Text style={[s.tCabCelda, { flex: 1 }]}>DESCRIPCIÓN</Text>
            <Text style={[s.tCabCelda, { width: 92 }]}>
              {esPre ? "P. UNIT. ($)" : "P. UNIT."}
            </Text>
            <Text style={[s.tCabCelda, { width: 82 }]}>TOTAL</Text>
          </View>
          {/* Cuerpo de alto fijo + filas de totales bajo un mismo contenedor:
              los separadores verticales corren continuos desde el encabezado
              hasta el borde inferior de la tabla, incluida la zona de totales
              (formato real de prefactura_066/068). */}
          <View style={{ position: "relative" }}>
            <View style={[s.sep, { left: sepIzq }]} />
            <View style={[s.sep, { right: sepMonto }]} />
            <View style={[s.sep, { right: sepTotal }]} />
            <View style={s.cuerpo}>
              {renglones.map((r) => (
                <View key={r.id} style={s.fila}>
                  <Text style={s.cCan}>{r.can}</Text>
                  <Text style={s.cDesc}>{r.descripcion}</Text>
                  <Text style={s.cMonto}>{dinero(r.pUnit, sym)}</Text>
                  <Text style={s.cTotal}>{dinero(totalRenglon(r), sym)}</Text>
                </View>
              ))}
              {locacion ? <Text style={s.locacion}>LOCACION: {locacion}</Text> : null}
            </View>
            <View style={s.pieFila}>
              <Text style={{ width: 34 }} />
              <Text style={{ flex: 1 }} />
              <Text style={s.pieEtq}>SUB - TOTAL{bs}</Text>
              <Text style={s.pieVal}>{dinero(t.subtotal, sym)}</Text>
            </View>
            <View style={s.pieFila}>
              <Text style={{ width: 34 }} />
              <Text style={{ flex: 1 }} />
              <Text style={s.pieEtq}>IVA 16%{bs}</Text>
              <Text style={s.pieVal}>{dinero(t.iva, sym)}</Text>
            </View>
            <View style={s.pieFila}>
              <Text style={{ width: 34 }} />
              <Text style={{ flex: 1 }} />
              <Text style={s.pieEtq}>TOTAL A PAGAR{bs}</Text>
              <Text style={s.pieVal}>{dinero(t.total, sym)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* ============ Plantilla de impresión (papel fiscal pre-impreso) ============ */

const MM = 2.83465; // 1 mm en puntos PDF

export function PlantillaImpresionDoc({
  factura,
  cliente,
  calibracion,
}: {
  factura: Factura;
  cliente: Cliente;
  calibracion: CalibracionPlantilla;
}) {
  const c = calibracion;
  const px = (xMm: number) => (xMm + c.global.x) * MM;
  const py = (yMm: number) => (yMm + c.global.y) * MM;
  // Montos alineados a la derecha: caja de ancho fijo que TERMINA en la coordenada.
  const anchoMonto = 40; // mm
  const t = totalesRenglones(factura.renglones);
  const monto = (xFinMm: number, yMm: number, valor: string, bold = false) => (
    <Text
      style={{
        position: "absolute",
        left: px(xFinMm - anchoMonto),
        top: py(yMm),
        width: anchoMonto * MM,
        textAlign: "right",
        fontSize: 8,
        ...(bold ? { fontFamily: "Helvetica-Bold" } : {}),
      }}
    >
      {valor}
    </Text>
  );
  const texto = (xMm: number, yMm: number, valor: string, anchoMm?: number) => (
    <Text
      style={{
        position: "absolute",
        left: px(xMm),
        top: py(yMm),
        fontSize: 8,
        ...(anchoMm ? { width: anchoMm * MM } : {}),
      }}
    >
      {valor}
    </Text>
  );
  return (
    <Document>
      {/* Fondo 100% blanco: SOLO los datos, sin logo, bordes ni etiquetas. */}
      <Page size="LETTER" style={{ fontFamily: "Helvetica", fontSize: 8, color: NEGRO }}>
        {texto(c.campos.razonSocial.x, c.campos.razonSocial.y, cliente.razonSocial)}
        {texto(c.campos.fecha.x, c.campos.fecha.y, fechaDocCorta(factura.fechaEmision))}
        {texto(c.campos.domicilio.x, c.campos.domicilio.y, cliente.domicilio, 150)}
        {cliente.telefono
          ? texto(c.campos.telefono.x, c.campos.telefono.y, cliente.telefono)
          : null}
        {texto(c.campos.rif.x, c.campos.rif.y, cliente.rif)}
        {factura.condicionesPago
          ? texto(c.campos.condiciones.x, c.campos.condiciones.y, factura.condicionesPago)
          : null}

        {factura.renglones.map((r, i) => {
          const y = c.campos.renglones.y + i * c.alturaFilaMm;
          // La descripción no puede invadir el renglón siguiente del talonario:
          // se recorta a las líneas que caben en la altura de fila calibrada
          // (~3,4 mm por línea a 8 pt). Si hace falta más texto, se sube la
          // altura de fila en la pantalla de calibración.
          const maxLineas = Math.max(1, Math.floor(c.alturaFilaMm / 3.4));
          return (
            <View key={r.id}>
              {texto(c.campos.renglones.x, y, String(r.can))}
              <Text
                style={{
                  position: "absolute",
                  left: px(c.colDescXMm),
                  top: py(y),
                  width: (c.colPUnitXMm - c.colDescXMm - 45) * MM,
                  fontSize: 8,
                  maxLines: maxLineas,
                  textOverflow: "ellipsis",
                }}
              >
                {r.descripcion}
              </Text>
              {monto(c.colPUnitXMm, y, formatNumberVE(r.pUnit))}
              {monto(c.colTotalXMm, y, formatNumberVE(totalRenglon(r)))}
            </View>
          );
        })}

        {monto(c.campos.subtotal.x, c.campos.subtotal.y, formatNumberVE(t.subtotal))}
        {texto(c.campos.alicuota.x, c.campos.alicuota.y, "16")}
        {monto(c.campos.iva.x, c.campos.iva.y, formatNumberVE(t.iva))}
        {monto(c.campos.total.x, c.campos.total.y, formatNumberVE(t.total), true)}
      </Page>
    </Document>
  );
}

/* ============ Libro de ventas (débitos fiscales) ============ */

const lv = StyleSheet.create({
  page: { padding: 24, fontFamily: "Helvetica", fontSize: 6, color: NEGRO },
  encabezado: { fontSize: 7, marginBottom: 1 },
  encabezadoBold: { fontFamily: "Helvetica-Bold", fontSize: 7.5, marginBottom: 1 },
  tabla: { borderWidth: 1, borderColor: NEGRO, marginTop: 8 },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: NEGRO },
  filaUlt: { flexDirection: "row" },
  banda: { flexDirection: "row", backgroundColor: "#EEF2F7" },
  cab: { backgroundColor: "#EEF2F7", fontFamily: "Helvetica-Bold" },
  celda: { padding: 2, borderRightWidth: 0.5, borderRightColor: NEGRO },
  celdaUlt: { padding: 2 },
  num: { textAlign: "right" },
  centro: { textAlign: "center" },
  grupo: {
    borderRightWidth: 0.5,
    borderRightColor: NEGRO,
    borderBottomWidth: 0.5,
    borderBottomColor: NEGRO,
    padding: 2,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
  },
  resumen: { marginTop: 10, alignSelf: "flex-end", width: 430, borderWidth: 1, borderColor: NEGRO },
  resFila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: NEGRO },
  resFilaUlt: { flexDirection: "row" },
  resEtq: { flex: 1, padding: 2.5 },
  resVal: { width: 78, padding: 2.5, textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
});

export function LibroVentasDoc({
  periodo,
  filas,
  totales,
  empresa,
}: {
  periodo: string; // etiquetaQuincena
  filas: FilaLibroVentas[];
  totales: TotalesLibroVentas;
  empresa: Empresa;
}) {
  const fisc = datosFiscalesDe(empresa.key);
  // Formato fiscal SENIAT (docs/referencias/libro_de_ventas.pdf). 20 columnas;
  // hoy solo se emiten ventas internas gravadas al 16%, el resto va en 0,00.
  const w = [20, 38, 50, 70, 34, 36, 40, 32, 28, 32, 46, 40, 44, 20, 44, 40, 20, 40, 38, 34];
  const suma = (desde: number, hasta: number) => w.slice(desde, hasta).reduce((a, b) => a + b, 0);
  const idBloque = suma(0, 12); // columnas 1-12
  const g1 = suma(12, 15); // Ventas Internas o Exportac. Gravadas
  const g2 = suma(15, 18); // Ventas a No Contribuyentes
  const colaBloque = suma(18, 20); // IVA retenido + percibido
  const etqBloque = suma(0, 10); // ancho de la etiqueta en las filas de totales
  const CERO = formatNumberVE(0);
  const cab = [
    "Oper-\nNro.",
    "Fecha\nFactura",
    "RIF",
    "Nombre o Razón Social",
    "N° Planilla\nExport.\n(Forma D)",
    "Número\nde Factura",
    "N° de\nControl",
    "N° Nota\nde Crédito",
    "Tipos de\ntransacc.",
    "N° Factura\nAfectada",
    "Total Ventas\nIncluy. IVA",
    "Ventas Internas\nno Gravadas",
    "Base\nImponible",
    "%\nAlíc.",
    "Impuesto\nIVA",
    "Base\nImponible",
    "%\nAlíc.",
    "Impuesto\nIVA",
    "IVA Retenido\npor comprador",
    "IVA\nPercibido",
  ];
  const totFilas = [
    { etq: "TOTALES ANTES DE LOS AJUSTES", total: totales.totalConIvaBs, base: totales.baseImponibleBs, imp: totales.debitoFiscalBs },
    { etq: "TOTALES DE LOS AJUSTES", total: 0, base: 0, imp: 0 },
    { etq: "TOTAL DESPUES DE LOS AJUSTES", total: totales.totalConIvaBs, base: totales.baseImponibleBs, imp: totales.debitoFiscalBs },
  ];
  const resVentas = [
    { etq: "VENTAS INTERNAS NO GRAVADAS", base: 0, deb: 0 },
    { etq: "VENTAS DE EXPORTACION", base: 0, deb: 0 },
    { etq: "VENTAS INTERNAS GRAVADAS SOLO POR ALIC. GENERAL", base: totales.baseImponibleBs, deb: totales.debitoFiscalBs },
    { etq: "VENTAS INTERN. GRAVADAS POR ALIC. GENERAL + ADIC.", base: 0, deb: 0 },
    { etq: "VENTAS INTERNAS GRAVADAS POR ALICUOTA REDUCIDA", base: 0, deb: 0 },
    { etq: "TOTAL ANTES DE AJUSTES:", base: totales.baseImponibleBs, deb: totales.debitoFiscalBs, bold: true },
    { etq: "AJUSTES", base: 0, deb: 0 },
  ];
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={lv.page}>
        <Text style={lv.encabezadoBold}>NOMBRE DE LA EMPRESA: {fisc.razonSocial}</Text>
        <Text style={lv.encabezadoBold}>LIBRO DE VENTAS</Text>
        <Text style={lv.encabezado}>DOMICILIO FISCAL: {(fisc.direccion ?? "").toUpperCase()}</Text>
        <Text style={lv.encabezado}>RIF: {fisc.rif}</Text>
        <Text style={lv.encabezadoBold}>PERÍODO: {periodo}</Text>

        <View style={lv.tabla}>
          {/* Banda de grupos (2° nivel de cabecera) */}
          <View style={lv.banda}>
            <Text style={{ width: idBloque }} />
            <Text style={[lv.grupo, { width: g1 }]}>Ventas Internas o Exportac. Gravadas</Text>
            <Text style={[lv.grupo, { width: g2 }]}>Ventas a No Contribuyentes</Text>
            <Text style={{ width: colaBloque }} />
          </View>
          {/* Cabecera de columnas */}
          <View style={[lv.fila, lv.cab]}>
            {cab.map((h, i) => (
              <Text
                key={i}
                style={[i === cab.length - 1 ? lv.celdaUlt : lv.celda, lv.centro, { width: w[i] }]}
              >
                {h}
              </Text>
            ))}
          </View>
          {/* Filas de operaciones */}
          {filas.map((f, idx) => (
            <View key={f.numOp} style={idx === filas.length - 1 ? lv.filaUlt : lv.fila}>
              <Text style={[lv.celda, lv.centro, { width: w[0] }]}>{f.numOp}</Text>
              <Text style={[lv.celda, { width: w[1] }]}>{fechaDoc(f.fecha)}</Text>
              <Text style={[lv.celda, { width: w[2] }]}>{f.rif}</Text>
              <Text style={[lv.celda, { width: w[3] }]}>{f.cliente}</Text>
              <Text style={[lv.celda, { width: w[4] }]} />
              <Text style={[lv.celda, { width: w[5] }]}>{f.numeroFactura}</Text>
              <Text style={[lv.celda, { width: w[6] }]}>{f.numeroControl}</Text>
              <Text style={[lv.celda, { width: w[7] }]} />
              <Text style={[lv.celda, lv.centro, { width: w[8] }]}>01-Reg</Text>
              <Text style={[lv.celda, { width: w[9] }]} />
              <Text style={[lv.celda, lv.num, { width: w[10] }]}>{formatNumberVE(f.totalConIvaBs)}</Text>
              <Text style={[lv.celda, lv.num, { width: w[11] }]} />
              <Text style={[lv.celda, lv.num, { width: w[12] }]}>{formatNumberVE(f.baseImponibleBs)}</Text>
              <Text style={[lv.celda, lv.centro, { width: w[13] }]}>16%</Text>
              <Text style={[lv.celda, lv.num, { width: w[14] }]}>{formatNumberVE(f.debitoFiscalBs)}</Text>
              <Text style={[lv.celda, lv.num, { width: w[15] }]} />
              <Text style={[lv.celda, lv.centro, { width: w[16] }]}>16%</Text>
              <Text style={[lv.celda, lv.num, { width: w[17] }]}>{CERO}</Text>
              <Text style={[lv.celda, lv.num, { width: w[18] }]}>{CERO}</Text>
              <Text style={[lv.celdaUlt, lv.num, { width: w[19] }]}>{CERO}</Text>
            </View>
          ))}
          {/* Filas de totales (antes / de los ajustes / después) */}
          {totFilas.map((t) => (
            <View key={t.etq} style={[lv.fila, lv.cab]}>
              <Text style={[lv.celda, { width: etqBloque }]}>{t.etq}</Text>
              <Text style={[lv.celda, lv.num, { width: w[10] }]}>{formatNumberVE(t.total)}</Text>
              <Text style={[lv.celda, lv.num, { width: w[11] }]}>{CERO}</Text>
              <Text style={[lv.celda, lv.num, { width: w[12] }]}>{formatNumberVE(t.base)}</Text>
              <Text style={[lv.celda, { width: w[13] }]} />
              <Text style={[lv.celda, lv.num, { width: w[14] }]}>{formatNumberVE(t.imp)}</Text>
              <Text style={[lv.celda, lv.num, { width: w[15] }]} />
              <Text style={[lv.celda, { width: w[16] }]} />
              <Text style={[lv.celda, lv.num, { width: w[17] }]}>{CERO}</Text>
              <Text style={[lv.celda, lv.num, { width: w[18] }]}>{CERO}</Text>
              <Text style={[lv.celdaUlt, lv.num, { width: w[19] }]}>{CERO}</Text>
            </View>
          ))}
        </View>

        {/* Cuadro RESUMEN de débitos fiscales (como el formato real) */}
        <View style={lv.resumen}>
          <View style={[lv.resFila, lv.cab]}>
            <Text style={[lv.resEtq, lv.bold]}>RESUMEN:</Text>
            <Text style={[lv.resVal, lv.bold]}>BASE IMPONIBLE</Text>
            <Text style={[lv.resVal, lv.bold]}>DEBITO FISCAL</Text>
          </View>
          {resVentas.map((r) => (
            <View key={r.etq} style={lv.resFila}>
              <Text style={[lv.resEtq, ...(r.bold ? [lv.bold] : [])]}>{r.etq}</Text>
              <Text style={[lv.resVal, ...(r.bold ? [lv.bold] : [])]}>{formatNumberVE(r.base)}</Text>
              <Text style={[lv.resVal, ...(r.bold ? [lv.bold] : [])]}>{formatNumberVE(r.deb)}</Text>
            </View>
          ))}
          <View style={lv.resFilaUlt}>
            <Text style={[lv.resEtq, lv.bold]}>TOTAL DESPUES DE AJUSTES</Text>
            <Text style={lv.resVal} />
            <Text style={[lv.resVal, lv.bold]}>{formatNumberVE(totales.debitoFiscalBs)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
