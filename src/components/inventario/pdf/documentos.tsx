/**
 * Kardex de inventario en PDF: los movimientos tal como se ven en la pestaña
 * (con los filtros activos). Membrete de LOTER + tabla. Se carga SIEMPRE con
 * `await import(...)` desde el handler de cliente para no meter
 * @react-pdf/renderer en el bundle.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { MembreteLoter, NAVY, GOLD, SLATE, BORDE } from "@/components/pdf/Membrete";

const s = StyleSheet.create({
  page: { padding: 32, fontFamily: "Helvetica", fontSize: 8, color: NAVY },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 13, marginTop: 10 },
  subtitulo: { fontSize: 8, color: SLATE, marginTop: 2 },
  regla: { borderBottomWidth: 1.5, borderBottomColor: GOLD, marginVertical: 8 },
  tabla: { borderWidth: 1, borderColor: BORDE, borderRadius: 2, marginTop: 2 },
  tFila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDE },
  tFilaUlt: { flexDirection: "row" },
  tCab: { backgroundColor: "#F1F5F9", fontFamily: "Helvetica-Bold" },
  tCelda: { flex: 1, padding: 4 },
  tNum: { flex: 1, padding: 4, textAlign: "right" },
  total: { backgroundColor: "#F8FAFC", fontFamily: "Helvetica-Bold" },
  pie: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 7, color: SLATE },
});

/** Fila ya formateada (fechas dd-mm-yyyy, cantidad con signo y unidad). */
export interface FilaKardex {
  fecha: string;
  /** Etiqueta del tipo ("Entrada", "Salida a locación"...); el color del badge no viaja al PDF. */
  tipo: string;
  articulo: string;
  /** "+5 unidad" | "−3 litro" | "1 equipo". */
  cantidad: string;
  ubicacion: string;
  referencia: string;
  nota: string;
}

export function MovimientosInventarioDoc({
  titulo,
  subtitulo,
  generado,
  filas,
}: {
  titulo: string;
  /** Filtros aplicados + conteo ("Todos los tipos · 12 movimientos · ..."). */
  subtitulo: string;
  /** Fecha de generación dd-mm-yyyy (pie de página). */
  generado: string;
  filas: FilaKardex[];
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <MembreteLoter />
        <Text style={s.titulo}>{titulo}</Text>
        <Text style={s.subtitulo}>{subtitulo}</Text>
        <View style={s.regla} />

        <View style={s.tabla}>
          <View style={[s.tFila, s.tCab]}>
            <Text style={[s.tCelda, { flex: 0.8 }]}>Fecha</Text>
            <Text style={[s.tCelda, { flex: 1 }]}>Tipo</Text>
            <Text style={[s.tCelda, { flex: 1.8 }]}>Artículo</Text>
            <Text style={[s.tNum, { flex: 0.9 }]}>Cantidad</Text>
            <Text style={[s.tCelda, { flex: 1.1 }]}>Ubicación</Text>
            <Text style={[s.tCelda, { flex: 0.9 }]}>Referencia</Text>
            <Text style={[s.tCelda, { flex: 2 }]}>Nota</Text>
          </View>
          {filas.map((f, i) => (
            <View key={i} style={s.tFila}>
              <Text style={[s.tCelda, { flex: 0.8 }]}>{f.fecha}</Text>
              <Text style={[s.tCelda, { flex: 1 }]}>{f.tipo}</Text>
              <Text style={[s.tCelda, { flex: 1.8 }]}>{f.articulo}</Text>
              <Text style={[s.tNum, { flex: 0.9 }]}>{f.cantidad}</Text>
              <Text style={[s.tCelda, { flex: 1.1 }]}>{f.ubicacion}</Text>
              <Text style={[s.tCelda, { flex: 0.9 }]}>{f.referencia}</Text>
              <Text style={[s.tCelda, { flex: 2 }]}>{f.nota}</Text>
            </View>
          ))}
          <View style={[s.tFilaUlt, s.total]}>
            <Text style={s.tCelda}>
              {filas.length} movimiento{filas.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        <Text style={s.pie}>LOTER, C.A. — RIF J-31717295-7 · Documento generado el {generado}</Text>
      </Page>
    </Document>
  );
}
