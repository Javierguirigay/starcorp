"use client";

/**
 * Alta/edición de un reporte de servicio: los reportes son PDF ESCANEADOS
 * (manuscritos), así que NO hay extracción automática — se sube el PDF y se
 * transcribe a mano con el visor al lado (dos columnas en desktop).
 */
import { useRef, useState } from "react";
import { Plus, Trash2, UploadCloud } from "lucide-react";
import type { ReporteServicio } from "@/lib/types";
import { fmtISO } from "@/lib/format";
import { diasDePeriodo } from "@/lib/negocio/facturacion";
import { Modal } from "@/components/ui/Modal";
import { useFacturacion } from "../FacturacionProvider";
import { VisorPdf } from "../VisorPdf";
import { ClienteModal } from "./ClienteModal";

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

interface PeriodoForm {
  key: number;
  concepto: string;
  desde: string;
  hasta: string;
  diasTexto: string;
  /** USD referencial del servicio elegido del catálogo (undefined = texto libre). */
  tarifaRef?: number;
}

export function ReporteModal({
  reporte,
  onToast,
  onClose,
}: {
  reporte: ReporteServicio | null;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const fac = useFacturacion();

  const [numeroControl, setNumeroControl] = useState(reporte?.numeroControl ?? "");
  const [fecha, setFecha] = useState(reporte?.fecha ?? fmtISO(new Date()));
  const [clienteId, setClienteId] = useState<number | "">(reporte?.clienteId ?? "");
  const [locacion, setLocacion] = useState(reporte?.locacion ?? "");
  const [pozo, setPozo] = useState(reporte?.pozo ?? "");
  const [tipoEquipo, setTipoEquipo] = useState(reporte?.tipoEquipo ?? "");
  const [placas, setPlacas] = useState(reporte?.placas ?? "");
  const [descripcion, setDescripcion] = useState(reporte?.descripcion ?? "");
  const [supervisorNombre, setSupervisorNombre] = useState(reporte?.supervisorNombre ?? "");
  const [supervisorCI, setSupervisorCI] = useState(reporte?.supervisorCI ?? "");
  const [periodos, setPeriodos] = useState<PeriodoForm[]>(
    reporte?.periodos.map((p, i) => ({
      key: i + 1,
      concepto: p.concepto,
      desde: p.desde,
      hasta: p.hasta,
      diasTexto: String(p.dias),
      tarifaRef: p.tarifaRef,
    })) ?? [{ key: 1, concepto: "", desde: "", hasta: "", diasTexto: "" }]
  );
  const [nextKey, setNextKey] = useState((reporte?.periodos.length ?? 1) + 1);
  const [pdfUrl, setPdfUrl] = useState(reporte?.pdfUrl);
  const [pdfNombre, setPdfNombre] = useState(reporte?.pdfNombre);
  const [modalCliente, setModalCliente] = useState(false);
  // Object URLs creados en esta sesión del modal (para revocar los no usados).
  const creados = useRef<string[]>([]);

  const alSubir = (f: File | undefined) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    creados.current.push(url);
    setPdfUrl(url);
    setPdfNombre(f.name);
  };

  // Catálogo de servicios (Gestión de Tarifas) para el selector con filtro.
  const tarifasActivas = fac.tarifas.filter((t) => t.activo);

  // Al escribir/elegir el concepto: si coincide exacto con un servicio del
  // catálogo, captura su tarifa referencial; si es texto libre, la limpia.
  const alCambiarConcepto = (key: number, valor: string) => {
    const match = tarifasActivas.find(
      (t) => t.descripcion.toLowerCase() === valor.trim().toLowerCase()
    );
    editarPeriodo(key, { concepto: valor, tarifaRef: match?.tarifaRef });
  };

  const editarPeriodo = (key: number, cambios: Partial<PeriodoForm>) => {
    setPeriodos((prev) =>
      prev.map((p) => {
        if (p.key !== key) return p;
        const nuevo = { ...p, ...cambios };
        // Días auto-calculados desde el rango; el usuario puede corregirlos.
        if (("desde" in cambios || "hasta" in cambios) && nuevo.desde && nuevo.hasta) {
          const d = diasDePeriodo(nuevo.desde, nuevo.hasta);
          nuevo.diasTexto = d > 0 ? String(d) : "";
        }
        return nuevo;
      })
    );
  };

  const cerrar = (urlGuardada?: string) => {
    creados.current.filter((u) => u !== urlGuardada).forEach((u) => URL.revokeObjectURL(u));
    onClose();
  };

  const guardar = () => {
    if (!numeroControl.trim()) return onToast("Indica el N° de control del reporte");
    if (!fecha) return onToast("Indica la fecha del reporte");
    if (clienteId === "") return onToast("Selecciona el cliente");
    const lineas = periodos.filter(
      (p) => p.concepto.trim() && p.desde && p.hasta && parseInt(p.diasTexto, 10) > 0
    );
    if (!lineas.length)
      return onToast("Agrega al menos un período de servicio completo (concepto, fechas y días)");
    const datos = {
      numeroControl: numeroControl.trim(),
      fecha,
      clienteId,
      locacion: locacion.trim(),
      pozo: pozo.trim(),
      tipoEquipo: tipoEquipo.trim(),
      ...(placas.trim() ? { placas: placas.trim() } : {}),
      descripcion: descripcion.trim(),
      periodos: lineas.map((p, i) => ({
        id: i + 1,
        concepto: p.concepto.trim(),
        desde: p.desde,
        hasta: p.hasta,
        dias: parseInt(p.diasTexto, 10),
        ...(p.tarifaRef ? { tarifaRef: p.tarifaRef } : {}),
      })),
      supervisorNombre: supervisorNombre.trim(),
      supervisorCI: supervisorCI.trim(),
      ...(pdfUrl ? { pdfUrl, pdfNombre } : {}),
    };
    if (reporte) fac.editarReporte(reporte.id, datos);
    else fac.crearReporte(datos);
    onToast(reporte ? "Reporte actualizado" : "Reporte registrado");
    cerrar(pdfUrl);
  };

  return (
    <>
      <Modal
        onClose={() => cerrar(reporte?.pdfUrl)}
        title={reporte ? "Editar reporte de servicio" : "Nuevo reporte de servicio"}
        subtitle="Sube el PDF escaneado y transcribe los datos viendo el documento"
        maxWidth="max-w-6xl"
        footer={
          <>
            <button
              onClick={() => cerrar(reporte?.pdfUrl)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-600 text-navy-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
            >
              {reporte ? "Guardar cambios" : "Registrar reporte"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Visor + subida */}
          <div className="flex flex-col gap-3">
            <label className="group flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-600 text-navy-700 transition hover:border-navy-400 hover:bg-navy-50/30">
              <UploadCloud className="h-4 w-4" />
              {pdfNombre ? `Reemplazar PDF (${pdfNombre})` : "Subir PDF escaneado del reporte"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => alSubir(e.target.files?.[0])}
              />
            </label>
            <div className="min-h-0 flex-1">
              <VisorPdf url={pdfUrl} nombre={pdfNombre} />
            </div>
          </div>

          {/* Formulario */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">N° de Control</label>
                <input type="text" value={numeroControl} onChange={(e) => setNumeroControl(e.target.value)} placeholder="00384" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">Fecha del reporte</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-600 text-navy-900">Cliente</label>
                <button
                  onClick={() => setModalCliente(true)}
                  className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
                >
                  <Plus className="h-3.5 w-3.5" /> Nuevo cliente
                </button>
              </div>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value === "" ? "" : Number(e.target.value))}
                className={inputCls}
              >
                <option value="">Selecciona…</option>
                {fac.clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razonSocial}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">Locación</label>
                <input type="text" value={locacion} onChange={(e) => setLocacion(e.target.value)} placeholder="Punta de Mata" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">Pozo</label>
                <input type="text" value={pozo} onChange={(e) => setPozo(e.target.value)} placeholder="MUC-102" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">Tipo de vehículo / equipo</label>
                <input type="text" value={tipoEquipo} onChange={(e) => setTipoEquipo(e.target.value)} placeholder="Generador, Luminarias…" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">Placas (opcional)</label>
                <input type="text" value={placas} onChange={(e) => setPlacas(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-600 text-navy-900">Descripción del trabajo realizado</label>
              <textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={`${inputCls} resize-none`} />
            </div>

            {/* Períodos de servicio */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-600 text-navy-900">Períodos de servicio</label>
                <button
                  onClick={() => {
                    setPeriodos((prev) => [
                      ...prev,
                      { key: nextKey, concepto: "", desde: "", hasta: "", diasTexto: "" },
                    ]);
                    setNextKey((k) => k + 1);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-600 text-navy-700 hover:text-navy-900"
                >
                  <Plus className="h-3.5 w-3.5" /> Añadir período
                </button>
              </div>
              <datalist id="tarifas-catalogo">
                {tarifasActivas.map((t) => (
                  <option key={t.id} value={t.descripcion} />
                ))}
              </datalist>
              <div className="space-y-2">
                {periodos.map((p) => (
                  <div key={p.key} className="flex items-end gap-2 rounded-xl border border-slate-200 p-2">
                    <div className="min-w-0 flex-1">
                      <label className="mb-0.5 block text-[10px] font-600 uppercase text-slate-400">Equipo / concepto</label>
                      <input
                        type="text"
                        list="tarifas-catalogo"
                        value={p.concepto}
                        onChange={(e) => alCambiarConcepto(p.key, e.target.value)}
                        placeholder="Elige un servicio o escribe uno…"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-600 uppercase text-slate-400">Desde</label>
                      <input type="date" value={p.desde} onChange={(e) => editarPeriodo(p.key, { desde: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-600 uppercase text-slate-400">Hasta</label>
                      <input type="date" value={p.hasta} onChange={(e) => editarPeriodo(p.key, { hasta: e.target.value })} className={inputCls} />
                    </div>
                    <div className="w-16">
                      <label className="mb-0.5 block text-[10px] font-600 uppercase text-slate-400">Días</label>
                      <input type="number" min={0} value={p.diasTexto} onChange={(e) => editarPeriodo(p.key, { diasTexto: e.target.value })} className={`${inputCls} text-right font-mono`} />
                    </div>
                    <button
                      title="Quitar período"
                      onClick={() => setPeriodos((prev) => prev.filter((x) => x.key !== p.key))}
                      disabled={periodos.length === 1}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">Supervisor cliente</label>
                <input type="text" value={supervisorNombre} onChange={(e) => setSupervisorNombre(e.target.value)} placeholder="Nombre y apellido" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-600 text-navy-900">C.I. del supervisor</label>
                <input type="text" value={supervisorCI} onChange={(e) => setSupervisorCI(e.target.value)} placeholder="10.063.348" className={inputCls} />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {modalCliente && (
        <ClienteModal
          onCreado={(id) => setClienteId(id)}
          onToast={onToast}
          onClose={() => setModalCliente(false)}
        />
      )}
    </>
  );
}
