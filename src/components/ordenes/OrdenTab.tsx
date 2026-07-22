"use client";

/**
 * Lista de órdenes de un tipo (compra / entrega / requerimiento): alta, edición,
 * eliminación y exportación a PDF con vista previa (mismo patrón que el resto
 * de la app: import dinámico del documento + generarPdfBlob + PdfPreviewModal).
 */
import { useEffect, useState } from "react";
import { FileDown, PackageCheck, Pencil, Plus, Trash2 } from "lucide-react";
import type { Orden, TipoOrden } from "@/lib/types";
import { formatFechaVE, formatNumberVE } from "@/lib/format";
import { TITULO_ORDEN, totalesOrden } from "@/lib/negocio/ordenes";
import { Toast } from "@/components/ui/Toast";
import { PdfPreviewModal, type PreviewPdf } from "@/components/facturacion/PdfPreviewModal";
import { empresaUsaInventario } from "@/lib/modulos";
import { useInventario } from "@/components/inventario/InventarioProvider";
import { useOrdenes } from "./OrdenesProvider";
import { OrdenModal } from "./OrdenModal";
import { RecibirCompraModal } from "./RecibirCompraModal";

export function OrdenTab({ tipo }: { tipo: TipoOrden }) {
  const ord = useOrdenes();
  const inv = useInventario();
  // Solo las empresas con Inventario operativo (hoy LOTER) enlazan las órdenes
  // al kardex; para las demás son documentos de texto.
  const usaInv = empresaUsaInventario(ord.empresa.key);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<{ id: number | null } | null>(null);
  const [recibir, setRecibir] = useState<number | null>(null);
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
      const blob = await generarPdfBlob(<docs.OrdenDoc orden={orden} empresa={ord.empresa} />);
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

  const recibida = (o: Orden) => o.tipo === "compra" && o.estado === "recibida";

  const eliminar = (orden: Orden) => {
    const extra = !usaInv
      ? ""
      : tipo === "entrega"
        ? " Se revertirán sus salidas de inventario."
        : recibida(orden)
          ? " Se revertirá su recepción (el stock que sumó se descuenta)."
          : "";
    if (!confirm(`¿Eliminar la ${TITULO_ORDEN[tipo]} ${orden.numero}?${extra}`)) return;
    // La reversión invierte y borra los movimientos del kardex de esta orden.
    if (usaInv && (tipo === "entrega" || recibida(orden))) inv.revertirOrden(orden.id);
    ord.eliminarOrden(orden.id);
    setToast("Orden eliminada");
  };

  const editar = (orden: Orden) => {
    // Editar una compra ya recibida obliga a revertir la recepción: el stock
    // que sumó se descuenta y la orden vuelve a "Pendiente".
    if (recibida(orden)) {
      if (
        !confirm(
          `${orden.numero} ya fue recibida. Editar revierte la recepción (se descuenta el stock que sumó) y la deja Pendiente. ¿Continuar?`
        )
      )
        return;
      inv.revertirOrden(orden.id);
      ord.revertirRecepcionCompra(orden.id);
    }
    setModal({ id: orden.id });
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
              Historial con numeración correlativa · exportable a PDF con el membrete de{" "}
              {ord.empresa.nombre}
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
                {conPrecios && <th className="px-4 py-3 font-600">Estado</th>}
                <th className="px-4 py-3 font-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ordenes.length === 0 ? (
                <tr>
                  <td
                    colSpan={conPrecios ? 7 : 5}
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
                    {conPrecios && (
                      <td className="whitespace-nowrap px-4 py-3">
                        {recibida(o) ? (
                          <span
                            title={
                              o.recibidaEn
                                ? `Recibida el ${formatFechaVE(o.recibidaEn)}${o.ubicacionRecepcion ? ` en ${o.ubicacionRecepcion}` : ""}`
                                : undefined
                            }
                            className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-600 text-emerald-700"
                          >
                            Recibida
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-600 text-amber-700">
                            Pendiente
                          </span>
                        )}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        {conPrecios && !recibida(o) && usaInv && (
                          <button
                            onClick={() => setRecibir(o.id)}
                            title="Marcar como recibida (suma stock)"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-600 text-emerald-700 hover:bg-emerald-100"
                          >
                            <PackageCheck className="h-3.5 w-3.5" /> Recibir
                          </button>
                        )}
                        <button
                          onClick={() => exportar(o)}
                          disabled={generando}
                          title="Ver PDF"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-600 text-navy-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <FileDown className="h-3.5 w-3.5" /> PDF
                        </button>
                        <button
                          onClick={() => editar(o)}
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
      {recibir !== null &&
        (() => {
          const o = ordenes.find((x) => x.id === recibir);
          return o ? (
            <RecibirCompraModal orden={o} onToast={setToast} onClose={() => setRecibir(null)} />
          ) : null;
        })()}
      {preview && (
        <PdfPreviewModal preview={preview} onToast={setToast} onClose={() => setPreview(null)} />
      )}
      {toast && <Toast mensaje={toast} />}
    </>
  );
}
