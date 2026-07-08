@AGENTS.md
# Tarea: Nómina — Adelantos de sueldo + Exportación PDF + Fix de formato de fecha

## Contexto
Proyecto STARCORP GROUP / LOTER, C.A. — sistema en Next.js (App Router) + TypeScript + Tailwind. Trabajamos en el módulo de Nómina (solo rol `administradora`). Reglas transversales a respetar: doble moneda USD + Bs (tasa Bs/USD editable), formato es-VE (punto de miles, coma decimal, 2 decimales), identidad visual navy + dorado (#F2A900), tipografías existentes, iconos `lucide-react`.

Antes de tocar nada: localiza y lee los archivos actuales del módulo de nómina (componentes de Empleados, Procesar pago, Historial de pagos y sus modales), los tipos del dominio, las funciones de cálculo (`salarioDiario`, `calcularPago` o equivalentes), los datos mock y los helpers de formato de moneda/fecha. Respeta los patrones y el estilo ya existentes. No dupliques lógica: reutiliza o centraliza.

Fórmula vigente (NO romperla):
- salario_diario = salario_base_mensual / 30
- días del período: Semanal = 7, Quincenal = 15
- descuento_faltas = faltas × salario_diario
- neto = (días − faltas) × salario_diario

---

## 1) Adelanto / préstamo de sueldo

Comportamiento: un empleado pide un adelanto de su sueldo; se registra el día que lo pidió (con fecha y monto en USD) y se descuenta completo al pagar la semana/quincena correspondiente a su categoría. Se refleja en USD y Bs.

Implementa:
- Nuevo tipo de dominio, por ejemplo:
  interface AdelantoSueldo {
    id: string
    empleadoId: string
    montoUSD: number
    fecha: string          // ISO; se MUESTRA como dd-mm-yyyy
    estado: 'pendiente' | 'descontado'
    pagoNominaId?: string  // período en que se descontó
    nota?: string
  }
- UI para registrar un adelanto (modal): seleccionar empleado, monto en USD (mostrar equivalente en Bs con la tasa vigente), fecha (por defecto hoy, editable), nota opcional. Ubícalo donde encaje mejor con el patrón actual (sub-sección en Empleados o acción dentro de Procesar pago).
- En Procesar pago: al elegir categoría + período, además de las faltas, listar por empleado los adelantos pendientes y sumarlos como descuento_adelanto. Al confirmar el pago ("Semana pagada" / "Quincena pagada"), marcar esos adelantos como `descontado` y enlazarlos al pago.
- Fórmula actualizada (mantener funciones puras y testeables):
  - descuento_adelanto = suma de adelantos pendientes aplicados
  - neto = (días − faltas) × salario_diario − descuento_adelanto
  - Salvaguarda: si descuento_adelanto supera el bruto disponible, dejar neto = 0 y el remanente queda pendiente para el próximo pago (nunca generar neto negativo).
- Historial de pagos y detalle por empleado: agregar la columna/dato "Adelanto" (descuento por préstamo), en USD y Bs, junto al descuento por faltas.
- Actualiza los datos mock con 1–2 adelantos de ejemplo.

Criterios verificables (deben cumplirse):
- Semanal, base $600 → diario $20 → bruto 7×20 = $140. Con 2 faltas (−$40) y adelanto $30 → neto $70; desc. faltas $40; desc. adelanto $30.
- Quincenal, base $600 → diario $20 → bruto 15×20 = $300. Con 3 faltas (−$60) y adelanto $50 → neto $190.
- Todos los montos en es-VE y su equivalente Bs = USD × tasa.

---

## 2) Exportar recibos en PDF

Librería: usar `@react-pdf/renderer` (control fino de layout para recibos y tabla consolidada; generación 100% en el cliente con descarga). Si el proyecto ya trae otra solución de PDF, úsala en su lugar y avísame.

Diseño limpio y simple, SIN membrete ni logo. Encabezado sobrio de texto: "LOTER, C.A. — RIF J-31717295-7" + título del documento. Respeta la paleta/tipografías del sistema en lo posible.

Genera desde el botón "Ver" del Historial de pagos (dentro de ese modal/vista):
- Recibo individual (acción por empleado): empresa (texto), empleado (nombre, cargo, departamento, categoría), datos bancarios (banco, tipo de cuenta, nº de cuenta, titular, cédula del titular, teléfono de pago móvil), período (categoría, desde→hasta en dd-mm-yyyy), días del período, faltas, descuento por faltas, descuento por adelanto, salario base, salario diario, neto — todo en USD y Bs con la tasa usada. Deja espacio de firma.
- Reporte consolidado (un botón): tabla con todos los empleados pagados en ese período (nombre, cargo, categoría, días, faltas, desc. faltas, desc. adelanto, neto USD, neto Bs) + fila de totales.
- Paquete de recibos (un botón): un único PDF con todos los recibos individuales, una página por empleado.

Es decir, 3 acciones: "Descargar recibo" (por fila/empleado), "Descargar consolidado" y "Descargar todos los recibos". Nombra los archivos claro: recibo_{empleado}_{periodo}.pdf, consolidado_{periodo}.pdf, recibos_{periodo}.pdf.

---

## 3) Fix: formato de fecha en el Historial

En el Historial de pagos las fechas se muestran en formato inglés yyyy-mm-dd; deben mostrarse en es-VE: dd-mm-yyyy. Centraliza un helper `formatFechaVE(fecha: string): string` (o reutiliza el que exista) y aplícalo en todo el historial (y reutilízalo en los PDF). No cambies cómo se almacena la fecha (ISO); solo la presentación.

---

## Cierre
- Mantén el gating por rol: nómina y estas funciones solo para `administradora`.
- Conserva doble moneda y formato es-VE en toda salida (incluidos los PDF).
- Mantén el cálculo en funciones puras; si el repo tiene tests, agrega casos con los ejemplos de arriba.
- Al terminar, dame un resumen de los archivos tocados y de cualquier decisión que hayas tomado.