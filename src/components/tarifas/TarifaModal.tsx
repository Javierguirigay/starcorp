"use client";

/**
 * Alta/edición de un servicio del catálogo de tarifas. La tarifa es solo
 * REFERENCIAL (USD): sirve como sugerencia al facturar, se puede negociar por
 * cliente. La descripción del servicio es constante.
 */
import { useState } from "react";
import type { CategoriaTarifa, TarifaServicio, UnidadTarifa } from "@/lib/types";
import { CATEGORIAS_TARIFA, UNIDADES_TARIFA } from "@/lib/types";
import { formatNumberVE, parseVES } from "@/lib/format";
import { round2 } from "@/lib/negocio/nomina";
import { Modal } from "@/components/ui/Modal";
import { useFacturacion } from "@/components/facturacion/FacturacionProvider";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function TarifaModal({
  tarifa,
  onToast,
  onClose,
}: {
  tarifa: TarifaServicio | null;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const fac = useFacturacion();

  const [descripcion, setDescripcion] = useState(tarifa?.descripcion ?? "");
  const [categoria, setCategoria] = useState<CategoriaTarifa>(tarifa?.categoria ?? "luminaria");
  const [unidad, setUnidad] = useState<UnidadTarifa>(tarifa?.unidad ?? "dia");
  const [tarifaTexto, setTarifaTexto] = useState(tarifa ? formatNumberVE(tarifa.tarifaRef) : "");
  const [activo, setActivo] = useState(tarifa?.activo ?? true);
  const [notas, setNotas] = useState(tarifa?.notas ?? "");

  const guardar = () => {
    if (!descripcion.trim()) return onToast("Indica la descripción del servicio");
    const monto = round2(parseVES(tarifaTexto));
    if (monto <= 0) return onToast("Indica la tarifa referencial (USD)");
    const datos = {
      descripcion: descripcion.trim(),
      categoria,
      unidad,
      tarifaRef: monto,
      activo,
      ...(notas.trim() ? { notas: notas.trim() } : {}),
    };
    if (tarifa) {
      fac.editarTarifa(tarifa.id, datos);
      onToast("Servicio actualizado");
    } else {
      fac.crearTarifa(datos);
      onToast("Servicio agregado");
    }
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={tarifa ? "Editar servicio" : "Nuevo servicio"}
      subtitle="Descripción constante y tarifa referencial (USD) · negociable por cliente"
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
            {tarifa ? "Guardar cambios" : "Agregar servicio"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-600 text-navy-900">Descripción del servicio</label>
          <textarea
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="SERVICIO DE ALQUILER DE LUMINARIA MARCA COLEMAN TIPO JIRAFA"
            className={`${inputCls} resize-none uppercase`}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-600 text-navy-900">Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaTarifa)}
              className={inputCls}
            >
              {(Object.keys(CATEGORIAS_TARIFA) as CategoriaTarifa[]).map((c) => (
                <option key={c} value={c}>{CATEGORIAS_TARIFA[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-600 text-navy-900">Unidad</label>
            <select
              value={unidad}
              onChange={(e) => setUnidad(e.target.value as UnidadTarifa)}
              className={inputCls}
            >
              {(Object.keys(UNIDADES_TARIFA) as UnidadTarifa[]).map((u) => (
                <option key={u} value={u}>{UNIDADES_TARIFA[u]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-600 text-navy-900">Tarifa ref. (USD)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={tarifaTexto}
              onChange={(e) => setTarifaTexto(e.target.value)}
              className={`${inputCls} text-right font-mono`}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-600 text-navy-900">
            Notas <span className="font-400 text-slate-400">(opcional)</span>
          </label>
          <input
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ida y vuelta · 3 unidades · incluye combustible…"
            className={inputCls}
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-600 text-navy-900">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-navy-700 focus:ring-navy-200"
          />
          Activo <span className="font-400 text-slate-400">(aparece en el selector del reporte de servicio)</span>
        </label>
      </div>
    </Modal>
  );
}
