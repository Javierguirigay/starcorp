import { notFound, redirect } from "next/navigation";
import { accesoModulo } from "@/lib/modulos";
import { ModuloEnPreparacion } from "@/components/layout/ModuloEnPreparacion";

export default async function ControlAdministrativoPage({
  params,
}: {
  params: Promise<{ empresa: string }>;
}) {
  const { empresa } = await params;
  const acc = accesoModulo(empresa, "control");
  if (!acc) notFound();
  if (acc.enPreparacion) return <ModuloEnPreparacion empresa={acc.empresa} def={acc.def} />;
  redirect(`/${empresa}/administracion/control-administrativo/por-cobrar`);
}
