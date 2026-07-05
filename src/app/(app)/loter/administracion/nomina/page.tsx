import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { PageHeader } from "@/components/layout/PageHeader";
import { NominaModule } from "@/components/nomina/NominaModule";

export const metadata: Metadata = { title: `Nómina del personal · ${APP_NAME}` };

export default function NominaPage() {
  return (
    <>
      <PageHeader
        title="Nómina del personal"
        breadcrumb={["LOTER, C.A.", "Administración", "Nómina"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <NominaModule />
      </main>
    </>
  );
}
