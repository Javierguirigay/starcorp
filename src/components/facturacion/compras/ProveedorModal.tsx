"use client";

/** Alta al vuelo de un proveedor (registro reutilizable). */
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useFacturacion } from "../FacturacionProvider";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function ProveedorModal({
  onCreado,
  onToast,
  onClose,
}: {
  /** Recibe el id del proveedor recién creado (para autoseleccionarlo). */
  onCreado?: (id: number) => void;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const fac = useFacturacion();
  const [razonSocial, setRazonSocial] = useState("");
  const [rif, setRif] = useState("");
  const [direccion, setDireccion] = useState("");
  const [tipo, setTipo] = useState("");

  const guardar = () => {
    if (!razonSocial.trim() || !rif.trim()) {
      onToast("Indica la razón social y el RIF del proveedor");
      return;
    }
    const id = fac.nextProveedorId; // id que recibirá, conocido antes de despachar
    fac.crearProveedor({
      razonSocial: razonSocial.trim(),
      rif: rif.trim(),
      direccion: direccion.trim(),
      tipo: tipo.trim(),
    });
    onCreado?.(id);
    onToast("Proveedor registrado");
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title="Nuevo proveedor"
      subtitle="Registro reutilizable para facturas recibidas y retenciones"
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
          >
            Guardar proveedor
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Razón social</label>
          <input type="text" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} className={inputCls} placeholder="Ej: INBIOBRI, C.A." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">RIF</label>
            <input type="text" value={rif} onChange={(e) => setRif(e.target.value)} className={inputCls} placeholder="J-00000000-0" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-600 text-navy-900">Tipo de proveedor</label>
            <input type="text" value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls} placeholder="Repuestos, Servicios…" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Dirección fiscal</label>
          <textarea rows={2} value={direccion} onChange={(e) => setDireccion(e.target.value)} className={`${inputCls} resize-none`} />
        </div>
      </div>
    </Modal>
  );
}
