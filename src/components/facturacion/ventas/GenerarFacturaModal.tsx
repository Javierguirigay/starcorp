"use client";

/**
 * Genera la factura fiscal (Bs) desde una pre-factura emitida:
 * N° de factura y N° de control MANUALES (deben coincidir con el talonario
 * pre-impreso) y conversión POR PRECIO UNITARIO a la tasa del día (editable,
 * se guarda como snapshot).
 */
import { useState } from "react";
import type { PreFactura } from "@/lib/types";
import { fmtISO, formatNumberVE, money } from "@/lib/format";
import { convertirRenglonesATasa, totalesRenglones } from "@/lib/negocio/facturacion";
import { Modal } from "@/components/ui/Modal";
import { useFinanzas } from "@/components/finanzas/FinanzasProvider";
import { useFacturacion } from "../FacturacionProvider";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function GenerarFacturaModal({
  prefactura,
  onToast,
  onClose,
}: {
  prefactura: PreFactura;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const fac = useFacturacion();
  const finanzas = useFinanzas();

  const [numeroFactura, setNumeroFactura] = useState("");
  const [numeroControl, setNumeroControl] = useState("");
  const [fechaEmision, setFechaEmision] = useState(fmtISO(new Date()));
  // Tasa vigente del sistema como default; editable y congelada en la factura.
  const [tasaTexto, setTasaTexto] = useState(finanzas.tasaTexto);
  const tasaNum = parseFloat(tasaTexto); // input type=number: decimal con punto
  const tasa = isNaN(tasaNum) ? 0 : tasaNum;

  const renglonesBs = tasa > 0 ? convertirRenglonesATasa(prefactura.renglones, tasa) : [];
  const totales = totalesRenglones(renglonesBs);
  const totalesUsd = totalesRenglones(prefactura.renglones);

  const guardar = () => {
    if (!numeroFactura.trim()) return onToast("Indica el N° de factura del talonario");
    if (!numeroControl.trim()) return onToast("Indica el N° de control del talonario");
    if (
      fac.facturas.some(
        (f) => f.numeroFactura === numeroFactura.trim() || f.numeroControl === numeroControl.trim()
      )
    )
      return onToast("Ya existe una factura con ese N° de factura o de control");
    if (!fechaEmision) return onToast("Indica la fecha de emisión");
    if (tasa <= 0) return onToast("Indica una tasa Bs/USD válida");
    fac.generarFactura(prefactura.id, {
      numeroFactura: numeroFactura.trim(),
      numeroControl: numeroControl.trim(),
      fechaEmision,
      tasaBs: tasa,
    });
    onToast(`Factura N° ${numeroFactura.trim()} generada`);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={`Generar Factura — Pre-Factura N° ${prefactura.numero}`}
      subtitle={`${fac.clientePorId(prefactura.clienteId)?.razonSocial ?? ""} · total USD ${formatNumberVE(totalesUsd.total)}`}
      maxWidth="max-w-3xl"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
          >
            Generar factura
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-600 text-navy-900">N° de Factura</label>
            <input type="text" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} placeholder="000116" className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-600 text-navy-900">N° de Control</label>
            <input type="text" value={numeroControl} onChange={(e) => setNumeroControl(e.target.value)} placeholder="00-000116" className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-600 text-navy-900">Fecha de emisión</label>
            <input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-600 text-navy-900">Tasa (Bs/USD)</label>
            <input
              type="number"
              step="0.01"
              value={tasaTexto}
              onChange={(e) => setTasaTexto(e.target.value)}
              className={`${inputCls} text-right font-mono`}
            />
          </div>
        </div>

        <p className="rounded-xl bg-navy-50/60 px-4 py-2.5 text-xs text-navy-700">
          Conversión por precio unitario: cada P. Unit. USD × tasa; subtotal, IVA y total se
          recalculan en Bs a partir de los unitarios convertidos.
        </p>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="w-16 px-3 py-2 font-600">CAN</th>
                <th className="px-3 py-2 font-600">Descripción</th>
                <th className="px-3 py-2 text-right font-600">P. Unit. ($)</th>
                <th className="px-3 py-2 text-right font-600">P. Unit. (Bs)</th>
                <th className="px-3 py-2 text-right font-600">Total (Bs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {prefactura.renglones.map((r, i) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-center font-mono">{r.can}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{r.descripcion}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-500">
                    {formatNumberVE(r.pUnit)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-navy-900">
                    {tasa > 0 ? formatNumberVE(renglonesBs[i].pUnit) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-navy-900">
                    {tasa > 0
                      ? formatNumberVE(renglonesBs[i].can * renglonesBs[i].pUnit)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50/60 font-600 text-navy-900">
                <td colSpan={4} className="px-3 py-2 text-right">SUB - TOTAL</td>
                <td className="px-3 py-2 text-right font-mono">
                  {tasa > 0 ? money(totales.subtotal, "Bs") : "—"}
                </td>
              </tr>
              <tr className="bg-slate-50/60 font-600 text-navy-900">
                <td colSpan={4} className="px-3 py-2 text-right">IVA 16%</td>
                <td className="px-3 py-2 text-right font-mono">
                  {tasa > 0 ? money(totales.iva, "Bs") : "—"}
                </td>
              </tr>
              <tr className="bg-slate-50/60 font-700 text-navy-950">
                <td colSpan={4} className="px-3 py-2 text-right">TOTAL A PAGAR</td>
                <td className="px-3 py-2 text-right font-mono">
                  {tasa > 0 ? money(totales.total, "Bs") : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Modal>
  );
}
