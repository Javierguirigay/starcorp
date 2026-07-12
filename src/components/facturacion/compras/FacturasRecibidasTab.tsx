"use client";

/**
 * Pestaña Facturas Recibidas: compras a proveedores con PDF asociado,
 * indicador de retención generada (con acceso directo) y pago con salida
 * automática en Finanzas LOTER.
 */
import { useEffect, useState } from "react";
import { CheckCheck, Eye, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import type { FacturaRecibida } from "@/lib/types";
import { formatFechaVE, formatNumberVE, money } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { useFacturacion } from "../FacturacionProvider";
import { BadgeEstadoDoc } from "../badges";
import { VisorPdf } from "../VisorPdf";
import { FacturaRecibidaModal } from "./FacturaRecibidaModal";
import { PagoCompraModal } from "./PagoCompraModal";
import { RetencionEditor } from "./RetencionEditor";

const selectCls =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

type ModalAbierto =
  | { tipo: "editor"; id: number | null }
  | { tipo: "pago"; id: number }
  | { tipo: "retencion"; id: number }
  | { tipo: "verPdf"; id: number }
  | null;

export function FacturasRecibidasTab() {
  const fac = useFacturacion();
  const [filtroProveedor, setFiltroProveedor] = useState<number | "">("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | FacturaRecibida["estado"]>("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [modal, setModal] = useState<ModalAbierto>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const visibles = fac.facturasRecibidas
    .filter(
      (c) =>
        (filtroProveedor === "" || c.proveedorId === filtroProveedor) &&
        (filtroEstado === "todos" || c.estado === filtroEstado) &&
        (!desde || c.fecha >= desde) &&
        (!hasta || c.fecha <= hasta)
    )
    .sort((a, b) => (a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1));

  const eliminar = (c: FacturaRecibida) => {
    if (!confirm(`¿Eliminar la factura ${c.numeroFactura}?`)) return;
    if (c.pdfUrl) URL.revokeObjectURL(c.pdfUrl);
    fac.eliminarFacturaRecibida(c.id);
    setToast("Factura recibida eliminada");
  };

  const compraDe = (id: number) => fac.facturasRecibidas.find((c) => c.id === id);

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-700 text-navy-950">Facturas recibidas</h2>
            <p className="text-xs text-slate-400">
              Compras a proveedores (Bs) · pagada ⇒ salida automática en Finanzas LOTER
            </p>
          </div>
          <button
            onClick={() => setModal({ tipo: "editor", id: null })}
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
          >
            <Plus className="h-[18px] w-[18px]" /> Nueva factura recibida
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
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">Estado</label>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)} className={selectCls}>
              <option value="todos">Todas</option>
              <option value="pendiente">Pendientes</option>
              <option value="pagada">Pagadas</option>
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
                <th className="px-4 py-3 font-600">Fecha</th>
                <th className="px-4 py-3 font-600">Proveedor</th>
                <th className="px-4 py-3 font-600">N° Factura</th>
                <th className="px-4 py-3 font-600">N° Control</th>
                <th className="px-4 py-3 text-right font-600">Total (Bs)</th>
                <th className="px-4 py-3 text-right font-600">IVA (Bs)</th>
                <th className="px-4 py-3 font-600">Retención</th>
                <th className="px-4 py-3 font-600">Estado</th>
                <th className="px-4 py-3 text-right font-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                    No hay facturas recibidas para estos filtros.
                  </td>
                </tr>
              ) : (
                visibles.map((c) => {
                  const ret = c.retencionId
                    ? fac.retenciones.find((r) => r.id === c.retencionId)
                    : undefined;
                  const congelada = c.estado !== "pendiente" || !!c.retencionId;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                        {formatFechaVE(c.fecha)}
                      </td>
                      <td className="px-4 py-3 text-navy-900">
                        {fac.proveedorPorId(c.proveedorId)?.razonSocial ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono font-600 text-navy-900">{c.numeroFactura}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.numeroControl}</td>
                      <td className="px-4 py-3 text-right font-mono font-600 text-navy-950">
                        {formatNumberVE(c.totalConIvaBs)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {formatNumberVE(c.impuestoIvaBs)}
                      </td>
                      <td className="px-4 py-3">
                        {ret ? (
                          <span
                            className="rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-[11px] font-600 text-emerald-700"
                            title={`Comprobante ${ret.comprobante} · retenido ${money(ret.totalRetenidoBs, "Bs")}`}
                          >
                            {ret.comprobante}
                          </span>
                        ) : (
                          <button
                            onClick={() => setModal({ tipo: "retencion", id: c.id })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-600 text-navy-700 hover:bg-slate-50"
                            title="Generar comprobante de retención IVA"
                          >
                            <ReceiptText className="h-3.5 w-3.5" /> Generar
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <BadgeEstadoDoc estado={c.estado} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title={c.pdfUrl ? "Ver PDF" : "Sin PDF asociado"}
                            disabled={!c.pdfUrl}
                            onClick={() => setModal({ tipo: "verPdf", id: c.id })}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-navy-50 hover:text-navy-700 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            title={congelada ? "Pagada o con retención: no editable" : "Editar"}
                            disabled={congelada}
                            onClick={() => setModal({ tipo: "editor", id: c.id })}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            title={congelada ? "Pagada o con retención: no eliminable" : "Eliminar"}
                            disabled={congelada}
                            onClick={() => eliminar(c)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {c.estado === "pendiente" && (
                            <button
                              title="Marcar pagada (registra la salida en Finanzas)"
                              onClick={() => setModal({ tipo: "pago", id: c.id })}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-600 text-white hover:bg-emerald-700"
                            >
                              <CheckCheck className="h-3.5 w-3.5" /> Pagada
                            </button>
                          )}
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

      {modal?.tipo === "editor" && (
        <FacturaRecibidaModal
          key={modal.id ?? "nueva"}
          compra={modal.id !== null ? compraDe(modal.id) ?? null : null}
          onToast={setToast}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === "pago" &&
        (() => {
          const c = compraDe(modal.id);
          return c ? (
            <PagoCompraModal compra={c} onToast={setToast} onClose={() => setModal(null)} />
          ) : null;
        })()}
      {modal?.tipo === "retencion" &&
        (() => {
          const c = compraDe(modal.id);
          return c ? (
            <RetencionEditor compra={c} onToast={setToast} onClose={() => setModal(null)} />
          ) : null;
        })()}
      {modal?.tipo === "verPdf" &&
        (() => {
          const c = compraDe(modal.id);
          if (!c?.pdfUrl) return null;
          return (
            <Modal
              onClose={() => setModal(null)}
              title={`Factura ${c.numeroFactura}`}
              subtitle={c.pdfNombre ?? "PDF de la compra"}
              maxWidth="max-w-4xl"
            >
              <div className="h-[70vh]">
                <VisorPdf url={c.pdfUrl} nombre={c.pdfNombre} />
              </div>
            </Modal>
          );
        })()}

      {toast && <Toast mensaje={toast} />}
    </>
  );
}
