/**
 * Generación y descarga de PDFs 100% en el cliente. El renderer se importa
 * dinámicamente aquí (y los documentos en el handler que llama) para
 * mantenerlo fuera del bundle inicial.
 */
import type { ReactElement } from "react";
import { formatFechaVE } from "@/lib/format";
import type { PagoHistorial } from "@/lib/types";

export async function generarPdfBlob(doc: ReactElement): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer");
  // El tipo DocumentProps es del propio renderer; los documentos ya son <Document>.
  return pdf(doc as Parameters<typeof pdf>[0]).toBlob();
}

/** Descarga un blob URL ya creado; el llamador es dueño del URL y lo revoca. */
export function descargarBlob(url: string, nombreArchivo: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
}

/** "José Pérez" -> "jose_perez" (para nombres de archivo). */
export function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Identificador del período para nombres de archivo: dd-mm-yyyy_a_dd-mm-yyyy. */
export function periodoSlug(pago: Pick<PagoHistorial, "desde" | "hasta">): string {
  return `${formatFechaVE(pago.desde)}_a_${formatFechaVE(pago.hasta)}`;
}
