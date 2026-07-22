/**
 * Datos fiscales por empresa para los membretes y encabezados de los PDF.
 * Fuente única del bloque legal (razón social, RIF, dirección, contacto,
 * actividades) que cada empresa imprime en sus documentos.
 *
 * NOTA sobre LOTER: su MEMBRETE (logo + actividades + contacto) sigue viniendo
 * de `DATOS_LOTER` en `Membrete.tsx` para no alterar sus PDF. La entrada `loter`
 * de este registro solo la consumen los encabezados fiscales de los libros y
 * comprobantes (razón social / RIF / dirección), que antes usaban literales o
 * las constantes `LOTER_*` de config.
 *
 * Campos opcionales que aún no constan en los documentos entregados por el
 * usuario (teléfono, email, actividades) se omiten hasta tenerlos.
 */
import { LOTER_DIRECCION, LOTER_RAZON, LOTER_RIF } from "./config";
import { EMPRESAS } from "./data/empresas";

export interface DatosFiscalesEmpresa {
  razonSocial: string;
  rif: string;
  /** Marca tipográfica de respaldo cuando la empresa no tiene logo. */
  marca: { principal: string; sub?: string };
  direccion?: string;
  telefono?: string;
  email?: string;
  /** Líneas de actividades económicas bajo la razón social (estilo LOTER). */
  actividades?: string[];
}

export const DATOS_FISCALES: Record<string, DatosFiscalesEmpresa> = {
  loter: {
    razonSocial: LOTER_RAZON,
    rif: LOTER_RIF,
    marca: { principal: "LOTER", sub: "SERVICIOS INTEGRALES" },
    direccion: LOTER_DIRECCION,
  },
  etm: {
    razonSocial: "ETM SUPPLY PROCURA Y MERCADEO, C.A.",
    rif: "J-29686251-6",
    marca: { principal: "ETM SUPPLY" },
    direccion:
      "Av. Bolívar con Av. Juncal, Edificio Pichel, Piso 1, Oficina 11, Maturín, Estado Monagas",
  },
  monaco: {
    razonSocial: "MONACO EVENTOS Y BANQUETES, C.A.",
    rif: "J-31717306-6",
    marca: { principal: "MÓNACO", sub: "EVENTOS Y BANQUETES" },
    direccion:
      "Carrera 7, Antigua Calle Monagas, Sector Barrio Obrero, Nro. 89, Maturín, Estado Monagas",
  },
};

/** Datos fiscales de una empresa; si no está en el registro, cae en su
    razón social/RIF del catálogo `EMPRESAS`. */
export function datosFiscalesDe(empresaKey: string): DatosFiscalesEmpresa {
  const f = DATOS_FISCALES[empresaKey];
  if (f) return f;
  const e = EMPRESAS.find((x) => x.key === empresaKey);
  const nombre = e?.nombre ?? empresaKey;
  return {
    razonSocial: nombre,
    rif: e?.rif ?? "",
    marca: { principal: nombre.replace(", C.A.", "").toUpperCase() },
  };
}
