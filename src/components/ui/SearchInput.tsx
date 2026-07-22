"use client";

/**
 * Caja de búsqueda por texto: icono de lupa, input y botón de limpiar cuando
 * hay contenido. Estilo alineado al resto de inputs del sistema (rounded-xl,
 * focus navy). El filtrado lo hace quien la usa.
 */
import { Search, X } from "lucide-react";

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          title="Limpiar búsqueda"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
