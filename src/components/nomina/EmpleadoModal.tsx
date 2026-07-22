"use client";

import { useState } from "react";
import { Landmark, Save, User } from "lucide-react";
import type { DatosBancarios, Empleado } from "@/lib/types";
import { BANCOS_VE, CARGOS_BASE } from "@/lib/data/catalogos";
import { Modal } from "@/components/ui/Modal";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

/** Prefijos de operadoras móviles de Venezuela (pago móvil). */
const PREFIJOS_TEL = ["0414", "0424", "0412", "0422", "0416", "0426"] as const;

/** Deja solo los dígitos de un string. */
const soloDigitos = (s: string) => (s ?? "").replace(/\D/g, "");

/** Agrupa los dígitos de la cuenta de a 4 para mostrar: "0000 0000 0000 …". */
const formatCuenta = (digitos: string) => digitos.replace(/(.{4})/g, "$1 ").trim();

/** Puntos de miles es-VE sobre un string de dígitos: "8700558" -> "8.700.558". */
const puntosMiles = (digitos: string) => digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Cédula formateada para mostrar: "V-8.700.558" (rellena a 8 con 0 a la izquierda). */
const formatCedula = (nac: string, digitos: string) =>
  `${nac}-${puntosMiles(digitos.padStart(8, "0"))}`;

/** Teléfono formateado: prefijo + espacio + 7 dígitos → "0412 7398144". */
const formatTelefono = (prefijo: string, digitos: string) =>
  digitos ? `${prefijo} ${digitos}` : "";

/** Separa un pago móvil guardado ("0412 7398144") en prefijo + 7 dígitos. */
const parseTelefono = (valor: string): { prefijo: string; digitos: string } => {
  const d = soloDigitos(valor);
  const pref = PREFIJOS_TEL.find((p) => d.startsWith(p));
  return pref
    ? { prefijo: pref, digitos: d.slice(pref.length, pref.length + 7) }
    : { prefijo: PREFIJOS_TEL[0], digitos: d.slice(0, 7) };
};

/** Separa una cédula guardada ("V-8.700.558") en nacionalidad + dígitos. */
const parseCedula = (valor: string): { nac: string; digitos: string } => {
  const nac = /^e/i.test((valor ?? "").trim()) ? "E" : "V";
  return { nac, digitos: soloDigitos(valor).slice(0, 8) };
};

/** Datos del empleado sin id (payload de alta/edición). */
/** Datos del formulario de empleado. `empresaId` no lo maneja el formulario:
    lo estampa el módulo según la empresa activa. */
export type EmpleadoDatos = Omit<Empleado, "id" | "empresaId">;

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
  cargosExistentes,
  onGuardar,
  onToast,
  onClose,
}: {
  empleado: Empleado | null;
  /** Cargos ya cargados en el sistema, para sugerir en el desplegable. */
  cargosExistentes?: string[];
  onGuardar: (datos: EmpleadoDatos) => void;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  // Sugerencias de cargo: base + los ya cargados + el actual, sin duplicados.
  const cargoSugerencias = Array.from(
    new Set(
      [...CARGOS_BASE, ...(cargosExistentes ?? []), empleado?.cargo ?? ""]
        .map((c) => c.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  const [nombre, setNombre] = useState(empleado?.nombre ?? "");
  const [cargo, setCargo] = useState(empleado?.cargo ?? "");
  const [dpto, setDpto] = useState(empleado?.dpto ?? "Operaciones");
  const [categoria, setCategoria] = useState<Empleado["categoria"]>(
    empleado?.categoria ?? "Semanal"
  );
  const [base, setBase] = useState(empleado ? String(empleado.base) : "");
  const [ingreso, setIngreso] = useState(empleado?.ingreso ?? "");
  const [estatus, setEstatus] = useState<Empleado["estatus"]>(empleado?.estatus ?? "Activo");
  // Los campos bancarios se guardan en el estado como SOLO dígitos; el formato
  // (agrupado, puntos, prefijo) se aplica en pantalla y al persistir.
  const cedulaInicial = parseCedula(empleado?.banco.cedula ?? "");
  const telInicial = parseTelefono(empleado?.banco.pagomovil ?? "");
  const [banco, setBanco] = useState<DatosBancarios>(
    empleado?.banco
      ? {
          ...empleado.banco,
          cuenta: soloDigitos(empleado.banco.cuenta),
          cedula: cedulaInicial.digitos,
          pagomovil: telInicial.digitos,
        }
      : BANCO_VACIO
  );
  const [cedulaNac, setCedulaNac] = useState(cedulaInicial.nac);
  const [telPrefijo, setTelPrefijo] = useState(telInicial.prefijo);
  // Modo "escribir cargo nuevo": arranca activo en edición si el cargo guardado no
  // está entre las sugerencias, para no perderlo.
  const [cargoOtro, setCargoOtro] = useState(
    !!empleado?.cargo && !cargoSugerencias.includes(empleado.cargo)
  );
  // Titular = mismo nombre del empleado (Sí) o un tercero (No). En edición se
  // deduce: Sí si estaba vacío o coincidía con el nombre.
  const [titularEsEmpleado, setTitularEsEmpleado] = useState(
    !empleado ||
      !empleado.banco.titular.trim() ||
      empleado.banco.titular.trim() === empleado.nombre.trim()
  );

  const setB = (campo: keyof DatosBancarios, valor: string) =>
    setBanco((b) => ({ ...b, [campo]: valor }));

  // Si el banco guardado no está en la lista, se antepone para no perderlo.
  const bancoOpciones =
    banco.banco && !BANCOS_VE.includes(banco.banco) ? [banco.banco, ...BANCOS_VE] : BANCOS_VE;

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
    // Validación de datos bancarios (opcionales: vacío es válido; a medias no).
    const cuenta = soloDigitos(banco.cuenta);
    const cedula = soloDigitos(banco.cedula);
    const pagomovil = soloDigitos(banco.pagomovil);
    if (cuenta && cuenta.length !== 20) {
      onToast("El número de cuenta debe tener 20 dígitos");
      return;
    }
    if (cedula && cedula.length < 7) {
      onToast("La cédula debe tener al menos 7 dígitos");
      return;
    }
    if (pagomovil && pagomovil.length !== 7) {
      onToast("El teléfono de pago móvil debe tener 7 dígitos");
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
        cuenta,
        titular: titularEsEmpleado ? n : banco.titular.trim(),
        cedula: cedula ? formatCedula(cedulaNac, cedula) : "",
        pagomovil: pagomovil ? formatTelefono(telPrefijo, pagomovil) : "",
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
              <select
                className={inputCls}
                value={cargoOtro ? "__otro" : cargo}
                onChange={(e) => {
                  if (e.target.value === "__otro") {
                    setCargoOtro(true);
                    setCargo("");
                  } else {
                    setCargoOtro(false);
                    setCargo(e.target.value);
                  }
                }}
              >
                <option value="">Selecciona…</option>
                {cargoSugerencias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__otro">Otro…</option>
              </select>
              {cargoOtro && (
                <input
                  className={`${inputCls} mt-2`}
                  placeholder="Escribe el nuevo cargo"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                />
              )}
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
              <select
                className={inputCls}
                value={banco.banco}
                onChange={(e) => setB("banco", e.target.value)}
              >
                <option value="">Selecciona…</option>
                {bancoOpciones.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
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
                value={formatCuenta(banco.cuenta)}
                onChange={(e) => setB("cuenta", soloDigitos(e.target.value).slice(0, 20))}
              />
              {banco.cuenta.length > 0 && banco.cuenta.length < 20 && (
                <p className="mt-1 text-xs text-red-600">
                  Cuenta incompleta: faltan {20 - banco.cuenta.length} dígito
                  {20 - banco.cuenta.length === 1 ? "" : "s"} (deben ser 20).
                </p>
              )}
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="block text-sm font-600 text-navy-900">
                  Titular <span className="font-400 text-slate-400">¿es el empleado?</span>
                </label>
                <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-xs font-600">
                  <button
                    type="button"
                    title="Usa el Nombre completo del empleado"
                    onClick={() => setTitularEsEmpleado(true)}
                    className={
                      titularEsEmpleado
                        ? "bg-navy-900 px-3 py-1 text-white"
                        : "bg-white px-3 py-1 text-navy-700 hover:bg-slate-50"
                    }
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    title="Escribe otro nombre de titular"
                    onClick={() => setTitularEsEmpleado(false)}
                    className={
                      !titularEsEmpleado
                        ? "bg-navy-900 px-3 py-1 text-white"
                        : "bg-white px-3 py-1 text-navy-700 hover:bg-slate-50"
                    }
                  >
                    No
                  </button>
                </div>
              </div>
              {titularEsEmpleado ? (
                <input
                  readOnly
                  title="Toma el Nombre completo del empleado"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 outline-none"
                  value={nombre}
                  placeholder="(se toma del Nombre completo)"
                />
              ) : (
                <input
                  className={inputCls}
                  placeholder="Nombre del titular"
                  value={banco.titular}
                  onChange={(e) => setB("titular", e.target.value)}
                />
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Cédula del titular</label>
              <div className="flex gap-2">
                <select
                  aria-label="Nacionalidad"
                  className="w-16 rounded-xl border border-slate-300 bg-white px-2 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                  value={cedulaNac}
                  onChange={(e) => setCedulaNac(e.target.value)}
                >
                  <option value="V">V</option>
                  <option value="E">E</option>
                </select>
                <input
                  inputMode="numeric"
                  placeholder="8.700.558"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                  value={banco.cedula ? puntosMiles(banco.cedula) : ""}
                  onChange={(e) => setB("cedula", soloDigitos(e.target.value).slice(0, 8))}
                />
              </div>
              {banco.cedula.length > 0 && banco.cedula.length < 7 && (
                <p className="mt-1 text-xs text-red-600">
                  Cédula incompleta (debe tener al menos 7 dígitos).
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-600 text-navy-900">
                Teléfono (pago móvil)
              </label>
              <div className="flex gap-2">
                <select
                  aria-label="Prefijo"
                  className="w-24 rounded-xl border border-slate-300 bg-white px-2 py-2.5 font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                  value={telPrefijo}
                  onChange={(e) => setTelPrefijo(e.target.value)}
                >
                  {PREFIJOS_TEL.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <input
                  inputMode="numeric"
                  placeholder="7398144"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                  value={banco.pagomovil}
                  onChange={(e) => setB("pagomovil", soloDigitos(e.target.value).slice(0, 7))}
                />
              </div>
              {banco.pagomovil.length > 0 && banco.pagomovil.length < 7 && (
                <p className="mt-1 text-xs text-red-600">
                  Teléfono incompleto (deben ser 7 dígitos).
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
