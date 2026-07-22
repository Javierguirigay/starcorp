import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { accesoModulo } from "@/lib/modulos";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuloEnPreparacion } from "@/components/layout/ModuloEnPreparacion";
import { GestionOrdenesModule } from "@/components/ordenes/GestionOrdenesModule";

export const metadata: Metadata = { title: `Orden de Requerimiento · ${APP_NAME}` };

export default async function OrdenRequerimientoPage({
  params,
}: {
  params: Promise<{ empresa: string }>;
}) {
  const { empresa } = await params;
  const acc = accesoModulo(empresa, "ordenes");
  if (!acc) notFound();
  if (acc.enPreparacion) return <ModuloEnPreparacion empresa={acc.empresa} def={acc.def} />;

  return (
    <>
      <PageHeader
        title="Gestión de Órdenes"
        breadcrumb={[
          acc.empresa.nombre,
          "Administración",
          "Gestión de Órdenes",
          "Orden de Requerimiento",
        ]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <GestionOrdenesModule empresa={acc.empresa} tipo="requerimiento" />
      </main>
    </>
  );
}
