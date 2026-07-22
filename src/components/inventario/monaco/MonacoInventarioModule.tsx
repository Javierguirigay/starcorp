"use client";

/**
 * Inventario de MONACO (eventos y banquetes): dominio propio, independiente del
 * inventario de LOTER. Pestañas: Insumos (ingredientes con stock) y Preparados
 * (recetas). "Preparar" N lotes descuenta del stock los insumos de la receta
 * (N× cada renglón), validando existencias. Estado LOCAL (patrón NominaModule),
 * sembrado vacío y aislado por empresa.
 */
import { useEffect, useMemo, useReducer, useState } from "react";
import { AlertTriangle, Boxes, ChefHat, CookingPot, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { Empresa, Insumo, Preparado } from "@/lib/types";
import {
  INSUMOS_SEED,
  NEXT_INSUMO_ID,
  NEXT_PREPARADO_ID,
  PREPARADOS_SEED,
} from "@/lib/data/monacoInventario";
import { formatNumberVE } from "@/lib/format";
import { round2 } from "@/lib/negocio/nomina";
import { KpiCard } from "@/components/ui/KpiCard";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { InsumoModal, type InsumoDatos } from "./InsumoModal";
import { PreparadoModal, type PreparadoDatos } from "./PreparadoModal";

/* ===================== Estado (reducer local) ===================== */

interface Estado {
  empresaId: string;
  insumos: Insumo[];
  preparados: Preparado[];
  nextInsumoId: number;
  nextPreparadoId: number;
}

type Accion =
  | { tipo: "guardarInsumo"; datos: InsumoDatos; id: number | null }
  | { tipo: "eliminarInsumo"; id: number }
  | { tipo: "guardarPreparado"; datos: PreparadoDatos; id: number | null }
  | { tipo: "eliminarPreparado"; id: number }
  | { tipo: "preparar"; preparadoId: number; lotes: number };

function crearEstadoInicial(empresa: Empresa): Estado {
  return {
    empresaId: empresa.key,
    insumos: INSUMOS_SEED.filter((i) => i.empresaId === empresa.key),
    preparados: PREPARADOS_SEED.filter((p) => p.empresaId === empresa.key),
    nextInsumoId: NEXT_INSUMO_ID,
    nextPreparadoId: NEXT_PREPARADO_ID,
  };
}

function reducer(estado: Estado, accion: Accion): Estado {
  switch (accion.tipo) {
    case "guardarInsumo":
      if (accion.id !== null) {
        return {
          ...estado,
          insumos: estado.insumos.map((i) => (i.id === accion.id ? { ...i, ...accion.datos } : i)),
        };
      }
      return {
        ...estado,
        insumos: [
          ...estado.insumos,
          { id: estado.nextInsumoId, empresaId: estado.empresaId, ...accion.datos },
        ],
        nextInsumoId: estado.nextInsumoId + 1,
      };

    case "eliminarInsumo":
      return {
        ...estado,
        insumos: estado.insumos.filter((i) => i.id !== accion.id),
        // Quita el insumo de las recetas para no dejar referencias colgadas.
        preparados: estado.preparados.map((p) => ({
          ...p,
          receta: p.receta.filter((r) => r.insumoId !== accion.id),
        })),
      };

    case "guardarPreparado":
      if (accion.id !== null) {
        return {
          ...estado,
          preparados: estado.preparados.map((p) =>
            p.id === accion.id ? { ...p, ...accion.datos } : p
          ),
        };
      }
      return {
        ...estado,
        preparados: [
          ...estado.preparados,
          { id: estado.nextPreparadoId, empresaId: estado.empresaId, ...accion.datos },
        ],
        nextPreparadoId: estado.nextPreparadoId + 1,
      };

    case "eliminarPreparado":
      return { ...estado, preparados: estado.preparados.filter((p) => p.id !== accion.id) };

    case "preparar": {
      const prep = estado.preparados.find((p) => p.id === accion.preparadoId);
      if (!prep) return estado;
      // Descuenta N× cada renglón de la receta del stock del insumo (>= 0).
      const necesita = new Map<number, number>();
      for (const r of prep.receta) {
        necesita.set(r.insumoId, (necesita.get(r.insumoId) ?? 0) + r.cantidad * accion.lotes);
      }
      return {
        ...estado,
        insumos: estado.insumos.map((i) =>
          necesita.has(i.id)
            ? { ...i, cantidad: round2(Math.max(0, i.cantidad - (necesita.get(i.id) ?? 0))) }
            : i
        ),
      };
    }
  }
}

/* ===================== Preparar (modal) ===================== */

/** Faltantes de stock para preparar `lotes` del preparado. */
function faltantesDe(prep: Preparado, insumos: Insumo[], lotes: number) {
  const necesita = new Map<number, number>();
  for (const r of prep.receta) {
    necesita.set(r.insumoId, (necesita.get(r.insumoId) ?? 0) + r.cantidad * lotes);
  }
  const filas = [...necesita.entries()].map(([insumoId, need]) => {
    const ins = insumos.find((i) => i.id === insumoId);
    return {
      insumoId,
      nombre: ins?.nombre ?? "(insumo eliminado)",
      unidad: ins?.unidad ?? "",
      necesita: round2(need),
      disponible: ins?.cantidad ?? 0,
      ok: (ins?.cantidad ?? 0) >= need,
    };
  });
  return filas;
}

function PrepararModal({
  preparado,
  insumos,
  onPreparar,
  onToast,
  onClose,
}: {
  preparado: Preparado;
  insumos: Insumo[];
  onPreparar: (lotes: number) => void;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const [lotesTexto, setLotesTexto] = useState("1");
  const lotes = Number(lotesTexto);
  const validos = !isNaN(lotes) && lotes > 0;
  const filas = validos ? faltantesDe(preparado, insumos, lotes) : [];
  const alcanza = filas.length > 0 && filas.every((f) => f.ok);

  const confirmar = () => {
    if (!validos) return onToast("Indica cuántos lotes preparar (mayor que 0)");
    if (!preparado.receta.length) return onToast("Este preparado no tiene receta");
    if (!alcanza) return onToast("No hay stock suficiente para esa cantidad de lotes");
    onPreparar(lotes);
  };

  return (
    <Modal
      onClose={onClose}
      title={`Preparar · ${preparado.nombre}`}
      subtitle={`Rinde ${formatNumberVE(preparado.rendimiento)} ${preparado.unidad} por lote`}
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
            onClick={confirmar}
            disabled={!alcanza}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <CookingPot className="h-4 w-4" /> Preparar y descontar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Lotes a preparar</label>
          <input
            type="number"
            min="1"
            step="any"
            value={lotesTexto}
            onChange={(e) => setLotesTexto(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-right font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/60 text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2 font-600">Insumo</th>
                <th className="px-3 py-2 text-right font-600">Necesita</th>
                <th className="px-3 py-2 text-right font-600">Disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                    Sin insumos en la receta.
                  </td>
                </tr>
              ) : (
                filas.map((f) => (
                  <tr key={f.insumoId} className={f.ok ? "" : "bg-rose-50/60"}>
                    <td className="px-3 py-2 text-navy-900">{f.nombre}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatNumberVE(f.necesita)} {f.unidad}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${f.ok ? "text-slate-600" : "text-rose-600"}`}>
                      {formatNumberVE(f.disponible)} {f.unidad}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {validos && !alcanza && filas.length > 0 && (
          <p className="flex items-center gap-1.5 text-sm text-rose-600">
            <AlertTriangle className="h-4 w-4" /> Stock insuficiente para {formatNumberVE(lotes)} lote(s).
          </p>
        )}
      </div>
    </Modal>
  );
}

/* ===================== UI principal ===================== */

type TabInv = "insumos" | "preparados";

const tabCls = (activo: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-600 ${
    activo ? "bg-navy-900 text-white" : "text-slate-500 hover:text-navy-900"
  }`;

export function MonacoInventarioModule({ empresa }: { empresa: Empresa }) {
  const [estado, dispatch] = useReducer(reducer, empresa, crearEstadoInicial);
  const [tab, setTab] = useState<TabInv>("insumos");
  const [toast, setToast] = useState<string | null>(null);
  const [modalInsumo, setModalInsumo] = useState<{ id: number | null } | null>(null);
  const [modalPrep, setModalPrep] = useState<{ id: number | null } | null>(null);
  const [preparando, setPreparando] = useState<number | null>(null);
  const [filtroCat, setFiltroCat] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const categorias = useMemo(
    () => Array.from(new Set(estado.insumos.map((i) => i.categoria))).sort((a, b) => a.localeCompare(b, "es")),
    [estado.insumos]
  );
  const insumoDe = (id: number) => estado.insumos.find((i) => i.id === id);

  const q = busqueda.toLowerCase().trim();
  const insumosVisibles = estado.insumos.filter(
    (i) =>
      (filtroCat === "todos" || i.categoria === filtroCat) &&
      (!q || i.nombre.toLowerCase().includes(q))
  );
  const bajoStock = estado.insumos.filter((i) => i.cantidad <= i.stockMinimo).length;

  /* ---- insumos ---- */
  const guardarInsumo = (datos: InsumoDatos) => {
    const id = modalInsumo?.id ?? null;
    dispatch({ tipo: "guardarInsumo", datos, id });
    setToast(id !== null ? "Insumo actualizado" : "Insumo cargado");
    setModalInsumo(null);
  };
  const eliminarInsumo = (i: Insumo) => {
    if (!confirm(`¿Eliminar el insumo ${i.nombre}? Se quitará de las recetas que lo usen.`)) return;
    dispatch({ tipo: "eliminarInsumo", id: i.id });
    setToast("Insumo eliminado");
  };

  /* ---- preparados ---- */
  const guardarPreparado = (datos: PreparadoDatos) => {
    const id = modalPrep?.id ?? null;
    dispatch({ tipo: "guardarPreparado", datos, id });
    setToast(id !== null ? "Preparado actualizado" : "Preparado creado");
    setModalPrep(null);
  };
  const eliminarPreparado = (p: Preparado) => {
    if (!confirm(`¿Eliminar el preparado ${p.nombre}?`)) return;
    dispatch({ tipo: "eliminarPreparado", id: p.id });
    setToast("Preparado eliminado");
  };
  const preparar = (preparadoId: number, lotes: number) => {
    dispatch({ tipo: "preparar", preparadoId, lotes });
    setPreparando(null);
    setToast("Preparado listo · insumos descontados del stock");
  };

  const insumoEditando =
    modalInsumo?.id != null ? estado.insumos.find((i) => i.id === modalInsumo.id) ?? null : null;
  const prepEditando =
    modalPrep?.id != null ? estado.preparados.find((p) => p.id === modalPrep.id) ?? null : null;
  const prepPreparando = preparando != null ? estado.preparados.find((p) => p.id === preparando) : undefined;

  return (
    <>
      <div className="mb-5 inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
        <button onClick={() => setTab("insumos")} className={tabCls(tab === "insumos")}>
          Insumos
        </button>
        <button onClick={() => setTab("preparados")} className={tabCls(tab === "preparados")}>
          Preparados
        </button>
      </div>

      {/* ---------------- INSUMOS ---------------- */}
      {tab === "insumos" && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label="Insumos" valor={String(estado.insumos.length)} sub={`${categorias.length} categoría(s)`} icon={Boxes} tone="gold" />
            <KpiCard label="Bajo stock" valor={String(bajoStock)} sub="En o bajo el mínimo" icon={AlertTriangle} tone="navy" />
            <KpiCard label="Preparados" valor={String(estado.preparados.length)} sub="Recetas registradas" icon={ChefHat} tone="navy" />
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-base font-700 text-navy-950">Insumos</h2>
                <p className="text-xs text-slate-400">Ingredientes con control de existencias</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filtroCat}
                  onChange={(e) => setFiltroCat(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                >
                  <option value="todos">Todas las categorías</option>
                  {categorias.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar…"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100 sm:w-44"
                  />
                </div>
                <button
                  onClick={() => setModalInsumo({ id: null })}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
                >
                  <Plus className="h-[18px] w-[18px]" /> Cargar insumo
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[10px] uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3 font-600">Insumo</th>
                    <th className="px-4 py-3 font-600">Categoría</th>
                    <th className="px-4 py-3 text-right font-600">Stock</th>
                    <th className="px-4 py-3 text-right font-600">Mínimo</th>
                    <th className="px-4 py-3 font-600">Ubicación</th>
                    <th className="px-4 py-3 text-right font-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {insumosVisibles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                        {estado.insumos.length === 0
                          ? "Sin insumos. Pulsa «Cargar insumo» para agregar el primero."
                          : "No hay insumos para este filtro."}
                      </td>
                    </tr>
                  ) : (
                    insumosVisibles.map((i) => {
                      const bajo = i.cantidad <= i.stockMinimo;
                      return (
                        <tr key={i.id} className="group hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-600 text-navy-900">{i.nombre}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-600 text-navy-700">
                              {i.categoria}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-mono font-600 ${bajo ? "text-rose-600" : "text-navy-950"}`}>
                              {formatNumberVE(i.cantidad)} {i.unidad}
                            </span>
                            {bajo && (
                              <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-600 text-rose-600">
                                Bajo
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">
                            {formatNumberVE(i.stockMinimo)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{i.ubicacion}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1">
                              <button
                                onClick={() => setModalInsumo({ id: i.id })}
                                title="Editar"
                                className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-navy-700 group-hover:opacity-100"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => eliminarInsumo(i)}
                                title="Eliminar"
                                className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                              >
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

      {/* ---------------- PREPARADOS ---------------- */}
      {tab === "preparados" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-display text-base font-700 text-navy-950">Preparados</h2>
              <p className="text-xs text-slate-400">Recetas · «Preparar» descuenta insumos del stock</p>
            </div>
            <button
              onClick={() => setModalPrep({ id: null })}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
            >
              <Plus className="h-[18px] w-[18px]" /> Nuevo preparado
            </button>
          </div>

          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[10px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-600">Preparado</th>
                  <th className="px-4 py-3 text-right font-600">Rinde</th>
                  <th className="px-4 py-3 font-600">Receta</th>
                  <th className="px-4 py-3 text-right font-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {estado.preparados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                      Sin preparados. Pulsa «Nuevo preparado» para crear una receta.
                    </td>
                  </tr>
                ) : (
                  estado.preparados.map((p) => (
                    <tr key={p.id} className="group hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-600 text-navy-900">{p.nombre}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-slate-600">
                        {formatNumberVE(p.rendimiento)} {p.unidad}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {p.receta.length === 0
                          ? "— sin insumos —"
                          : p.receta
                              .map((r) => insumoDe(r.insumoId)?.nombre ?? "?")
                              .join(", ")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setPreparando(p.id)}
                            disabled={p.receta.length === 0}
                            title="Preparar (descuenta stock)"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-600 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                          >
                            <CookingPot className="h-3.5 w-3.5" /> Preparar
                          </button>
                          <button
                            onClick={() => setModalPrep({ id: p.id })}
                            title="Editar"
                            className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-navy-700 group-hover:opacity-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => eliminarPreparado(p)}
                            title="Eliminar"
                            className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                          >
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
      )}

      {modalInsumo && (
        <InsumoModal
          key={modalInsumo.id ?? "nuevo"}
          insumo={insumoEditando}
          categoriasUsadas={categorias}
          onGuardar={guardarInsumo}
          onToast={setToast}
          onClose={() => setModalInsumo(null)}
        />
      )}
      {modalPrep && (
        <PreparadoModal
          key={modalPrep.id ?? "nuevo"}
          preparado={prepEditando}
          insumos={estado.insumos}
          onGuardar={guardarPreparado}
          onToast={setToast}
          onClose={() => setModalPrep(null)}
        />
      )}
      {prepPreparando && (
        <PrepararModal
          preparado={prepPreparando}
          insumos={estado.insumos}
          onPreparar={(lotes) => preparar(prepPreparando.id, lotes)}
          onToast={setToast}
          onClose={() => setPreparando(null)}
        />
      )}
      {toast && <Toast mensaje={toast} />}
    </>
  );
}
