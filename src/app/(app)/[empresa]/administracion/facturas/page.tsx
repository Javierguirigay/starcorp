import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { accesoModulo } from "@/lib/modulos";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuloEnPreparacion } from "@/components/layout/ModuloEnPreparacion";
import { FacturacionModule, type Vista } from "@/components/facturacion/FacturacionModule";

export const metadata: Metadata = { title: `Facturación y Compras · ${APP_NAME}` };

export default async function FacturacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ empresa: string }>;
  searchParams: Promise<{ vista?: string; tab?: string }>;
}) {
  const { empresa } = await params;
  const acc = accesoModulo(empresa, "facturas");
  if (!acc) notFound();
  if (acc.enPreparacion) return <ModuloEnPreparacion empresa={acc.empresa} def={acc.def} />;

  const { vista, tab } = await searchParams;
  const vistaInicial: Vista = vista === "compras" ? "compras" : "facturacion";
  return (
    <>
      <PageHeader
        title="Facturación y Compras"
        breadcrumb={[acc.empresa.nombre, "Administración", "Facturación y Compras"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <FacturacionModule empresa={acc.empresa} vistaInicial={vistaInicial} tabInicial={tab} />
      </main>
    </>
  );
}
