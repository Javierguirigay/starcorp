"use client";

/**
 * Editor del comprobante de retención de IVA (módulo de Retenciones migrado
 * a Gestión de Compras). Puede nacer pre-llenado desde una factura recibida
 * (sujeto retenido = proveedor + línea de detalle) o crearse manualmente.
 * N° de comprobante automático AAAAMM + correlativo de 8 dígitos, editable.
 */
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { FacturaRecibida, PorcentajeRetencion, TipoTransaccionCompra } from "@/lib/types";
import { LOTER_DIRECCION, LOTER_RAZON, LOTER_RIF } from "@/lib/config";
import { fmtISO, formatNumberVE, money, parseVES } from "@/lib/format";
import { derivarMontosFacturaRecibida } from "@/lib/negocio/compras";
import { MESES, retenidoDeImpuesto, totalizarLineas } from "@/lib/negocio/retenciones";
import { round2 } from "@/lib/negocio/nomina";
import { ALICUOTA_IVA } from "@/lib/negocio/retenciones";
import { Modal } from "@/components/ui/Modal";
import { useFacturacion } from "../FacturacionProvider";
import { ProveedorModal } from "./ProveedorModal";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-100";
const inputLgCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";
const roCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600";

interface LineaForm {
  key: number;
  fechaDoc: string;
  numFactura: string;
  numControl: string;
  notaDebito: string;
  notaCredito: string;
  facturaAfectada: string;
  tipo: TipoTransaccionCompra;
  totalTexto: string;
  sinCreditoTexto: string;
  baseTexto: string;
}

export function RetencionEditor({
  compra,
  onToast,
  onClose,
}: {
  /** Factura recibida origen (pre-llenado total); null = creación manual. */
  compra?: FacturaRecibida | null;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const fac = useFacturacion();

  const hoy = fmtISO(new Date());
  const [anioMesInicial] = useState(() => {
    const base = compra?.fecha ?? hoy;
    return { anio: Number(base.slice(0, 4)), mes: Number(base.slice(5, 7)) };
  });

  const [pct, setPct] = useState<PorcentajeRetencion>(75);
  const [periodoAnio, setPeriodoAnio] = useState(anioMesInicial.anio);
  const [periodoMes, setPeriodoMes] = useState(anioMesInicial.mes);
  const [comprobante, setComprobante] = useState(() =>
    fac.siguienteComprobanteDe(anioMesInicial.anio, anioMesInicial.mes)
  );
  const [fechaEmision, setFechaEmision] = useState(hoy);
  const [proveedorId, setProveedorId] = useState<number | "">(compra?.proveedorId ?? "");
  const [modalProveedor, setModalProveedor] = useState(false);
  const [lineas, setLineas] = useState<LineaForm[]>(() =>
    compra
      ? [
          {
            key: 1,
            fechaDoc: compra.fecha,
            numFactura: compra.numeroFactura,
            numControl: compra.numeroControl,
            notaDebito: compra.notaDebito ?? "",
            notaCredito: compra.notaCredito ?? "",
            facturaAfectada: compra.facturaAfectada ?? "",
            tipo: compra.tipoTransaccion,
            totalTexto: formatNumberVE(compra.totalConIvaBs),
            sinCreditoTexto: formatNumberVE(compra.sinCreditoBs),
            baseTexto: formatNumberVE(compra.baseImponibleBs),
          },
        ]
      : [
          {
            key: 1,
            fechaDoc: "",
            numFactura: "",
            numControl: "",
            notaDebito: "",
            notaCredito: "",
            facturaAfectada: "",
            tipo: "01",
            totalTexto: "",
            sinCreditoTexto: "0,00",
            baseTexto: "",
          },
        ]
  );
  const [nextKey, setNextKey] = useState(2);

  const proveedor = proveedorId === "" ? undefined : fac.proveedorPorId(proveedorId);

  const calculo = (l: LineaForm) => {
    const base = round2(parseVES(l.baseTexto));
    const impuesto = round2(base * ALICUOTA_IVA);
    return { base, impuesto, retenido: retenidoDeImpuesto(impuesto, pct) };
  };
  const totales = {
    total: round2(lineas.reduce((s, l) => s + parseVES(l.totalTexto), 0)),
    sinCredito: round2(lineas.reduce((s, l) => s + parseVES(l.sinCreditoTexto), 0)),
    base: round2(lineas.reduce((s, l) => s + calculo(l).base, 0)),
    impuesto: round2(lineas.reduce((s, l) => s + calculo(l).impuesto, 0)),
    retenido: round2(lineas.reduce((s, l) => s + calculo(l).retenido, 0)),
  };

  const editar = (key: number, cambios: Partial<LineaForm>) =>
    setLineas((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const nuevo = { ...l, ...cambios };
        // Mismo cálculo automático que la factura recibida: el campo editado manda.
        const campo =
          "baseTexto" in cambios ? "base" : "sinCreditoTexto" in cambios ? "sinCredito" : "totalTexto" in cambios ? "total" : null;
        if (campo) {
          const r = derivarMontosFacturaRecibida(campo, {
            baseBs: parseVES(nuevo.baseTexto),
            sinCreditoBs: parseVES(nuevo.sinCreditoTexto),
            totalBs: parseVES(nuevo.totalTexto),
          });
          if (campo === "total") {
            if (!r.baseNegativa) nuevo.baseTexto = formatNumberVE(r.baseBs);
          } else {
            nuevo.totalTexto = formatNumberVE(r.totalBs);
          }
        }
        return nuevo;
      })
    );

  const cambiarPeriodo = (anio: number, mes: number) => {
    setPeriodoAnio(anio);
    setPeriodoMes(mes);
    setComprobante(fac.siguienteComprobanteDe(anio, mes));
  };

  const guardar = () => {
    const comp = comprobante.trim();
    if (!/^\d{14}$/.test(comp))
      return onToast("El N° de comprobante debe ser AAAAMM + correlativo de 8 dígitos");
    if (fac.retenciones.some((r) => r.comprobante === comp))
      return onToast(`Ya existe el comprobante ${comp}`);
    if (proveedorId === "") return onToast("Selecciona el sujeto retenido (proveedor)");
    if (!fechaEmision) return onToast("Indica la fecha de emisión");
    const validas = lineas.filter((l) => l.numFactura.trim() && calculo(l).base > 0);
    if (!validas.length)
      return onToast("Agrega al menos una línea con N° de factura y base imponible");
    const lineasFinal = validas.map((l, i) => {
      const c = calculo(l);
      return {
        numOp: i + 1,
        fechaDoc: l.fechaDoc || fechaEmision,
        numFactura: l.numFactura.trim(),
        numControl: l.numControl.trim(),
        ...(l.notaDebito.trim() ? { notaDebito: l.notaDebito.trim() } : {}),
        ...(l.notaCredito.trim() ? { notaCredito: l.notaCredito.trim() } : {}),
        ...(l.facturaAfectada.trim() ? { facturaAfectada: l.facturaAfectada.trim() } : {}),
        tipoTransaccion: l.tipo,
        totalConIvaBs: round2(parseVES(l.totalTexto)),
        sinCreditoBs: round2(parseVES(l.sinCreditoTexto)),
        baseImponibleBs: c.base,
        impuestoIvaBs: c.impuesto,
        ivaRetenidoBs: c.retenido,
      };
    });
    fac.crearRetencion({
      comprobante: comp,
      fechaEmision,
      periodoAnio,
      periodoMes,
      proveedorId,
      pct,
      ...(compra ? { facturaRecibidaId: compra.id } : {}),
      lineas: lineasFinal,
      ...totalizarLineas(lineasFinal),
    });
    onToast(`Comprobante ${comp} guardado`);
    onClose();
  };

  return (
    <>
      <Modal
        onClose={onClose}
        title={compra ? `Retención desde Factura ${compra.numeroFactura}` : "Nueva retención IVA"}
        subtitle="Comprobante de retención · Providencia Administrativa SNAT/2025/000054"
        maxWidth="max-w-6xl"
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
              Guardar comprobante
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Comprobante y período */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-sm font-600 text-navy-900">N° Comprobante</label>
              <input
                type="text"
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                className={`${inputLgCls} font-mono`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-600 text-navy-900">Fecha de emisión</label>
              <input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} className={inputLgCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-600 text-navy-900">Período — Año</label>
              <input
                type="number"
                value={periodoAnio}
                onChange={(e) => cambiarPeriodo(parseInt(e.target.value, 10) || periodoAnio, periodoMes)}
                className={`${inputLgCls} text-right font-mono`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-600 text-navy-900">Período — Mes</label>
              <select
                value={periodoMes}
                onChange={(e) => cambiarPeriodo(periodoAnio, Number(e.target.value))}
                className={inputLgCls}
              >
                {MESES.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-600 text-navy-900">% de retención</label>
              <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                {([75, 100] as PorcentajeRetencion[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPct(p)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-600 ${
                      pct === p ? "bg-navy-900 text-white" : "text-slate-500 hover:text-navy-900"
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Agente (fijo) y sujeto retenido */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-2 text-[11px] font-600 uppercase tracking-wide text-slate-400">
                Agente de retención (LOTER)
              </p>
              <div className="space-y-2">
                <input readOnly value={LOTER_RAZON} className={roCls} />
                <input readOnly value={LOTER_RIF} className={roCls} />
                <input readOnly value={LOTER_DIRECCION} className={roCls} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-600 uppercase tracking-wide text-slate-400">
                  Sujeto retenido (proveedor)
                </p>
                {!compra && (
                  <button
                    onClick={() => setModalProveedor(true)}
                    className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
                  >
                    <Plus className="h-3.5 w-3.5" /> Nuevo proveedor
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <select
                  value={proveedorId}
                  disabled={!!compra}
                  onChange={(e) => setProveedorId(e.target.value === "" ? "" : Number(e.target.value))}
                  className={`${inputLgCls} disabled:bg-slate-50 disabled:text-slate-600`}
                >
                  <option value="">Selecciona…</option>
                  {fac.proveedores.map((p) => (
                    <option key={p.id} value={p.id}>{p.razonSocial}</option>
                  ))}
                </select>
                <input readOnly value={proveedor?.rif ?? ""} placeholder="RIF" className={roCls} />
                <input readOnly value={proveedor?.direccion ?? ""} placeholder="Dirección fiscal" className={roCls} />
              </div>
            </div>
          </div>

          {/* Detalle */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-600 text-navy-900">Detalle de facturas</label>
              <button
                onClick={() => {
                  setLineas((prev) => [
                    ...prev,
                    {
                      key: nextKey,
                      fechaDoc: "",
                      numFactura: "",
                      numControl: "",
                      notaDebito: "",
                      notaCredito: "",
                      facturaAfectada: "",
                      tipo: "01",
                      totalTexto: "",
                      sinCreditoTexto: "0,00",
                      baseTexto: "",
                    },
                  ]);
                  setNextKey((k) => k + 1);
                }}
                className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
              >
                <Plus className="h-3.5 w-3.5" /> Añadir línea
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1080px] text-xs">
                <thead>
                  <tr className="bg-slate-50/60 text-left text-[10px] uppercase tracking-wide text-slate-400">
                    <th className="px-2 py-2 font-600">N° Op.</th>
                    <th className="px-2 py-2 font-600">Fecha doc.</th>
                    <th className="px-2 py-2 font-600">N° Factura</th>
                    <th className="px-2 py-2 font-600">N° Control</th>
                    <th className="px-2 py-2 font-600">Nota Déb.</th>
                    <th className="px-2 py-2 font-600">Nota Créd.</th>
                    <th className="px-2 py-2 font-600">Tipo</th>
                    <th className="px-2 py-2 text-right font-600">Total c/IVA</th>
                    <th className="px-2 py-2 text-right font-600">Sin crédito</th>
                    <th className="px-2 py-2 text-right font-600">Base imponible</th>
                    <th className="px-2 py-2 text-center font-600">Alíc.</th>
                    <th className="px-2 py-2 text-right font-600">Impuesto IVA</th>
                    <th className="px-2 py-2 text-right font-600">IVA retenido</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lineas.map((l, i) => {
                    const c = calculo(l);
                    return (
                      <tr key={l.key}>
                        <td className="px-2 py-1.5 text-center font-mono text-slate-500">{i + 1}</td>
                        <td className="px-2 py-1.5">
                          <input type="date" value={l.fechaDoc} onChange={(e) => editar(l.key, { fechaDoc: e.target.value })} className={inputCls} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" value={l.numFactura} onChange={(e) => editar(l.key, { numFactura: e.target.value })} className={`${inputCls} font-mono`} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" value={l.numControl} onChange={(e) => editar(l.key, { numControl: e.target.value })} className={`${inputCls} font-mono`} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" value={l.notaDebito} onChange={(e) => editar(l.key, { notaDebito: e.target.value })} className={inputCls} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" value={l.notaCredito} onChange={(e) => editar(l.key, { notaCredito: e.target.value })} className={inputCls} />
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={l.tipo} onChange={(e) => editar(l.key, { tipo: e.target.value as TipoTransaccionCompra })} className={inputCls}>
                            <option value="01">01</option>
                            <option value="02">02</option>
                            <option value="03">03</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" inputMode="decimal" value={l.totalTexto} onChange={(e) => editar(l.key, { totalTexto: e.target.value })} className={`${inputCls} text-right font-mono`} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" inputMode="decimal" value={l.sinCreditoTexto} onChange={(e) => editar(l.key, { sinCreditoTexto: e.target.value })} className={`${inputCls} text-right font-mono`} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" inputMode="decimal" value={l.baseTexto} onChange={(e) => editar(l.key, { baseTexto: e.target.value })} className={`${inputCls} text-right font-mono`} />
                        </td>
                        <td className="px-2 py-1.5 text-center font-mono text-slate-500">16%</td>
                        <td className="px-2 py-1.5 text-right font-mono text-navy-900">{formatNumberVE(c.impuesto)}</td>
                        <td className="px-2 py-1.5 text-right font-mono font-600 text-navy-950">{formatNumberVE(c.retenido)}</td>
                        <td className="px-2 py-1.5">
                          <button
                            title="Quitar línea"
                            onClick={() => setLineas((prev) => prev.filter((x) => x.key !== l.key))}
                            disabled={lineas.length === 1}
                            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50/60 font-600 text-navy-900">
                    <td colSpan={7} className="px-2 py-2 text-right">Totales (Bs)</td>
                    <td className="px-2 py-2 text-right font-mono">{formatNumberVE(totales.total)}</td>
                    <td className="px-2 py-2 text-right font-mono">{formatNumberVE(totales.sinCredito)}</td>
                    <td className="px-2 py-2 text-right font-mono">{formatNumberVE(totales.base)}</td>
                    <td />
                    <td className="px-2 py-2 text-right font-mono">{formatNumberVE(totales.impuesto)}</td>
                    <td className="px-2 py-2 text-right font-mono text-navy-950">{formatNumberVE(totales.retenido)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-2 text-right text-xs text-slate-400">
              IVA retenido = impuesto × {pct}% · retención {pct === 75 ? "parcial" : "total"} ·{" "}
              <span className="font-mono font-600 text-navy-900">{money(totales.retenido, "Bs")}</span>
            </p>
          </div>
        </div>
      </Modal>

      {modalProveedor && (
        <ProveedorModal
          onCreado={(id) => setProveedorId(id)}
          onToast={onToast}
          onClose={() => setModalProveedor(false)}
        />
      )}
    </>
  );
}
