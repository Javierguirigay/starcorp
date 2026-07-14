"use client";

/**
 * Programar / editar un mantenimiento. El equipo se elige del inventario
 * (select estricto: una orden "En taller" pone el equipo en estado
 * "Mantenimiento" y bloquea su asignación). Al marcar "Completado" se pide la
 * fecha de realización y qué se hizo (observaciones).
 */
import { useState } from "react";
import type { EstadoMantenimiento, RegistroMantenimiento } from "@/lib/types";
import { fmtISO } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { useInventario } from "@/components/inventario/InventarioProvider";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

const ESTADOS: EstadoMantenimiento[] = ["Programado", "Pendiente", "En taller", "Completado"];

export function MantenimientoModal({
  registro,
  onToast,
  onClose,
}: {
  registro: RegistroMantenimiento | null;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const inv = useInventario();

  const [equipo, setEquipo] = useState(registro?.equipo ?? "");
  const [tipo, setTipo] = useState<RegistroMantenimiento["tipo"]>(registro?.tipo ?? "Preventivo");
  const [estado, setEstado] = useState<EstadoMantenimiento>(registro?.estado ?? "Programado");
  const [programado, setProgramado] = useState(registro?.programado ?? fmtISO(new Date()));
  const [realizado, setRealizado] = useState(registro?.realizado ?? "");
  const [tecnico, setTecnico] = useState(registro?.tecnico ?? "Por asignar");
  const [observaciones, setObservaciones] = useState(registro?.observaciones ?? "");

  const esCompletado = estado === "Completado";

  const guardar = () => {
    if (!equipo.trim()) return onToast("Indica el equipo");
    if (!programado) return onToast("Indica la fecha programada");
    if (esCompletado && !realizado) return onToast("Indica la fecha de realización");
    const datos = {
      equipo: equipo.trim(),
      tipo,
      estado,
      programado,
      realizado: esCompletado ? realizado : "",
      tecnico: tecnico.trim() || "Por asignar",
      observaciones: observaciones.trim(),
    };
    if (registro) {
      inv.editarMantenimiento(registro.id, datos);
      onToast("Mantenimiento actualizado");
    } else {
      inv.crearMantenimiento(datos);
      onToast("Mantenimiento programado");
    }
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={registro ? "Editar mantenimiento" : "Programar mantenimiento"}
      subtitle="Correctivo o preventivo por equipo"
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
            {registro ? "Guardar cambios" : "Programar"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Equipo</label>
          <select className={inputCls} value={equipo} onChange={(e) => setEquipo(e.target.value)}>
            <option value="">Selecciona un equipo…</option>
            {/* Registro viejo cuyo equipo ya no está en inventario: se conserva. */}
            {equipo && !inv.equipos.some((e) => e.codigo === equipo) && (
              <option value={equipo}>{equipo} (fuera de inventario)</option>
            )}
            {[...inv.equipos]
              .sort((a, b) => a.codigo.localeCompare(b.codigo, "es"))
              .map((e) => (
                <option key={e.id} value={e.codigo}>
                  {e.codigo}
                </option>
              ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Tipo</label>
            <select
              className={inputCls}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as RegistroMantenimiento["tipo"])}
            >
              <option value="Preventivo">Preventivo</option>
              <option value="Correctivo">Correctivo</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Estado</label>
            <select
              className={inputCls}
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoMantenimiento)}
            >
              {ESTADOS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Fecha programada</label>
            <input
              type="date"
              className={inputCls}
              value={programado}
              onChange={(e) => setProgramado(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">
              Fecha realizada {esCompletado && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="date"
              className={inputCls}
              value={realizado}
              disabled={!esCompletado}
              onChange={(e) => setRealizado(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Técnico</label>
          <input className={inputCls} value={tecnico} onChange={(e) => setTecnico(e.target.value)} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">
            Observaciones {esCompletado && <span className="font-400 text-slate-400">(qué se hizo)</span>}
          </label>
          <textarea
            rows={2}
            className={inputCls}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
