"use client";

/**
 * Alta/edición de un equipo con ficha técnica por categoría. Para petroleros y
 * vehículos incluye "motor" y la sección de consumibles/repuestos que usa
 * (cada fila: rol + consumible del catálogo, con creación inline). Para oficina
 * y herramientas muestra "garantía". Marca/modelo/serial y notas en todas.
 */
import { useState } from "react";
import { List, Plus, X } from "lucide-react";
import type { CategoriaEquipo, EquipoConsumible, FichaEquipo, Equipo } from "@/lib/types";
import { CATEGORIAS_EQUIPO } from "@/lib/data/equipos";
import { Modal } from "@/components/ui/Modal";
import { useInventario } from "./InventarioProvider";
import { ConsumibleModal } from "./ConsumibleModal";
import { UbicacionSelect } from "./UbicacionSelect";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

const ROLES_SUGERIDOS = [
  "Aceite",
  "Filtro de aceite",
  "Filtro de combustible",
  "Filtro de aire",
  "Correa",
  "Batería",
  "Refrigerante",
  "Neumáticos",
];

type Fila = { rol: string; consumibleId: number | ""; nuevoRol?: boolean };

export function EquipoModal({
  equipo,
  categoria,
  onToast,
  onClose,
}: {
  equipo: Equipo | null;
  categoria: CategoriaEquipo;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const inv = useInventario();
  const esMecanico = categoria === "petrolero" || categoria === "vehiculo";

  const [codigo, setCodigo] = useState(equipo?.codigo ?? "");
  const [ubicacion, setUbicacion] = useState(equipo?.ubicacion ?? "Patio LOTER");
  const [marca, setMarca] = useState(equipo?.ficha?.marca ?? "");
  const [modelo, setModelo] = useState(equipo?.ficha?.modelo ?? "");
  const [serial, setSerial] = useState(equipo?.ficha?.serial ?? "");
  const [motor, setMotor] = useState(equipo?.ficha?.motor ?? "");
  const [garantia, setGarantia] = useState(equipo?.ficha?.garantia ?? "");
  const [notas, setNotas] = useState(equipo?.ficha?.notas ?? "");
  const [filas, setFilas] = useState<Fila[]>(
    equipo?.consumibles?.map((c) => ({ rol: c.rol, consumibleId: c.consumibleId })) ?? []
  );
  const [modalConsumible, setModalConsumible] = useState(false);

  const catalogo = [...inv.consumibles].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  // Roles sugeridos + los ya escritos en las filas, para que un rol propio ya
  // guardado aparezca como opción normal del desplegable.
  const opcionesRol = Array.from(
    new Set<string>([...ROLES_SUGERIDOS, ...filas.map((f) => f.rol).filter(Boolean)])
  );

  const actualizarFila = (i: number, patch: Partial<Fila>) =>
    setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const agregarFila = () => setFilas((fs) => [...fs, { rol: "", consumibleId: "" }]);
  const quitarFila = (i: number) => setFilas((fs) => fs.filter((_, j) => j !== i));

  const guardar = () => {
    if (!codigo.trim()) return onToast("Indica el nombre / código del equipo");

    const fichaEntradas: FichaEquipo = {
      ...(marca.trim() ? { marca: marca.trim() } : {}),
      ...(modelo.trim() ? { modelo: modelo.trim() } : {}),
      ...(serial.trim() ? { serial: serial.trim() } : {}),
      ...(esMecanico && motor.trim() ? { motor: motor.trim() } : {}),
      ...(!esMecanico && garantia.trim() ? { garantia: garantia.trim() } : {}),
      ...(notas.trim() ? { notas: notas.trim() } : {}),
    };
    const consumibles: EquipoConsumible[] = filas
      .filter((f) => f.consumibleId !== "")
      .map((f) => ({ rol: f.rol.trim() || "Consumible", consumibleId: f.consumibleId as number }));

    const datos = {
      codigo: codigo.trim(),
      categoria,
      ubicacion: ubicacion.trim(),
      ...(Object.keys(fichaEntradas).length ? { ficha: fichaEntradas } : {}),
      ...(consumibles.length ? { consumibles } : {}),
    };
    if (equipo) {
      inv.editarEquipo(equipo.id, datos);
      onToast("Equipo actualizado");
    } else {
      inv.crearEquipo(datos);
      onToast("Equipo registrado");
    }
    onClose();
  };

  return (
    <>
      <Modal
        onClose={onClose}
        title={equipo ? "Editar equipo" : `Registrar ${CATEGORIAS_EQUIPO[categoria].toLowerCase()}`}
        subtitle="Datos del equipo y ficha técnica"
        maxWidth="max-w-2xl"
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
              {equipo ? "Guardar cambios" : "Registrar equipo"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Identificación */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Nombre / código</label>
              <input className={inputCls} value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej: Chuto" />
            </div>
            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Ubicación</label>
              <UbicacionSelect value={ubicacion} onChange={setUbicacion} />
            </div>
          </div>

          {/* Ficha técnica */}
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-xs font-600 uppercase tracking-wide text-slate-400">Ficha técnica</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-600 text-navy-900">Marca</label>
                <input className={inputCls} value={marca} onChange={(e) => setMarca(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-600 text-navy-900">Modelo</label>
                <input className={inputCls} value={modelo} onChange={(e) => setModelo(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-600 text-navy-900">Serial</label>
                <input className={inputCls} value={serial} onChange={(e) => setSerial(e.target.value)} />
              </div>
              {esMecanico ? (
                <div className="sm:col-span-3">
                  <label className="mb-1.5 block text-sm font-600 text-navy-900">Motor</label>
                  <input className={inputCls} value={motor} onChange={(e) => setMotor(e.target.value)} placeholder="Ej: Cummins 6BT" />
                </div>
              ) : (
                <div className="sm:col-span-3">
                  <label className="mb-1.5 block text-sm font-600 text-navy-900">Garantía</label>
                  <input className={inputCls} value={garantia} onChange={(e) => setGarantia(e.target.value)} placeholder="Ej: 12 meses / vence 03-2027" />
                </div>
              )}
              <div className="sm:col-span-3">
                <label className="mb-1.5 block text-sm font-600 text-navy-900">Notas</label>
                <textarea rows={2} className={inputCls} value={notas} onChange={(e) => setNotas(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Consumibles que usa (petrolero/vehículo) */}
          {esMecanico && (
            <div className="border-t border-slate-100 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-600 uppercase tracking-wide text-slate-400">
                  Consumibles / repuestos que usa
                </p>
                <button
                  onClick={() => setModalConsumible(true)}
                  className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
                >
                  <Plus className="h-3.5 w-3.5" /> Nuevo consumible
                </button>
              </div>
              <div className="space-y-2">
                {filas.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {f.nuevoRol ? (
                      <div className="flex w-40 items-center gap-1">
                        <input
                          autoFocus
                          value={f.rol}
                          onChange={(e) => actualizarFila(i, { rol: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") actualizarFila(i, { nuevoRol: false });
                          }}
                          placeholder="Nuevo rol"
                          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                        />
                        <button
                          type="button"
                          onClick={() => actualizarFila(i, { nuevoRol: false })}
                          title="Elegir de la lista"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                        >
                          <List className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <select
                        value={f.rol}
                        onChange={(e) =>
                          e.target.value === "__nuevo__"
                            ? actualizarFila(i, { nuevoRol: true, rol: "" })
                            : actualizarFila(i, { rol: e.target.value })
                        }
                        className="w-40 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                      >
                        <option value="">Rol…</option>
                        {opcionesRol.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                        <option value="__nuevo__">+ Nuevo rol…</option>
                      </select>
                    )}
                    <select
                      value={f.consumibleId}
                      onChange={(e) =>
                        actualizarFila(i, {
                          consumibleId: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                    >
                      <option value="">Selecciona consumible…</option>
                      {catalogo.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} ({c.tipo})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => quitarFila(i)}
                      title="Quitar"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={agregarFila}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-600 text-navy-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar consumible
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {modalConsumible && (
        <ConsumibleModal
          consumible={null}
          onCreado={(id) => setFilas((fs) => [...fs, { rol: "", consumibleId: id }])}
          onToast={onToast}
          onClose={() => setModalConsumible(false)}
        />
      )}
    </>
  );
}
