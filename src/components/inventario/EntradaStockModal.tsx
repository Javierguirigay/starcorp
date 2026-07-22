"use client";

/**
 * Entrada manual de stock de un consumible (compra directa, donación,
 * devolución) o ajuste de conteo físico (±). Registra el movimiento en el
 * kardex con referencia "Manual".
 */
import { useState } from "react";
import { PackagePlus } from "lucide-react";
import { fmtISO } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { useInventario } from "./InventarioProvider";
import { UbicacionSelect } from "./UbicacionSelect";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function EntradaStockModal({
  consumibleId,
  onToast,
  onClose,
}: {
  /** Preselección opcional (desde la fila de la tabla). */
  consumibleId?: number;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const inv = useInventario();
  const catalogo = [...inv.consumibles].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const [id, setId] = useState<number | "">(consumibleId ?? "");
  const [cantidad, setCantidad] = useState("");
  const [fecha, setFecha] = useState(fmtISO(new Date()));
  const [nota, setNota] = useState("");
  const [esAjuste, setEsAjuste] = useState(false);
  const seleccionado = id === "" ? undefined : inv.consumiblePorId(id);
  const [ubicacion, setUbicacion] = useState(seleccionado?.ubicacion ?? "");

  const elegir = (v: string) => {
    const nuevo = v === "" ? "" : Number(v);
    setId(nuevo);
    // Propone la ubicación principal del consumible elegido.
    if (nuevo !== "") setUbicacion(inv.consumiblePorId(nuevo)?.ubicacion ?? "");
  };

  const guardar = () => {
    if (id === "" || !seleccionado) return onToast("Selecciona el consumible");
    const cant = Number(cantidad);
    if (isNaN(cant) || cant === 0) return onToast("Indica una cantidad válida (distinta de 0)");
    if (!esAjuste && cant < 0) return onToast("La entrada debe ser positiva (usa Ajuste para restar)");
    if (esAjuste && seleccionado.cantidad + cant < 0)
      return onToast(`El ajuste dejaría el stock negativo (hay ${seleccionado.cantidad})`);
    if (!ubicacion.trim()) return onToast("Indica la ubicación");
    if (!fecha) return onToast("Indica la fecha");
    inv.registrarEntradaConsumible({
      consumibleId: id,
      cantidad: cant,
      ubicacion: ubicacion.trim(),
      fecha,
      ...(nota.trim() ? { nota: nota.trim() } : {}),
      ...(esAjuste ? { esAjuste: true } : {}),
    });
    onToast(
      esAjuste
        ? `Ajuste registrado: ${seleccionado.nombre} ${cant > 0 ? "+" : ""}${cant} ${seleccionado.unidad}`
        : `Entrada registrada: +${cant} ${seleccionado.unidad} de ${seleccionado.nombre}`
    );
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title="Registrar entrada"
      subtitle="Suma stock al inventario y queda en el kardex de movimientos"
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
            onClick={guardar}
            className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
          >
            <PackagePlus className="h-4 w-4" /> Registrar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Consumible</label>
          <select className={inputCls} value={id} onChange={(e) => elegir(e.target.value)}>
            <option value="">Selecciona consumible…</option>
            {catalogo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} · {c.cantidad} {c.unidad}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">
              {esAjuste ? "Delta (±)" : "Cantidad que entra"}
            </label>
            <input
              type="number"
              className={`${inputCls} text-right font-mono`}
              value={cantidad}
              placeholder={esAjuste ? "Ej: -2" : "Ej: 20"}
              onChange={(e) => setCantidad(e.target.value)}
            />
            {seleccionado && (
              <p className="mt-1 text-xs text-slate-400">
                Stock actual: {seleccionado.cantidad} {seleccionado.unidad}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Fecha</label>
            <input
              type="date"
              className={inputCls}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Ubicación</label>
          <UbicacionSelect value={ubicacion} onChange={setUbicacion} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Nota</label>
          <input
            className={inputCls}
            value={nota}
            placeholder="Opcional · ej. compra directa, devolución de campo"
            onChange={(e) => setNota(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-navy-900">
          <input
            type="checkbox"
            checked={esAjuste}
            onChange={(e) => setEsAjuste(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-navy-900 focus:ring-navy-500"
          />
          Es ajuste de conteo físico (permite restar)
        </label>
      </div>
    </Modal>
  );
}
