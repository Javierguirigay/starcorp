"use client";

/**
 * Pestaña Movimientos (kardex): historial de entradas, salidas, retornos y
 * ajustes del inventario con su referencia (OE/OC/Manual). Filtros por tipo,
 * texto (artículo/referencia/nota) y rango de fechas.
 */
import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import type { TipoMovInventario } from "@/lib/types";
import { fmtISO, formatFechaVE } from "@/lib/format";
import {
  ETIQUETA_MOV,
  filtrarMovimientos,
  deltaStock,
} from "@/lib/negocio/movimientosInventario";
import { Toast } from "@/components/ui/Toast";
import { SearchInput } from "@/components/ui/SearchInput";
import { PdfPreviewModal, type PreviewPdf } from "@/components/facturacion/PdfPreviewModal";
import { useInventario } from "./InventarioProvider";

const inputCls =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

const BADGE_MOV: Record<TipoMovInventario, string> = {
  entrada: "bg-emerald-50 text-emerald-700",
  salida: "bg-navy-50 text-navy-700",
  salida_definitiva: "bg-rose-50 text-rose-700",
  retorno: "bg-sky-50 text-sky-700",
  ajuste: "bg-amber-50 text-amber-700",
};

const TIPOS_FILTRO: (TipoMovInventario | "todos")[] = [
  "todos",
  "entrada",
  "salida",
  "salida_definitiva",
  "retorno",
  "ajuste",
];

export function MovimientosTab() {
  const inv = useInventario();
  const [tipo, setTipo] = useState<TipoMovInventario | "todos">("todos");
  const [texto, setTexto] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewPdf | null>(null);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Más recientes arriba (mismo día: el último registrado primero).
  const movs = filtrarMovimientos(inv.movimientos, { tipo, texto, desde, hasta }).sort((a, b) =>
    a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1
  );

  // Exporta exactamente lo que se ve en pantalla (filtros y orden actuales).
  const exportar = async () => {
    if (generando) return;
    if (!movs.length) {
      setToast("No hay movimientos que exportar con estos filtros");
      return;
    }
    setGenerando(true);
    try {
      const [docs, { generarPdfBlob }] = await Promise.all([
        import("./pdf/documentos"),
        import("@/components/pdf/descargar"),
      ]);
      const hoy = fmtISO(new Date());
      const partes = [
        tipo === "todos" ? "Todos los tipos" : `Tipo: ${ETIQUETA_MOV[tipo]}`,
        ...(texto.trim() ? [`Texto: “${texto.trim()}”`] : []),
        ...(desde ? [`Desde ${formatFechaVE(desde)}`] : []),
        ...(hasta ? [`Hasta ${formatFechaVE(hasta)}`] : []),
      ];
      const doc = (
        <docs.MovimientosInventarioDoc
          titulo="Movimientos de Inventario"
          subtitulo={`${partes.join(" · ")} · ${movs.length} movimiento${
            movs.length === 1 ? "" : "s"
          } · Generado el ${formatFechaVE(hoy)}`}
          generado={formatFechaVE(hoy)}
          filas={movs.map((m) => {
            const delta = m.clase === "consumible" ? deltaStock(m) : null;
            return {
              fecha: formatFechaVE(m.fecha),
              tipo: ETIQUETA_MOV[m.tipo],
              articulo: m.articuloNombre,
              cantidad:
                delta === null ? "1 equipo" : `${delta > 0 ? "+" : ""}${delta} ${m.unidad ?? ""}`,
              ubicacion: m.ubicacion || "—",
              referencia: m.referencia,
              nota: m.nota ?? "—",
            };
          })}
        />
      );
      const blob = await generarPdfBlob(doc);
      setPreview({
        url: URL.createObjectURL(blob),
        nombre: `movimientos_inventario_${formatFechaVE(hoy)}.pdf`,
        titulo: "Movimientos de Inventario",
      });
    } catch {
      setToast("No se pudo generar el PDF");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-base font-700 text-navy-950">Movimientos</h2>
          <p className="text-xs text-slate-400">
            Kardex del inventario: cada entrada y salida con su documento de referencia
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoMovInventario | "todos")}
            className={inputCls}
          >
            {TIPOS_FILTRO.map((t) => (
              <option key={t} value={t}>
                {t === "todos" ? "Todos los tipos" : ETIQUETA_MOV[t]}
              </option>
            ))}
          </select>
          <SearchInput
            value={texto}
            onChange={setTexto}
            placeholder="Artículo o referencia…"
            className="w-44"
          />
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            title="Desde"
            className={inputCls}
          />
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            title="Hasta"
            className={inputCls}
          />
          <button
            onClick={exportar}
            disabled={generando}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" /> {generando ? "Generando…" : "Exportar PDF"}
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-600">Fecha</th>
              <th className="px-5 py-3 font-600">Tipo</th>
              <th className="px-5 py-3 font-600">Artículo</th>
              <th className="px-5 py-3 text-right font-600">Cantidad</th>
              <th className="px-5 py-3 font-600">Ubicación</th>
              <th className="px-5 py-3 font-600">Referencia</th>
              <th className="px-5 py-3 font-600">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {movs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                  {inv.movimientos.length === 0
                    ? "Aún no hay movimientos. Se registran al crear órdenes de entrega, recibir compras o registrar entradas manuales."
                    : "Ningún movimiento coincide con los filtros."}
                </td>
              </tr>
            ) : (
              movs.map((m) => {
                const delta = m.clase === "consumible" ? deltaStock(m) : null;
                return (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                      {formatFechaVE(m.fecha)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-600 ${BADGE_MOV[m.tipo]}`}
                      >
                        {ETIQUETA_MOV[m.tipo]}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-600 text-navy-900">{m.articuloNombre}</td>
                    <td
                      className={`whitespace-nowrap px-5 py-3 text-right font-mono ${
                        delta === null
                          ? "text-slate-500"
                          : delta < 0
                            ? "text-rose-600"
                            : "text-emerald-600"
                      }`}
                    >
                      {delta === null
                        ? "1 equipo"
                        : `${delta > 0 ? "+" : ""}${delta} ${m.unidad ?? ""}`}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{m.ubicacion || "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs font-600 text-navy-700">
                      {m.referencia}
                    </td>
                    <td className="max-w-[16rem] truncate px-5 py-3 text-xs text-slate-400">
                      {m.nota ?? "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {preview && (
        <PdfPreviewModal preview={preview} onToast={setToast} onClose={() => setPreview(null)} />
      )}
      {toast && <Toast mensaje={toast} />}
    </section>
  );
}
