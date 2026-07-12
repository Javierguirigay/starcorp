"use client";

/**
 * Libro de Ventas (débitos fiscales): auto-alimentado por las facturas
 * emitidas, con cortes quincenales (1-15 y 16-fin de mes) y exportación PDF
 * horizontal por corte.
 */
import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { formatFechaVE, formatNumberVE } from "@/lib/format";
import { filasLibroVentas, totalesLibroVentas } from "@/lib/negocio/facturacion";
import { etiquetaQuincena, rangoQuincena } from "@/lib/negocio/quincenas";
import { MESES } from "@/lib/negocio/retenciones";
import { Toast } from "@/components/ui/Toast";
import { useFacturacion } from "../FacturacionProvider";
import { PdfPreviewModal, type PreviewPdf } from "../PdfPreviewModal";

const selectCls =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function LibroVentasTab() {
  const fac = useFacturacion();
  // Período seed (factura 000116: 18-06-2026 → junio, 2da quincena).
  const [anio, setAnio] = useState(2026);
  const [mes, setMes] = useState(6);
  const [quincena, setQuincena] = useState<1 | 2>(2);
  const [preview, setPreview] = useState<PreviewPdf | null>(null);
  const [generando, setGenerando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const rango = rangoQuincena(anio, mes, quincena);
  const filas = filasLibroVentas(fac.facturas, fac.clientes, rango);
  const totales = totalesLibroVentas(filas);
  const periodo = etiquetaQuincena(anio, mes, quincena);

  const exportar = async () => {
    if (generando) return;
    if (!filas.length) return setToast("No hay facturas en el período seleccionado");
    setGenerando(true);
    try {
      const [docs, { generarPdfBlob, slug }] = await Promise.all([
        import("../pdf/documentos"),
        import("@/components/pdf/descargar"),
      ]);
      const blob = await generarPdfBlob(
        <docs.LibroVentasDoc periodo={periodo} filas={filas} totales={totales} />
      );
      setPreview({
        url: URL.createObjectURL(blob),
        nombre: `libro_ventas_${slug(MESES[mes - 1])}_${anio}_${quincena === 1 ? "1ra" : "2da"}_quincena.pdf`,
        titulo: `Libro de Ventas — ${periodo}`,
      });
    } catch {
      setToast("No se pudo generar el PDF");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-700 text-navy-950">Libro de Ventas</h2>
            <p className="text-xs text-slate-400">
              Débitos fiscales auto-alimentados por las facturas emitidas · cortes quincenales
            </p>
          </div>
          <button
            onClick={exportar}
            disabled={generando}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" /> Exportar PDF del corte
          </button>
        </div>

        {/* Selector de período */}
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Año</label>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(parseInt(e.target.value, 10) || anio)}
              className={`${selectCls} w-24 text-right font-mono`}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Mes</label>
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={selectCls}>
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Quincena</label>
            <select value={quincena} onChange={(e) => setQuincena(Number(e.target.value) as 1 | 2)} className={selectCls}>
              <option value={1}>1RA (del 1 al 15)</option>
              <option value={2}>2DA (del 16 al fin de mes)</option>
            </select>
          </div>
          <p className="ml-auto rounded-xl bg-navy-50/60 px-4 py-2.5 text-xs font-600 text-navy-700">
            PERÍODO: {periodo} · {formatFechaVE(rango.desde)} → {formatFechaVE(rango.hasta)}
          </p>
        </div>

        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-600">N° Oper.</th>
                <th className="px-4 py-3 font-600">Fecha</th>
                <th className="px-4 py-3 font-600">N° Factura</th>
                <th className="px-4 py-3 font-600">N° Control</th>
                <th className="px-4 py-3 font-600">Cliente</th>
                <th className="px-4 py-3 font-600">RIF</th>
                <th className="px-4 py-3 text-right font-600">Ventas con IVA (Bs)</th>
                <th className="px-4 py-3 text-right font-600">Base imponible (Bs)</th>
                <th className="px-4 py-3 text-center font-600">% Alíc.</th>
                <th className="px-4 py-3 text-right font-600">Débito fiscal (Bs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-400">
                    No hay facturas emitidas en este corte.
                  </td>
                </tr>
              ) : (
                filas.map((f) => (
                  <tr key={f.numOp} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-slate-500">{f.numOp}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                      {formatFechaVE(f.fecha)}
                    </td>
                    <td className="px-4 py-3 font-mono font-600 text-navy-900">{f.numeroFactura}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{f.numeroControl}</td>
                    <td className="px-4 py-3 text-navy-900">{f.cliente}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{f.rif}</td>
                    <td className="px-4 py-3 text-right font-mono text-navy-900">
                      {formatNumberVE(f.totalConIvaBs)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      {formatNumberVE(f.baseImponibleBs)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-500">16%</td>
                    <td className="px-4 py-3 text-right font-mono font-600 text-navy-950">
                      {formatNumberVE(f.debitoFiscalBs)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filas.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/60 font-600 text-navy-900">
                  <td colSpan={6} className="px-4 py-3">
                    Totales del período ({filas.length} operaciones)
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatNumberVE(totales.totalConIvaBs)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatNumberVE(totales.baseImponibleBs)}</td>
                  <td />
                  <td className="px-4 py-3 text-right font-mono text-navy-950">
                    {formatNumberVE(totales.debitoFiscalBs)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {preview && (
        <PdfPreviewModal preview={preview} onToast={setToast} onClose={() => setPreview(null)} />
      )}
      {toast && <Toast mensaje={toast} />}
    </>
  );
}
