import type { Metadata } from "next";
import { ArrowDown, ArrowRight, Building2, Download, Repeat } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { SALDOS } from "@/lib/data/empresas";
import { MOVIMIENTOS } from "@/lib/data/movimientos";
import type { TipoMovimiento } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { DecorativeForm } from "@/components/ui/DecorativeForm";

export const metadata: Metadata = { title: `Finanzas del grupo · ${APP_NAME}` };

const BADGE_TIPO: Record<TipoMovimiento, string> = {
  Entrada: "bg-emerald-50 text-emerald-700",
  Retiro: "bg-rose-50 text-rose-700",
  Transferencia: "bg-navy-50 text-navy-700",
};

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export default function FinanzasPage() {
  return (
    <>
      <PageHeader
        title="Finanzas del grupo"
        breadcrumb={["LOTER, C.A.", "Administración", "Finanzas"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Saldos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SALDOS.map((em) => (
            <div
              key={em.key}
              className={`rounded-2xl border ${
                em.activa ? "border-navy-200 ring-1 ring-navy-100" : "border-slate-200"
              } bg-white p-5 shadow-card`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-600 text-navy-900">
                  <span
                    className={`h-2 w-2 rounded-full ${em.activa ? "bg-emerald-500" : "bg-slate-300"}`}
                  ></span>
                  {em.nombre}
                </span>
                <Building2 className="h-4 w-4 text-slate-300" />
              </div>
              <p className="mt-3 font-mono text-2xl font-600 text-navy-950">$ {em.usd}</p>
              <p className="font-mono text-sm text-slate-400">Bs {em.bs}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Formulario de transferencia (decorativo en esta fase) */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-card lg:col-span-1">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-display text-base font-700 text-navy-950">
                Transferir entre empresas
              </h2>
              <p className="text-xs text-slate-400">Mueve fondos dentro del conglomerado</p>
            </div>
            <DecorativeForm className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-600 text-navy-900">Empresa origen</label>
                <select className={inputCls}>
                  {SALDOS.map((em) => (
                    <option key={em.key}>{em.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-navy-50 text-navy-600">
                  <ArrowDown className="h-4 w-4" />
                </span>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-600 text-navy-900">Empresa destino</label>
                <select className={inputCls}>
                  {[...SALDOS].reverse().map((em) => (
                    <option key={em.key}>{em.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-600 text-navy-900">Moneda</label>
                  <select className="w-full rounded-xl border border-slate-300 bg-white px-2 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100">
                    <option>USD</option>
                    <option>Bs</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-600 text-navy-900">Monto</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-right font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-600 text-navy-900">Fecha</label>
                <input type="date" className={inputCls} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-600 text-navy-900">
                  Motivo / descripción
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: capital de trabajo"
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                ></textarea>
              </div>

              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 text-sm font-600 text-white hover:bg-navy-800">
                <Repeat className="h-[18px] w-[18px]" /> Registrar transferencia
              </button>
            </DecorativeForm>
          </section>

          {/* Historial */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-card lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-display text-base font-700 text-navy-950">
                  Historial de entradas y retiros
                </h2>
                <p className="text-xs text-slate-400">Registro de todos los movimientos del grupo</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50">
                <Download className="h-4 w-4" /> Exportar
              </button>
            </div>
            <div className="table-wrap">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-600">Fecha</th>
                    <th className="px-5 py-3 font-600">Tipo</th>
                    <th className="px-5 py-3 font-600">Origen → Destino</th>
                    <th className="px-5 py-3 font-600">Descripción</th>
                    <th className="px-5 py-3 text-right font-600">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {MOVIMIENTOS.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                        {h.fecha}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full ${BADGE_TIPO[h.tipo]} px-2.5 py-1 text-xs font-600`}>
                          {h.tipo}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-navy-900">
                          <span>{h.origen}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                          <span className="font-600">{h.destino}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{h.descripcion}</td>
                      <td
                        className={`whitespace-nowrap px-5 py-3 text-right font-mono font-600 ${
                          h.tipo === "Retiro" ? "text-rose-600" : "text-navy-900"
                        }`}
                      >
                        {h.moneda === "USD" ? "$" : "Bs"} {h.monto}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
