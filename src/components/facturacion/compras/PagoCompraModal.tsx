"use client";

/**
 * Marca una factura recibida como pagada: pide la categoría de Finanzas
 * (default "Gastos Operativos") y registra la salida automática en Finanzas
 * LOTER convertida a USD con la tasa vigente (snapshot del pago).
 */
import { useState } from "react";
import type { FacturaRecibida } from "@/lib/types";
import { fmtISO, money } from "@/lib/format";
import { categoriasParaTipo } from "@/lib/negocio/finanzas";
import { round2 } from "@/lib/negocio/nomina";
import { Modal } from "@/components/ui/Modal";
import { useFinanzas } from "@/components/finanzas/FinanzasProvider";
import { useFacturacion } from "../FacturacionProvider";

const EMPRESA_ID = "loter";

export function PagoCompraModal({
  compra,
  onToast,
  onClose,
}: {
  compra: FacturaRecibida;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const fac = useFacturacion();
  const finanzas = useFinanzas();
  const proveedor = fac.proveedorPorId(compra.proveedorId);

  const opciones = categoriasParaTipo(
    finanzas.categoriasDe(EMPRESA_ID),
    EMPRESA_ID,
    "salida"
  );
  const gastosOperativos = opciones.find((c) => c.nombre === "Gastos Operativos");
  const [categoriaId, setCategoriaId] = useState<number | "">(
    gastosOperativos?.id ?? opciones[0]?.id ?? ""
  );

  const montoUSD = finanzas.tasa > 0 ? round2(compra.totalConIvaBs / finanzas.tasa) : 0;

  const pagar = () => {
    if (categoriaId === "") return onToast("Selecciona la categoría de Finanzas");
    if (finanzas.tasa <= 0)
      return onToast("Indica una tasa Bs/USD válida antes de registrar el pago");
    fac.marcarCompraPagada(compra.id);
    finanzas.registrarPagoCompra(
      {
        id: compra.id,
        numeroFactura: compra.numeroFactura,
        totalBs: compra.totalConIvaBs,
        proveedorNombre: proveedor?.razonSocial ?? "—",
        fecha: fmtISO(new Date()),
        categoriaId,
      },
      EMPRESA_ID
    );
    onToast("Pago registrado en Finanzas LOTER");
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={`Pagar Factura ${compra.numeroFactura}`}
      subtitle={`${proveedor?.razonSocial ?? ""} · genera la salida automática en Finanzas LOTER`}
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={pagar}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-600 text-white hover:bg-emerald-700"
          >
            Confirmar pago
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-navy-50/60 px-4 py-3 text-sm text-navy-900">
          <p className="flex justify-between">
            <span>Total de la factura</span>
            <span className="font-mono font-700">{money(compra.totalConIvaBs, "Bs")}</span>
          </p>
          <p className="mt-1 flex justify-between text-xs text-navy-700">
            <span>Equivalente a la tasa vigente ({money(finanzas.tasa, "Bs")}/USD)</span>
            <span className="font-mono">{finanzas.tasa > 0 ? money(montoUSD) : "—"}</span>
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">
            Categoría de Finanzas (salida)
          </label>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          >
            {opciones.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-400">
          El movimiento queda como automático (origen «compra») en Finanzas: no se puede editar
          ni eliminar desde allí.
        </p>
      </div>
    </Modal>
  );
}
