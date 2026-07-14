"use client";

/**
 * Pestaña Grupo: saldos por empresa, transferencias entre empresas e historial
 * del grupo, sobre el estado compartido.
 * El saldo de cada tarjeta es el balance real del libro mayor de esa empresa
 * (el mismo número que su pestaña), así que se mueve en vivo al registrar
 * transacciones o transferencias (que generan espejos en ambos extremos).
 */
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Building2,
  Download,
  FileDown,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react";
import { EMPRESAS } from "@/lib/data/empresas";
import { APP_NAME } from "@/lib/config";
import type { Moneda, MovimientoGrupo, TipoMovimiento } from "@/lib/types";
import { fmtISO, formatFechaVE, formatNumberVE, money, parseVES } from "@/lib/format";
import {
  convertirMonto,
  fondosSuficientes,
  saldosDeEmpresas,
  SIMBOLO_MONEDA,
} from "@/lib/negocio/finanzas";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { useFinanzas } from "./FinanzasProvider";
import { MovimientoGrupoModal } from "./MovimientoGrupoModal";
import { SelectorCuenta } from "./SelectorCuenta";

const BADGE_TIPO: Record<TipoMovimiento, string> = {
  Entrada: "bg-emerald-50 text-emerald-700",
  Retiro: "bg-rose-50 text-rose-700",
  Transferencia: "bg-navy-50 text-navy-700",
};

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function GrupoTab() {
  const finanzas = useFinanzas();
  const {
    movimientosGrupo,
    registrarTransferenciaGrupo,
    eliminarMovimientoGrupo,
    tasa,
    transacciones,
    cuentas,
    cuentaPredeterminadaDe,
  } = finanzas;

  const saldos = saldosDeEmpresas(EMPRESAS, cuentas, transacciones, tasa);

  const [origenKey, setOrigenKey] = useState(EMPRESAS[0].key);
  const [destinoKey, setDestinoKey] = useState(EMPRESAS[EMPRESAS.length - 1].key);
  const [cuentaOrigenId, setCuentaOrigenId] = useState<number | "">(
    cuentaPredeterminadaDe(EMPRESAS[0].key)?.id ?? ""
  );
  const [cuentaDestinoId, setCuentaDestinoId] = useState<number | "">(
    cuentaPredeterminadaDe(EMPRESAS[EMPRESAS.length - 1].key)?.id ?? ""
  );
  const [montoTexto, setMontoTexto] = useState("");
  /** null = no tocado: se sugiere con la tasa vigente si las monedas difieren. */
  const [montoDestinoTexto, setMontoDestinoTexto] = useState<string | null>(null);
  const [fecha, setFecha] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [preview, setPreview] = useState<{ url: string; nombre: string; titulo: string } | null>(
    null
  );
  const [editando, setEditando] = useState<MovimientoGrupo | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Blob URL vivo mientras la vista previa esté abierta (mismo patrón que finanzas/nómina).
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  const cuentaOrigen =
    cuentaOrigenId === "" ? undefined : cuentas.find((c) => c.id === cuentaOrigenId);
  const cuentaDestino =
    cuentaDestinoId === "" ? undefined : cuentas.find((c) => c.id === cuentaDestinoId);
  const monto = parseVES(montoTexto);
  const esConversion =
    !!cuentaOrigen && !!cuentaDestino && cuentaOrigen.moneda !== cuentaDestino.moneda;
  const sugerido =
    esConversion && monto > 0
      ? convertirMonto(monto, cuentaOrigen.moneda, cuentaDestino.moneda, tasa)
      : 0;
  const montoDestino = esConversion
    ? montoDestinoTexto === null
      ? sugerido
      : parseVES(montoDestinoTexto)
    : monto;
  // Equivalencia en vivo en la otra moneda con la tasa global vigente.
  const equivalente =
    cuentaOrigen && monto > 0 && tasa > 0
      ? cuentaOrigen.moneda === "VES"
        ? money(convertirMonto(monto, "VES", "USD", tasa))
        : money(convertirMonto(monto, cuentaOrigen.moneda, "VES", tasa), "Bs")
      : null;

  const cambiarEmpresa = (lado: "origen" | "destino", key: string) => {
    if (lado === "origen") {
      setOrigenKey(key);
      setCuentaOrigenId(cuentaPredeterminadaDe(key)?.id ?? "");
    } else {
      setDestinoKey(key);
      setCuentaDestinoId(cuentaPredeterminadaDe(key)?.id ?? "");
    }
  };

  const registrar = () => {
    if (origenKey === destinoKey) {
      setToast("La empresa origen y destino deben ser distintas");
      return;
    }
    if (!cuentaOrigen || !cuentaDestino) {
      setToast("Selecciona la cuenta origen y la cuenta destino");
      return;
    }
    if (monto <= 0) {
      setToast("Indica un monto mayor que cero");
      return;
    }
    if (esConversion && montoDestino <= 0) {
      setToast("Indica el monto que entra a la cuenta destino");
      return;
    }
    if (tasa <= 0) {
      setToast("Indica una tasa Bs/USD válida antes de registrar");
      return;
    }
    if (!descripcion.trim()) {
      setToast("Indica el motivo de la transferencia");
      return;
    }
    const chequeo = fondosSuficientes(cuentaOrigen.id, monto, transacciones);
    if (!chequeo.ok) {
      setToast(
        `Fondos insuficientes en ${cuentaOrigen.nombre}: disponible ` +
          `${money(chequeo.disponible, SIMBOLO_MONEDA[cuentaOrigen.moneda])}, se requieren ` +
          `${money(monto, SIMBOLO_MONEDA[cuentaOrigen.moneda])}`
      );
      return;
    }
    registrarTransferenciaGrupo({
      origenKey,
      destinoKey,
      cuentaOrigenId: cuentaOrigen.id,
      cuentaDestinoId: cuentaDestino.id,
      montoOrigen: monto,
      montoDestino,
      fecha: fecha || fmtISO(new Date()),
      descripcion: descripcion.trim(),
    });
    setMontoTexto("");
    setMontoDestinoTexto(null);
    setDescripcion("");
    setToast("Transferencia registrada");
  };

  // Fecha descendente (desempate: lo último registrado arriba).
  const historial = [...movimientosGrupo].sort((a, b) =>
    a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1
  );

  const eliminar = (h: MovimientoGrupo) => {
    const aviso =
      h.tipo === "Transferencia"
        ? " Se revertirán los movimientos espejo en las empresas involucradas."
        : "";
    if (!confirm(`¿Eliminar el movimiento "${h.descripcion}"?${aviso}`)) return;
    eliminarMovimientoGrupo(h.id);
    setToast("Movimiento eliminado");
  };

  /* Genera el PDF del historial y abre la vista previa (import dinámico del
     renderer, como en FinanzasEmpresa: fuera del bundle inicial). */
  const exportar = async () => {
    if (generando) return;
    if (!historial.length) {
      setToast("No hay movimientos del grupo que exportar");
      return;
    }
    setGenerando(true);
    try {
      const [docs, { generarPdfBlob, slug }] = await Promise.all([
        import("./pdf/documentos"),
        import("@/components/pdf/descargar"),
      ]);
      const hoy = fmtISO(new Date());
      const filas = historial.map((h) => ({
        fecha: formatFechaVE(h.fecha),
        tipo: h.tipo,
        ruta: `${h.origenNombre} → ${h.destinoNombre}`,
        descripcion: h.descripcion,
        // Ambas monedas con la tasa congelada del movimiento (snapshot fiel).
        montoUSD: convertirMonto(h.montoOrigen, h.monedaOrigen, "USD", h.tasaBs),
        montoBs: convertirMonto(h.montoOrigen, h.monedaOrigen, "VES", h.tasaBs),
      }));
      const doc = (
        <docs.ReporteGrupoDoc
          grupoLinea={APP_NAME}
          titulo="Historial de Movimientos del Grupo"
          subtitulo={`Entradas, retiros y transferencias · Generado el ${formatFechaVE(hoy)}`}
          generado={formatFechaVE(hoy)}
          filas={filas}
        />
      );
      const blob = await generarPdfBlob(doc);
      setPreview({
        url: URL.createObjectURL(blob),
        nombre: `historial_grupo_${slug(APP_NAME)}_${formatFechaVE(hoy)}.pdf`,
        titulo: "Historial del Grupo",
      });
    } catch {
      setToast("No se pudo generar el PDF");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <>
      {/* Saldos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {saldos.map((em) => (
          <div
            key={em.key}
            className={`rounded-2xl border ${
              em.activa ? "border-navy-200 ring-1 ring-navy-100" : "border-slate-200"
            } bg-white p-5 shadow-card`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-600 text-navy-900">
                <span
                  className={`h-2 w-2 rounded-full ${em.activa ? "bg-emerald-500" : "bg-slate-300"}`}
                ></span>
                {em.nombre}
              </span>
              <Building2 className="h-4 w-4 text-slate-300" />
            </div>
            <p className="mt-3 font-mono text-2xl font-600 text-navy-950">
              {money(em.consolidadoUSD)}
            </p>
            <p className="truncate font-mono text-sm text-slate-400">
              {(Object.entries(em.porMoneda) as [Moneda, number][])
                .map(([m, s]) => money(s, SIMBOLO_MONEDA[m]))
                .join(" · ") || "Sin cuentas"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Formulario de transferencia */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-card lg:col-span-1">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-display text-base font-700 text-navy-950">
              Transferir entre empresas
            </h2>
            <p className="text-xs text-slate-400">Mueve fondos dentro del conglomerado</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              registrar();
            }}
            className="space-y-4 p-5"
          >
            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Empresa origen</label>
              <select
                value={origenKey}
                onChange={(e) => cambiarEmpresa("origen", e.target.value)}
                className={inputCls}
              >
                {EMPRESAS.map((em) => (
                  <option key={em.key} value={em.key}>
                    {em.nombre}
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <SelectorCuenta
                  empresaId={origenKey}
                  value={cuentaOrigenId}
                  onChange={setCuentaOrigenId}
                />
              </div>
            </div>

            <div className="flex justify-center">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-navy-50 text-navy-600">
                <ArrowDown className="h-4 w-4" />
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Empresa destino</label>
              <select
                value={destinoKey}
                onChange={(e) => cambiarEmpresa("destino", e.target.value)}
                className={inputCls}
              >
                {[...EMPRESAS].reverse().map((em) => (
                  <option key={em.key} value={em.key}>
                    {em.nombre}
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <SelectorCuenta
                  empresaId={destinoKey}
                  value={cuentaDestinoId}
                  onChange={setCuentaDestinoId}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">
                Monto {cuentaOrigen ? `(${SIMBOLO_MONEDA[cuentaOrigen.moneda]})` : ""}
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={montoTexto}
                onChange={(e) => setMontoTexto(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-right font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
              />
              {equivalente && (
                <p className="mt-1 text-right font-mono text-[11px] text-slate-400">
                  ≈ {equivalente}
                </p>
              )}
            </div>

            {esConversion && cuentaDestino && (
              <div>
                <label className="mb-1.5 block text-sm font-600 text-navy-900">
                  Monto destino ({SIMBOLO_MONEDA[cuentaDestino.moneda]})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={montoDestinoTexto ?? (sugerido > 0 ? formatNumberVE(sugerido) : "")}
                  onChange={(e) => setMontoDestinoTexto(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-right font-mono text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                />
                <p className="mt-1 text-right font-mono text-[11px] text-slate-400">
                  Sugerido a tasa vigente: {money(sugerido, SIMBOLO_MONEDA[cuentaDestino.moneda])} ·
                  editable
                </p>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-600 text-navy-900">
                Motivo / descripción
              </label>
              <textarea
                rows={2}
                placeholder="Ej: capital de trabajo"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
              ></textarea>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 text-sm font-600 text-white hover:bg-navy-800"
            >
              <Repeat className="h-[18px] w-[18px]" /> Registrar transferencia
            </button>
          </form>
        </section>

        {/* Historial */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-700 text-navy-950">
                Historial de entradas y retiros
              </h2>
              <p className="text-xs text-slate-400">Registro de todos los movimientos del grupo</p>
            </div>
            <button
              onClick={exportar}
              disabled={generando}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> {generando ? "Generando…" : "Exportar a PDF"}
            </button>
          </div>
          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-600">Fecha</th>
                  <th className="px-5 py-3 font-600">Tipo</th>
                  <th className="px-5 py-3 font-600">Origen → Destino</th>
                  <th className="px-5 py-3 font-600">Descripción</th>
                  <th className="px-5 py-3 text-right font-600">Monto</th>
                  <th className="px-5 py-3 text-right font-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historial.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                      {formatFechaVE(h.fecha)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full ${BADGE_TIPO[h.tipo]} px-2.5 py-1 text-xs font-600`}
                      >
                        {h.tipo}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-navy-900">
                        <span>{h.origenNombre}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                        <span className="font-600">{h.destinoNombre}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{h.descripcion}</td>
                    <td
                      className={`whitespace-nowrap px-5 py-3 text-right font-mono font-600 ${
                        h.tipo === "Retiro" ? "text-rose-600" : "text-navy-900"
                      }`}
                    >
                      {money(h.montoOrigen, SIMBOLO_MONEDA[h.monedaOrigen])}
                      {h.monedaOrigen !== h.monedaDestino && (
                        <span className="block text-[11px] font-400 text-slate-400">
                          → {money(h.montoDestino, SIMBOLO_MONEDA[h.monedaDestino])}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Editar"
                          onClick={() => setEditando(h)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="Eliminar"
                          onClick={() => eliminar(h)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {historial.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                      No hay movimientos del grupo registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Vista previa del PDF */}
      {preview && (
        <Modal
          onClose={() => setPreview(null)}
          title={preview.titulo}
          subtitle={preview.nombre}
          maxWidth="max-w-5xl"
          footer={
            <>
              <button
                onClick={() => setPreview(null)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
              <button
                onClick={async () => {
                  const { descargarBlob } = await import("@/components/pdf/descargar");
                  descargarBlob(preview.url, preview.nombre);
                  setToast("PDF descargado");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-600 text-white hover:bg-navy-800"
              >
                <FileDown className="h-4 w-4" /> Descargar
              </button>
            </>
          }
        >
          <iframe
            src={preview.url}
            title={preview.titulo}
            className="h-[70vh] w-full rounded-xl border border-slate-200 bg-slate-50"
          />
        </Modal>
      )}

      {editando && (
        <MovimientoGrupoModal
          key={editando.id}
          movimiento={editando}
          onToast={setToast}
          onClose={() => setEditando(null)}
        />
      )}

      {toast && <Toast mensaje={toast} />}
    </>
  );
}
