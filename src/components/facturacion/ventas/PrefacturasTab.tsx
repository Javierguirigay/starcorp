"use client";

/**
 * Pestaña Pre-Factura: historial con filtros, editor, vista previa fiel del
 * PDF antes de exportar y generación de la factura fiscal desde una
 * pre-factura emitida.
 */
import { useEffect, useState } from "react";
import { Eye, FilePlus2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import type { PreFactura } from "@/lib/types";
import { formatFechaVE, money } from "@/lib/format";
import { totalesRenglones } from "@/lib/negocio/facturacion";
import { Toast } from "@/components/ui/Toast";
import { useFacturacion } from "../FacturacionProvider";
import { BadgeEstadoDoc } from "../badges";
import { PdfPreviewModal, type PreviewPdf } from "../PdfPreviewModal";
import { PrefacturaModal } from "./PrefacturaModal";
import { GenerarFacturaModal } from "./GenerarFacturaModal";

const selectCls =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

type ModalAbierto =
  | { tipo: "editor"; id: number | null }
  | { tipo: "generarFactura"; id: number }
  | null;

export function PrefacturasTab() {
  const fac = useFacturacion();
  const [filtroCliente, setFiltroCliente] = useState<number | "">("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | PreFactura["estado"]>("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [modal, setModal] = useState<ModalAbierto>(null);
  const [preview, setPreview] = useState<PreviewPdf | null>(null);
  const [generando, setGenerando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const visibles = fac.prefacturas
    .filter(
      (p) =>
        (filtroCliente === "" || p.clienteId === filtroCliente) &&
        (filtroEstado === "todos" || p.estado === filtroEstado) &&
        (!desde || p.fecha >= desde) &&
        (!hasta || p.fecha <= hasta)
    )
    .sort((a, b) => (a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1));

  /* Render fiel del formato real, en pantalla ANTES de exportar. */
  const previsualizar = async (p: PreFactura) => {
    if (generando) return;
    const cliente = fac.clientePorId(p.clienteId);
    if (!cliente) return setToast("La pre-factura no tiene cliente válido");
    setGenerando(true);
    try {
      const [docs, { generarPdfBlob }] = await Promise.all([
        import("../pdf/documentos"),
        import("@/components/pdf/descargar"),
      ]);
      const doc = (
        <docs.DocumentoVenta
          variante="prefactura"
          numero={p.numero}
          fecha={p.fecha}
          cliente={cliente}
          condicionesPago={p.condicionesPago}
          renglones={p.renglones}
          locacion={p.locacion}
          empresa={fac.empresa}
        />
      );
      const blob = await generarPdfBlob(doc);
      setPreview({
        url: URL.createObjectURL(blob),
        nombre: `prefactura_${p.numero}.pdf`,
        titulo: `Pre-Factura N° ${p.numero}`,
      });
    } catch {
      setToast("No se pudo generar el PDF");
    } finally {
      setGenerando(false);
    }
  };

  const emitir = (p: PreFactura) => {
    fac.emitirPrefactura(p.id);
    setToast(`Pre-factura N° ${p.numero} emitida`);
  };

  const eliminar = (p: PreFactura) => {
    if (!confirm(`¿Eliminar el borrador N° ${p.numero}? Sus reportes vuelven a estar pendientes.`))
      return;
    fac.eliminarPrefactura(p.id);
    setToast("Pre-factura eliminada");
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-700 text-navy-950">Pre-Facturas</h2>
            <p className="text-xs text-slate-400">
              Documentos en USD · borrador → emitida → facturada
            </p>
          </div>
          <button
            onClick={() => setModal({ tipo: "editor", id: null })}
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
          >
            <Plus className="h-[18px] w-[18px]" /> Nueva pre-factura
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Cliente</label>
            <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value === "" ? "" : Number(e.target.value))} className={selectCls}>
              <option value="">Todos</option>
              {fac.clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.razonSocial}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Estado</label>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)} className={selectCls}>
              <option value="todos">Todos</option>
              <option value="borrador">Borradores</option>
              <option value="emitida">Emitidas</option>
              <option value="facturada">Facturadas</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={selectCls} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={selectCls} />
          </div>
        </div>

        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-600">N°</th>
                <th className="px-5 py-3 font-600">Fecha</th>
                <th className="px-5 py-3 font-600">Cliente</th>
                <th className="px-5 py-3 text-center font-600">Renglones</th>
                <th className="px-5 py-3 text-right font-600">Total (USD)</th>
                <th className="px-5 py-3 font-600">Estado</th>
                <th className="px-5 py-3 text-right font-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                    No hay pre-facturas para estos filtros.
                  </td>
                </tr>
              ) : (
                visibles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-mono font-700 text-navy-950">{p.numero}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                      {formatFechaVE(p.fecha)}
                    </td>
                    <td className="px-5 py-3 text-navy-900">
                      {fac.clientePorId(p.clienteId)?.razonSocial ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-center font-mono text-slate-600">
                      {p.renglones.length}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-600 text-navy-950">
                      {money(totalesRenglones(p.renglones).total)}
                    </td>
                    <td className="px-5 py-3">
                      <BadgeEstadoDoc estado={p.estado} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Vista previa / exportar PDF"
                          disabled={generando}
                          onClick={() => previsualizar(p)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-navy-50 hover:text-navy-700 disabled:opacity-50"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          title={p.estado === "facturada" ? "Facturada: no editable" : "Editar"}
                          disabled={p.estado === "facturada"}
                          onClick={() => setModal({ tipo: "editor", id: p.id })}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {p.estado === "borrador" && (
                          <button
                            title="Emitir (lista para facturar)"
                            onClick={() => emitir(p)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-gold-500/10 hover:text-gold-600"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {p.estado === "emitida" && (
                          <button
                            title="Generar Factura (Bs, tasa del día)"
                            onClick={() => setModal({ tipo: "generarFactura", id: p.id })}
                            className="grid h-8 w-8 place-items-center rounded-lg text-gold-600 hover:bg-gold-500/10"
                          >
                            <FilePlus2 className="h-4 w-4" />
                          </button>
                        )}
                        {p.estado === "borrador" && (
                          <button
                            title="Eliminar borrador"
                            onClick={() => eliminar(p)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal?.tipo === "editor" && (
        <PrefacturaModal
          key={modal.id ?? "nueva"}
          prefactura={
            modal.id !== null ? fac.prefacturas.find((p) => p.id === modal.id) ?? null : null
          }
          onToast={setToast}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === "generarFactura" &&
        (() => {
          const p = fac.prefacturas.find((x) => x.id === modal.id);
          if (!p) return null;
          return (
            <GenerarFacturaModal prefactura={p} onToast={setToast} onClose={() => setModal(null)} />
          );
        })()}
      {preview && (
        <PdfPreviewModal preview={preview} onToast={setToast} onClose={() => setPreview(null)} />
      )}

      {toast && <Toast mensaje={toast} />}
    </>
  );
}
