"use client";

import { useState } from "react";
import { Building, FileDown, Hash, Percent, Plus, Save, UserCheck, X } from "lucide-react";
import { LOTER_DIRECCION, LOTER_RAZON, LOTER_RIF } from "@/lib/config";
import { money } from "@/lib/format";
import { calcularLinea, MESES, totalizar } from "@/lib/negocio/retenciones";
import type { LineaRetencion, PorcentajeRetencion } from "@/lib/types";

const inp =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-navy-400 focus:ring-1 focus:ring-navy-100";
const num = inp + " text-right font-mono";

function nuevaLinea(id: number): LineaRetencion {
  return {
    id,
    numOp: String(id),
    fechaDoc: "",
    numFactura: "",
    numControl: "",
    notaDebito: "",
    notaCredito: "",
    tipo: "01",
    totalConIva: "",
    sinCredito: "",
    baseImponible: "",
  };
}

export function ComprobanteRetencion() {
  const [pct, setPct] = useState<PorcentajeRetencion>(100);
  // Arranca con una fila, como el boceto (agregarFila() al cargar).
  const [lineas, setLineas] = useState<LineaRetencion[]>([nuevaLinea(1)]);
  const [nextId, setNextId] = useState(2);

  const agregarFila = () => {
    setLineas((ls) => [...ls, nuevaLinea(nextId)]);
    setNextId((n) => n + 1);
  };

  const quitarFila = (id: number) => setLineas((ls) => ls.filter((l) => l.id !== id));

  const editar = (id: number, campo: keyof LineaRetencion, valor: string) =>
    setLineas((ls) => ls.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));

  const totales = totalizar(lineas, pct);
  const fmt = (n: number) => money(n, "Bs");

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {/* Cabecera del comprobante */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Agente de retención (LOTER, precargado) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Building className="h-4 w-4 text-navy-600" />
            <h2 className="font-display text-sm font-700 text-navy-950">Agente de retención</h2>
            <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-600 text-navy-600">
              Datos fijos
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
                Nombre o razón social
              </label>
              <input
                value={LOTER_RAZON}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-600 text-navy-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
                RIF del agente
              </label>
              <input
                value={LOTER_RIF}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm font-600 text-navy-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
                Dirección fiscal
              </label>
              <input
                value={LOTER_DIRECCION}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-navy-700"
              />
            </div>
          </div>
        </section>

        {/* Datos del comprobante */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Hash className="h-4 w-4 text-navy-600" />
            <h2 className="font-display text-sm font-700 text-navy-950">Comprobante</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
                N° de comprobante
              </label>
              <input
                defaultValue="20260600000050"
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm font-600 text-navy-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
                Fecha de emisión
              </label>
              <input
                type="date"
                defaultValue="2026-06-18"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
                  Año
                </label>
                <input
                  type="number"
                  defaultValue={2026}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
                  Mes
                </label>
                <select
                  defaultValue="Junio"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                >
                  {MESES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Sujeto retenido + % retención */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-navy-600" />
            <h2 className="font-display text-sm font-700 text-navy-950">
              Sujeto retenido (proveedor)
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
                Nombre o razón social
              </label>
              <input
                placeholder="Ej: GO Wireline Services, C.A."
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
                RIF del sujeto retenido
              </label>
              <input
                placeholder="J-00000000-0"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
                Dirección fiscal
              </label>
              <input
                placeholder="Dirección del proveedor"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
              />
            </div>
          </div>
        </section>

        {/* Porcentaje de retención */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-1 flex items-center gap-2">
            <Percent className="h-4 w-4 text-gold-600" />
            <h2 className="font-display text-sm font-700 text-navy-950">% de retención del IVA</h2>
          </div>
          <p className="mb-4 text-xs text-slate-400">Sobre el 16% del impuesto. Depende del proveedor.</p>
          <div className="grid grid-cols-2 gap-3">
            {([75, 100] as PorcentajeRetencion[]).map((p) => (
              <label key={p} className="cursor-pointer">
                <input
                  type="radio"
                  name="pct"
                  value={p}
                  checked={pct === p}
                  onChange={() => setPct(p)}
                  className="peer sr-only"
                />
                <div className="rounded-xl border-2 border-slate-200 p-4 text-center transition peer-checked:border-navy-700 peer-checked:bg-navy-50">
                  <p className="font-display text-2xl font-700 text-navy-950">{p}%</p>
                  <p className="text-xs text-slate-400">
                    {p === 75 ? "Retención parcial" : "Retención total"}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </section>
      </div>

      {/* Detalle de documentos */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-display text-sm font-700 text-navy-950">
              Detalle de facturas a retener
            </h2>
            <p className="text-xs text-slate-400">
              Alícuota fija 16% · el IVA retenido se calcula solo
            </p>
          </div>
          <button
            type="button"
            onClick={agregarFila}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" /> Agregar fila
          </button>
        </div>

        <div className="table-wrap">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-600">N° Op.</th>
                <th className="px-3 py-3 font-600">Fecha doc.</th>
                <th className="px-3 py-3 font-600">N° Factura</th>
                <th className="px-3 py-3 font-600">N° Control</th>
                <th className="px-3 py-3 font-600">Nota Déb.</th>
                <th className="px-3 py-3 font-600">Nota Créd.</th>
                <th className="px-3 py-3 font-600">Tipo</th>
                <th className="px-3 py-3 text-right font-600">Total c/IVA</th>
                <th className="px-3 py-3 text-right font-600">Sin crédito</th>
                <th className="px-3 py-3 text-right font-600">Base imponible</th>
                <th className="px-3 py-3 text-center font-600">Alíc.</th>
                <th className="px-3 py-3 text-right font-600">Impuesto IVA</th>
                <th className="px-3 py-3 text-right font-600">IVA retenido</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lineas.map((l) => {
                const c = calcularLinea(l.baseImponible, pct);
                return (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <td className="px-2 py-2">
                      <input
                        className={`${num} w-12`}
                        value={l.numOp}
                        onChange={(e) => editar(l.id, "numOp", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        className={`${inp} w-32`}
                        value={l.fechaDoc}
                        onChange={(e) => editar(l.id, "fechaDoc", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={`${inp} w-24`}
                        placeholder="N°"
                        value={l.numFactura}
                        onChange={(e) => editar(l.id, "numFactura", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={`${inp} w-24`}
                        placeholder="N°"
                        value={l.numControl}
                        onChange={(e) => editar(l.id, "numControl", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={`${inp} w-20`}
                        placeholder="—"
                        value={l.notaDebito}
                        onChange={(e) => editar(l.id, "notaDebito", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={`${inp} w-20`}
                        placeholder="—"
                        value={l.notaCredito}
                        onChange={(e) => editar(l.id, "notaCredito", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className={`${inp} w-20`}
                        value={l.tipo}
                        onChange={(e) => editar(l.id, "tipo", e.target.value)}
                      >
                        <option>01</option>
                        <option>02</option>
                        <option>03</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={`${num} w-28`}
                        placeholder="0,00"
                        value={l.totalConIva}
                        onChange={(e) => editar(l.id, "totalConIva", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={`${num} w-24`}
                        placeholder="0,00"
                        value={l.sinCredito}
                        onChange={(e) => editar(l.id, "sinCredito", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={`${num} w-28`}
                        placeholder="0,00"
                        value={l.baseImponible}
                        onChange={(e) => editar(l.id, "baseImponible", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-slate-400">16%</td>
                    <td className="px-2 py-2 text-right font-mono font-600 text-navy-900">
                      {fmt(c.impuesto)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono font-600 text-gold-600">
                      {fmt(c.retenido)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => quitarFila(l.id)}
                        className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50/60 font-600 text-navy-900">
                <td colSpan={9} className="px-3 py-3 text-right">
                  Totales
                </td>
                <td className="px-3 py-3 text-right font-mono">{fmt(totales.base)}</td>
                <td></td>
                <td className="px-3 py-3 text-right font-mono">{fmt(totales.impuesto)}</td>
                <td className="px-3 py-3 text-right font-mono text-gold-600">{fmt(totales.retenido)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Firmas + acciones */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-2">
          <h2 className="mb-4 font-display text-sm font-700 text-navy-950">Firmas y fechas</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-400">
                Firma del agente de retención
              </p>
              <div className="flex h-20 items-end justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 pb-2 text-xs text-slate-400">
                LOTER, C.A.
              </div>
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-400">
                Firma del sujeto retenido
              </p>
              <div className="flex h-20 items-end justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 pb-2 text-xs text-slate-400">
                Proveedor
              </div>
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
              />
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-2xl border border-navy-200 bg-navy-50/40 p-5 shadow-card">
          <div>
            <h2 className="font-display text-sm font-700 text-navy-950">Generar comprobante</h2>
            <p className="mt-1 text-xs text-slate-500">
              Se exportará en PDF con el formato oficial de LOTER, C.A.
            </p>
          </div>
          <div className="mt-4 space-y-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 text-sm font-600 text-white hover:bg-navy-800"
            >
              <FileDown className="h-[18px] w-[18px]" /> Generar PDF
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
            >
              <Save className="h-4 w-4" /> Guardar borrador
            </button>
          </div>
        </section>
      </div>
    </form>
  );
}
