import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { accesoModulo } from "@/lib/modulos";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuloEnPreparacion } from "@/components/layout/ModuloEnPreparacion";
import { AsignacionModule } from "@/components/asignacion/AsignacionModule";

export const metadata: Metadata = { title: `Asignación de equipos · ${APP_NAME}` };

export default async function AsignacionEquiposPage({
  params,
}: {
  params: Promise<{ empresa: string }>;
}) {
  const { empresa } = await params;
  const acc = accesoModulo(empresa, "asignacion");
  if (!acc) notFound();
  if (acc.enPreparacion) return <ModuloEnPreparacion empresa={acc.empresa} def={acc.def} />;

  return (
    <>
      <PageHeader
        title="Asignación de equipos"
        breadcrumb={[acc.empresa.nombre, "Operaciones", "Asignación"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <AsignacionModule />
      </main>
    </>
  );
}
