"use client";

/**
 * Gestión de Órdenes: compra, entrega y requerimiento. Cada tipo es una ruta
 * propia (las pestañas son enlaces), para que coincidan con el desplegable del
 * sidebar.
 */
import type { TipoOrden } from "@/lib/types";
import { TabsRuta } from "@/components/layout/TabsRuta";
import { OrdenTab } from "./OrdenTab";

const BASE = "/loter/administracion/gestion-ordenes";

const TABS = [
  { href: `${BASE}/orden-compra`, label: "Orden de Compra" },
  { href: `${BASE}/orden-entrega`, label: "Orden de Entrega" },
  { href: `${BASE}/orden-requerimiento`, label: "Orden de Requerimiento" },
];

export function GestionOrdenesModule({ tipo }: { tipo: TipoOrden }) {
  return (
    <>
      <TabsRuta tabs={TABS} />
      <OrdenTab tipo={tipo} />
    </>
  );
}
