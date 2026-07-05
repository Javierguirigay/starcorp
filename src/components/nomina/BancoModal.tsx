"use client";

import type { Empleado } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "./badges";

function Fila({ etiqueta, valor, mono = false }: { etiqueta: string; valor: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-slate-400">{etiqueta}</span>
      <span className={`${mono ? "font-mono " : ""}font-500 text-navy-900`}>{valor || "—"}</span>
    </div>
  );
}

export function BancoModal({ empleado, onClose }: { empleado: Empleado; onClose: () => void }) {
  const b = empleado.banco;
  return (
    <Modal
      onClose={onClose}
      title="Datos bancarios"
      maxWidth="max-w-md"
      footer={
        <button
          onClick={onClose}
          className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
        >
          Cerrar
        </button>
      }
    >
      <div className="mb-3 flex items-center gap-3">
        <Avatar nombre={empleado.nombre} size="h-11 w-11" />
        <div className="leading-tight">
          <p className="font-600 text-navy-900">{empleado.nombre}</p>
          <p className="text-xs text-slate-400">{empleado.cargo}</p>
        </div>
      </div>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
        <Fila etiqueta="Banco" valor={b.banco} />
        <Fila etiqueta="Tipo de cuenta" valor={b.tipo} />
        <Fila etiqueta="Número de cuenta" valor={b.cuenta} mono />
        <Fila etiqueta="Titular" valor={b.titular} />
        <Fila etiqueta="Cédula" valor={b.cedula} mono />
        <Fila etiqueta="Pago móvil" valor={b.pagomovil} mono />
      </div>
    </Modal>
  );
}
