"use client";

/**
 * Pestaña Resumen: sección de CRÉDITOS del "Resumen de Débitos y Créditos
 * Fiscales IVA", calculada automáticamente desde el libro de compras y las
 * retenciones del mes. (Los débitos/ventas viven en el Libro de Ventas.)
 */
import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { formatFechaVE, formatNumberVE, money } from "@/lib/format";
import { resumenCreditosMes } from "@/lib/negocio/compras";
import { etiquetaQuincena, rangoQuincena } from "@/lib/negocio/quincenas";
import { MESES } from "@/lib/negocio/retenciones";
import { Toast } from "@/components/ui/Toast";
import { useFacturacion } from "../FacturacionProvider";
import { PdfPreviewModal, type PreviewPdf } from "../PdfPreviewModal";

const selectCls =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function ResumenTab() {
  const fac = useFacturacion();
  const [anio, setAnio] = useState(2026);
  const [mes, setMes] = useState(7);
  const [quincena, setQuincena] = useState<1 | 2>(1);
  const [preview, setPreview] = useState<PreviewPdf | null>(null);
  const [generando, setGenerando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const rango = rangoQuincena(anio, mes, quincena);
  const resumen = resumenCreditosMes(fac.facturasRecibidas, fac.retenciones, rango);
  const periodo = etiquetaQuincena(anio, mes, quincena);

  const filasBase = [
    { etq: "Compras No Gravadas o Sin Derecho a Crédito", base: resumen.noGravadasBase, cred: null as number | null },
    { etq: "Compras Internas Gravadas Solo Alícuota General", base: resumen.generalBase, cred: resumen.generalCredito },
    { etq: "Compras Internas Gravadas Alícuota General Más Alícuota Adicional", base: 0, cred: 0 },
    { etq: "Compras Internas Gravadas Alícuota Reducida", base: 0, cred: 0 },
  ];
  const filasSimples = [
    { etq: "Total Créditos Fiscales del Período", val: resumen.totalCreditosPeriodo, bold: true },
    { etq: "Excedentes de créditos fiscales del mes anterior", val: 0, bold: false },
    { etq: "Retenciones del período", val: 0, bold: false },
    { etq: "Retenciones soportadas descontadas", val: 0, bold: false },
    { etq: "Saldo de retenciones de IVA no aplicado", val: 0, bold: false },
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
        <docs.ResumenCreditosDoc periodo={periodo} resumen={resumen} />
      );
      setPreview({
        url: URL.createObjectURL(blob),
        nombre: `resumen_creditos_${slug(MESES[mes - 1])}_${anio}_${
          quincena === 1 ? "1ra" : "2da"
        }_quincena.pdf`,
        titulo: `Resumen de créditos fiscales — ${periodo}`,
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
              Resumen de créditos fiscales IVA
            </h2>
            <p className="text-xs text-slate-400">
              Calculado desde el libro de compras y las retenciones del período
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
              <p className="px-4 py-2.5">CRÉDITOS FISCALES</p>
              <p className="px-4 py-2.5 text-right">BASE</p>
              <p className="px-4 py-2.5 text-right">CRÉDITOS</p>
            </div>
            {filasBase.map((f) => (
              <div key={f.etq} className="grid grid-cols-[1fr_130px_130px] border-t border-slate-100">
                <p className="px-4 py-2 text-slate-600">{f.etq}</p>
                <p className="px-4 py-2 text-right font-mono text-slate-600">{formatNumberVE(f.base)}</p>
                <p className="px-4 py-2 text-right font-mono text-slate-600">
                  {f.cred === null ? "" : formatNumberVE(f.cred)}
                </p>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_130px_130px] border-t border-slate-200 bg-slate-50/60 font-700 text-navy-950">
              <p className="px-4 py-2.5">Total Compras y Créditos Fiscales</p>
              <p className="px-4 py-2.5 text-right font-mono">{formatNumberVE(resumen.totalBase)}</p>
              <p className="px-4 py-2.5 text-right font-mono">{formatNumberVE(resumen.totalCredito)}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {filasSimples.map((f) => (
              <div
                key={f.etq}
                className={`flex items-center justify-between rounded-xl border px-4 py-2.5 ${
                  f.bold
                    ? "border-navy-200 bg-navy-50/60 font-700 text-navy-950"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                <p className="text-sm">{f.etq}</p>
                <p className="font-mono text-sm">{money(f.val, "Bs")}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Retenciones de IVA practicadas a terceros en {periodo.toLowerCase()} (informativo):{" "}
            <span className="font-mono font-600 text-navy-900">
              {money(resumen.retencionesPracticadasBs, "Bs")}
            </span>
            . Las filas de retenciones soportadas (comprobantes recibidos de clientes) se muestran
            en 0,00 en esta fase, como en el documento de referencia.
          </p>
        </div>
      </section>

      {preview && (
        <PdfPreviewModal preview={preview} onToast={setToast} onClose={() => setPreview(null)} />
      )}
      {toast && <Toast mensaje={toast} />}
    </>
  );
}
