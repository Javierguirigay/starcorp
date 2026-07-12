import { redirect } from "next/navigation";

/** Retenciones se mudó al sub-módulo Gestión de Compras de Facturación. */
export default function RetencionesPage() {
  redirect("/loter/administracion/facturas?vista=compras&tab=retenciones");
}
