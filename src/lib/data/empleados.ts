import type { AdelantoSueldo, Empleado, PagoHistorial } from "../types";

/* Empleados semilla (de nomina.php). */
export const EMPLEADOS_SEED: Empleado[] = [
  {
    id: 1, nombre: "Carlos González", cargo: "Supervisor de campo", dpto: "Operaciones",
    categoria: "Quincenal", base: 620, ingreso: "2021-03-12", estatus: "Activo",
    banco: { banco: "Banesco", tipo: "Corriente", cuenta: "0134 0123 4567 8901 2345", titular: "Carlos González", cedula: "V-18.452.117", pagomovil: "0414-3556789" },
  },
  {
    id: 2, nombre: "María Rodríguez", cargo: "Asistente administrativo", dpto: "Administración",
    categoria: "Quincenal", base: 480, ingreso: "2022-07-05", estatus: "Activo",
    banco: { banco: "Mercantil", tipo: "Ahorro", cuenta: "0105 1122 3344 5566 7788", titular: "María Rodríguez", cedula: "V-20.118.904", pagomovil: "0412-7781234" },
  },
  {
    id: 3, nombre: "José Pérez", cargo: "Operador de vacuum", dpto: "Operaciones",
    categoria: "Semanal", base: 140, ingreso: "2020-01-18", estatus: "Activo",
    banco: { banco: "Banco de Venezuela", tipo: "Ahorro", cuenta: "0102 9988 7766 5544 3322", titular: "José Pérez", cedula: "V-15.330.276", pagomovil: "0416-4459087" },
  },
  {
    id: 4, nombre: "Luis Martínez", cargo: "Ayudante de patio", dpto: "Operaciones",
    categoria: "Semanal", base: 110, ingreso: "2023-09-22", estatus: "Activo",
    banco: { banco: "BNC", tipo: "Ahorro", cuenta: "0191 2233 4455 6677 8899", titular: "Luis Martínez", cedula: "V-24.905.661", pagomovil: "0426-1120345" },
  },
  {
    id: 5, nombre: "Ana Salazar", cargo: "Contadora", dpto: "Administración",
    categoria: "Quincenal", base: 700, ingreso: "2019-02-01", estatus: "Activo",
    banco: { banco: "Provincial", tipo: "Corriente", cuenta: "0108 5544 3322 1100 9988", titular: "Ana Salazar", cedula: "V-19.774.038", pagomovil: "0414-9982310" },
  },
  {
    id: 6, nombre: "Pedro Ramírez", cargo: "Chofer (Lowboy)", dpto: "Operaciones",
    categoria: "Semanal", base: 160, ingreso: "2022-11-14", estatus: "Permiso",
    banco: { banco: "Banesco", tipo: "Ahorro", cuenta: "0134 6677 8899 0011 2233", titular: "Pedro Ramírez", cedula: "V-22.561.490", pagomovil: "0424-3357788" },
  },
];

export const NEXT_EMP_ID = 7;

export const TASA_INICIAL = 36.5;

/* Historial con dos pagos de ejemplo para que la sección no luzca vacía. */
export const HISTORIAL_SEED: PagoHistorial[] = [
  {
    id: 101, categoria: "Quincenal", desde: "2026-05-16", hasta: "2026-05-31",
    registrado: "2026-06-01", totalUsd: 900.0, totalDesc: 0.0, tasa: TASA_INICIAL,
    detalle: [
      { nombre: "Carlos González", faltas: 0, dias: 15, diario: 20.67, desc: 0.0, neto: 310.0 },
      { nombre: "María Rodríguez", faltas: 0, dias: 15, diario: 16.0, desc: 0.0, neto: 240.0 },
      { nombre: "Ana Salazar", faltas: 0, dias: 15, diario: 23.33, desc: 0.0, neto: 350.0 },
    ],
  },
  {
    id: 102, categoria: "Semanal", desde: "2026-06-01", hasta: "2026-06-07",
    registrado: "2026-06-08", totalUsd: 80.34, totalDesc: 15.34, tasa: TASA_INICIAL,
    detalle: [
      { nombre: "José Pérez", faltas: 1, dias: 7, diario: 4.67, desc: 4.67, neto: 28.0 },
      { nombre: "Luis Martínez", faltas: 0, dias: 7, diario: 3.67, desc: 0.0, neto: 25.67 },
      { nombre: "Pedro Ramírez", faltas: 2, dias: 7, diario: 5.33, desc: 10.67, neto: 26.67 },
    ],
  },
];

export const NEXT_HIST_ID = 103;

/* Adelantos de sueldo de ejemplo (pendientes de descontar). */
export const ADELANTOS_SEED: AdelantoSueldo[] = [
  {
    id: 1, empleadoId: 3, montoUSD: 30, fecha: "2026-06-10", estado: "pendiente",
    montoDescontadoUSD: 0, aplicaciones: [], nota: "Emergencia familiar",
  },
  {
    id: 2, empleadoId: 1, montoUSD: 50, fecha: "2026-06-05", estado: "pendiente",
    montoDescontadoUSD: 0, aplicaciones: [],
  },
];

export const NEXT_ADELANTO_ID = 3;
