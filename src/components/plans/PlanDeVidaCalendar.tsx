"use client";

import { useMemo, useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import type { Prayer } from "@/lib/types";
import { Button } from "@/components/ui/button";

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const toDateKey = (year: number, monthIndex: number, day: number) => {
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

const collectPlanDeVidaPrayers = (list: Prayer[]): Array<{ id: string; title: string }> => {
  const rows: Array<{ id: string; title: string }> = [];
  for (const prayer of list) {
    if (prayer.categoryId === "plan-de-vida" && prayer.id) {
      rows.push({ id: prayer.id, title: prayer.title });
    }
  }
  return rows;
};

export default function PlanDeVidaCalendar() {
  const { planDeVidaCalendar, allPrayers } = useSettings();
  const [activeMonth, setActiveMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = activeMonth.getFullYear();
  const monthIndex = activeMonth.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const rows = useMemo(() => collectPlanDeVidaPrayers(allPrayers), [allPrayers]);

  const monthCheckedCount = useMemo(() => {
    let count = 0;
    for (const day of days) {
      const key = toDateKey(year, monthIndex, day);
      const values = planDeVidaCalendar[key] || [];
      count += values.length;
    }
    return count;
  }, [days, monthIndex, planDeVidaCalendar, year]);

  const moveMonth = (delta: number) => {
    setActiveMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-lg border border-border bg-card/70 p-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => moveMonth(-1)}>
            Mes anterior
          </Button>
          <div className="text-sm font-semibold text-center">
            {MONTHS_ES[monthIndex]} {year}
          </div>
          <Button variant="outline" size="sm" onClick={() => moveMonth(1)}>
            Mes siguiente
          </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Checks registrados: {monthCheckedCount}
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-border bg-card/70">
        <table className="min-w-max border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-card border-b border-r border-border px-3 py-2 text-left min-w-[180px]">
                Sección / oración
              </th>
              {days.map((day) => (
                <th key={day} className="border-b border-r border-border px-2 py-2 text-center min-w-[34px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="sticky left-0 z-10 bg-card border-b border-r border-border px-3 py-2 font-medium">
                  {row.title}
                </td>
                {days.map((day) => {
                  const key = toDateKey(year, monthIndex, day);
                  const checked = (planDeVidaCalendar[key] || []).includes(row.id);
                  return (
                    <td
                      key={`${row.id}-${day}`}
                      className={`border-b border-r border-border px-2 py-2 text-center ${checked ? "bg-primary/20" : ""}`}
                      title={checked ? "Registrado" : "Sin registro"}
                    >
                      {checked ? "✓" : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
