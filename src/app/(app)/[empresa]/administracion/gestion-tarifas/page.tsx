import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { accesoModulo } from "@/lib/modulos";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuloEnPreparacion } from "@/components/layout/ModuloEnPreparacion";
import { GestionTarifasModule } from "@/components/tarifas/GestionTarifasModule";

export const metadata: Metadata = { title: `Gestión de Tarifas · ${APP_NAME}` };

export default async function GestionTarifasPage({
  params,
}: {
  params: Promise<{ empresa: string }>;
}) {
  const { empresa } = await params;
  const acc = accesoModulo(empresa, "tarifas");
  if (!acc) notFound();
  if (acc.enPreparacion) return <ModuloEnPreparacion empresa={acc.empresa} def={acc.def} />;

  return (
    <>
      <PageHeader
        title="Gestión de Tarifas"
        breadcrumb={[acc.empresa.nombre, "Administración", "Gestión de Tarifas"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <GestionTarifasModule />
      </main>
    </>
  );
}
