"use client";

import { useState } from "react";
import { Landmark, Save, User } from "lucide-react";
import type { DatosBancarios, Empleado } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

/** Datos del empleado sin id (payload de alta/edición). */
export type EmpleadoDatos = Omit<Empleado, "id">;

const BANCO_VACIO: DatosBancarios = {
  banco: "",
  tipo: "Corriente",
  cuenta: "",
  titular: "",
  cedula: "",
  pagomovil: "",
};

export function EmpleadoModal({
  empleado,
  onGuardar,
  onToast,
  onClose,
}: {
  empleado: Empleado | null;
  onGuardar: (datos: EmpleadoDatos) => void;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(empleado?.nombre ?? "");
  const [cargo, setCargo] = useState(empleado?.cargo ?? "");
  const [dpto, setDpto] = useState(empleado?.dpto ?? "Operaciones");
  const [categoria, setCategoria] = useState<Empleado["categoria"]>(
    empleado?.categoria ?? "Semanal"
  );
  const [base, setBase] = useState(empleado ? String(empleado.base) : "");
  const [ingreso, setIngreso] = useState(empleado?.ingreso ?? "");
  const [estatus, setEstatus] = useState<Empleado["estatus"]>(empleado?.estatus ?? "Activo");
  const [banco, setBanco] = useState<DatosBancarios>(empleado?.banco ?? BANCO_VACIO);

  const setB = (campo: keyof DatosBancarios, valor: string) =>
    setBanco((b) => ({ ...b, [campo]: valor }));

  const guardar = () => {
    const n = nombre.trim();
    const b = parseFloat(base);
    if (!n) {
      onToast("El nombre es obligatorio");
      return;
    }
    if (isNaN(b) || b < 0) {
      onToast("Indica un salario base válido");
      return;
    }
    onGuardar({
      nombre: n,
      cargo: cargo.trim(),
      dpto,
      categoria,
      base: b,
      ingreso,
      estatus,
      banco: {
        banco: banco.banco.trim(),
        tipo: banco.tipo,
        cuenta: banco.cuenta.trim(),
        titular: banco.titular.trim(),
        cedula: banco.cedula.trim(),
        pagomovil: banco.pagomovil.trim(),
      },
    });
  };

  return (
    <Modal
      onClose={onClose}
      title={empleado ? "Editar empleado" : "Nuevo empleado"}
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
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
          >
            <Save className="h-[18px] w-[18px]" /> Guardar
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Datos del empleado */}
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-600 uppercase tracking-wide text-slate-400">
            <User className="h-3.5 w-3.5" /> Datos del empleado
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Nombre completo</label>
              <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Cargo</label>
              <input className={inputCls} value={cargo} onChange={(e) => setCargo(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Departamento</label>
              <select className={inputCls} value={dpto} onChange={(e) => setDpto(e.target.value)}>
                <option>Operaciones</option>
                <option>Administración</option>
                <option>Otro</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Categoría de pago</label>
              <select
                className={inputCls}
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as Empleado["categoria"])}
              >
                <option value="Semanal">Semanal</option>
                <option value="Quincenal">Quincenal</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">
                Salario base mensual (USD)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-7 pr-3 text-right font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Fecha de ingreso</label>
              <input
                type="date"
                className={inputCls}
                value={ingreso}
                onChange={(e) => setIngreso(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Estatus</label>
              <select
                className={inputCls}
                value={estatus}
                onChange={(e) => setEstatus(e.target.value as Empleado["estatus"])}
              >
                <option>Activo</option>
                <option>Permiso</option>
                <option>Inactivo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Datos bancarios */}
        <div className="border-t border-slate-100 pt-5">
          <p className="mb-3 flex items-center gap-2 text-xs font-600 uppercase tracking-wide text-slate-400">
            <Landmark className="h-3.5 w-3.5" /> Datos bancarios
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Banco</label>
              <input
                className={inputCls}
                value={banco.banco}
                onChange={(e) => setB("banco", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Tipo de cuenta</label>
              <select
                className={inputCls}
                value={banco.tipo}
                onChange={(e) => setB("tipo", e.target.value)}
              >
                <option>Corriente</option>
                <option>Ahorro</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Número de cuenta</label>
              <input
                inputMode="numeric"
                placeholder="0000 0000 0000 0000 0000"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                value={banco.cuenta}
                onChange={(e) => setB("cuenta", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Titular</label>
              <input
                className={inputCls}
                value={banco.titular}
                onChange={(e) => setB("titular", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Cédula del titular</label>
              <input
                placeholder="V-00.000.000"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                value={banco.cedula}
                onChange={(e) => setB("cedula", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-600 text-navy-900">
                Teléfono (pago móvil)
              </label>
              <input
                placeholder="0414-0000000"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                value={banco.pagomovil}
                onChange={(e) => setB("pagomovil", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
