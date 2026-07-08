"use client";

import type { Empleado } from "@/lib/types";
import { formatFechaVE } from "@/lib/format";
import { DOW, rangoFechas } from "@/lib/negocio/nomina";
import { Modal } from "@/components/ui/Modal";

export function FaltasModal({
  empleado,
  desde,
  hasta,
  marcadas,
  onToggle,
  onLimpiar,
  onClose,
}: {
  empleado: Empleado;
  desde: string;
  hasta: string;
  marcadas: string[];
  onToggle: (fecha: string) => void;
  onLimpiar: () => void;
  onClose: () => void;
}) {
  const fechas = rangoFechas(desde, hasta);

  return (
    <Modal
      onClose={onClose}
      title="Marcar faltas"
      subtitle={`${empleado.nombre} · ${formatFechaVE(desde)} → ${formatFechaVE(hasta)}`}
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            onClick={onLimpiar}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
          >
            Quitar todas
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
          >
            Listo
          </button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-500">
        Toca los días en los que el empleado{" "}
        <span className="font-600 text-navy-900">no asistió</span>.
      </p>
      <div className="grid grid-cols-7 gap-1.5">
        {fechas.length === 0 ? (
          <p className="col-span-7 py-6 text-center text-sm text-slate-400">
            Revisa el rango Desde/Hasta del período.
          </p>
        ) : (
          fechas.map((f) => {
            const dt = new Date(f + "T00:00:00");
            const on = marcadas.includes(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => onToggle(f)}
                className={`flex flex-col items-center rounded-lg border px-1 py-2 text-xs transition ${
                  on
                    ? "border-rose-300 bg-rose-50 text-rose-600"
                    : "border-slate-200 text-navy-800 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`text-[10px] uppercase tracking-wide ${
                    on ? "text-rose-400" : "text-slate-400"
                  }`}
                >
                  {DOW[dt.getDay()]}
                </span>
                <span className="font-mono font-600">{String(dt.getDate()).padStart(2, "0")}</span>
              </button>
            );
          })
        )}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
        <span className="text-slate-500">Faltas marcadas</span>
        <span className="font-mono text-lg font-700 text-rose-600">{marcadas.length}</span>
      </div>
    </Modal>
  );
}
