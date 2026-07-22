"use client";

/**
 * Alta/edición de un consumible del catálogo (con control de existencias).
 * En alta puede avisar el id creado vía `onCreado` (para autoseleccionarlo al
 * vincularlo a un equipo, patrón de ProveedorModal).
 */
import { useState } from "react";
import { Plus } from "lucide-react";
import type { Consumible, TipoConsumible } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { useInventario } from "./InventarioProvider";
import { UbicacionSelect } from "./UbicacionSelect";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

const TIPOS_BASE: TipoConsumible[] = [
  "Aceite",
  "Filtro",
  "Correa",
  "Batería",
  "Refrigerante",
  "Neumático",
];

export function ConsumibleModal({
  consumible,
  onCreado,
  onToast,
  onClose,
}: {
  consumible: Consumible | null;
  onCreado?: (id: number) => void;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const inv = useInventario();

  const [nombre, setNombre] = useState(consumible?.nombre ?? "");
  const [tipo, setTipo] = useState<TipoConsumible>(consumible?.tipo ?? "Filtro");
  // Cuando es un string, el campo Tipo muestra el input para crear un tipo nuevo
  // (mismo patrón que "Nueva categoría" en TransaccionModal). null = select normal.
  const [nuevoTipo, setNuevoTipo] = useState<string | null>(null);

  // Opciones del select: tipos base + los ya usados en el catálogo + el actual.
  const opcionesTipo = Array.from(
    new Set<string>([...TIPOS_BASE, ...inv.consumibles.map((c) => c.tipo), tipo])
  );

  const crearTipoRapido = () => {
    const t = (nuevoTipo ?? "").trim();
    if (!t) return onToast("Indica el nombre del nuevo tipo");
    setTipo(t);
    setNuevoTipo(null);
  };

  const [unidad, setUnidad] = useState(consumible?.unidad ?? "unidad");
  const [cantidad, setCantidad] = useState(consumible ? String(consumible.cantidad) : "0");
  const [stockMinimo, setStockMinimo] = useState(
    consumible ? String(consumible.stockMinimo) : "0"
  );
  const [ubicacion, setUbicacion] = useState(consumible?.ubicacion ?? "Almacén LOTER");

  const guardar = () => {
    const n = nombre.trim();
    const cant = Number(cantidad);
    const min = Number(stockMinimo);
    if (!n) return onToast("Indica el nombre del consumible");
    if (!tipo.trim()) return onToast("Indica el tipo del consumible");
    if (isNaN(cant) || cant < 0) return onToast("Indica una cantidad válida");
    if (isNaN(min) || min < 0) return onToast("Indica un stock mínimo válido");
    const datos = {
      nombre: n,
      tipo,
      unidad: unidad.trim() || "unidad",
      cantidad: cant,
      stockMinimo: min,
      ubicacion: ubicacion.trim(),
    };
    if (consumible) {
      inv.editarConsumible(consumible.id, datos);
      onToast("Consumible actualizado");
    } else {
      const nuevoId = inv.nextConsumibleId;
      inv.crearConsumible(datos);
      onCreado?.(nuevoId);
      onToast("Consumible cargado al inventario");
    }
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={consumible ? "Editar consumible" : "Cargar consumible"}
      subtitle="Repuesto/consumible con control de existencias"
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
          <div className={nuevoTipo === null ? "" : "col-span-2"}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="block text-sm font-600 text-navy-900">Tipo</label>
              {nuevoTipo === null && (
                <button
                  type="button"
                  onClick={() => setNuevoTipo("")}
                  className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
                >
                  <Plus className="h-3.5 w-3.5" /> Nuevo tipo
                </button>
              )}
            </div>
            {nuevoTipo === null ? (
              <select
                className={inputCls}
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoConsumible)}
              >
                {opcionesTipo.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Nombre del nuevo tipo"
                  value={nuevoTipo}
                  onChange={(e) => setNuevoTipo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") crearTipoRapido();
                  }}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={crearTipoRapido}
                  className="whitespace-nowrap rounded-xl bg-navy-900 px-3 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
                >
                  Crear
                </button>
                <button
                  type="button"
                  onClick={() => setNuevoTipo(null)}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Unidad</label>
            <input className={inputCls} value={unidad} onChange={(e) => setUnidad(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Cantidad en stock</label>
            <input
              type="number"
              min="0"
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
              className={`${inputCls} text-right font-mono`}
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Ubicación</label>
          <UbicacionSelect value={ubicacion} onChange={setUbicacion} />
        </div>
      </div>
    </Modal>
  );
}
