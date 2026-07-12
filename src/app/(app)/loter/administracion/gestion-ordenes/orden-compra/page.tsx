import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { PageHeader } from "@/components/layout/PageHeader";
import { GestionOrdenesModule } from "@/components/ordenes/GestionOrdenesModule";

export const metadata: Metadata = { title: `Orden de Compra · ${APP_NAME}` };

export default function OrdenCompraPage() {
  return (
    <>
      <PageHeader
        title="Gestión de Órdenes"
        breadcrumb={["LOTER, C.A.", "Administración", "Gestión de Órdenes", "Orden de Compra"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <GestionOrdenesModule tipo="compra" />
      </main>
    </>
  );
}
