import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { PageHeader } from "@/components/layout/PageHeader";
import { FinanzasModule } from "@/components/finanzas/FinanzasModule";

export const metadata: Metadata = { title: `Finanzas · ${APP_NAME}` };

export default function FinanzasPage() {
  return (
    <>
      <PageHeader title="Finanzas" breadcrumb={["LOTER, C.A.", "Administración", "Finanzas"]} />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <FinanzasModule />
      </main>
    </>
  );
}
