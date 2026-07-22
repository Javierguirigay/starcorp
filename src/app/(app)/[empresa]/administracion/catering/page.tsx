import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { accesoModulo } from "@/lib/modulos";
import { ModuloEnPreparacion } from "@/components/layout/ModuloEnPreparacion";

export const metadata: Metadata = { title: `Sistema de Catering · ${APP_NAME}` };

/**
 * Sistema de Catering (ETM SUPPLY): por ahora solo el nombre del módulo. Su
 * estructura se definirá más adelante y de ahí saldrán sus submódulos.
 */
export default async function CateringPage({
  params,
}: {
  params: Promise<{ empresa: string }>;
}) {
  const { empresa } = await params;
  const acc = accesoModulo(empresa, "catering");
  if (!acc) notFound();
  return <ModuloEnPreparacion empresa={acc.empresa} def={acc.def} />;
}
