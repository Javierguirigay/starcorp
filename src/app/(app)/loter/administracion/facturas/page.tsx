import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { PageHeader } from "@/components/layout/PageHeader";
import { FacturacionModule, type Vista } from "@/components/facturacion/FacturacionModule";

export const metadata: Metadata = { title: `Facturación y Compras · ${APP_NAME}` };

export default async function FacturacionPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; tab?: string }>;
}) {
  const { vista, tab } = await searchParams;
  const vistaInicial: Vista = vista === "compras" ? "compras" : "facturacion";
  return (
    <>
      <PageHeader
        title="Facturación y Compras"
        breadcrumb={["LOTER, C.A.", "Administración", "Facturación y Compras"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <FacturacionModule vistaInicial={vistaInicial} tabInicial={tab} />
      </main>
    </>
  );
}
