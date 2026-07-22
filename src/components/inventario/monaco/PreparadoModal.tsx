"use client";

/**
 * Alta/edición de un preparado (receta) de MONACO: nombre, rendimiento por lote
 * y los insumos que consume (con su cantidad). Al "preparar" desde la lista,
 * esos insumos se descuentan del stock según los lotes producidos.
 */
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Insumo, Preparado, RenglonReceta } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";

export type PreparadoDatos = Omit<Preparado, "id" | "empresaId">;

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";
const inputSm =
  "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-100";

interface FilaReceta {
  key: number;
  insumoId: number | "";
  cantidad: string;
}

export function PreparadoModal({
  preparado,
  insumos,
  onGuardar,
  onToast,
  onClose,
}: {
  preparado: Preparado | null;
  insumos: Insumo[];
  onGuardar: (datos: PreparadoDatos) => void;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(preparado?.nombre ?? "");
  const [rendimiento, setRendimiento] = useState(preparado ? String(preparado.rendimiento) : "1");
  const [unidad, setUnidad] = useState(preparado?.unidad ?? "porciones");
  const [filas, setFilas] = useState<FilaReceta[]>(() =>
    preparado && preparado.receta.length
      ? preparado.receta.map((r, i) => ({ key: i + 1, insumoId: r.insumoId, cantidad: String(r.cantidad) }))
      : [{ key: 1, insumoId: "", cantidad: "" }]
  );
  const [nextKey, setNextKey] = useState(
    (preparado?.receta.length ?? 1) + 1
  );

  const insumoDe = (id: number | "") => (id === "" ? undefined : insumos.find((x) => x.id === id));

  const setFila = (key: number, cambios: Partial<FilaReceta>) =>
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambios } : f)));

  const agregarFila = () => {
    setFilas((prev) => [...prev, { key: nextKey, insumoId: "", cantidad: "" }]);
    setNextKey((k) => k + 1);
  };

  const guardar = () => {
    const n = nombre.trim();
    const rend = Number(rendimiento);
    if (!n) return onToast("Indica el nombre del preparado");
    if (isNaN(rend) || rend <= 0) return onToast("Indica un rendimiento válido (mayor que 0)");
    const receta: RenglonReceta[] = [];
    for (const f of filas) {
      if (f.insumoId === "" && f.cantidad.trim() === "") continue; // fila vacía: se ignora
      const cant = Number(f.cantidad);
      if (f.insumoId === "") return onToast("Elige el insumo en cada renglón de la receta");
      if (isNaN(cant) || cant <= 0) return onToast("Indica la cantidad de cada insumo (mayor que 0)");
      receta.push({ insumoId: f.insumoId, cantidad: cant });
    }
    if (!receta.length) return onToast("Agrega al menos un insumo a la receta");
    onGuardar({ nombre: n, rendimiento: rend, unidad: unidad.trim() || "porciones", receta });
  };

  return (
    <Modal
      onClose={onClose}
      title={preparado ? "Editar preparado" : "Nuevo preparado"}
      subtitle="Receta · insumos que consume por lote"
      maxWidth="max-w-2xl"
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
            {preparado ? "Guardar cambios" : "Crear preparado"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Nombre</label>
            <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Rinde (por lote)</label>
            <input
              type="number"
              min="0"
              step="any"
              className={`${inputCls} text-right font-mono`}
              value={rendimiento}
              onChange={(e) => setRendimiento(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Unidad</label>
            <input className={inputCls} value={unidad} onChange={(e) => setUnidad(e.target.value)} />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-600 text-navy-900">Receta (insumos por lote)</label>
            <button
              type="button"
              onClick={agregarFila}
              className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
            >
              <Plus className="h-3.5 w-3.5" /> Añadir insumo
            </button>
          </div>

          {insumos.length === 0 ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
              Aún no hay insumos cargados. Agrega insumos en la pestaña «Insumos» para poder armar recetas.
            </p>
          ) : (
            <div className="space-y-2">
              {filas.map((f) => {
                const ins = insumoDe(f.insumoId);
                return (
                  <div key={f.key} className="flex items-center gap-2">
                    <select
                      value={f.insumoId}
                      onChange={(e) => setFila(f.key, { insumoId: e.target.value === "" ? "" : Number(e.target.value) })}
                      className={`${inputSm} flex-1`}
                    >
                      <option value="">Selecciona insumo…</option>
                      {insumos.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nombre} ({i.unidad})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Cant."
                      value={f.cantidad}
                      onChange={(e) => setFila(f.key, { cantidad: e.target.value })}
                      className={`${inputSm} w-24 text-right font-mono`}
                    />
                    <span className="w-12 text-xs text-slate-400">{ins?.unidad ?? ""}</span>
                    <button
                      type="button"
                      title="Quitar"
                      onClick={() => setFilas((prev) => (prev.length === 1 ? prev : prev.filter((x) => x.key !== f.key)))}
                      disabled={filas.length === 1}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
