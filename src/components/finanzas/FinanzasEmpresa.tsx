"use client";

/**
 * Finanzas individuales de una empresa (libro mayor / flujo de caja).
 * Parametrizado por `empresa`: nada aquí es específico de LOTER — habilitar
 * otra empresa es activar su pestaña en FINANZAS_TABS y sembrar sus
 * categorías (ver data/finanzas.ts).
 */
import { useEffect, useState } from "react";
import {
  FileDown,
  FolderCog,
  Pencil,
  Plus,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { Empresa, TipoTransaccion, TransaccionFinanciera } from "@/lib/types";
import { fmtISO, formatFechaVE, money } from "@/lib/format";
import {
  calcularTotales,
  filtrarPorTipo,
  filtrarTransacciones,
  montoBs,
  ordenarPorFechaDesc,
  resumenFiltros,
  SIN_FILTROS,
  subtotales,
  type FiltrosTransacciones,
} from "@/lib/negocio/finanzas";
import { KpiCard } from "@/components/ui/KpiCard";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { useFinanzas } from "./FinanzasProvider";
import { BadgeOrigen, BadgeTipoTransaccion } from "./badges";
import { TransaccionModal } from "./TransaccionModal";
import { CategoriasModal } from "./CategoriasModal";

const ORIGEN_LABEL: Record<TransaccionFinanciera["origen"], string> = {
  manual: "Manual",
  nomina: "Nómina",
  transferencia: "Transferencia",
  factura: "Factura",
  compra: "Compra",
};

type ModalAbierto =
  | { tipo: "transaccion"; id: number | null }
  | { tipo: "categorias" }
  | null;

const selectCls =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function FinanzasEmpresa({ empresa }: { empresa: Empresa }) {
  const finanzas = useFinanzas();
  const transacciones = finanzas.transaccionesDe(empresa.key);
  const categorias = finanzas.categoriasDe(empresa.key);
  const etiqueta = empresa.nombre.replace(", C.A.", "");

  const [filtros, setFiltros] = useState<FiltrosTransacciones>(SIN_FILTROS);
  const [modal, setModal] = useState<ModalAbierto>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [preview, setPreview] = useState<{ url: string; nombre: string; titulo: string } | null>(
    null
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Blob URL vivo mientras la vista previa esté abierta (mismo patrón que nómina).
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  // KPIs de toda la empresa; los filtros aplican a la tabla y a los PDF.
  const totales = calcularTotales(transacciones);
  const visibles = ordenarPorFechaDesc(filtrarTransacciones(transacciones, filtros));
  const totalesFiltro = calcularTotales(visibles);
  const subFiltro = subtotales(visibles);

  const nombreCat = (id: number) => categorias.find((c) => c.id === id)?.nombre ?? "—";
  const setFiltro = <K extends keyof FiltrosTransacciones>(k: K, v: FiltrosTransacciones[K]) =>
    setFiltros((f) => ({ ...f, [k]: v }));
  const hayFiltros =
    filtros.tipo !== "todas" || filtros.categoriaId !== null || !!filtros.desde || !!filtros.hasta;

  const eliminar = (t: TransaccionFinanciera) => {
    if (!confirm(`¿Eliminar el movimiento "${t.descripcion}" de ${money(t.montoUSD)}?`)) return;
    finanzas.eliminarTransaccion(t.id);
    setToast("Movimiento eliminado");
  };

  /* Documentos y renderer cargados al hacer clic (import dinámico):
     @react-pdf/renderer queda fuera del bundle inicial. */
  const exportar = async (tipo: TipoTransaccion) => {
    if (generando) return;
    const lista = filtrarPorTipo(visibles, tipo);
    const esEntrada = tipo === "entrada";
    if (!lista.length) {
      setToast(`No hay ${esEntrada ? "ingresos" : "egresos"} que exportar con estos filtros`);
      return;
    }
    setGenerando(true);
    try {
      const [docs, { generarPdfBlob, slug }] = await Promise.all([
        import("./pdf/documentos"),
        import("@/components/pdf/descargar"),
      ]);
      const hoy = fmtISO(new Date());
      const sub = subtotales(lista);
      const doc = (
        <docs.ReporteFinancieroDoc
          empresaLinea={`${empresa.nombre} — RIF ${empresa.rif}`}
          titulo={`Reporte Financiero — Finanzas ${etiqueta}`}
          subtitulo={`${esEntrada ? "Ingresos" : "Egresos"} · Generado el ${formatFechaVE(
            hoy
          )} · ${resumenFiltros(filtros, categorias)}`}
          generado={formatFechaVE(hoy)}
          filas={lista.map((t) => ({
            fecha: formatFechaVE(t.fecha),
            categoria: nombreCat(t.categoriaId),
            descripcion: t.descripcion,
            origen: ORIGEN_LABEL[t.origen],
            montoUSD: t.montoUSD,
            montoBs: montoBs(t),
          }))}
          totalUSD={sub.usd}
          totalBs={sub.bs}
        />
      );
      const nombre = `${esEntrada ? "ingresos" : "egresos"}_${slug(empresa.key)}_${formatFechaVE(
        hoy
      )}.pdf`;
      const blob = await generarPdfBlob(doc);
      setPreview({
        url: URL.createObjectURL(blob),
        nombre,
        titulo: `${esEntrada ? "Ingresos" : "Egresos"} — Finanzas ${etiqueta}`,
      });
    } catch {
      setToast("No se pudo generar el PDF");
    } finally {
      setGenerando(false);
    }
  };

  const btnBordeCls =
    "inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-navy-700 hover:bg-slate-50 disabled:opacity-50";

  return (
    <>
      {/* Encabezado de la empresa */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-700 text-navy-950">Finanzas {etiqueta}</h2>
          <p className="text-xs text-slate-400">
            {empresa.nombre} — RIF {empresa.rif}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setModal({ tipo: "categorias" })} className={btnBordeCls}>
            <FolderCog className="h-4 w-4" /> Categorías
          </button>
          <button
            onClick={() => setModal({ tipo: "transaccion", id: null })}
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
          >
            <Plus className="h-[18px] w-[18px]" /> Nueva transacción
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total entradas"
          valor={money(totales.entradasUSD)}
          sub={money(totales.entradasBs, "Bs")}
          icon={TrendingUp}
        />
        <KpiCard
          label="Total salidas"
          valor={money(totales.salidasUSD)}
          sub={money(totales.salidasBs, "Bs")}
          icon={TrendingDown}
        />
        <KpiCard
          label="Balance"
          valor={money(totales.balanceUSD)}
          sub={money(totales.balanceBs, "Bs")}
          icon={Scale}
          tone="gold"
        />
      </div>

      {/* Historial */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-display text-base font-700 text-navy-950">
              Historial de movimientos
            </h3>
            <p className="text-xs text-slate-400">
              Entradas y salidas de {etiqueta} · los PDF respetan los filtros activos
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => exportar("entrada")} disabled={generando} className={btnBordeCls}>
              <FileDown className="h-4 w-4" /> Exportar Ingresos a PDF
            </button>
            <button onClick={() => exportar("salida")} disabled={generando} className={btnBordeCls}>
              <FileDown className="h-4 w-4" /> Exportar Egresos a PDF
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">
              Tipo
            </label>
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltro("tipo", e.target.value as FiltrosTransacciones["tipo"])}
              className={selectCls}
            >
              <option value="todas">Todas</option>
              <option value="entrada">Entradas</option>
              <option value="salida">Salidas</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">
              Categoría
            </label>
            <select
              value={filtros.categoriaId ?? ""}
              onChange={(e) =>
                setFiltro("categoriaId", e.target.value === "" ? null : Number(e.target.value))
              }
              className={selectCls}
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">
              Desde
            </label>
            <input
              type="date"
              value={filtros.desde}
              onChange={(e) => setFiltro("desde", e.target.value)}
              className={selectCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">
              Hasta
            </label>
            <input
              type="date"
              value={filtros.hasta}
              onChange={(e) => setFiltro("hasta", e.target.value)}
              className={selectCls}
            />
          </div>
          {hayFiltros && (
            <button
              onClick={() => setFiltros(SIN_FILTROS)}
              className="rounded-xl px-3 py-2 text-sm font-600 text-slate-500 hover:bg-slate-50 hover:text-navy-900"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-600">Fecha</th>
                <th className="px-5 py-3 font-600">Tipo</th>
                <th className="px-5 py-3 font-600">Categoría</th>
                <th className="px-5 py-3 font-600">Descripción</th>
                <th className="px-5 py-3 font-600">Origen</th>
                <th className="px-5 py-3 text-right font-600">Monto USD</th>
                <th className="px-5 py-3 text-right font-600">Monto Bs</th>
                <th className="px-5 py-3 text-right font-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">
                    No hay movimientos para estos filtros.
                  </td>
                </tr>
              ) : (
                visibles.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                      {formatFechaVE(t.fecha)}
                    </td>
                    <td className="px-5 py-3">
                      <BadgeTipoTransaccion tipo={t.tipo} />
                    </td>
                    <td className="px-5 py-3 text-navy-900">{nombreCat(t.categoriaId)}</td>
                    <td className="px-5 py-3 text-slate-500">{t.descripcion}</td>
                    <td className="px-5 py-3">
                      <BadgeOrigen origen={t.origen} />
                    </td>
                    <td
                      className={`whitespace-nowrap px-5 py-3 text-right font-mono font-600 ${
                        t.tipo === "salida" ? "text-rose-600" : "text-navy-900"
                      }`}
                    >
                      {t.tipo === "salida" ? "− " : ""}
                      {money(t.montoUSD)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-mono text-xs text-slate-400">
                      {/* Bs con la tasa congelada al registrar, no la vigente. */}
                      {money(montoBs(t), "Bs")}
                    </td>
                    <td className="px-5 py-3">
                      {t.origen === "manual" ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Editar"
                            onClick={() => setModal({ tipo: "transaccion", id: t.id })}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            title="Eliminar"
                            onClick={() => eliminar(t)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <p
                          className="text-right text-xs text-slate-300"
                          title="Movimiento automático: se gestiona desde su módulo de origen"
                        >
                          Automático
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {visibles.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/60 font-600 text-navy-900">
                  <td className="px-5 py-3" colSpan={5}>
                    {filtros.tipo === "todas"
                      ? `Balance de lo filtrado (${visibles.length} movimientos)`
                      : `Subtotal ${filtros.tipo === "entrada" ? "entradas" : "salidas"} (${
                          visibles.length
                        } movimientos)`}
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-mono ${
                      filtros.tipo === "salida" ? "text-rose-600" : "text-navy-950"
                    }`}
                  >
                    {filtros.tipo === "todas"
                      ? money(totalesFiltro.balanceUSD)
                      : (filtros.tipo === "salida" ? "− " : "") + money(subFiltro.usd)}
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-mono text-xs ${
                      filtros.tipo === "salida" ? "text-rose-600" : "text-slate-500"
                    }`}
                  >
                    {filtros.tipo === "todas"
                      ? money(totalesFiltro.balanceBs, "Bs")
                      : (filtros.tipo === "salida" ? "− " : "") + money(subFiltro.bs, "Bs")}
                  </td>
                  <td className="px-5 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Modales */}
      {modal?.tipo === "transaccion" && (
        <TransaccionModal
          key={modal.id ?? "nueva"}
          empresa={empresa}
          transaccion={
            modal.id !== null ? transacciones.find((t) => t.id === modal.id) ?? null : null
          }
          onToast={setToast}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === "categorias" && (
        <CategoriasModal empresa={empresa} onToast={setToast} onClose={() => setModal(null)} />
      )}

      {/* Vista previa del PDF */}
      {preview && (
        <Modal
          onClose={() => setPreview(null)}
          title={preview.titulo}
          subtitle={preview.nombre}
          maxWidth="max-w-4xl"
          footer={
            <>
              <button onClick={() => setPreview(null)} className={btnBordeCls}>
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

      {toast && <Toast mensaje={toast} />}
    </>
  );
}
