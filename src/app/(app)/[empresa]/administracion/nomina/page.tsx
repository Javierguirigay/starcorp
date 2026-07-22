import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { accesoModulo } from "@/lib/modulos";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuloEnPreparacion } from "@/components/layout/ModuloEnPreparacion";
import { NominaModule } from "@/components/nomina/NominaModule";

export const metadata: Metadata = { title: `Nómina del personal · ${APP_NAME}` };

export default async function NominaPage({ params }: { params: Promise<{ empresa: string }> }) {
  const { empresa } = await params;
  const acc = accesoModulo(empresa, "nomina");
  if (!acc) notFound();
  if (acc.enPreparacion) return <ModuloEnPreparacion empresa={acc.empresa} def={acc.def} />;

  return (
    <>
      <PageHeader
        title="Nómina del personal"
        breadcrumb={[acc.empresa.nombre, "Administración", "Nómina"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <NominaModule empresa={acc.empresa} />
      </main>
    </>
  );
}
