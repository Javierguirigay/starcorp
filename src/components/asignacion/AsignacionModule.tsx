"use client";

/**
 * Módulo Asignación de equipos en pestañas (mismo patrón que Inventario):
 * KPIs arriba y dos vistas — armar una nueva orden de asignación o consultar
 * el historial. Todo el estado vive en InventarioProvider, así que el contador
 * de "Disponibles" y el historial reaccionan al instante al guardar o finalizar.
 */
import { useState } from "react";
import { CalendarClock, CheckCircle2, PackageCheck, Truck } from "lucide-react";
import { equiposDisponibles, resumenAsignaciones } from "@/lib/negocio/inventario";
import { useInventario } from "@/components/inventario/InventarioProvider";
import { KpiCard } from "@/components/ui/KpiCard";
import { OrdenAsignacion } from "./OrdenAsignacion";
import { HistorialAsignaciones } from "./HistorialAsignaciones";

type TabAsignacion = "nueva" | "historial";

const TABS: [TabAsignacion, string][] = [
  ["nueva", "Nueva asignación"],
  ["historial", "Historial"],
];

const tabCls = (activo: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-600 ${
    activo ? "bg-navy-900 text-white" : "text-slate-500 hover:text-navy-900"
  }`;

export function AsignacionModule() {
  const inv = useInventario();
  const [tab, setTab] = useState<TabAsignacion>("nueva");

  const { activas, enCurso, finalizadas } = resumenAsignaciones(inv.asignaciones);
  const disponibles = equiposDisponibles(inv.equipos, inv.mantenimientos, inv.asignaciones).length;

  return (
    <>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Asignaciones activas"
          valor={String(activas)}
          sub="Equipos actualmente en locación"
          icon={Truck}
        />
        <KpiCard
          label="En curso"
          valor={String(enCurso)}
          sub="Activas sin fecha «hasta» definida"
          icon={CalendarClock}
          tone="gold"
        />
        <KpiCard
          label="Finalizadas"
          valor={String(finalizadas)}
          sub="Equipos devueltos al inventario"
          icon={CheckCircle2}
        />
        <KpiCard
          label="Equipos disponibles"
          valor={String(disponibles)}
          sub="Listos para asignar ahora"
          icon={PackageCheck}
        />
      </div>

      <div className="mb-5 inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={tabCls(tab === key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "nueva" ? <OrdenAsignacion /> : <HistorialAsignaciones />}
    </>
  );
}
