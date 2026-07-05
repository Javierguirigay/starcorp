"use client";

import { useState } from "react";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * Estructura de includes/header.php + footer.php: sidebar fijo a la
 * izquierda (deslizable en móvil con overlay) y columna principal con
 * barra superior, contenido y pie.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-full">
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        ></div>
      )}

      {/* Sidebar (fijo; en móvil se desliza) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>

      {/* Columna principal */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar onOpenSidebar={() => setOpen(true)} />

        {children}

        <footer className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
          {APP_NAME} · {APP_TAGLINE} —{" "}
          <span className="text-slate-300">Datos de ejemplo (migración en curso).</span>
        </footer>
      </div>
    </div>
  );
}
