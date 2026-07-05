-- STARCORP GROUP · Migración 3: Row Level Security.
--
-- Sistema interno con 2 roles (espejo de puede() del sidebar):
--   administradora -> lectura y escritura en todo
--   operaciones    -> lectura en todo; escritura solo en equipos,
--                     mantenimientos y asignaciones
--   anon           -> sin acceso
--
-- Nota: mientras la app no use Supabase Auth, nada consume estas políticas;
-- el seed se aplica con service role / SQL Editor, que las bypasea.

-- Helper: rol del usuario autenticado.
-- SECURITY DEFINER para poder leer perfiles sin política recursiva.
create or replace function public.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid()
$$;

create or replace function public.es_administradora()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rol_actual() = 'administradora'
$$;

-- ------------------------------------------------------------------
-- Activar RLS en todas las tablas
-- ------------------------------------------------------------------
alter table public.empresas           enable row level security;
alter table public.perfiles           enable row level security;
alter table public.equipos            enable row level security;
alter table public.empleados          enable row level security;
alter table public.empleado_banco     enable row level security;
alter table public.faltas             enable row level security;
alter table public.pagos_nomina       enable row level security;
alter table public.pago_detalle       enable row level security;
alter table public.movimientos        enable row level security;
alter table public.facturas           enable row level security;
alter table public.retenciones        enable row level security;
alter table public.retencion_lineas   enable row level security;
alter table public.mantenimientos     enable row level security;
alter table public.asignaciones       enable row level security;
alter table public.asignacion_equipos enable row level security;

-- ------------------------------------------------------------------
-- Lectura: cualquier usuario autenticado ve todo (sistema interno)
-- ------------------------------------------------------------------
create policy "lectura autenticados" on public.empresas
  for select to authenticated using (true);
create policy "lectura autenticados" on public.equipos
  for select to authenticated using (true);
create policy "lectura autenticados" on public.empleados
  for select to authenticated using (true);
create policy "lectura autenticados" on public.empleado_banco
  for select to authenticated using (true);
create policy "lectura autenticados" on public.faltas
  for select to authenticated using (true);
create policy "lectura autenticados" on public.pagos_nomina
  for select to authenticated using (true);
create policy "lectura autenticados" on public.pago_detalle
  for select to authenticated using (true);
create policy "lectura autenticados" on public.movimientos
  for select to authenticated using (true);
create policy "lectura autenticados" on public.facturas
  for select to authenticated using (true);
create policy "lectura autenticados" on public.retenciones
  for select to authenticated using (true);
create policy "lectura autenticados" on public.retencion_lineas
  for select to authenticated using (true);
create policy "lectura autenticados" on public.mantenimientos
  for select to authenticated using (true);
create policy "lectura autenticados" on public.asignaciones
  for select to authenticated using (true);
create policy "lectura autenticados" on public.asignacion_equipos
  for select to authenticated using (true);

-- Perfiles: cada quien ve el suyo; la administradora ve todos.
create policy "ver perfil propio o admin" on public.perfiles
  for select to authenticated
  using (id = auth.uid() or public.es_administradora());

-- ------------------------------------------------------------------
-- Escritura: administradora en todo
-- ------------------------------------------------------------------
create policy "admin escribe" on public.empresas
  for all to authenticated using (public.es_administradora()) with check (public.es_administradora());
create policy "admin escribe" on public.perfiles
  for all to authenticated using (public.es_administradora()) with check (public.es_administradora());
create policy "admin escribe" on public.empleados
  for all to authenticated using (public.es_administradora()) with check (public.es_administradora());
create policy "admin escribe" on public.empleado_banco
  for all to authenticated using (public.es_administradora()) with check (public.es_administradora());
create policy "admin escribe" on public.faltas
  for all to authenticated using (public.es_administradora()) with check (public.es_administradora());
create policy "admin escribe" on public.pagos_nomina
  for all to authenticated using (public.es_administradora()) with check (public.es_administradora());
create policy "admin escribe" on public.pago_detalle
  for all to authenticated using (public.es_administradora()) with check (public.es_administradora());
create policy "admin escribe" on public.movimientos
  for all to authenticated using (public.es_administradora()) with check (public.es_administradora());
create policy "admin escribe" on public.facturas
  for all to authenticated using (public.es_administradora()) with check (public.es_administradora());
create policy "admin escribe" on public.retenciones
  for all to authenticated using (public.es_administradora()) with check (public.es_administradora());
create policy "admin escribe" on public.retencion_lineas
  for all to authenticated using (public.es_administradora()) with check (public.es_administradora());
create policy "admin escribe" on public.equipos
  for all to authenticated using (public.es_administradora()) with check (public.es_administradora());
create policy "admin escribe" on public.mantenimientos
  for all to authenticated using (public.es_administradora()) with check (public.es_administradora());
create policy "admin escribe" on public.asignaciones
  for all to authenticated using (public.es_administradora()) with check (public.es_administradora());
create policy "admin escribe" on public.asignacion_equipos
  for all to authenticated using (public.es_administradora()) with check (public.es_administradora());

-- ------------------------------------------------------------------
-- Escritura del rol operaciones: solo el área operativa
-- (equipos, mantenimientos, asignaciones)
-- ------------------------------------------------------------------
create policy "operaciones escribe" on public.equipos
  for all to authenticated
  using (public.rol_actual() = 'operaciones')
  with check (public.rol_actual() = 'operaciones');
create policy "operaciones escribe" on public.mantenimientos
  for all to authenticated
  using (public.rol_actual() = 'operaciones')
  with check (public.rol_actual() = 'operaciones');
create policy "operaciones escribe" on public.asignaciones
  for all to authenticated
  using (public.rol_actual() = 'operaciones')
  with check (public.rol_actual() = 'operaciones');
create policy "operaciones escribe" on public.asignacion_equipos
  for all to authenticated
  using (public.rol_actual() = 'operaciones')
  with check (public.rol_actual() = 'operaciones');
