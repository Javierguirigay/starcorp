"use client";

/**
 * Input de texto libre con sugerencias del propio sistema. Sustituye al
 * <datalist> nativo, que el navegador pinta con su tema (fondo oscuro,
 * resaltado rojo) y no admite estilos: esta lista usa el mismo aspecto que el
 * resto de desplegables (ver ArticuloCombo).
 *
 * El campo SIEMPRE es escribible: las sugerencias solo evitan que el mismo
 * cliente/proyecto se escriba de tres formas distintas, no restringen el valor.
 */
import { useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { normalizarTexto } from "@/lib/format";

/** Tope de sugerencias visibles: la lista no debe tapar el formulario. */
const MAX_OPCIONES = 8;

export function AutocompleteInput({
  id,
  value,
  onChange,
  opciones,
  placeholder,
  className = "",
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  opciones: string[];
  placeholder?: string;
  /** Clases del input (ancho, realce de error…). */
  className?: string;
  ariaLabel?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaId = useId();

  const filtradas = useMemo(() => {
    const q = normalizarTexto(value.trim());
    // Un valor ya elegido no debe filtrar la lista a sí mismo: sin coincidencias
    // parciales distintas, se ofrece el catálogo completo.
    const base = q ? opciones.filter((o) => normalizarTexto(o).includes(q)) : opciones;
    const utiles = base.filter((o) => o !== value);
    return utiles.slice(0, MAX_OPCIONES);
  }, [opciones, value]);

  const elegir = (v: string) => {
    onChange(v);
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
      // Enter con la lista abierta elige; con la lista cerrada no interfiere
      // con el envío del formulario.
      e.preventDefault();
      elegir(filtradas[activo]);
    }
  };

  const hayLista = abierto && filtradas.length > 0;

  return (
    <div className="relative">
      <input
        id={id}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={hayLista}
        aria-controls={listaId}
        aria-activedescendant={hayLista ? `${listaId}-${activo}` : undefined}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setAbierto(true);
          setActivo(0);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={teclado}
        className={`${className} pr-9`}
      />
      {opciones.length > 0 && (
        <button
          type="button"
          tabIndex={-1}
          title="Ver sugerencias"
          // El mousedown roba el foco y dispararía el blur antes del click:
          // se cancela para que el toggle llegue siempre.
          onMouseDown={(e) => {
            e.preventDefault();
            setAbierto((a) => !a);
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${hayLista ? "rotate-180" : ""}`} />
        </button>
      )}

      {hayLista && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtradas.map((o, i) => (
            <li key={o} id={`${listaId}-${i}`} role="option" aria-selected={i === activo}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(o)}
                onMouseEnter={() => setActivo(i)}
                className={`block w-full px-3 py-1.5 text-left text-sm ${
                  i === activo ? "bg-navy-50 text-navy-900" : "text-navy-800"
                }`}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
