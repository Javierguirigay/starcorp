-- STARCORP GROUP · Seed: datos de ejemplo del boceto (src/lib/data/*).
-- Aplicar DESPUÉS de las 3 migraciones. Idempotente vía on conflict.

-- ------------------------------------------------------------------
-- Empresas
-- ------------------------------------------------------------------
insert into public.empresas (slug, nombre, rif, direccion, telefono, activa) values
  ('loter', 'LOTER, C.A.', 'J-31717295-7',
   'Av. Bolívar con Av. Juncal, Edificio Pichel, Piso 1, Oficina 14, Maturín, Estado Monagas.',
   '+58 (414) 394-3555', true),
  ('etm', 'ETM SUPPLY', 'J-00000000-0', null, null, false),
  ('monaco', 'MONACO, C.A.', 'J-00000000-0', null, null, false),
  ('agrostar', 'AGROSTAR', 'J-00000000-0', null, null, false)
on conflict (slug) do nothing;

-- ------------------------------------------------------------------
-- Equipos (catálogo de config.php)
-- ------------------------------------------------------------------
insert into public.equipos (empresa_id, codigo, categoria, estado, ubicacion)
select e.id, x.codigo, x.categoria::public.categoria_equipo,
       x.estado::public.estado_equipo, x.ubicacion
from public.empresas e,
     (values
        ('Chuto',              'petrolero', 'Asignado',      'Base GO Wireline'),
        ('Tanque (Frac-Tank)', 'petrolero', 'Disponible',    'Patio LOTER'),
        ('Vacuum',             'petrolero', 'Disponible',    'Patio LOTER'),
        ('Luminaria #1',       'petrolero', 'Asignado',      'Pozo SBC-37'),
        ('Luminaria #2',       'petrolero', 'Asignado',      'Pozo SBC-37'),
        ('Luminaria #3',       'petrolero', 'Asignado',      'Pozo SBC-37'),
        ('Generador',          'petrolero', 'Mantenimiento', 'Taller'),
        ('Lowboy',             'petrolero', 'Disponible',    'Patio LOTER'),
        ('Traslado',           'petrolero', 'Disponible',    'Patio LOTER')
     ) as x (codigo, categoria, estado, ubicacion)
where e.slug = 'loter'
on conflict (codigo) do nothing;

-- ------------------------------------------------------------------
-- Empleados + datos bancarios (seed de nomina.php)
-- ------------------------------------------------------------------
insert into public.empleados (empresa_id, nombre, cargo, departamento, categoria_pago,
                              salario_base_usd, fecha_ingreso, estatus)
select e.id, x.nombre, x.cargo, x.dpto, x.cat::public.categoria_pago,
       x.base, x.ingreso::date, x.estatus::public.estatus_empleado
from public.empresas e,
     (values
        ('Carlos González', 'Supervisor de campo',       'Operaciones',    'Quincenal', 620, '2021-03-12', 'Activo'),
        ('María Rodríguez', 'Asistente administrativo',  'Administración', 'Quincenal', 480, '2022-07-05', 'Activo'),
        ('José Pérez',      'Operador de vacuum',        'Operaciones',    'Semanal',   140, '2020-01-18', 'Activo'),
        ('Luis Martínez',   'Ayudante de patio',         'Operaciones',    'Semanal',   110, '2023-09-22', 'Activo'),
        ('Ana Salazar',     'Contadora',                 'Administración', 'Quincenal', 700, '2019-02-01', 'Activo'),
        ('Pedro Ramírez',   'Chofer (Lowboy)',           'Operaciones',    'Semanal',   160, '2022-11-14', 'Permiso')
     ) as x (nombre, cargo, dpto, cat, base, ingreso, estatus)
where e.slug = 'loter'
  and not exists (select 1 from public.empleados emp where emp.nombre = x.nombre);

insert into public.empleado_banco (empleado_id, banco, tipo_cuenta, numero_cuenta, titular, cedula, pago_movil)
select emp.id, x.banco, x.tipo, x.cuenta, x.titular, x.cedula, x.pagomovil
from public.empleados emp
join (values
        ('Carlos González', 'Banesco',            'Corriente', '0134 0123 4567 8901 2345', 'Carlos González', 'V-18.452.117', '0414-3556789'),
        ('María Rodríguez', 'Mercantil',          'Ahorro',    '0105 1122 3344 5566 7788', 'María Rodríguez', 'V-20.118.904', '0412-7781234'),
        ('José Pérez',      'Banco de Venezuela', 'Ahorro',    '0102 9988 7766 5544 3322', 'José Pérez',      'V-15.330.276', '0416-4459087'),
        ('Luis Martínez',   'BNC',                'Ahorro',    '0191 2233 4455 6677 8899', 'Luis Martínez',   'V-24.905.661', '0426-1120345'),
        ('Ana Salazar',     'Provincial',         'Corriente', '0108 5544 3322 1100 9988', 'Ana Salazar',     'V-19.774.038', '0414-9982310'),
        ('Pedro Ramírez',   'Banesco',            'Ahorro',    '0134 6677 8899 0011 2233', 'Pedro Ramírez',   'V-22.561.490', '0424-3357788')
     ) as x (nombre, banco, tipo, cuenta, titular, cedula, pagomovil)
  on emp.nombre = x.nombre
on conflict (empleado_id) do nothing;

-- ------------------------------------------------------------------
-- Historial de pagos de nómina (2 pagos de ejemplo)
-- ------------------------------------------------------------------
with loter as (select id from public.empresas where slug = 'loter'),
pago1 as (
  insert into public.pagos_nomina (empresa_id, categoria, desde, hasta, registrado_en, tasa_bs, total_usd, total_desc_usd)
  select id, 'Quincenal', '2026-05-16', '2026-05-31', '2026-06-01', 36.50, 900.00, 0.00 from loter
  returning id
),
pago2 as (
  insert into public.pagos_nomina (empresa_id, categoria, desde, hasta, registrado_en, tasa_bs, total_usd, total_desc_usd)
  select id, 'Semanal', '2026-06-01', '2026-06-07', '2026-06-08', 36.50, 80.34, 15.34 from loter
  returning id
)
insert into public.pago_detalle (pago_id, empleado_id, nombre, faltas, dias, diario_usd, descuento_usd, neto_usd)
select d.pago_id, emp.id, d.nombre, d.faltas, d.dias, d.diario, d.descuento, d.neto
from (
  select (select id from pago1) as pago_id, * from (values
    ('Carlos González', 0, 15, 20.67, 0.00, 310.00),
    ('María Rodríguez', 0, 15, 16.00, 0.00, 240.00),
    ('Ana Salazar',     0, 15, 23.33, 0.00, 350.00)
  ) as v (nombre, faltas, dias, diario, descuento, neto)
  union all
  select (select id from pago2) as pago_id, * from (values
    ('José Pérez',    1, 7, 4.67, 4.67,  28.00),
    ('Luis Martínez', 0, 7, 3.67, 0.00,  25.67),
    ('Pedro Ramírez', 2, 7, 5.33, 10.67, 26.67)
  ) as v (nombre, faltas, dias, diario, descuento, neto)
) d
left join public.empleados emp on emp.nombre = d.nombre;

-- ------------------------------------------------------------------
-- Movimientos financieros (historial de finanzas.php)
-- ------------------------------------------------------------------
insert into public.movimientos (tipo, origen, destino, empresa_id, moneda, monto, descripcion, registrado_por, fecha)
select x.tipo::public.tipo_movimiento, x.origen, x.destino,
       (select id from public.empresas where slug = x.slug),
       x.moneda, x.monto, x.descripcion, x.usuario, x.fecha::date
from (values
    ('Entrada',       'IESV (cliente)', 'LOTER, C.A.', 'loter',  'USD', 12500,  'Pago servicios Pozo SBC-37', 'Ana Salazar',    '2026-06-17'),
    ('Transferencia', 'LOTER, C.A.',    'ETM SUPPLY',  'etm',    'USD', 8000,   'Capital de trabajo',         'Administradora', '2026-06-15'),
    ('Retiro',        'LOTER, C.A.',    'Nómina',      'loter',  'USD', 6300,   'Pago quincenal personal',    'Ana Salazar',    '2026-06-13'),
    ('Transferencia', 'MONACO, C.A.',   'AGROSTAR',    'agrostar','Bs', 450000, 'Aporte operativo',           'Administradora', '2026-06-12'),
    ('Entrada',       'GO Wireline',    'LOTER, C.A.', 'loter',  'USD', 2100,   'Prueba hidrostática',        'Ana Salazar',    '2026-06-11')
) as x (tipo, origen, destino, slug, moneda, monto, descripcion, usuario, fecha);

-- ------------------------------------------------------------------
-- Facturas (de facturas.php)
-- ------------------------------------------------------------------
insert into public.facturas (empresa_id, numero, tercero, tipo, moneda, monto, estado, fecha)
select e.id, x.numero, x.tercero, x.tipo, x.moneda, x.monto, x.estado, x.fecha::date
from public.empresas e,
     (values
        ('00012458', 'IESV',                        'Emitida',  'USD', 12500.00, 'Cobrada',   '2026-06-17'),
        ('00012457', 'GO Wireline Services, C.A.',  'Emitida',  'USD', 2100.00,  'Pendiente', '2026-06-11'),
        ('A-7782',   'Repuestos Monagas',           'Recibida', 'Bs',  3480.00,  'Pagada',    '2026-06-09'),
        ('00012456', 'IESV',                        'Emitida',  'USD', 9750.00,  'Cobrada',   '2026-06-04'),
        ('B-1109',   'Suministros Eléctricos CA',   'Recibida', 'Bs',  1220.00,  'Pendiente', '2026-06-02'),
        ('00012455', 'GO Wireline Services, C.A.',  'Emitida',  'USD', 4300.00,  'Cobrada',   '2026-06-01')
     ) as x (numero, tercero, tipo, moneda, monto, estado, fecha)
where e.slug = 'loter';

-- ------------------------------------------------------------------
-- Mantenimientos (de mantenimiento.php)
-- ------------------------------------------------------------------
insert into public.mantenimientos (equipo_id, tipo, programado, realizado, estado, tecnico, observaciones)
select eq.id, x.tipo::public.tipo_mantenimiento, x.prog::date, x.realizado,
       x.estado::public.estado_mantenimiento, x.tecnico, x.obs
from (values
    ('Generador',          'Correctivo', '2026-06-07', null::date,          'En taller',  'Equipo LOTER', 'Correa del motor y aspa dañadas (Luminaria #1).'),
    ('Tanque (Frac-Tank)', 'Preventivo', '2026-06-25', null::date,          'Pendiente',  'Por asignar',  'Prueba hidrostática programada.'),
    ('Vacuum',             'Preventivo', '2026-08-02', null::date,          'Programado', 'Por asignar',  'Revisión de bomba de vacío.'),
    ('Luminaria #1',       'Correctivo', '2026-06-08', '2026-06-08'::date,  'Completado', 'Equipo LOTER', 'Reemplazo de aspa, reparación in situ.'),
    ('Chuto',              'Preventivo', '2026-07-20', null::date,          'Programado', 'Por asignar',  'Cambio de aceite y revisión general.')
) as x (equipo, tipo, prog, realizado, estado, tecnico, obs)
join public.equipos eq on eq.codigo = x.equipo;

-- ------------------------------------------------------------------
-- Asignaciones (orden ASG-2026-001) + equipos asignados
-- ------------------------------------------------------------------
insert into public.asignaciones (codigo, requerimiento, empresa_id, cliente, desde, hasta, estado, observaciones)
select x.codigo, 'ASG-2026-001', e.id, x.cliente, x.desde::date, x.hasta::date,
       x.estado::public.estado_asignacion, x.obs
from public.empresas e,
     (values
        ('S-001', 'IESV / Pozo Muc-102',         '2026-06-03', '2026-06-12', 'Finalizado', 'Equipos en locación'),
        ('S-002', 'IESV / Pozo Muc-102',         '2026-06-04', '2026-06-12', 'Finalizado', 'Equipo en locación'),
        ('S-003', 'GO Wireline Services, C.A.',  '2026-06-10', '2026-06-11', 'Finalizado', 'Prueba hidrostática con el equipo'),
        ('S-004', 'GO Wireline Services, C.A.',  '2026-06-12', '2026-06-12', 'Finalizado', 'Equipo en base de operaciones LOTER'),
        ('S-005', 'IESV / Pozo SBC-37',          '2026-06-13', '2026-06-17', 'Activo',     'Equipo en locación'),
        ('S-006', 'IESV / Pozo SBC-37',          '2026-06-14', '2026-06-17', 'Activo',     'Equipo en locación'),
        ('S-007', 'IESV / Pozo SBC-37',          '2026-06-15', '2026-06-17', 'Activo',     'Equipo en locación')
     ) as x (codigo, cliente, desde, hasta, estado, obs)
where e.slug = 'loter'
on conflict (codigo) do nothing;

insert into public.asignacion_equipos (asignacion_id, equipo_id)
select a.id, eq.id
from (values
    ('S-001', 'Luminaria #1'), ('S-001', 'Luminaria #2'), ('S-001', 'Generador'),
    ('S-002', 'Luminaria #3'),
    ('S-003', 'Vacuum'),
    ('S-004', 'Chuto'),
    ('S-005', 'Luminaria #1'),
    ('S-006', 'Luminaria #2'), ('S-006', 'Generador'),
    ('S-007', 'Luminaria #3')
) as x (codigo, equipo)
join public.asignaciones a on a.codigo = x.codigo
join public.equipos eq on eq.codigo = x.equipo
on conflict do nothing;
