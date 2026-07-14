import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { PageHeader } from "@/components/layout/PageHeader";
import { MantenimientoModule } from "@/components/mantenimiento/MantenimientoModule";

export const metadata: Metadata = { title: `Mantenimiento · ${APP_NAME}` };

export default function MantenimientoPage() {
  return (
    <>
      <PageHeader
        title="Mantenimiento de equipos"
        breadcrumb={["LOTER, C.A.", "Operaciones", "Mantenimiento"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <MantenimientoModule />
      </main>
    </>
  );
}
