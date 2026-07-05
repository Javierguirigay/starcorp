import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { PageHeader } from "@/components/layout/PageHeader";
import { InventarioModule } from "@/components/inventario/InventarioModule";

export const metadata: Metadata = { title: `Inventario · ${APP_NAME}` };

export default function InventarioPage() {
  return (
    <>
      <PageHeader title="Inventario" breadcrumb={["LOTER, C.A.", "Administración", "Inventario"]} />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <InventarioModule />
      </main>
    </>
  );
}
