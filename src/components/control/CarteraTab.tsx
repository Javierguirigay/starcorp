"use client";

/**
 * Cuentas por Cobrar: vista sobre las facturas de venta pendientes (no hay
 * modelo aparte). El vencimiento se edita en línea porque los documentos
 * existentes nacieron sin fecha pactada.
 * (Cuentas por Pagar vive en su propio componente CuentasPorPagarTab, con un
 * modelo administrativo propio.)
 */
import { useEffect, useState } from "react";
import { AlarmClock, CalendarClock, HandCoins } from "lucide-react";
import { fmtISO, formatFechaVE, formatNumberVE, money } from "@/lib/format";
import { cuentasPorCobrar, totalesCartera, type EstadoCartera, type FilaCartera } from "@/lib/negocio/cartera";
import { totalesRenglones } from "@/lib/negocio/facturacion";
import { round2 } from "@/lib/negocio/nomina";
import { KpiCard } from "@/components/ui/KpiCard";
import { Toast } from "@/components/ui/Toast";
import { useFinanzas } from "@/components/finanzas/FinanzasProvider";
import { CobroFacturaModal } from "@/components/finanzas/CobroFacturaModal";
import { useFacturacion } from "@/components/facturacion/FacturacionProvider";

const BADGE: Record<EstadoCartera, string> = {
  vencida: "bg-rose-50 text-rose-700",
  "por-vencer": "bg-amber-50 text-amber-700",
  "al-dia": "bg-emerald-50 text-emerald-700",
  "sin-fecha": "bg-slate-100 text-slate-500",
};

function etiquetaEstado(f: FilaCartera): string {
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

export function CarteraTab() {
  const fac = useFacturacion();
  const finanzas = useFinanzas();
  const [toast, setToast] = useState<string | null>(null);
  const [hoy] = useState(() => fmtISO(new Date()));
  const [cobrando, setCobrando] = useState<FilaCartera | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filas = cuentasPorCobrar(fac.facturas, fac.clientes, hoy);
  const totales = totalesCartera(filas);

  const enUSD = (bs: number) => (finanzas.tasa > 0 ? money(round2(bs / finanzas.tasa)) : "—");

  /* Cobro: marca la factura y registra la entrada en Finanzas sobre la cuenta
     elegida en el modal (mismo par de llamadas que la pestaña Facturas). */
  const confirmarCobro = (fila: FilaCartera, cuentaId: number) => {
    const f = fac.facturas.find((x) => x.id === fila.id);
    if (!f) return;
    fac.marcarFacturaCobrada(f.id);
    finanzas.registrarCobroFactura(
      {
        id: f.id,
        numeroFactura: f.numeroFactura,
        totalBs: totalesRenglones(f.renglones).total,
        tasaBs: f.tasaBs,
        fecha: fmtISO(new Date()),
        clienteNombre: fac.clientePorId(f.clienteId)?.razonSocial ?? "—",
      },
      "loter",
      cuentaId
    );
    setToast("Cobro registrado en Finanzas LOTER");
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total por cobrar"
          valor={money(totales.pendienteBs, "Bs")}
          sub={`${totales.cantidad} documento(s) · ${enUSD(totales.pendienteBs)}`}
          icon={HandCoins}
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
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-base font-700 text-navy-950">Cuentas por Cobrar</h2>
          <p className="text-xs text-slate-400">
            Facturas emitidas pendientes de cobro · lo vencido primero
          </p>
        </div>

        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-600">N° Factura</th>
                <th className="px-4 py-3 font-600">Cliente</th>
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
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                    No hay facturas pendientes de cobro.
                  </td>
                </tr>
              ) : (
                filas.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-navy-900">{f.documento}</td>
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
                        onChange={(e) => fac.setVencimientoFactura(f.id, e.target.value)}
                        title="Fecha pactada de cobro"
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
                      <button
                        onClick={() => setCobrando(f)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-600 text-navy-700 hover:bg-slate-50"
                      >
                        Marcar cobrada
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filas.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/60 font-600 text-navy-900">
                  <td colSpan={6} className="px-4 py-3">
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

      {cobrando && (
        <CobroFacturaModal
          empresaId="loter"
          numeroFactura={cobrando.documento}
          clienteNombre={cobrando.contraparte}
          totalBs={cobrando.totalBs}
          tasaBs={fac.facturas.find((x) => x.id === cobrando.id)?.tasaBs ?? finanzas.tasa}
          onConfirmar={(cuentaId) => confirmarCobro(cobrando, cuentaId)}
          onClose={() => setCobrando(null)}
        />
      )}

      {toast && <Toast mensaje={toast} />}
    </>
  );
}
