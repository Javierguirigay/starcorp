"use client";

/**
 * Alta/edición de un documento por pagar (Control Administrativo): factura o
 * nota de entrega pendiente de pago. Es un registro administrativo, NO fiscal:
 * no entra al Libro de Compras ni genera crédito/retención hasta que se paga y
 * se convierte en factura recibida (ver PagoCuentaPorPagarModal).
 */
import { useRef, useState } from "react";
import { Plus, UploadCloud } from "lucide-react";
import type { CuentaPorPagar, TipoDocPorPagar } from "@/lib/types";
import { fmtISO, formatNumberVE, parseVES } from "@/lib/format";
import { round2 } from "@/lib/negocio/nomina";
import { Modal } from "@/components/ui/Modal";
import { useFacturacion } from "@/components/facturacion/FacturacionProvider";
import { VisorPdf } from "@/components/facturacion/VisorPdf";
import { ProveedorModal } from "@/components/facturacion/compras/ProveedorModal";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function DocumentoPorPagarModal({
  cuenta,
  onToast,
  onClose,
}: {
  cuenta: CuentaPorPagar | null;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const fac = useFacturacion();

  const [tipo, setTipo] = useState<TipoDocPorPagar>(cuenta?.tipo ?? "nota_entrega");
  const [proveedorId, setProveedorId] = useState<number | "">(cuenta?.proveedorId ?? "");
  const [numeroDocumento, setNumeroDocumento] = useState(cuenta?.numeroDocumento ?? "");
  const [fecha, setFecha] = useState(cuenta?.fecha ?? fmtISO(new Date()));
  const [fechaVencimiento, setFechaVencimiento] = useState(cuenta?.fechaVencimiento ?? "");
  const [totalTexto, setTotalTexto] = useState(cuenta ? formatNumberVE(cuenta.totalBs) : "");
  const [descripcion, setDescripcion] = useState(cuenta?.descripcion ?? "");
  const [pdfUrl, setPdfUrl] = useState(cuenta?.pdfUrl);
  const [pdfNombre, setPdfNombre] = useState(cuenta?.pdfNombre);
  const [modalProveedor, setModalProveedor] = useState(false);
  const creados = useRef<string[]>([]);

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

  const guardar = () => {
    if (proveedorId === "") return onToast("Selecciona el proveedor");
    if (!numeroDocumento.trim())
      return onToast(tipo === "factura" ? "Indica el N° de factura" : "Indica el N° de la nota de entrega");
    if (!fecha) return onToast("Indica la fecha del documento");
    const total = round2(parseVES(totalTexto));
    if (total <= 0) return onToast("Indica el monto total por pagar (Bs)");
    const datos = {
      tipo,
      proveedorId: proveedorId as number,
      numeroDocumento: numeroDocumento.trim(),
      fecha,
      ...(fechaVencimiento ? { fechaVencimiento } : {}),
      totalBs: total,
      ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
      ...(pdfUrl ? { pdfUrl, pdfNombre } : {}),
    };
    if (cuenta) {
      fac.editarCuentaPorPagar(cuenta.id, datos);
      onToast("Documento por pagar actualizado");
    } else {
      fac.crearCuentaPorPagar(datos);
      onToast("Documento por pagar agregado");
    }
    cerrar(pdfUrl);
  };

  return (
    <>
      <Modal
        onClose={() => cerrar(cuenta?.pdfUrl)}
        title={cuenta ? "Editar documento por pagar" : "Nuevo documento por pagar"}
        subtitle="Factura o nota de entrega pendiente de pago · montos en Bs"
        maxWidth="max-w-5xl"
        footer={
          <>
            <button
              onClick={() => cerrar(cuenta?.pdfUrl)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
            >
              {cuenta ? "Guardar cambios" : "Agregar documento"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Visor + subida (opcional) */}
          <div className="flex flex-col gap-3">
            <label className="group flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-600 text-navy-700 transition hover:border-navy-400 hover:bg-navy-50/30">
              <UploadCloud className="h-4 w-4" />
              {pdfNombre ? `Reemplazar PDF (${pdfNombre})` : "Subir PDF del documento (opcional)"}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">Tipo de documento</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoDocPorPagar)}
                  className={inputCls}
                >
                  <option value="nota_entrega">Nota de entrega</option>
                  <option value="factura">Factura</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">
                  {tipo === "factura" ? "N° Factura" : "N° Nota de entrega"}
                </label>
                <input
                  type="text"
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>

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

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">Fecha</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">
                  Vence el <span className="font-400 text-slate-400">(opcional)</span>
                </label>
                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  title="Fecha pactada de pago"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">Total por pagar (Bs)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={totalTexto}
                  onChange={(e) => setTotalTexto(e.target.value)}
                  className={`${inputCls} text-right font-mono`}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-600 text-navy-900">
                Descripción <span className="font-400 text-slate-400">(opcional)</span>
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                className={inputCls}
              />
            </div>

            <p className="rounded-xl bg-navy-50/60 px-3 py-2 text-xs text-navy-700">
              Documento administrativo pendiente de pago. Al registrarse el pago se
              convertirá en factura recibida (con sus datos fiscales) y se asentará la
              salida en Finanzas.
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
