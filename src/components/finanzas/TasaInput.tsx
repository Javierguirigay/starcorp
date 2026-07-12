"use client";

/**
 * Input de la tasa Bs/USD global + botón de refrescar desde el BCV.
 * Reemplaza los tres inputs que estaban duplicados en Nómina, Finanzas y
 * Facturación (misma fuente única del FinanzasProvider). El input sigue
 * siendo editable: la edición manual manda hasta que el usuario pulse ↻.
 */
import { RefreshCw } from "lucide-react";
import { formatFechaVE } from "@/lib/format";
import { useFinanzas } from "./FinanzasProvider";

function leyenda(estado: string, fechaISO?: string): string {
  switch (estado) {
    case "cargando":
      return "Consultando BCV…";
    case "ok":
      return fechaISO ? `BCV: ${formatFechaVE(fechaISO)}` : "BCV";
    case "manual":
      return "Tasa manual";
    default:
      return "BCV no disponible";
  }
}

export function TasaInput() {
  const { tasaTexto, setTasaTexto, tasaBcv, refrescarTasaBcv } = useFinanzas();
  const cargando = tasaBcv.estado === "cargando";

  return (
    <div>
      <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">
        Tasa (Bs / USD)
      </label>
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-600 text-slate-400">
            Bs
          </span>
          <input
            type="number"
            step="0.01"
            value={tasaTexto}
            onChange={(e) => setTasaTexto(e.target.value)}
            className="w-36 rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-right font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          />
        </div>
        <button
          type="button"
          onClick={refrescarTasaBcv}
          disabled={cargando}
          title="Traer tasa oficial del BCV"
          className="rounded-xl border border-slate-300 bg-white p-2.5 text-slate-500 hover:border-navy-500 hover:text-navy-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
        </button>
      </div>
      <p
        className={`mt-1 text-[11px] ${
          tasaBcv.estado === "error" ? "text-amber-600" : "text-slate-400"
        }`}
      >
        {leyenda(tasaBcv.estado, tasaBcv.fechaISO)}
      </p>
    </div>
  );
}
