"use client";

/**
 * CRUD en memoria de las cuentas financieras de una empresa (banco, exchange,
 * caja). La moneda es inmutable una vez la cuenta tiene movimientos; la
 * predeterminada no se puede eliminar ni desactivar (se reasigna marcando
 * otra); las cuentas referenciadas por movimientos tampoco se eliminan.
 */
import { useState } from "react";
import { Check, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import type { CuentaFinanciera, Empresa, Moneda } from "@/lib/types";
import { money } from "@/lib/format";
import {
  MONEDAS,
  puedeEliminarCuenta,
  saldoDeCuenta,
  SIMBOLO_MONEDA,
} from "@/lib/negocio/finanzas";
import { Modal } from "@/components/ui/Modal";
import { useFinanzas } from "./FinanzasProvider";
import { BadgeMoneda } from "./badges";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function CuentasModal({
  empresa,
  onToast,
  onClose,
}: {
  empresa: Empresa;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const finanzas = useFinanzas();
  const cuentas = finanzas.cuentasDe(empresa.key);
  const transacciones = finanzas.transaccionesDe(empresa.key);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editMoneda, setEditMoneda] = useState<Moneda>("USD");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaMoneda, setNuevaMoneda] = useState<Moneda>("USD");

  const usos = (id: number) => transacciones.filter((t) => t.cuentaId === id).length;

  const empezarEdicion = (c: CuentaFinanciera) => {
    setEditandoId(c.id);
    setEditNombre(c.nombre);
    setEditMoneda(c.moneda);
  };

  const guardarEdicion = (c: CuentaFinanciera) => {
    if (!editNombre.trim()) {
      onToast("Indica el nombre de la cuenta");
      return;
    }
    finanzas.editarCuenta(c.id, {
      nombre: editNombre.trim(),
      moneda: editMoneda,
      predeterminada: c.predeterminada,
      activa: c.activa,
    });
    setEditandoId(null);
    onToast("Cuenta actualizada");
  };

  const marcarPredeterminada = (c: CuentaFinanciera) => {
    finanzas.editarCuenta(c.id, {
      nombre: c.nombre,
      moneda: c.moneda,
      predeterminada: true,
      activa: true, // la predeterminada siempre queda activa
    });
    onToast(`"${c.nombre}" es ahora la cuenta predeterminada`);
  };

  const alternarActiva = (c: CuentaFinanciera) => {
    finanzas.editarCuenta(c.id, {
      nombre: c.nombre,
      moneda: c.moneda,
      predeterminada: c.predeterminada,
      activa: !c.activa,
    });
    onToast(c.activa ? "Cuenta desactivada" : "Cuenta activada");
  };

  const eliminar = (c: CuentaFinanciera) => {
    if (!confirm(`¿Eliminar la cuenta "${c.nombre}"?`)) return;
    finanzas.eliminarCuenta(c.id);
    onToast("Cuenta eliminada");
  };

  const crear = () => {
    if (!nuevoNombre.trim()) {
      onToast("Indica el nombre de la nueva cuenta");
      return;
    }
    finanzas.crearCuenta(empresa.key, {
      nombre: nuevoNombre.trim(),
      moneda: nuevaMoneda,
      predeterminada: false,
      activa: true,
    });
    setNuevoNombre("");
    onToast("Cuenta creada");
  };

  return (
    <Modal
      onClose={onClose}
      title="Cuentas financieras"
      subtitle={`${empresa.nombre} · el balance es la suma de sus saldos`}
      maxWidth="max-w-2xl"
      footer={
        <button
          onClick={onClose}
          className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
        >
          Cerrar
        </button>
      }
    >
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
        {cuentas.map((c) => {
          const enUso = usos(c.id);
          const eliminable = puedeEliminarCuenta(
            c,
            finanzas.transacciones,
            finanzas.traspasos,
            finanzas.movimientosGrupo
          );
          return (
            <li key={c.id} className={`flex items-center gap-3 px-4 py-3 ${c.activa ? "" : "opacity-60"}`}>
              {editandoId === c.id ? (
                <>
                  <input
                    type="text"
                    autoFocus
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") guardarEdicion(c);
                    }}
                    className={inputCls}
                  />
                  <select
                    value={editMoneda}
                    onChange={(e) => setEditMoneda(e.target.value as Moneda)}
                    disabled={enUso > 0}
                    title={
                      enUso > 0 ? "Con movimientos asociados la moneda no se cambia" : undefined
                    }
                    className={`${inputCls} w-28 disabled:bg-slate-50 disabled:text-slate-400`}
                  >
                    {MONEDAS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button
                    title="Guardar"
                    onClick={() => guardarEdicion(c)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    title="Cancelar"
                    onClick={() => setEditandoId(null)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate font-600 text-navy-900">
                      {c.nombre}
                      {c.predeterminada && (
                        <Star
                          className="h-3.5 w-3.5 shrink-0 fill-gold-500 text-gold-500"
                          aria-label="Cuenta predeterminada"
                        />
                      )}
                      {!c.activa && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-600 text-slate-500">
                          Inactiva
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-xs text-slate-400">
                      Saldo: {money(saldoDeCuenta(c.id, transacciones), SIMBOLO_MONEDA[c.moneda])}
                      {enUso > 0 && ` · ${enUso} movimiento${enUso === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <BadgeMoneda moneda={c.moneda} />
                  {!c.predeterminada && (
                    <button
                      title="Marcar como predeterminada"
                      onClick={() => marcarPredeterminada(c)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-gold-500/10 hover:text-gold-600"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    title={
                      c.predeterminada
                        ? "La cuenta predeterminada no se desactiva"
                        : c.activa
                          ? "Desactivar (deja de salir en los selectores)"
                          : "Activar"
                    }
                    disabled={c.predeterminada}
                    onClick={() => alternarActiva(c)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-600 text-slate-400 hover:bg-slate-100 hover:text-navy-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    {c.activa ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    title="Editar"
                    onClick={() => empezarEdicion(c)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    title={eliminable.ok ? "Eliminar" : eliminable.motivo}
                    disabled={!eliminable.ok}
                    onClick={() => eliminar(c)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {/* Alta */}
      <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4">
        <p className="mb-2 text-[11px] font-600 uppercase tracking-wide text-slate-400">
          Añadir cuenta
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nombre (ej. Mercantil, Binance, Banco USA)"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") crear();
            }}
            className={inputCls}
          />
          <select
            value={nuevaMoneda}
            onChange={(e) => setNuevaMoneda(e.target.value as Moneda)}
            className={`${inputCls} w-28`}
          >
            {MONEDAS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            onClick={crear}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-navy-900 px-3 py-2 text-sm font-600 text-white hover:bg-navy-800"
          >
            <Plus className="h-4 w-4" /> Añadir
          </button>
        </div>
      </div>
    </Modal>
  );
}
