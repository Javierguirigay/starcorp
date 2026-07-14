"use client";

/**
 * Edición de un movimiento del historial del Grupo (entrada, retiro o
 * transferencia). En transferencias, origen/destino se eligen como empresas del
 * grupo y el provider regenera los espejos que ajustan los saldos; en
 * entradas/retiros los extremos son texto libre (p. ej. un cliente externo).
 * La tasa snapshot y el usuario originales se conservan.
 */
import { useState } from "react";
import type { Moneda, MovimientoGrupo, TipoMovimiento } from "@/lib/types";
import { EMPRESAS } from "@/lib/data/empresas";
import { formatNumberVE, money, parseVES } from "@/lib/format";
import { round2 } from "@/lib/negocio/nomina";
import {
  convertirMonto,
  fondosSuficientes,
  MONEDAS,
  SIMBOLO_MONEDA,
} from "@/lib/negocio/finanzas";
import { Modal } from "@/components/ui/Modal";
import { useFinanzas } from "./FinanzasProvider";
import { SelectorCuenta } from "./SelectorCuenta";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function MovimientoGrupoModal({
  movimiento,
  onToast,
  onClose,
}: {
  movimiento: MovimientoGrupo;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const { editarMovimientoGrupo, tasa, transacciones, cuentas, cuentaPredeterminadaDe } =
    useFinanzas();

  const [tipo, setTipo] = useState<TipoMovimiento>(movimiento.tipo);
  const [origenKey, setOrigenKey] = useState(movimiento.origenKey ?? "");
  const [destinoKey, setDestinoKey] = useState(movimiento.destinoKey ?? "");
  const [cuentaOrigenId, setCuentaOrigenId] = useState<number | "">(
    movimiento.cuentaOrigenId ?? ""
  );
  const [cuentaDestinoId, setCuentaDestinoId] = useState<number | "">(
    movimiento.cuentaDestinoId ?? ""
  );
  const [origenNombre, setOrigenNombre] = useState(movimiento.origenNombre);
  const [destinoNombre, setDestinoNombre] = useState(movimiento.destinoNombre);
  const [moneda, setMoneda] = useState<Moneda>(movimiento.monedaOrigen);
  const [montoTexto, setMontoTexto] = useState(formatNumberVE(movimiento.montoOrigen));
  /** null = no tocado: se sugiere con la tasa snapshot si las monedas difieren. */
  const [montoDestinoTexto, setMontoDestinoTexto] = useState<string | null>(
    movimiento.monedaOrigen !== movimiento.monedaDestino
      ? formatNumberVE(movimiento.montoDestino)
      : null
  );
  const [fecha, setFecha] = useState(movimiento.fecha);
  const [descripcion, setDescripcion] = useState(movimiento.descripcion);

  const esTransferencia = tipo === "Transferencia";
  const monto = round2(parseVES(montoTexto));
  const cuentaOrigen =
    esTransferencia && cuentaOrigenId !== ""
      ? cuentas.find((c) => c.id === cuentaOrigenId)
      : undefined;
  const cuentaDestino =
    esTransferencia && cuentaDestinoId !== ""
      ? cuentas.find((c) => c.id === cuentaDestinoId)
      : undefined;
  const monedaOrigen = esTransferencia ? cuentaOrigen?.moneda ?? moneda : moneda;
  const monedaDestino = esTransferencia ? cuentaDestino?.moneda ?? moneda : moneda;
  const esConversion = esTransferencia && !!cuentaOrigen && !!cuentaDestino && monedaOrigen !== monedaDestino;
  // El monto destino sugerido usa la tasa snapshot del movimiento, no la vigente.
  const sugerido =
    esConversion && monto > 0
      ? convertirMonto(monto, monedaOrigen, monedaDestino, movimiento.tasaBs)
      : 0;
  const montoDestino = esConversion
    ? montoDestinoTexto === null
      ? sugerido
      : round2(parseVES(montoDestinoTexto))
    : monto;
  const equivalente =
    monto > 0 && tasa > 0
      ? monedaOrigen === "VES"
        ? money(convertirMonto(monto, "VES", "USD", tasa))
        : money(convertirMonto(monto, monedaOrigen, "VES", tasa), "Bs")
      : null;

  const cambiarEmpresa = (lado: "origen" | "destino", key: string) => {
    if (lado === "origen") {
      setOrigenKey(key);
      setCuentaOrigenId(cuentaPredeterminadaDe(key)?.id ?? "");
    } else {
      setDestinoKey(key);
      setCuentaDestinoId(cuentaPredeterminadaDe(key)?.id ?? "");
    }
  };

  const guardar = () => {
    if (monto <= 0) return onToast("Indica un monto mayor que cero");
    if (!fecha) return onToast("Indica la fecha del movimiento");
    if (!descripcion.trim()) return onToast("Indica el motivo / descripción");

    let extremos: Pick<
      MovimientoGrupo,
      "origenKey" | "destinoKey" | "cuentaOrigenId" | "cuentaDestinoId" | "origenNombre" | "destinoNombre"
    >;
    if (esTransferencia) {
      if (!origenKey || !destinoKey) return onToast("Selecciona empresa origen y destino");
      if (origenKey === destinoKey)
        return onToast("La empresa origen y destino deben ser distintas");
      if (!cuentaOrigen || !cuentaDestino)
        return onToast("Selecciona la cuenta origen y la cuenta destino");
      if (esConversion && montoDestino <= 0)
        return onToast("Indica el monto que entra a la cuenta destino");
      // Disponible = saldo de la cuenta origen SIN los espejos de este movimiento
      // (el monto actual se libera al regenerarlos), para no bloquear una edición válida.
      const sinPropias = transacciones.filter(
        (t) => !(t.origen === "transferencia" && t.referenciaId === movimiento.id)
      );
      const chequeo = fondosSuficientes(cuentaOrigen.id, monto, sinPropias);
      if (!chequeo.ok)
        return onToast(
          `Fondos insuficientes en ${cuentaOrigen.nombre}: disponible ` +
            `${money(chequeo.disponible, SIMBOLO_MONEDA[cuentaOrigen.moneda])}, se requieren ` +
            `${money(monto, SIMBOLO_MONEDA[cuentaOrigen.moneda])}`
        );
      const oe = EMPRESAS.find((e) => e.key === origenKey);
      const de = EMPRESAS.find((e) => e.key === destinoKey);
      extremos = {
        origenKey,
        destinoKey,
        cuentaOrigenId: cuentaOrigen.id,
        cuentaDestinoId: cuentaDestino.id,
        origenNombre: oe?.nombre ?? origenNombre,
        destinoNombre: de?.nombre ?? destinoNombre,
      };
    } else {
      if (!origenNombre.trim() || !destinoNombre.trim())
        return onToast("Indica el origen y el destino");
      // Si el texto coincide con una empresa del grupo, se conserva su key.
      const ok = EMPRESAS.find((e) => e.nombre === origenNombre.trim())?.key;
      const dk = EMPRESAS.find((e) => e.nombre === destinoNombre.trim())?.key;
      extremos = {
        origenNombre: origenNombre.trim(),
        destinoNombre: destinoNombre.trim(),
        ...(ok ? { origenKey: ok } : {}),
        ...(dk ? { destinoKey: dk } : {}),
      };
    }

    editarMovimientoGrupo(movimiento.id, {
      tipo,
      monedaOrigen,
      montoOrigen: monto,
      monedaDestino,
      montoDestino,
      fecha,
      descripcion: descripcion.trim(),
      observaciones: movimiento.observaciones,
      ...extremos,
    });
    onToast("Movimiento actualizado");
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title="Editar movimiento del grupo"
      subtitle="Entrada, retiro o transferencia · el saldo se ajusta si es transferencia"
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
            Guardar cambios
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoMovimiento)}
            className={inputCls}
          >
            <option value="Entrada">Entrada</option>
            <option value="Retiro">Retiro</option>
            <option value="Transferencia">Transferencia</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Origen</label>
            {esTransferencia ? (
              <>
                <select
                  value={origenKey}
                  onChange={(e) => cambiarEmpresa("origen", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Selecciona…</option>
                  {EMPRESAS.map((em) => (
                    <option key={em.key} value={em.key}>
                      {em.nombre}
                    </option>
                  ))}
                </select>
                {origenKey && (
                  <div className="mt-2">
                    <SelectorCuenta
                      empresaId={origenKey}
                      value={cuentaOrigenId}
                      onChange={setCuentaOrigenId}
                    />
                  </div>
                )}
              </>
            ) : (
              <input
                className={inputCls}
                value={origenNombre}
                onChange={(e) => setOrigenNombre(e.target.value)}
                placeholder="Ej: IESV (cliente)"
              />
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Destino</label>
            {esTransferencia ? (
              <>
                <select
                  value={destinoKey}
                  onChange={(e) => cambiarEmpresa("destino", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Selecciona…</option>
                  {EMPRESAS.map((em) => (
                    <option key={em.key} value={em.key}>
                      {em.nombre}
                    </option>
                  ))}
                </select>
                {destinoKey && (
                  <div className="mt-2">
                    <SelectorCuenta
                      empresaId={destinoKey}
                      value={cuentaDestinoId}
                      onChange={setCuentaDestinoId}
                    />
                  </div>
                )}
              </>
            ) : (
              <input
                className={inputCls}
                value={destinoNombre}
                onChange={(e) => setDestinoNombre(e.target.value)}
                placeholder="Ej: LOTER, C.A."
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Moneda</label>
            {esTransferencia ? (
              <p
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-center text-sm text-slate-500"
                title="La moneda la define la cuenta origen"
              >
                {monedaOrigen}
              </p>
            ) : (
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as Moneda)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
              >
                {MONEDAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="col-span-2">
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Monto</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={montoTexto}
              onChange={(e) => setMontoTexto(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-right font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
            />
            {equivalente && (
              <p className="mt-1 text-right font-mono text-[11px] text-slate-400">≈ {equivalente}</p>
            )}
          </div>
        </div>

        {esConversion && (
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">
              Monto destino ({SIMBOLO_MONEDA[monedaDestino]})
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={montoDestinoTexto ?? (sugerido > 0 ? formatNumberVE(sugerido) : "")}
              onChange={(e) => setMontoDestinoTexto(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-right font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
            />
            <p className="mt-1 text-right font-mono text-[11px] text-slate-400">
              Sugerido a tasa original {money(movimiento.tasaBs, "Bs")}:{" "}
              {money(sugerido, SIMBOLO_MONEDA[monedaDestino])} · editable
            </p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Motivo / descripción</label>
          <textarea
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          />
        </div>

        {esTransferencia && (
          <p className="rounded-xl bg-navy-50/60 px-3 py-2 text-xs text-navy-700">
            Al guardar se recalculan los movimientos espejo de las empresas con finanzas
            habilitadas, ajustando sus saldos.
          </p>
        )}
      </div>
    </Modal>
  );
}
