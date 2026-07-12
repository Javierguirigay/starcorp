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
}

export const BRANDING: Record<string, BrandingEmpresa> = {
  loter: { logoPdf: "/branding/logo-loter.png" },
  etm: { logoPdf: null },
  monaco: { logoPdf: null },
  agrostar: { logoPdf: null },
};

export function logoPdfDe(empresaKey: string): string | null {
  return BRANDING[empresaKey]?.logoPdf ?? null;
}
