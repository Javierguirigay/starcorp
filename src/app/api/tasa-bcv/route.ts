/**
 * GET /api/tasa-bcv — tasa oficial Bs/USD del BCV vía DolarApi.
 * Server-side para evitar CORS y cachear: la tasa BCV cambia una vez por día
 * hábil, así que 15 min de revalidate sobran y no golpeamos al proveedor en
 * cada carga de la app.
 */
import { BCV_API_URL } from "@/lib/config";
import { parsearTasaBcv } from "@/lib/negocio/tasaBcv";

export async function GET() {
  try {
    const res = await fetch(BCV_API_URL, { next: { revalidate: 900 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dato = parsearTasaBcv(await res.json());
    if (!dato) throw new Error("respuesta del proveedor inválida");
    return Response.json({ ...dato, fuente: "BCV (DolarApi)" });
  } catch {
    return Response.json({ error: "No se pudo obtener la tasa BCV" }, { status: 502 });
  }
}
