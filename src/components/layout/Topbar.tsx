"use client";

import { Bell, ChevronsUpDown, Menu, Search } from "lucide-react";
import { APP_NAME, USUARIO_ACTUAL } from "@/lib/config";

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onOpenSidebar}
        className="grid h-9 w-9 place-items-center rounded-lg text-navy-700 hover:bg-slate-100 lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Selector de empresa (decorativo, como el boceto) */}
      <div className="flex items-center gap-3">
        <div className="hidden flex-col leading-tight sm:flex">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Conglomerado
          </span>
          <span className="font-display text-sm font-600 text-navy-900">{APP_NAME}</span>
        </div>
        <div className="hidden h-8 w-px bg-slate-200 sm:block"></div>
        <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-navy-800 hover:border-navy-300 hover:bg-slate-50">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          LOTER, C.A.
          <ChevronsUpDown className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Buscador */}
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar…"
            className="w-56 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-navy-400 focus:bg-white focus:ring-2 focus:ring-navy-100"
          />
        </div>
        <button
          className="relative grid h-9 w-9 place-items-center rounded-lg text-navy-700 hover:bg-slate-100"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold-500 ring-2 ring-white"></span>
        </button>

        {/* Usuario */}
        <div className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy-900 font-display text-sm font-600 text-gold-400">
            {USUARIO_ACTUAL.inicial}
          </span>
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-600 text-navy-900">{USUARIO_ACTUAL.nombre}</span>
            <span className="text-[11px] capitalize text-slate-400">{USUARIO_ACTUAL.rol}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
