import { notFound, redirect } from "next/navigation";
import { accesoModulo } from "@/lib/modulos";
import { ModuloEnPreparacion } from "@/components/layout/ModuloEnPreparacion";

/** Retenciones se mudó al sub-módulo Gestión de Compras de Facturación. */
export default async function RetencionesPage({
  params,
}: {
  params: Promise<{ empresa: string }>;
}) {
  const { empresa } = await params;
  const acc = accesoModulo(empresa, "facturas");
  if (!acc) notFound();
  if (acc.enPreparacion) return <ModuloEnPreparacion empresa={acc.empresa} def={acc.def} />;
  redirect(`/${empresa}/administracion/facturas?vista=compras&tab=retenciones`);
}
