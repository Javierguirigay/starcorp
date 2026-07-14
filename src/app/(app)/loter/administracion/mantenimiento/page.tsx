import { redirect } from "next/navigation";

/** Mantenimiento se mudó al apartado de Operaciones. */
export default function MantenimientoRedirect() {
  redirect("/loter/operaciones/mantenimiento");
}
