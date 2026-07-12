"use client";

/**
 * Alta/edición de una factura de compra: subida del PDF con visor al lado y
 * cálculo automático de IVA entre los 4 campos (el último editado manda):
 *   impuestoIVA = base × 16%; total = base + impuesto + compraSinDerechoACredito;
 *   editar el total invierte: base = (total − sinCredito) / 1,16.
 *
 * Con `proveedorLibre` (alta desde el Libro de Compras) el selector de
 * proveedores se sustituye por RIF + razón social escritos a mano: al guardar
 * se reutiliza el proveedor con ese RIF o se crea uno nuevo.
 */
import { useRef, useState } from "react";
import { Plus, UploadCloud } from "lucide-react";
import type { FacturaRecibida, TipoTransaccionCompra } from "@/lib/types";
import { fmtISO, formatNumberVE, parseVES } from "@/lib/format";
import { derivarMontosFacturaRecibida, impuestoDeBase } from "@/lib/negocio/compras";
import { round2 } from "@/lib/negocio/nomina";
import { Modal } from "@/components/ui/Modal";
import { useFacturacion } from "../FacturacionProvider";
import { VisorPdf } from "../VisorPdf";
import { ProveedorModal } from "./ProveedorModal";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function FacturaRecibidaModal({
  compra,
  proveedorLibre = false,
  fechaInicial,
  onGuardado,
  onToast,
  onClose,
}: {
  compra: FacturaRecibida | null;
  /** Escribir RIF + razón social en vez de elegir de la lista de proveedores. */
  proveedorLibre?: boolean;
  /** Fecha por defecto en el alta (el libro pasa el inicio del corte visible). */
  fechaInicial?: string;
  /** Fecha con la que quedó guardada (el libro avisa si cae fuera del corte). */
  onGuardado?: (fecha: string) => void;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const fac = useFacturacion();
  const proveedorDeCompra = compra ? fac.proveedorPorId(compra.proveedorId) : undefined;

  const [proveedorId, setProveedorId] = useState<number | "">(compra?.proveedorId ?? "");
  const [rif, setRif] = useState(proveedorDeCompra?.rif ?? "");
  const [razonSocial, setRazonSocial] = useState(proveedorDeCompra?.razonSocial ?? "");
  const [numeroFactura, setNumeroFactura] = useState(compra?.numeroFactura ?? "");
  const [numeroControl, setNumeroControl] = useState(compra?.numeroControl ?? "");
  const [fecha, setFecha] = useState(compra?.fecha ?? fechaInicial ?? fmtISO(new Date()));
  const [fechaVencimiento, setFechaVencimiento] = useState(compra?.fechaVencimiento ?? "");
  const [notaDebito, setNotaDebito] = useState(compra?.notaDebito ?? "");
  const [notaCredito, setNotaCredito] = useState(compra?.notaCredito ?? "");
  const [facturaAfectada, setFacturaAfectada] = useState(compra?.facturaAfectada ?? "");
  const [tipoTransaccion, setTipoTransaccion] = useState<TipoTransaccionCompra>(
    compra?.tipoTransaccion ?? "01"
  );
  const [baseTexto, setBaseTexto] = useState(
    compra ? formatNumberVE(compra.baseImponibleBs) : ""
  );
  const [sinCreditoTexto, setSinCreditoTexto] = useState(
    compra ? formatNumberVE(compra.sinCreditoBs) : "0,00"
  );
  const [totalTexto, setTotalTexto] = useState(
    compra ? formatNumberVE(compra.totalConIvaBs) : ""
  );
  const [baseNegativa, setBaseNegativa] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(compra?.pdfUrl);
  const [pdfNombre, setPdfNombre] = useState(compra?.pdfNombre);
  const [modalProveedor, setModalProveedor] = useState(false);
  const creados = useRef<string[]>([]);

  const base = round2(parseVES(baseTexto));
  const impuesto = impuestoDeBase(base);

  const alSubir = (f: File | undefined) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    creados.current.push(url);
    setPdfUrl(url);
    setPdfNombre(f.name);
  };

  /* El último campo editado manda (función pura derivarMontosFacturaRecibida):
     base o sin-derecho ⇒ total = base + IVA + sinCredito;
     total ⇒ base = (total − sinCredito) / 1,16 (negativa ⇒ error). */
  const alCambiarBase = (texto: string) => {
    setBaseTexto(texto);
    const r = derivarMontosFacturaRecibida("base", {
      baseBs: parseVES(texto),
      sinCreditoBs: parseVES(sinCreditoTexto),
      totalBs: 0,
    });
    setTotalTexto(formatNumberVE(r.totalBs));
    setBaseNegativa(false);
  };

  const alCambiarSinCredito = (texto: string) => {
    setSinCreditoTexto(texto);
    const r = derivarMontosFacturaRecibida("sinCredito", {
      baseBs: parseVES(baseTexto),
      sinCreditoBs: parseVES(texto),
      totalBs: 0,
    });
    setTotalTexto(formatNumberVE(r.totalBs));
    setBaseNegativa(false);
  };

  const alCambiarTotal = (texto: string) => {
    setTotalTexto(texto);
    const r = derivarMontosFacturaRecibida("total", {
      baseBs: parseVES(baseTexto),
      sinCreditoBs: parseVES(sinCreditoTexto),
      totalBs: parseVES(texto),
    });
    if (r.baseNegativa) {
      setBaseNegativa(true);
      return;
    }
    setBaseNegativa(false);
    setBaseTexto(formatNumberVE(r.baseBs));
  };

  const cerrar = (urlGuardada?: string) => {
    creados.current.filter((u) => u !== urlGuardada).forEach((u) => URL.revokeObjectURL(u));
    onClose();
  };

  /** Proveedor del RIF escrito: se reutiliza el existente o se crea al vuelo.
      El id del nuevo se conoce antes de despachar (patrón de ProveedorModal). */
  const resolverProveedorPorRif = (): number => {
    const rifNorm = rif.trim().toUpperCase();
    const existente = fac.proveedores.find((p) => p.rif.trim().toUpperCase() === rifNorm);
    if (existente) return existente.id;
    const id = fac.nextProveedorId;
    fac.crearProveedor({ razonSocial: razonSocial.trim(), rif: rif.trim(), direccion: "", tipo: "" });
    return id;
  };

  const guardar = () => {
    if (proveedorLibre) {
      if (!rif.trim()) return onToast("Indica el RIF del proveedor");
      if (!razonSocial.trim()) return onToast("Indica el nombre o razón social");
    } else if (proveedorId === "") {
      return onToast("Selecciona el proveedor");
    }
    if (!numeroFactura.trim()) return onToast("Indica el N° de factura");
    if (!numeroControl.trim()) return onToast("Indica el N° de control");
    if (!fecha) return onToast("Indica la fecha del documento");
    if (baseNegativa)
      return onToast("Corrige el total: no puede ser menor que la compra sin derecho a crédito");
    const total = round2(parseVES(totalTexto));
    if (base <= 0) return onToast("Indica la base imponible (o el total con IVA)");
    if (total <= 0) return onToast("Indica el total de compras con IVA");
    const datos = {
      proveedorId: proveedorLibre ? resolverProveedorPorRif() : (proveedorId as number),
      numeroFactura: numeroFactura.trim(),
      numeroControl: numeroControl.trim(),
      fecha,
      ...(notaDebito.trim() ? { notaDebito: notaDebito.trim() } : {}),
      ...(notaCredito.trim() ? { notaCredito: notaCredito.trim() } : {}),
      ...(facturaAfectada.trim() ? { facturaAfectada: facturaAfectada.trim() } : {}),
      ...(fechaVencimiento ? { fechaVencimiento } : {}),
      tipoTransaccion,
      totalConIvaBs: total,
      sinCreditoBs: round2(parseVES(sinCreditoTexto)),
      baseImponibleBs: base,
      impuestoIvaBs: impuesto,
      ...(pdfUrl ? { pdfUrl, pdfNombre } : {}),
    };
    if (compra) {
      fac.editarFacturaRecibida(compra.id, datos);
      onToast("Factura recibida actualizada");
    } else {
      fac.crearFacturaRecibida(datos);
      onToast("Factura recibida registrada");
    }
    onGuardado?.(fecha);
    cerrar(pdfUrl);
  };

  return (
    <>
      <Modal
        onClose={() => cerrar(compra?.pdfUrl)}
        title={compra ? "Editar factura recibida" : "Nueva factura recibida"}
        subtitle="Compra a proveedor · montos en Bs"
        maxWidth="max-w-6xl"
        footer={
          <>
            <button
              onClick={() => cerrar(compra?.pdfUrl)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
            >
              {compra ? "Guardar cambios" : "Registrar factura"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Visor + subida */}
          <div className="flex flex-col gap-3">
            <label className="group flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-600 text-navy-700 transition hover:border-navy-400 hover:bg-navy-50/30">
              <UploadCloud className="h-4 w-4" />
              {pdfNombre ? `Reemplazar PDF (${pdfNombre})` : "Subir PDF de la factura"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => alSubir(e.target.files?.[0])}
              />
            </label>
            <div className="min-h-0 flex-1">
              <VisorPdf url={pdfUrl} nombre={pdfNombre} />
            </div>
          </div>

          {/* Formulario */}
          <div className="space-y-3">
            {proveedorLibre ? (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-600 text-navy-900">RIF</label>
                  <input
                    type="text"
                    value={rif}
                    onChange={(e) => setRif(e.target.value)}
                    placeholder="J-00000000-0"
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-600 text-navy-900">
                    Nombre o Razón Social
                  </label>
                  <input
                    type="text"
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-600 text-navy-900">Proveedor</label>
                  <button
                    onClick={() => setModalProveedor(true)}
                    className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
                  >
                    <Plus className="h-3.5 w-3.5" /> Nuevo proveedor
                  </button>
                </div>
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value === "" ? "" : Number(e.target.value))}
                  className={inputCls}
                >
                  <option value="">Selecciona…</option>
                  {fac.proveedores.map((p) => (
                    <option key={p.id} value={p.id}>{p.razonSocial}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">N° Factura</label>
                <input type="text" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} className={`${inputCls} font-mono`} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">N° Control</label>
                <input type="text" value={numeroControl} onChange={(e) => setNumeroControl(e.target.value)} className={`${inputCls} font-mono`} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">Fecha</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">N° Nota de Débito</label>
                <input type="text" value={notaDebito} onChange={(e) => setNotaDebito(e.target.value)} placeholder="Opcional" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">N° Nota de Crédito</label>
                <input type="text" value={notaCredito} onChange={(e) => setNotaCredito(e.target.value)} placeholder="Opcional" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">N° Factura afectada</label>
                <input type="text" value={facturaAfectada} onChange={(e) => setFacturaAfectada(e.target.value)} placeholder="Opcional" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">Tipo de transacción</label>
                <select value={tipoTransaccion} onChange={(e) => setTipoTransaccion(e.target.value as TipoTransaccionCompra)} className={inputCls}>
                  <option value="01">01 — Registro</option>
                  <option value="02">02 — Complemento</option>
                  <option value="03">03 — Anulación</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">
                  Vence el <span className="font-400 text-slate-400">(opcional)</span>
                </label>
                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  title="Fecha pactada de pago (Cuentas por Pagar)"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <p className="mb-2 text-[11px] font-600 uppercase tracking-wide text-slate-400">
                Montos (Bs) — cálculo automático: el último campo editado manda
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-600 text-navy-900">Base Imponible</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={baseTexto}
                    onChange={(e) => alCambiarBase(e.target.value)}
                    className={`${inputCls} text-right font-mono`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-600 text-navy-900">Impuesto IVA 16%</label>
                  <input
                    readOnly
                    value={formatNumberVE(impuesto)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right font-mono text-sm text-slate-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-600 text-navy-900">
                    Compra Sin Derecho a Crédito
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={sinCreditoTexto}
                    onChange={(e) => alCambiarSinCredito(e.target.value)}
                    className={`${inputCls} text-right font-mono`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-600 text-navy-900">
                    Total Compras con IVA
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={totalTexto}
                    onChange={(e) => alCambiarTotal(e.target.value)}
                    className={`${inputCls} text-right font-mono ${
                      baseNegativa ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : ""
                    }`}
                  />
                </div>
              </div>
              {baseNegativa && (
                <p className="mt-2 text-right text-xs font-600 text-rose-600">
                  El total no puede ser menor que la compra sin derecho a crédito (base negativa).
                </p>
              )}
            </div>
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
