/**
 * Estado de adelantos de sueldo (préstamos). Funciones puras e inmutables:
 * un adelanto sigue 'pendiente' mientras montoDescontadoUSD < montoUSD y el
 * remanente se descuenta en pagos sucesivos (FIFO por fecha de solicitud).
 */
import type { AdelantoSueldo } from "../types";
import { round2 } from "./nomina";

/** Monto de un adelanto aún no descontado. */
export function remanente(a: AdelantoSueldo): number {
  return round2(a.montoUSD - a.montoDescontadoUSD);
}

/** Adelantos pendientes de un empleado, FIFO por fecha (desempate por id). */
export function pendientesDe(
  adelantos: AdelantoSueldo[],
  empleadoId: number
): AdelantoSueldo[] {
  return adelantos
    .filter((a) => a.empleadoId === empleadoId && a.estado === "pendiente")
    .sort((x, y) => (x.fecha === y.fecha ? x.id - y.id : x.fecha < y.fecha ? -1 : 1));
}

/** Total pendiente por descontar de un empleado. */
export function totalPendiente(adelantos: AdelantoSueldo[], empleadoId: number): number {
  return round2(pendientesDe(adelantos, empleadoId).reduce((s, a) => s + remanente(a), 0));
}

/**
 * Edita un adelanto pendiente (corrección de monto, fecha o nota). Los ya
 * descontados son intocables por trazabilidad. Si hubo descuento parcial, el
 * monto no puede quedar por debajo de lo ya descontado; si lo iguala, el
 * adelanto queda saldado.
 */
export function editarAdelanto(
  adelantos: AdelantoSueldo[],
  id: number,
  cambios: { montoUSD: number; fecha: string; nota?: string }
): AdelantoSueldo[] {
  return adelantos.map((a) => {
    if (a.id !== id || a.estado !== "pendiente") return a;
    const montoUSD = round2(Math.max(cambios.montoUSD, a.montoDescontadoUSD));
    const saldado = a.montoDescontadoUSD > 0 && montoUSD <= a.montoDescontadoUSD;
    const { nota: _nota, pagoNominaId: _pago, ...base } = a;
    return {
      ...base,
      montoUSD,
      fecha: cambios.fecha,
      ...(cambios.nota ? { nota: cambios.nota } : {}),
      estado: saldado ? ("descontado" as const) : ("pendiente" as const),
      ...(saldado
        ? { pagoNominaId: a.aplicaciones[a.aplicaciones.length - 1]?.pagoId }
        : {}),
    };
  });
}

/**
 * Cancela (anula) un adelanto pendiente. Sin nada descontado se elimina;
 * con descuento parcial se conserva el registro con el monto capado a lo ya
 * descontado (estado 'descontado') para no perder la traza de los pagos.
 */
export function cancelarAdelanto(adelantos: AdelantoSueldo[], id: number): AdelantoSueldo[] {
  return adelantos.flatMap((a) => {
    if (a.id !== id || a.estado !== "pendiente") return [a];
    if (a.montoDescontadoUSD <= 0) return [];
    return [
      {
        ...a,
        montoUSD: a.montoDescontadoUSD,
        estado: "descontado" as const,
        pagoNominaId: a.aplicaciones[a.aplicaciones.length - 1]?.pagoId,
      },
    ];
  });
}

/**
 * Aplica montoAplicar USD sobre los pendientes del empleado en orden FIFO.
 * Devuelve la lista completa actualizada: acumula montoDescontadoUSD, registra
 * la aplicación {pagoId, montoUSD} y, si el adelanto queda saldado, lo marca
 * 'descontado' con pagoNominaId = pagoId.
 */
export function aplicarAdelantos(
  adelantos: AdelantoSueldo[],
  empleadoId: number,
  montoAplicar: number,
  pagoId: number
): AdelantoSueldo[] {
  let restante = round2(montoAplicar);
  const orden = pendientesDe(adelantos, empleadoId).map((a) => a.id);
  return adelantos.map((a) => {
    if (restante <= 0 || !orden.includes(a.id)) return a;
    const aplicado = Math.min(remanente(a), restante);
    if (aplicado <= 0) return a;
    restante = round2(restante - aplicado);
    const montoDescontadoUSD = round2(a.montoDescontadoUSD + aplicado);
    const saldado = montoDescontadoUSD >= a.montoUSD;
    return {
      ...a,
      montoDescontadoUSD,
      aplicaciones: [...a.aplicaciones, { pagoId, montoUSD: round2(aplicado) }],
      estado: saldado ? "descontado" : "pendiente",
      pagoNominaId: saldado ? pagoId : a.pagoNominaId,
    };
  });
}
