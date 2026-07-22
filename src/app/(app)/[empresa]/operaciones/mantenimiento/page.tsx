import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { accesoModulo } from "@/lib/modulos";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuloEnPreparacion } from "@/components/layout/ModuloEnPreparacion";
import { MantenimientoModule } from "@/components/mantenimiento/MantenimientoModule";

export const metadata: Metadata = { title: `Mantenimiento · ${APP_NAME}` };

export default async function MantenimientoPage({
  params,
}: {
  params: Promise<{ empresa: string }>;
}) {
  const { empresa } = await params;
  const acc = accesoModulo(empresa, "mantenimiento");
  if (!acc) notFound();
  if (acc.enPreparacion) return <ModuloEnPreparacion empresa={acc.empresa} def={acc.def} />;

  return (
    <>
      <PageHeader
        title="Mantenimiento de equipos"
        breadcrumb={[acc.empresa.nombre, "Operaciones", "Mantenimiento"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <MantenimientoModule />
      </main>
    </>
  );
}
