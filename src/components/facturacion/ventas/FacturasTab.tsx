"use client";

/**
 * Pestaña Factura: historial de facturas fiscales (Bs). Dos exportaciones por
 * factura: "Factura (registro)" (layout de la pre-factura en Bs, archivo
 * interno) y "Plantilla de impresión" (solo datos, para el papel fiscal
 * pre-impreso, con calibración de offsets). Al marcar cobrada se genera la
 * entrada automática en Finanzas LOTER (patrón de dos llamadas, con guard de
 * idempotencia en el provider de Finanzas).
 */
import { useEffect, useState } from "react";
import { CheckCheck, FileDown, Printer, SlidersHorizontal } from "lucide-react";
import type { Factura } from "@/lib/types";
import { fmtISO, formatFechaVE, formatNumberVE, money } from "@/lib/format";
import { totalesRenglones } from "@/lib/negocio/facturacion";
import { Toast } from "@/components/ui/Toast";
import { useFinanzas } from "@/components/finanzas/FinanzasProvider";
import { useFacturacion } from "../FacturacionProvider";
import { BadgeEstadoDoc } from "../badges";
import { PdfPreviewModal, type PreviewPdf } from "../PdfPreviewModal";
import { CalibracionModal } from "./CalibracionModal";

const selectCls =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function FacturasTab() {
  const fac = useFacturacion();
  const finanzas = useFinanzas();
  const [filtroCliente, setFiltroCliente] = useState<number | "">("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | Factura["estado"]>("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [calibrando, setCalibrando] = useState(false);
  const [preview, setPreview] = useState<PreviewPdf | null>(null);
  const [generando, setGenerando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const visibles = fac.facturas
    .filter(
      (f) =>
        (filtroCliente === "" || f.clienteId === filtroCliente) &&
        (filtroEstado === "todos" || f.estado === filtroEstado) &&
        (!desde || f.fechaEmision >= desde) &&
        (!hasta || f.fechaEmision <= hasta)
    )
    .sort((a, b) =>
      a.fechaEmision === b.fechaEmision ? b.id - a.id : a.fechaEmision < b.fechaEmision ? 1 : -1
    );

  const exportar = async (f: Factura, tipo: "registro" | "plantilla") => {
    if (generando) return;
    const cliente = fac.clientePorId(f.clienteId);
    if (!cliente) return setToast("La factura no tiene cliente válido");
    setGenerando(true);
    try {
      const [docs, { generarPdfBlob }] = await Promise.all([
        import("../pdf/documentos"),
        import("@/components/pdf/descargar"),
      ]);
      const doc =
        tipo === "registro" ? (
          <docs.DocumentoVenta
            variante="factura"
            numero={f.numeroFactura}
            numeroControl={f.numeroControl}
            fecha={f.fechaEmision}
            cliente={cliente}
            condicionesPago={f.condicionesPago}
            renglones={f.renglones}
            locacion={f.locacion}
          />
        ) : (
          <docs.PlantillaImpresionDoc factura={f} cliente={cliente} calibracion={fac.calibracion} />
        );
      const blob = await generarPdfBlob(doc);
      setPreview({
        url: URL.createObjectURL(blob),
        nombre:
          tipo === "registro"
            ? `factura_${f.numeroFactura}_registro.pdf`
            : `plantilla_factura_${f.numeroFactura}.pdf`,
        titulo:
          tipo === "registro"
            ? `Factura N° ${f.numeroFactura} (registro)`
            : `Plantilla de impresión — Factura N° ${f.numeroFactura}`,
      });
    } catch {
      setToast("No se pudo generar el PDF");
    } finally {
      setGenerando(false);
    }
  };

  const marcarCobrada = (f: Factura) => {
    const total = totalesRenglones(f.renglones).total;
    const cliente = fac.clientePorId(f.clienteId);
    if (
      !confirm(
        `¿Marcar cobrada la Factura N° ${f.numeroFactura} por Bs ${formatNumberVE(total)}? Se registrará la entrada en Finanzas LOTER.`
      )
    )
      return;
    fac.marcarFacturaCobrada(f.id);
    finanzas.registrarCobroFactura(
      {
        id: f.id,
        numeroFactura: f.numeroFactura,
        totalBs: total,
        tasaBs: f.tasaBs,
        fecha: fmtISO(new Date()),
        clienteNombre: cliente?.razonSocial ?? "—",
      },
      "loter"
    );
    setToast("Cobro registrado en Finanzas LOTER");
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-700 text-navy-950">Facturas</h2>
            <p className="text-xs text-slate-400">
              Fiscales en Bs, siempre desde una pre-factura · cobrada ⇒ entrada en Finanzas
            </p>
          </div>
          <button
            onClick={() => setCalibrando(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-4 w-4" /> Calibrar plantilla de impresión
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
              <option value="todos">Todas</option>
              <option value="pendiente">Pendientes</option>
              <option value="cobrada">Cobradas</option>
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
                <th className="px-5 py-3 font-600">N° Factura</th>
                <th className="px-5 py-3 font-600">N° Control</th>
                <th className="px-5 py-3 font-600">Emisión</th>
                <th className="px-5 py-3 font-600">Cliente</th>
                <th className="px-5 py-3 text-right font-600">Tasa</th>
                <th className="px-5 py-3 text-right font-600">Total (Bs)</th>
                <th className="px-5 py-3 font-600">Estado</th>
                <th className="px-5 py-3 text-right font-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">
                    No hay facturas para estos filtros. Se generan desde una pre-factura emitida.
                  </td>
                </tr>
              ) : (
                visibles.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-mono font-700 text-navy-950">{f.numeroFactura}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{f.numeroControl}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                      {formatFechaVE(f.fechaEmision)}
                    </td>
                    <td className="px-5 py-3 text-navy-900">
                      {fac.clientePorId(f.clienteId)?.razonSocial ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-slate-500">
                      {formatNumberVE(f.tasaBs)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-600 text-navy-950">
                      {money(totalesRenglones(f.renglones).total, "Bs")}
                    </td>
                    <td className="px-5 py-3">
                      <BadgeEstadoDoc estado={f.estado} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Factura (registro) — PDF interno en Bs"
                          disabled={generando}
                          onClick={() => exportar(f, "registro")}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-navy-50 hover:text-navy-700 disabled:opacity-50"
                        >
                          <FileDown className="h-4 w-4" />
                        </button>
                        <button
                          title="Plantilla de impresión — solo datos para el papel fiscal"
                          disabled={generando}
                          onClick={() => exportar(f, "plantilla")}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-navy-50 hover:text-navy-700 disabled:opacity-50"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {f.estado === "pendiente" && (
                          <button
                            title="Marcar cobrada (registra la entrada en Finanzas)"
                            onClick={() => marcarCobrada(f)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-600 text-white hover:bg-emerald-700"
                          >
                            <CheckCheck className="h-3.5 w-3.5" /> Cobrada
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

      {calibrando && <CalibracionModal onToast={setToast} onClose={() => setCalibrando(false)} />}
      {preview && (
        <PdfPreviewModal preview={preview} onToast={setToast} onClose={() => setPreview(null)} />
      )}
      {toast && <Toast mensaje={toast} />}
    </>
  );
}
