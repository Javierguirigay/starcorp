"use client";

/**
 * Pestaña Resumen de Facturación: sección de DÉBITOS del "Resumen de Débitos
 * y Créditos Fiscales IVA", calculada automáticamente desde las facturas
 * emitidas del mes (las mismas del Libro de Ventas). Solo se emite gravado a
 * alícuota general 16 %: las filas de no gravadas / adicional / reducida se
 * muestran en 0,00 (formato fiscal completo).
 */
import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { formatFechaVE, formatNumberVE, money } from "@/lib/format";
import { resumenDebitosMes } from "@/lib/negocio/facturacion";
import { etiquetaQuincena, rangoQuincena } from "@/lib/negocio/quincenas";
import { MESES } from "@/lib/negocio/retenciones";
import { Toast } from "@/components/ui/Toast";
import { useFacturacion } from "../FacturacionProvider";
import { PdfPreviewModal, type PreviewPdf } from "../PdfPreviewModal";

const selectCls =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function ResumenVentasTab() {
  const fac = useFacturacion();
  // Período seed (factura 000116: 18-06-2026 → junio).
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
  const resumen = resumenDebitosMes(fac.facturas, rango);
  const periodo = etiquetaQuincena(anio, mes, quincena);

  const filasBase = [
    { etq: "Ventas Internas No Gravadas", base: resumen.noGravadasBase, deb: null as number | null },
    { etq: "Ventas Internas Gravadas Alícuota General", base: resumen.generalBase, deb: resumen.generalMonto },
    { etq: "Ventas Internas Gravadas Alícuota General Más Alícuota Adicional", base: 0, deb: 0 },
    { etq: "Ventas Internas Gravadas Alícuota Reducida", base: 0, deb: 0 },
  ];

  const exportar = async () => {
    if (generando) return;
    setGenerando(true);
    try {
      const [docs, { generarPdfBlob, slug }] = await Promise.all([
        import("../pdf/resumenes"),
        import("@/components/pdf/descargar"),
      ]);
      const blob = await generarPdfBlob(
        <docs.ResumenDebitosDoc periodo={periodo} resumen={resumen} empresa={fac.empresa} />
      );
      setPreview({
        url: URL.createObjectURL(blob),
        nombre: `resumen_debitos_${slug(MESES[mes - 1])}_${anio}_${
          quincena === 1 ? "1ra" : "2da"
        }_quincena.pdf`,
        titulo: `Resumen de débitos fiscales — ${periodo}`,
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
            <h2 className="font-display text-base font-700 text-navy-950">
              Resumen de débitos fiscales IVA
            </h2>
            <p className="text-xs text-slate-400">
              Calculado desde las facturas emitidas del período (Libro de Ventas)
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
            <select
              value={quincena}
              onChange={(e) => setQuincena(Number(e.target.value) as 1 | 2)}
              className={selectCls}
            >
              <option value={1}>1RA (del 1 al 15)</option>
              <option value={2}>2DA (del 16 al fin de mes)</option>
            </select>
          </div>
          <p className="ml-auto rounded-xl bg-navy-50/60 px-4 py-2.5 text-xs font-600 text-navy-700">
            PERÍODO: {periodo} · {formatFechaVE(rango.desde)} → {formatFechaVE(rango.hasta)}
          </p>
        </div>

        <div className="mx-auto max-w-3xl px-5 py-6">
          <div className="overflow-hidden rounded-xl border border-slate-200 text-sm">
            <div className="grid grid-cols-[1fr_130px_130px] bg-navy-900 font-600 text-white">
              <p className="px-4 py-2.5">DÉBITOS FISCALES</p>
              <p className="px-4 py-2.5 text-right">BASE</p>
              <p className="px-4 py-2.5 text-right">DÉBITOS</p>
            </div>
            {filasBase.map((f) => (
              <div key={f.etq} className="grid grid-cols-[1fr_130px_130px] border-t border-slate-100">
                <p className="px-4 py-2 text-slate-600">{f.etq}</p>
                <p className="px-4 py-2 text-right font-mono text-slate-600">{formatNumberVE(f.base)}</p>
                <p className="px-4 py-2 text-right font-mono text-slate-600">
                  {f.deb === null ? "" : formatNumberVE(f.deb)}
                </p>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_130px_130px] border-t border-slate-200 bg-slate-50/60 font-700 text-navy-950">
              <p className="px-4 py-2.5">Total Ventas y Débitos Fiscales</p>
              <p className="px-4 py-2.5 text-right font-mono">{formatNumberVE(resumen.totalBase)}</p>
              <p className="px-4 py-2.5 text-right font-mono">{formatNumberVE(resumen.totalMonto)}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-navy-200 bg-navy-50/60 px-4 py-2.5 font-700 text-navy-950">
            <p className="text-sm">Total Débitos Fiscales del Período</p>
            <p className="font-mono text-sm">{money(resumen.totalPeriodo, "Bs")}</p>
          </div>
        </div>
      </section>

      {preview && (
        <PdfPreviewModal preview={preview} onToast={setToast} onClose={() => setPreview(null)} />
      )}
      {toast && <Toast mensaje={toast} />}
    </>
  );
}
