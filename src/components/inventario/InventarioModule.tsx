"use client";

/**
 * Módulo Inventario en pestañas: cuatro categorías de equipos, el catálogo de
 * Consumibles y el kardex de Movimientos. Cada pestaña trae su propio
 * "Registrar / Cargar al inventario"; el botón "Ubicaciones" administra el
 * catálogo de almacenes/patios. El estado vive en InventarioProvider.
 */
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import type { CategoriaEquipo } from "@/lib/types";
import { Toast } from "@/components/ui/Toast";
import { EquiposTab } from "./EquiposTab";
import { ConsumiblesTab } from "./ConsumiblesTab";
import { MovimientosTab } from "./MovimientosTab";
import { UbicacionesModal } from "./UbicacionesModal";

type TabInventario = CategoriaEquipo | "consumibles" | "movimientos";

const tabCls = (activo: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-600 ${
    activo ? "bg-navy-900 text-white" : "text-slate-500 hover:text-navy-900"
  }`;

const TABS: [TabInventario, string][] = [
  ["petrolero", "Equipos petroleros"],
  ["oficina", "Equipos de Oficina"],
  ["consumibles", "Consumibles"],
  ["herramienta", "Herramientas"],
  ["vehiculo", "Vehículos"],
  ["movimientos", "Movimientos"],
];

export function InventarioModule() {
  const [tab, setTab] = useState<TabInventario>("petrolero");
  const [ubicaciones, setUbicaciones] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={tabCls(tab === key)}>
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setUbicaciones(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-600 text-navy-700 hover:bg-slate-50"
        >
          <MapPin className="h-3.5 w-3.5" /> Ubicaciones
        </button>
      </div>

      {tab === "consumibles" ? (
        <ConsumiblesTab />
      ) : tab === "movimientos" ? (
        <MovimientosTab />
      ) : (
        // key: cada categoría estrena su propio estado (búsqueda, toggle de bajas).
        <EquiposTab key={tab} categoria={tab} />
      )}

      {ubicaciones && <UbicacionesModal onToast={setToast} onClose={() => setUbicaciones(false)} />}
      {toast && <Toast mensaje={toast} />}
    </>
  );
}
