import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { PageHeader } from "@/components/layout/PageHeader";
import { GestionTarifasModule } from "@/components/tarifas/GestionTarifasModule";

export const metadata: Metadata = { title: `Gestión de Tarifas · ${APP_NAME}` };

export default function GestionTarifasPage() {
  return (
    <>
      <PageHeader
        title="Gestión de Tarifas"
        breadcrumb={["LOTER, C.A.", "Administración", "Gestión de Tarifas"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <GestionTarifasModule />
      </main>
    </>
  );
}
