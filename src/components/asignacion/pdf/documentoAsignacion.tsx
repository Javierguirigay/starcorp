/**
 * PDF de la Orden de Asignación de Equipos con el membrete de LOTER (mismo
 * formato que órdenes/facturas). Importa @react-pdf/renderer: cargarlo SIEMPRE
 * con `await import(...)` desde un handler de cliente, nunca en el bundle inicial.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatFechaVE } from "@/lib/format";
import { BORDE, MembreteLoter, NEGRO, SLATE } from "@/components/pdf/Membrete";

export interface FilaOrdenAsignacion {
  id: string;
  equipo: string;
  desde: string;
  hasta: string;
  dias: number;
  observaciones: string;
}

export interface DatosOrdenAsignacion {
  numero: string;
  fecha: string; // ISO yyyy-mm-dd (fecha de solicitud)
  cliente: string;
  observaciones: string;
  entregadoPor: string;
  recibidoPor: string;
  filas: FilaOrdenAsignacion[];
}

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 8, color: NEGRO },
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
  datos: { borderWidth: 1, borderColor: NEGRO, marginTop: 12, padding: 8 },
  filaDato: { flexDirection: "row", marginVertical: 2.5 },
  etq: { fontFamily: "Helvetica-Bold", fontSize: 8, width: 110 },
  val: { fontSize: 8, flex: 1 },
  tabla: { borderWidth: 1, borderColor: NEGRO, marginTop: 12 },
  tCab: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: NEGRO },
  tCabCelda: { fontFamily: "Helvetica-Bold", fontSize: 8, paddingVertical: 4, paddingHorizontal: 4 },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: BORDE },
  celda: { fontSize: 8, paddingVertical: 4, paddingHorizontal: 4 },
  obsTitulo: { fontFamily: "Helvetica-Bold", fontSize: 8, marginTop: 14 },
  obsCaja: { borderWidth: 1, borderColor: BORDE, marginTop: 3, minHeight: 40, padding: 6 },
  firmas: { marginTop: 46, flexDirection: "row", justifyContent: "space-between" },
  firmaLinea: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: NEGRO,
    paddingTop: 4,
    textAlign: "center",
  },
  firmaEtq: { fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "center" },
  firmaNombre: { fontSize: 7, color: SLATE, textAlign: "center", marginTop: 2 },
});

// ID · Equipo · Desde · Hasta · Días · Observaciones (anchos en pt; LETTER útil ≈ 540).
const W = [50, 92, 66, 66, 40, 226];

function Dato({ etq, valor }: { etq: string; valor?: string }) {
  if (!valor) return null;
  return (
    <View style={s.filaDato}>
      <Text style={s.etq}>{etq}:</Text>
      <Text style={s.val}>{valor}</Text>
    </View>
  );
}

export function OrdenAsignacionDoc({ datos }: { datos: DatosOrdenAsignacion }) {
  const cab = ["ID", "EQUIPO", "DESDE", "HASTA", "DÍAS", "OBSERVACIONES"];
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <MembreteLoter />

        <View style={s.tituloCaja}>
          <Text style={s.titulo}>ORDEN DE ASIGNACIÓN DE EQUIPOS</Text>
          <Text style={s.tituloMeta}>
            {datos.numero ? `N° ${datos.numero}     ` : ""}
            {datos.fecha ? `Fecha: ${formatFechaVE(datos.fecha)}` : ""}
          </Text>
        </View>

        <View style={s.datos}>
          <Dato etq="Cliente / Proyecto" valor={datos.cliente} />
        </View>

        <View style={s.tabla}>
          <View style={s.tCab}>
            {cab.map((c, i) => (
              <Text
                key={c}
                style={[
                  s.tCabCelda,
                  { width: W[i], textAlign: i === 4 ? "center" : "left" },
                ]}
              >
                {c}
              </Text>
            ))}
          </View>
          {datos.filas.map((f, i) => (
            <View key={i} style={s.fila}>
              <Text style={[s.celda, { width: W[0] }]}>{f.id}</Text>
              <Text style={[s.celda, { width: W[1] }]}>{f.equipo}</Text>
              <Text style={[s.celda, { width: W[2] }]}>
                {f.desde ? formatFechaVE(f.desde) : "—"}
              </Text>
              <Text style={[s.celda, { width: W[3] }]}>
                {f.hasta ? formatFechaVE(f.hasta) : "En curso"}
              </Text>
              <Text style={[s.celda, { width: W[4], textAlign: "center" }]}>
                {f.hasta && f.dias > 0 ? f.dias : "—"}
              </Text>
              <Text style={[s.celda, { width: W[5] }]}>{f.observaciones}</Text>
            </View>
          ))}
        </View>

        {datos.observaciones ? (
          <>
            <Text style={s.obsTitulo}>OBSERVACIONES</Text>
            <View style={s.obsCaja}>
              <Text>{datos.observaciones}</Text>
            </View>
          </>
        ) : null}

        <View style={s.firmas}>
          <View style={s.firmaLinea}>
            <Text style={s.firmaEtq}>Entregado por</Text>
            <Text style={s.firmaNombre}>{datos.entregadoPor || " "}</Text>
          </View>
          <View style={s.firmaLinea}>
            <Text style={s.firmaEtq}>Recibido por</Text>
            <Text style={s.firmaNombre}>{datos.recibidoPor || " "}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
