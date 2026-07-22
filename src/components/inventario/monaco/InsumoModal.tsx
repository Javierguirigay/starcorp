"use client";

/**
 * Alta/edición de un insumo (ingrediente con control de stock) de MONACO.
 * Categoría/unidad/ubicación son texto libre con sugerencias.
 */
import { useState } from "react";
import type { Insumo } from "@/lib/types";
import {
  CATEGORIAS_INSUMO,
  UBICACIONES_INSUMO,
  UNIDADES_INSUMO,
} from "@/lib/data/monacoInventario";
import { Modal } from "@/components/ui/Modal";
import { AutocompleteInput } from "@/components/ui/AutocompleteInput";

export type InsumoDatos = Omit<Insumo, "id" | "empresaId">;

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function InsumoModal({
  insumo,
  categoriasUsadas,
  onGuardar,
  onToast,
  onClose,
}: {
  insumo: Insumo | null;
  categoriasUsadas: string[];
  onGuardar: (datos: InsumoDatos) => void;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(insumo?.nombre ?? "");
  const [categoria, setCategoria] = useState(insumo?.categoria ?? "");
  const [unidad, setUnidad] = useState(insumo?.unidad ?? "kg");
  const [cantidad, setCantidad] = useState(insumo ? String(insumo.cantidad) : "0");
  const [stockMinimo, setStockMinimo] = useState(insumo ? String(insumo.stockMinimo) : "0");
  const [ubicacion, setUbicacion] = useState(insumo?.ubicacion ?? "Despensa");
  const [costo, setCosto] = useState(insumo?.costoUnitario != null ? String(insumo.costoUnitario) : "");

  const opcionesCategoria = Array.from(new Set([...CATEGORIAS_INSUMO, ...categoriasUsadas]));

  const guardar = () => {
    const n = nombre.trim();
    const cant = Number(cantidad);
    const min = Number(stockMinimo);
    if (!n) return onToast("Indica el nombre del insumo");
    if (!categoria.trim()) return onToast("Indica la categoría");
    if (isNaN(cant) || cant < 0) return onToast("Indica una cantidad válida");
    if (isNaN(min) || min < 0) return onToast("Indica un stock mínimo válido");
    const costoNum = costo.trim() === "" ? undefined : Number(costo);
    if (costoNum != null && (isNaN(costoNum) || costoNum < 0))
      return onToast("Indica un costo unitario válido");
    onGuardar({
      nombre: n,
      categoria: categoria.trim(),
      unidad: unidad.trim() || "unidad",
      cantidad: cant,
      stockMinimo: min,
      ubicacion: ubicacion.trim(),
      ...(costoNum != null ? { costoUnitario: costoNum } : {}),
    });
  };

  return (
    <Modal
      onClose={onClose}
      title={insumo ? "Editar insumo" : "Cargar insumo"}
      subtitle="Ingrediente con control de existencias"
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
            {insumo ? "Guardar cambios" : "Cargar al inventario"}
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
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Categoría</label>
            <AutocompleteInput
              value={categoria}
              onChange={setCategoria}
              opciones={opcionesCategoria}
              placeholder="Carnes, Vegetales…"
              className={inputCls}
              ariaLabel="Categoría del insumo"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Unidad</label>
            <AutocompleteInput
              value={unidad}
              onChange={setUnidad}
              opciones={UNIDADES_INSUMO}
              placeholder="kg, L, unidad…"
              className={inputCls}
              ariaLabel="Unidad de medida"
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Ubicación</label>
            <AutocompleteInput
              value={ubicacion}
              onChange={setUbicacion}
              opciones={UBICACIONES_INSUMO}
              placeholder="Nevera, Despensa…"
              className={inputCls}
              ariaLabel="Ubicación"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">
              Costo unitario <span className="font-400 text-slate-400">(opcional)</span>
            </label>
            <input
              type="number"
              min="0"
              step="any"
              className={`${inputCls} text-right font-mono`}
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
