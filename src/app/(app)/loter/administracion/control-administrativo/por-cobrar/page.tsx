import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { PageHeader } from "@/components/layout/PageHeader";
import { ControlAdministrativoModule } from "@/components/control/ControlAdministrativoModule";

export const metadata: Metadata = { title: `Cuentas por Cobrar · ${APP_NAME}` };

export default function CuentasPorCobrarPage() {
  return (
    <>
      <PageHeader
        title="Control Administrativo"
        breadcrumb={["LOTER, C.A.", "Administración", "Control Administrativo", "Cuentas por Cobrar"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <ControlAdministrativoModule vista="cobrar" />
      </main>
    </>
  );
}
