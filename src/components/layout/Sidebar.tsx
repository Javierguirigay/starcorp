"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, type LucideIcon } from "lucide-react";
import { APP_VERSION, USUARIO_ACTUAL } from "@/lib/config";
import { puede } from "@/lib/permissions";
import { empresaActivaPorKey, empresaDeRuta, modulosDe, type ModuloEmpresa } from "@/lib/modulos";
import { LogoMark } from "@/components/ui/LogoMark";

interface Item {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

function NavItem({ item, active }: { item: Item; active: boolean }) {
  const linkCls = active
    ? "bg-navy-800 text-white"
    : "text-slate-300 hover:bg-navy-800/60 hover:text-white";
  const markCls = active ? "bg-gold-500" : "bg-transparent";
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${linkCls}`}
    >
      <span className={`absolute left-0 top-1.5 h-6 w-1 rounded-r ${markCls}`}></span>
      <Icon className="h-[18px] w-[18px]" /> {item.label}
    </Link>
  );
}

/** Módulo aún no disponible para esta empresa: ítem inerte con badge "Pronto". */
function NavPronto({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-500">
      <span className="flex items-center gap-3">
        <Icon className="h-[18px] w-[18px]" /> {label}
      </span>
      <span className="rounded-full bg-navy-800 px-2 py-0.5 text-[9px] font-600 uppercase tracking-wide text-slate-400">
        Pronto
      </span>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const rol = USUARIO_ACTUAL.rol;

  // Empresa activa = primer segmento de la ruta (cae en LOTER en /dashboard).
  const empresaKey = empresaDeRuta(pathname);
  const empresa = empresaActivaPorKey(empresaKey);

  // startsWith y no igualdad: los módulos con secciones redirigen a la primera
  // (/control-administrativo → /control-administrativo/por-cobrar) y el item
  // debe seguir resaltado. Ninguna ruta raíz del menú es prefijo de otra.
  const activo = (href: string) => pathname.startsWith(href);

  // Módulos de la empresa visibles para el rol, separados por sección.
  const visibles = modulosDe(empresaKey).filter((m) => puede(rol, m.def.area));
  const admin = visibles.filter((m) => m.def.seccion === "administracion");
  const operaciones = visibles.filter((m) => m.def.seccion === "operaciones");

  const item = (m: ModuloEmpresa): Item => ({
    key: m.def.key,
    href: m.href,
    label: m.def.label,
    icon: m.def.icon,
  });

  return (
    <aside id="sidebar" className="h-full w-64 overflow-y-auto bg-navy-950">
      {/* Marca */}
      <Link href="/dashboard" className="flex h-16 items-center gap-3 px-5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy-900 ring-1 ring-white/10">
          <LogoMark className="h-5 w-5" top="#163454" />
        </span>
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-700 tracking-tight text-white">
            STARCORP
          </span>
          <span className="block text-[10px] font-600 uppercase tracking-[0.32em] text-gold-500">
            Group
          </span>
        </span>
      </Link>

      <nav className="px-3 pb-8 pt-2">
        {/* Principal */}
        <p className="px-3 pb-2 pt-3 text-[10px] font-600 uppercase tracking-[0.18em] text-slate-500">
          Principal
        </p>
        <NavItem
          item={{ key: "dashboard", href: "/dashboard", label: "Inicio", icon: LayoutDashboard }}
          active={pathname === "/dashboard"}
        />

        {/* Empresa activa */}
        <p className="mt-5 flex items-center gap-2 px-3 pb-2 text-[10px] font-600 uppercase tracking-[0.18em] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>{" "}
          {empresa?.nombre ?? empresaKey}
        </p>

        {admin.length > 0 && (
          <>
            <p className="px-3 pb-1 pt-1 text-[11px] font-500 text-slate-400">Administración</p>
            {admin.map((m) =>
              m.enPreparacion ? (
                <NavPronto key={m.def.key} label={m.def.label} icon={m.def.icon} />
              ) : (
                <NavItem key={m.def.key} item={item(m)} active={activo(m.href)} />
              )
            )}
          </>
        )}

        {operaciones.length > 0 && (
          <>
            <p className="px-3 pb-1 pt-3 text-[11px] font-500 text-slate-400">Operaciones</p>
            {operaciones.map((m) =>
              m.enPreparacion ? (
                <NavPronto key={m.def.key} label={m.def.label} icon={m.def.icon} />
              ) : (
                <NavItem key={m.def.key} item={item(m)} active={activo(m.href)} />
              )
            )}
          </>
        )}
      </nav>

      {/* Pie del menú */}
      <div className="sticky bottom-0 border-t border-white/5 bg-navy-950 px-3 py-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-navy-800/60 hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px]" /> Cerrar sesión
        </Link>
        <p className="px-3 pt-2 text-[10px] text-slate-600">{APP_VERSION}</p>
      </div>
    </aside>
  );
}
