"use client";

/**
 * Finanzas individuales de una empresa (libro mayor / flujo de caja).
 * Parametrizado por `empresa`: nada aquí es específico de LOTER — habilitar
 * otra empresa es activar su pestaña en FINANZAS_TABS y sembrar sus
 * categorías (ver data/finanzas.ts).
 */
import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  FileDown,
  FolderCog,
  Landmark,
  Pencil,
  Plus,
  Scale,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { Empresa, Moneda, TipoTransaccion, TransaccionFinanciera } from "@/lib/types";
import { fmtISO, formatFechaVE, money } from "@/lib/format";
import { round2 } from "@/lib/negocio/nomina";
import {
  calcularTotales,
  consolidadoUSD,
  filtrarPorTipo,
  filtrarTransacciones,
  montoBs,
  montoUSDde,
  ordenarPorFechaDesc,
  resumenFiltros,
  saldosPorCuenta,
  saldosPorMoneda,
  SIMBOLO_MONEDA,
  SIN_FILTROS,
  subtotales,
  type FiltrosTransacciones,
} from "@/lib/negocio/finanzas";
import { KpiCard } from "@/components/ui/KpiCard";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { useFinanzas } from "./FinanzasProvider";
import { BadgeMoneda, BadgeOrigen, BadgeTipoTransaccion } from "./badges";
import { TransaccionModal } from "./TransaccionModal";
import { CategoriasModal } from "./CategoriasModal";
import { CuentasModal } from "./CuentasModal";
import { TraspasoModal } from "./TraspasoModal";

const ORIGEN_LABEL: Record<TransaccionFinanciera["origen"], string> = {
  manual: "Manual",
  nomina: "Nómina",
  transferencia: "Transferencia",
  factura: "Factura",
  compra: "Compra",
  traspaso: "Traspaso",
};

type ModalAbierto =
  | { tipo: "transaccion"; id: number | null }
  | { tipo: "categorias" }
  | { tipo: "cuentas" }
  | { tipo: "traspaso"; id: number | null }
  | null;

const selectCls =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function FinanzasEmpresa({ empresa }: { empresa: Empresa }) {
  const finanzas = useFinanzas();
  const transacciones = finanzas.transaccionesDe(empresa.key);
  const categorias = finanzas.categoriasDe(empresa.key);
  const cuentas = finanzas.cuentasDe(empresa.key);
  const etiqueta = empresa.nombre.replace(", C.A.", "");
  // rif vacío (p. ej. una persona natural): se muestra solo el nombre.
  const empresaLinea = empresa.rif ? `${empresa.nombre} — RIF ${empresa.rif}` : empresa.nombre;

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
  // Balance = consolidado de saldos por cuenta a tasa vigente (no entradas − salidas).
  const totales = calcularTotales(transacciones);
  const saldos = saldosPorCuenta(cuentas, transacciones);
  const balance = consolidadoUSD(saldos, finanzas.tasa);
  const porMoneda = saldosPorMoneda(saldos);
  const desglosePorMoneda = (Object.entries(porMoneda) as [Moneda, number][])
    .map(([m, s]) => money(s, SIMBOLO_MONEDA[m]))
    .join(" · ");
  const visibles = ordenarPorFechaDesc(filtrarTransacciones(transacciones, filtros));
  // Neto de lo filtrado en equivalentes con snapshot (solo informativo).
  const subEntradasFiltro = subtotales(filtrarPorTipo(visibles, "entrada"));
  const subSalidasFiltro = subtotales(filtrarPorTipo(visibles, "salida"));
  const subFiltro = subtotales(visibles);

  const nombreCat = (id: number) => categorias.find((c) => c.id === id)?.nombre ?? "—";
  const nombreCuenta = (id: number) => cuentas.find((c) => c.id === id)?.nombre ?? "—";
  const setFiltro = <K extends keyof FiltrosTransacciones>(k: K, v: FiltrosTransacciones[K]) =>
    setFiltros((f) => ({ ...f, [k]: v }));
  const hayFiltros =
    filtros.tipo !== "todas" ||
    filtros.categoriaId !== null ||
    filtros.cuentaId !== null ||
    !!filtros.desde ||
    !!filtros.hasta;

  const eliminar = (t: TransaccionFinanciera) => {
    const monto = money(t.monto, SIMBOLO_MONEDA[t.moneda]);
    if (t.origen === "traspaso") {
      // Las dos piernas del traspaso se eliminan juntas (padre + espejos).
      if (t.referenciaId === undefined) return;
      if (
        !confirm(
          `Este movimiento es parte de un traspaso entre cuentas. Se eliminarán sus dos piernas (salida y entrada). ¿Continuar?`
        )
      )
        return;
      finanzas.eliminarTraspaso(t.referenciaId);
      setToast("Traspaso eliminado");
      return;
    }
    if (!confirm(`¿Eliminar el movimiento "${t.descripcion}" de ${monto}?`)) return;
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
          empresaLinea={empresaLinea}
          titulo={`Reporte Financiero — Finanzas ${etiqueta}`}
          subtitulo={`${esEntrada ? "Ingresos" : "Egresos"} · Generado el ${formatFechaVE(
            hoy
          )} · ${resumenFiltros(filtros, categorias, cuentas)}`}
          generado={formatFechaVE(hoy)}
          filas={lista.map((t) => ({
            fecha: formatFechaVE(t.fecha),
            cuenta: nombreCuenta(t.cuentaId),
            categoria: nombreCat(t.categoriaId),
            descripcion: t.descripcion,
            origen: ORIGEN_LABEL[t.origen],
            monto: money(t.monto, SIMBOLO_MONEDA[t.moneda]),
            montoUSD: montoUSDde(t),
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

  // Reporte combinado: todos los movimientos (ingresos + egresos) de lo filtrado,
  // con columna Tipo y pie de Ingresos/Egresos/Neto (mismo neto que la tabla).
  const exportarMovimientos = async () => {
    if (generando) return;
    if (!visibles.length) {
      setToast("No hay movimientos que exportar con estos filtros");
      return;
    }
    setGenerando(true);
    try {
      const [docs, { generarPdfBlob, slug }] = await Promise.all([
        import("./pdf/documentos"),
        import("@/components/pdf/descargar"),
      ]);
      const hoy = fmtISO(new Date());
      const doc = (
        <docs.ReporteMovimientosDoc
          empresaLinea={empresaLinea}
          titulo={`Reporte Financiero — Finanzas ${etiqueta}`}
          subtitulo={`Todos los movimientos · Generado el ${formatFechaVE(
            hoy
          )} · ${resumenFiltros(filtros, categorias, cuentas)}`}
          generado={formatFechaVE(hoy)}
          filas={visibles.map((t) => ({
            fecha: formatFechaVE(t.fecha),
            tipo: t.tipo === "entrada" ? "Ingreso" : "Egreso",
            cuenta: nombreCuenta(t.cuentaId),
            categoria: nombreCat(t.categoriaId),
            descripcion: t.descripcion,
            origen: ORIGEN_LABEL[t.origen],
            monto: money(t.monto, SIMBOLO_MONEDA[t.moneda]),
            montoUSD: montoUSDde(t),
            montoBs: montoBs(t),
          }))}
          ingresosUSD={subEntradasFiltro.usd}
          ingresosBs={subEntradasFiltro.bs}
          egresosUSD={subSalidasFiltro.usd}
          egresosBs={subSalidasFiltro.bs}
          netoUSD={round2(subEntradasFiltro.usd - subSalidasFiltro.usd)}
          netoBs={round2(subEntradasFiltro.bs - subSalidasFiltro.bs)}
        />
      );
      const nombre = `movimientos_${slug(empresa.key)}_${formatFechaVE(hoy)}.pdf`;
      const blob = await generarPdfBlob(doc);
      setPreview({
        url: URL.createObjectURL(blob),
        nombre,
        titulo: `Movimientos — Finanzas ${etiqueta}`,
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
          <p className="text-xs text-slate-400">{empresaLinea}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setModal({ tipo: "cuentas" })} className={btnBordeCls}>
            <Landmark className="h-4 w-4" /> Cuentas
          </button>
          <button onClick={() => setModal({ tipo: "categorias" })} className={btnBordeCls}>
            <FolderCog className="h-4 w-4" /> Categorías
          </button>
          <button
            onClick={() => setModal({ tipo: "traspaso", id: null })}
            disabled={cuentas.filter((c) => c.activa).length < 2}
            title={
              cuentas.filter((c) => c.activa).length < 2
                ? "Necesitas al menos dos cuentas activas"
                : undefined
            }
            className={btnBordeCls}
          >
            <ArrowLeftRight className="h-4 w-4" /> Movimiento entre cuentas
          </button>
          <button
            onClick={() => setModal({ tipo: "transaccion", id: null })}
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-600 text-white hover:bg-navy-800"
          >
            <Plus className="h-[18px] w-[18px]" /> Nueva transacción
          </button>
        </div>
      </div>

      {/* Cuentas: saldo real disponible por cuenta, en su moneda nativa */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {saldos.map(({ cuenta, saldo }) => (
          <div
            key={cuenta.id}
            className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-card ${
              cuenta.activa ? "" : "opacity-60"
            }`}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <p className="truncate text-xs font-600 uppercase tracking-wide text-slate-400">
                {cuenta.nombre}
              </p>
              {cuenta.predeterminada && (
                <Star
                  className="h-3.5 w-3.5 shrink-0 fill-gold-500 text-gold-500"
                  aria-label="Cuenta predeterminada"
                />
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-lg font-700 text-navy-950">
                {money(saldo, SIMBOLO_MONEDA[cuenta.moneda])}
              </p>
              <BadgeMoneda moneda={cuenta.moneda} />
            </div>
          </div>
        ))}
      </div>

      {/* KPIs: ingresos/egresos operativos (sin traspasos ni transferencias)
          y balance = suma de los saldos de las cuentas a tasa vigente */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total ingresos"
          valor={money(totales.entradasUSD)}
          sub={money(totales.entradasBs, "Bs")}
          icon={TrendingUp}
        />
        <KpiCard
          label="Total egresos"
          valor={money(totales.salidasUSD)}
          sub={money(totales.salidasBs, "Bs")}
          icon={TrendingDown}
        />
        <KpiCard
          label="Balance (consolidado)"
          valor={money(balance)}
          sub={desglosePorMoneda || "Sin cuentas"}
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
            <button onClick={exportarMovimientos} disabled={generando} className={btnBordeCls}>
              <FileDown className="h-4 w-4" /> Exportar Movimientos a PDF
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
              Cuenta
            </label>
            <select
              value={filtros.cuentaId ?? ""}
              onChange={(e) =>
                setFiltro("cuentaId", e.target.value === "" ? null : Number(e.target.value))
              }
              className={selectCls}
            >
              <option value="">Todas</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.moneda})
                </option>
              ))}
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
                <th className="px-5 py-3 font-600">Cuenta</th>
                <th className="px-5 py-3 font-600">Categoría</th>
                <th className="px-5 py-3 font-600">Descripción</th>
                <th className="px-5 py-3 font-600">Origen</th>
                <th className="px-5 py-3 text-right font-600">Monto</th>
                <th className="px-5 py-3 text-right font-600">Equiv. USD</th>
                <th className="px-5 py-3 text-right font-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-400">
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
                    <td className="whitespace-nowrap px-5 py-3 text-navy-900">
                      {nombreCuenta(t.cuentaId)}
                    </td>
                    <td className="px-5 py-3 text-navy-900">{nombreCat(t.categoriaId)}</td>
                    <td className="px-5 py-3 text-slate-500" title={t.observaciones}>
                      {t.descripcion}
                    </td>
                    <td className="px-5 py-3">
                      <BadgeOrigen origen={t.origen} />
                    </td>
                    <td
                      className={`whitespace-nowrap px-5 py-3 text-right font-mono font-600 ${
                        t.tipo === "salida" ? "text-rose-600" : "text-navy-900"
                      }`}
                    >
                      {t.tipo === "salida" ? "− " : ""}
                      {money(t.monto, SIMBOLO_MONEDA[t.moneda])}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-mono text-xs text-slate-400">
                      {/* Equivalente con la tasa congelada al registrar, no la vigente. */}
                      {money(montoUSDde(t))}
                    </td>
                    <td className="px-5 py-3">
                      {t.origen === "manual" || t.origen === "traspaso" ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title={t.origen === "traspaso" ? "Editar traspaso" : "Editar"}
                            onClick={() =>
                              setModal(
                                t.origen === "traspaso"
                                  ? { tipo: "traspaso", id: t.referenciaId ?? null }
                                  : { tipo: "transaccion", id: t.id }
                              )
                            }
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            title={t.origen === "traspaso" ? "Eliminar traspaso" : "Eliminar"}
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
                  <td className="px-5 py-3" colSpan={7}>
                    {filtros.tipo === "todas"
                      ? `Neto de lo filtrado en equiv. USD (${visibles.length} movimientos)`
                      : `Subtotal ${filtros.tipo === "entrada" ? "entradas" : "salidas"} en equiv. USD (${
                          visibles.length
                        } movimientos)`}
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-mono ${
                      filtros.tipo === "salida" ? "text-rose-600" : "text-navy-950"
                    }`}
                  >
                    {filtros.tipo === "todas"
                      ? money(round2(subEntradasFiltro.usd - subSalidasFiltro.usd))
                      : (filtros.tipo === "salida" ? "− " : "") + money(subFiltro.usd)}
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
      {modal?.tipo === "cuentas" && (
        <CuentasModal empresa={empresa} onToast={setToast} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === "traspaso" && (
        <TraspasoModal
          key={modal.id ?? "nuevo"}
          empresa={empresa}
          traspaso={
            modal.id !== null
              ? finanzas.traspasos.find((tr) => tr.id === modal.id) ?? null
              : null
          }
          onToast={setToast}
          onClose={() => setModal(null)}
        />
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
