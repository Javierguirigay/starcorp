"use client";

/**
 * Control Administrativo: Cuentas por Cobrar y por Pagar. Cada sub-sección es
 * una ruta propia (las pestañas son enlaces), para que coincidan con el
 * desplegable del sidebar. Se scopea a la empresa de la ruta vía
 * FacturacionEmpresaScope: sus datos (facturas, cuentas por pagar) salen ya
 * filtrados por `useFacturacion()`.
 */
import type { Empresa } from "@/lib/types";
import { TabsRuta } from "@/components/layout/TabsRuta";
import { FacturacionEmpresaScope } from "@/components/facturacion/FacturacionProvider";
import { CarteraTab } from "./CarteraTab";
import { CuentasPorPagarTab } from "./CuentasPorPagarTab";

export function ControlAdministrativoModule({
  empresa,
  vista,
}: {
  empresa: Empresa;
  vista: "cobrar" | "pagar";
}) {
  const base = `/${empresa.key}/administracion/control-administrativo`;
  const tabs = [
    { href: `${base}/por-cobrar`, label: "Cuentas por Cobrar" },
    { href: `${base}/por-pagar`, label: "Cuentas por Pagar" },
  ];
  return (
    <FacturacionEmpresaScope empresa={empresa}>
      <TabsRuta tabs={tabs} />
      {vista === "cobrar" ? <CarteraTab /> : <CuentasPorPagarTab />}
    </FacturacionEmpresaScope>
  );
}
