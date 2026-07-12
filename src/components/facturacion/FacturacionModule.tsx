"use client";

/**
 * Módulo "Facturación y Compras": selector de sub-módulo (Facturación |
 * Gestión de Compras) + pestañas internas. `vistaInicial`/`tabInicial`
 * llegan del server page (searchParams) para poder enlazar directo, p. ej.
 * el redirect de la ruta vieja de Retenciones.
 */
import { useState } from "react";
import { TasaInput } from "@/components/finanzas/TasaInput";
import { ReportesTab } from "./ventas/ReportesTab";
import { PrefacturasTab } from "./ventas/PrefacturasTab";
import { FacturasTab } from "./ventas/FacturasTab";
import { LibroVentasTab } from "./ventas/LibroVentasTab";
import { ResumenVentasTab } from "./ventas/ResumenVentasTab";
import { FacturasRecibidasTab } from "./compras/FacturasRecibidasTab";
import { RetencionesTab } from "./compras/RetencionesTab";
import { LibroComprasTab } from "./compras/LibroComprasTab";
import { ResumenTab } from "./compras/ResumenTab";

export type Vista = "facturacion" | "compras";

const TABS: Record<Vista, { key: string; label: string }[]> = {
  facturacion: [
    { key: "reportes", label: "Reporte de Servicio" },
    { key: "prefacturas", label: "Pre-Factura" },
    { key: "facturas", label: "Factura" },
    { key: "libro-ventas", label: "Libro de Ventas" },
    { key: "resumen-ventas", label: "Resumen" },
  ],
  compras: [
    { key: "recibidas", label: "Facturas Recibidas" },
    { key: "retenciones", label: "Retenciones" },
    { key: "libro-compras", label: "Libro de Compras" },
    { key: "resumen", label: "Resumen" },
  ],
};

const vistaCls = (activo: boolean) =>
  `rounded-lg px-4 py-2 text-sm font-600 ${
    activo ? "bg-navy-900 text-white" : "text-slate-500 hover:text-navy-900"
  }`;

const tabCls = (activo: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-600 ${
    activo ? "bg-navy-900 text-white" : "text-slate-500 hover:text-navy-900"
  }`;

export function FacturacionModule({
  vistaInicial = "facturacion",
  tabInicial,
}: {
  vistaInicial?: Vista;
  tabInicial?: string;
}) {
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [tabs, setTabs] = useState<Record<Vista, string>>({
    facturacion:
      vistaInicial === "facturacion" && tabInicial ? tabInicial : "reportes",
    compras: vistaInicial === "compras" && tabInicial ? tabInicial : "recibidas",
  });
  const tab = tabs[vista];

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex self-start rounded-xl border border-slate-200 bg-white p-1">
            <button onClick={() => setVista("facturacion")} className={vistaCls(vista === "facturacion")}>
              Facturación
            </button>
            <button onClick={() => setVista("compras")} className={vistaCls(vista === "compras")}>
              Gestión de Compras
            </button>
          </div>
          <div className="inline-flex flex-wrap items-center gap-1 self-start rounded-xl border border-slate-200 bg-white p-1">
            {TABS[vista].map((t) => (
              <button
                key={t.key}
                onClick={() => setTabs((prev) => ({ ...prev, [vista]: t.key }))}
                className={tabCls(tab === t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tasa global (misma fuente que Nómina y Finanzas). */}
        <TasaInput />
      </div>

      {vista === "facturacion" ? (
        <>
          {tab === "reportes" && <ReportesTab />}
          {tab === "prefacturas" && <PrefacturasTab />}
          {tab === "facturas" && <FacturasTab />}
          {tab === "libro-ventas" && <LibroVentasTab />}
          {tab === "resumen-ventas" && <ResumenVentasTab />}
        </>
      ) : (
        <>
          {tab === "recibidas" && <FacturasRecibidasTab />}
          {tab === "retenciones" && <RetencionesTab />}
          {tab === "libro-compras" && <LibroComprasTab />}
          {tab === "resumen" && <ResumenTab />}
        </>
      )}
    </>
  );
}
