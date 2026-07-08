"use client";

import { useState } from "react";
import { HandCoins, Pencil, Save, Trash2, Undo2 } from "lucide-react";
import type { AdelantoSueldo, Empleado } from "@/lib/types";
import { fmtISO, formatFechaVE, money } from "@/lib/format";
import { pendientesDe, remanente } from "@/lib/negocio/adelantos";
import { Modal } from "@/components/ui/Modal";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

/** Payload de registro de un adelanto (el reducer asigna id y estado). */
export interface AdelantoDatos {
  montoUSD: number;
  fecha: string; // ISO
  nota?: string;
}

export function AdelantoModal({
  empleado,
  tasa,
  adelantos,
  onGuardar,
  onEditar,
  onCancelar,
  onClose,
}: {
  empleado: Empleado;
  tasa: number;
  adelantos: AdelantoSueldo[];
  onGuardar: (datos: AdelantoDatos) => void;
  onEditar: (id: number, datos: AdelantoDatos) => void;
  onCancelar: (a: AdelantoSueldo) => void;
  onClose: () => void;
}) {
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(fmtISO(new Date()));
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<AdelantoSueldo | null>(null);

  const montoNum = parseFloat(monto);
  const montoValido = !isNaN(montoNum) && montoNum > 0;
  const pendientes = pendientesDe(adelantos, empleado.id);

  const empezarEdicion = (a: AdelantoSueldo) => {
    setEditando(a);
    setMonto(String(a.montoUSD));
    setFecha(a.fecha);
    setNota(a.nota ?? "");
    setError(null);
  };

  const salirEdicion = () => {
    setEditando(null);
    setMonto("");
    setFecha(fmtISO(new Date()));
    setNota("");
    setError(null);
  };

  const guardar = () => {
    if (!montoValido) {
      setError("Indica un monto en USD mayor que cero");
      return;
    }
    if (!fecha) {
      setError("Indica la fecha del adelanto");
      return;
    }
    if (editando && montoNum < editando.montoDescontadoUSD) {
      setError(
        `El monto no puede ser menor que lo ya descontado (${money(editando.montoDescontadoUSD)})`
      );
      return;
    }
    const n = nota.trim();
    const datos: AdelantoDatos = { montoUSD: montoNum, fecha, ...(n ? { nota: n } : {}) };
    if (editando) onEditar(editando.id, datos);
    else onGuardar(datos);
  };

  return (
    <Modal
      onClose={onClose}
      title={editando ? "Editar adelanto de sueldo" : "Registrar adelanto de sueldo"}
      subtitle={`${empleado.nombre} · ${empleado.cargo}`}
      maxWidth="max-w-lg"
      footer={
        <>
          {editando && (
            <button
              onClick={salirEdicion}
              className="mr-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-600 text-slate-500 hover:text-navy-900"
            >
              <Undo2 className="h-4 w-4" /> Volver a registrar
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
          >
            <Save className="h-[18px] w-[18px]" />{" "}
            {editando ? "Guardar cambios" : "Guardar adelanto"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Monto (USD)</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-7 pr-3 text-right font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                value={monto}
                onChange={(e) => {
                  setMonto(e.target.value);
                  setError(null);
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Equivalente:{" "}
              <span className="font-mono">{money(montoValido ? montoNum * tasa : 0, "Bs")}</span>
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Fecha de solicitud</label>
            <input
              type="date"
              className={inputCls}
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setError(null);
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Nota (opcional)</label>
            <textarea
              rows={2}
              className={inputCls}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>
        </div>

        {editando && editando.montoDescontadoUSD > 0 && (
          <p className="rounded-xl bg-gold-500/10 px-4 py-2.5 text-xs text-navy-700">
            Este adelanto ya tiene{" "}
            <span className="font-mono font-600">{money(editando.montoDescontadoUSD)}</span>{" "}
            descontados en pagos anteriores; el monto no puede quedar por debajo de esa cifra.
          </p>
        )}

        {error && (
          <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-600 text-rose-600">{error}</p>
        )}

        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <p className="mb-2 flex items-center gap-2 text-xs font-600 uppercase tracking-wide text-slate-400">
            <HandCoins className="h-3.5 w-3.5" /> Adelantos pendientes
          </p>
          {pendientes.length === 0 ? (
            <p className="text-slate-400">Este empleado no tiene adelantos pendientes.</p>
          ) : (
            <ul className="space-y-1.5">
              {pendientes.map((a) => (
                <li
                  key={a.id}
                  className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1 ${
                    editando?.id === a.id ? "bg-gold-500/10 ring-1 ring-gold-500/40" : ""
                  }`}
                >
                  <span className="min-w-0 text-slate-500">
                    <span className="font-mono text-xs">{formatFechaVE(a.fecha)}</span>
                    {a.nota ? <span className="ml-2 text-xs text-slate-400">{a.nota}</span> : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="font-mono font-600 text-navy-900">{money(remanente(a))}</span>
                    <button
                      title="Editar adelanto"
                      onClick={() => empezarEdicion(a)}
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-navy-50 hover:text-navy-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="Cancelar adelanto"
                      onClick={() => {
                        if (editando?.id === a.id) salirEdicion();
                        onCancelar(a);
                      }}
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-400">
            El total pendiente se descuenta completo en el próximo pago de su categoría; si supera
            el neto disponible, el remanente pasa al pago siguiente.
          </p>
        </div>
      </div>
    </Modal>
  );
}
