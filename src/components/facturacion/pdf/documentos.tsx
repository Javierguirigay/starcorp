/**
 * Documentos PDF del sub-módulo Facturación: pre-factura / factura (registro),
 * plantilla de impresión sobre papel fiscal y libro de ventas.
 * Réplica de los formatos reales de /docs/referencias (prefacturas 066/068 y
 * factura 000116). Único módulo de facturación-ventas que importa
 * @react-pdf/renderer: cargarlo SIEMPRE con `await import(...)` desde un
 * handler de cliente.
 */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CalibracionPlantilla, Cliente, Factura, RenglonFactura } from "@/lib/types";
import { logoPdfDe } from "@/lib/branding";
import { formatNumberVE } from "@/lib/format";
import {
  fechaDoc,
  fechaDocCorta,
  totalesRenglones,
  totalRenglon,
  type FilaLibroVentas,
  type TotalesLibroVentas,
} from "@/lib/negocio/facturacion";

/** Logo oficial de LOTER para los membretes (null ⇒ marca tipográfica). */
const LOGO_SRC = logoPdfDe("loter");

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
  pieFila: { flexDirection: "row", borderTopWidth: 1, borderTopColor: NEGRO },
  pieEtq: {
    width: 92,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  pieVal: {
    width: 82,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textAlign: "right",
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
});

function Encabezado() {
  return (
    <>
      <View style={s.cabecera}>
        {LOGO_SRC ? (
          /* Proporción del PNG oficial (600×513); arriba-izquierda como en
             los documentos reales. */
          /* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image no admite alt */
          <Image src={LOGO_SRC} style={{ width: 96, height: 82 }} />
        ) : (
          <View style={s.logoTexto}>
            <Text style={s.logoLoter}>LOTER</Text>
            <Text style={s.logoSub}>SERVICIOS INTEGRALES</Text>
          </View>
        )}
        <View style={s.cabDerecha}>
          <Text style={s.cabRazon}>LOTER, C.A.  /  RIF. J-31717295-7</Text>
          <Text style={s.cabLinea}>Construcción,  Mantenimiento</Text>
          <Text style={s.cabLinea}>Electrificación, Izamiento, Mudanza de Taladros</Text>
          <Text style={s.cabLinea}>Vaccuums, Well Services, Acarreo de Fluidos</Text>
          <Text style={s.cabLinea}>Transporte, Maquinaria Pesada, Locaciones Petroleras</Text>
          <Text style={s.cabLinea}>
            Av. Bolívar con Juncal, Edif Pichel, Piso 1, Of. 14, Maturín Edo. Monagas
          </Text>
          <View style={s.cabRegla} />
          <Text style={s.cabTelefonos}>Tlfs.:  0291-642.85.69/ e-mail: loterca@gmail.com</Text>
        </View>
      </View>
    </>
  );
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
}: {
  variante: "prefactura" | "factura";
  numero: string;
  numeroControl?: string;
  fecha: string; // ISO
  cliente: Cliente;
  condicionesPago: string;
  renglones: RenglonFactura[];
  locacion: string;
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
        <Encabezado />

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
          {/* Cuerpo de alto fijo: las celdas "vacías" salen solas y los
              separadores verticales corren de arriba a abajo. */}
          <View style={s.cuerpo}>
            <View style={[s.sep, { left: sepIzq }]} />
            <View style={[s.sep, { right: sepMonto }]} />
            <View style={[s.sep, { right: sepTotal }]} />
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
  page: { padding: 32, fontFamily: "Helvetica", fontSize: 7, color: NEGRO },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 11, textAlign: "center" },
  subtitulo: { fontSize: 8, textAlign: "center", marginTop: 2 },
  tabla: { borderWidth: 1, borderColor: NEGRO, marginTop: 10 },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: NEGRO },
  filaUlt: { flexDirection: "row" },
  cab: { backgroundColor: "#EEF2F7", fontFamily: "Helvetica-Bold" },
  celda: { padding: 3 },
  num: { padding: 3, textAlign: "right" },
  totales: { fontFamily: "Helvetica-Bold", backgroundColor: "#F7F9FC" },
});

export function LibroVentasDoc({
  periodo,
  filas,
  totales,
}: {
  periodo: string; // etiquetaQuincena
  filas: FilaLibroVentas[];
  totales: TotalesLibroVentas;
}) {
  const anchos = [30, 50, 60, 62, 170, 68, 78, 78, 34, 78];
  const cab = [
    "N° Oper.",
    "Fecha",
    "N° Factura",
    "N° Control",
    "Nombre o Razón Social",
    "RIF",
    "Ventas con IVA (Bs)",
    "Base Imponible (Bs)",
    "% Alíc.",
    "Débito Fiscal (Bs)",
  ];
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={lv.page}>
        <Text style={lv.titulo}>LIBRO DE VENTAS</Text>
        <Text style={lv.subtitulo}>
          LOTER, C.A — RIF J-31717295-7 — PERÍODO: {periodo}
        </Text>
        <View style={lv.tabla}>
          <View style={[lv.fila, lv.cab]}>
            {cab.map((h, i) => (
              <Text key={h} style={[i >= 6 && i !== 8 ? lv.num : lv.celda, { width: anchos[i] }, i === 4 ? { flex: 1 } : {}]}>
                {h}
              </Text>
            ))}
          </View>
          {filas.map((f) => (
            <View key={f.numOp} style={lv.fila}>
              <Text style={[lv.celda, { width: anchos[0] }]}>{f.numOp}</Text>
              <Text style={[lv.celda, { width: anchos[1] }]}>{fechaDoc(f.fecha)}</Text>
              <Text style={[lv.celda, { width: anchos[2] }]}>{f.numeroFactura}</Text>
              <Text style={[lv.celda, { width: anchos[3] }]}>{f.numeroControl}</Text>
              <Text style={[lv.celda, { width: anchos[4], flex: 1 }]}>{f.cliente}</Text>
              <Text style={[lv.celda, { width: anchos[5] }]}>{f.rif}</Text>
              <Text style={[lv.num, { width: anchos[6] }]}>{formatNumberVE(f.totalConIvaBs)}</Text>
              <Text style={[lv.num, { width: anchos[7] }]}>{formatNumberVE(f.baseImponibleBs)}</Text>
              <Text style={[lv.celda, { width: anchos[8], textAlign: "center" }]}>16%</Text>
              <Text style={[lv.num, { width: anchos[9] }]}>{formatNumberVE(f.debitoFiscalBs)}</Text>
            </View>
          ))}
          <View style={[lv.filaUlt, lv.totales]}>
            <Text style={[lv.celda, { width: anchos[0] + anchos[1] + anchos[2] + anchos[3] }]}>
              TOTALES DEL PERÍODO ({filas.length} operaciones)
            </Text>
            <Text style={[lv.celda, { flex: 1 }]} />
            <Text style={[lv.celda, { width: anchos[5] }]} />
            <Text style={[lv.num, { width: anchos[6] }]}>{formatNumberVE(totales.totalConIvaBs)}</Text>
            <Text style={[lv.num, { width: anchos[7] }]}>{formatNumberVE(totales.baseImponibleBs)}</Text>
            <Text style={[lv.celda, { width: anchos[8] }]} />
            <Text style={[lv.num, { width: anchos[9] }]}>{formatNumberVE(totales.debitoFiscalBs)}</Text>
          </View>
        </View>
        <Text style={{ marginTop: 8, fontSize: 8 }}>
          Resumen del período — Total ventas con IVA: Bs {formatNumberVE(totales.totalConIvaBs)} ·
          Base imponible: Bs {formatNumberVE(totales.baseImponibleBs)} · Débitos fiscales: Bs{" "}
          {formatNumberVE(totales.debitoFiscalBs)}
        </Text>
      </Page>
    </Document>
  );
}
