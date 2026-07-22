"use client";

/**
 * Gestión de Órdenes: compra, entrega y requerimiento. Cada tipo es una ruta
 * propia (las pestañas son enlaces), para que coincidan con el desplegable del
 * sidebar. Se scopea a la empresa de la ruta vía OrdenesEmpresaScope.
 */
import type { Empresa, TipoOrden } from "@/lib/types";
import { TabsRuta } from "@/components/layout/TabsRuta";
import { InventarioEmpresaScope } from "@/components/inventario/InventarioProvider";
import { OrdenesEmpresaScope } from "./OrdenesProvider";
import { OrdenTab } from "./OrdenTab";

export function GestionOrdenesModule({
  empresa,
  tipo,
}: {
  empresa: Empresa;
  tipo: TipoOrden;
}) {
  const base = `/${empresa.key}/administracion/gestion-ordenes`;
  const tabs = [
    { href: `${base}/orden-compra`, label: "Orden de Compra" },
    { href: `${base}/orden-entrega`, label: "Orden de Entrega" },
    { href: `${base}/orden-requerimiento`, label: "Orden de Requerimiento" },
  ];
  return (
    <OrdenesEmpresaScope empresa={empresa}>
      {/* El scope de inventario hace que las órdenes integren el stock de SU
          empresa (picker de artículos, recepción que suma, entrega que descuenta). */}
      <InventarioEmpresaScope empresa={empresa}>
        <TabsRuta tabs={tabs} />
        <OrdenTab tipo={tipo} />
      </InventarioEmpresaScope>
    </OrdenesEmpresaScope>
  );
}
