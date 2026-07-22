"use client";

/**
 * Buscador de artículo para los renglones de órdenes y materiales: se escribe
 * el nombre y se filtran las coincidencias del catálogo.
 *
 * El campo es SIEMPRE escribible: lo que no coincide con el inventario queda
 * como texto libre (una orden de compra pide cosas que aún no están en el
 * sistema). Elegir una sugerencia lo vincula al inventario; a partir de ahí el
 * texto lo manda el catálogo y se muestra el botón (x) para desvincular.
 */
import { useMemo, useRef, useState } from "react";
import { Link2, X } from "lucide-react";
import { normalizarTexto } from "@/lib/format";

export type OpcionArticulo = {
  /** Identificador que entiende el consumidor (ej. "c:3", "e:7"). */
  valor: string;
  etiqueta: string;
  /** Texto secundario (stock, ubicación…). */
  detalle?: string;
  grupo: string;
};

/** Tope POR GRUPO: un catálogo largo de consumibles no debe tapar los equipos. */
const MAX_POR_GRUPO = 6;

export function ArticuloCombo({
  value,
  vinculado,
  opciones,
  onTexto,
  onElegir,
  onDesvincular,
  placeholder = "Escribe o busca en el inventario",
  className = "",
}: {
  value: string;
  vinculado: boolean;
  opciones: OpcionArticulo[];
  onTexto: (texto: string) => void;
  onElegir: (valor: string) => void;
  onDesvincular: () => void;
  placeholder?: string;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtradas = useMemo(() => {
    const q = normalizarTexto(value.trim());
    // Sin texto se muestra el catálogo entero (recortado): así el campo sigue
    // sirviendo de "menú" para quien no sabe qué escribir.
    const base = q ? opciones.filter((o) => normalizarTexto(o.etiqueta).includes(q)) : opciones;
    const porGrupo = new Map<string, number>();
    const recortadas = base.filter((o) => {
      const n = (porGrupo.get(o.grupo) ?? 0) + 1;
      porGrupo.set(o.grupo, n);
      return n <= MAX_POR_GRUPO;
    });
    // El encabezado de grupo se resuelve aquí (no mutando durante el render).
    return recortadas.map((o, i) => ({
      ...o,
      encabezado: i === 0 || o.grupo !== recortadas[i - 1].grupo ? o.grupo : null,
    }));
  }, [opciones, value]);

  const elegir = (valor: string) => {
    onElegir(valor);
    setAbierto(false);
  };

  const teclado = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return setAbierto(false);
    if (!filtradas.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAbierto(true);
      setActivo((i) => (i + 1) % filtradas.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => (i - 1 + filtradas.length) % filtradas.length);
    } else if (e.key === "Enter" && abierto) {
      e.preventDefault();
      elegir(filtradas[activo].valor);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          readOnly={vinculado}
          title={
            vinculado ? "Vinculado al inventario · usa (x) para escribir libremente" : undefined
          }
          onChange={(e) => {
            onTexto(e.target.value);
            setAbierto(true);
            setActivo(0);
          }}
          onFocus={() => !vinculado && setAbierto(true)}
          onBlur={() => setAbierto(false)}
          onKeyDown={teclado}
          className={`w-full rounded-xl border border-slate-300 px-3 py-2 pr-8 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100 ${
            vinculado ? "bg-slate-50 text-slate-600" : "bg-white"
          }`}
        />
        {vinculado ? (
          <button
            type="button"
            title="Desvincular del inventario y escribir libremente"
            onClick={() => {
              onDesvincular();
              inputRef.current?.focus();
            }}
            className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-navy-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <Link2 className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-300" />
        )}
      </div>

      {abierto && !vinculado && filtradas.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full min-w-[15rem] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {filtradas.map((o, i) => (
            <li key={o.valor}>
              {o.encabezado && (
                <p className="px-3 pb-0.5 pt-1.5 text-[10px] font-600 uppercase tracking-wide text-slate-400">
                  {o.encabezado}
                </p>
              )}
              <button
                type="button"
                // El mousedown roba el foco y dispararía el blur antes del
                // click: se cancela para que la selección llegue siempre.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(o.valor)}
                onMouseEnter={() => setActivo(i)}
                className={`block w-full px-3 py-1.5 text-left text-sm ${
                  i === activo ? "bg-navy-50 text-navy-900" : "text-navy-800"
                }`}
              >
                {o.etiqueta}
                {o.detalle && <span className="ml-1 text-xs text-slate-400">· {o.detalle}</span>}
              </button>
            </li>
          ))}
          <li className="border-t border-slate-100 px-3 pb-0.5 pt-1.5 text-[10px] text-slate-400">
            Si no está en la lista, deja el texto tal cual: va como texto libre.
          </li>
        </ul>
      )}
    </div>
  );
}
