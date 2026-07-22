/**
 * Branding por empresa para los documentos PDF (membretes).
 * Los logos viven en /public/branding; `logoPdf: null` = la empresa aún no
 * tiene logo y los documentos usan la marca tipográfica de respaldo.
 * La UI del sistema (login, sidebar, pantallas) mantiene la marca STARCORP
 * GROUP y no usa esta config.
 */

export interface BrandingEmpresa {
  /** Ruta pública del PNG usado en los PDF (fetchable desde el cliente). */
  logoPdf: string | null;
  /** Tamaño del logo en el PDF, respetando la proporción real del PNG. */
  logoPdfTam?: { width: number; height: number };
}

export const BRANDING: Record<string, BrandingEmpresa> = {
  loter: { logoPdf: "/branding/logo-loter.png", logoPdfTam: { width: 96, height: 82 } },
  // Tamaños con el ancho de LOTER (96) y el alto según la proporción real del PNG:
  // ETM 918×469 → 96×49; MONACO 1536×1024 → 96×64.
  etm: { logoPdf: "/branding/logo-etm.png", logoPdfTam: { width: 96, height: 49 } },
  monaco: { logoPdf: "/branding/logo-monaco.png", logoPdfTam: { width: 96, height: 64 } },
  agrostar: { logoPdf: null },
  daniel: { logoPdf: null },
};

const LOGO_TAM_DEFECTO = { width: 96, height: 82 };

export function logoPdfDe(empresaKey: string): string | null {
  return BRANDING[empresaKey]?.logoPdf ?? null;
}

export function logoPdfTamDe(empresaKey: string): { width: number; height: number } {
  return BRANDING[empresaKey]?.logoPdfTam ?? LOGO_TAM_DEFECTO;
}

/** Tamaño del logo a un ancho objetivo, conservando la proporción real del PNG.
    Para documentos que fijan el ancho (p. ej. el comprobante de retención usa
    76 pt): con LOTER reproduce su tamaño histórico (76×65). */
export function logoPdfTamAncho(
  empresaKey: string,
  ancho: number
): { width: number; height: number } {
  const t = logoPdfTamDe(empresaKey);
  return { width: ancho, height: Math.round((ancho * t.height) / t.width) };
}
