"use client";

/**
 * Orden de asignación conectada al inventario vivo: el selector solo ofrece
 * equipos Disponibles (ni en taller ni ya asignados), y Guardar persiste una
 * asignación Activa por fila — el equipo pasa a "Asignado" al instante porque
 * su estado se deriva de las asignaciones. La fecha "hasta" es opcional: puede
 * dejarse en blanco (queda "en curso") y fijarse al Finalizar en el historial.
 * Generar orden (PDF) produce el documento con el membrete de LOTER.
 */
import { useEffect, useState } from "react";
import { FileDown, Plus, Save, User, UserCheck, X } from "lucide-react";
import { LOTER_RIF, LOTER_TELEFONO } from "@/lib/config";
import { diasEntre } from "@/lib/negocio/fechas";
import { derivarEstadoEquipo, equiposDisponibles } from "@/lib/negocio/inventario";
import { useInventario } from "@/components/inventario/InventarioProvider";
import { LogoMark } from "@/components/ui/LogoMark";
import { Toast } from "@/components/ui/Toast";
import { PdfPreviewModal, type PreviewPdf } from "@/components/facturacion/PdfPreviewModal";

interface FilaAsig {
  uid: number; // key local; el ID S-00x definitivo lo asigna el provider al guardar
  equipo: string;
  desde: string;
  hasta: string;
  observaciones: string;
}

const inp =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-navy-400 focus:ring-1 focus:ring-navy-100";

function nuevaFila(uid: number): FilaAsig {
  return { uid, equipo: "", desde: "", hasta: "", observaciones: "" };
}

/** Días de una fila: número si el rango es válido, 0 mientras no tenga "hasta". */
function diasDeFila(f: Pick<FilaAsig, "desde" | "hasta">): number {
  if (!f.hasta) return 0;
  const d = diasEntre(f.desde, f.hasta);
  return d === "" ? 0 : d;
}

export function OrdenAsignacion() {
  const inv = useInventario();

  const [uid, setUid] = useState(1);
  const [filas, setFilas] = useState<FilaAsig[]>([nuevaFila(0)]);
  const [numero, setNumero] = useState("ASG-2026-002");
  const [fechaSolicitud, setFechaSolicitud] = useState("2026-06-18");
  const [cliente, setCliente] = useState("");
  const [entregadoPor, setEntregadoPor] = useState("");
  const [recibidoPor, setRecibidoPor] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [preview, setPreview] = useState<PreviewPdf | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const disponibles = equiposDisponibles(inv.equipos, inv.mantenimientos, inv.asignaciones);

  // ID que recibirá la fila al guardarse (previsualización).
  const idPreliminar = (idx: number) =>
    "S-" + String(inv.siguienteAsig + 1 + idx).padStart(3, "0");

  const agregar = () => {
    setFilas((fs) => [...fs, nuevaFila(uid)]);
    setUid((u) => u + 1);
  };

  const quitar = (u: number) => setFilas((fs) => fs.filter((f) => f.uid !== u));

  const editar = (u: number, campo: keyof Omit<FilaAsig, "uid">, valor: string) =>
    setFilas((fs) => fs.map((f) => (f.uid === u ? { ...f, [campo]: valor } : f)));

  /** Valida los campos comunes de la orden; devuelve las filas con equipo o null. */
  const validar = (): FilaAsig[] | null => {
    if (!cliente.trim()) {
      setToast("Indica el cliente / proyecto");
      return null;
    }
    const conEquipo = filas.filter((f) => f.equipo);
    if (conEquipo.length === 0) {
      setToast("Agrega al menos un equipo");
      return null;
    }
    for (const f of conEquipo) {
      if (!f.desde) {
        setToast(`Indica la fecha "desde" de "${f.equipo}"`);
        return null;
      }
      // "hasta" es opcional; si se indica, el rango debe ser válido.
      if (f.hasta && diasEntre(f.desde, f.hasta) === "") {
        setToast(`El rango de fechas de "${f.equipo}" es inválido`);
        return null;
      }
    }
    const codigos = conEquipo.map((f) => f.equipo);
    if (new Set(codigos).size !== codigos.length) {
      setToast("Hay equipos repetidos en la orden");
      return null;
    }
    return conEquipo;
  };

  const guardar = () => {
    const validas = validar();
    if (!validas) return;
    // Revalidación al guardar: otro flujo pudo ocupar el equipo entre tanto.
    const ocupado = validas
      .map((f) => f.equipo)
      .find((c) => derivarEstadoEquipo(c, inv.mantenimientos, inv.asignaciones) !== "Disponible");
    if (ocupado) return setToast(`"${ocupado}" ya no está disponible`);

    inv.crearAsignaciones(
      validas.map((f) => ({
        cliente: cliente.trim(),
        equipos: [f.equipo],
        desde: f.desde,
        hasta: f.hasta,
        dias: diasDeFila(f),
        estado: "Activo" as const,
        observaciones: f.observaciones.trim(),
      }))
    );
    setFilas([nuevaFila(uid)]);
    setUid((u) => u + 1);
    setCliente("");
    setEntregadoPor("");
    setRecibidoPor("");
    setObservaciones("");
    setToast("Asignación guardada");
  };

  const exportar = async () => {
    if (generando) return;
    const validas = validar();
    if (!validas) return;
    setGenerando(true);
    try {
      const [{ OrdenAsignacionDoc }, { generarPdfBlob, slug }] = await Promise.all([
        import("./pdf/documentoAsignacion"),
        import("@/components/pdf/descargar"),
      ]);
      const datos = {
        numero: numero.trim(),
        fecha: fechaSolicitud,
        cliente: cliente.trim(),
        observaciones: observaciones.trim(),
        entregadoPor: entregadoPor.trim(),
        recibidoPor: recibidoPor.trim(),
        filas: validas.map((f, idx) => ({
          id: idPreliminar(idx),
          equipo: f.equipo,
          desde: f.desde,
          hasta: f.hasta,
          dias: diasDeFila(f),
          observaciones: f.observaciones.trim(),
        })),
      };
      const blob = await generarPdfBlob(<OrdenAsignacionDoc datos={datos} />);
      setPreview({
        url: URL.createObjectURL(blob),
        nombre: `orden_asignacion_${slug(numero || cliente)}.pdf`,
        titulo: "Orden de Asignación de Equipos",
      });
    } catch {
      setToast("No se pudo generar el PDF");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {/* Encabezado de la orden */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex items-center justify-between bg-navy-950 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-navy-900 ring-1 ring-white/10">
              <LogoMark className="h-5 w-5" />
            </span>
            <div className="leading-tight text-white">
              <p className="font-display text-sm font-700">LOTER, C.A. · Orden de asignación</p>
              <p className="text-[11px] text-slate-400">
                {LOTER_RIF} · {LOTER_TELEFONO}
              </p>
            </div>
          </div>
          <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-600 text-white sm:block">
            Control de servicios y equipos
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
              Nro. de requerimiento
            </label>
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm font-600 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
              Fecha de solicitud
            </label>
            <input
              type="date"
              value={fechaSolicitud}
              onChange={(e) => setFechaSolicitud(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400">
              Cliente / Proyecto
            </label>
            <input
              placeholder="Ej: IESV / Pozo SBC-37"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
            />
          </div>
        </div>
      </section>

      {/* Responsables (se imprimen en el PDF como Entregado / Recibido por) */}
      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:grid-cols-2">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-600 uppercase tracking-wide text-slate-400">
            <User className="h-3.5 w-3.5" /> Responsable que entrega
          </label>
          <input
            placeholder="Nombre de quien entrega"
            value={entregadoPor}
            onChange={(e) => setEntregadoPor(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          />
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-600 uppercase tracking-wide text-slate-400">
            <UserCheck className="h-3.5 w-3.5" /> Responsable que recibe
          </label>
          <input
            placeholder="Nombre de quien recibe"
            value={recibidoPor}
            onChange={(e) => setRecibidoPor(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          />
        </div>
      </section>

      {/* Detalle de equipos asignados */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-sm font-700 text-navy-950">Equipos asignados</h2>
            <p className="text-xs text-slate-400">
              Solo equipos disponibles · fecha «hasta» opcional (se fija al finalizar)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={agregar}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" /> Agregar equipo
            </button>
            <button
              type="button"
              onClick={exportar}
              disabled={generando}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" /> {generando ? "Generando…" : "Generar orden (PDF)"}
            </button>
            <button
              type="button"
              onClick={guardar}
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
            >
              <Save className="h-4 w-4" /> Guardar
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-600">ID</th>
                <th className="px-4 py-3 font-600">Equipo / Servicio</th>
                <th className="px-4 py-3 font-600">Desde</th>
                <th className="px-4 py-3 font-600">Hasta</th>
                <th className="px-4 py-3 text-center font-600">Días</th>
                <th className="px-4 py-3 font-600">Estado</th>
                <th className="px-4 py-3 font-600">Observaciones</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filas.map((f, idx) => {
                const dias = diasEntre(f.desde, f.hasta);
                return (
                  <tr key={f.uid} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2 font-mono text-xs font-600 text-navy-700">
                      {idPreliminar(idx)}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className={`${inp} w-40`}
                        value={f.equipo}
                        onChange={(e) => editar(f.uid, "equipo", e.target.value)}
                      >
                        <option value="">Selecciona equipo…</option>
                        {/* Si otro flujo lo ocupó mientras se armaba la orden, se conserva marcado. */}
                        {f.equipo && !disponibles.some((d) => d.codigo === f.equipo) && (
                          <option value={f.equipo}>{f.equipo} (no disponible)</option>
                        )}
                        {disponibles.map((d) => (
                          <option key={d.id} value={d.codigo}>
                            {d.codigo}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        className={`${inp} w-36`}
                        value={f.desde}
                        onChange={(e) => editar(f.uid, "desde", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        className={`${inp} w-36`}
                        value={f.hasta}
                        min={f.desde || undefined}
                        onChange={(e) => editar(f.uid, "hasta", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 text-center font-mono font-600 text-navy-900">
                      {f.hasta ? (dias === "" ? "—" : dias) : (
                        <span className="text-slate-400">En curso</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-600 text-emerald-700">
                        Activo
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        className={`${inp} w-44`}
                        placeholder="Equipo en locación"
                        value={f.observaciones}
                        onChange={(e) => editar(f.uid, "observaciones", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => quitar(f.uid)}
                        className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Observaciones generales */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="mb-3 font-display text-sm font-700 text-navy-950">Observaciones generales</h2>
        <textarea
          rows={4}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Relato del servicio. Ej: el día domingo (07/06/26) a la 01:16 a.m. se presentó una falla en la Luminaria #1…"
          className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
        ></textarea>
      </section>

      {preview && (
        <PdfPreviewModal preview={preview} onToast={setToast} onClose={() => setPreview(null)} />
      )}
      {toast && <Toast mensaje={toast} />}
    </form>
  );
}
