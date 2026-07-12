"use client";

/**
 * Pestañas que son rutas reales (a diferencia de las de Facturación, que son
 * estado local): así el enlace del sidebar, la URL y la pestaña activa siempre
 * coinciden, y cada sub-sección es enlazable.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface TabRuta {
  href: string;
  label: string;
}

export function TabsRuta({ tabs }: { tabs: TabRuta[] }) {
  const pathname = usePathname();

  return (
    <div className="mb-5 inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`rounded-lg px-3 py-1.5 text-xs font-600 ${
            pathname === t.href
              ? "bg-navy-900 text-white"
              : "text-slate-500 hover:text-navy-900"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
