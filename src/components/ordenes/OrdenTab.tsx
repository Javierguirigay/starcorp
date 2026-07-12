"use client";

/**
 * Lista de órdenes de un tipo (compra / entrega / requerimiento): alta, edición,
 * eliminación y exportación a PDF con vista previa (mismo patrón que el resto
 * de la app: import dinámico del documento + generarPdfBlob + PdfPreviewModal).
 */
import { useEffect, useState } from "react";
import { FileDown, Pencil, Plus, Trash2 } from "lucide-react";
import type { Orden, TipoOrden } from "@/lib/types";
import { formatFechaVE, formatNumberVE } from "@/lib/format";
import { TITULO_ORDEN, totalesOrden } from "@/lib/negocio/ordenes";
import { Toast } from "@/components/ui/Toast";
import { PdfPreviewModal, type PreviewPdf } from "@/components/facturacion/PdfPreviewModal";
import { useOrdenes } from "./OrdenesProvider";
import { OrdenModal } from "./OrdenModal";

export function OrdenTab({ tipo }: { tipo: TipoOrden }) {
  const ord = useOrdenes();
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<{ id: number | null } | null>(null);
  const [preview, setPreview] = useState<PreviewPdf | null>(null);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const ordenes = ord.ordenesDe(tipo);
  const conPrecios = tipo === "compra";

  const exportar = async (orden: Orden) => {
    if (generando) return;
    setGenerando(true);
    try {
      const [docs, { generarPdfBlob }] = await Promise.all([
        import("./pdf/documentosOrdenes"),
        import("@/components/pdf/descargar"),
      ]);
      const blob = await generarPdfBlob(<docs.OrdenDoc orden={orden} />);
      setPreview({
        url: URL.createObjectURL(blob),
        nombre: `${orden.numero.toLowerCase()}.pdf`,
        titulo: `${TITULO_ORDEN[tipo]} ${orden.numero}`,
      });
    } catch {
      setToast("No se pudo generar el PDF");
    } finally {
      setGenerando(false);
    }
  };

  const eliminar = (orden: Orden) => {
    if (!confirm(`¿Eliminar la ${TITULO_ORDEN[tipo]} ${orden.numero}?`)) return;
    ord.eliminarOrden(orden.id);
    setToast("Orden eliminada");
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-700 text-navy-950">
              {TITULO_ORDEN[tipo]}
            </h2>
            <p className="text-xs text-slate-400">
              Historial con numeración correlativa · exportable a PDF con el membrete de LOTER
            </p>
          </div>
          <button
            onClick={() => setModal({ id: null })}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
          >
            <Plus className="h-[18px] w-[18px]" /> Nueva {TITULO_ORDEN[tipo].toLowerCase()}
          </button>
        </div>

        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-600">N° Orden</th>
                <th className="px-4 py-3 font-600">Fecha</th>
                <th className="px-4 py-3 font-600">
                  {tipo === "compra"
                    ? "Proveedor"
                    : tipo === "entrega"
                      ? "Destinatario"
                      : "Solicitante"}
                </th>
                <th className="px-4 py-3 text-right font-600">Renglones</th>
                {conPrecios && <th className="px-4 py-3 text-right font-600">Total Bs</th>}
                <th className="px-4 py-3 font-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ordenes.length === 0 ? (
                <tr>
                  <td
                    colSpan={conPrecios ? 6 : 5}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    Aún no hay órdenes. Pulsa «Nueva {TITULO_ORDEN[tipo].toLowerCase()}» para crear
                    la primera.
                  </td>
                </tr>
              ) : (
                ordenes.map((o) => (
                  <tr key={o.id} className="group hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-600 text-navy-900">{o.numero}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                      {formatFechaVE(o.fecha)}
                    </td>
                    <td className="px-4 py-3 text-navy-900">{o.contraparteNombre}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">
                      {o.renglones.length}
                    </td>
                    {conPrecios && (
                      <td className="px-4 py-3 text-right font-mono font-600 text-navy-950">
                        {formatNumberVE(totalesOrden(o.renglones).total)}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        <button
                          onClick={() => exportar(o)}
                          disabled={generando}
                          title="Ver PDF"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-600 text-navy-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <FileDown className="h-3.5 w-3.5" /> PDF
                        </button>
                        <button
                          onClick={() => setModal({ id: o.id })}
                          title="Editar orden"
                          className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-navy-700 group-hover:opacity-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => eliminar(o)}
                          title="Eliminar orden"
                          className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal && (
        <OrdenModal
          key={modal.id ?? "nueva"}
          tipo={tipo}
          orden={modal.id ? (ordenes.find((o) => o.id === modal.id) ?? null) : null}
          onToast={setToast}
          onClose={() => setModal(null)}
        />
      )}
      {preview && (
        <PdfPreviewModal preview={preview} onToast={setToast} onClose={() => setPreview(null)} />
      )}
      {toast && <Toast mensaje={toast} />}
    </>
  );
}
