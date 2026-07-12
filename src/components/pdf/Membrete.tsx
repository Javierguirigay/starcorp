/**
 * Membrete de LOTER para los PDF: logo oficial arriba-izquierda (con fallback
 * tipográfico si la empresa no tiene logo) y el bloque de datos a la derecha,
 * réplica del papel real.
 * Importa @react-pdf/renderer: cargar SIEMPRE con `await import(...)` desde un
 * handler de cliente, nunca en el bundle inicial.
 */
import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import { logoPdfDe } from "@/lib/branding";

export const NAVY = "#0F2742";
export const GOLD = "#D08F00";
export const NEGRO = "#111111";
export const SLATE = "#64748B";
export const BORDE = "#CBD5E1";

const LOGO_SRC = logoPdfDe("loter");

const m = StyleSheet.create({
  cabecera: { flexDirection: "row", justifyContent: "space-between" },
  logoTexto: { width: 150 },
  logoLoter: { fontFamily: "Helvetica-Bold", fontSize: 26, color: NAVY, letterSpacing: 2 },
  logoSub: { fontFamily: "Helvetica-Bold", fontSize: 6, color: GOLD, letterSpacing: 2.4, marginTop: 1 },
  derecha: { width: 300, alignItems: "flex-end" },
  razon: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  linea: { fontSize: 7, marginTop: 1.5, textAlign: "right" },
  regla: { borderBottomWidth: 2, borderBottomColor: NEGRO, alignSelf: "stretch", marginTop: 3 },
  telefonos: { fontSize: 7, marginTop: 2, textAlign: "right" },
});

/** Encabezado con logo + datos fiscales de LOTER (mismo que factura/retención). */
export function MembreteLoter() {
  return (
    <View style={m.cabecera}>
      {LOGO_SRC ? (
        /* Proporción del PNG oficial (600×513). */
        /* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image no admite alt */
        <Image src={LOGO_SRC} style={{ width: 96, height: 82 }} />
      ) : (
        <View style={m.logoTexto}>
          <Text style={m.logoLoter}>LOTER</Text>
          <Text style={m.logoSub}>SERVICIOS INTEGRALES</Text>
        </View>
      )}
      <View style={m.derecha}>
        <Text style={m.razon}>LOTER, C.A.  /  RIF. J-31717295-7</Text>
        <Text style={m.linea}>Construcción,  Mantenimiento</Text>
        <Text style={m.linea}>Electrificación, Izamiento, Mudanza de Taladros</Text>
        <Text style={m.linea}>Vaccuums, Well Services, Acarreo de Fluidos</Text>
        <Text style={m.linea}>Transporte, Maquinaria Pesada, Locaciones Petroleras</Text>
        <Text style={m.linea}>
          Av. Bolívar con Juncal, Edif Pichel, Piso 1, Of. 14, Maturín Edo. Monagas
        </Text>
        <View style={m.regla} />
        <Text style={m.telefonos}>Tlfs.:  0291-642.85.69/ e-mail: loterca@gmail.com</Text>
      </View>
    </View>
  );
}
