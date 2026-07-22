/**
 * Construcción del registro de pago de nómina. Extraída del reducer de
 * NominaModule para que el módulo de Finanzas pueda conocer el PagoHistorial
 * (id, totales) con los mismos inputs y sin duplicar redondeos.
 * Archivo propio (no nomina.ts) para no crear ciclo con adelantos.ts.
 */
import type {
  AdelantoSueldo,
  CategoriaPago,
  Empleado,
  PagoHistorial,
} from "../types";
import { calcularConAdelanto, round2 } from "./nomina";
import { aplicarAdelantos, totalPendiente } from "./adelantos";

export interface ParamsRegistroPago {
  /** Empresa dueña del pago (Empresa.key). */
  empresaId: string;
  empleados: Empleado[];
  faltas: Record<number, string[]>;
  adelantos: AdelantoSueldo[];
  /** Id que tomará el pago (nextHistId del estado). */
  nextHistId: number;
  categoria: CategoriaPago;
  desde: string; // ISO
  hasta: string; // ISO
  registrado: string; // ISO
  tasa: number;
}

/**
 * Pura y determinista: con los mismos inputs devuelve el mismo pago, por lo
 * que el handler de la UI y el reducer pueden construirlo por separado sin
 * divergencias. Devuelve también los adelantos con los descuentos aplicados.
 */
export function construirRegistroPago(p: ParamsRegistroPago): {
  pago: PagoHistorial;
  adelantos: AdelantoSueldo[];
} {
  const lista = p.empleados.filter(
    (e) => e.categoria === p.categoria && e.estatus !== "Inactivo"
  );
  const pagoId = p.nextHistId;
  let adelantos = p.adelantos;
  // Mismos redondeos que el original: +toFixed(2) por campo y por total.
  const detalle = lista.map((e) => {
    const pendiente = totalPendiente(adelantos, e.id);
    const c = calcularConAdelanto(e, (p.faltas[e.id] ?? []).length, pendiente);
    const descAdelanto = round2(c.descAdelanto);
    if (descAdelanto > 0) {
      adelantos = aplicarAdelantos(adelantos, e.id, descAdelanto, pagoId);
    }
    return {
      nombre: e.nombre,
      faltas: c.faltas,
      dias: c.dias,
      diario: round2(c.diario),
      desc: round2(c.desc),
      descAdelanto,
      neto: round2(c.neto),
      // Snapshot para recibos fieles aunque el empleado cambie después.
      empId: e.id,
      cargo: e.cargo,
      dpto: e.dpto,
      base: e.base,
      banco: { ...e.banco },
    };
  });
  const totalUsd = round2(detalle.reduce((s, d) => s + d.neto, 0));
  const totalDesc = round2(detalle.reduce((s, d) => s + d.desc, 0));
  const totalAdelanto = round2(detalle.reduce((s, d) => s + d.descAdelanto, 0));

  const pago: PagoHistorial = {
    id: pagoId,
    empresaId: p.empresaId,
    categoria: p.categoria,
    desde: p.desde,
    hasta: p.hasta,
    registrado: p.registrado,
    totalUsd,
    totalDesc,
    totalAdelanto,
    tasa: p.tasa,
    detalle,
  };

  return { pago, adelantos };
}
