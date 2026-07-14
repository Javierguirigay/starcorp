"use client";

/**
 * Módulo Inventario en pestañas: cuatro categorías de equipos + el catálogo de
 * Consumibles. Cada pestaña trae su propio "Registrar / Cargar al inventario".
 * El estado vive en InventarioProvider (montado en el layout).
 */
import { useState } from "react";
import type { CategoriaEquipo } from "@/lib/types";
import { EquiposTab } from "./EquiposTab";
import { ConsumiblesTab } from "./ConsumiblesTab";

type TabInventario = CategoriaEquipo | "consumibles";

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
];

export function InventarioModule() {
  const [tab, setTab] = useState<TabInventario>("petrolero");

  return (
    <>
      <div className="mb-5 inline-flex flex-wrap items-center gap-1 self-start rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={tabCls(tab === key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "consumibles" ? <ConsumiblesTab /> : <EquiposTab categoria={tab} />}
    </>
  );
}
