"use client";

/**
 * Selector de ubicación del catálogo (solo activas + la actual aunque esté
 * inactiva). Con `permitirLibre`, la opción "Otra…" despliega un input de
 * texto libre (ej. pozos de cliente que no pertenecen al catálogo).
 */
import { useState } from "react";
import { List } from "lucide-react";
import { useInventario } from "./InventarioProvider";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function UbicacionSelect({
  value,
  onChange,
  permitirLibre = false,
}: {
  value: string;
  onChange: (v: string) => void;
  permitirLibre?: boolean;
}) {
  const inv = useInventario();
  const nombres = inv.ubicaciones.filter((u) => u.activa).map((u) => u.nombre);
  // La ubicación actual se conserva como opción aunque esté inactiva o ya no
  // exista en el catálogo (datos históricos).
  const opciones = value && !nombres.includes(value) ? [value, ...nombres] : nombres;
  const [libre, setLibre] = useState(false);

  if (libre)
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          className={inputCls}
          value={value}
          placeholder="Escribe la ubicación"
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          title="Elegir del catálogo"
          onClick={() => setLibre(false)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-300 text-slate-400 hover:bg-slate-50 hover:text-navy-700"
        >
          <List className="h-4 w-4" />
        </button>
      </div>
    );

  return (
    <select
      className={inputCls}
      value={value}
      onChange={(e) => {
        if (e.target.value === "__otra__") {
          setLibre(true);
          onChange("");
        } else onChange(e.target.value);
      }}
    >
      {!value && <option value="">Selecciona ubicación…</option>}
      {opciones.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
      {permitirLibre && <option value="__otra__">Otra…</option>}
    </select>
  );
}
