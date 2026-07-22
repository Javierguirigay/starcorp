"use client";

/**
 * Recepción de una orden de compra: al confirmar, los renglones vinculados a
 * consumibles SUMAN stock en la ubicación elegida y quedan en el kardex con
 * la referencia OC-xxxx. Los renglones de texto libre no afectan inventario.
 */
import { useState } from "react";
import { PackageCheck } from "lucide-react";
import type { Orden } from "@/lib/types";
import { fmtISO } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { useInventario } from "@/components/inventario/InventarioProvider";
import { UbicacionSelect } from "@/components/inventario/UbicacionSelect";
import { useOrdenes } from "./OrdenesProvider";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function RecibirCompraModal({
  orden,
  onToast,
  onClose,
}: {
  orden: Orden;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const inv = useInventario();
  const ord = useOrdenes();
  const [fecha, setFecha] = useState(fmtISO(new Date()));
  const [ubicacion, setUbicacion] = useState("");

  const vinculados = orden.renglones.filter((r) => r.refInventario?.clase === "consumible");
  const libres = orden.renglones.length - vinculados.length;

  const confirmar = () => {
    if (!fecha) return onToast("Indica la fecha de recepción");
    if (!ubicacion.trim()) return onToast("Indica la ubicación donde entra la mercancía");
    ord.marcarCompraRecibida(orden.id, fecha, ubicacion.trim());
    inv.aplicarRecepcionCompra(orden, ubicacion.trim(), fecha);
    onToast(`${orden.numero} recibida: stock actualizado`);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={`Recibir ${orden.numero}`}
      subtitle={`Proveedor: ${orden.contraparteNombre}`}
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
            onClick={confirmar}
            className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
          >
            <PackageCheck className="h-4 w-4" /> Confirmar recepción
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Fecha de recepción</label>
            <input
              type="date"
              className={inputCls}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Entra en</label>
            <UbicacionSelect value={ubicacion} onChange={setUbicacion} />
          </div>
        </div>

        {vinculados.length > 0 ? (
          <div className="rounded-xl border border-slate-200">
            <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-600 uppercase tracking-wide text-slate-400">
              Suman stock
            </p>
            <ul className="divide-y divide-slate-50">
              {vinculados.map((r, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-navy-900">{r.descripcion}</span>
                  <span className="font-mono text-navy-950">
                    +{r.cantidad} {r.unidad}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
            Ningún renglón está vinculado al inventario: la recepción no sumará stock.
          </p>
        )}

        {vinculados.length > 0 && libres > 0 && (
          <p className="text-xs text-slate-400">
            {libres} renglón{libres === 1 ? "" : "es"} de texto libre no afecta{libres === 1 ? "" : "n"} el
            inventario.
          </p>
        )}
      </div>
    </Modal>
  );
}
