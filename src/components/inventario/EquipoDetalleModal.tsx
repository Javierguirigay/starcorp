"use client";

/**
 * Detalle (solo lectura) de un equipo: ficha técnica + consumibles que usa con
 * su stock actual (En stock / Bajo / Agotado), leyendo el catálogo de
 * consumibles del provider.
 */
import type { Equipo } from "@/lib/types";
import { CATEGORIAS_EQUIPO } from "@/lib/data/equipos";
import { estadoStock, ETIQUETA_STOCK, type EstadoStock } from "@/lib/negocio/inventario";
import { Modal } from "@/components/ui/Modal";
import { useInventario } from "./InventarioProvider";

const BADGE_STOCK: Record<EstadoStock, string> = {
  ok: "bg-emerald-50 text-emerald-700",
  bajo: "bg-amber-50 text-amber-700",
  agotado: "bg-rose-50 text-rose-700",
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string }) {
  if (!valor) return null;
  return (
    <div>
      <p className="text-[11px] font-600 uppercase tracking-wide text-slate-400">{etiqueta}</p>
      <p className="text-sm text-navy-900">{valor}</p>
    </div>
  );
}

export function EquipoDetalleModal({
  equipo,
  onClose,
}: {
  equipo: Equipo;
  onClose: () => void;
}) {
  const inv = useInventario();
  const ficha = equipo.ficha ?? {};
  const consumibles = equipo.consumibles ?? [];
  const sinFicha =
    !ficha.marca && !ficha.modelo && !ficha.serial && !ficha.motor && !ficha.garantia && !ficha.notas;

  return (
    <Modal
      onClose={onClose}
      title={equipo.codigo}
      subtitle={`${CATEGORIAS_EQUIPO[equipo.categoria]} · ${inv.estadoDe(equipo.codigo)} · ${equipo.ubicacion}`}
      maxWidth="max-w-2xl"
      footer={
        <button
          onClick={onClose}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
        >
          Cerrar
        </button>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-3 text-xs font-600 uppercase tracking-wide text-slate-400">
            Ficha técnica
          </p>
          {sinFicha ? (
            <p className="text-sm text-slate-400">Sin ficha técnica registrada.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Dato etiqueta="Marca" valor={ficha.marca} />
              <Dato etiqueta="Modelo" valor={ficha.modelo} />
              <Dato etiqueta="Serial" valor={ficha.serial} />
              <Dato etiqueta="Motor" valor={ficha.motor} />
              <Dato etiqueta="Garantía" valor={ficha.garantia} />
              <Dato etiqueta="Notas" valor={ficha.notas} />
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-xs font-600 uppercase tracking-wide text-slate-400">
            Consumibles / repuestos que usa
          </p>
          {consumibles.length === 0 ? (
            <p className="text-sm text-slate-400">Este equipo no tiene consumibles vinculados.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[10px] uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2 font-600">Rol</th>
                    <th className="px-3 py-2 font-600">Consumible</th>
                    <th className="px-3 py-2 text-right font-600">Stock</th>
                    <th className="px-3 py-2 font-600">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {consumibles.map((v, i) => {
                    const c = inv.consumiblePorId(v.consumibleId);
                    const est = c ? estadoStock(c) : "agotado";
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2 text-navy-900">{v.rol}</td>
                        <td className="px-3 py-2 text-slate-600">{c?.nombre ?? "— (eliminado)"}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-navy-900">
                          {c ? `${c.cantidad} ${c.unidad}` : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-600 ${BADGE_STOCK[est]}`}
                          >
                            {c ? ETIQUETA_STOCK[est] : "Sin catálogo"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
