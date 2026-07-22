"use client";

/**
 * Alta/edición de un semoviente (animal del hato de AGROSTAR). Categoría y
 * estatus son texto libre con sugerencias (AutocompleteInput): el hato real
 * usa muchas variantes y no conviene restringirlas con un <select>.
 */
import { useState } from "react";
import type { Semoviente } from "@/lib/types";
import { CATEGORIAS_SEMOVIENTE, ESTATUS_SEMOVIENTE } from "@/lib/data/semovientes";
import { Modal } from "@/components/ui/Modal";
import { AutocompleteInput } from "@/components/ui/AutocompleteInput";

export type SemovienteDatos = Omit<Semoviente, "id" | "empresaId">;

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function SemovienteModal({
  semoviente,
  categoriasUsadas,
  onGuardar,
  onToast,
  onClose,
}: {
  semoviente: Semoviente | null;
  /** Categorías ya presentes en el hato, para enriquecer las sugerencias. */
  categoriasUsadas: string[];
  onGuardar: (datos: SemovienteDatos) => void;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const [numero, setNumero] = useState(semoviente?.numero ?? "");
  const [categoria, setCategoria] = useState(semoviente?.categoria ?? "");
  const [nombre, setNombre] = useState(semoviente?.nombre ?? "");
  const [estatus, setEstatus] = useState(semoviente?.estatus ?? "");
  const [fecha, setFecha] = useState(semoviente?.fecha ?? "");
  const [parentesco, setParentesco] = useState(semoviente?.parentesco ?? "");
  const [notas, setNotas] = useState(semoviente?.notas ?? "");

  const opcionesCategoria = Array.from(new Set([...CATEGORIAS_SEMOVIENTE, ...categoriasUsadas]));

  const guardar = () => {
    if (!categoria.trim()) return onToast("Indica la categoría del animal");
    if (!nombre.trim() && !numero.trim())
      return onToast("Indica el nombre o el número/arete del animal");
    onGuardar({
      numero: numero.trim() || "S/N",
      categoria: categoria.trim(),
      nombre: nombre.trim(),
      estatus: estatus.trim(),
      ...(fecha ? { fecha } : {}),
      ...(parentesco.trim() ? { parentesco: parentesco.trim() } : {}),
      ...(notas.trim() ? { notas: notas.trim() } : {}),
    });
  };

  return (
    <Modal
      onClose={onClose}
      title={semoviente ? "Editar semoviente" : "Registrar semoviente"}
      subtitle="Ficha del animal · hato de AGROSTAR"
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
          >
            {semoviente ? "Guardar cambios" : "Registrar"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">N° / Arete</label>
            <input
              className={inputCls}
              value={numero}
              placeholder="S/N"
              onChange={(e) => setNumero(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Categoría</label>
            <AutocompleteInput
              value={categoria}
              onChange={setCategoria}
              opciones={opcionesCategoria}
              placeholder="Vaca, Novilla, Toro…"
              className={inputCls}
              ariaLabel="Categoría del animal"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Nombre</label>
          <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Estatus</label>
            <AutocompleteInput
              value={estatus}
              onChange={setEstatus}
              opciones={ESTATUS_SEMOVIENTE}
              placeholder="Preñada, Parida…"
              className={inputCls}
              ariaLabel="Estatus del animal"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Fecha / Observación</label>
            <input
              type="date"
              className={inputCls}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Parentesco</label>
          <input
            className={inputCls}
            value={parentesco}
            placeholder="Hija de Caramelo"
            onChange={(e) => setParentesco(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Notas</label>
          <input className={inputCls} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
