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

/** Fila ya resuelta para imprimir (fechas dd-mm-yyyy, etiquetas y equivalentes con tasa snapshot). */
export interface FilaReporte {
  fecha: string;
  cuenta: string;
  categoria: string;
  descripcion: string;
  origen: string;
  /** Monto nativo pre-formateado con su símbolo ("Bs 120.000,00"). */
  monto: string;
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
            <Text style={[s.tCelda, { flex: 1 }]}>Cuenta</Text>
            <Text style={[s.tCelda, { flex: 1.2 }]}>Categoría</Text>
            <Text style={[s.tCelda, { flex: 1.8 }]}>Descripción</Text>
            <Text style={[s.tCelda, { flex: 0.8 }]}>Origen</Text>
            <Text style={[s.tNum, { flex: 1.1 }]}>Monto</Text>
            <Text style={s.tNum}>Equiv. USD</Text>
            <Text style={[s.tNum, { flex: 1.2 }]}>Equiv. Bs</Text>
          </View>
          {filas.map((f, i) => (
            <View key={i} style={s.tFila}>
              <Text style={[s.tCelda, { flex: 0.8 }]}>{f.fecha}</Text>
              <Text style={[s.tCelda, { flex: 1 }]}>{f.cuenta}</Text>
              <Text style={[s.tCelda, { flex: 1.2 }]}>{f.categoria}</Text>
              <Text style={[s.tCelda, { flex: 1.8 }]}>{f.descripcion}</Text>
              <Text style={[s.tCelda, { flex: 0.8 }]}>{f.origen}</Text>
              <Text style={[s.tNum, { flex: 1.1 }]}>{f.monto}</Text>
              <Text style={s.tNum}>{money(f.montoUSD)}</Text>
              <Text style={[s.tNum, { flex: 1.2 }]}>{money(f.montoBs, "Bs")}</Text>
            </View>
          ))}
          <View style={[s.tFilaUlt, s.total]}>
            <Text style={[s.tCelda, { flex: 0.8 }]}>Total</Text>
            <Text style={[s.tCelda, { flex: 1 }]}>
              {filas.length} mov{filas.length === 1 ? "." : "s."}
            </Text>
            <Text style={[s.tCelda, { flex: 1.2 }]} />
            <Text style={[s.tCelda, { flex: 1.8 }]} />
            <Text style={[s.tCelda, { flex: 0.8 }]} />
            <Text style={[s.tNum, { flex: 1.1 }]} />
            <Text style={s.tNum}>{money(totalUSD)}</Text>
            <Text style={[s.tNum, { flex: 1.2 }]}>{money(totalBs, "Bs")}</Text>
          </View>
        </View>

        <Text style={[s.subtitulo, { marginTop: 8 }]}>
          Monto en la moneda nativa de cada cuenta; equivalentes calculados con la tasa congelada
          al registrar cada movimiento. Totales solo en equivalentes.
        </Text>
        <Text style={s.pie}>
          {empresaLinea} · Documento generado el {generado}
        </Text>
      </Page>
    </Document>
  );
}

/** Fila del reporte combinado: igual que FilaReporte pero con el tipo del movimiento. */
export interface FilaMovimiento extends FilaReporte {
  /** "Ingreso" | "Egreso" */
  tipo: string;
}

/**
 * Reporte combinado de TODOS los movimientos (ingresos + egresos) de una empresa.
 * Igual lenguaje visual que ReporteFinancieroDoc, con una columna extra "Tipo" para
 * distinguir cada fila y un pie con tres totales: Ingresos, Egresos y Neto.
 */
export function ReporteMovimientosDoc({
  empresaLinea,
  titulo,
  subtitulo,
  generado,
  filas,
  ingresosUSD,
  ingresosBs,
  egresosUSD,
  egresosBs,
  netoUSD,
  netoBs,
}: {
  empresaLinea: string;
  titulo: string;
  subtitulo: string;
  generado: string;
  filas: FilaMovimiento[];
  ingresosUSD: number;
  ingresosBs: number;
  egresosUSD: number;
  egresosBs: number;
  netoUSD: number;
  netoBs: number;
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
            <Text style={[s.tCelda, { flex: 0.7 }]}>Fecha</Text>
            <Text style={[s.tCelda, { flex: 0.6 }]}>Tipo</Text>
            <Text style={[s.tCelda, { flex: 0.9 }]}>Cuenta</Text>
            <Text style={[s.tCelda, { flex: 1.1 }]}>Categoría</Text>
            <Text style={[s.tCelda, { flex: 1.6 }]}>Descripción</Text>
            <Text style={[s.tCelda, { flex: 0.7 }]}>Origen</Text>
            <Text style={[s.tNum, { flex: 1 }]}>Monto</Text>
            <Text style={s.tNum}>Equiv. USD</Text>
            <Text style={[s.tNum, { flex: 1.1 }]}>Equiv. Bs</Text>
          </View>
          {filas.map((f, i) => (
            <View key={i} style={s.tFila}>
              <Text style={[s.tCelda, { flex: 0.7 }]}>{f.fecha}</Text>
              <Text style={[s.tCelda, { flex: 0.6 }]}>{f.tipo}</Text>
              <Text style={[s.tCelda, { flex: 0.9 }]}>{f.cuenta}</Text>
              <Text style={[s.tCelda, { flex: 1.1 }]}>{f.categoria}</Text>
              <Text style={[s.tCelda, { flex: 1.6 }]}>{f.descripcion}</Text>
              <Text style={[s.tCelda, { flex: 0.7 }]}>{f.origen}</Text>
              <Text style={[s.tNum, { flex: 1 }]}>{f.monto}</Text>
              <Text style={s.tNum}>{money(f.montoUSD)}</Text>
              <Text style={[s.tNum, { flex: 1.1 }]}>{money(f.montoBs, "Bs")}</Text>
            </View>
          ))}
          <View style={[s.tFila, s.total]}>
            <Text style={[s.tCelda, { flex: 5.6 }]}>
              Total Ingresos ({filas.filter((f) => f.tipo === "Ingreso").length})
            </Text>
            <Text style={[s.tNum, { flex: 1 }]} />
            <Text style={s.tNum}>{money(ingresosUSD)}</Text>
            <Text style={[s.tNum, { flex: 1.1 }]}>{money(ingresosBs, "Bs")}</Text>
          </View>
          <View style={[s.tFila, s.total]}>
            <Text style={[s.tCelda, { flex: 5.6 }]}>
              Total Egresos ({filas.filter((f) => f.tipo === "Egreso").length})
            </Text>
            <Text style={[s.tNum, { flex: 1 }]} />
            <Text style={s.tNum}>− {money(egresosUSD)}</Text>
            <Text style={[s.tNum, { flex: 1.1 }]}>− {money(egresosBs, "Bs")}</Text>
          </View>
          <View style={[s.tFilaUlt, s.total]}>
            <Text style={[s.tCelda, { flex: 5.6 }]}>Neto ({filas.length} movs.)</Text>
            <Text style={[s.tNum, { flex: 1 }]} />
            <Text style={s.tNum}>{money(netoUSD)}</Text>
            <Text style={[s.tNum, { flex: 1.1 }]}>{money(netoBs, "Bs")}</Text>
          </View>
        </View>

        <Text style={[s.subtitulo, { marginTop: 8 }]}>
          Monto en la moneda nativa de cada cuenta; equivalentes calculados con la tasa congelada
          al registrar cada movimiento. Neto = Ingresos − Egresos, solo en equivalentes.
        </Text>
        <Text style={s.pie}>
          {empresaLinea} · Documento generado el {generado}
        </Text>
      </Page>
    </Document>
  );
}

/** Fila del historial del grupo (fechas dd-mm-yyyy, montos convertidos con la tasa snapshot). */
export interface FilaGrupo {
  fecha: string;
  tipo: string;
  ruta: string; // "Origen → Destino"
  descripcion: string;
  montoUSD: number;
  montoBs: number;
}

/** Historial de movimientos del Grupo (entradas, retiros y transferencias entre empresas). */
export function ReporteGrupoDoc({
  grupoLinea,
  titulo,
  subtitulo,
  generado,
  filas,
}: {
  /** "STARCORP GROUP" */
  grupoLinea: string;
  titulo: string;
  subtitulo: string;
  /** Fecha de generación dd-mm-yyyy (pie de página). */
  generado: string;
  filas: FilaGrupo[];
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.empresa}>{grupoLinea}</Text>
        <Text style={s.titulo}>{titulo}</Text>
        <Text style={s.subtitulo}>{subtitulo}</Text>
        <View style={s.regla} />

        <View style={s.tabla}>
          <View style={[s.tFila, s.tCab]}>
            <Text style={[s.tCelda, { flex: 0.8 }]}>Fecha</Text>
            <Text style={[s.tCelda, { flex: 1 }]}>Tipo</Text>
            <Text style={[s.tCelda, { flex: 2 }]}>Origen → Destino</Text>
            <Text style={[s.tCelda, { flex: 2.4 }]}>Descripción</Text>
            <Text style={s.tNum}>Monto USD</Text>
            <Text style={[s.tNum, { flex: 1.2 }]}>Monto Bs</Text>
          </View>
          {filas.map((f, i) => (
            <View key={i} style={s.tFila}>
              <Text style={[s.tCelda, { flex: 0.8 }]}>{f.fecha}</Text>
              <Text style={[s.tCelda, { flex: 1 }]}>{f.tipo}</Text>
              <Text style={[s.tCelda, { flex: 2 }]}>{f.ruta}</Text>
              <Text style={[s.tCelda, { flex: 2.4 }]}>{f.descripcion}</Text>
              <Text style={s.tNum}>{money(f.montoUSD)}</Text>
              <Text style={[s.tNum, { flex: 1.2 }]}>{money(f.montoBs, "Bs")}</Text>
            </View>
          ))}
          <View style={[s.tFilaUlt, s.total]}>
            <Text style={[s.tCelda, { flex: 0.8 }]}>Total</Text>
            <Text style={[s.tCelda, { flex: 5.4 }]}>
              {filas.length} movimiento{filas.length === 1 ? "" : "s"} del grupo
            </Text>
            <Text style={s.tNum} />
            <Text style={[s.tNum, { flex: 1.2 }]} />
          </View>
        </View>

        <Text style={[s.subtitulo, { marginTop: 8 }]}>
          Montos en USD/Bs equivalentes según la tasa congelada al registrar cada movimiento. Las
          transferencias entre empresas del grupo se compensan dentro del consolidado.
        </Text>
        <Text style={s.pie}>
          {grupoLinea} · Documento generado el {generado}
        </Text>
      </Page>
    </Document>
  );
}
