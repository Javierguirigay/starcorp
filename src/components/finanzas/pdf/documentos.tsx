/**
 * Reporte financiero por empresa (ingresos o egresos) en PDF.
 * Mismo lenguaje visual que los recibos de nómina (Helvetica, navy/dorado,
 * regla, tabla con cabecera y fila de total). Único módulo de finanzas que
 * importa @react-pdf/renderer: cargarlo SIEMPRE con `await import(...)` desde
 * un handler de cliente para no meter el renderer (~1 MB) en el bundle
 * inicial ni evaluarlo en SSR.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { money } from "@/lib/format";

const NAVY = "#0F2742";
const GOLD = "#D08F00";
const SLATE = "#64748B";
const BORDE = "#CBD5E1";

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 9, color: NAVY },
  empresa: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 14, marginTop: 2 },
  subtitulo: { fontSize: 9, color: SLATE, marginTop: 2 },
  regla: { borderBottomWidth: 1.5, borderBottomColor: GOLD, marginVertical: 10 },
  tabla: { borderWidth: 1, borderColor: BORDE, borderRadius: 2, marginTop: 4 },
  tFila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDE },
  tFilaUlt: { flexDirection: "row" },
  tCab: { backgroundColor: "#F1F5F9", fontFamily: "Helvetica-Bold" },
  tCelda: { flex: 1, padding: 5 },
  tNum: { flex: 1, padding: 5, textAlign: "right" },
  total: { backgroundColor: "#F8FAFC", fontFamily: "Helvetica-Bold" },
  pie: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: SLATE },
});

/** Fila ya resuelta para imprimir (fechas dd-mm-yyyy, etiquetas y Bs con tasa snapshot). */
export interface FilaReporte {
  fecha: string;
  categoria: string;
  descripcion: string;
  origen: string;
  montoUSD: number;
  montoBs: number;
}

export function ReporteFinancieroDoc({
  empresaLinea,
  titulo,
  subtitulo,
  generado,
  filas,
  totalUSD,
  totalBs,
}: {
  /** "LOTER, C.A. — RIF J-31717295-7" */
  empresaLinea: string;
  /** "Reporte Financiero — Finanzas LOTER" */
  titulo: string;
  /** "Ingresos · Generado el dd-mm-yyyy · Filtros: …" */
  subtitulo: string;
  /** Fecha de generación dd-mm-yyyy (pie de página). */
  generado: string;
  filas: FilaReporte[];
  totalUSD: number;
  totalBs: number;
}) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.empresa}>{empresaLinea}</Text>
        <Text style={s.titulo}>{titulo}</Text>
        <Text style={s.subtitulo}>{subtitulo}</Text>
        <View style={s.regla} />

        <View style={s.tabla}>
          <View style={[s.tFila, s.tCab]}>
            <Text style={[s.tCelda, { flex: 0.8 }]}>Fecha</Text>
            <Text style={[s.tCelda, { flex: 1.4 }]}>Categoría</Text>
            <Text style={[s.tCelda, { flex: 2 }]}>Descripción</Text>
            <Text style={[s.tCelda, { flex: 0.9 }]}>Origen</Text>
            <Text style={s.tNum}>Monto USD</Text>
            <Text style={[s.tNum, { flex: 1.2 }]}>Monto Bs</Text>
          </View>
          {filas.map((f, i) => (
            <View key={i} style={s.tFila}>
              <Text style={[s.tCelda, { flex: 0.8 }]}>{f.fecha}</Text>
              <Text style={[s.tCelda, { flex: 1.4 }]}>{f.categoria}</Text>
              <Text style={[s.tCelda, { flex: 2 }]}>{f.descripcion}</Text>
              <Text style={[s.tCelda, { flex: 0.9 }]}>{f.origen}</Text>
              <Text style={s.tNum}>{money(f.montoUSD)}</Text>
              <Text style={[s.tNum, { flex: 1.2 }]}>{money(f.montoBs, "Bs")}</Text>
            </View>
          ))}
          <View style={[s.tFilaUlt, s.total]}>
            <Text style={[s.tCelda, { flex: 0.8 }]}>Total</Text>
            <Text style={[s.tCelda, { flex: 1.4 }]}>
              {filas.length} movimiento{filas.length === 1 ? "" : "s"}
            </Text>
            <Text style={[s.tCelda, { flex: 2 }]} />
            <Text style={[s.tCelda, { flex: 0.9 }]} />
            <Text style={s.tNum}>{money(totalUSD)}</Text>
            <Text style={[s.tNum, { flex: 1.2 }]}>{money(totalBs, "Bs")}</Text>
          </View>
        </View>

        <Text style={[s.subtitulo, { marginTop: 8 }]}>
          Montos en Bs calculados con la tasa congelada al registrar cada movimiento.
        </Text>
        <Text style={s.pie}>
          {empresaLinea} · Documento generado el {generado}
        </Text>
      </Page>
    </Document>
  );
}
