"use client";

import { X } from "lucide-react";

/**
 * Base de los modales del boceto: fondo navy con blur, tarjeta blanca con
 * cabecera y pie opcionales. Solo se cierra con la (x) o el botón del pie
 * (nunca al hacer clic en el backdrop, para no perder datos ya escritos).
 */
export function Modal({
  onClose,
  title,
  subtitle,
  footer,
  maxWidth = "max-w-2xl",
  children,
}: {
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm">
      <div className={`max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-2xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="font-display text-lg font-700 text-navy-950">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
