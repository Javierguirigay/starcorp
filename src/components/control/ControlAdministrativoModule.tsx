"use client";

/**
 * Control Administrativo: Cuentas por Cobrar y por Pagar. Cada sub-sección es
 * una ruta propia (las pestañas son enlaces), para que coincidan con el
 * desplegable del sidebar.
 */
import { TabsRuta } from "@/components/layout/TabsRuta";
import { CarteraTab } from "./CarteraTab";

const BASE = "/loter/administracion/control-administrativo";

const TABS = [
  { href: `${BASE}/por-cobrar`, label: "Cuentas por Cobrar" },
  { href: `${BASE}/por-pagar`, label: "Cuentas por Pagar" },
];

export function ControlAdministrativoModule({ vista }: { vista: "cobrar" | "pagar" }) {
  return (
    <>
      <TabsRuta tabs={TABS} />
      <CarteraTab tipo={vista} />
    </>
  );
}
