import { notFound, redirect } from "next/navigation";
import { accesoModulo } from "@/lib/modulos";
import { ModuloEnPreparacion } from "@/components/layout/ModuloEnPreparacion";

export default async function GestionOrdenesPage({
  params,
}: {
  params: Promise<{ empresa: string }>;
}) {
  const { empresa } = await params;
  const acc = accesoModulo(empresa, "ordenes");
  if (!acc) notFound();
  if (acc.enPreparacion) return <ModuloEnPreparacion empresa={acc.empresa} def={acc.def} />;
  redirect(`/${empresa}/administracion/gestion-ordenes/orden-compra`);
}
