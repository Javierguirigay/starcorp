/**
 * Días entre dos fechas 'yyyy-mm-dd', inclusivo de ambos extremos.
 * Réplica de diasEntre() de asignacion-equipos.php: devuelve '' si el
 * rango está vacío o no es positivo.
 */
export function diasEntre(d1: string, d2: string): number | "" {
  if (!d1 || !d2) return "";
  const a = new Date(d1).getTime();
  const b = new Date(d2).getTime();
  const dif = Math.round((b - a) / 86400000) + 1;
  return dif > 0 ? dif : "";
}
