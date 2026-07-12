"use client";

import { useEffect, useState } from "react";
import { Eye, FileDown, Files, Table2 } from "lucide-react";
import type { Empleado, PagoHistorial } from "@/lib/types";
import { formatFechaVE, money } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { descargarBlob } from "@/components/pdf/descargar";

export function DetalleModal({
  pago,
  tasa,
  empleados,
  onToast,
  onClose,
}: {
  pago: PagoHistorial;
  tasa: number;
  empleados: Empleado[];
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const enBs = (usd: number) => money(usd * tasa, "Bs");
  const [generando, setGenerando] = useState(false);
  const [preview, setPreview] = useState<{ url: string; nombre: string; titulo: string } | null>(
    null
  );

  // Blob URL vivo mientras la vista previa esté abierta; se revoca al cerrar,
  // al reemplazarla por otra y al desmontar.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  /* Los documentos y el renderer se cargan al hacer clic (import dinámico):
     @react-pdf/renderer queda fuera del bundle inicial. */
  const previsualizar = async (
    accion: "recibo" | "consolidado" | "paquete",
    idxDetalle?: number
  ) => {
    if (generando) return;
    setGenerando(true);
    try {
      const [docs, { generarPdfBlob, periodoSlug, slug }] = await Promise.all([
        import("./pdf/documentos"),
        import("@/components/pdf/descargar"),
      ]);
      const periodo = periodoSlug(pago);
      let doc: React.ReactElement;
      let nombre: string;
      let titulo: string;
      if (accion === "recibo" && idxDetalle !== undefined) {
        const d = pago.detalle[idxDetalle];
        doc = <docs.ReciboDoc d={d} pago={pago} tasa={tasa} info={docs.datosEmpleado(d, empleados)} />;
        nombre = `recibo_${slug(d.nombre)}_${periodo}.pdf`;
        titulo = `Recibo — ${d.nombre}`;
      } else if (accion === "consolidado") {
        doc = <docs.ConsolidadoDoc pago={pago} tasa={tasa} />;
        nombre = `consolidado_${periodo}.pdf`;
        titulo = "Reporte consolidado";
      } else {
        doc = <docs.PaqueteDoc pago={pago} tasa={tasa} empleados={empleados} />;
        nombre = `recibos_${periodo}.pdf`;
        titulo = "Todos los recibos";
      }
      const blob = await generarPdfBlob(doc);
      setPreview({ url: URL.createObjectURL(blob), nombre, titulo });
    } catch {
      onToast("No se pudo generar el PDF");
    } finally {
      setGenerando(false);
    }
  };

  const btnPdfCls =
    "inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50 disabled:opacity-50";

  const cerrarPreview = () => setPreview(null);

  return (
    <>
    <Modal
      onClose={onClose}
      title="Detalle del pago"
      subtitle={`${pago.categoria} · ${formatFechaVE(pago.desde)} → ${formatFechaVE(
        pago.hasta
      )} · registrado ${formatFechaVE(pago.registrado)}`}
      maxWidth="max-w-3xl"
      footer={
        <>
          <button
            onClick={() => previsualizar("consolidado")}
            disabled={generando}
            className={btnPdfCls}
          >
            <Table2 className="h-4 w-4" /> Consolidado
          </button>
          <button
            onClick={() => previsualizar("paquete")}
            disabled={generando}
            className={btnPdfCls}
          >
            <Files className="h-4 w-4" /> Todos los recibos
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
          >
            Cerrar
          </button>
        </>
      }
    >
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-2.5 font-600">Empleado</th>
              <th className="px-4 py-2.5 text-center font-600">Faltas</th>
              <th className="px-4 py-2.5 text-right font-600">Diario</th>
              <th className="px-4 py-2.5 text-right font-600">Descuento</th>
              <th className="px-4 py-2.5 text-right font-600">Adelanto</th>
              <th className="px-4 py-2.5 text-right font-600">Neto</th>
              <th className="px-4 py-2.5 text-right font-600">Recibo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pago.detalle.map((d, i) => (
              <tr key={i}>
                <td className="px-4 py-2.5 font-600 text-navy-900">{d.nombre}</td>
                <td
                  className={`px-4 py-2.5 text-center font-mono ${
                    d.faltas > 0 ? "text-rose-600" : "text-slate-400"
                  }`}
                >
                  {d.faltas}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-600">{money(d.diario)}</td>
                <td
                  className={`px-4 py-2.5 text-right font-mono ${
                    d.desc > 0 ? "text-rose-600" : "text-slate-400"
                  }`}
                >
                  {d.desc > 0 ? "− " + money(d.desc) : money(0)}
                </td>
                <td
                  className={`px-4 py-2.5 text-right font-mono ${
                    (d.descAdelanto ?? 0) > 0 ? "text-rose-600" : "text-slate-400"
                  }`}
                >
                  {(d.descAdelanto ?? 0) > 0 ? "− " + money(d.descAdelanto!) : money(0)}
                  {(d.descAdelanto ?? 0) > 0 && (
                    <span className="block font-mono text-[11px] text-slate-400">
                      {enBs(d.descAdelanto!)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-600 text-navy-950">
                  {money(d.neto)}
                  <span className="block font-mono text-[11px] font-400 text-slate-400">
                    {enBs(d.neto)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    title="Ver recibo (PDF)"
                    onClick={() => previsualizar("recibo", i)}
                    disabled={generando}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-navy-50 hover:text-navy-700 disabled:opacity-50"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50/60 font-600">
              <td className="px-4 py-2.5" colSpan={3}>
                Total ({pago.categoria})
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-rose-600">
                − {money(pago.totalDesc)}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-rose-600">
                − {money(pago.totalAdelanto ?? 0)}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-navy-950">{money(pago.totalUsd)}</td>
              <td className="px-4 py-2.5" />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 text-right text-xs text-slate-400">
        Equivalente: <span className="font-mono">{enBs(pago.totalUsd)}</span> (tasa{" "}
        {money(tasa, "Bs")})
      </p>
    </Modal>

    {/* Vista previa: mismo z-50 que el modal base; al ir después en el DOM queda encima. */}
    {preview && (
      <Modal
        onClose={cerrarPreview}
        title={preview.titulo}
        subtitle={preview.nombre}
        maxWidth="max-w-4xl"
        footer={
          <>
            <button onClick={cerrarPreview} className={btnPdfCls}>
              Cerrar
            </button>
            <button
              onClick={() => {
                descargarBlob(preview.url, preview.nombre);
                onToast("PDF descargado");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
            >
              <FileDown className="h-4 w-4" /> Descargar
            </button>
          </>
        }
      >
        <iframe
          src={preview.url}
          title={preview.titulo}
          className="h-[70vh] w-full rounded-xl border border-slate-200 bg-slate-50"
        />
      </Modal>
    )}
    </>
  );
}
