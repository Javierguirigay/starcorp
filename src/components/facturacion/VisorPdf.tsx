"use client";

import { FileText } from "lucide-react";

/** Visor del PDF subido por el usuario (object URL de la sesión). */
export function VisorPdf({ url, nombre }: { url?: string; nombre?: string }) {
  if (!url) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 text-center">
        <FileText className="h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm text-slate-400">
          Sube el PDF escaneado para verlo aquí mientras transcribes los datos.
        </p>
      </div>
    );
  }
  return (
    <iframe
      src={url}
      title={nombre ?? "Documento PDF"}
      className="h-full min-h-[420px] w-full rounded-xl border border-slate-200 bg-slate-50"
    />
  );
}
