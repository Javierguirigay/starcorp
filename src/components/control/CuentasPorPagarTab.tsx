"use client";

/**
 * Cuentas por Pagar (Control Administrativo): modelo propio de documentos
 * administrativos pendientes de pago (facturas y notas de entrega). No son
 * fiscales mientras estén pendientes; al registrar el pago se convierten en
 * factura recibida (ya pagada) con sus datos fiscales y salida en Finanzas.
 */
import { useEffect, useState } from "react";
import { AlarmClock, CalendarClock, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import type { CuentaPorPagar, FacturaRecibida } from "@/lib/types";
import { fmtISO, formatFechaVE, formatNumberVE, money } from "@/lib/format";
import {
  cuentasPorPagar,
  totalesCartera,
  type EstadoCartera,
  type FilaPorPagar,
} from "@/lib/negocio/cartera";
import { round2 } from "@/lib/negocio/nomina";
import { KpiCard } from "@/components/ui/KpiCard";
import { Toast } from "@/components/ui/Toast";
import { useFinanzas } from "@/components/finanzas/FinanzasProvider";
import { useFacturacion } from "@/components/facturacion/FacturacionProvider";
import { RetencionEditor } from "@/components/facturacion/compras/RetencionEditor";
import { DocumentoPorPagarModal } from "./DocumentoPorPagarModal";
import { PagoCuentaPorPagarModal } from "./PagoCuentaPorPagarModal";

const BADGE: Record<EstadoCartera, string> = {
  vencida: "bg-rose-50 text-rose-700",
  "por-vencer": "bg-amber-50 text-amber-700",
  "al-dia": "bg-emerald-50 text-emerald-700",
  "sin-fecha": "bg-slate-100 text-slate-500",
};

function etiquetaEstado(f: FilaPorPagar): string {
  switch (f.estado) {
    case "vencida":
      return `Vencida · ${f.dias} d`;
    case "por-vencer":
      return f.dias === 0 ? "Vence hoy" : `Por vencer · ${f.dias} d`;
    case "al-dia":
      return `Al día · ${f.dias} d`;
    default:
      return "Sin vencimiento";
  }
}

type ModalDoc = { tipo: "editor"; id: number | null } | null;

export function CuentasPorPagarTab() {
  const fac = useFacturacion();
  const finanzas = useFinanzas();
  const [toast, setToast] = useState<string | null>(null);
  const [hoy] = useState(() => fmtISO(new Date()));
  const [modal, setModal] = useState<ModalDoc>(null);
  const [pagando, setPagando] = useState<CuentaPorPagar | null>(null);
  const [retencionFactura, setRetencionFactura] = useState<FacturaRecibida | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filas = cuentasPorPagar(fac.cuentasPorPagar, fac.proveedores, hoy);
  const totales = totalesCartera(filas);

  const enUSD = (bs: number) => (finanzas.tasa > 0 ? money(round2(bs / finanzas.tasa)) : "—");

  const cuentaDe = (id: number) => fac.cuentasPorPagar.find((d) => d.id === id);

  const eliminar = (d: CuentaPorPagar) => {
    if (!confirm(`¿Eliminar el documento ${d.numeroDocumento}?`)) return;
    if (d.pdfUrl) URL.revokeObjectURL(d.pdfUrl);
    fac.eliminarCuentaPorPagar(d.id);
    setToast("Documento por pagar eliminado");
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total por pagar"
          valor={money(totales.pendienteBs, "Bs")}
          sub={`${totales.cantidad} documento(s) · ${enUSD(totales.pendienteBs)}`}
          icon={Wallet}
          tone="gold"
        />
        <KpiCard
          label="Vencido"
          valor={money(totales.vencidoBs, "Bs")}
          sub={`${totales.cantidadVencidas} documento(s) fuera de plazo`}
          icon={AlarmClock}
        />
        <KpiCard
          label="Por vencer (7 días)"
          valor={money(totales.porVencerBs, "Bs")}
          sub="Vence dentro de la próxima semana"
          icon={CalendarClock}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-700 text-navy-950">Cuentas por Pagar</h2>
            <p className="text-xs text-slate-400">
              Facturas y notas de entrega pendientes de pago · lo vencido primero
            </p>
          </div>
          <button
            onClick={() => setModal({ tipo: "editor", id: null })}
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
          >
            <Plus className="h-[18px] w-[18px]" /> Agregar documento
          </button>
        </div>

        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-600">N° Documento</th>
                <th className="px-4 py-3 font-600">Tipo</th>
                <th className="px-4 py-3 font-600">Proveedor</th>
                <th className="px-4 py-3 font-600">RIF</th>
                <th className="px-4 py-3 font-600">Emisión</th>
                <th className="px-4 py-3 font-600">Vencimiento</th>
                <th className="px-4 py-3 font-600">Estado</th>
                <th className="px-4 py-3 text-right font-600">Total Bs</th>
                <th className="px-4 py-3 text-right font-600">Equiv. USD</th>
                <th className="px-4 py-3 font-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-400">
                    No hay documentos pendientes de pago.
                  </td>
                </tr>
              ) : (
                filas.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-navy-900">{f.documento}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-600 ${
                          f.tipoDoc === "factura"
                            ? "bg-navy-50 text-navy-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {f.tipoDoc === "factura" ? "Factura" : "Nota de entrega"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-navy-900">{f.contraparte}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                      {f.rif}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                      {formatFechaVE(f.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={f.fechaVencimiento ?? ""}
                        onChange={(e) => fac.setVencimientoCuentaPorPagar(f.id, e.target.value)}
                        title="Fecha pactada de pago"
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-600 ${BADGE[f.estado]}`}
                      >
                        {etiquetaEstado(f)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-600 text-navy-950">
                      {formatNumberVE(f.totalBs)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">
                      {enUSD(f.totalBs)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Editar"
                          onClick={() => setModal({ tipo: "editor", id: f.id })}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="Eliminar"
                          onClick={() => {
                            const d = cuentaDe(f.id);
                            if (d) eliminar(d);
                          }}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            const d = cuentaDe(f.id);
                            if (d) setPagando(d);
                          }}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-600 text-white hover:bg-emerald-700"
                        >
                          Registrar pago
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filas.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/60 font-600 text-navy-900">
                  <td colSpan={7} className="px-4 py-3">
                    Total pendiente ({filas.length})
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatNumberVE(totales.pendienteBs)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {enUSD(totales.pendienteBs)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {modal?.tipo === "editor" && (
        <DocumentoPorPagarModal
          key={modal.id ?? "nuevo"}
          cuenta={modal.id !== null ? cuentaDe(modal.id) ?? null : null}
          onToast={setToast}
          onClose={() => setModal(null)}
        />
      )}
      {pagando && (
        <PagoCuentaPorPagarModal
          cuenta={pagando}
          onToast={setToast}
          onClose={() => setPagando(null)}
          onPagada={(f) => {
            setPagando(null);
            setRetencionFactura(f);
          }}
        />
      )}
      {retencionFactura && (
        <RetencionEditor
          compra={retencionFactura}
          onToast={setToast}
          onClose={() => setRetencionFactura(null)}
        />
      )}
      {toast && <Toast mensaje={toast} />}
    </>
  );
}
