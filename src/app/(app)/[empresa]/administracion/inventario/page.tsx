import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { accesoModulo } from "@/lib/modulos";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModuloEnPreparacion } from "@/components/layout/ModuloEnPreparacion";
import { InventarioModule } from "@/components/inventario/InventarioModule";
import { InventarioEmpresaScope } from "@/components/inventario/InventarioProvider";
import { AgrostarInventarioModule } from "@/components/inventario/agrostar/AgrostarInventarioModule";
import { MonacoInventarioModule } from "@/components/inventario/monaco/MonacoInventarioModule";

export const metadata: Metadata = { title: `Inventario · ${APP_NAME}` };

/** El inventario es de dominio propio por empresa: cada una monta su módulo. */
export default async function InventarioPage({
  params,
}: {
  params: Promise<{ empresa: string }>;
}) {
  const { empresa } = await params;
  const acc = accesoModulo(empresa, "inventario");
  if (!acc) notFound();
  if (acc.enPreparacion) return <ModuloEnPreparacion empresa={acc.empresa} def={acc.def} />;

  return (
    <>
      <PageHeader title="Inventario" breadcrumb={[acc.empresa.nombre, "Administración", "Inventario"]} />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {acc.empresa.key === "agrostar" ? (
          <AgrostarInventarioModule empresa={acc.empresa} />
        ) : acc.empresa.key === "monaco" ? (
          <MonacoInventarioModule empresa={acc.empresa} />
        ) : (
          // LOTER y ETM comparten el inventario estilo LOTER (equipos/consumibles/
          // kardex), scopeado a su empresa.
          <InventarioEmpresaScope empresa={acc.empresa}>
            <InventarioModule />
          </InventarioEmpresaScope>
        )}
      </main>
    </>
  );
}
