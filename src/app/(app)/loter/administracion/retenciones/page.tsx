import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { PageHeader } from "@/components/layout/PageHeader";
import { ComprobanteRetencion } from "@/components/retenciones/ComprobanteRetencion";

export const metadata: Metadata = { title: `Retención de IVA · ${APP_NAME}` };

export default function RetencionesPage() {
  return (
    <>
      <PageHeader
        title="Retención de IVA"
        breadcrumb={["LOTER, C.A.", "Administración", "Retenciones"]}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <ComprobanteRetencion />
      </main>
    </>
  );
}
