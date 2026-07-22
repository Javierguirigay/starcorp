"use client";

/**
 * Inventario de AGROSTAR: dominio propio (no es el inventario de LOTER).
 * Pestañas: Semovientes (registro del hato) · Equipos de finca (maquinaria) ·
 * Consumibles (aceites/filtros con stock). Estado LOCAL (patrón NominaModule),
 * sembrado desde las semillas de AGROSTAR y aislado por empresa.
 */
import { useEffect, useMemo, useReducer, useState } from "react";
import {
  AlertTriangle,
  Baby,
  Beef,
  Boxes,
  Pencil,
  Plus,
  Search,
  Tractor,
  Trash2,
} from "lucide-react";
import type { ConsumibleFinca, Empresa, EquipoFinca, Semoviente } from "@/lib/types";
import { NEXT_SEMOVIENTE_ID, SEMOVIENTES_SEED } from "@/lib/data/semovientes";
import {
  CONSUMIBLES_FINCA_SEED,
  EQUIPOS_FINCA_SEED,
  NEXT_CONSUMIBLE_FINCA_ID,
  NEXT_EQUIPO_FINCA_ID,
} from "@/lib/data/agrostarInventario";
import { formatFechaVE, formatNumberVE } from "@/lib/format";
import { KpiCard } from "@/components/ui/KpiCard";
import { Toast } from "@/components/ui/Toast";
import { SemovienteModal, type SemovienteDatos } from "./SemovienteModal";
import { EquipoFincaModal, type EquipoFincaDatos } from "./EquipoFincaModal";
import { ConsumibleFincaModal, type ConsumibleFincaDatos } from "./ConsumibleFincaModal";

/* ===================== Estado (reducer local) ===================== */

interface Estado {
  empresaId: string;
  semovientes: Semoviente[];
  equipos: EquipoFinca[];
  consumibles: ConsumibleFinca[];
  nextSemId: number;
  nextEqId: number;
  nextConsId: number;
}

type Accion =
  | { tipo: "guardarSem"; datos: SemovienteDatos; id: number | null }
  | { tipo: "eliminarSem"; id: number }
  | { tipo: "guardarEq"; datos: EquipoFincaDatos; id: number | null }
  | { tipo: "eliminarEq"; id: number }
  | { tipo: "guardarCons"; datos: ConsumibleFincaDatos; id: number | null }
  | { tipo: "eliminarCons"; id: number };

function crearEstadoInicial(empresa: Empresa): Estado {
  const dela = <T extends { empresaId: string }>(seed: T[]) =>
    seed.filter((x) => x.empresaId === empresa.key);
  return {
    empresaId: empresa.key,
    semovientes: dela(SEMOVIENTES_SEED),
    equipos: dela(EQUIPOS_FINCA_SEED),
    consumibles: dela(CONSUMIBLES_FINCA_SEED),
    nextSemId: NEXT_SEMOVIENTE_ID,
    nextEqId: NEXT_EQUIPO_FINCA_ID,
    nextConsId: NEXT_CONSUMIBLE_FINCA_ID,
  };
}

function reducer(estado: Estado, accion: Accion): Estado {
  switch (accion.tipo) {
    case "guardarSem":
      if (accion.id !== null)
        return {
          ...estado,
          semovientes: estado.semovientes.map((s) => (s.id === accion.id ? { ...s, ...accion.datos } : s)),
        };
      return {
        ...estado,
        semovientes: [...estado.semovientes, { id: estado.nextSemId, empresaId: estado.empresaId, ...accion.datos }],
        nextSemId: estado.nextSemId + 1,
      };
    case "eliminarSem":
      return { ...estado, semovientes: estado.semovientes.filter((s) => s.id !== accion.id) };

    case "guardarEq":
      if (accion.id !== null)
        return {
          ...estado,
          equipos: estado.equipos.map((e) => (e.id === accion.id ? { ...e, ...accion.datos } : e)),
        };
      return {
        ...estado,
        equipos: [...estado.equipos, { id: estado.nextEqId, empresaId: estado.empresaId, ...accion.datos }],
        nextEqId: estado.nextEqId + 1,
      };
    case "eliminarEq":
      return { ...estado, equipos: estado.equipos.filter((e) => e.id !== accion.id) };

    case "guardarCons":
      if (accion.id !== null)
        return {
          ...estado,
          consumibles: estado.consumibles.map((c) => (c.id === accion.id ? { ...c, ...accion.datos } : c)),
        };
      return {
        ...estado,
        consumibles: [...estado.consumibles, { id: estado.nextConsId, empresaId: estado.empresaId, ...accion.datos }],
        nextConsId: estado.nextConsId + 1,
      };
    case "eliminarCons":
      return { ...estado, consumibles: estado.consumibles.filter((c) => c.id !== accion.id) };
  }
}

/* ===================== UI ===================== */

type TabInv = "semovientes" | "equipos" | "consumibles";

const TABS: [TabInv, string][] = [
  ["semovientes", "Semovientes"],
  ["equipos", "Equipos de finca"],
  ["consumibles", "Consumibles"],
];

const tabCls = (activo: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-600 ${
    activo ? "bg-navy-900 text-white" : "text-slate-500 hover:text-navy-900"
  }`;

const filtroCls =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";
const buscadorCls =
  "w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100 sm:w-44";
const btnNuevo =
  "inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800";
const accEdit =
  "rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-navy-700 group-hover:opacity-100";
const accDel =
  "rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100";

const ESTADO_BADGE: Record<string, string> = {
  Operativo: "bg-emerald-50 text-emerald-700",
  "En reparación": "bg-amber-50 text-amber-700",
  "Dado de baja": "bg-slate-100 text-slate-500",
};

export function AgrostarInventarioModule({ empresa }: { empresa: Empresa }) {
  const [estado, dispatch] = useReducer(reducer, empresa, crearEstadoInicial);
  const [tab, setTab] = useState<TabInv>("semovientes");
  const [toast, setToast] = useState<string | null>(null);
  const [modalSem, setModalSem] = useState<{ id: number | null } | null>(null);
  const [modalEq, setModalEq] = useState<{ id: number | null } | null>(null);
  const [modalCons, setModalCons] = useState<{ id: number | null } | null>(null);
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Al cambiar de pestaña se reinician filtro y búsqueda (dominios distintos).
  const cambiarTab = (t: TabInv) => {
    setTab(t);
    setFiltro("todos");
    setBusqueda("");
  };

  const q = busqueda.toLowerCase().trim();

  /* ---- Semovientes ---- */
  const catsSem = useMemo(
    () => Array.from(new Set(estado.semovientes.map((s) => s.categoria))).sort((a, b) => a.localeCompare(b, "es")),
    [estado.semovientes]
  );
  const semVisibles = estado.semovientes.filter(
    (s) =>
      (filtro === "todos" || s.categoria === filtro) &&
      (!q ||
        s.nombre.toLowerCase().includes(q) ||
        s.numero.toLowerCase().includes(q) ||
        (s.parentesco ?? "").toLowerCase().includes(q))
  );
  const totalHato = estado.semovientes.length;
  const prenadas = estado.semovientes.filter((s) => s.estatus.toLowerCase().includes("preñ")).length;
  const crias = estado.semovientes.filter((s) => /becerr|maut/i.test(s.categoria)).length;

  /* ---- Equipos ---- */
  const catsEq = useMemo(
    () => Array.from(new Set(estado.equipos.map((e) => e.categoria))).sort((a, b) => a.localeCompare(b, "es")),
    [estado.equipos]
  );
  const eqVisibles = estado.equipos.filter(
    (e) =>
      (filtro === "todos" || e.categoria === filtro) &&
      (!q || e.nombre.toLowerCase().includes(q) || (e.marca ?? "").toLowerCase().includes(q))
  );
  const operativos = estado.equipos.filter((e) => e.estado === "Operativo").length;
  const enReparacion = estado.equipos.filter((e) => e.estado === "En reparación").length;

  /* ---- Consumibles ---- */
  const tiposCons = useMemo(
    () => Array.from(new Set(estado.consumibles.map((c) => c.tipo))).sort((a, b) => a.localeCompare(b, "es")),
    [estado.consumibles]
  );
  const consVisibles = estado.consumibles.filter(
    (c) => (filtro === "todos" || c.tipo === filtro) && (!q || c.nombre.toLowerCase().includes(q))
  );
  const bajoStock = estado.consumibles.filter((c) => c.cantidad <= c.stockMinimo).length;

  /* ---- handlers ---- */
  const guardarSem = (datos: SemovienteDatos) => {
    dispatch({ tipo: "guardarSem", datos, id: modalSem?.id ?? null });
    setToast(modalSem?.id != null ? "Animal actualizado" : "Animal registrado");
    setModalSem(null);
  };
  const eliminarSem = (s: Semoviente) => {
    if (!confirm(`¿Eliminar del hato a ${s.nombre || s.numero}?`)) return;
    dispatch({ tipo: "eliminarSem", id: s.id });
    setToast("Animal eliminado");
  };
  const guardarEq = (datos: EquipoFincaDatos) => {
    dispatch({ tipo: "guardarEq", datos, id: modalEq?.id ?? null });
    setToast(modalEq?.id != null ? "Equipo actualizado" : "Equipo cargado");
    setModalEq(null);
  };
  const eliminarEq = (e: EquipoFinca) => {
    if (!confirm(`¿Eliminar el equipo ${e.nombre}?`)) return;
    dispatch({ tipo: "eliminarEq", id: e.id });
    setToast("Equipo eliminado");
  };
  const guardarCons = (datos: ConsumibleFincaDatos) => {
    dispatch({ tipo: "guardarCons", datos, id: modalCons?.id ?? null });
    setToast(modalCons?.id != null ? "Consumible actualizado" : "Consumible cargado");
    setModalCons(null);
  };
  const eliminarCons = (c: ConsumibleFinca) => {
    if (!confirm(`¿Eliminar el consumible ${c.nombre}?`)) return;
    dispatch({ tipo: "eliminarCons", id: c.id });
    setToast("Consumible eliminado");
  };

  const semEditando = modalSem?.id != null ? estado.semovientes.find((s) => s.id === modalSem.id) ?? null : null;
  const eqEditando = modalEq?.id != null ? estado.equipos.find((e) => e.id === modalEq.id) ?? null : null;
  const consEditando = modalCons?.id != null ? estado.consumibles.find((c) => c.id === modalCons.id) ?? null : null;

  // Funcion que devuelve JSX, no componente: definirlo como componente aqui adentro
  // lo remonta en cada render y el buscador pierde el foco al escribir.
  const filtroDe = (opciones: string[]) => (
    <>
      <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className={filtroCls}>
        <option value="todos">Todas</option>
        {opciones.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={buscadorCls}
        />
      </div>
    </>
  );

  return (
    <>
      <div className="mb-5 inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => cambiarTab(key)} className={tabCls(tab === key)}>
            {label}
          </button>
        ))}
      </div>

      {/* ---------------- SEMOVIENTES ---------------- */}
      {tab === "semovientes" && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label="Total de animales" valor={String(totalHato)} sub={`${catsSem.length} categoría(s)`} icon={Beef} tone="gold" />
            <KpiCard label="Preñadas" valor={String(prenadas)} sub="Estatus con preñez" icon={Baby} tone="navy" />
            <KpiCard label="Crías / levante" valor={String(crias)} sub="Becerros/as y mautes" icon={Beef} tone="navy" />
          </div>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-base font-700 text-navy-950">Semovientes</h2>
                <p className="text-xs text-slate-400">Registro del hato · categoría, estatus y parentesco</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {filtroDe(catsSem)}
                <button onClick={() => setModalSem({ id: null })} className={btnNuevo}>
                  <Plus className="h-[18px] w-[18px]" /> Registrar animal
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[10px] uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3 font-600">N° / Arete</th>
                    <th className="px-4 py-3 font-600">Categoría</th>
                    <th className="px-4 py-3 font-600">Nombre</th>
                    <th className="px-4 py-3 font-600">Estatus</th>
                    <th className="px-4 py-3 font-600">Fecha</th>
                    <th className="px-4 py-3 font-600">Parentesco / Notas</th>
                    <th className="px-4 py-3 text-right font-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {semVisibles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                        {totalHato === 0 ? "El hato está vacío." : "No hay animales para este filtro."}
                      </td>
                    </tr>
                  ) : (
                    semVisibles.map((s) => (
                      <tr key={s.id} className="group hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono text-navy-900">{s.numero}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-600 text-navy-700">{s.categoria}</span>
                        </td>
                        <td className="px-4 py-3 font-600 text-navy-900">{s.nombre || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{s.estatus || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                          {s.fecha ? formatFechaVE(s.fecha) : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {[s.parentesco, s.notas].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1">
                            <button onClick={() => setModalSem({ id: s.id })} title="Editar" className={accEdit}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => eliminarSem(s)} title="Eliminar" className={accDel}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {semVisibles.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50/60 font-600 text-navy-900">
                      <td colSpan={6} className="px-4 py-3">
                        {semVisibles.length === totalHato ? `Total del hato (${totalHato})` : `Mostrando ${semVisibles.length} de ${totalHato}`}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>
        </>
      )}

      {/* ---------------- EQUIPOS DE FINCA ---------------- */}
      {tab === "equipos" && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label="Equipos" valor={String(estado.equipos.length)} sub={`${catsEq.length} categoría(s)`} icon={Tractor} tone="gold" />
            <KpiCard label="Operativos" valor={String(operativos)} sub="Listos para trabajar" icon={Tractor} tone="navy" />
            <KpiCard label="En reparación" valor={String(enReparacion)} sub="Fuera de servicio" icon={AlertTriangle} tone="navy" />
          </div>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-base font-700 text-navy-950">Equipos de finca</h2>
                <p className="text-xs text-slate-400">Maquinaria e implementos de la finca</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {filtroDe(catsEq)}
                <button onClick={() => setModalEq({ id: null })} className={btnNuevo}>
                  <Plus className="h-[18px] w-[18px]" /> Cargar equipo
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[10px] uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3 font-600">Equipo</th>
                    <th className="px-4 py-3 font-600">Categoría</th>
                    <th className="px-4 py-3 font-600">Marca / Modelo</th>
                    <th className="px-4 py-3 font-600">Serial</th>
                    <th className="px-4 py-3 font-600">Estado</th>
                    <th className="px-4 py-3 font-600">Ubicación</th>
                    <th className="px-4 py-3 text-right font-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {eqVisibles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                        {estado.equipos.length === 0 ? "Sin equipos. Pulsa «Cargar equipo»." : "No hay equipos para este filtro."}
                      </td>
                    </tr>
                  ) : (
                    eqVisibles.map((e) => (
                      <tr key={e.id} className="group hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-600 text-navy-900">{e.nombre}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-600 text-navy-700">{e.categoria}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{[e.marca, e.modelo].filter(Boolean).join(" ") || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{e.serial || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${ESTADO_BADGE[e.estado] ?? "bg-slate-100 text-slate-600"}`}>
                            {e.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{e.ubicacion || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1">
                            <button onClick={() => setModalEq({ id: e.id })} title="Editar" className={accEdit}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => eliminarEq(e)} title="Eliminar" className={accDel}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* ---------------- CONSUMIBLES ---------------- */}
      {tab === "consumibles" && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard label="Consumibles" valor={String(estado.consumibles.length)} sub={`${tiposCons.length} tipo(s)`} icon={Boxes} tone="gold" />
            <KpiCard label="Bajo stock" valor={String(bajoStock)} sub="En o bajo el mínimo" icon={AlertTriangle} tone="navy" />
          </div>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-base font-700 text-navy-950">Consumibles</h2>
                <p className="text-xs text-slate-400">Aceites, filtros y repuestos con control de existencias</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {filtroDe(tiposCons)}
                <button onClick={() => setModalCons({ id: null })} className={btnNuevo}>
                  <Plus className="h-[18px] w-[18px]" /> Cargar consumible
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[10px] uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3 font-600">Consumible</th>
                    <th className="px-4 py-3 font-600">Tipo</th>
                    <th className="px-4 py-3 text-right font-600">Stock</th>
                    <th className="px-4 py-3 text-right font-600">Mínimo</th>
                    <th className="px-4 py-3 font-600">Ubicación</th>
                    <th className="px-4 py-3 text-right font-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {consVisibles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                        {estado.consumibles.length === 0 ? "Sin consumibles. Pulsa «Cargar consumible»." : "No hay consumibles para este filtro."}
                      </td>
                    </tr>
                  ) : (
                    consVisibles.map((c) => {
                      const bajo = c.cantidad <= c.stockMinimo;
                      return (
                        <tr key={c.id} className="group hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-600 text-navy-900">{c.nombre}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-600 text-navy-700">{c.tipo}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-mono font-600 ${bajo ? "text-rose-600" : "text-navy-950"}`}>
                              {formatNumberVE(c.cantidad)} {c.unidad}
                            </span>
                            {bajo && (
                              <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-600 text-rose-600">Bajo</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">{formatNumberVE(c.stockMinimo)}</td>
                          <td className="px-4 py-3 text-slate-600">{c.ubicacion}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1">
                              <button onClick={() => setModalCons({ id: c.id })} title="Editar" className={accEdit}>
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => eliminarCons(c)} title="Eliminar" className={accDel}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {modalSem && (
        <SemovienteModal
          key={modalSem.id ?? "nuevo"}
          semoviente={semEditando}
          categoriasUsadas={catsSem}
          onGuardar={guardarSem}
          onToast={setToast}
          onClose={() => setModalSem(null)}
        />
      )}
      {modalEq && (
        <EquipoFincaModal
          key={modalEq.id ?? "nuevo"}
          equipo={eqEditando}
          categoriasUsadas={catsEq}
          onGuardar={guardarEq}
          onToast={setToast}
          onClose={() => setModalEq(null)}
        />
      )}
      {modalCons && (
        <ConsumibleFincaModal
          key={modalCons.id ?? "nuevo"}
          consumible={consEditando}
          tiposUsados={tiposCons}
          onGuardar={guardarCons}
          onToast={setToast}
          onClose={() => setModalCons(null)}
        />
      )}
      {toast && <Toast mensaje={toast} />}
    </>
  );
}
