"use client";

/**
 * Pestaña Retenciones: listado de comprobantes de retención de IVA con
 * exportación del PDF oficial (para imprimir y entregar al sujeto retenido)
 * y creación manual o desde una factura recibida.
 */
import { useEffect, useState } from "react";
import { FileDown, Plus, Trash2 } from "lucide-react";
import type { Retencion } from "@/lib/types";
import { formatFechaVE, formatNumberVE } from "@/lib/format";
import { MESES } from "@/lib/negocio/retenciones";
import { Toast } from "@/components/ui/Toast";
import { useFacturacion } from "../FacturacionProvider";
import { PdfPreviewModal, type PreviewPdf } from "../PdfPreviewModal";
import { RetencionEditor } from "./RetencionEditor";

const selectCls =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function RetencionesTab() {
  const fac = useFacturacion();
  const [filtroProveedor, setFiltroProveedor] = useState<number | "">("");
  const [filtroMes, setFiltroMes] = useState<number | "">("");
  const [editor, setEditor] = useState(false);
  const [preview, setPreview] = useState<PreviewPdf | null>(null);
  const [generando, setGenerando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const visibles = fac.retenciones
    .filter(
      (r) =>
        (filtroProveedor === "" || r.proveedorId === filtroProveedor) &&
        (filtroMes === "" || r.periodoMes === filtroMes)
    )
    .sort((a, b) => (a.comprobante < b.comprobante ? 1 : -1));

  const exportar = async (r: Retencion) => {
    if (generando) return;
    const proveedor = fac.proveedorPorId(r.proveedorId);
    if (!proveedor) return setToast("La retención no tiene proveedor válido");
    setGenerando(true);
    try {
      const [docs, { generarPdfBlob }] = await Promise.all([
        import("../pdf/documentosCompras"),
        import("@/components/pdf/descargar"),
      ]);
      const blob = await generarPdfBlob(
        <docs.ComprobanteRetencionDoc retencion={r} proveedor={proveedor} />
      );
      setPreview({
        url: URL.createObjectURL(blob),
        nombre: `retencion_${r.comprobante}.pdf`,
        titulo: `Comprobante de retención ${r.comprobante}`,
      });
    } catch {
      setToast("No se pudo generar el PDF");
    } finally {
      setGenerando(false);
    }
  };

  const eliminar = (r: Retencion) => {
    if (
      !confirm(
        `¿Eliminar el comprobante ${r.comprobante}? La factura asociada quedará sin retención.`
      )
    )
      return;
    fac.eliminarRetencion(r.id);
    setToast("Retención eliminada");
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-700 text-navy-950">Retenciones de IVA</h2>
            <p className="text-xs text-slate-400">
              Comprobantes (Providencia SNAT/2025/000054) · alimentan el libro de compras
            </p>
          </div>
          <button
            onClick={() => setEditor(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
          >
            <Plus className="h-[18px] w-[18px]" /> Nueva retención
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Proveedor</label>
            <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value === "" ? "" : Number(e.target.value))} className={selectCls}>
              <option value="">Todos</option>
              {fac.proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.razonSocial}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Mes del período</label>
            <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value === "" ? "" : Number(e.target.value))} className={selectCls}>
              <option value="">Todos</option>
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-600">Comprobante</th>
                <th className="px-4 py-3 font-600">Emisión</th>
                <th className="px-4 py-3 font-600">Período</th>
                <th className="px-4 py-3 font-600">Sujeto retenido</th>
                <th className="px-4 py-3 text-center font-600">%</th>
                <th className="px-4 py-3 text-right font-600">Base (Bs)</th>
                <th className="px-4 py-3 text-right font-600">Retenido (Bs)</th>
                <th className="px-4 py-3 font-600">Factura</th>
                <th className="px-4 py-3 text-right font-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                    No hay retenciones para estos filtros.
                  </td>
                </tr>
              ) : (
                visibles.map((r) => {
                  const compra = r.facturaRecibidaId
                    ? fac.facturasRecibidas.find((c) => c.id === r.facturaRecibidaId)
                    : undefined;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono font-600 text-navy-900">{r.comprobante}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                        {formatFechaVE(r.fechaEmision)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {MESES[r.periodoMes - 1]} {r.periodoAnio}
                      </td>
                      <td className="px-4 py-3 text-navy-900">
                        {fac.proveedorPorId(r.proveedorId)?.razonSocial ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-600 ${
                            r.pct === 75
                              ? "bg-gold-500/15 text-gold-600"
                              : "bg-navy-50 text-navy-700"
                          }`}
                        >
                          {r.pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {formatNumberVE(r.totalBaseBs)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-600 text-navy-950">
                        {formatNumberVE(r.totalRetenidoBs)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {compra ? compra.numeroFactura : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Exportar comprobante PDF"
                            disabled={generando}
                            onClick={() => exportar(r)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-navy-50 hover:text-navy-700 disabled:opacity-50"
                          >
                            <FileDown className="h-4 w-4" />
                          </button>
                          <button
                            title="Eliminar comprobante"
                            onClick={() => eliminar(r)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editor && <RetencionEditor onToast={setToast} onClose={() => setEditor(false)} />}
      {preview && (
        <PdfPreviewModal preview={preview} onToast={setToast} onClose={() => setPreview(null)} />
      )}
      {toast && <Toast mensaje={toast} />}
    </>
  );
}
