"use client";

/**
 * Alta y edición de movimientos manuales. La edición conserva la tasa
 * congelada del registro original (tasaBs); el alta usa la tasa global
 * vigente para el equivalente en Bs mostrado en vivo.
 */
import { useState } from "react";
import { Plus } from "lucide-react";
import type { Empresa, TipoTransaccion, TransaccionFinanciera } from "@/lib/types";
import { fmtISO, formatNumberVE, money, parseVES } from "@/lib/format";
import { categoriasParaTipo } from "@/lib/negocio/finanzas";
import { round2 } from "@/lib/negocio/nomina";
import { Modal } from "@/components/ui/Modal";
import { useFinanzas } from "./FinanzasProvider";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

const tipoCls = (activo: boolean) =>
  `flex-1 rounded-lg px-3 py-2 text-sm font-600 ${
    activo ? "bg-navy-900 text-white" : "text-slate-500 hover:text-navy-900"
  }`;

export function TransaccionModal({
  empresa,
  transaccion,
  onToast,
  onClose,
}: {
  empresa: Empresa;
  /** null = alta; con valor = edición (solo llega para origen 'manual'). */
  transaccion: TransaccionFinanciera | null;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const finanzas = useFinanzas();

  const [tipo, setTipo] = useState<TipoTransaccion>(transaccion?.tipo ?? "salida");
  const [categoriaId, setCategoriaId] = useState<number | "">(transaccion?.categoriaId ?? "");
  const [montoTexto, setMontoTexto] = useState(
    transaccion ? formatNumberVE(transaccion.montoUSD) : ""
  );
  // El modal se monta desde un clic (nunca en SSR): hoy como default es seguro.
  const [fecha, setFecha] = useState(transaccion?.fecha ?? fmtISO(new Date()));
  const [descripcion, setDescripcion] = useState(transaccion?.descripcion ?? "");
  /** null = mini-form de alta rápida cerrado. */
  const [nuevaCatNombre, setNuevaCatNombre] = useState<string | null>(null);

  const opciones = categoriasParaTipo(finanzas.categoriasDe(empresa.key), empresa.key, tipo);
  const monto = parseVES(montoTexto);
  // Alta: tasa global vigente. Edición: se conserva el snapshot histórico.
  const tasaAplicada = transaccion ? transaccion.tasaBs : finanzas.tasa;

  const cambiarTipo = (t: TipoTransaccion) => {
    setTipo(t);
    // Si la categoría elegida no aplica al nuevo flujo, se limpia.
    const sigueValida = categoriasParaTipo(
      finanzas.categoriasDe(empresa.key),
      empresa.key,
      t
    ).some((c) => c.id === categoriaId);
    if (!sigueValida) setCategoriaId("");
  };

  const crearCategoriaRapida = () => {
    const nombre = (nuevaCatNombre ?? "").trim();
    if (!nombre) {
      onToast("Indica el nombre de la nueva categoría");
      return;
    }
    // El id que recibirá se conoce antes de despachar (nextCategoriaId).
    const nuevoId = finanzas.nextCategoriaId;
    finanzas.crearCategoria(empresa.key, nombre, tipo);
    setCategoriaId(nuevoId);
    setNuevaCatNombre(null);
    onToast("Categoría creada");
  };

  const guardar = () => {
    if (monto <= 0) {
      onToast("Indica un monto en USD mayor que cero");
      return;
    }
    if (categoriaId === "" || !opciones.some((c) => c.id === categoriaId)) {
      onToast("Selecciona una categoría");
      return;
    }
    if (!fecha) {
      onToast("Indica la fecha del movimiento");
      return;
    }
    if (!descripcion.trim()) {
      onToast("Indica una descripción");
      return;
    }
    if (tasaAplicada <= 0) {
      onToast("Indica una tasa Bs/USD válida antes de registrar");
      return;
    }
    const datos = {
      empresaId: empresa.key,
      tipo,
      categoriaId,
      montoUSD: round2(monto),
      fecha,
      descripcion: descripcion.trim(),
    };
    if (transaccion) {
      finanzas.editarTransaccion(transaccion.id, datos);
      onToast("Movimiento actualizado");
    } else {
      finanzas.crearTransaccion(datos);
      onToast("Movimiento registrado");
    }
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={transaccion ? "Editar movimiento" : "Nueva transacción"}
      subtitle={`Finanzas ${empresa.nombre.replace(", C.A.", "")} · montos siempre en USD`}
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
            {transaccion ? "Guardar cambios" : "Registrar movimiento"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Tipo</label>
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            <button onClick={() => cambiarTipo("entrada")} className={tipoCls(tipo === "entrada")}>
              Entrada
            </button>
            <button onClick={() => cambiarTipo("salida")} className={tipoCls(tipo === "salida")}>
              Salida
            </button>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-600 text-navy-900">Categoría</label>
            {nuevaCatNombre === null && (
              <button
                onClick={() => setNuevaCatNombre("")}
                className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
              >
                <Plus className="h-3.5 w-3.5" /> Nueva categoría
              </button>
            )}
          </div>
          {nuevaCatNombre === null ? (
            <select
              value={categoriaId}
              onChange={(e) =>
                setCategoriaId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={inputCls}
            >
              <option value="">Selecciona…</option>
              {opciones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                placeholder={`Nombre (categoría de ${tipo})`}
                value={nuevaCatNombre}
                onChange={(e) => setNuevaCatNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") crearCategoriaRapida();
                }}
                className={inputCls}
              />
              <button
                onClick={crearCategoriaRapida}
                className="whitespace-nowrap rounded-xl bg-navy-900 px-3 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
              >
                Crear
              </button>
              <button
                onClick={() => setNuevaCatNombre(null)}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Monto (USD)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={montoTexto}
              onChange={(e) => setMontoTexto(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-right font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
            />
            <p className="mt-1 text-right font-mono text-[11px] text-slate-400">
              {monto > 0 && tasaAplicada > 0
                ? `≈ ${money(monto * tasaAplicada, "Bs")}`
                : `Tasa ${money(tasaAplicada, "Bs")} / USD`}
            </p>
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

        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Descripción</label>
          <textarea
            rows={2}
            placeholder="Ej: diésel unidades de vacuum"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          ></textarea>
        </div>
      </div>
    </Modal>
  );
}
