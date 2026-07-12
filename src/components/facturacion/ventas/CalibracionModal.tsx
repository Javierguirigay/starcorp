"use client";

/**
 * Calibración de la plantilla de impresión: offset X/Y en mm por campo
 * (inputs numéricos + botones ±1 mm), offset global de página, altura de
 * fila y columnas de renglones. Persistido en el provider. "Probar" genera
 * la plantilla con una factura para imprimir y ajustar hasta calzar con el
 * talonario fiscal.
 */
import { useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { CampoPlantilla } from "@/lib/types";
import { round2 } from "@/lib/negocio/nomina";
import { Modal } from "@/components/ui/Modal";
import { useFacturacion } from "../FacturacionProvider";
import { PdfPreviewModal, type PreviewPdf } from "../PdfPreviewModal";

const ETIQUETAS: Record<CampoPlantilla, string> = {
  razonSocial: "Razón social",
  fecha: "Fecha",
  domicilio: "Domicilio fiscal",
  telefono: "Teléfono",
  rif: "RIF",
  condiciones: "Condiciones de pago",
  renglones: "Renglones (origen; X = columna CAN)",
  alicuota: "Alícuota (el «16»)",
  subtotal: "Sub-total (borde derecho)",
  iva: "IVA (borde derecho)",
  total: "Total a pagar (borde derecho)",
};

const numCls =
  "w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-right font-mono text-xs outline-none focus:border-navy-500";

function ControlMm({
  valor,
  onCambio,
}: {
  valor: number;
  onCambio: (v: number) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={() => onCambio(round2(valor - 1))}
        className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
        title="−1 mm"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        step="0.5"
        value={valor}
        onChange={(e) => onCambio(parseFloat(e.target.value) || 0)}
        className={numCls}
      />
      <button
        onClick={() => onCambio(round2(valor + 1))}
        className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
        title="+1 mm"
      >
        <Plus className="h-3 w-3" />
      </button>
    </span>
  );
}

export function CalibracionModal({
  onToast,
  onClose,
}: {
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const fac = useFacturacion();
  const c = fac.calibracion;
  const [facturaId, setFacturaId] = useState<number | "">(fac.facturas[0]?.id ?? "");
  const [preview, setPreview] = useState<PreviewPdf | null>(null);
  const [generando, setGenerando] = useState(false);

  const probar = async () => {
    if (generando) return;
    const f = fac.facturas.find((x) => x.id === facturaId);
    if (!f) return onToast("Selecciona una factura para la prueba");
    const cliente = fac.clientePorId(f.clienteId);
    if (!cliente) return onToast("La factura no tiene cliente válido");
    setGenerando(true);
    try {
      const [docs, { generarPdfBlob }] = await Promise.all([
        import("../pdf/documentos"),
        import("@/components/pdf/descargar"),
      ]);
      const blob = await generarPdfBlob(
        <docs.PlantillaImpresionDoc factura={f} cliente={cliente} calibracion={fac.calibracion} />
      );
      setPreview({
        url: URL.createObjectURL(blob),
        nombre: `plantilla_factura_${f.numeroFactura}.pdf`,
        titulo: "Prueba de calibración",
      });
    } catch {
      onToast("No se pudo generar la prueba");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <>
      <Modal
        onClose={onClose}
        title="Calibrar plantilla de impresión"
        subtitle="Offsets en mm sobre papel carta · imprime una prueba y ajusta hasta calzar con el talonario"
        maxWidth="max-w-3xl"
        footer={
          <>
            <button
              onClick={() => {
                fac.resetCalibracion();
                onToast("Calibración restablecida a los valores por defecto");
              }}
              className="mr-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" /> Restablecer
            </button>
            <select
              value={facturaId}
              onChange={(e) => setFacturaId(e.target.value === "" ? "" : Number(e.target.value))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500"
            >
              <option value="">Factura de prueba…</option>
              {fac.facturas.map((f) => (
                <option key={f.id} value={f.id}>
                  N° {f.numeroFactura}
                </option>
              ))}
            </select>
            <button
              onClick={probar}
              disabled={generando}
              className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800 disabled:opacity-50"
            >
              Probar
            </button>
          </>
        }
      >
        <div className="space-y-2">
          {/* Offset global */}
          <div className="flex items-center justify-between rounded-xl bg-navy-50/60 px-4 py-2.5">
            <p className="text-sm font-600 text-navy-900">Offset global de página</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-600 text-slate-500">
                X <ControlMm valor={c.global.x} onCambio={(x) => fac.setCalibracionBase({ global: { ...c.global, x } })} />
              </label>
              <label className="flex items-center gap-2 text-xs font-600 text-slate-500">
                Y <ControlMm valor={c.global.y} onCambio={(y) => fac.setCalibracionBase({ global: { ...c.global, y } })} />
              </label>
            </div>
          </div>

          {/* Campos */}
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {(Object.keys(ETIQUETAS) as CampoPlantilla[]).map((campo) => (
              <li key={campo} className="flex items-center justify-between gap-3 px-4 py-2">
                <p className="text-sm text-navy-900">{ETIQUETAS[campo]}</p>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-600 text-slate-500">
                    X
                    <ControlMm
                      valor={c.campos[campo].x}
                      onCambio={(x) => fac.setCalibracionCampo(campo, { ...c.campos[campo], x })}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-600 text-slate-500">
                    Y
                    <ControlMm
                      valor={c.campos[campo].y}
                      onCambio={(y) => fac.setCalibracionCampo(campo, { ...c.campos[campo], y })}
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>

          {/* Área de renglones */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:grid-cols-4">
            <label className="text-xs font-600 text-slate-500">
              Altura de fila (mm)
              <div className="mt-1">
                <ControlMm valor={c.alturaFilaMm} onCambio={(v) => fac.setCalibracionBase({ alturaFilaMm: v })} />
              </div>
            </label>
            <label className="text-xs font-600 text-slate-500">
              X descripción
              <div className="mt-1">
                <ControlMm valor={c.colDescXMm} onCambio={(v) => fac.setCalibracionBase({ colDescXMm: v })} />
              </div>
            </label>
            <label className="text-xs font-600 text-slate-500">
              X fin P. Unit.
              <div className="mt-1">
                <ControlMm valor={c.colPUnitXMm} onCambio={(v) => fac.setCalibracionBase({ colPUnitXMm: v })} />
              </div>
            </label>
            <label className="text-xs font-600 text-slate-500">
              X fin Total
              <div className="mt-1">
                <ControlMm valor={c.colTotalXMm} onCambio={(v) => fac.setCalibracionBase({ colTotalXMm: v })} />
              </div>
            </label>
          </div>

          <p className="text-xs text-slate-400">
            El N° de factura no se imprime (ya viene pre-impreso en el talonario). Los montos se
            alinean a la derecha terminando en su coordenada X.
          </p>
        </div>
      </Modal>

      {preview && (
        <PdfPreviewModal preview={preview} onToast={onToast} onClose={() => setPreview(null)} />
      )}
    </>
  );
}
