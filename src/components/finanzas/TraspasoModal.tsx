"use client";

/**
 * Alta y edición de traspasos entre cuentas de la misma empresa: mueven
 * dinero (transferencia si las monedas coinciden, conversión si difieren)
 * sin contar como ingreso ni egreso. Si las monedas difieren, el monto
 * destino se pre-sugiere con la tasa aplicada pero es editable (la tasa
 * real de la operación la fija el usuario: ej. 50.000 Bs → 400 USDT).
 */
import { useState } from "react";
import type { Empresa, TraspasoInterno } from "@/lib/types";
import { fmtISO, formatNumberVE, money, parseVES } from "@/lib/format";
import {
  convertirMonto,
  fondosSuficientes,
  SIMBOLO_MONEDA,
} from "@/lib/negocio/finanzas";
import { Modal } from "@/components/ui/Modal";
import { useFinanzas } from "./FinanzasProvider";
import { SelectorCuenta } from "./SelectorCuenta";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";
const montoCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-right font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function TraspasoModal({
  empresa,
  traspaso,
  onToast,
  onClose,
}: {
  empresa: Empresa;
  /** null = alta; con valor = edición. */
  traspaso: TraspasoInterno | null;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const finanzas = useFinanzas();

  const [cuentaOrigenId, setCuentaOrigenId] = useState<number | "">(
    traspaso?.cuentaOrigenId ?? ""
  );
  const [cuentaDestinoId, setCuentaDestinoId] = useState<number | "">(
    traspaso?.cuentaDestinoId ?? ""
  );
  const [montoOrigenTexto, setMontoOrigenTexto] = useState(
    traspaso ? formatNumberVE(traspaso.montoOrigen) : ""
  );
  /** null = el usuario no lo ha tocado: se sugiere con la tasa aplicada. */
  const [montoDestinoTexto, setMontoDestinoTexto] = useState<string | null>(
    traspaso && traspaso.monedaOrigen !== traspaso.monedaDestino
      ? formatNumberVE(traspaso.montoDestino)
      : null
  );
  const [fecha, setFecha] = useState(traspaso?.fecha ?? fmtISO(new Date()));
  const [descripcion, setDescripcion] = useState(traspaso?.descripcion ?? "");
  const [observaciones, setObservaciones] = useState(traspaso?.observaciones ?? "");

  const cuentas = finanzas.cuentasDe(empresa.key);
  const origen = cuentaOrigenId === "" ? undefined : cuentas.find((c) => c.id === cuentaOrigenId);
  const destino =
    cuentaDestinoId === "" ? undefined : cuentas.find((c) => c.id === cuentaDestinoId);
  const montoOrigen = parseVES(montoOrigenTexto);
  // Alta: tasa global vigente. Edición: se conserva el snapshot histórico.
  const tasaAplicada = traspaso ? traspaso.tasaBs : finanzas.tasa;
  const esConversion = !!origen && !!destino && origen.moneda !== destino.moneda;
  const sugerido =
    esConversion && montoOrigen > 0
      ? convertirMonto(montoOrigen, origen.moneda, destino.moneda, tasaAplicada)
      : 0;
  const montoDestino = esConversion
    ? montoDestinoTexto === null
      ? sugerido
      : parseVES(montoDestinoTexto)
    : montoOrigen;

  // Fondos de la cuenta origen sin las piernas del propio traspaso (al editar,
  // el monto que se liberará cuenta como disponible).
  const transaccionesSinPropias = traspaso
    ? finanzas.transacciones.filter(
        (t) => !(t.origen === "traspaso" && t.referenciaId === traspaso.id)
      )
    : finanzas.transacciones;
  const fondos =
    origen && montoOrigen > 0
      ? fondosSuficientes(origen.id, montoOrigen, transaccionesSinPropias)
      : null;

  const guardar = () => {
    if (!origen || !destino) {
      onToast("Selecciona la cuenta origen y la cuenta destino");
      return;
    }
    if (origen.id === destino.id) {
      onToast("La cuenta destino debe ser distinta de la origen");
      return;
    }
    if (montoOrigen <= 0) {
      onToast("Indica un monto mayor que cero");
      return;
    }
    if (esConversion && montoDestino <= 0) {
      onToast("Indica el monto que entra a la cuenta destino");
      return;
    }
    if (fondos && !fondos.ok) {
      onToast(
        `Fondos insuficientes en ${origen.nombre}: disponible ${money(
          fondos.disponible,
          SIMBOLO_MONEDA[origen.moneda]
        )}`
      );
      return;
    }
    if (!fecha) {
      onToast("Indica la fecha del traspaso");
      return;
    }
    if (!descripcion.trim()) {
      onToast("Indica una descripción");
      return;
    }
    const datos = {
      empresaId: empresa.key,
      cuentaOrigenId: origen.id,
      cuentaDestinoId: destino.id,
      montoOrigen,
      montoDestino,
      fecha,
      descripcion: descripcion.trim(),
      observaciones: observaciones.trim() || undefined,
    };
    if (traspaso) {
      finanzas.editarTraspaso(traspaso.id, datos);
      onToast("Traspaso actualizado");
    } else {
      finanzas.registrarTraspaso(datos);
      onToast(esConversion ? "Conversión registrada" : "Traspaso registrado");
    }
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={traspaso ? "Editar movimiento entre cuentas" : "Movimiento entre cuentas"}
      subtitle={`${empresa.nombre.replace(", C.A.", "")} · no cuenta como ingreso ni egreso`}
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
            {traspaso ? "Guardar cambios" : "Registrar"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Cuenta origen</label>
            <SelectorCuenta
              empresaId={empresa.key}
              value={cuentaOrigenId}
              onChange={(id) => {
                setCuentaOrigenId(id);
                if (id !== "" && id === cuentaDestinoId) setCuentaDestinoId("");
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Cuenta destino</label>
            <SelectorCuenta
              empresaId={empresa.key}
              value={cuentaDestinoId}
              onChange={setCuentaDestinoId}
              excluirId={cuentaOrigenId === "" ? undefined : cuentaOrigenId}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">
              Monto {origen ? `(${SIMBOLO_MONEDA[origen.moneda]})` : ""}
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={montoOrigenTexto}
              onChange={(e) => setMontoOrigenTexto(e.target.value)}
              className={montoCls}
            />
            {fondos && (
              <p
                className={`mt-1 text-right font-mono text-[11px] ${
                  fondos.ok ? "text-slate-400" : "text-rose-600"
                }`}
              >
                Disponible: {money(fondos.disponible, origen ? SIMBOLO_MONEDA[origen.moneda] : "$")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {esConversion && (
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">
              Monto destino ({SIMBOLO_MONEDA[destino.moneda]})
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={montoDestinoTexto ?? (sugerido > 0 ? formatNumberVE(sugerido) : "")}
              onChange={(e) => setMontoDestinoTexto(e.target.value)}
              className={montoCls}
            />
            <p className="mt-1 text-right font-mono text-[11px] text-slate-400">
              Sugerido a tasa {money(tasaAplicada, "Bs")}:{" "}
              {money(sugerido, SIMBOLO_MONEDA[destino.moneda])} · editable
            </p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Descripción</label>
          <textarea
            rows={2}
            placeholder="Ej: fondeo de la cuenta Binance"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          ></textarea>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">
            Observaciones <span className="font-400 text-slate-400">(opcional)</span>
          </label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          ></textarea>
        </div>
      </div>
    </Modal>
  );
}
