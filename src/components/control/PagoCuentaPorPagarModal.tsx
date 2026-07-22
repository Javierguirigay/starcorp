"use client";

/**
 * Registrar pago de una cuenta por pagar: captura los datos fiscales de la
 * factura (N° factura/control, base e IVA) y la categoría de Finanzas, y con
 * ello CONVIERTE el documento en una FacturaRecibida ya pagada (lista para el
 * Libro de Compras y la retención) + asienta la salida en Finanzas LOTER.
 *
 * El cálculo de montos es el mismo del alta de factura recibida (el último
 * campo editado manda): impuesto = base × 16%; total = base + impuesto +
 * sinCredito; editar el total invierte a base = (total − sinCredito) / 1,16.
 */
import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import type { CuentaPorPagar, FacturaRecibida, TipoTransaccionCompra } from "@/lib/types";
import { fmtISO, formatNumberVE, money, parseVES } from "@/lib/format";
import { baseDesdeTotal, derivarMontosFacturaRecibida, impuestoDeBase } from "@/lib/negocio/compras";
import { categoriasParaTipo, convertirMonto, SIMBOLO_MONEDA } from "@/lib/negocio/finanzas";
import { round2 } from "@/lib/negocio/nomina";
import { Modal } from "@/components/ui/Modal";
import { useFinanzas } from "@/components/finanzas/FinanzasProvider";
import { SelectorCuenta } from "@/components/finanzas/SelectorCuenta";
import { useFacturacion } from "@/components/facturacion/FacturacionProvider";
import { VisorPdf } from "@/components/facturacion/VisorPdf";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function PagoCuentaPorPagarModal({
  cuenta,
  onToast,
  onClose,
  onPagada,
}: {
  cuenta: CuentaPorPagar;
  onToast: (msg: string) => void;
  onClose: () => void;
  /** Se invoca con la factura recibida recién creada para encadenar la retención. */
  onPagada?: (factura: FacturaRecibida) => void;
}) {
  const fac = useFacturacion();
  const finanzas = useFinanzas();
  // Empresa activa: sus categorías/cuentas de Finanzas reciben la salida.
  const empresaId = fac.empresa.key;
  const proveedor = fac.proveedorPorId(cuenta.proveedorId);

  const opcionesCategoria = categoriasParaTipo(
    finanzas.categoriasDe(empresaId),
    empresaId,
    "salida"
  );
  const gastosOperativos = opcionesCategoria.find((c) => c.nombre === "Gastos Operativos");
  const [categoriaId, setCategoriaId] = useState<number | "">(
    gastosOperativos?.id ?? opcionesCategoria[0]?.id ?? ""
  );
  // Cuenta de Finanzas desde donde sale el pago (predeterminada de LOTER).
  const [cuentaId, setCuentaId] = useState<number | "">(
    () => finanzas.cuentaPredeterminadaDe(empresaId)?.id ?? ""
  );

  const [numeroFactura, setNumeroFactura] = useState(
    cuenta.tipo === "factura" ? cuenta.numeroDocumento : ""
  );
  const [numeroControl, setNumeroControl] = useState("");
  const [fecha, setFecha] = useState(cuenta.fecha);
  const [tipoTransaccion, setTipoTransaccion] = useState<TipoTransaccionCompra>("01");
  // El total viene del documento; la base se deriva (sin crédito = 0 por defecto).
  const [sinCreditoTexto, setSinCreditoTexto] = useState("0,00");
  const [totalTexto, setTotalTexto] = useState(formatNumberVE(cuenta.totalBs));
  const [baseTexto, setBaseTexto] = useState(formatNumberVE(baseDesdeTotal(cuenta.totalBs, 0)));
  const [baseNegativa, setBaseNegativa] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(cuenta.pdfUrl);
  const [pdfNombre, setPdfNombre] = useState(cuenta.pdfNombre);
  const creados = useRef<string[]>([]);

  const base = round2(parseVES(baseTexto));
  const impuesto = impuestoDeBase(base);
  const total = round2(parseVES(totalTexto));
  const cuentaPago =
    cuentaId === ""
      ? undefined
      : finanzas.cuentasDe(empresaId).find((c) => c.id === cuentaId);

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

  const alSubir = (f: File | undefined) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    creados.current.push(url);
    setPdfUrl(url);
    setPdfNombre(f.name);
  };

  const cerrar = (urlGuardada?: string) => {
    creados.current.filter((u) => u !== urlGuardada).forEach((u) => URL.revokeObjectURL(u));
    onClose();
  };

  const pagar = (conRetencion: boolean) => {
    if (!numeroFactura.trim()) return onToast("Indica el N° de factura");
    if (!numeroControl.trim()) return onToast("Indica el N° de control");
    if (!fecha) return onToast("Indica la fecha de la factura");
    if (baseNegativa)
      return onToast("Corrige el total: no puede ser menor que la compra sin derecho a crédito");
    if (base <= 0) return onToast("Indica la base imponible (o el total con IVA)");
    if (total <= 0) return onToast("Indica el total de compras con IVA");
    if (categoriaId === "") return onToast("Selecciona la categoría de Finanzas (salida)");
    if (cuentaId === "") return onToast("Selecciona la cuenta desde donde se paga");
    if (finanzas.tasa <= 0)
      return onToast("Indica una tasa Bs/USD válida antes de registrar el pago");

    const nuevaId = fac.nextFacturaRecibidaId;
    const datos = {
      proveedorId: cuenta.proveedorId,
      numeroFactura: numeroFactura.trim(),
      numeroControl: numeroControl.trim(),
      fecha,
      tipoTransaccion,
      totalConIvaBs: total,
      sinCreditoBs: round2(parseVES(sinCreditoTexto)),
      baseImponibleBs: base,
      impuestoIvaBs: impuesto,
      ...(pdfUrl ? { pdfUrl, pdfNombre } : {}),
    };
    fac.pagarCuentaPorPagar(cuenta.id, datos);
    finanzas.registrarPagoCompra(
      {
        id: nuevaId,
        numeroFactura: datos.numeroFactura,
        totalBs: total,
        proveedorNombre: proveedor?.razonSocial ?? "—",
        fecha: fmtISO(new Date()),
        categoriaId: categoriaId as number,
      },
      empresaId,
      cuentaId as number
    );
    if (conRetencion && onPagada) {
      // La factura recibida ya existe en el store; encadenamos su retención.
      const nuevaFactura: FacturaRecibida = {
        id: nuevaId,
        empresaId: cuenta.empresaId,
        ...datos,
        estado: "pagada",
      };
      creados.current
        .filter((u) => u !== pdfUrl)
        .forEach((u) => URL.revokeObjectURL(u));
      onPagada(nuevaFactura);
      return;
    }
    onToast(
      `Pago registrado · convertida en factura recibida (salida en Finanzas ${fac.empresa.nombre})`
    );
    cerrar(pdfUrl);
  };

  return (
    <Modal
      onClose={() => cerrar(cuenta.pdfUrl)}
      title={`Registrar pago · ${cuenta.numeroDocumento}`}
      subtitle={`${proveedor?.razonSocial ?? ""} · se convierte en factura recibida pagada`}
      maxWidth="max-w-5xl"
      footer={
        <>
          <button
            onClick={() => cerrar(cuenta.pdfUrl)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => pagar(false)}
            className="rounded-xl border border-emerald-600 bg-white px-4 py-2.5 text-sm font-600 text-emerald-700 hover:bg-emerald-50"
          >
            Confirmar pago
          </button>
          <button
            onClick={() => pagar(true)}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-600 text-white hover:bg-emerald-700"
          >
            Pagar y hacer retención
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Visor + subida del PDF de la factura */}
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

        {/* Datos fiscales + categoría */}
        <div className="space-y-3">
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

          <div>
            <label className="mb-1 block text-sm font-600 text-navy-900">Tipo de transacción</label>
            <select value={tipoTransaccion} onChange={(e) => setTipoTransaccion(e.target.value as TipoTransaccionCompra)} className={inputCls}>
              <option value="01">01 — Registro</option>
              <option value="02">02 — Complemento</option>
              <option value="03">03 — Anulación</option>
            </select>
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
                <label className="mb-1 block text-sm font-600 text-navy-900">Total Compras con IVA</label>
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

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
            <label className="mb-1 block text-sm font-600 text-navy-900">
              Categoría de Finanzas (salida)
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value === "" ? "" : Number(e.target.value))}
              className={inputCls}
            >
              {opcionesCategoria.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <label className="mb-1 mt-3 block text-sm font-600 text-navy-900">
              Cuenta desde donde se paga
            </label>
            <SelectorCuenta empresaId={empresaId} value={cuentaId} onChange={setCuentaId} />
            <p className="mt-2 text-xs text-emerald-800/80">
              {finanzas.tasa > 0
                ? cuentaPago && cuentaPago.moneda !== "VES"
                  ? `Salida de ${money(
                      convertirMonto(total, "VES", cuentaPago.moneda, finanzas.tasa),
                      SIMBOLO_MONEDA[cuentaPago.moneda]
                    )} a la tasa vigente (${money(finanzas.tasa, "Bs")}/USD).`
                  : `Salida de ${money(total, "Bs")} de la cuenta seleccionada.`
                : "Indica una tasa Bs/USD válida para registrar el egreso."}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
