# Supabase — esquema, seeds y plan de conexión

Estado actual: **el esquema está listo pero la app no lo consume todavía**.
Las pantallas leen los datos de ejemplo tipados de `src/lib/data/`. Este
documento explica cómo crear la base en Supabase y cuál es el plan para
conectar la app cuando se decida dar el paso.

## 1. Crear el proyecto

1. Entra en [supabase.com](https://supabase.com) → **New project**.
2. Elige nombre (p. ej. `starcorp`), contraseña de la base y región.
3. En **Project Settings → API** copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Aplicar las migraciones

Hay dos vías; usa la que prefieras.

### Vía A · Dashboard (SQL Editor) — la más simple

En **SQL Editor** del dashboard, pega y ejecuta **en este orden**:

1. `supabase/migrations/20260704000001_tipos.sql`
2. `supabase/migrations/20260704000002_tablas.sql`
3. `supabase/migrations/20260704000003_rls.sql`
4. `supabase/seed.sql` (datos de ejemplo del boceto)

### Vía B · Supabase CLI

```bash
npm i -D supabase              # o instala el CLI global
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db push           # aplica supabase/migrations/*
psql "$(npx supabase db url)" -f supabase/seed.sql   # o pega el seed en el SQL Editor
```

> El seed es idempotente en las tablas con clave natural (`on conflict do
> nothing`), pero los bloques de movimientos/facturas/mantenimientos insertan
> de nuevo si lo ejecutas dos veces. Ejecútalo una sola vez sobre una base
> recién migrada.

## 3. Qué contiene el esquema

- **Tipos enum** para todos los estados del dominio (`estado_equipo`,
  `categoria_pago`, `estatus_empleado`, etc.) — así la BD rechaza valores
  fuera del vocabulario que hoy usa la UI.
- **Tablas**: `empresas`, `perfiles` (1:1 con `auth.users`, lista para
  Supabase Auth), `equipos`, `empleados` + `empleado_banco` (1:1) + `faltas`,
  `pagos_nomina` + `pago_detalle`, `movimientos`, `facturas`,
  `retenciones` + `retencion_lineas`, `mantenimientos`,
  `asignaciones` + `asignacion_equipos` (N:M).
- **RLS activa en todas las tablas**, espejo del gating por rol del sidebar:
  - `administradora`: lee y escribe todo.
  - `operaciones`: lee todo; escribe solo `equipos`, `mantenimientos`,
    `asignaciones` y `asignacion_equipos`.
  - `anon`: sin acceso.

  Mientras no haya Auth, nada consume estas políticas (el SQL Editor y la
  service role key las bypasean).

## 4. Plan de conexión futura (cuando se decida)

1. **Auth**: activar Email/Password en Supabase Auth, crear los usuarios y
   una fila en `perfiles` por usuario con su `rol`. Sustituir el login
   simulado por `supabase.auth.signInWithPassword`, y `USUARIO_ACTUAL` de
   `src/lib/config.ts` por el perfil de la sesión (middleware de Next para
   proteger las rutas de `(app)`).
2. **Lecturas**: reemplazar los imports de `src/lib/data/*` por consultas con
   `getSupabase()` (`src/lib/supabase/client.ts`) en los server components
   (o `@supabase/ssr` si se quiere sesión en el servidor).
3. **Escrituras**: conectar módulo a módulo, empezando por Nómina (el único
   con CRUD real hoy): alta/edición de empleados → `empleados` +
   `empleado_banco`, faltas → `faltas`, registrar pago → `pagos_nomina` +
   `pago_detalle`. Después, los formularios hoy decorativos (transferencias,
   retenciones, asignaciones).
4. Los cálculos siguen viviendo en `src/lib/negocio/` — la BD solo persiste
   resultados y datos maestros.
