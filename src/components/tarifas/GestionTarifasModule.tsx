"use client";

/**
 * Gestión de Tarifas: catálogo de servicios con su tarifa REFERENCIAL (USD).
 * La tarifa es negociable por cliente; la descripción del servicio es constante.
 * Alimenta el selector de "Equipo / concepto" del reporte de servicio.
 */
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import type { CategoriaTarifa, TarifaServicio } from "@/lib/types";
import { CATEGORIAS_TARIFA, UNIDADES_TARIFA } from "@/lib/types";
import { money } from "@/lib/format";
import { Toast } from "@/components/ui/Toast";
import { useFacturacion } from "@/components/facturacion/FacturacionProvider";
import { TarifaModal } from "./TarifaModal";

type Modal = { id: number | null } | null;
type FiltroCategoria = CategoriaTarifa | "todas";

const CATEGORIA_BADGE: Record<CategoriaTarifa, string> = {
  luminaria: "bg-amber-50 text-amber-700",
  generador: "bg-navy-50 text-navy-700",
  traslado: "bg-emerald-50 text-emerald-700",
  otro: "bg-slate-100 text-slate-600",
};

export function GestionTarifasModule() {
  const fac = useFacturacion();
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<FiltroCategoria>("todas");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return fac.tarifas
      .filter((t) => (categoria === "todas" ? true : t.categoria === categoria))
      .filter((t) => (q ? t.descripcion.toLowerCase().includes(q) : true))
      .slice()
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es"));
  }, [fac.tarifas, busqueda, categoria]);

  const tarifaDe = (id: number) => fac.tarifas.find((t) => t.id === id);

  const eliminar = (t: TarifaServicio) => {
    if (!confirm(`¿Eliminar el servicio "${t.descripcion}"?`)) return;
    fac.eliminarTarifa(t.id);
    setToast("Servicio eliminado");
  };

  const alternarActivo = (t: TarifaServicio) => {
    const { id, ...datos } = t;
    void id;
    fac.editarTarifa(t.id, { ...datos, activo: !t.activo });
    setToast(t.activo ? "Servicio marcado inactivo" : "Servicio activado");
  };

  const selectCls =
    "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-700 text-navy-950">Catálogo de Servicios</h2>
            <p className="text-xs text-slate-400">
              Tarifas referenciales (USD) por servicio · negociables por cliente
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar servicio…"
              className={selectCls}
            />
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as FiltroCategoria)}
              className={selectCls}
            >
              <option value="todas">Todas las categorías</option>
              {(Object.keys(CATEGORIAS_TARIFA) as CategoriaTarifa[]).map((c) => (
                <option key={c} value={c}>{CATEGORIAS_TARIFA[c]}</option>
              ))}
            </select>
            <button
              onClick={() => setModal({ id: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
            >
              <Plus className="h-[18px] w-[18px]" /> Agregar servicio
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-600">Servicio</th>
                <th className="px-4 py-3 font-600">Categoría</th>
                <th className="px-4 py-3 font-600">Unidad</th>
                <th className="px-4 py-3 text-right font-600">Tarifa ref.</th>
                <th className="px-4 py-3 font-600">Estado</th>
                <th className="px-4 py-3 font-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    No hay servicios que coincidan. Agrega uno con el botón “Agregar servicio”.
                  </td>
                </tr>
              ) : (
                filas.map((t) => (
                  <tr key={t.id} className={`hover:bg-slate-50/60 ${t.activo ? "" : "opacity-60"}`}>
                    <td className="px-4 py-3 text-navy-900">
                      <span className="font-600">{t.descripcion}</span>
                      {t.notas && <span className="block text-xs text-slate-400">{t.notas}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-600 ${CATEGORIA_BADGE[t.categoria]}`}>
                        {CATEGORIAS_TARIFA[t.categoria]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {UNIDADES_TARIFA[t.unidad]}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-600 text-navy-950">
                      {money(t.tarifaRef)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => alternarActivo(t)}
                        title="Activar / desactivar"
                        className={`rounded-full px-2 py-0.5 text-[10px] font-600 ${
                          t.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {t.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Editar"
                          onClick={() => setModal({ id: t.id })}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="Eliminar"
                          onClick={() => eliminar(t)}
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

        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
          <Tags className="h-3.5 w-3.5" />
          {fac.tarifas.length} servicio(s) en el catálogo · {fac.tarifas.filter((t) => t.activo).length} activo(s)
        </div>
      </section>

      {modal && (
        <TarifaModal
          key={modal.id ?? "nuevo"}
          tarifa={modal.id !== null ? tarifaDe(modal.id) ?? null : null}
          onToast={setToast}
          onClose={() => setModal(null)}
        />
      )}
      {toast && <Toast mensaje={toast} />}
    </>
  );
}
