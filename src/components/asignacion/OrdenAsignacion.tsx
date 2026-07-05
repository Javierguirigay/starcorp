"use client";

import { useState } from "react";
import { FileDown, Plus, Save, User, UserCheck, X } from "lucide-react";
import { LOTER_RIF, LOTER_TELEFONO } from "@/lib/config";
import { EQUIPOS } from "@/lib/data/equipos";
import { SIGUIENTE_ASIG } from "@/lib/data/asignaciones";
import { diasEntre } from "@/lib/negocio/fechas";
import { LogoMark } from "@/components/ui/LogoMark";

interface FilaAsig {
  id: string; // S-00x
  equipo: string;
  desde: string;
  hasta: string;
  estado: "Activo" | "Finalizado" | "En base";
  observaciones: string;
}

const inp =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-navy-400 focus:ring-1 focus:ring-navy-100";

const CATALOGO = EQUIPOS.map((e) => e.codigo);

function nuevaFila(n: number): FilaAsig {
  return {
    id: "S-" + String(n).padStart(3, "0"),
    equipo: CATALOGO[0],
    desde: "",
    hasta: "",
    estado: "Activo",
    observaciones: "",
  };
}

export function OrdenAsignacion() {
  // El contador arranca en 7 y la primera fila es S-008, como el boceto
  // (s=7; agregarAsig() incrementa antes de crear).
  const [contador, setContador] = useState(SIGUIENTE_ASIG + 1);
  const [filas, setFilas] = useState<FilaAsig[]>([nuevaFila(SIGUIENTE_ASIG + 1)]);

  const agregar = () => {
    const n = contador + 1;
    setContador(n);
    setFilas((fs) => [...fs, nuevaFila(n)]);
  };

  const quitar = (id: string) => setFilas((fs) => fs.filter((f) => f.id !== id));

  const editar = (id: string, campo: keyof FilaAsig, valor: string) =>
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {/* Encabezado de la orden */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex items-center justify-between bg-navy-950 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-navy-900 ring-1 ring-white/10">
              <LogoMark className="h-5 w-5" />
            </span>
            <div className="leading-tight text-white">
              <p className="font-display text-sm font-700">LOTER, C.A. · Orden de asignación</p>
              <p className="text-[11px] text-slate-400">
                {LOTER_RIF} · {LOTER_TELEFONO}
              </p>
            </div>
          </div>
          <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-600 text-white sm:block">
            Control de servicios y equipos
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
              Nro. de requerimiento
            </label>
            <input
              defaultValue="ASG-2026-002"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm font-600 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
              Fecha de solicitud
            </label>
            <input
              type="date"
              defaultValue="2026-06-18"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
              Cliente / Proyecto
            </label>
            <input
              placeholder="Ej: IESV / Pozo SBC-37"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
            />
          </div>
        </div>
      </section>

      {/* Responsables */}
      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:grid-cols-2">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-600 uppercase tracking-wide text-slate-400">
            <User className="h-3.5 w-3.5" /> Responsable que entrega
          </label>
          <input
            placeholder="Nombre de quien entrega"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          />
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-600 uppercase tracking-wide text-slate-400">
            <UserCheck className="h-3.5 w-3.5" /> Responsable que recibe
          </label>
          <input
            placeholder="Nombre de quien recibe"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          />
        </div>
      </section>

      {/* Detalle de equipos asignados */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-display text-sm font-700 text-navy-950">Equipos asignados</h2>
            <p className="text-xs text-slate-400">Los días totales se calculan automáticamente</p>
          </div>
          <button
            type="button"
            onClick={agregar}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" /> Agregar equipo
          </button>
        </div>
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-600">ID</th>
                <th className="px-4 py-3 font-600">Equipo / Servicio</th>
                <th className="px-4 py-3 font-600">Desde</th>
                <th className="px-4 py-3 font-600">Hasta</th>
                <th className="px-4 py-3 text-center font-600">Días</th>
                <th className="px-4 py-3 font-600">Estado</th>
                <th className="px-4 py-3 font-600">Observaciones</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filas.map((f) => {
                const dias = diasEntre(f.desde, f.hasta);
                return (
                  <tr key={f.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2 font-mono text-xs font-600 text-navy-700">{f.id}</td>
                    <td className="px-4 py-2">
                      <select
                        className={`${inp} w-40`}
                        value={f.equipo}
                        onChange={(e) => editar(f.id, "equipo", e.target.value)}
                      >
                        {CATALOGO.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        className={`${inp} w-36`}
                        value={f.desde}
                        onChange={(e) => editar(f.id, "desde", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        className={`${inp} w-36`}
                        value={f.hasta}
                        onChange={(e) => editar(f.id, "hasta", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 text-center font-mono font-600 text-navy-900">
                      {dias === "" ? "—" : dias}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className={`${inp} w-28`}
                        value={f.estado}
                        onChange={(e) => editar(f.id, "estado", e.target.value)}
                      >
                        <option>Activo</option>
                        <option>Finalizado</option>
                        <option>En base</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        className={`${inp} w-44`}
                        placeholder="Equipo en locación"
                        value={f.observaciones}
                        onChange={(e) => editar(f.id, "observaciones", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => quitar(f.id)}
                        className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Observaciones generales + firmas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-2">
          <h2 className="mb-3 font-display text-sm font-700 text-navy-950">
            Observaciones generales
          </h2>
          <textarea
            rows={4}
            placeholder="Relato del servicio. Ej: el día domingo (07/06/26) a la 01:16 a.m. se presentó una falla en la Luminaria #1…"
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          ></textarea>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-400">
                Firma · responsable que entrega
              </p>
              <div className="flex h-20 items-end justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 pb-2 text-xs text-slate-400">
                Firma de quien entrega
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-400">
                Firma · responsable que recibe
              </p>
              <div className="flex h-20 items-end justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 pb-2 text-xs text-slate-400">
                Firma de quien recibe
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-2xl border border-navy-200 bg-navy-50/40 p-5 shadow-card">
          <div>
            <h2 className="font-display text-sm font-700 text-navy-950">Guardar asignación</h2>
            <p className="mt-1 text-xs text-slate-500">
              Genera la orden en PDF con el formato de LOTER, C.A.
            </p>
          </div>
          <div className="mt-4 space-y-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 text-sm font-600 text-white hover:bg-navy-800"
            >
              <FileDown className="h-[18px] w-[18px]" /> Generar orden (PDF)
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
            >
              <Save className="h-4 w-4" /> Guardar
            </button>
          </div>
        </section>
      </div>
    </form>
  );
}
