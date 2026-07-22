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
import { fmtISO } from "@/lib/format";
import { CATEGORIAS_EQUIPO } from "@/lib/data/equipos";
import type { CategoriaEquipo } from "@/lib/types";
import { diasEntre } from "@/lib/negocio/fechas";
import { clientesDeAsignaciones, equiposDisponibles } from "@/lib/negocio/inventario";
import { useInventario } from "@/components/inventario/InventarioProvider";
import { AutocompleteInput } from "@/components/ui/AutocompleteInput";
import { Toast } from "@/components/ui/Toast";
import { PdfPreviewModal, type PreviewPdf } from "@/components/facturacion/PdfPreviewModal";

interface FilaAsig {
  uid: number; // key local; el ID S-00x definitivo lo asigna el provider al guardar
  equipo: string;
  desde: string;
  hasta: string;
  observaciones: string;
}

/** Campo de cabecera (ancho lo pone el contenedor, nunca la cadena de clases). */
const campo =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";
/** Campo de celda de tabla: el ancho lo fija la columna (<col>), no la clase. */
const celda =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-navy-400 focus:ring-1 focus:ring-navy-100";
/** Realce de error: se aplica al campo que impidió guardar. */
const malo = "border-rose-400 ring-1 ring-rose-100";
const etiqueta = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-400";

/** Clave de un campo que puede quedar marcado en rojo tras validar. */
type ErrorCampo = "cliente" | `equipo:${number}` | `desde:${number}` | `hasta:${number}`;

function nuevaFila(uid: number): FilaAsig {
  return { uid, equipo: "", desde: "", hasta: "", observaciones: "" };
}

/** Días de una fila: número si el rango es válido, 0 mientras no tenga "hasta". */
function diasDeFila(f: Pick<FilaAsig, "desde" | "hasta">): number {
  if (!f.hasta) return 0;
  const d = diasEntre(f.desde, f.hasta);
  return d === "" ? 0 : d;
}

/** Correlativo del requerimiento: ASG-{año}-{nnn} sobre el próximo S-00x. */
function correlativo(siguienteAsig: number, hoy: string): string {
  return `ASG-${hoy.slice(0, 4)}-${String(siguienteAsig + 1).padStart(3, "0")}`;
}

export function OrdenAsignacion() {
  const inv = useInventario();
  const hoy = fmtISO(new Date());

  const [uid, setUid] = useState(1);
  const [filas, setFilas] = useState<FilaAsig[]>([nuevaFila(0)]);
  // Nro. y fecha arrancan calculados; si la administradora los edita, su valor
  // manda (por eso son estado y no derivados del provider en cada render).
  const [numero, setNumero] = useState(() => correlativo(inv.siguienteAsig, hoy));
  const [fechaSolicitud, setFechaSolicitud] = useState(hoy);
  const [cliente, setCliente] = useState("");
  const [entregadoPor, setEntregadoPor] = useState("");
  const [recibidoPor, setRecibidoPor] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [errores, setErrores] = useState<Set<ErrorCampo>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [preview, setPreview] = useState<PreviewPdf | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  const disponibles = equiposDisponibles(inv.equipos, inv.mantenimientos, inv.asignaciones);
  const clientesPrevios = clientesDeAsignaciones(inv.asignaciones);

  // Disponibles agrupados por categoría para el <optgroup> del selector.
  const porCategoria = (Object.keys(CATEGORIAS_EQUIPO) as CategoriaEquipo[])
    .map((cat) => [cat, disponibles.filter((d) => d.categoria === cat)] as const)
    .filter(([, eqs]) => eqs.length > 0);

  // ID que recibirá la fila al guardarse (previsualización).
  const idPreliminar = (idx: number) =>
    "S-" + String(inv.siguienteAsig + 1 + idx).padStart(3, "0");

  const marcado = (c: ErrorCampo) => (errores.has(c) ? malo : "");
  /** Al corregir un campo se le quita el realce sin revalidar toda la orden. */
  const limpiar = (c: ErrorCampo) =>
    setErrores((e) => {
      if (!e.has(c)) return e;
      const n = new Set(e);
      n.delete(c);
      return n;
    });

  const agregar = () => {
    setFilas((fs) => [...fs, nuevaFila(uid)]);
    setUid((u) => u + 1);
  };

  const quitar = (u: number) => setFilas((fs) => fs.filter((f) => f.uid !== u));

  const editar = (u: number, cmp: keyof Omit<FilaAsig, "uid">, valor: string) => {
    setFilas((fs) => fs.map((f) => (f.uid === u ? { ...f, [cmp]: valor } : f)));
    if (cmp === "equipo" || cmp === "desde" || cmp === "hasta") limpiar(`${cmp}:${u}`);
  };

  /** Falla la validación: marca el campo culpable y avisa. */
  const fallar = (c: ErrorCampo, mensaje: string): null => {
    setErrores(new Set([c]));
    setToast(mensaje);
    return null;
  };

  /** Valida los campos comunes de la orden; devuelve las filas con equipo o null. */
  const validar = (): FilaAsig[] | null => {
    if (!cliente.trim()) return fallar("cliente", "Indica el cliente / proyecto");
    const conEquipo = filas.filter((f) => f.equipo);
    if (conEquipo.length === 0) {
      setErrores(new Set(filas.length ? [`equipo:${filas[0].uid}` as ErrorCampo] : []));
      setToast("Agrega al menos un equipo");
      return null;
    }
    for (const f of conEquipo) {
      if (!f.desde) return fallar(`desde:${f.uid}`, `Indica la fecha "desde" de "${f.equipo}"`);
      // "hasta" es opcional; si se indica, el rango debe ser válido.
      if (f.hasta && diasEntre(f.desde, f.hasta) === "")
        return fallar(`hasta:${f.uid}`, `El rango de fechas de "${f.equipo}" es inválido`);
    }
    const repetido = conEquipo.find(
      (f, i) => conEquipo.findIndex((o) => o.equipo === f.equipo) !== i
    );
    if (repetido)
      return fallar(`equipo:${repetido.uid}`, `"${repetido.equipo}" está repetido en la orden`);
    setErrores(new Set());
    return conEquipo;
  };

  const guardar = () => {
    const validas = validar();
    if (!validas) return;
    // Revalidación al guardar: otro flujo pudo ocupar el equipo entre tanto.
    const ocupada = validas.find((f) => inv.estadoDe(f.equipo) !== "Disponible");
    if (ocupada) return void fallar(`equipo:${ocupada.uid}`, `"${ocupada.equipo}" ya no está disponible`);

    // La cabecera se guarda en CADA asignación de la orden: es lo que permite
    // reimprimir el documento completo desde el historial.
    const documento = {
      numero: numero.trim(),
      fecha: fechaSolicitud,
      entregadoPor: entregadoPor.trim(),
      recibidoPor: recibidoPor.trim(),
      observaciones: observaciones.trim(),
    };
    inv.crearAsignaciones(
      validas.map((f) => ({
        cliente: cliente.trim(),
        equipos: [f.equipo],
        desde: f.desde,
        hasta: f.hasta,
        dias: diasDeFila(f),
        estado: "Activo" as const,
        observaciones: f.observaciones.trim(),
        documento,
      }))
    );
    setFilas([nuevaFila(uid)]);
    setUid((u) => u + 1);
    // El correlativo avanza tantos números como asignaciones se crearon.
    setNumero(correlativo(inv.siguienteAsig + validas.length, fechaSolicitud || hoy));
    setCliente("");
    setEntregadoPor("");
    setRecibidoPor("");
    setObservaciones("");
    setToast(
      validas.length === 1 ? "Asignación guardada" : `${validas.length} asignaciones guardadas`
    );
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
    <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
      {/* Datos de la orden */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-base font-700 text-navy-950">Datos de la orden</h2>
          <p className="text-xs text-slate-400">
            El nro. de requerimiento y la fecha vienen propuestos · puedes cambiarlos
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
          <div>
            <label htmlFor="asig-numero" className={etiqueta}>
              Nro. de requerimiento
            </label>
            <input
              id="asig-numero"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className={`${campo} font-mono font-600`}
            />
          </div>
          <div>
            <label htmlFor="asig-fecha" className={etiqueta}>
              Fecha de solicitud
            </label>
            <input
              id="asig-fecha"
              type="date"
              value={fechaSolicitud}
              onChange={(e) => setFechaSolicitud(e.target.value)}
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="asig-cliente" className={etiqueta}>
              Cliente / Proyecto
            </label>
            {/* Sugerencias de clientes ya usados: evita variantes del mismo nombre. */}
            <AutocompleteInput
              id="asig-cliente"
              value={cliente}
              onChange={(v) => {
                setCliente(v);
                limpiar("cliente");
              }}
              opciones={clientesPrevios}
              placeholder="Ej: IESV / Pozo SBC-37"
              className={`${campo} ${marcado("cliente")}`}
            />
          </div>
        </div>

        {/* Responsables (se imprimen en el PDF como Entregado / Recibido por) */}
        <div className="grid grid-cols-1 gap-4 border-t border-slate-100 p-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="asig-entrega"
              className={`${etiqueta} flex items-center gap-1.5`}
            >
              <User className="h-3.5 w-3.5" /> Responsable que entrega
            </label>
            <input
              id="asig-entrega"
              placeholder="Nombre de quien entrega"
              value={entregadoPor}
              onChange={(e) => setEntregadoPor(e.target.value)}
              className={campo}
            />
          </div>
          <div>
            <label
              htmlFor="asig-recibe"
              className={`${etiqueta} flex items-center gap-1.5`}
            >
              <UserCheck className="h-3.5 w-3.5" /> Responsable que recibe
            </label>
            <input
              id="asig-recibe"
              placeholder="Nombre de quien recibe"
              value={recibidoPor}
              onChange={(e) => setRecibidoPor(e.target.value)}
              className={campo}
            />
          </div>
        </div>
      </section>

      {/* Detalle de equipos asignados */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-700 text-navy-950">Equipos asignados</h2>
            <p className="text-xs text-slate-400">
              {disponibles.length === 0
                ? "No hay equipos disponibles en este momento"
                : `${disponibles.length} disponibles · fecha «hasta» opcional (se fija al finalizar)`}
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
            {/* El ancho de cada campo lo fija la columna: dentro de la celda los
                inputs son w-full (una clase w-* extra ahí no ganaría). */}
            <colgroup>
              <col className="w-20" />
              {/* Ancho suficiente para la etiqueta enriquecida "código · ubicación". */}
              <col className="w-72" />
              <col className="w-40" />
              <col className="w-40" />
              <col className="w-20" />
              <col className="w-28" />
              <col />
              <col className="w-12" />
            </colgroup>
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
                        aria-label="Equipo a asignar"
                        className={`${celda} ${marcado(`equipo:${f.uid}`)}`}
                        value={f.equipo}
                        onChange={(e) => editar(f.uid, "equipo", e.target.value)}
                      >
                        <option value="">Selecciona equipo…</option>
                        {/* Si otro flujo lo ocupó mientras se armaba la orden, se conserva marcado. */}
                        {f.equipo && !disponibles.some((d) => d.codigo === f.equipo) && (
                          <option value={f.equipo}>{f.equipo} (no disponible)</option>
                        )}
                        {porCategoria.map(([cat, eqs]) => (
                          <optgroup key={cat} label={CATEGORIAS_EQUIPO[cat]}>
                            {eqs.map((d) => (
                              <option key={d.id} value={d.codigo}>
                                {d.codigo}
                                {d.ubicacion ? ` · ${d.ubicacion}` : ""}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        aria-label="Fecha desde"
                        className={`${celda} ${marcado(`desde:${f.uid}`)}`}
                        value={f.desde}
                        onChange={(e) => editar(f.uid, "desde", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        aria-label="Fecha hasta"
                        className={`${celda} ${marcado(`hasta:${f.uid}`)}`}
                        value={f.hasta}
                        min={f.desde || undefined}
                        onChange={(e) => editar(f.uid, "hasta", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 text-center font-mono font-600 text-navy-900">
                      {f.hasta ? (dias === "" ? "—" : dias) : (
                        <span className="text-xs font-500 text-slate-400">En curso</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-600 text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                        Activo
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        aria-label="Observaciones del equipo"
                        className={celda}
                        placeholder="Equipo en locación"
                        value={f.observaciones}
                        onChange={(e) => editar(f.uid, "observaciones", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        title="Quitar equipo de la orden"
                        onClick={() => quitar(f.uid)}
                        className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">
                    Agrega el primer equipo de la orden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Observaciones generales */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <label htmlFor="asig-obs" className="mb-3 block font-display text-base font-700 text-navy-950">
          Observaciones generales
        </label>
        <textarea
          id="asig-obs"
          rows={4}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Relato del servicio. Ej: el día domingo (07/06/26) a la 01:16 a.m. se presentó una falla en la Luminaria #1…"
          className={`${campo} resize-none leading-relaxed`}
        ></textarea>
      </section>

      {preview && (
        <PdfPreviewModal preview={preview} onToast={setToast} onClose={() => setPreview(null)} />
      )}
      {toast && <Toast mensaje={toast} />}
    </form>
  );
}
