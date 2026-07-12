"use client";

/**
 * Libro de Compras: auto-alimentado por las facturas recibidas (+ sus
 * retenciones para la columna "IVA Retenido a terceros"), con cortes
 * quincenales, bloque RESUMEN como el formato real y exportación PDF
 * horizontal por corte.
 * Además permite dar de alta compras desde aquí (típicamente las que no
 * llevan retención): son facturas recibidas normales, así que la fila cae
 * ordenada por fecha y renumera el OPER-NRO. Editar/eliminar solo mientras la
 * compra siga pendiente y sin retención (misma regla que el resto de la app).
 */
import { useEffect, useState } from "react";
import { FileDown, Pencil, Plus, Trash2 } from "lucide-react";
import { formatFechaVE, formatNumberVE } from "@/lib/format";
import { filasLibroCompras, resumenLibroCompras } from "@/lib/negocio/compras";
import { enRango, etiquetaQuincena, rangoQuincena } from "@/lib/negocio/quincenas";
import { MESES } from "@/lib/negocio/retenciones";
import { Toast } from "@/components/ui/Toast";
import { useFacturacion } from "../FacturacionProvider";
import { PdfPreviewModal, type PreviewPdf } from "../PdfPreviewModal";
import { FacturaRecibidaModal } from "./FacturaRecibidaModal";

const selectCls =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function LibroComprasTab() {
  const fac = useFacturacion();
  // Período seed (las 8 compras reales de julio 2026 caen en la 1ra quincena).
  const [anio, setAnio] = useState(2026);
  const [mes, setMes] = useState(7);
  const [quincena, setQuincena] = useState<1 | 2>(1);
  const [preview, setPreview] = useState<PreviewPdf | null>(null);
  const [generando, setGenerando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // { id: null } = alta; { id } = edición de esa compra.
  const [modal, setModal] = useState<{ id: number | null } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const rango = rangoQuincena(anio, mes, quincena);
  const filas = filasLibroCompras(fac.facturasRecibidas, fac.retenciones, fac.proveedores, rango);
  const resumen = resumenLibroCompras(filas);
  const periodo = etiquetaQuincena(anio, mes, quincena);

  /** Pagadas o con retención generada quedan congeladas (regla del provider). */
  const compraEditable = (compraId: number) => {
    const c = fac.facturasRecibidas.find((x) => x.id === compraId);
    return !!c && c.estado === "pendiente" && !c.retencionId;
  };

  const eliminar = (compraId: number, numeroFactura: string) => {
    if (!confirm(`¿Eliminar la compra de la factura N° ${numeroFactura}?`)) return;
    fac.eliminarFacturaRecibida(compraId);
    setToast("Compra eliminada");
  };

  // La compra puede guardarse con una fecha de otro corte: se avisa para que no
  // parezca que se perdió.
  const alGuardar = (fechaGuardada: string) => {
    if (!enRango(fechaGuardada, rango))
      setToast("Guardada, pero su fecha cae en otro corte: cambia el período para verla");
  };

  const exportar = async () => {
    if (generando) return;
    if (!filas.length) return setToast("No hay compras en el período seleccionado");
    setGenerando(true);
    try {
      const [docs, { generarPdfBlob, slug }] = await Promise.all([
        import("../pdf/documentosCompras"),
        import("@/components/pdf/descargar"),
      ]);
      const blob = await generarPdfBlob(
        <docs.LibroComprasDoc periodo={periodo} filas={filas} resumen={resumen} />
      );
      setPreview({
        url: URL.createObjectURL(blob),
        nombre: `libro_compras_${slug(MESES[mes - 1])}_${anio}_${quincena === 1 ? "1ra" : "2da"}_quincena.pdf`,
        titulo: `Libro de Compras — ${periodo}`,
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
            <h2 className="font-display text-base font-700 text-navy-950">Libro de Compras</h2>
            <p className="text-xs text-slate-400">
              Auto-alimentado por facturas recibidas y retenciones · cortes quincenales
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportar}
              disabled={generando}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" /> Exportar PDF del corte
            </button>
            <button
              onClick={() => setModal({ id: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
            >
              <Plus className="h-[18px] w-[18px]" /> Agregar compra
            </button>
          </div>
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
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th className="px-2 py-3 font-600">Oper-Nro.</th>
                <th className="px-2 py-3 font-600">Fecha</th>
                <th className="px-2 py-3 font-600">RIF</th>
                <th className="px-2 py-3 font-600">Nombre o Razón Social</th>
                <th className="px-2 py-3 font-600">N° Factura</th>
                <th className="px-2 py-3 font-600">N° Control</th>
                <th className="px-2 py-3 font-600">N. Déb.</th>
                <th className="px-2 py-3 font-600">N. Créd.</th>
                <th className="px-2 py-3 font-600">Fact. Afect.</th>
                <th className="px-2 py-3 font-600">Tipo</th>
                <th className="px-2 py-3 text-right font-600">No Gravadas</th>
                <th className="px-2 py-3 text-right font-600">Gravadas c/IVA</th>
                <th className="px-2 py-3 text-right font-600">Base</th>
                <th className="px-2 py-3 text-center font-600">% Alíc.</th>
                <th className="px-2 py-3 text-right font-600">Impuesto IVA</th>
                <th className="px-2 py-3 text-right font-600">IVA Retenido</th>
                <th className="px-2 py-3 font-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-4 py-10 text-center text-sm text-slate-400">
                    No hay compras registradas en este corte.
                  </td>
                </tr>
              ) : (
                filas.map((f) => (
                  <tr key={f.numOp} className="group hover:bg-slate-50/60">
                    <td className="px-2 py-2 text-center font-mono text-slate-500">{f.numOp}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-mono text-slate-500">
                      {formatFechaVE(f.fecha)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 font-mono text-slate-500">{f.rif}</td>
                    <td className="px-2 py-2 text-navy-900">{f.proveedor}</td>
                    <td className="px-2 py-2 font-mono">{f.numeroFactura}</td>
                    <td className="px-2 py-2 font-mono text-slate-500">{f.numeroControl}</td>
                    <td className="px-2 py-2 font-mono text-slate-500">{f.notaDebito || "—"}</td>
                    <td className="px-2 py-2 font-mono text-slate-500">{f.notaCredito || "—"}</td>
                    <td className="px-2 py-2 font-mono text-slate-500">{f.facturaAfectada || "—"}</td>
                    <td className="px-2 py-2 text-slate-500">{f.tipoTransaccion}</td>
                    <td className="px-2 py-2 text-right font-mono text-slate-500">
                      {f.comprasNoGravadasBs ? formatNumberVE(f.comprasNoGravadasBs) : "—"}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-navy-900">
                      {formatNumberVE(f.comprasConIvaBs)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-slate-600">
                      {formatNumberVE(f.baseImponibleBs)}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-slate-500">16%</td>
                    <td className="px-2 py-2 text-right font-mono text-navy-900">
                      {formatNumberVE(f.impuestoIvaBs)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono font-600 text-navy-950">
                      {f.ivaRetenidoBs ? formatNumberVE(f.ivaRetenidoBs) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">
                      {compraEditable(f.compraId) && (
                        <span className="inline-flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                          <button
                            onClick={() => setModal({ id: f.compraId })}
                            title="Editar compra"
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => eliminar(f.compraId, f.numeroFactura)}
                            title="Eliminar compra"
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filas.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/60 font-600 text-navy-900">
                  <td colSpan={11} className="px-2 py-2.5">
                    Totales del período ({filas.length} operaciones)
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono">
                    {formatNumberVE(resumen.totalComprasConIva)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono">{formatNumberVE(resumen.totalBase)}</td>
                  <td />
                  <td className="px-2 py-2.5 text-right font-mono">{formatNumberVE(resumen.totalCredito)}</td>
                  <td className="px-2 py-2.5 text-right font-mono text-navy-950">
                    {formatNumberVE(resumen.totalIvaRetenido)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Bloque RESUMEN (réplica del formato real) */}
        {filas.length > 0 && (
          <div className="flex justify-end border-t border-slate-100 px-5 py-4">
            <div className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 text-xs">
              <div className="grid grid-cols-[1fr_120px_120px] bg-slate-50/60 font-600 text-slate-500">
                <p className="px-3 py-2 uppercase tracking-wide">Resumen</p>
                <p className="px-3 py-2 text-right uppercase tracking-wide">Base imponible</p>
                <p className="px-3 py-2 text-right uppercase tracking-wide">Crédito fiscal</p>
              </div>
              {[
                { etq: "Compras no gravadas y/o sin derecho a crédito fiscal", base: resumen.comprasNoGravadasBase, cred: 0 },
                { etq: "Importaciones gravadas por alícuota general", base: 0, cred: 0 },
                { etq: "Compras internas gravadas por alícuota general", base: resumen.comprasInternasGeneralBase, cred: resumen.comprasInternasGeneralCredito },
              ].map((f) => (
                <div key={f.etq} className="grid grid-cols-[1fr_120px_120px] border-t border-slate-100">
                  <p className="px-3 py-1.5 text-slate-600">{f.etq}</p>
                  <p className="px-3 py-1.5 text-right font-mono text-slate-600">{formatNumberVE(f.base)}</p>
                  <p className="px-3 py-1.5 text-right font-mono text-slate-600">{formatNumberVE(f.cred)}</p>
                </div>
              ))}
              <div className="grid grid-cols-[1fr_120px_120px] border-t border-slate-200 bg-slate-50/60 font-700 text-navy-950">
                <p className="px-3 py-2">TOTAL COMPRAS Y CRÉDITOS FISCALES DEL PERÍODO</p>
                <p className="px-3 py-2 text-right font-mono">{formatNumberVE(resumen.totalBase)}</p>
                <p className="px-3 py-2 text-right font-mono">{formatNumberVE(resumen.totalCredito)}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {modal && (
        <FacturaRecibidaModal
          key={modal.id ?? "nueva"}
          compra={modal.id ? (fac.facturasRecibidas.find((c) => c.id === modal.id) ?? null) : null}
          proveedorLibre
          fechaInicial={rango.desde}
          onGuardado={alGuardar}
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
