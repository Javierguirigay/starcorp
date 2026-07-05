"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Fuel, Hammer, Monitor, Pencil, Plus, Truck, Wrench, type LucideIcon } from "lucide-react";
import { CATEGORIAS_EQUIPO, EQUIPOS } from "@/lib/data/equipos";
import type { CategoriaEquipo, EstadoEquipo } from "@/lib/types";

type Filtro = CategoriaEquipo | "todos";

const ESTILO_ESTADO: Record<EstadoEquipo, string> = {
  Disponible: "bg-emerald-50 text-emerald-700",
  Asignado: "bg-navy-50 text-navy-700",
  Mantenimiento: "bg-gold-500/15 text-gold-600",
};

const ICON_CAT: Record<CategoriaEquipo, LucideIcon> = {
  petrolero: Fuel,
  oficina: Monitor,
  herramienta: Hammer,
  vehiculo: Truck,
};

const CATEGORIAS = Object.entries(CATEGORIAS_EQUIPO) as [CategoriaEquipo, string][];

export function InventarioModule() {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const conteo = (cat: CategoriaEquipo) => EQUIPOS.filter((e) => e.categoria === cat).length;
  const visibles = EQUIPOS.filter((e) => filtro === "todos" || e.categoria === filtro);

  return (
    <>
      {/* Tarjetas por categoría (clicables: activan el filtro) */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {CATEGORIAS.map(([k, nombre]) => {
          const Icon = ICON_CAT[k];
          const n = conteo(k);
          return (
            <button
              key={k}
              onClick={() => setFiltro(k)}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-card transition hover:border-navy-300"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-50 text-navy-700">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-600 text-navy-900">{nombre}</p>
              <p className="font-mono text-2xl font-700 text-navy-950">{n}</p>
              <p className="text-xs text-slate-400">{n === 0 ? "Por registrar" : "equipos"}</p>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-card">
          {([["todos", "Todos"], ...CATEGORIAS] as [Filtro, string][]).map(([k, nombre]) => (
            <button
              key={k}
              onClick={() => setFiltro(k)}
              className={`rounded-lg px-4 py-1.5 text-sm font-600 ${
                filtro === k ? "bg-navy-900 text-white" : "text-slate-500 hover:text-navy-900"
              }`}
            >
              {nombre}
            </button>
          ))}
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800">
          <Plus className="h-[18px] w-[18px]" /> Registrar equipo
        </button>
      </div>

      {/* Tabla de stock */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-600">Código / Nombre</th>
                <th className="px-5 py-3 font-600">Categoría</th>
                <th className="px-5 py-3 font-600">Ubicación</th>
                <th className="px-5 py-3 font-600">Estado</th>
                <th className="px-5 py-3 text-right font-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibles.map((eq) => {
                const Icon = ICON_CAT[eq.categoria];
                return (
                  <tr key={eq.codigo} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy-50 text-navy-700">
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="font-600 text-navy-900">{eq.codigo}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{CATEGORIAS_EQUIPO[eq.categoria]}</td>
                    <td className="px-5 py-3 text-slate-600">{eq.ubicacion}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full ${ESTILO_ESTADO[eq.estado]} px-2.5 py-1 text-xs font-600`}
                      >
                        {eq.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href="/loter/administracion/equipos"
                          title="Ver equipo"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href="/loter/administracion/mantenimiento"
                          title="Mantenimiento"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-gold-500/15 hover:text-gold-600"
                        >
                          <Wrench className="h-4 w-4" />
                        </Link>
                        <button
                          title="Editar"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                    No hay equipos en esta categoría todavía. Usa{" "}
                    <span className="font-600 text-navy-700">Registrar equipo</span> para agregarlos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
