"use client";

/** Alta/edición de un consumible de finca (aceite/filtro/…) con stock. */
import { useState } from "react";
import type { ConsumibleFinca } from "@/lib/types";
import {
  TIPOS_CONSUMIBLE_FINCA,
  UBICACIONES_FINCA,
  UNIDADES_CONSUMIBLE_FINCA,
} from "@/lib/data/agrostarInventario";
import { Modal } from "@/components/ui/Modal";
import { AutocompleteInput } from "@/components/ui/AutocompleteInput";

export type ConsumibleFincaDatos = Omit<ConsumibleFinca, "id" | "empresaId">;

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function ConsumibleFincaModal({
  consumible,
  tiposUsados,
  onGuardar,
  onToast,
  onClose,
}: {
  consumible: ConsumibleFinca | null;
  tiposUsados: string[];
  onGuardar: (datos: ConsumibleFincaDatos) => void;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(consumible?.nombre ?? "");
  const [tipo, setTipo] = useState(consumible?.tipo ?? "");
  const [unidad, setUnidad] = useState(consumible?.unidad ?? "unidad");
  const [cantidad, setCantidad] = useState(consumible ? String(consumible.cantidad) : "0");
  const [stockMinimo, setStockMinimo] = useState(consumible ? String(consumible.stockMinimo) : "0");
  const [ubicacion, setUbicacion] = useState(consumible?.ubicacion ?? "Depósito");

  const opcionesTipo = Array.from(new Set([...TIPOS_CONSUMIBLE_FINCA, ...tiposUsados]));

  const guardar = () => {
    const cant = Number(cantidad);
    const min = Number(stockMinimo);
    if (!nombre.trim()) return onToast("Indica el nombre del consumible");
    if (!tipo.trim()) return onToast("Indica el tipo (Aceite, Filtro…)");
    if (isNaN(cant) || cant < 0) return onToast("Indica una cantidad válida");
    if (isNaN(min) || min < 0) return onToast("Indica un stock mínimo válido");
    onGuardar({
      nombre: nombre.trim(),
      tipo: tipo.trim(),
      unidad: unidad.trim() || "unidad",
      cantidad: cant,
      stockMinimo: min,
      ubicacion: ubicacion.trim(),
    });
  };

  return (
    <Modal
      onClose={onClose}
      title={consumible ? "Editar consumible" : "Cargar consumible"}
      subtitle="Aceites, filtros y repuestos con control de existencias"
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
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
          >
            {consumible ? "Guardar cambios" : "Cargar al inventario"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Nombre</label>
          <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Tipo</label>
            <AutocompleteInput
              value={tipo}
              onChange={setTipo}
              opciones={opcionesTipo}
              placeholder="Aceite, Filtro…"
              className={inputCls}
              ariaLabel="Tipo de consumible"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Unidad</label>
            <AutocompleteInput
              value={unidad}
              onChange={setUnidad}
              opciones={UNIDADES_CONSUMIBLE_FINCA}
              placeholder="unidad, litro…"
              className={inputCls}
              ariaLabel="Unidad"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Cantidad en stock</label>
            <input
              type="number"
              min="0"
              step="any"
              className={`${inputCls} text-right font-mono`}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Stock mínimo</label>
            <input
              type="number"
              min="0"
              step="any"
              className={`${inputCls} text-right font-mono`}
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Ubicación</label>
          <AutocompleteInput
            value={ubicacion}
            onChange={setUbicacion}
            opciones={UBICACIONES_FINCA}
            placeholder="Galpón, Depósito…"
            className={inputCls}
            ariaLabel="Ubicación"
          />
        </div>
      </div>
    </Modal>
  );
}
