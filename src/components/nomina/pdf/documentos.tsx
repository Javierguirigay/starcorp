/**
 * Documentos PDF de nómina (recibo individual, consolidado y paquete).
 * Único módulo que importa @react-pdf/renderer: cargarlo SIEMPRE con
 * `await import(...)` desde un handler de cliente para no meter el renderer
 * (~1 MB) en el bundle inicial ni evaluarlo en SSR.
 * Tipografía Helvetica built-in (sin fetch de fuentes externas).
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DetallePago, Empleado, PagoHistorial } from "@/lib/types";
import { formatFechaVE, money } from "@/lib/format";

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
  seccion: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: SLATE,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 10,
  },
  filaDatos: { flexDirection: "row", marginBottom: 2 },
  etiqueta: { width: 130, color: SLATE },
  valor: { flexGrow: 1 },
  tabla: { borderWidth: 1, borderColor: BORDE, borderRadius: 2, marginTop: 4 },
  tFila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDE },
  tFilaUlt: { flexDirection: "row" },
  tCab: { backgroundColor: "#F1F5F9", fontFamily: "Helvetica-Bold" },
  tCelda: { flex: 1, padding: 5 },
  tNum: { flex: 1, padding: 5, textAlign: "right" },
  neto: { backgroundColor: "#F8FAFC", fontFamily: "Helvetica-Bold" },
  firma: { marginTop: 60, flexDirection: "row", justifyContent: "space-between" },
  firmaLinea: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: NAVY,
    paddingTop: 4,
    textAlign: "center",
    color: SLATE,
  },
  pie: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: SLATE },
});

/** Datos del empleado para el recibo (cargo/dpto/base/banco). */
export interface EmpInfo {
  cargo?: string;
  dpto?: string;
  base?: number;
  
}

/**
 * Snapshot del pago si existe; si no (pagos previos a la función), lookup del
 * empleado vigente por id o nombre. Campos ausentes se imprimen como "—".
 */
export function datosEmpleado(d: DetallePago, empleados: Empleado[]): EmpInfo {
  if (d.banco) return { cargo: d.cargo, dpto: d.dpto, base: d.base, };
  const e = empleados.find((x) => (d.empId != null ? x.id === d.empId : x.nombre === d.nombre));
  return e ? { cargo: e.cargo, dpto: e.dpto, base: e.base}: {};
}

const o = (v: string | undefined) => v || "—";

function Encabezado({ titulo, pago }: { titulo: string; pago: PagoHistorial }) {
  return (
    <>
      <Text style={s.empresa}>LOTER, C.A. — RIF J-31717295-7</Text>
      <Text style={s.titulo}>{titulo}</Text>
      <Text style={s.subtitulo}>
        Nómina {pago.categoria} · Período {formatFechaVE(pago.desde)} →{" "}
        {formatFechaVE(pago.hasta)} · Registrado {formatFechaVE(pago.registrado)}
      </Text>
      <View style={s.regla} />
    </>
  );
}

function FilaDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={s.filaDatos}>
      <Text style={s.etiqueta}>{etiqueta}</Text>
      <Text style={s.valor}>{valor}</Text>
    </View>
  );
}

function FilaMonto({
  concepto,
  usd,
  tasa,
  negativo,
  destacada,
  ultima,
}: {
  concepto: string;
  usd: number;
  tasa: number;
  negativo?: boolean;
  destacada?: boolean;
  ultima?: boolean;
}) {
  const signo = negativo && usd > 0 ? "− " : "";
  return (
    <View style={[ultima ? s.tFilaUlt : s.tFila, ...(destacada ? [s.neto] : [])]}>
      <Text style={[s.tCelda, { flex: 2 }]}>{concepto}</Text>
      <Text style={s.tNum}>
        {signo}
        {money(usd)}
      </Text>
      <Text style={s.tNum}>
        {signo}
        {money(usd * tasa, "Bs")}
      </Text>
    </View>
  );
}

export function ReciboPage({
  d,
  pago,
  tasa,
  info,
}: {
  d: DetallePago;
  pago: PagoHistorial;
  tasa: number;
  info: EmpInfo;
}) {
  const descAdelanto = d.descAdelanto ?? 0;
  const base = info.base ?? d.diario * 30;
  return (
    <Page size="A4" style={s.page}>
      <Encabezado titulo="Recibo de pago" pago={pago} />

      <Text style={s.seccion}>Empleado</Text>
      <FilaDato etiqueta="Nombre" valor={d.nombre} />
      <FilaDato etiqueta="Cargo" valor={o(info.cargo)} />
      <FilaDato etiqueta="Departamento" valor={o(info.dpto)} />
      <FilaDato etiqueta="Categoría de pago" valor={pago.categoria} />

      <Text style={s.seccion}>Detalle del pago</Text>
      <FilaDato etiqueta="Días del período" valor={String(d.dias)} />
      <FilaDato etiqueta="Faltas" valor={String(d.faltas)} />
      <View style={s.tabla}>
        <View style={[s.tFila, s.tCab]}>
          <Text style={[s.tCelda, { flex: 2 }]}>Concepto</Text>
          <Text style={s.tNum}>USD</Text>
          <Text style={s.tNum}>Bs (tasa {money(tasa, "Bs")})</Text>
        </View>
        <FilaMonto concepto="Salario base mensual" usd={base} tasa={tasa} />
        <FilaMonto concepto="Salario diario (base ÷ 30)" usd={d.diario} tasa={tasa} />
        <FilaMonto concepto={`Descuento por faltas (${d.faltas})`} usd={d.desc} tasa={tasa} negativo />
        <FilaMonto concepto="Descuento por adelanto" usd={descAdelanto} tasa={tasa} negativo />
        <FilaMonto concepto="Neto a pagar" usd={d.neto} tasa={tasa} destacada ultima />
      </View>

      <View style={s.firma}>
        <Text style={s.firmaLinea}>Firma del trabajador</Text>
        <Text style={s.firmaLinea}>Recibido — fecha</Text>
      </View>

      <Text style={s.pie}>
        LOTER, C.A. — RIF J-31717295-7 · Documento generado el {formatFechaVE(pago.registrado)}
      </Text>
    </Page>
  );
}

export function ReciboDoc(props: {
  d: DetallePago;
  pago: PagoHistorial;
  tasa: number;
  info: EmpInfo;
}) {
  return (
    <Document>
      <ReciboPage {...props} />
    </Document>
  );
}

export function ConsolidadoDoc({ pago, tasa }: { pago: PagoHistorial; tasa: number }) {
  const totalAdelanto = pago.totalAdelanto ?? 0;
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Encabezado titulo="Reporte consolidado de nómina" pago={pago} />
        <View style={s.tabla}>
          <View style={[s.tFila, s.tCab]}>
            <Text style={[s.tCelda, { flex: 2 }]}>Empleado</Text>
            <Text style={[s.tCelda, { flex: 1.4 }]}>Cargo</Text>
            <Text style={s.tCelda}>Categoría</Text>
            <Text style={[s.tNum, { flex: 0.5 }]}>Días</Text>
            <Text style={[s.tNum, { flex: 0.5 }]}>Faltas</Text>
            <Text style={s.tNum}>Desc. faltas</Text>
            <Text style={s.tNum}>Desc. adelanto</Text>
            <Text style={s.tNum}>Neto USD</Text>
            <Text style={[s.tNum, { flex: 1.2 }]}>Neto Bs</Text>
          </View>
          {pago.detalle.map((d, i) => (
            <View key={i} style={s.tFila}>
              <Text style={[s.tCelda, { flex: 2 }]}>{d.nombre}</Text>
              <Text style={[s.tCelda, { flex: 1.4 }]}>{o(d.cargo)}</Text>
              <Text style={s.tCelda}>{pago.categoria}</Text>
              <Text style={[s.tNum, { flex: 0.5 }]}>{d.dias}</Text>
              <Text style={[s.tNum, { flex: 0.5 }]}>{d.faltas}</Text>
              <Text style={s.tNum}>{money(d.desc)}</Text>
              <Text style={s.tNum}>{money(d.descAdelanto ?? 0)}</Text>
              <Text style={s.tNum}>{money(d.neto)}</Text>
              <Text style={[s.tNum, { flex: 1.2 }]}>{money(d.neto * tasa, "Bs")}</Text>
            </View>
          ))}
          <View style={[s.tFilaUlt, s.neto]}>
            <Text style={[s.tCelda, { flex: 2 }]}>Totales ({pago.detalle.length} empleados)</Text>
            <Text style={[s.tCelda, { flex: 1.4 }]} />
            <Text style={s.tCelda} />
            <Text style={[s.tNum, { flex: 0.5 }]} />
            <Text style={[s.tNum, { flex: 0.5 }]} />
            <Text style={s.tNum}>{money(pago.totalDesc)}</Text>
            <Text style={s.tNum}>{money(totalAdelanto)}</Text>
            <Text style={s.tNum}>{money(pago.totalUsd)}</Text>
            <Text style={[s.tNum, { flex: 1.2 }]}>{money(pago.totalUsd * tasa, "Bs")}</Text>
          </View>
        </View>
        <Text style={[s.subtitulo, { marginTop: 8 }]}>
          Montos en Bs calculados a la tasa {money(tasa, "Bs")} por USD.
        </Text>
        <Text style={s.pie}>
          LOTER, C.A. — RIF J-31717295-7 · Documento generado el {formatFechaVE(pago.registrado)}
        </Text>
      </Page>
    </Document>
  );
}

export function PaqueteDoc({
  pago,
  tasa,
  empleados,
}: {
  pago: PagoHistorial;
  tasa: number;
  empleados: Empleado[];
}) {
  return (
    <Document>
      {pago.detalle.map((d, i) => (
        <ReciboPage key={i} d={d} pago={pago} tasa={tasa} info={datosEmpleado(d, empleados)} />
      ))}
    </Document>
  );
}
