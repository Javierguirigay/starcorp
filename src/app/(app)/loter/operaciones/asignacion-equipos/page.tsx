import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrdenAsignacion } from "@/components/asignacion/OrdenAsignacion";
import { HistorialAsignaciones } from "@/components/asignacion/HistorialAsignaciones";

export const metadata: Metadata = { title: `Asignación de equipos · ${APP_NAME}` };

export default function AsignacionEquiposPage() {
  return (
    <>
      <PageHeader
        title="Asignación de equipos"
        breadcrumb={["LOTER, C.A.", "Operaciones", "Asignación"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <OrdenAsignacion />
        <HistorialAsignaciones />
      </main>
    </>
  );
}
