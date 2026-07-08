"use client";

import { useEffect, useReducer, useState } from "react";
import {
  CalendarX,
  CheckCheck,
  Eye,
  HandCoins,
  Landmark,
  Pencil,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  ADELANTOS_SEED,
  EMPLEADOS_SEED,
  HISTORIAL_SEED,
  NEXT_ADELANTO_ID,
  NEXT_EMP_ID,
  NEXT_HIST_ID,
  TASA_INICIAL,
} from "@/lib/data/empleados";
import { fmtISO, formatFechaVE, money } from "@/lib/format";
import { calcularConAdelanto, diario, round2 } from "@/lib/negocio/nomina";
import {
  aplicarAdelantos,
  cancelarAdelanto,
  editarAdelanto,
  remanente,
  totalPendiente,
} from "@/lib/negocio/adelantos";
import type { AdelantoSueldo, CategoriaPago, Empleado, PagoHistorial } from "@/lib/types";
import { Toast } from "@/components/ui/Toast";
import { Avatar, BadgeCategoria, BadgeEstatus } from "./badges";
import { EmpleadoModal, type EmpleadoDatos } from "./EmpleadoModal";
import { FaltasModal } from "./FaltasModal";
import { BancoModal } from "./BancoModal";
import { DetalleModal } from "./DetalleModal";
import { AdelantoModal, type AdelantoDatos } from "./AdelantoModal";

/* ===================== Estado central (reducer) ===================== */

interface Estado {
  empleados: Empleado[];
  nextEmpId: number;
  historial: PagoHistorial[];
  nextHistId: number;
  faltas: Record<number, string[]>; // { empId: ['2026-06-09', ...] }
  adelantos: AdelantoSueldo[];
  nextAdelantoId: number;
}

type Accion =
  | { tipo: "guardarEmpleado"; datos: EmpleadoDatos; id: number | null }
  | { tipo: "eliminarEmpleado"; id: number }
  | { tipo: "toggleFalta"; empId: number; fecha: string }
  | { tipo: "limpiarFaltas"; empId: number }
  | { tipo: "registrarAdelanto"; empleadoId: number; datos: AdelantoDatos }
  | { tipo: "editarAdelanto"; id: number; datos: AdelantoDatos }
  | { tipo: "cancelarAdelanto"; id: number }
  | {
      tipo: "registrarPago";
      categoria: CategoriaPago;
      desde: string;
      hasta: string;
      registrado: string;
      tasa: number;
    };

const ESTADO_INICIAL: Estado = {
  empleados: EMPLEADOS_SEED,
  nextEmpId: NEXT_EMP_ID,
  historial: HISTORIAL_SEED,
  nextHistId: NEXT_HIST_ID,
  faltas: {},
  adelantos: ADELANTOS_SEED,
  nextAdelantoId: NEXT_ADELANTO_ID,
};

function empleadosDeCategoria(estado: Estado, cat: CategoriaPago): Empleado[] {
  return estado.empleados.filter((e) => e.categoria === cat && e.estatus !== "Inactivo");
}

function reducer(estado: Estado, accion: Accion): Estado {
  switch (accion.tipo) {
    case "guardarEmpleado": {
      if (accion.id !== null) {
        return {
          ...estado,
          empleados: estado.empleados.map((e) =>
            e.id === accion.id ? { ...e, ...accion.datos } : e
          ),
        };
      }
      return {
        ...estado,
        empleados: [...estado.empleados, { id: estado.nextEmpId, ...accion.datos }],
        nextEmpId: estado.nextEmpId + 1,
      };
    }
    case "eliminarEmpleado": {
      const faltas = { ...estado.faltas };
      delete faltas[accion.id];
      return {
        ...estado,
        empleados: estado.empleados.filter((e) => e.id !== accion.id),
        faltas,
        // Los adelantos ya descontados se conservan por trazabilidad del historial.
        adelantos: estado.adelantos.filter(
          (a) => a.empleadoId !== accion.id || a.estado === "descontado"
        ),
      };
    }
    case "toggleFalta": {
      const actuales = estado.faltas[accion.empId] ?? [];
      const nuevas = actuales.includes(accion.fecha)
        ? actuales.filter((f) => f !== accion.fecha)
        : [...actuales, accion.fecha];
      return { ...estado, faltas: { ...estado.faltas, [accion.empId]: nuevas } };
    }
    case "limpiarFaltas":
      return { ...estado, faltas: { ...estado.faltas, [accion.empId]: [] } };
    case "registrarAdelanto": {
      const adelanto: AdelantoSueldo = {
        id: estado.nextAdelantoId,
        empleadoId: accion.empleadoId,
        montoUSD: accion.datos.montoUSD,
        fecha: accion.datos.fecha,
        estado: "pendiente",
        montoDescontadoUSD: 0,
        aplicaciones: [],
        ...(accion.datos.nota ? { nota: accion.datos.nota } : {}),
      };
      return {
        ...estado,
        adelantos: [...estado.adelantos, adelanto],
        nextAdelantoId: estado.nextAdelantoId + 1,
      };
    }
    case "editarAdelanto":
      return {
        ...estado,
        adelantos: editarAdelanto(estado.adelantos, accion.id, accion.datos),
      };
    case "cancelarAdelanto":
      return { ...estado, adelantos: cancelarAdelanto(estado.adelantos, accion.id) };
    case "registrarPago": {
      const lista = empleadosDeCategoria(estado, accion.categoria);
      const pagoId = estado.nextHistId;
      let adelantos = estado.adelantos;
      // Mismos redondeos que el original: +toFixed(2) por campo y por total.
      const detalle = lista.map((e) => {
        const pendiente = totalPendiente(adelantos, e.id);
        const c = calcularConAdelanto(e, (estado.faltas[e.id] ?? []).length, pendiente);
        const descAdelanto = round2(c.descAdelanto);
        if (descAdelanto > 0) {
          adelantos = aplicarAdelantos(adelantos, e.id, descAdelanto, pagoId);
        }
        return {
          nombre: e.nombre,
          faltas: c.faltas,
          dias: c.dias,
          diario: round2(c.diario),
          desc: round2(c.desc),
          descAdelanto,
          neto: round2(c.neto),
          // Snapshot para recibos fieles aunque el empleado cambie después.
          empId: e.id,
          cargo: e.cargo,
          dpto: e.dpto,
          base: e.base,
          banco: { ...e.banco },
        };
      });
      const totalUsd = round2(detalle.reduce((s, d) => s + d.neto, 0));
      const totalDesc = round2(detalle.reduce((s, d) => s + d.desc, 0));
      const totalAdelanto = round2(detalle.reduce((s, d) => s + d.descAdelanto, 0));

      const pago: PagoHistorial = {
        id: pagoId,
        categoria: accion.categoria,
        desde: accion.desde,
        hasta: accion.hasta,
        registrado: accion.registrado,
        totalUsd,
        totalDesc,
        totalAdelanto,
        tasa: accion.tasa,
        detalle,
      };

      // Limpiar faltas de los empleados pagados (nuevo período empieza limpio).
      const faltas = { ...estado.faltas };
      lista.forEach((e) => (faltas[e.id] = []));

      return {
        ...estado,
        historial: [pago, ...estado.historial],
        nextHistId: estado.nextHistId + 1,
        faltas,
      };
    }
  }
}

/* ===================== UI ===================== */

type ModalAbierto =
  | { tipo: "empleado"; id: number | null }
  | { tipo: "faltas"; id: number }
  | { tipo: "banco"; id: number }
  | { tipo: "adelanto"; id: number }
  | { tipo: "detalle"; id: number }
  | null;

type FiltroCat = "todos" | CategoriaPago;

const tabCls = (activo: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-600 ${
    activo ? "bg-navy-900 text-white" : "text-slate-500 hover:text-navy-900"
  }`;

export function NominaModule() {
  const [estado, dispatch] = useReducer(reducer, ESTADO_INICIAL);

  const [tasaTexto, setTasaTexto] = useState(TASA_INICIAL.toFixed(2)); // "36.50", como el boceto
  const tasaNum = parseFloat(tasaTexto);
  const tasa = isNaN(tasaNum) ? 0 : tasaNum;

  const [empFiltro, setEmpFiltro] = useState<FiltroCat>("todos");
  const [empBusqueda, setEmpBusqueda] = useState("");
  const [histFiltro, setHistFiltro] = useState<FiltroCat>("todos");
  const [pagoCat, setPagoCat] = useState<CategoriaPago>("Semanal");
  const [pagoDesde, setPagoDesde] = useState("2026-06-08");
  const [pagoHasta, setPagoHasta] = useState("2026-06-14");
  const [modal, setModal] = useState<ModalAbierto>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Auto-cierre del toast a los 2,6 s, como el boceto.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const enBs = (usd: number) => money(usd * tasa, "Bs");
  const faltasDe = (id: number) => (estado.faltas[id] ?? []).length;
  const buscarEmp = (id: number) => estado.empleados.find((e) => e.id === id);

  /* ---- listas derivadas ---- */
  const q = empBusqueda.toLowerCase().trim();
  const empleadosVisibles = estado.empleados.filter(
    (e) =>
      (empFiltro === "todos" || e.categoria === empFiltro) &&
      (!q || e.nombre.toLowerCase().includes(q))
  );

  const listaPago = estado.empleados.filter(
    (e) => e.categoria === pagoCat && e.estatus !== "Inactivo"
  );
  const calcDe = (e: Empleado) =>
    calcularConAdelanto(e, faltasDe(e.id), totalPendiente(estado.adelantos, e.id));
  const totDesc = listaPago.reduce((s, e) => s + calcDe(e).desc, 0);
  const totAdelanto = listaPago.reduce((s, e) => s + calcDe(e).descAdelanto, 0);
  const totNeto = listaPago.reduce((s, e) => s + calcDe(e).neto, 0);

  const historialVisible = estado.historial.filter(
    (h) => histFiltro === "todos" || h.categoria === histFiltro
  );

  /* ---- acciones ---- */
  const registrarPago = () => {
    if (!listaPago.length) {
      setToast("No hay empleados que pagar en esta categoría");
      return;
    }
    if (!pagoDesde || !pagoHasta) {
      setToast("Indica el período Desde y Hasta");
      return;
    }
    if (tasa <= 0) {
      setToast("Indica una tasa Bs/USD válida antes de registrar el pago");
      return;
    }
    dispatch({
      tipo: "registrarPago",
      categoria: pagoCat,
      desde: pagoDesde,
      hasta: pagoHasta,
      registrado: fmtISO(new Date()),
      tasa,
    });
    setToast((pagoCat === "Semanal" ? "Semana" : "Quincena") + " registrada en el historial");
  };

  const eliminarEmpleado = (id: number) => {
    const e = buscarEmp(id);
    if (!e) return;
    if (!confirm(`¿Eliminar a ${e.nombre}? Esta acción no afecta el historial ya registrado.`))
      return;
    dispatch({ tipo: "eliminarEmpleado", id });
    setToast("Empleado eliminado");
  };

  const guardarEmpleado = (datos: EmpleadoDatos) => {
    const id = modal?.tipo === "empleado" ? modal.id : null;
    dispatch({ tipo: "guardarEmpleado", datos, id });
    setToast(id !== null ? "Empleado actualizado" : "Empleado agregado");
    setModal(null);
  };

  const guardarAdelanto = (datos: AdelantoDatos) => {
    if (modal?.tipo !== "adelanto") return;
    dispatch({ tipo: "registrarAdelanto", empleadoId: modal.id, datos });
    setToast("Adelanto registrado");
    setModal(null);
  };

  const actualizarAdelanto = (id: number, datos: AdelantoDatos) => {
    dispatch({ tipo: "editarAdelanto", id, datos });
    setToast("Adelanto actualizado");
    setModal(null);
  };

  const anularAdelanto = (a: AdelantoSueldo) => {
    if (
      !confirm(
        `¿Cancelar el adelanto pendiente de ${money(remanente(a))} del ${formatFechaVE(a.fecha)}?`
      )
    )
      return;
    dispatch({ tipo: "cancelarAdelanto", id: a.id });
    setToast("Adelanto cancelado");
  };

  /* ---- render ---- */
  return (
    <>
      {/* Encabezado */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">
              Tasa (Bs / USD)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-600 text-slate-400">
                Bs
              </span>
              <input
                type="number"
                step="0.01"
                value={tasaTexto}
                onChange={(e) => setTasaTexto(e.target.value)}
                className="w-36 rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-right font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
              />
            </div>
          </div>
        </div>
        <button
          onClick={() => setModal({ tipo: "empleado", id: null })}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
        >
          <UserPlus className="h-[18px] w-[18px]" /> Agregar empleado
        </button>
      </div>

      {/* 1) Empleados */}
      <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-700 text-navy-950">Empleados</h2>
            <p className="text-xs text-slate-400">Alta, edición y datos bancarios del personal</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              {(["todos", "Quincenal", "Semanal"] as FiltroCat[]).map((f) => (
                <button key={f} onClick={() => setEmpFiltro(f)} className={tabCls(empFiltro === f)}>
                  {f === "todos" ? "Todos" : f}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar…"
                value={empBusqueda}
                onChange={(e) => setEmpBusqueda(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100 sm:w-48"
              />
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-600">Empleado</th>
                <th className="px-5 py-3 font-600">Departamento</th>
                <th className="px-5 py-3 font-600">Categoría</th>
                <th className="px-5 py-3 text-right font-600">Salario base (mensual)</th>
                <th className="px-5 py-3 font-600">Estatus</th>
                <th className="px-5 py-3 text-right font-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {empleadosVisibles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                    No hay empleados para este filtro.
                  </td>
                </tr>
              ) : (
                empleadosVisibles.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar nombre={e.nombre} />
                        <div className="leading-tight">
                          <p className="font-600 text-navy-900">{e.nombre}</p>
                          <p className="text-xs text-slate-400">{e.cargo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{e.dpto}</td>
                    <td className="px-5 py-3">
                      <BadgeCategoria categoria={e.categoria} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono font-600 text-navy-900">{money(e.base)}</span>
                      <span className="block font-mono text-[11px] text-slate-400">
                        {money(diario(e))} / día
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <BadgeEstatus estatus={e.estatus} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Datos bancarios"
                          onClick={() => setModal({ tipo: "banco", id: e.id })}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-navy-50 hover:text-navy-700"
                        >
                          <Landmark className="h-4 w-4" />
                        </button>
                        <button
                          title="Registrar adelanto"
                          onClick={() => setModal({ tipo: "adelanto", id: e.id })}
                          className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-gold-500/10 hover:text-gold-600 ${
                            totalPendiente(estado.adelantos, e.id) > 0
                              ? "text-gold-600"
                              : "text-slate-400"
                          }`}
                        >
                          <HandCoins className="h-4 w-4" />
                        </button>
                        <button
                          title="Editar"
                          onClick={() => setModal({ tipo: "empleado", id: e.id })}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="Eliminar"
                          onClick={() => eliminarEmpleado(e.id)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2) Procesar pago */}
      <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-base font-700 text-navy-950">Procesar pago</h2>
          <p className="text-xs text-slate-400">
            Elige categoría y período, marca las faltas y registra el pago
          </p>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">
              Categoría
            </label>
            <select
              value={pagoCat}
              onChange={(e) => setPagoCat(e.target.value as CategoriaPago)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
            >
              <option value="Semanal">Nómina semanal (7 días)</option>
              <option value="Quincenal">Nómina quincenal (15 días)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">
              Desde
            </label>
            <input
              type="date"
              value={pagoDesde}
              onChange={(e) => setPagoDesde(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">
              Hasta
            </label>
            <input
              type="date"
              value={pagoHasta}
              onChange={(e) => setPagoHasta(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
            />
          </div>
          <div className="ml-auto rounded-xl bg-navy-50/60 px-4 py-2.5 text-xs text-navy-700">
            Diario = base ÷ <span className="font-mono">30</span> · faltas se marcan en el calendario
          </div>
        </div>

        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-600">Empleado</th>
                <th className="px-5 py-3 text-right font-600">Salario diario</th>
                <th className="px-5 py-3 text-center font-600">Faltas</th>
                <th className="px-5 py-3 text-right font-600">Descuento</th>
                <th className="px-5 py-3 text-right font-600">Adelanto</th>
                <th className="px-5 py-3 text-right font-600">Neto a pagar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {listaPago.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                    No hay empleados activos en esta categoría.
                  </td>
                </tr>
              ) : (
                listaPago.map((e) => {
                  const c = calcDe(e);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar nombre={e.nombre} />
                          <div className="leading-tight">
                            <p className="font-600 text-navy-900">{e.nombre}</p>
                            <p className="text-xs text-slate-400">{e.cargo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-navy-900">
                        {money(c.diario)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => setModal({ tipo: "faltas", id: e.id })}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-600 ${
                            c.faltas > 0
                              ? "border-rose-200 bg-rose-50 text-rose-600"
                              : "border-slate-200 text-navy-700 hover:bg-slate-50"
                          }`}
                        >
                          <CalendarX className="h-3.5 w-3.5" /> {c.faltas}{" "}
                          {c.faltas === 1 ? "falta" : "faltas"}
                        </button>
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-mono ${
                          c.desc > 0 ? "text-rose-600" : "text-slate-400"
                        }`}
                      >
                        {c.desc > 0 ? "− " + money(c.desc) : money(0)}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-mono ${
                          c.descAdelanto > 0 ? "text-rose-600" : "text-slate-400"
                        }`}
                      >
                        {c.descAdelanto > 0 ? "− " + money(c.descAdelanto) : money(0)}
                        {c.descAdelanto > 0 && (
                          <span className="block font-mono text-[11px] text-slate-400">
                            {enBs(c.descAdelanto)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="font-mono text-base font-700 text-navy-950">
                          {money(c.neto)}
                        </span>
                        <span className="block font-mono text-[11px] text-slate-400">
                          {enBs(c.neto)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50/60 font-600 text-navy-900">
                <td className="px-5 py-3 text-right" colSpan={3}>
                  Totales del período
                </td>
                <td className="px-5 py-3 text-right font-mono text-rose-600">− {money(totDesc)}</td>
                <td className="px-5 py-3 text-right font-mono text-rose-600">
                  − {money(totAdelanto)}
                </td>
                <td className="px-5 py-3 text-right font-mono text-navy-950">
                  {money(totNeto)}
                  <span className="block text-[11px] text-slate-400">{enBs(totNeto)}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            {listaPago.length > 0 &&
              `${listaPago.length} empleado(s) ${pagoCat.toLowerCase()}(es) · período ${formatFechaVE(pagoDesde)} → ${formatFechaVE(pagoHasta)}`}
          </p>
          <div>
            <button
              onClick={registrarPago}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-600 text-white hover:bg-emerald-700"
            >
              <CheckCheck className="h-[18px] w-[18px]" />{" "}
              {pagoCat === "Semanal" ? "Semana pagada" : "Quincena pagada"}
            </button>
          </div>
        </div>
      </section>

      {/* 3) Historial */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-700 text-navy-950">Historial de pagos</h2>
            <p className="text-xs text-slate-400">
              Períodos semanales y quincenales ya registrados
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            {(["todos", "Semanal", "Quincenal"] as FiltroCat[]).map((f) => (
              <button key={f} onClick={() => setHistFiltro(f)} className={tabCls(histFiltro === f)}>
                {f === "todos" ? "Todos" : f}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-600">Categoría</th>
                <th className="px-5 py-3 font-600">Período</th>
                <th className="px-5 py-3 font-600">Registrado</th>
                <th className="px-5 py-3 text-right font-600">Descuentos</th>
                <th className="px-5 py-3 text-right font-600">Adelanto</th>
                <th className="px-5 py-3 text-right font-600">Total pagado</th>
                <th className="px-5 py-3 text-right font-600">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {historialVisible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                    Aún no hay pagos registrados para este filtro.
                  </td>
                </tr>
              ) : (
                historialVisible.map((h) => {
                  // Bs del historial con la tasa congelada del pago (pagos previos: la vigente).
                  const enBsPago = (usd: number) => money(usd * (h.tasa ?? tasa), "Bs");
                  return (
                  <tr key={h.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <BadgeCategoria categoria={h.categoria} />
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-navy-900">
                        {formatFechaVE(h.desde)}
                      </span>{" "}
                      <span className="text-slate-300">→</span>{" "}
                      <span className="font-mono text-xs text-navy-900">
                        {formatFechaVE(h.hasta)}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {formatFechaVE(h.registrado)}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-mono ${
                        h.totalDesc > 0 ? "text-rose-600" : "text-slate-400"
                      }`}
                    >
                      {h.totalDesc > 0 ? "− " + money(h.totalDesc) : money(0)}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-mono ${
                        (h.totalAdelanto ?? 0) > 0 ? "text-rose-600" : "text-slate-400"
                      }`}
                    >
                      {(h.totalAdelanto ?? 0) > 0 ? "− " + money(h.totalAdelanto!) : money(0)}
                      {(h.totalAdelanto ?? 0) > 0 && (
                        <span className="block font-mono text-[11px] text-slate-400">
                          {enBsPago(h.totalAdelanto!)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono font-700 text-navy-950">{money(h.totalUsd)}</span>
                      <span className="block font-mono text-[11px] text-slate-400">
                        {enBsPago(h.totalUsd)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setModal({ tipo: "detalle", id: h.id })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-600 text-navy-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modales */}
      {modal?.tipo === "empleado" && (
        <EmpleadoModal
          key={modal.id ?? "nuevo"}
          empleado={modal.id !== null ? buscarEmp(modal.id) ?? null : null}
          onGuardar={guardarEmpleado}
          onToast={setToast}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === "faltas" && buscarEmp(modal.id) && (
        <FaltasModal
          empleado={buscarEmp(modal.id)!}
          desde={pagoDesde}
          hasta={pagoHasta}
          marcadas={estado.faltas[modal.id] ?? []}
          onToggle={(fecha) => dispatch({ tipo: "toggleFalta", empId: modal.id, fecha })}
          onLimpiar={() => dispatch({ tipo: "limpiarFaltas", empId: modal.id })}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === "banco" && buscarEmp(modal.id) && (
        <BancoModal empleado={buscarEmp(modal.id)!} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === "adelanto" && buscarEmp(modal.id) && (
        <AdelantoModal
          empleado={buscarEmp(modal.id)!}
          tasa={tasa}
          adelantos={estado.adelantos}
          onGuardar={guardarAdelanto}
          onEditar={actualizarAdelanto}
          onCancelar={anularAdelanto}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === "detalle" &&
        (() => {
          const pago = estado.historial.find((h) => h.id === modal.id)!;
          return (
            <DetalleModal
              pago={pago}
              // Tasa congelada al registrar el pago (pagos previos al campo: la vigente).
              tasa={pago.tasa ?? tasa}
              empleados={estado.empleados}
              onToast={setToast}
              onClose={() => setModal(null)}
            />
          );
        })()}

      {/* Aviso flotante */}
      {toast && <Toast mensaje={toast} />}
    </>
  );
}
