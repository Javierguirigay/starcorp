"use client";

/**
 * Vista previa + descarga de un PDF generado (blob URL). El modal es dueño
 * del URL y lo revoca al CERRAR (no en un efecto de montaje: el doble montaje
 * de StrictMode en dev revocaría el blob recién creado).
 */
import { FileDown } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export interface PreviewPdf {
  url: string;
  nombre: string;
  titulo: string;
}

export function PdfPreviewModal({
  preview,
  onToast,
  onClose,
}: {
  preview: PreviewPdf;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const cerrar = () => {
    URL.revokeObjectURL(preview.url);
    onClose();
  };

  return (
    <Modal
      onClose={cerrar}
      title={preview.titulo}
      subtitle={preview.nombre}
      maxWidth="max-w-4xl"
      footer={
        <>
          <button
            onClick={cerrar}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
          >
            Cerrar
          </button>
          <button
            onClick={async () => {
              const { descargarBlob } = await import("@/components/pdf/descargar");
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
  );
}
