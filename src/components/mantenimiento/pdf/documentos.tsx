/**
 * Reporte de mantenimientos en PDF (grupal por estado o historial individual de
 * un equipo). Membrete de LOTER + tabla. Se carga SIEMPRE con `await import(...)`
 * desde el handler de cliente para no meter @react-pdf/renderer en el bundle.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { MembreteLoter, NAVY, GOLD, SLATE, BORDE } from "@/components/pdf/Membrete";

const s = StyleSheet.create({
  page: { padding: 32, fontFamily: "Helvetica", fontSize: 8, color: NAVY },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 13, marginTop: 10 },
  subtitulo: { fontSize: 8, color: SLATE, marginTop: 2 },
  regla: { borderBottomWidth: 1.5, borderBottomColor: GOLD, marginVertical: 8 },
  destacado: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: BORDE,
    borderRadius: 2,
    padding: 6,
    marginBottom: 8,
  },
  destTitulo: { fontFamily: "Helvetica-Bold", fontSize: 8, marginBottom: 2 },
  tabla: { borderWidth: 1, borderColor: BORDE, borderRadius: 2, marginTop: 2 },
  tFila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDE },
  tFilaUlt: { flexDirection: "row" },
  tCab: { backgroundColor: "#F1F5F9", fontFamily: "Helvetica-Bold" },
  tCelda: { flex: 1, padding: 4 },
  total: { backgroundColor: "#F8FAFC", fontFamily: "Helvetica-Bold" },
  pie: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 7, color: SLATE },
});

/** Fila ya formateada (fechas dd-mm-yyyy) para imprimir. */
export interface FilaMantenimiento {
  equipo: string;
  tipo: string;
  programado: string;
  realizado: string;
  estado: string;
  tecnico: string;
  observaciones: string;
}

export function ReporteMantenimientoDoc({
  titulo,
  subtitulo,
  generado,
  ultimoServicio,
  filas,
}: {
  titulo: string;
  subtitulo: string;
  generado: string;
  /** Solo en el historial individual: resumen del último servicio del equipo. */
  ultimoServicio?: string;
  filas: FilaMantenimiento[];
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <MembreteLoter />
        <Text style={s.titulo}>{titulo}</Text>
        <Text style={s.subtitulo}>{subtitulo}</Text>
        <View style={s.regla} />

        {ultimoServicio ? (
          <View style={s.destacado}>
            <Text style={s.destTitulo}>Último servicio realizado</Text>
            <Text>{ultimoServicio}</Text>
          </View>
        ) : null}

        <View style={s.tabla}>
          <View style={[s.tFila, s.tCab]}>
            <Text style={[s.tCelda, { flex: 1.3 }]}>Equipo</Text>
            <Text style={[s.tCelda, { flex: 0.9 }]}>Tipo</Text>
            <Text style={[s.tCelda, { flex: 0.9 }]}>Programado</Text>
            <Text style={[s.tCelda, { flex: 0.9 }]}>Realizado</Text>
            <Text style={[s.tCelda, { flex: 0.9 }]}>Estado</Text>
            <Text style={[s.tCelda, { flex: 1.1 }]}>Técnico</Text>
            <Text style={[s.tCelda, { flex: 2.4 }]}>Observaciones</Text>
          </View>
          {filas.map((f, i) => (
            <View key={i} style={s.tFila}>
              <Text style={[s.tCelda, { flex: 1.3 }]}>{f.equipo}</Text>
              <Text style={[s.tCelda, { flex: 0.9 }]}>{f.tipo}</Text>
              <Text style={[s.tCelda, { flex: 0.9 }]}>{f.programado}</Text>
              <Text style={[s.tCelda, { flex: 0.9 }]}>{f.realizado}</Text>
              <Text style={[s.tCelda, { flex: 0.9 }]}>{f.estado}</Text>
              <Text style={[s.tCelda, { flex: 1.1 }]}>{f.tecnico}</Text>
              <Text style={[s.tCelda, { flex: 2.4 }]}>{f.observaciones}</Text>
            </View>
          ))}
          <View style={[s.tFilaUlt, s.total]}>
            <Text style={s.tCelda}>
              {filas.length} registro{filas.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        <Text style={s.pie}>LOTER, C.A. — RIF J-31717295-7 · Documento generado el {generado}</Text>
      </Page>
    </Document>
  );
}
