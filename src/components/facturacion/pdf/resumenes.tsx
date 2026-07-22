/**
 * Resúmenes fiscales en PDF: componente genérico (tabla BASE | CRÉDITOS/DÉBITOS
 * + filas simples) con las dos variantes del "Resumen de Débitos y Créditos
 * Fiscales IVA" — créditos (compras) y débitos (ventas). Único módulo de
 * resúmenes que importa @react-pdf/renderer: cargarlo SIEMPRE con
 * `await import(...)` desde un handler de cliente.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Empresa } from "@/lib/types";
import { datosFiscalesDe } from "@/lib/empresaFiscal";
import { formatNumberVE } from "@/lib/format";
import type { ResumenCreditos } from "@/lib/negocio/compras";
import type { ResumenFiscal } from "@/lib/negocio/resumenFiscal";

const NEGRO = "#111111";

const rc = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 9, color: NEGRO },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 12, textAlign: "center" },
  sub: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", marginTop: 2 },
  tabla: { borderWidth: 1, borderColor: NEGRO, marginTop: 14 },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: NEGRO },
  filaUlt: { flexDirection: "row" },
  cab: { backgroundColor: "#E8EDF3", fontFamily: "Helvetica-Bold" },
  etq: { flex: 1, padding: 4 },
  val: { width: 92, padding: 4, textAlign: "right", borderLeftWidth: 0.5, borderLeftColor: NEGRO },
  bold: { fontFamily: "Helvetica-Bold" },
  simple: { borderWidth: 1, borderColor: NEGRO, marginTop: 8, flexDirection: "row" },
  nota: { marginTop: 10, fontSize: 7, color: "#555" },
});

export interface FilaBaseMonto {
  etq: string;
  base: number;
  /** null = celda vacía (fila solo-base). */
  monto: number | null;
  bold?: boolean;
}

export interface FilaSimple {
  etq: string;
  val: number;
  bold?: boolean;
}

/** Esqueleto compartido de ambos resúmenes. */
function ResumenFiscalDoc({
  titulo,
  periodo,
  seccion,
  colMonto,
  filas,
  simples,
  nota,
  empresa,
}: {
  titulo: string; // "RESUMEN DE CRÉDITOS FISCALES IVA" / "…DÉBITOS…"
  periodo: string; // "JULIO 2026"
  seccion: string; // "CRÉDITOS FISCALES" / "DÉBITOS FISCALES"
  colMonto: string; // "CRÉDITOS" / "DÉBITOS"
  filas: FilaBaseMonto[];
  simples: FilaSimple[];
  nota?: string;
  empresa: Empresa;
}) {
  const fisc = datosFiscalesDe(empresa.key);
  return (
    <Document>
      <Page size="LETTER" style={rc.page}>
        <Text style={rc.titulo}>{fisc.razonSocial}</Text>
        <Text style={rc.sub}>{titulo}</Text>
        <Text style={rc.sub}>{periodo}</Text>
        <Text style={[rc.sub, { fontSize: 9 }]}>{fisc.rif}</Text>

        <View style={rc.tabla}>
          <View style={[rc.fila, rc.cab]}>
            <Text style={rc.etq}>{seccion}</Text>
            <Text style={rc.val}>BASE</Text>
            <Text style={rc.val}>{colMonto}</Text>
          </View>
          {filas.map((f, i) => (
            <View key={f.etq} style={i === filas.length - 1 ? rc.filaUlt : rc.fila}>
              <Text style={[rc.etq, ...(f.bold ? [rc.bold] : [])]}>{f.etq}</Text>
              <Text style={[rc.val, ...(f.bold ? [rc.bold] : [])]}>{formatNumberVE(f.base)}</Text>
              <Text style={[rc.val, ...(f.bold ? [rc.bold] : [])]}>
                {f.monto === null ? "" : formatNumberVE(f.monto)}
              </Text>
            </View>
          ))}
        </View>

        {simples.map((f) => (
          <View key={f.etq} style={rc.simple}>
            <Text style={[rc.etq, ...(f.bold ? [rc.bold] : [])]}>{f.etq}</Text>
            <Text style={[rc.val, ...(f.bold ? [rc.bold] : [])]}>{formatNumberVE(f.val)}</Text>
          </View>
        ))}

        {nota ? <Text style={rc.nota}>{nota}</Text> : null}
      </Page>
    </Document>
  );
}

/* ============ Créditos fiscales (compras) ============ */

export function ResumenCreditosDoc({
  periodo,
  resumen,
  empresa,
}: {
  periodo: string;
  resumen: ResumenCreditos;
  empresa: Empresa;
}) {
  return (
    <ResumenFiscalDoc
      empresa={empresa}
      titulo="RESUMEN DE CRÉDITOS FISCALES IVA"
      periodo={periodo}
      seccion="CRÉDITOS FISCALES"
      colMonto="CRÉDITOS"
      filas={[
        { etq: "Compras No Gravadas o Sin Derecho a Crédito", base: resumen.noGravadasBase, monto: null },
        { etq: "Compras Internas Gravadas Solo Alícuota General", base: resumen.generalBase, monto: resumen.generalCredito },
        { etq: "Compras Internas Gravadas Alícuota General Más Alícuota Adicional", base: 0, monto: 0 },
        { etq: "Compras Internas Gravadas Alícuota Reducida", base: 0, monto: 0 },
        { etq: "Total Compras y Créditos Fiscales", base: resumen.totalBase, monto: resumen.totalCredito, bold: true },
      ]}
      simples={[
        { etq: "Total Créditos Fiscales del Período", val: resumen.totalCreditosPeriodo, bold: true },
        { etq: "Excedentes de créditos fiscales del mes anterior (Ítem 60)", val: 0 },
        { etq: "TOTAL CRÉDITOS FISCALES", val: resumen.totalCreditosPeriodo, bold: true },
        { etq: "Retenciones del período", val: 0 },
        { etq: "Retenciones soportadas descontadas en esta declaración", val: 0 },
        { etq: "Saldo de Retenciones de IVA no aplicado", val: 0 },
      ]}
      nota={`Retenciones de IVA practicadas a terceros en el período (informativo): Bs ${formatNumberVE(
        resumen.retencionesPracticadasBs
      )}. Las filas de retenciones soportadas corresponden a comprobantes recibidos de clientes y se declaran en 0,00 en esta fase.`}
    />
  );
}

/* ============ Débitos fiscales (ventas) ============ */

export function ResumenDebitosDoc({
  periodo,
  resumen,
  empresa,
}: {
  periodo: string;
  resumen: ResumenFiscal;
  empresa: Empresa;
}) {
  return (
    <ResumenFiscalDoc
      empresa={empresa}
      titulo="RESUMEN DE DÉBITOS FISCALES IVA"
      periodo={periodo}
      seccion="DÉBITOS FISCALES"
      colMonto="DÉBITOS"
      filas={[
        { etq: "Ventas Internas No Gravadas", base: resumen.noGravadasBase, monto: null },
        { etq: "Ventas Internas Gravadas Alícuota General", base: resumen.generalBase, monto: resumen.generalMonto },
        { etq: "Ventas Internas Gravadas Alícuota General Más Alícuota Adicional", base: 0, monto: 0 },
        { etq: "Ventas Internas Gravadas Alícuota Reducida", base: 0, monto: 0 },
        { etq: "Total Ventas y Débitos Fiscales", base: resumen.totalBase, monto: resumen.totalMonto, bold: true },
      ]}
      simples={[{ etq: "Total Débitos Fiscales del Período", val: resumen.totalPeriodo, bold: true }]}
    />
  );
}
