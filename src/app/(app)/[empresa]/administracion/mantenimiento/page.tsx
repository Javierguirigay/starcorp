import { notFound, redirect } from "next/navigation";
import { accesoModulo } from "@/lib/modulos";
import { ModuloEnPreparacion } from "@/components/layout/ModuloEnPreparacion";

/** Mantenimiento se mudó al apartado de Operaciones. */
export default async function MantenimientoRedirect({
  params,
}: {
  params: Promise<{ empresa: string }>;
}) {
  const { empresa } = await params;
  const acc = accesoModulo(empresa, "mantenimiento");
  if (!acc) notFound();
  if (acc.enPreparacion) return <ModuloEnPreparacion empresa={acc.empresa} def={acc.def} />;
  redirect(`/${empresa}/operaciones/mantenimiento`);
}
