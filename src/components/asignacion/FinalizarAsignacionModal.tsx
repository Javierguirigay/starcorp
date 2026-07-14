"use client";

/**
 * Finaliza una asignación fijando su fecha "hasta" (el día en que el equipo
 * vuelve de locación/base). Por defecto propone hoy; los días se calculan del
 * rango desde→hasta. Al confirmar, el equipo queda libre (estado derivado).
 */
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { Asignacion } from "@/lib/types";
import { fmtISO, formatFechaVE } from "@/lib/format";
import { diasEntre } from "@/lib/negocio/fechas";
import { Modal } from "@/components/ui/Modal";
import { useInventario } from "@/components/inventario/InventarioProvider";

export function FinalizarAsignacionModal({
  asignacion,
  onToast,
  onClose,
}: {
  asignacion: Asignacion;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const inv = useInventario();
  // Propone la fecha "hasta" ya capturada al crear, o el día de hoy.
  const [hasta, setHasta] = useState(asignacion.hasta || fmtISO(new Date()));

  const dias = diasEntre(asignacion.desde, hasta);

  const confirmar = () => {
    if (!hasta) return onToast("Indica la fecha de finalización");
    if (dias === "")
      return onToast("La fecha de finalización no puede ser anterior al inicio");
    inv.finalizarAsignacion(asignacion.id, hasta, dias);
    onToast(`Asignación ${asignacion.id} finalizada`);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={`Finalizar asignación ${asignacion.id}`}
      subtitle={`Se liberan: ${asignacion.equipos.join(", ")}`}
      maxWidth="max-w-md"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
          >
            <CheckCircle2 className="h-4 w-4" /> Finalizar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Inicio del servicio:{" "}
          <span className="font-600 text-navy-900">{formatFechaVE(asignacion.desde)}</span>
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">
            Fecha de finalización (hasta)
          </label>
          <input
            type="date"
            value={hasta}
            min={asignacion.desde}
            onChange={(e) => setHasta(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Duración del servicio:{" "}
            <span className="font-600 text-navy-900">
              {dias === "" ? "—" : `${dias} día${dias === 1 ? "" : "s"}`}
            </span>
          </p>
        </div>
      </div>
    </Modal>
  );
}
