"use client";

/**
 * CRUD en memoria de las categorías financieras de una empresa.
 * Las protegidas (de sistema: Nómina, Transferencias del Grupo) no se editan
 * ni eliminan; las que tienen transacciones asociadas solo se pueden
 * renombrar (no cambiar de flujo) y tampoco se eliminan.
 */
import { useState } from "react";
import { Check, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import type { CategoriaFinanciera, Empresa, TipoTransaccion } from "@/lib/types";
import { puedeEliminarCategoria } from "@/lib/negocio/finanzas";
import { Modal } from "@/components/ui/Modal";
import { useFinanzas } from "./FinanzasProvider";
import { BadgeTipoCategoria } from "./badges";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function CategoriasModal({
  empresa,
  onToast,
  onClose,
}: {
  empresa: Empresa;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const finanzas = useFinanzas();
  const categorias = finanzas.categoriasDe(empresa.key);
  const transacciones = finanzas.transaccionesDe(empresa.key);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTipo, setEditTipo] = useState<TipoTransaccion>("salida");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<TipoTransaccion>("salida");

  const usos = (id: number) => transacciones.filter((t) => t.categoriaId === id).length;

  const empezarEdicion = (c: CategoriaFinanciera) => {
    setEditandoId(c.id);
    setEditNombre(c.nombre);
    setEditTipo(c.tipo === "ambas" ? "salida" : c.tipo);
  };

  const guardarEdicion = () => {
    if (!editNombre.trim()) {
      onToast("Indica el nombre de la categoría");
      return;
    }
    if (editandoId === null) return;
    finanzas.editarCategoria(editandoId, editNombre.trim(), editTipo);
    setEditandoId(null);
    onToast("Categoría actualizada");
  };

  const eliminar = (c: CategoriaFinanciera) => {
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;
    finanzas.eliminarCategoria(c.id);
    onToast("Categoría eliminada");
  };

  const crear = () => {
    if (!nuevoNombre.trim()) {
      onToast("Indica el nombre de la nueva categoría");
      return;
    }
    finanzas.crearCategoria(empresa.key, nuevoNombre.trim(), nuevoTipo);
    setNuevoNombre("");
    onToast("Categoría creada");
  };

  return (
    <Modal
      onClose={onClose}
      title="Categorías financieras"
      subtitle={`${empresa.nombre} · organizan las entradas y salidas`}
      maxWidth="max-w-2xl"
      footer={
        <button
          onClick={onClose}
          className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
        >
          Cerrar
        </button>
      }
    >
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
        {categorias.map((c) => {
          const enUso = usos(c.id);
          const eliminable = puedeEliminarCategoria(c, transacciones);
          return (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              {editandoId === c.id ? (
                <>
                  <input
                    type="text"
                    autoFocus
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") guardarEdicion();
                    }}
                    className={inputCls}
                  />
                  <select
                    value={editTipo}
                    onChange={(e) => setEditTipo(e.target.value as TipoTransaccion)}
                    disabled={enUso > 0}
                    title={
                      enUso > 0
                        ? "Con transacciones asociadas solo se puede renombrar"
                        : undefined
                    }
                    className={`${inputCls} w-32 disabled:bg-slate-50 disabled:text-slate-400`}
                  >
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                  </select>
                  <button
                    title="Guardar"
                    onClick={guardarEdicion}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    title="Cancelar"
                    onClick={() => setEditandoId(null)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate font-600 text-navy-900">
                      {c.nombre}
                      {c.protegida && (
                        <Lock
                          className="h-3.5 w-3.5 shrink-0 text-slate-300"
                          aria-label="Categoría de sistema"
                        />
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {enUso === 0
                        ? "Sin movimientos"
                        : `${enUso} movimiento${enUso === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <BadgeTipoCategoria tipo={c.tipo} />
                  <button
                    title={
                      c.protegida
                        ? "Categoría de sistema: no se puede editar"
                        : "Editar"
                    }
                    disabled={c.protegida}
                    onClick={() => empezarEdicion(c)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    title={eliminable.ok ? "Eliminar" : eliminable.motivo}
                    disabled={!eliminable.ok}
                    onClick={() => eliminar(c)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {/* Alta */}
      <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4">
        <p className="mb-2 text-[11px] font-600 uppercase tracking-wide text-slate-400">
          Añadir categoría
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nombre de la categoría"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") crear();
            }}
            className={inputCls}
          />
          <select
            value={nuevoTipo}
            onChange={(e) => setNuevoTipo(e.target.value as TipoTransaccion)}
            className={`${inputCls} w-32`}
          >
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
          <button
            onClick={crear}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-navy-900 px-3 py-2 text-sm font-600 text-white hover:bg-navy-800"
          >
            <Plus className="h-4 w-4" /> Añadir
          </button>
        </div>
      </div>
    </Modal>
  );
}
