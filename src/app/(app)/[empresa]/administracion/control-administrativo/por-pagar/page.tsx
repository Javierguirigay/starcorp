import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { accesoModulo } from "@/lib/modulos";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuloEnPreparacion } from "@/components/layout/ModuloEnPreparacion";
import { ControlAdministrativoModule } from "@/components/control/ControlAdministrativoModule";

export const metadata: Metadata = { title: `Cuentas por Pagar · ${APP_NAME}` };

export default async function CuentasPorPagarPage({
  params,
}: {
  params: Promise<{ empresa: string }>;
}) {
  const { empresa } = await params;
  const acc = accesoModulo(empresa, "control");
  if (!acc) notFound();
  if (acc.enPreparacion) return <ModuloEnPreparacion empresa={acc.empresa} def={acc.def} />;

  return (
    <>
      <PageHeader
        title="Control Administrativo"
        breadcrumb={[acc.empresa.nombre, "Administración", "Control Administrativo", "Cuentas por Pagar"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <ControlAdministrativoModule empresa={acc.empresa} vista="pagar" />
      </main>
    </>
  );
}
