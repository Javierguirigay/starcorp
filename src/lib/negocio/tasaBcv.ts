/**
 * Parseo/validación de la respuesta del proveedor de tasa BCV (DolarApi).
 * Solo lógica pura: el fetch vive en el route handler /api/tasa-bcv.
 *
 * Respuesta esperada del proveedor:
 *   { "moneda":"USD", "fuente":"oficial", "promedio":709.6935,
 *     "fechaActualizacion":"2026-07-10T00:00:00-04:00", ... }
 */

export interface TasaBcv {
  /** Tasa Bs/USD redondeada a 2 decimales (como los inputs de la app). */
  tasa: number;
  /** Fecha de publicación del BCV en ISO (con hora/zona del proveedor). */
  fechaISO: string;
}

export function parsearTasaBcv(json: unknown): TasaBcv | null {
  if (typeof json !== "object" || json === null) return null;
  const { promedio, fechaActualizacion } = json as {
    promedio?: unknown;
    fechaActualizacion?: unknown;
  };
  if (typeof promedio !== "number" || !Number.isFinite(promedio) || promedio <= 0) return null;
  if (typeof fechaActualizacion !== "string" || fechaActualizacion === "") return null;
  return {
    tasa: Math.round(promedio * 100) / 100,
    fechaISO: fechaActualizacion,
  };
}
