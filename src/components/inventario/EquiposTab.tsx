"use client";

/**
 * Pestaña de equipos de una categoría (petrolero/oficina/herramienta/vehículo).
 * Reutilizable: registra equipos, muestra la tabla y permite ver la ficha
 * (detalle con stock de consumibles), editar y eliminar.
 */
import { useEffect, useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import type { CategoriaEquipo, Equipo, EstadoEquipo } from "@/lib/types";
import { CATEGORIAS_EQUIPO } from "@/lib/data/equipos";
import { Toast } from "@/components/ui/Toast";
import { useInventario } from "./InventarioProvider";
import { EquipoModal } from "./EquipoModal";
import { EquipoDetalleModal } from "./EquipoDetalleModal";

const ESTILO_ESTADO: Record<EstadoEquipo, string> = {
  Disponible: "bg-emerald-50 text-emerald-700",
  Asignado: "bg-navy-50 text-navy-700",
  Mantenimiento: "bg-gold-500/15 text-gold-600",
};

type ModalAbierto = { tipo: "editor"; id: number | null } | { tipo: "detalle"; id: number } | null;

export function EquiposTab({ categoria }: { categoria: CategoriaEquipo }) {
  const inv = useInventario();
  const [modal, setModal] = useState<ModalAbierto>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const visibles = inv.equipos.filter((e) => e.categoria === categoria);
  const equipoDe = (id: number) => inv.equipoPorId(id) ?? null;

  const eliminar = (e: Equipo) => {
    if (!confirm(`¿Eliminar el equipo "${e.codigo}"?`)) return;
    inv.eliminarEquipo(e.id);
    setToast("Equipo eliminado");
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-700 text-navy-950">
              {CATEGORIAS_EQUIPO[categoria]}
            </h2>
            <p className="text-xs text-slate-400">
              Registro con ficha técnica y consumibles que usa cada equipo
            </p>
          </div>
          <button
            onClick={() => setModal({ tipo: "editor", id: null })}
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
          >
            <Plus className="h-[18px] w-[18px]" /> Registrar {CATEGORIAS_EQUIPO[categoria].toLowerCase()}
          </button>
        </div>

        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-600">Código / Nombre</th>
                <th className="px-5 py-3 font-600">Ubicación</th>
                <th className="px-5 py-3 font-600">Consumibles</th>
                <th className="px-5 py-3 font-600">Estado</th>
                <th className="px-5 py-3 text-right font-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                    No hay equipos registrados en esta categoría.
                  </td>
                </tr>
              ) : (
                visibles.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-600 text-navy-900">{e.codigo}</td>
                    <td className="px-5 py-3 text-slate-500">{e.ubicacion || "—"}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {e.consumibles?.length ? `${e.consumibles.length} vinculado(s)` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {(() => {
                        const estado = inv.estadoDe(e.codigo);
                        return (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-600 ${ESTILO_ESTADO[estado]}`}
                          >
                            {estado}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Ver detalle"
                          onClick={() => setModal({ tipo: "detalle", id: e.id })}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-navy-50 hover:text-navy-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          title="Editar"
                          onClick={() => setModal({ tipo: "editor", id: e.id })}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="Eliminar"
                          onClick={() => eliminar(e)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal?.tipo === "editor" && (
        <EquipoModal
          key={modal.id ?? "nuevo"}
          equipo={modal.id !== null ? equipoDe(modal.id) : null}
          categoria={categoria}
          onToast={setToast}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === "detalle" &&
        (() => {
          const e = equipoDe(modal.id);
          return e ? <EquipoDetalleModal equipo={e} onClose={() => setModal(null)} /> : null;
        })()}
      {toast && <Toast mensaje={toast} />}
    </>
  );
}
