import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { accesoModulo } from "@/lib/modulos";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuloEnPreparacion } from "@/components/layout/ModuloEnPreparacion";
import { FinanzasModule } from "@/components/finanzas/FinanzasModule";

export const metadata: Metadata = { title: `Finanzas · ${APP_NAME}` };

export default async function FinanzasPage({ params }: { params: Promise<{ empresa: string }> }) {
  const { empresa } = await params;
  const acc = accesoModulo(empresa, "finanzas");
  if (!acc) notFound();
  if (acc.enPreparacion) return <ModuloEnPreparacion empresa={acc.empresa} def={acc.def} />;

  return (
    <>
      <PageHeader title="Finanzas" breadcrumb={[acc.empresa.nombre, "Administración", "Finanzas"]} />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <FinanzasModule />
      </main>
    </>
  );
}
