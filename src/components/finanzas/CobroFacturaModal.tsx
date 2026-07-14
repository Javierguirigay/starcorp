"use client";

/**
 * Confirmación de cobro de una factura de venta con selección de la cuenta
 * de Finanzas donde entra el dinero (sustituye al confirm() nativo).
 * Compartido por Facturación (pestaña Factura) y Control Administrativo
 * (Cartera / cuentas por cobrar). El registro lo hace el caller en
 * onConfirmar(cuentaId); una cuenta que no es VES recibe el equivalente
 * convertido con la tasa snapshot de la factura.
 */
import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { money } from "@/lib/format";
import { convertirMonto, SIMBOLO_MONEDA } from "@/lib/negocio/finanzas";
import { Modal } from "@/components/ui/Modal";
import { useFinanzas } from "./FinanzasProvider";
import { SelectorCuenta } from "./SelectorCuenta";

export function CobroFacturaModal({
  empresaId,
  numeroFactura,
  clienteNombre,
  totalBs,
  tasaBs,
  onConfirmar,
  onClose,
}: {
  empresaId: string;
  numeroFactura: string;
  clienteNombre: string;
  totalBs: number;
  /** Tasa snapshot de la factura (con la que se convierte el movimiento). */
  tasaBs: number;
  onConfirmar: (cuentaId: number) => void;
  onClose: () => void;
}) {
  const finanzas = useFinanzas();
  const [cuentaId, setCuentaId] = useState<number | "">(
    finanzas.cuentaPredeterminadaDe(empresaId)?.id ?? ""
  );
  const cuenta =
    cuentaId === "" ? undefined : finanzas.cuentasDe(empresaId).find((c) => c.id === cuentaId);
  const [error, setError] = useState<string | null>(null);

  const confirmar = () => {
    if (cuentaId === "") {
      setError("Selecciona la cuenta donde entra el cobro");
      return;
    }
    onConfirmar(cuentaId);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={`Cobrar Factura N° ${numeroFactura}`}
      subtitle={`${clienteNombre} · se registrará la entrada en Finanzas`}
      maxWidth="max-w-md"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-600 text-white hover:bg-emerald-700"
          >
            <CheckCheck className="h-4 w-4" /> Confirmar cobro
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-400">Monto de la factura</p>
          <p className="font-mono text-xl font-700 text-navy-950">{money(totalBs, "Bs")}</p>
          {cuenta && cuenta.moneda !== "VES" && tasaBs > 0 && (
            <p className="font-mono text-xs text-slate-400">
              Entra como{" "}
              {money(
                convertirMonto(totalBs, "VES", cuenta.moneda, tasaBs),
                SIMBOLO_MONEDA[cuenta.moneda]
              )}{" "}
              (tasa {money(tasaBs, "Bs")})
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-600 text-navy-900">Cuenta destino</label>
          <SelectorCuenta
            empresaId={empresaId}
            value={cuentaId}
            onChange={(id) => {
              setCuentaId(id);
              setError(null);
            }}
          />
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>
      </div>
    </Modal>
  );
}
