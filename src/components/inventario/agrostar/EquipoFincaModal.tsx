"use client";

/** Alta/edición de un equipo de finca (maquinaria) de AGROSTAR. */
import { useState } from "react";
import type { EquipoFinca } from "@/lib/types";
import {
  CATEGORIAS_EQUIPO_FINCA,
  ESTADOS_EQUIPO_FINCA,
  UBICACIONES_FINCA,
} from "@/lib/data/agrostarInventario";
import { Modal } from "@/components/ui/Modal";
import { AutocompleteInput } from "@/components/ui/AutocompleteInput";

export type EquipoFincaDatos = Omit<EquipoFinca, "id" | "empresaId">;

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function EquipoFincaModal({
  equipo,
  categoriasUsadas,
  onGuardar,
  onToast,
  onClose,
}: {
  equipo: EquipoFinca | null;
  categoriasUsadas: string[];
  onGuardar: (datos: EquipoFincaDatos) => void;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(equipo?.nombre ?? "");
  const [categoria, setCategoria] = useState(equipo?.categoria ?? "");
  const [marca, setMarca] = useState(equipo?.marca ?? "");
  const [modelo, setModelo] = useState(equipo?.modelo ?? "");
  const [serial, setSerial] = useState(equipo?.serial ?? "");
  const [estado, setEstado] = useState(equipo?.estado ?? "Operativo");
  const [ubicacion, setUbicacion] = useState(equipo?.ubicacion ?? "Galpón");
  const [notas, setNotas] = useState(equipo?.notas ?? "");

  const opcionesCategoria = Array.from(new Set([...CATEGORIAS_EQUIPO_FINCA, ...categoriasUsadas]));

  const guardar = () => {
    if (!nombre.trim()) return onToast("Indica el nombre del equipo");
    if (!categoria.trim()) return onToast("Indica la categoría del equipo");
    onGuardar({
      nombre: nombre.trim(),
      categoria: categoria.trim(),
      estado: estado.trim() || "Operativo",
      ...(marca.trim() ? { marca: marca.trim() } : {}),
      ...(modelo.trim() ? { modelo: modelo.trim() } : {}),
      ...(serial.trim() ? { serial: serial.trim() } : {}),
      ...(ubicacion.trim() ? { ubicacion: ubicacion.trim() } : {}),
      ...(notas.trim() ? { notas: notas.trim() } : {}),
    });
  };

  return (
    <Modal
      onClose={onClose}
      title={equipo ? "Editar equipo" : "Cargar equipo de finca"}
      subtitle="Maquinaria / equipo de la finca"
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
            {equipo ? "Guardar cambios" : "Cargar al inventario"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Nombre</label>
            <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Categoría</label>
            <AutocompleteInput
              value={categoria}
              onChange={setCategoria}
              opciones={opcionesCategoria}
              placeholder="Tractor, Implemento…"
              className={inputCls}
              ariaLabel="Categoría del equipo"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Marca</label>
            <input className={inputCls} value={marca} onChange={(e) => setMarca(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Modelo</label>
            <input className={inputCls} value={modelo} onChange={(e) => setModelo(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Serial</label>
            <input className={inputCls} value={serial} onChange={(e) => setSerial(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Estado</label>
            <AutocompleteInput
              value={estado}
              onChange={setEstado}
              opciones={ESTADOS_EQUIPO_FINCA}
              placeholder="Operativo…"
              className={inputCls}
              ariaLabel="Estado del equipo"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Ubicación</label>
            <AutocompleteInput
              value={ubicacion}
              onChange={setUbicacion}
              opciones={UBICACIONES_FINCA}
              placeholder="Galpón, Taller…"
              className={inputCls}
              ariaLabel="Ubicación"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Notas</label>
            <input className={inputCls} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
