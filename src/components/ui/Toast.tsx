"use client";

import { CheckCircle } from "lucide-react";

/** Aviso flotante del boceto (se muestra 2,6 s desde el módulo). */
export function Toast({ mensaje }: { mensaje: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-navy-950 px-4 py-3 text-sm font-600 text-white shadow-xl">
      <CheckCircle className="h-4 w-4 text-emerald-400" />
      <span>{mensaje}</span>
    </div>
  );
}
