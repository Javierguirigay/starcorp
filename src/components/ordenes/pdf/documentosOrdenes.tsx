/**
 * PDF de las órdenes de compra, entrega y requerimiento. Un solo documento
 * parametrizado por tipo: comparten membrete, caja de número, tabla de
 * renglones y firmas; lo que cambia son los datos de cabecera, si la tabla
 * lleva precios y las etiquetas de las firmas.
 * Único módulo de órdenes que importa @react-pdf/renderer: cargarlo SIEMPRE
 * con `await import(...)` desde un handler de cliente.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Orden } from "@/lib/types";
import { formatFechaVE, formatNumberVE } from "@/lib/format";
import { TITULO_ORDEN, totalRenglonOrden, totalesOrden } from "@/lib/negocio/ordenes";
import { BORDE, MembreteLoter, NEGRO, SLATE } from "@/components/pdf/Membrete";

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 8, color: NEGRO },
  /* Caja del título + número + fecha */
  tituloCaja: {
    borderWidth: 1.5,
    borderColor: NEGRO,
    marginTop: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 13 },
  tituloMeta: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  /* Bloques de datos */
  datos: { borderWidth: 1, borderColor: NEGRO, marginTop: 12, padding: 8 },
  filaDato: { flexDirection: "row", marginVertical: 2.5 },
  etq: { fontFamily: "Helvetica-Bold", fontSize: 8, width: 110 },
  val: { fontSize: 8, flex: 1 },
  /* Tabla */
  tabla: { borderWidth: 1, borderColor: NEGRO, marginTop: 12 },
  tCab: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: NEGRO },
  tCabCelda: { fontFamily: "Helvetica-Bold", fontSize: 8, paddingVertical: 4, paddingHorizontal: 4 },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: BORDE },
  celda: { fontSize: 8, paddingVertical: 4, paddingHorizontal: 4 },
  /* Totales */
  totales: { marginTop: 8, alignItems: "flex-end" },
  filaTotal: { flexDirection: "row", width: 220, justifyContent: "space-between", paddingVertical: 2 },
  totalEtq: { fontFamily: "Helvetica-Bold", fontSize: 8 },
  totalVal: { fontFamily: "Helvetica-Bold", fontSize: 8 },
  granTotal: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: NEGRO,
    paddingTop: 3,
    marginTop: 2,
  },
  granTotalTexto: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  /* Observaciones */
  obsTitulo: { fontFamily: "Helvetica-Bold", fontSize: 8, marginTop: 14 },
  obsCaja: { borderWidth: 1, borderColor: BORDE, marginTop: 3, minHeight: 40, padding: 6 },
  /* Firmas */
  firmas: { marginTop: 46, flexDirection: "row", justifyContent: "space-between" },
  firmaLinea: {
    width: 150,
    borderTopWidth: 1,
    borderTopColor: NEGRO,
    paddingTop: 4,
    textAlign: "center",
  },
  firmaEtq: { fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "center" },
  firmaNombre: { fontSize: 7, color: SLATE, textAlign: "center", marginTop: 2 },
});

/** Etiquetas de las firmas según el tipo de orden. */
const FIRMAS: Record<Orden["tipo"], { etq: string; campo: "elaboradoPor" | "aprobadoPor" | "recibidoPor" }[]> = {
  compra: [
    { etq: "Elaborado por", campo: "elaboradoPor" },
    { etq: "Aprobado por", campo: "aprobadoPor" },
    { etq: "Recibido por", campo: "recibidoPor" },
  ],
  entrega: [
    { etq: "Entregado por", campo: "elaboradoPor" },
    { etq: "Recibido por", campo: "recibidoPor" },
  ],
  requerimiento: [
    { etq: "Solicitado por", campo: "elaboradoPor" },
    { etq: "Aprobado por", campo: "aprobadoPor" },
  ],
};

function Dato({ etq, valor }: { etq: string; valor?: string }) {
  if (!valor) return null;
  return (
    <View style={s.filaDato}>
      <Text style={s.etq}>{etq}:</Text>
      <Text style={s.val}>{valor}</Text>
    </View>
  );
}

export function OrdenDoc({ orden }: { orden: Orden }) {
  const conPrecios = orden.tipo === "compra";
  const t = conPrecios ? totalesOrden(orden.renglones) : null;
  // Anchos en pt: con precios la descripción cede espacio a las 2 columnas de montos.
  const w = conPrecios ? [40, 50, 233, 90, 90] : [40, 60, 403];
  const cab = conPrecios
    ? ["CANT.", "UNIDAD", "DESCRIPCIÓN", "P. UNITARIO", "TOTAL"]
    : ["CANT.", "UNIDAD", "DESCRIPCIÓN"];
  const contraparteEtq =
    orden.tipo === "compra" ? "Proveedor" : orden.tipo === "entrega" ? "Destinatario" : "Solicitante";

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <MembreteLoter />

        <View style={s.tituloCaja}>
          <Text style={s.titulo}>{TITULO_ORDEN[orden.tipo].toUpperCase()}</Text>
          <Text style={s.tituloMeta}>
            N° {orden.numero}     Fecha: {formatFechaVE(orden.fecha)}
          </Text>
        </View>

        <View style={s.datos}>
          <Dato etq={contraparteEtq} valor={orden.contraparteNombre} />
          <Dato etq="RIF / C.I." valor={orden.contraparteRif} />
          <Dato etq="Condiciones de pago" valor={orden.condicionesPago} />
          <Dato etq="Locación de entrega" valor={orden.locacion} />
          <Dato etq="Transporte" valor={orden.transporte} />
          <Dato etq="Motivo" valor={orden.motivo} />
        </View>

        <View style={s.tabla}>
          <View style={s.tCab}>
            {cab.map((c, i) => (
              <Text
                key={c}
                style={[
                  s.tCabCelda,
                  { width: w[i], textAlign: i >= 3 ? "right" : i === 2 ? "left" : "center" },
                ]}
              >
                {c}
              </Text>
            ))}
          </View>
          {orden.renglones.map((r, i) => (
            <View key={i} style={s.fila}>
              <Text style={[s.celda, { width: w[0], textAlign: "center" }]}>
                {formatNumberVE(r.cantidad)}
              </Text>
              <Text style={[s.celda, { width: w[1], textAlign: "center" }]}>{r.unidad}</Text>
              <Text style={[s.celda, { width: w[2] }]}>{r.descripcion}</Text>
              {conPrecios && (
                <>
                  <Text style={[s.celda, { width: w[3], textAlign: "right" }]}>
                    {formatNumberVE(r.precioUnitBs ?? 0)}
                  </Text>
                  <Text style={[s.celda, { width: w[4], textAlign: "right" }]}>
                    {formatNumberVE(totalRenglonOrden(r))}
                  </Text>
                </>
              )}
            </View>
          ))}
        </View>

        {t && (
          <View style={s.totales}>
            <View style={s.filaTotal}>
              <Text style={s.totalEtq}>Subtotal Bs</Text>
              <Text style={s.totalVal}>{formatNumberVE(t.subtotal)}</Text>
            </View>
            <View style={s.filaTotal}>
              <Text style={s.totalEtq}>IVA 16% Bs</Text>
              <Text style={s.totalVal}>{formatNumberVE(t.iva)}</Text>
            </View>
            <View style={s.granTotal}>
              <Text style={s.granTotalTexto}>TOTAL Bs</Text>
              <Text style={s.granTotalTexto}>{formatNumberVE(t.total)}</Text>
            </View>
          </View>
        )}

        {orden.observaciones ? (
          <>
            <Text style={s.obsTitulo}>OBSERVACIONES</Text>
            <View style={s.obsCaja}>
              <Text>{orden.observaciones}</Text>
            </View>
          </>
        ) : null}

        <View style={s.firmas}>
          {FIRMAS[orden.tipo].map((f) => (
            <View key={f.etq} style={s.firmaLinea}>
              <Text style={s.firmaEtq}>{f.etq}</Text>
              <Text style={s.firmaNombre}>{orden[f.campo] || " "}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
