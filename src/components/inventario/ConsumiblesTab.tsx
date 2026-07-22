"use client";

/**
 * Pestaña Consumibles: catálogo de repuestos/consumibles con control de
 * existencias y aviso de bajo stock. "Cargar al inventario" da de alta o (por
 * edición) ajusta las cantidades.
 */
import { useEffect, useState } from "react";
import { ArrowDownToLine, PackagePlus, Pencil, Trash2 } from "lucide-react";
import type { Consumible } from "@/lib/types";
import {
  estadoStock,
  filtrarConsumibles,
  ETIQUETA_STOCK,
  type EstadoStock,
} from "@/lib/negocio/inventario";
import { Toast } from "@/components/ui/Toast";
import { SearchInput } from "@/components/ui/SearchInput";
import { useInventario } from "./InventarioProvider";
import { ConsumibleModal } from "./ConsumibleModal";
import { EntradaStockModal } from "./EntradaStockModal";

const BADGE_STOCK: Record<EstadoStock, string> = {
  ok: "bg-emerald-50 text-emerald-700",
  bajo: "bg-amber-50 text-amber-700",
  agotado: "bg-rose-50 text-rose-700",
};

export function ConsumiblesTab() {
  const inv = useInventario();
  const [modal, setModal] = useState<{ id: number | null } | null>(null);
  const [entrada, setEntrada] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const ordenados = [...inv.consumibles].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const consumibles = filtrarConsumibles(ordenados, busqueda);

  const eliminar = (c: Consumible) => {
    if (!confirm(`¿Eliminar el consumible "${c.nombre}"? Se quitará de los equipos que lo usan.`))
      return;
    inv.eliminarConsumible(c.id);
    setToast("Consumible eliminado");
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-700 text-navy-950">Consumibles</h2>
            <p className="text-xs text-slate-400">
              Repuestos y consumibles con control de existencias
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={busqueda}
              onChange={setBusqueda}
              placeholder="Nombre, tipo, ubicación…"
              className="w-full sm:w-56"
            />
            <button
              onClick={() => setEntrada(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50"
            >
              <ArrowDownToLine className="h-[18px] w-[18px]" /> Registrar entrada
            </button>
            <button
              onClick={() => setModal({ id: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
            >
              <PackagePlus className="h-[18px] w-[18px]" /> Cargar al inventario
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-600">Nombre</th>
                <th className="px-5 py-3 font-600">Tipo</th>
                <th className="px-5 py-3 font-600">Ubicación</th>
                <th className="px-5 py-3 text-right font-600">Stock</th>
                <th className="px-5 py-3 text-right font-600">Mínimo</th>
                <th className="px-5 py-3 font-600">Estado</th>
                <th className="px-5 py-3 text-right font-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {consumibles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                    {ordenados.length === 0
                      ? "No hay consumibles cargados."
                      : "Ningún consumible coincide con la búsqueda."}
                  </td>
                </tr>
              ) : (
                consumibles.map((c) => {
                  const est = estadoStock(c);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-600 text-navy-900">{c.nombre}</td>
                      <td className="px-5 py-3 text-slate-500">{c.tipo}</td>
                      <td className="px-5 py-3 text-slate-500">{c.ubicacion || "—"}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-mono text-navy-900">
                        {c.cantidad} {c.unidad}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-slate-500">
                        {c.stockMinimo}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-600 ${BADGE_STOCK[est]}`}
                        >
                          {ETIQUETA_STOCK[est]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Editar / cargar stock"
                            onClick={() => setModal({ id: c.id })}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            title="Eliminar"
                            onClick={() => eliminar(c)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal && (
        <ConsumibleModal
          key={modal.id ?? "nuevo"}
          consumible={modal.id !== null ? inv.consumiblePorId(modal.id) ?? null : null}
          onToast={setToast}
          onClose={() => setModal(null)}
        />
      )}
      {entrada && <EntradaStockModal onToast={setToast} onClose={() => setEntrada(false)} />}
      {toast && <Toast mensaje={toast} />}
    </>
  );
}
