"use client";

import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { useSettings } from "@/context/SettingsContext";
import type { Prayer } from "@/lib/types";

const toDateKey = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const findPrayerById = (id: string, list: Prayer[]): Prayer | null => {
  for (const prayer of list) {
    if (prayer.id === id) return prayer;
    if (prayer.prayers) {
      const found = findPrayerById(id, prayer.prayers);
      if (found) return found;
    }
  }
  return null;
};

export default function PlanDeVidaCalendar() {
  const { planDeVidaCalendar, allPrayers } = useSettings();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const markedDates = useMemo(
    () =>
      Object.keys(planDeVidaCalendar || {}).map(
        (key) => new Date(`${key}T00:00:00`)
      ),
    [planDeVidaCalendar]
  );

  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;
  const selectedIds = selectedKey ? planDeVidaCalendar[selectedKey] || [] : [];
  const selectedTitles = useMemo(
    () =>
      selectedIds
        .map((id) => findPrayerById(id, allPrayers)?.title || id)
        .filter(Boolean),
    [selectedIds, allPrayers]
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          modifiers={{ completed: markedDates }}
          modifiersClassNames={{
            completed:
              "bg-primary/20 text-foreground hover:bg-primary/30 aria-selected:bg-primary/30",
          }}
        />
      </div>

      <div className="rounded-lg border border-border bg-card/70 p-4">
        <div className="text-sm font-semibold mb-2">
          {selectedDate
            ? `Oraciones marcadas el ${selectedKey}`
            : "Selecciona un día"}
        </div>
        {selectedTitles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay oraciones marcadas para este día.
          </p>
        ) : (
          <ul className="text-sm space-y-1">
            {selectedTitles.map((title, idx) => (
              <li key={`${title}-${idx}`}>{title}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
