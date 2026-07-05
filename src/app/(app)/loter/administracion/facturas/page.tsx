import type { Metadata } from "next";
import { Download, Eye, FileText, Search, Trash2, UploadCloud } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { FACTURAS, RESUMEN_JUNIO } from "@/lib/data/facturas";
import type { EstadoFactura } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: `Facturas · ${APP_NAME}` };

const COLOR_ESTADO: Record<EstadoFactura, string> = {
  Cobrada: "bg-emerald-50 text-emerald-700",
  Pagada: "bg-emerald-50 text-emerald-700",
  Pendiente: "bg-amber-50 text-amber-700",
};

export default function FacturasPage() {
  return (
    <>
      <PageHeader title="Facturas" breadcrumb={["LOTER, C.A.", "Administración", "Facturas"]} />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Zona de subida (decorativa en esta fase) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center transition hover:border-navy-400 hover:bg-navy-50/30">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-50 text-navy-700 transition group-hover:bg-navy-900 group-hover:text-gold-400">
                <UploadCloud className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-600 text-navy-900">
                Arrastra una factura en PDF o haz clic para subir
              </p>
              <p className="mt-1 text-xs text-slate-400">Solo archivos PDF · hasta 10 MB</p>
              <input type="file" accept="application/pdf" className="hidden" />
            </label>
          </div>

          {/* Resumen del mes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h3 className="font-display text-sm font-700 text-navy-950">Resumen de junio</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Emitidas</dt>
                <dd className="font-mono font-600 text-navy-900">{RESUMEN_JUNIO.emitidas}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Recibidas</dt>
                <dd className="font-mono font-600 text-navy-900">{RESUMEN_JUNIO.recibidas}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Por cobrar</dt>
                <dd className="font-mono font-600 text-amber-600">{RESUMEN_JUNIO.porCobrar}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <dt className="font-600 text-navy-900">Total emitido</dt>
                <dd className="font-mono font-600 text-navy-900">{RESUMEN_JUNIO.totalEmitido}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Filtros (decorativos, como el boceto) */}
        <div className="mb-4 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-card">
            <button className="rounded-lg bg-navy-900 px-4 py-1.5 text-sm font-600 text-white">
              Todas
            </button>
            <button className="rounded-lg px-4 py-1.5 text-sm font-600 text-slate-500 hover:text-navy-900">
              Emitidas
            </button>
            <button className="rounded-lg px-4 py-1.5 text-sm font-600 text-slate-500 hover:text-navy-900">
              Recibidas
            </button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por proveedor o N°…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100 sm:w-72"
            />
          </div>
        </div>

        {/* Listado en tarjetas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {FACTURAS.map((f) => (
            <div
              key={f.numero}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-navy-300"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-mono text-sm font-600 text-navy-900">N° {f.numero}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-600 text-slate-500">
                      {f.tipo}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-400">{f.proveedor}</p>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="font-mono text-lg font-600 text-navy-950">
                    {f.moneda} {f.monto}
                  </p>
                  <p className="font-mono text-xs text-slate-400">{f.fecha}</p>
                </div>
                <span className={`rounded-full ${COLOR_ESTADO[f.estado]} px-2.5 py-1 text-xs font-600`}>
                  {f.estado}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-navy-50 py-2 text-xs font-600 text-navy-700 hover:bg-navy-100">
                  <Eye className="h-4 w-4" /> Ver PDF
                </button>
                <button
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                  title="Descargar"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
