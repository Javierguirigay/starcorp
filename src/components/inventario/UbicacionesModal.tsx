"use client";

/**
 * Administración del catálogo de ubicaciones (almacenes/patios/campo): crear,
 * renombrar (cascada sobre consumibles y equipos), activar/desactivar y
 * eliminar (solo si ninguna existencia la usa; si está en uso, desactivar).
 */
import { useState } from "react";
import { Check, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import type { TipoUbicacion, Ubicacion } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { useInventario } from "./InventarioProvider";

// El ancho va aparte: `w-full` se emite después de la escala numérica en el CSS
// de Tailwind, así que al concatenar (`${inputCls} w-32`) ganaba `w-full` y el
// control se comía toda la fila. Los campos de ancho fijo usan `campoBase`.
const campoBase =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";
const inputCls = `w-full ${campoBase}`;

const TIPOS: [TipoUbicacion, string][] = [
  ["almacen", "Almacén"],
  ["patio", "Patio"],
  ["campo", "Campo"],
  ["otro", "Otro"],
];

export const ETIQUETA_TIPO_UBICACION: Record<TipoUbicacion, string> =
  Object.fromEntries(TIPOS) as Record<TipoUbicacion, string>;

export function UbicacionesModal({
  onToast,
  onClose,
}: {
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const inv = useInventario();
  const [edit, setEdit] = useState<{ id: number; nombre: string; tipo: TipoUbicacion } | null>(
    null
  );
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<TipoUbicacion>("almacen");

  const usos = (nombre: string) =>
    inv.consumibles.filter((c) => c.ubicacion === nombre).length +
    inv.equipos.filter((e) => e.ubicacion === nombre).length;

  const nombreDuplicado = (nombre: string, exceptoId?: number) =>
    inv.ubicaciones.some(
      (u) => u.id !== exceptoId && u.nombre.toLowerCase() === nombre.toLowerCase()
    );

  const crear = () => {
    const n = nuevoNombre.trim();
    if (!n) return onToast("Indica el nombre de la ubicación");
    if (nombreDuplicado(n)) return onToast("Ya existe una ubicación con ese nombre");
    inv.crearUbicacion({ nombre: n, tipo: nuevoTipo, activa: true });
    setNuevoNombre("");
    onToast(`Ubicación "${n}" creada`);
  };

  const guardarEdicion = () => {
    if (!edit) return;
    const n = edit.nombre.trim();
    if (!n) return onToast("Indica el nombre de la ubicación");
    if (nombreDuplicado(n, edit.id)) return onToast("Ya existe una ubicación con ese nombre");
    const u = inv.ubicaciones.find((x) => x.id === edit.id);
    if (!u) return;
    inv.editarUbicacion(edit.id, { nombre: n, tipo: edit.tipo, activa: u.activa });
    onToast(
      u.nombre !== n
        ? `Renombrada: consumibles y equipos en "${u.nombre}" pasan a "${n}"`
        : "Ubicación actualizada"
    );
    setEdit(null);
  };

  const alternarActiva = (u: Ubicacion) =>
    inv.editarUbicacion(u.id, { nombre: u.nombre, tipo: u.tipo, activa: !u.activa });

  const eliminar = (u: Ubicacion) => {
    if (usos(u.nombre) > 0)
      return onToast("En uso por consumibles/equipos: desactívala en su lugar");
    if (!confirm(`¿Eliminar la ubicación "${u.nombre}"?`)) return;
    inv.eliminarUbicacion(u.id);
    onToast("Ubicación eliminada");
  };

  return (
    <Modal
      onClose={onClose}
      title="Ubicaciones"
      subtitle="Almacenes y patios donde se guarda el inventario"
      maxWidth="max-w-xl"
      footer={
        <button
          onClick={onClose}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
        >
          Cerrar
        </button>
      }
    >
      <div className="space-y-4">
        {/* Alta rápida */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className={`${inputCls} min-w-0 sm:flex-1`}
            placeholder="Nueva ubicación (ej. Patio Punta de Mata)"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") crear();
            }}
          />
          <select
            className={`${campoBase} w-full shrink-0 sm:w-36`}
            value={nuevoTipo}
            onChange={(e) => setNuevoTipo(e.target.value as TipoUbicacion)}
          >
            {TIPOS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <button
            onClick={crear}
            className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-navy-900 px-3 py-2 text-sm font-600 text-white hover:bg-navy-800 sm:w-auto"
          >
            <Plus className="h-4 w-4" /> Crear
          </button>
        </div>

        {/* Listado */}
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {inv.ubicaciones.map((u) => {
            const enUso = usos(u.nombre);
            return (
              <div key={u.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                {edit?.id === u.id ? (
                  <>
                    <input
                      autoFocus
                      className={`${campoBase} min-w-0 flex-1 basis-48`}
                      value={edit.nombre}
                      onChange={(e) => setEdit({ ...edit, nombre: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") guardarEdicion();
                      }}
                    />
                    <select
                      className={`${campoBase} w-32 shrink-0`}
                      value={edit.tipo}
                      onChange={(e) => setEdit({ ...edit, tipo: e.target.value as TipoUbicacion })}
                    >
                      {TIPOS.map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <button
                      title="Guardar"
                      onClick={guardarEdicion}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      title="Cancelar"
                      onClick={() => setEdit(null)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <MapPin
                      className={`h-4 w-4 shrink-0 ${u.activa ? "text-navy-700" : "text-slate-300"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-600 ${
                          u.activa ? "text-navy-900" : "text-slate-400 line-through"
                        }`}
                      >
                        {u.nombre}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {ETIQUETA_TIPO_UBICACION[u.tipo]}
                        {enUso > 0 ? ` · ${enUso} artículo${enUso === 1 ? "" : "s"}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => alternarActiva(u)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-600 ${
                        u.activa
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {u.activa ? "Activa" : "Inactiva"}
                    </button>
                    <button
                      title="Renombrar (actualiza consumibles y equipos)"
                      onClick={() => setEdit({ id: u.id, nombre: u.nombre, tipo: u.tipo })}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      title={enUso > 0 ? "En uso: desactívala en su lugar" : "Eliminar"}
                      onClick={() => eliminar(u)}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                        enUso > 0
                          ? "cursor-not-allowed text-slate-200"
                          : "text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400">
          Renombrar una ubicación actualiza los consumibles y equipos que la usan; el historial de
          movimientos conserva el nombre vigente al momento de cada registro.
        </p>
      </div>
    </Modal>
  );
}
