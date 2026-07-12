"use client";

/** Alta al vuelo de un cliente (registro simple reutilizable). */
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useFacturacion } from "../FacturacionProvider";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function ClienteModal({
  onCreado,
  onToast,
  onClose,
}: {
  /** Recibe el id del cliente recién creado (para autoseleccionarlo). */
  onCreado?: (id: number) => void;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const fac = useFacturacion();
  const [razonSocial, setRazonSocial] = useState("");
  const [rif, setRif] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [telefono, setTelefono] = useState("");

  const guardar = () => {
    if (!razonSocial.trim() || !rif.trim()) {
      onToast("Indica la razón social y el RIF del cliente");
      return;
    }
    const id = fac.nextClienteId; // id que recibirá, conocido antes de despachar
    fac.crearCliente({
      razonSocial: razonSocial.trim(),
      rif: rif.trim(),
      domicilio: domicilio.trim(),
      telefono: telefono.trim(),
    });
    onCreado?.(id);
    onToast("Cliente registrado");
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title="Nuevo cliente"
      subtitle="Registro reutilizable para pre-facturas y facturas"
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
            Guardar cliente
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Razón social</label>
          <input type="text" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} className={inputCls} placeholder="Ej: CORPORACION IESV C.A" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">RIF</label>
          <input type="text" value={rif} onChange={(e) => setRif(e.target.value)} className={inputCls} placeholder="J-00000000-0" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Domicilio fiscal</label>
          <textarea rows={2} value={domicilio} onChange={(e) => setDomicilio(e.target.value)} className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Teléfono</label>
          <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputCls} placeholder="0291-000.00.00" />
        </div>
      </div>
    </Modal>
  );
}
