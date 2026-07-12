/**
 * Documentos PDF de Gestión de Compras: comprobante de retención de IVA
 * (formato oficial, Providencia SNAT/2025/000054), libro de compras y
 * resumen de créditos fiscales. Réplica de los formatos reales de
 * /docs/referencias. Único módulo de compras que importa @react-pdf/renderer:
 * cargarlo SIEMPRE con `await import(...)` desde un handler de cliente.
 */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Proveedor, Retencion } from "@/lib/types";
import { logoPdfDe } from "@/lib/branding";
import { LOTER_DIRECCION, LOTER_RIF } from "@/lib/config";
import { formatNumberVE } from "@/lib/format";
import { fechaDoc } from "@/lib/negocio/facturacion";
import { MESES } from "@/lib/negocio/retenciones";
import type { FilaLibroCompras, ResumenLibroCompras } from "@/lib/negocio/compras";

const NAVY = "#0F2742";
const GOLD = "#D08F00";
const NEGRO = "#111111";
const GRIS = "#D9DFE7";

/** Logo oficial de LOTER para el membrete (null ⇒ marca tipográfica). */
const LOGO_SRC = logoPdfDe("loter");

/* ============ Comprobante de retención (oficial) ============ */

const cr = StyleSheet.create({
  page: { padding: 30, fontFamily: "Helvetica", fontSize: 7, color: NEGRO },
  cabecera: { flexDirection: "row" },
  logo: { width: 120 },
  logoLoter: { fontFamily: "Helvetica-Bold", fontSize: 20, color: NAVY, letterSpacing: 1.5 },
  logoSub: { fontFamily: "Helvetica-Bold", fontSize: 5, color: GOLD, letterSpacing: 2 },
  centro: { flex: 1, paddingHorizontal: 8 },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 9, textAlign: "center" },
  providencia: { fontFamily: "Helvetica-Bold", fontSize: 7, textAlign: "center", marginTop: 2 },
  legal: { fontSize: 6, textAlign: "center", marginTop: 3, color: "#333" },
  cajas: { width: 150 },
  caja: { borderWidth: 1, borderColor: NEGRO, marginBottom: 4 },
  cajaTit: {
    backgroundColor: GRIS,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingVertical: 2,
  },
  cajaVal: { textAlign: "center", paddingVertical: 3 },
  bloque: { borderWidth: 1, borderColor: NEGRO, marginTop: 6 },
  bloqueTit: { backgroundColor: GRIS, fontFamily: "Helvetica-Bold", padding: 2.5 },
  bloqueVal: { fontFamily: "Helvetica-Bold", padding: 3 },
  filaBloques: { flexDirection: "row", gap: 8 },
  tabla: { borderWidth: 1, borderColor: NEGRO, marginTop: 10 },
  tFila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: NEGRO },
  tFilaUlt: { flexDirection: "row" },
  tCab: { backgroundColor: GRIS, fontFamily: "Helvetica-Bold" },
  celda: { padding: 2.5, textAlign: "center", borderRightWidth: 0.5, borderRightColor: NEGRO },
  celdaUlt: { padding: 2.5, textAlign: "center" },
  totales: { flexDirection: "row", marginTop: 4 },
  firmas: { marginTop: 50, flexDirection: "row", justifyContent: "space-between" },
});

export function ComprobanteRetencionDoc({
  retencion,
  proveedor,
}: {
  retencion: Retencion;
  proveedor: Proveedor;
}) {
  const r = retencion;
  // Anchos de columna del detalle (suman ~772 pt útiles en carta horizontal).
  const w = [34, 52, 52, 56, 44, 44, 30, 52, 74, 74, 68, 34, 62, 62];
  const cab = [
    "N° de\nOperación",
    "Fecha del\nDocumento",
    "Nro. de\nFactura",
    "Nro. de\nControl",
    "Nro. de Nota\nDébito",
    "Nro. de Nota\nCrédito",
    "Tipo de\ntrans.",
    "Nro. Del\nDocumento\nAfectado",
    "Total Compras\ncon I.V.A",
    "Compras sin\nderecho a\ncrédito I.V.A",
    "Base\nImponible",
    "%\nAlícuota",
    "Impuesto\nI.V.A",
    "I.V.A\nRetenido",
  ];
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={cr.page}>
        <View style={cr.cabecera}>
          <View style={cr.logo}>
            {LOGO_SRC ? (
              /* Proporción del PNG oficial (600×513). */
              /* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image no admite alt */
              <Image src={LOGO_SRC} style={{ width: 76, height: 65 }} />
            ) : (
              <>
                <Text style={cr.logoLoter}>LOTER</Text>
                <Text style={cr.logoSub}>SERVICIOS INTEGRALES</Text>
              </>
            )}
          </View>
          <View style={cr.centro}>
            <Text style={cr.titulo}>
              COMPROBANTE DE RETENCIÓN DEL IMPUESTO AL VALOR AGREGADO
            </Text>
            <Text style={cr.providencia}>
              Providencia Administrativa N° SNAT/2025/000054 de fecha 02 de julio de 2025
            </Text>
            <Text style={cr.legal}>
              Decreto Constituyente de Reforma Parcial del Decreto con Rango, Valor y Fuerza de
              Ley que establece el Impuesto al Valor Agregado. Gaceta Oficial N° 6.507 Ext. del
              29-01-2020.
            </Text>
            <Text style={cr.legal}>
              Artículo 11: “La Administración Tributaria podrá designar como responsables del
              pago del impuesto, en calidad de agentes de retención, a quienes por sus funciones
              públicas o por razón de sus actividades privadas intervengan en operaciones
              gravadas con el impuesto establecido en esta Ley. (…)”
            </Text>
          </View>
          <View style={cr.cajas}>
            <View style={cr.caja}>
              <Text style={cr.cajaTit}>No. Comprobante</Text>
              <Text style={cr.cajaVal}>{r.comprobante}</Text>
            </View>
            <View style={cr.caja}>
              <Text style={cr.cajaTit}>Fecha de Emisión:</Text>
              <Text style={cr.cajaVal}>{fechaDoc(r.fechaEmision)}</Text>
            </View>
            <View style={cr.caja}>
              <Text style={cr.cajaTit}>Período Fiscal:</Text>
              <Text style={cr.cajaVal}>
                AÑO: {r.periodoAnio} / MES: {MESES[r.periodoMes - 1].toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Agente de retención (datos fijos de LOTER) */}
        <View style={cr.filaBloques}>
          <View style={[cr.bloque, { flex: 1 }]}>
            <Text style={cr.bloqueTit}>Nombre o Razón social del Agente de Retención</Text>
            <Text style={cr.bloqueVal}>LOTER, C.A</Text>
          </View>
          <View style={[cr.bloque, { flex: 1 }]}>
            <Text style={cr.bloqueTit}>
              Registro de Información fiscal del Agente de Retención
            </Text>
            <Text style={cr.bloqueVal}>{LOTER_RIF}</Text>
          </View>
        </View>
        <View style={cr.bloque}>
          <Text style={cr.bloqueTit}>Dirección Fiscal del Agente de Retención</Text>
          <Text style={cr.bloqueVal}>{LOTER_DIRECCION.toUpperCase()}</Text>
        </View>

        {/* Sujeto retenido */}
        <View style={cr.filaBloques}>
          <View style={[cr.bloque, { flex: 1 }]}>
            <Text style={cr.bloqueTit}>Nombre o Razón social del Sujeto Retenido</Text>
            <Text style={cr.bloqueVal}>{proveedor.razonSocial.toUpperCase()}</Text>
          </View>
          <View style={[cr.bloque, { flex: 1 }]}>
            <Text style={cr.bloqueTit}>Registro de Información fiscal del Sujeto Retenido</Text>
            <Text style={cr.bloqueVal}>{proveedor.rif}</Text>
          </View>
        </View>
        <View style={cr.bloque}>
          <Text style={cr.bloqueTit}>Dirección Fiscal del Sujeto Retenido</Text>
          <Text style={cr.bloqueVal}>{proveedor.direccion.toUpperCase()}</Text>
        </View>

        {/* Detalle */}
        <View style={cr.tabla}>
          <View style={[cr.tFila, cr.tCab]}>
            {cab.map((h, i) => (
              <Text key={h} style={[i === cab.length - 1 ? cr.celdaUlt : cr.celda, { width: w[i] }]}>
                {h}
              </Text>
            ))}
          </View>
          {r.lineas.map((l, idx) => (
            <View key={l.numOp} style={idx === r.lineas.length - 1 ? cr.tFilaUlt : cr.tFila}>
              <Text style={[cr.celda, { width: w[0] }]}>{l.numOp}</Text>
              <Text style={[cr.celda, { width: w[1] }]}>{fechaDoc(l.fechaDoc)}</Text>
              <Text style={[cr.celda, { width: w[2] }]}>{l.numFactura}</Text>
              <Text style={[cr.celda, { width: w[3] }]}>{l.numControl}</Text>
              <Text style={[cr.celda, { width: w[4] }]}>{l.notaDebito ?? ""}</Text>
              <Text style={[cr.celda, { width: w[5] }]}>{l.notaCredito ?? ""}</Text>
              <Text style={[cr.celda, { width: w[6] }]}>{Number(l.tipoTransaccion)}</Text>
              <Text style={[cr.celda, { width: w[7] }]}>{l.facturaAfectada ?? ""}</Text>
              <Text style={[cr.celda, { width: w[8], textAlign: "right" }]}>
                {formatNumberVE(l.totalConIvaBs)}
              </Text>
              <Text style={[cr.celda, { width: w[9], textAlign: "right" }]}>
                {l.sinCreditoBs ? formatNumberVE(l.sinCreditoBs) : ""}
              </Text>
              <Text style={[cr.celda, { width: w[10], textAlign: "right" }]}>
                {formatNumberVE(l.baseImponibleBs)}
              </Text>
              <Text style={[cr.celda, { width: w[11] }]}>16%</Text>
              <Text style={[cr.celda, { width: w[12], textAlign: "right" }]}>
                {formatNumberVE(l.impuestoIvaBs)}
              </Text>
              <Text style={[cr.celdaUlt, { width: w[13], textAlign: "right" }]}>
                {formatNumberVE(l.ivaRetenidoBs)}
              </Text>
            </View>
          ))}
        </View>

        {/* Línea de totales en Bs bajo las columnas de montos */}
        <View style={cr.totales}>
          <Text style={{ width: w.slice(0, 8).reduce((a, b) => a + b, 0) }} />
          <Text style={{ width: w[8], textAlign: "right", fontFamily: "Helvetica-Bold" }}>
            Bs {formatNumberVE(r.totalConIvaBs)}
          </Text>
          <Text style={{ width: w[9], textAlign: "right", fontFamily: "Helvetica-Bold" }}>
            Bs {formatNumberVE(r.totalSinCreditoBs)}
          </Text>
          <Text style={{ width: w[10], textAlign: "right", fontFamily: "Helvetica-Bold" }}>
            Bs {formatNumberVE(r.totalBaseBs)}
          </Text>
          <Text style={{ width: w[11] }} />
          <Text style={{ width: w[12], textAlign: "right", fontFamily: "Helvetica-Bold" }}>
            Bs {formatNumberVE(r.totalImpuestoBs)}
          </Text>
          <Text style={{ width: w[13], textAlign: "right", fontFamily: "Helvetica-Bold" }}>
            Bs {formatNumberVE(r.totalRetenidoBs)}
          </Text>
        </View>

        {/* Firmas y fechas de entrega/recepción */}
        <View style={cr.firmas}>
          <View>
            <Text>Firma del Agente de Retención: ______________________</Text>
            <Text style={{ marginTop: 14 }}>Fecha de Entrega: ______/______/______</Text>
          </View>
          <View>
            <Text>Firma del Sujeto Retenido: ______________________</Text>
            <Text style={{ marginTop: 14 }}>Fecha de Recepción: ______/______/______</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* ============ Libro de compras ============ */

const lc = StyleSheet.create({
  page: { padding: 26, fontFamily: "Helvetica", fontSize: 6.5, color: NEGRO },
  encabezado: { fontSize: 7, marginBottom: 1 },
  encabezadoBold: { fontFamily: "Helvetica-Bold", fontSize: 7.5, marginBottom: 1 },
  tabla: { borderWidth: 1, borderColor: NEGRO, marginTop: 8 },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: NEGRO },
  filaUlt: { flexDirection: "row" },
  cab: { backgroundColor: "#E8EDF3", fontFamily: "Helvetica-Bold" },
  celda: { padding: 2, borderRightWidth: 0.5, borderRightColor: NEGRO },
  celdaUlt: { padding: 2 },
  num: { textAlign: "right" },
  resumen: { marginTop: 10, alignSelf: "flex-end", width: 420, borderWidth: 1, borderColor: NEGRO },
  resFila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: NEGRO },
  resFilaUlt: { flexDirection: "row" },
  resEtq: { flex: 1, padding: 2.5 },
  resVal: { width: 80, padding: 2.5, textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
});

export function LibroComprasDoc({
  periodo,
  filas,
  resumen,
}: {
  periodo: string; // etiquetaQuincena
  filas: FilaLibroCompras[];
  resumen: ResumenLibroCompras;
}) {
  const w = [26, 44, 56, 118, 44, 44, 36, 36, 42, 34, 46, 56, 56, 24, 50, 50];
  const cab = [
    "Oper-\nNro.",
    "Fecha\nFactura",
    "RIF",
    "Nombre o Razón Social",
    "N° de\nFactura",
    "N° de\nControl",
    "N° Nota\nDébito",
    "N° Nota\nCrédito",
    "N° Factura\nAfectada",
    "Tipo\ntransacc.",
    "Compras No\nGravadas",
    "Compras Gravadas\nIncluy. IVA",
    "Base\nImponible",
    "%\nAlíc.",
    "Impuesto\nIVA",
    "IVA Retenido\n(a terceros)",
  ];
  const res = [
    { etq: "COMPRAS NO GRAVADAS Y/O SIN DERECHO A CREDITO FISCAL", base: resumen.comprasNoGravadasBase, cred: 0 },
    { etq: "IMPORTACIONES GRAVADAS POR ALICUOTA GENERAL", base: 0, cred: 0 },
    { etq: "IMPORTACIONES GRAVADAS POR ALICUOTA GENERAL + ADICIONAL", base: 0, cred: 0 },
    { etq: "IMPORTACIONES GRAVADAS POR ALICUOTA REDUCIDA", base: 0, cred: 0 },
    { etq: "COMPRAS INTERNAS GRAVADAS POR ALICUOTA GENERAL", base: resumen.comprasInternasGeneralBase, cred: resumen.comprasInternasGeneralCredito },
    { etq: "COMPRAS INTERNAS GRAVADAS POR ALICUOTA GENERAL + ADIC.", base: 0, cred: 0 },
    { etq: "COMPRAS INTERNAS GRAVADAS POR ALICUOTA REDUCIDA", base: 0, cred: 0 },
    { etq: "TOTAL COMPRAS Y CREDITOS FISCALES DEL PERIODO", base: resumen.totalBase, cred: resumen.totalCredito, bold: true },
  ];
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={lc.page}>
        <Text style={lc.encabezadoBold}>NOMBRE DE LA EMPRESA: LOTER, C.A</Text>
        <Text style={lc.encabezadoBold}>LIBRO DE COMPRAS</Text>
        <Text style={lc.encabezado}>DOMICILIO FISCAL: {LOTER_DIRECCION.toUpperCase()}</Text>
        <Text style={lc.encabezado}>RIF: {LOTER_RIF}</Text>
        <Text style={lc.encabezadoBold}>PERÍODO: {periodo}</Text>

        <View style={lc.tabla}>
          <View style={[lc.fila, lc.cab]}>
            {cab.map((h, i) => (
              <Text
                key={h}
                style={[
                  i === cab.length - 1 ? lc.celdaUlt : lc.celda,
                  { width: w[i] },
                  i === 3 ? { flex: 1 } : {},
                  { textAlign: "center" },
                ]}
              >
                {h}
              </Text>
            ))}
          </View>
          {filas.map((f, idx) => (
            <View key={f.numOp} style={idx === filas.length - 1 ? lc.filaUlt : lc.fila}>
              <Text style={[lc.celda, { width: w[0], textAlign: "center" }]}>{f.numOp}</Text>
              <Text style={[lc.celda, { width: w[1] }]}>{fechaDoc(f.fecha)}</Text>
              <Text style={[lc.celda, { width: w[2] }]}>{f.rif}</Text>
              <Text style={[lc.celda, { width: w[3], flex: 1 }]}>{f.proveedor}</Text>
              <Text style={[lc.celda, { width: w[4] }]}>{f.numeroFactura}</Text>
              <Text style={[lc.celda, { width: w[5] }]}>{f.numeroControl}</Text>
              <Text style={[lc.celda, { width: w[6] }]}>{f.notaDebito}</Text>
              <Text style={[lc.celda, { width: w[7] }]}>{f.notaCredito}</Text>
              <Text style={[lc.celda, { width: w[8] }]}>{f.facturaAfectada}</Text>
              <Text style={[lc.celda, { width: w[9], textAlign: "center" }]}>{f.tipoTransaccion}</Text>
              <Text style={[lc.celda, lc.num, { width: w[10] }]}>
                {f.comprasNoGravadasBs ? formatNumberVE(f.comprasNoGravadasBs) : ""}
              </Text>
              <Text style={[lc.celda, lc.num, { width: w[11] }]}>{formatNumberVE(f.comprasConIvaBs)}</Text>
              <Text style={[lc.celda, lc.num, { width: w[12] }]}>{formatNumberVE(f.baseImponibleBs)}</Text>
              <Text style={[lc.celda, { width: w[13], textAlign: "center" }]}>16%</Text>
              <Text style={[lc.celda, lc.num, { width: w[14] }]}>{formatNumberVE(f.impuestoIvaBs)}</Text>
              <Text style={[lc.celdaUlt, lc.num, { width: w[15] }]}>
                {f.ivaRetenidoBs ? formatNumberVE(f.ivaRetenidoBs) : ""}
              </Text>
            </View>
          ))}
          {/* Totales de columnas */}
          <View style={[lc.fila, lc.cab]}>
            <Text style={[lc.celda, { width: w.slice(0, 10).reduce((a, b) => a + b, 0), flex: 1 }]}>
              TOTALES DEL PERÍODO ({filas.length} operaciones)
            </Text>
            <Text style={[lc.celda, lc.num, { width: w[10] }]}>
              {formatNumberVE(resumen.comprasNoGravadasBase)}
            </Text>
            <Text style={[lc.celda, lc.num, { width: w[11] }]}>
              {formatNumberVE(resumen.totalComprasConIva)}
            </Text>
            <Text style={[lc.celda, lc.num, { width: w[12] }]}>{formatNumberVE(resumen.totalBase)}</Text>
            <Text style={[lc.celda, { width: w[13] }]} />
            <Text style={[lc.celda, lc.num, { width: w[14] }]}>{formatNumberVE(resumen.totalCredito)}</Text>
            <Text style={[lc.celdaUlt, lc.num, { width: w[15] }]}>
              {formatNumberVE(resumen.totalIvaRetenido)}
            </Text>
          </View>
        </View>

        {/* Bloque RESUMEN (como el formato real) */}
        <View style={lc.resumen}>
          <View style={[lc.resFila, lc.cab]}>
            <Text style={[lc.resEtq, lc.bold]}>RESUMEN:</Text>
            <Text style={[lc.resVal, lc.bold]}>BASE IMPONIBLE:</Text>
            <Text style={[lc.resVal, lc.bold]}>CREDITO FISCAL:</Text>
          </View>
          {res.map((fila) => (
            <View key={fila.etq} style={lc.resFila}>
              <Text style={[lc.resEtq, ...(fila.bold ? [lc.bold] : [])]}>{fila.etq}</Text>
              <Text style={[lc.resVal, ...(fila.bold ? [lc.bold] : [])]}>
                {formatNumberVE(fila.base)}
              </Text>
              <Text style={[lc.resVal, ...(fila.bold ? [lc.bold] : [])]}>
                {formatNumberVE(fila.cred)}
              </Text>
            </View>
          ))}
          <View style={lc.resFilaUlt}>
            <Text style={[lc.resEtq, lc.bold]}>TOTAL CREDITOS FISCALES DEDUCIBLES</Text>
            <Text style={lc.resVal} />
            <Text style={[lc.resVal, lc.bold]}>{formatNumberVE(resumen.totalCredito)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
