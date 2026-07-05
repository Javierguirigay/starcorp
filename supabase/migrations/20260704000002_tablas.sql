-- STARCORP GROUP · Migración 2: tablas, relaciones e índices.
-- Nota: Postgres no crea índices sobre FKs automáticamente; se añaden explícitos.

-- ------------------------------------------------------------------
-- Empresas del conglomerado
-- ------------------------------------------------------------------
create table public.empresas (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,          -- 'loter', 'etm', 'monaco', 'agrostar'
  nombre     text not null,
  rif        text not null,
  direccion  text,
  telefono   text,
  activa     boolean not null default false,
  creado_en  timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Perfiles de usuario (listo para Supabase Auth: fk a auth.users)
-- ------------------------------------------------------------------
create table public.perfiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  nombre    text not null,
  rol       public.rol_usuario not null default 'operaciones',
  inicial   char(1),
  creado_en timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Equipos e inventario
-- ------------------------------------------------------------------
create table public.equipos (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id),
  codigo     text unique not null,          -- hoy el código es el nombre del equipo
  categoria  public.categoria_equipo not null,
  estado     public.estado_equipo not null default 'Disponible',
  ubicacion  text,
  creado_en  timestamptz not null default now()
);
create index equipos_empresa_idx on public.equipos (empresa_id);
create index equipos_categoria_idx on public.equipos (categoria);
create index equipos_estado_idx on public.equipos (estado);

-- ------------------------------------------------------------------
-- Nómina
-- ------------------------------------------------------------------
create table public.empleados (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references public.empresas (id),
  nombre            text not null,
  cargo             text,
  departamento      text,
  categoria_pago    public.categoria_pago not null,
  salario_base_usd  numeric(12,2) not null check (salario_base_usd >= 0),
  fecha_ingreso     date,
  estatus           public.estatus_empleado not null default 'Activo',
  creado_en         timestamptz not null default now()
);
create index empleados_empresa_idx on public.empleados (empresa_id);
create index empleados_estatus_idx on public.empleados (estatus);
create index empleados_categoria_idx on public.empleados (categoria_pago);

-- Datos bancarios 1:1 con el empleado
create table public.empleado_banco (
  empleado_id   uuid primary key references public.empleados (id) on delete cascade,
  banco         text,
  tipo_cuenta   text check (tipo_cuenta in ('Corriente', 'Ahorro')),
  numero_cuenta text,
  titular       text,
  cedula        text,
  pago_movil    text
);

-- Faltas marcadas por período de pago (una fila por día)
create table public.faltas (
  id          uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  fecha       date not null,
  unique (empleado_id, fecha)
);
create index faltas_empleado_idx on public.faltas (empleado_id);

-- Pagos registrados (cabecera del período)
create table public.pagos_nomina (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas (id),
  categoria      public.categoria_pago not null,
  desde          date not null,
  hasta          date not null,
  registrado_en  timestamptz not null default now(),
  tasa_bs        numeric(14,4) not null,    -- tasa Bs/USD usada al registrar
  total_usd      numeric(14,2) not null,
  total_desc_usd numeric(14,2) not null default 0
);
create index pagos_nomina_empresa_idx on public.pagos_nomina (empresa_id);
create index pagos_nomina_registrado_idx on public.pagos_nomina (registrado_en desc);

-- Detalle por empleado de cada pago
create table public.pago_detalle (
  id            uuid primary key default gen_random_uuid(),
  pago_id       uuid not null references public.pagos_nomina (id) on delete cascade,
  empleado_id   uuid references public.empleados (id) on delete set null,
  nombre        text not null,              -- snapshot del nombre al momento del pago
  faltas        int not null default 0,
  dias          int not null,
  diario_usd    numeric(12,2) not null,
  descuento_usd numeric(12,2) not null default 0,
  neto_usd      numeric(12,2) not null
);
create index pago_detalle_pago_idx on public.pago_detalle (pago_id);
create index pago_detalle_empleado_idx on public.pago_detalle (empleado_id);

-- ------------------------------------------------------------------
-- Finanzas
-- ------------------------------------------------------------------
create table public.movimientos (
  id              uuid primary key default gen_random_uuid(),
  tipo            public.tipo_movimiento not null,
  origen          text not null,             -- texto libre: empresa o tercero
  destino         text not null,
  empresa_id      uuid references public.empresas (id),  -- empresa afectada, si aplica
  moneda          text not null check (moneda in ('USD', 'Bs')),
  monto           numeric(16,2) not null,
  descripcion     text,
  registrado_por  text,
  fecha           date not null,
  creado_en       timestamptz not null default now()
);
create index movimientos_empresa_idx on public.movimientos (empresa_id);
create index movimientos_fecha_idx on public.movimientos (fecha desc);

-- ------------------------------------------------------------------
-- Facturas
-- ------------------------------------------------------------------
create table public.facturas (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id),
  numero     text not null,
  tercero    text not null,                  -- proveedor o cliente
  tipo       text not null check (tipo in ('Emitida', 'Recibida')),
  moneda     text not null check (moneda in ('USD', 'Bs')),
  monto      numeric(16,2) not null,
  estado     text not null check (estado in ('Cobrada', 'Pendiente', 'Pagada')),
  fecha      date not null,
  pdf_url    text,                           -- para la subida de PDF futura
  creado_en  timestamptz not null default now()
);
create index facturas_empresa_idx on public.facturas (empresa_id);
create index facturas_fecha_idx on public.facturas (fecha desc);

-- ------------------------------------------------------------------
-- Retenciones de IVA
-- ------------------------------------------------------------------
create table public.retenciones (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas (id),
  comprobante    text unique not null,       -- ej. 20260600000050
  fecha_emision  date not null,
  anio           int not null,
  mes            int not null check (mes between 1 and 12),
  sujeto_nombre  text,
  sujeto_rif     text,
  sujeto_direccion text,
  pct            smallint not null default 100 check (pct in (75, 100)),
  creado_en      timestamptz not null default now()
);
create index retenciones_empresa_idx on public.retenciones (empresa_id);

create table public.retencion_lineas (
  id            uuid primary key default gen_random_uuid(),
  retencion_id  uuid not null references public.retenciones (id) on delete cascade,
  num_operacion int not null,
  fecha_doc     date,
  num_factura   text,
  num_control   text,
  nota_debito   text,
  nota_credito  text,
  tipo_doc      text check (tipo_doc in ('01', '02', '03')),
  total_con_iva numeric(16,2),
  sin_credito   numeric(16,2),
  base_imponible numeric(16,2) not null default 0,
  -- impuesto (16%) e IVA retenido se derivan de base_imponible y pct;
  -- se persisten para trazabilidad del comprobante emitido
  impuesto_iva  numeric(16,2) not null default 0,
  iva_retenido  numeric(16,2) not null default 0
);
create index retencion_lineas_ret_idx on public.retencion_lineas (retencion_id);

-- ------------------------------------------------------------------
-- Mantenimiento
-- ------------------------------------------------------------------
create table public.mantenimientos (
  id             uuid primary key default gen_random_uuid(),
  equipo_id      uuid not null references public.equipos (id),
  tipo           public.tipo_mantenimiento not null,
  programado     date,
  realizado      date,
  estado         public.estado_mantenimiento not null default 'Programado',
  tecnico        text,
  observaciones  text,
  creado_en      timestamptz not null default now()
);
create index mantenimientos_equipo_idx on public.mantenimientos (equipo_id);
create index mantenimientos_estado_idx on public.mantenimientos (estado);

-- ------------------------------------------------------------------
-- Asignación de equipos
-- ------------------------------------------------------------------
create table public.asignaciones (
  id             uuid primary key default gen_random_uuid(),
  codigo         text unique not null,       -- 'S-001'
  requerimiento  text,                       -- 'ASG-2026-001'
  empresa_id     uuid not null references public.empresas (id),
  cliente        text not null,              -- cliente / proyecto
  desde          date,
  hasta          date,
  estado         public.estado_asignacion not null default 'Activo',
  entrega        text,                       -- responsable que entrega
  recibe         text,                       -- responsable que recibe
  observaciones  text,
  creado_en      timestamptz not null default now()
);
create index asignaciones_empresa_idx on public.asignaciones (empresa_id);
create index asignaciones_estado_idx on public.asignaciones (estado);

-- N:M asignación ↔ equipos
create table public.asignacion_equipos (
  asignacion_id uuid not null references public.asignaciones (id) on delete cascade,
  equipo_id     uuid not null references public.equipos (id),
  primary key (asignacion_id, equipo_id)
);
create index asignacion_equipos_equipo_idx on public.asignacion_equipos (equipo_id);
