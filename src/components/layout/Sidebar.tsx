"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Scale,
  Tags,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { APP_VERSION, USUARIO_ACTUAL } from "@/lib/config";
import { EMPRESAS } from "@/lib/data/empresas";
import { puede } from "@/lib/permissions";
import { LogoMark } from "@/components/ui/LogoMark";

interface Item {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

const ADMIN_BASE = "/loter/administracion";

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

export function Sidebar() {
  const pathname = usePathname();
  const rol = USUARIO_ACTUAL.rol;

  // startsWith y no igualdad: los módulos con secciones redirigen a la primera
  // (/control-administrativo → /control-administrativo/por-cobrar) y el item
  // debe seguir resaltado. Ninguna ruta del menú es prefijo de otra.
  const activeKey = (item: Item) => pathname.startsWith(item.href);

  const adminItems: { item: Item; visible: boolean }[] = [
    { visible: puede(rol, "nomina"), item: { key: "nomina", href: `${ADMIN_BASE}/nomina`, label: "Nómina del personal", icon: Users } },
    { visible: puede(rol, "finanzas"), item: { key: "finanzas", href: `${ADMIN_BASE}/finanzas`, label: "Finanzas", icon: Wallet } },
    { visible: puede(rol, "facturas"), item: { key: "facturas", href: `${ADMIN_BASE}/facturas`, label: "Facturación y Compras", icon: FileText } },
    { visible: puede(rol, "control-administrativo"), item: { key: "control", href: `${ADMIN_BASE}/control-administrativo`, label: "Control Administrativo", icon: Scale } },
    { visible: puede(rol, "tarifas"), item: { key: "tarifas", href: `${ADMIN_BASE}/gestion-tarifas`, label: "Gestión de Tarifas", icon: Tags } },
    { visible: puede(rol, "ordenes"), item: { key: "ordenes", href: `${ADMIN_BASE}/gestion-ordenes`, label: "Gestión de Órdenes", icon: ClipboardCheck } },
    { visible: puede(rol, "inventario"), item: { key: "inventario", href: `${ADMIN_BASE}/inventario`, label: "Inventario", icon: Package } },
  ];

  const muestraAdmin =
    puede(rol, "nomina") || puede(rol, "finanzas") || puede(rol, "inventario");

  return (
    <aside
      id="sidebar"
      className="h-full w-64 overflow-y-auto bg-navy-950"
    >
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

        {/* LOTER, C.A. */}
        <p className="mt-5 flex items-center gap-2 px-3 pb-2 text-[10px] font-600 uppercase tracking-[0.18em] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> LOTER, C.A.
        </p>

        {muestraAdmin && (
          <>
            <p className="px-3 pb-1 pt-1 text-[11px] font-500 text-slate-400">Administración</p>
            {adminItems
              .filter((x) => x.visible)
              .map(({ item }) => (
                <NavItem key={item.key} item={item} active={activeKey(item)} />
              ))}
          </>
        )}

        {puede(rol, "operaciones") && (
          <>
            <p className="px-3 pb-1 pt-3 text-[11px] font-500 text-slate-400">Operaciones</p>
            {puede(rol, "mantenimiento") && (
              <NavItem
                item={{
                  key: "mantenimiento",
                  href: "/loter/operaciones/mantenimiento",
                  label: "Mantenimiento",
                  icon: Wrench,
                }}
                active={pathname === "/loter/operaciones/mantenimiento"}
              />
            )}
            <NavItem
              item={{
                key: "asignacion",
                href: "/loter/operaciones/asignacion-equipos",
                label: "Asignación de equipos",
                icon: ClipboardList,
              }}
              active={pathname === "/loter/operaciones/asignacion-equipos"}
            />
          </>
        )}

        {/* Empresas aún no activas (hoy ninguna: la sección se oculta sola). */}
        {EMPRESAS.some((e) => !e.activa) && (
          <>
            <p className="mt-5 px-3 pb-2 text-[10px] font-600 uppercase tracking-[0.18em] text-slate-500">
              Otras empresas
            </p>
            {EMPRESAS.filter((e) => !e.activa).map((e) => (
              <div
                key={e.key}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-500"
              >
                <span className="flex items-center gap-3">
                  <Building2 className="h-[18px] w-[18px]" /> {e.nombre}
                </span>
                <span className="rounded-full bg-navy-800 px-2 py-0.5 text-[9px] font-600 uppercase tracking-wide text-slate-400">
                  Pronto
                </span>
              </div>
            ))}
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
