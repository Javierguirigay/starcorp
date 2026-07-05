"use client";

import type { PagoHistorial } from "@/lib/types";
import { money } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";

export function DetalleModal({
  pago,
  tasa,
  onClose,
}: {
  pago: PagoHistorial;
  tasa: number;
  onClose: () => void;
}) {
  const enBs = (usd: number) => money(usd * tasa, "Bs");

  return (
    <Modal
      onClose={onClose}
      title="Detalle del pago"
      subtitle={`${pago.categoria} · ${pago.desde} → ${pago.hasta} · registrado ${pago.registrado}`}
      footer={
        <button
          onClick={onClose}
          className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
        >
          Cerrar
        </button>
      }
    >
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-2.5 font-600">Empleado</th>
              <th className="px-4 py-2.5 text-center font-600">Faltas</th>
              <th className="px-4 py-2.5 text-right font-600">Diario</th>
              <th className="px-4 py-2.5 text-right font-600">Descuento</th>
              <th className="px-4 py-2.5 text-right font-600">Neto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pago.detalle.map((d, i) => (
              <tr key={i}>
                <td className="px-4 py-2.5 font-600 text-navy-900">{d.nombre}</td>
                <td
                  className={`px-4 py-2.5 text-center font-mono ${
                    d.faltas > 0 ? "text-rose-600" : "text-slate-400"
                  }`}
                >
                  {d.faltas}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-600">{money(d.diario)}</td>
                <td
                  className={`px-4 py-2.5 text-right font-mono ${
                    d.desc > 0 ? "text-rose-600" : "text-slate-400"
                  }`}
                >
                  {d.desc > 0 ? "− " + money(d.desc) : money(0)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-600 text-navy-950">
                  {money(d.neto)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50/60 font-600">
              <td className="px-4 py-2.5" colSpan={3}>
                Total ({pago.categoria})
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-rose-600">
                − {money(pago.totalDesc)}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-navy-950">{money(pago.totalUsd)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 text-right text-xs text-slate-400">
        Equivalente: <span className="font-mono">{enBs(pago.totalUsd)}</span> (tasa{" "}
        {money(tasa, "Bs")})
      </p>
    </Modal>
  );
}
