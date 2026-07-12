@AGENTS.md
# Tarea: Mejoras al módulo Facturación y Compras — Resumen de Ventas, cálculo IVA y logo real

## Contexto
Proyecto STARCORP GROUP / LOTER, C.A. — Next.js (App Router) + TypeScript + Tailwind +
@react-pdf/renderer. Reglas transversales de siempre: formato es-VE (punto de miles,
coma decimal, 2 decimales), fechas dd-mm-yyyy, doble moneda con snapshot de tasa,
funciones puras para cálculos, solo rol `administradora`.

Son 3 mejoras sobre lo ya construido. Antes de tocar nada, lee: la pestaña Resumen de
Gestión de Compras (se replicará el patrón para ventas), el Libro de Ventas de
Facturación, el formulario "Nueva factura recibida" y los componentes PDF que hoy
usan el logo placeholder.

---

## 1) Nueva pestaña "Resumen" en Facturación (débitos fiscales)

Espejo de la pestaña Resumen de Gestión de Compras, pero del lado de VENTAS.
Facturación queda con pestañas: Reporte de Servicio | Pre-Factura | Factura |
Libro de Ventas | Resumen.

- Selector de período (mes), mismo componente/patrón que en Compras.
- Contenido (sección DÉBITOS del formato "Resumen de Débitos y Créditos Fiscales IVA",
  columnas BASE | DÉBITOS):
  * Ventas Internas No Gravadas
  * Ventas Internas Gravadas Alícuota General
  * Ventas Internas Gravadas Alícuota General Más Alícuota Adicional
  * Ventas Internas Gravadas Alícuota Reducida
  * Total Ventas y Débitos Fiscales
  * Total Débitos Fiscales del período
- Todo calculado automáticamente desde las FACTURAS emitidas del mes (Libro de
  Ventas). Hoy solo emitimos gravadas a alícuota general 16%: las demás filas van
  en 0,00 pero deben existir en la vista y el PDF (formato fiscal completo).
- Reutilizar/extraer las funciones puras de agregación que ya existen para el
  resumen de compras, parametrizándolas, en lugar de duplicar código.
- Exportación PDF: resumen_debitos_{mes}.pdf, mismo estilo del resumen de créditos
  ("LOTER, C.A — RIF J-31717295-7 — Resumen de Débitos Fiscales IVA — {mes/año}").

---

## 2) Cálculo automático de IVA en "Nueva factura recibida"

Hoy hay que llenar base imponible Y total con IVA a mano. Cambiar a cálculo
automático entre los 4 campos, con estos nombres visibles:
- Base Imponible (editable)
- Impuesto IVA 16% (solo lectura, derivado)
- Compra Sin Derecho a Crédito (editable, default 0,00) ← renombrar el campo
  actual "compras sin derecho a crédito" a este label exacto
- Total Compras con IVA (derivado, ver regla bidireccional abajo)

FÓRMULA (crítica):
  impuestoIVA = baseImponible × 16%
  totalComprasConIVA = baseImponible + impuestoIVA + compraSinDerechoACredito

Ejemplos verificables (deben cumplirse):
  a) Base 10.000,00 / Sin derecho 0,00 → IVA 1.600,00 → Total 11.600,00
  b) Base 10.000,00 / Sin derecho 10.000,00 → IVA 1.600,00 → Total 21.600,00

COMPORTAMIENTO BIDIRECCIONAL (el último campo editado manda):
- Edito BASE o SIN DERECHO → recalcular IVA y Total con la fórmula.
- Edito TOTAL → base = (total − compraSinDerechoACredito) / 1,16;
  IVA = base × 16%. (Si el resultado diera base negativa, marcar error de
  validación en vez de aceptar el valor.)
- Redondeo a 2 decimales en cada derivación, formato es-VE en pantalla.

Implementar como función pura (p. ej. derivarMontosFacturaRecibida(campoEditado,
valores)) con tests de los ejemplos a) y b) si el repo tiene tests.

PROPAGACIÓN (verificar que ya funcione así y corregir si no):
- Libro de Compras: la columna "Compras Gravadas Incluy. IVA" toma el total
  derivado; "Compras No Gravadas" / sin derecho a crédito va en su columna
  propia; el crédito fiscal se calcula SOLO sobre el impuesto de la base
  imponible (la porción sin derecho a crédito NUNCA genera crédito fiscal).
- Retención generada desde la factura: "Total Compras con I.V.A" = total
  derivado; "Compras sin derecho a crédito I.V.A" = su campo; base, impuesto
  e IVA retenido (75%/100%) se calculan solo sobre la base imponible.
- Resumen de créditos: la fila "Compras No Gravadas o Sin Derecho a Crédito"
  agrega estos montos por período.
- Aplicar el mismo comportamiento en la edición de facturas recibidas
  existentes.

## 3) Logo real de LOTER en los PDF

El usuario colocó el logo oficial en:
- public/branding/logo-loter.svg (original)
- public/branding/logo-loter.png (para los PDF; si NO existe, generarlo desde el
  SVG a PNG con fondo transparente, ~600px de ancho, e informarlo en el resumen)

Cambios:
- Reemplazar el logo placeholder/creado por logo-loter.png en TODOS los PDF que
  llevan membrete de LOTER: Pre-Factura, Factura (registro interno), Comprobante
  de Retención, Libro de Compras, Libro de Ventas y ambos Resúmenes (si estos
  llevan encabezado con logo; si no lo llevan, dejarlos como están).
- NO tocar la plantilla de impresión de factura (fondo blanco, solo datos: sin logo).
- NO tocar la interfaz del sistema (login, sidebar, pantallas): mantiene la marca
  STARCORP GROUP actual.
- Cuidar proporciones: el logo mantiene su aspect ratio, alineado arriba-izquierda
  en el encabezado como en los documentos reales (referencias en docs/referencias).
- Centralizar la ruta del logo en una constante/config de branding por empresa
  (pensando en que ETM/MONACO/AGROSTAR tendrán su propio logo a futuro).

---

## Cierre
- No romper nada de lo existente: flujos de pre-factura→factura, retenciones,
  libros y resúmenes de compras siguen funcionando igual.
- Al terminar: resumen de archivos tocados, confirmación de los 2 ejemplos de
  cálculo de IVA y captura/descripción de dónde quedó el logo aplicado.