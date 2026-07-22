/**
 * Membrete para los PDF: logo oficial arriba-izquierda (con fallback
 * tipográfico si la empresa no tiene logo) y el bloque de datos a la derecha,
 * réplica del papel real. `MembreteEmpresa` es el genérico; `MembreteLoter`
 * y `MembreteGrupo` son las variantes listas para usar.
 * Importa @react-pdf/renderer: cargar SIEMPRE con `await import(...)` desde un
 * handler de cliente, nunca en el bundle inicial.
 */
import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import { logoPdfDe, logoPdfTamDe } from "@/lib/branding";
import { DATOS_FISCALES } from "@/lib/empresaFiscal";
import { APP_NAME } from "@/lib/config";
import type { Empresa } from "@/lib/types";

export const NAVY = "#0F2742";
export const GOLD = "#D08F00";
export const NEGRO = "#111111";
export const SLATE = "#64748B";
export const BORDE = "#CBD5E1";

const m = StyleSheet.create({
  cabecera: { flexDirection: "row", justifyContent: "space-between" },
  logoTexto: { width: 150 },
  logoLoter: { fontFamily: "Helvetica-Bold", fontSize: 26, color: NAVY, letterSpacing: 2 },
  logoSub: { fontFamily: "Helvetica-Bold", fontSize: 6, color: GOLD, letterSpacing: 2.4, marginTop: 1 },
  /* Marcas largas sin logo (ETM SUPPLY, MONACO...): cuerpo menor para evitar wrap. */
  logoTextoAncho: { width: 190 },
  logoGenerico: { fontFamily: "Helvetica-Bold", fontSize: 20, color: NAVY, letterSpacing: 1.5 },
  derecha: { width: 300, alignItems: "flex-end" },
  razon: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  linea: { fontSize: 7, marginTop: 1.5, textAlign: "right" },
  regla: { borderBottomWidth: 2, borderBottomColor: NEGRO, alignSelf: "stretch", marginTop: 3 },
  telefonos: { fontSize: 7, marginTop: 2, textAlign: "right" },
});

export interface DatosMembrete {
  logoSrc: string | null;
  logoTam: { width: number; height: number };
  /** Marca tipográfica de respaldo cuando no hay logo. */
  marca: { principal: string; sub?: string };
  /** Línea en negrita del bloque derecho ("LOTER, C.A.  /  RIF. J-31717295-7"). */
  razon: string;
  /** Actividades + dirección (solo LOTER las tiene hoy). */
  lineas?: string[];
  /** Teléfonos/email bajo la regla. */
  contacto?: string;
}

/** Encabezado genérico: logo (o marca tipográfica) a la izquierda, datos a la derecha. */
export function MembreteEmpresa({ datos }: { datos: DatosMembrete }) {
  const marcaLarga = datos.marca.principal.length > 6;
  return (
    <View style={m.cabecera}>
      {datos.logoSrc ? (
        /* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image no admite alt */
        <Image src={datos.logoSrc} style={datos.logoTam} />
      ) : (
        <View style={marcaLarga ? m.logoTextoAncho : m.logoTexto}>
          <Text style={marcaLarga ? m.logoGenerico : m.logoLoter}>{datos.marca.principal}</Text>
          {datos.marca.sub ? <Text style={m.logoSub}>{datos.marca.sub}</Text> : null}
        </View>
      )}
      <View style={m.derecha}>
        <Text style={m.razon}>{datos.razon}</Text>
        {(datos.lineas ?? []).map((linea) => (
          <Text key={linea} style={m.linea}>
            {linea}
          </Text>
        ))}
        <View style={m.regla} />
        {datos.contacto ? <Text style={m.telefonos}>{datos.contacto}</Text> : null}
      </View>
    </View>
  );
}

/* Proporción del PNG oficial (600×513). */
const DATOS_LOTER: DatosMembrete = {
  logoSrc: logoPdfDe("loter"),
  logoTam: logoPdfTamDe("loter"),
  marca: { principal: "LOTER", sub: "SERVICIOS INTEGRALES" },
  razon: "LOTER, C.A.  /  RIF. J-31717295-7",
  lineas: [
    "Construcción,  Mantenimiento",
    "Electrificación, Izamiento, Mudanza de Taladros",
    "Vaccuums, Well Services, Acarreo de Fluidos",
    "Transporte, Maquinaria Pesada, Locaciones Petroleras",
    "Av. Bolívar con Juncal, Edif Pichel, Piso 1, Of. 14, Maturín Edo. Monagas",
  ],
  contacto: "Tlfs.:  0291-642.85.69/ e-mail: loterca@gmail.com",
};

/** Encabezado con logo + datos fiscales de LOTER (mismo que factura/retención). */
export function MembreteLoter() {
  return <MembreteEmpresa datos={DATOS_LOTER} />;
}

/** Membrete genérico por empresa; para "loter" devuelve el membrete fiscal
    completo, y para las empresas con datos fiscales registrados
    (`DATOS_FISCALES`) arma su bloque real; el resto usa un membrete mínimo. */
export function membreteDeEmpresa(e: Pick<Empresa, "key" | "nombre" | "rif">): DatosMembrete {
  if (e.key === "loter") return DATOS_LOTER;

  const fisc = DATOS_FISCALES[e.key];
  if (fisc) {
    const lineas = [...(fisc.actividades ?? [])];
    if (fisc.direccion) lineas.push(fisc.direccion);
    const contacto = [
      fisc.telefono ? `Tlfs.: ${fisc.telefono}` : null,
      fisc.email ? `e-mail: ${fisc.email}` : null,
    ]
      .filter(Boolean)
      .join(" / ");
    return {
      logoSrc: logoPdfDe(e.key),
      logoTam: logoPdfTamDe(e.key),
      marca: fisc.marca,
      razon: `${fisc.razonSocial}  /  RIF. ${fisc.rif}`,
      lineas: lineas.length ? lineas : undefined,
      contacto: contacto || undefined,
    };
  }

  return {
    logoSrc: logoPdfDe(e.key),
    logoTam: logoPdfTamDe(e.key),
    marca: { principal: e.nombre.replace(", C.A.", "").toUpperCase() },
    razon: e.rif ? `${e.nombre}  /  RIF. ${e.rif}` : e.nombre,
  };
}

/** Razón social + RIF de una empresa para pies de página de PDF. Para LOTER
    respeta el texto histórico exacto. */
export function razonRifDeEmpresa(e: Pick<Empresa, "key" | "nombre" | "rif">): string {
  if (e.key === "loter") return "LOTER, C.A. — RIF J-31717295-7";
  const fisc = DATOS_FISCALES[e.key];
  if (fisc) return `${fisc.razonSocial} — RIF ${fisc.rif}`;
  return e.rif ? `${e.nombre} — RIF ${e.rif}` : e.nombre;
}

/** Variante del grupo: tipográfica STARCORP GROUP, sin logo. */
export function MembreteGrupo() {
  return (
    <MembreteEmpresa
      datos={{
        logoSrc: null,
        logoTam: logoPdfTamDe("grupo"),
        marca: { principal: "STARCORP", sub: "GROUP" },
        razon: APP_NAME,
      }}
    />
  );
}
