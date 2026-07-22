import { notFound, redirect } from "next/navigation";
import { USUARIO_ACTUAL } from "@/lib/config";
import { empresaActivaPorKey, primerModuloListo } from "@/lib/modulos";
import { PageHeader } from "@/components/layout/PageHeader";

/**
 * Entrada al espacio de una empresa: redirige a su primer módulo listo visible
 * para el rol. Si la empresa aún no tiene módulos operativos (solo módulos en
 * preparación), muestra una landing de bienvenida. El selector de empresa
 * apunta aquí (`/<empresa>`) y esta página decide el destino.
 */
export default async function EmpresaHome({ params }: { params: Promise<{ empresa: string }> }) {
  const { empresa } = await params;
  const emp = empresaActivaPorKey(empresa);
  if (!emp) notFound();

  const primero = primerModuloListo(empresa, USUARIO_ACTUAL.rol);
  if (primero) redirect(primero.href);

  return (
    <>
      <PageHeader title={emp.nombre} breadcrumb={[emp.nombre]} />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center shadow-card">
          <h2 className="font-display text-lg font-700 text-navy-950">{emp.nombre}</h2>
          <p className="mt-4 text-sm text-slate-500">
            Sus módulos están en preparación. Elígelos en el menú lateral para ver su avance.
          </p>
        </div>
      </main>
    </>
  );
}
