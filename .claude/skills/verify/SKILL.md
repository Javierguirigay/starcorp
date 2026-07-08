---
name: verify
description: Cómo verificar cambios de UI de este proyecto de punta a punta (build, launch, drive).
---

# Verificar starcorp-next

- **Levantar**: `npm run dev` → http://localhost:3000. Ojo: suele haber ya un dev server del usuario en el puerto 3000 (Next se niega a levantar un segundo desde el mismo directorio) — usa el que está corriendo; recoge cambios en caliente.
- **Login**: es fase boceto, no valida credenciales. Se puede navegar directo a las rutas, p. ej. `/loter/administracion/nomina` (rol hardcodeado en `src/lib/config.ts`).
- **Drive**: Playwright no está en el repo; instálalo en el scratchpad (`npm i playwright`) y usa `chromium.launch({ channel: "msedge" })` para no descargar navegadores.
- **Gotcha PDFs**: el visor PDF de Chromium/Edge dentro de un `<iframe>` NO se pinta en headless ni sale en `page.screenshot` (proceso aparte). Para evidencia visual: `headless: false` + captura a nivel de OS (PowerShell `CopyFromScreen`). Para validar el documento sin pantalla: `fetch(iframe.src)` dentro de la página y comprobar cabecera `%PDF` + tamaño; los archivos descargados se pueden abrir con la herramienta Read.
- **Flujos de nómina**: Historial de pagos → botón "Ver" por fila abre `DetalleModal`; dentro, icono ojo por empleado = preview de recibo, footer: "Consolidado" y "Todos los recibos"; el modal de preview tiene "Descargar" (evento download de Playwright funciona) y "Cerrar".
