-- STARCORP GROUP · Migración 1: tipos enumerados
-- Derivados de los valores usados en el boceto PHP.

create type public.rol_usuario as enum ('administradora', 'operaciones');

create type public.estado_equipo as enum ('Disponible', 'Asignado', 'Mantenimiento');

create type public.categoria_equipo as enum ('petrolero', 'oficina', 'herramienta', 'vehiculo');

create type public.categoria_pago as enum ('Semanal', 'Quincenal');

create type public.estatus_empleado as enum ('Activo', 'Permiso', 'Inactivo');

create type public.tipo_movimiento as enum ('Entrada', 'Transferencia', 'Retiro');

create type public.tipo_mantenimiento as enum ('Correctivo', 'Preventivo');

create type public.estado_mantenimiento as enum ('En taller', 'Pendiente', 'Programado', 'Completado');

create type public.estado_asignacion as enum ('Activo', 'Finalizado', 'En base');
