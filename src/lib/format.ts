/**
 * Formato numérico es-VE (puntos de miles, coma decimal).
 *
 * Implementación propia y determinista en lugar de toLocaleString('es-VE'):
 * el ICU de Node y el del navegador pueden diferir y provocar errores de
 * hidratación o números que no re-parsean. Reproduce la salida del boceto:
 *   money(1234.5)      -> "$ 1.234,50"
 *   money(1234.5,'Bs') -> "Bs 1.234,50"
 */

/** 1234567.891 -> "1.234.567,89" (siempre 2 decimales). */
export function formatNumberVE(n: number): string {
  const negativo = n < 0;
  const fixed = Math.abs(n).toFixed(2);
  const [entero, decimales] = fixed.split(".");
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (negativo ? "-" : "") + conMiles + "," + decimales;
}

/** Equivalente a money(n, sym) del boceto: "$ 1.234,50" / "Bs 1.234,50". */
export function money(n: number, sym: string = "$"): string {
  return sym + " " + formatNumberVE(n);
}

/**
 * Parseo de montos escritos en formato es-VE.
 * Réplica exacta del parseo de retenciones.php:
 *   quita los puntos de miles y convierte la coma decimal en punto.
 * "1.234,56" -> 1234.56 ; entrada inválida -> 0.
 */
export function parseVES(s: string): number {
  const v = parseFloat((s || "0").replace(/\./g, "").replace(",", "."));
  return Number.isNaN(v) ? 0 : v;
}

/** Fecha -> "yyyy-mm-dd" (réplica de fmtISO del boceto). */
export function fmtISO(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
