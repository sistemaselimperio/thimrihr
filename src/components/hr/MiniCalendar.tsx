import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { monthLong, toISO, todayISO, type Employee, type Incapacity, type Leave } from "@/lib/hr";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export interface DayMarks {
  incapacidad: boolean;
  permiso: boolean;
  vencimiento: boolean;
  salida: boolean;
}

function buildMarks(
  employees: Employee[],
  incapacities: Incapacity[],
  leaves: Leave[],
  days: string[],
): Map<string, DayMarks> {
  const map = new Map<string, DayMarks>();
  const get = (day: string) => {
    let entry = map.get(day);
    if (!entry) {
      entry = { incapacidad: false, permiso: false, vencimiento: false, salida: false };
      map.set(day, entry);
    }
    return entry;
  };

  for (const day of days) {
    for (const emp of employees) {
      if (emp.contract_end_date === day) get(day).vencimiento = true;
      if (emp.exit_date === day) get(day).salida = true;
    }
    for (const inc of incapacities) {
      if (inc.start_date <= day && inc.end_date >= day) get(day).incapacidad = true;
    }
    for (const lv of leaves) {
      if (lv.start_date <= day && lv.end_date >= day) get(day).permiso = true;
    }
  }
  return map;
}

export function MiniCalendar({
  employees,
  incapacities,
  leaves,
  selected,
  onPickDay,
}: {
  employees: Employee[];
  incapacities: Incapacity[];
  leaves: Leave[];
  selected: string | null;
  onPickDay: (day: string) => void;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const today = todayISO();

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const total = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7; // lunes primero
    const list: (string | null)[] = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= total; d++) list.push(toISO(new Date(cursor.year, cursor.month, d)));
    return list;
  }, [cursor]);

  const marks = useMemo(
    () => buildMarks(employees, incapacities, leaves, cells.filter((c): c is string => !!c)),
    [employees, incapacities, leaves, cells],
  );

  const shift = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="rounded-xl border bg-surface p-4 shadow-panel">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold">
          {monthLong(cursor.month)} {cursor.year}
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Mes anterior" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Mes siguiente" onClick={() => shift(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
        {WEEKDAYS.map((w, i) => (
          <span key={`${w}-${i}`}>{w}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <span key={`empty-${i}`} />;
          const m = marks.get(day);
          const isToday = day === today;
          const isSelected = day === selected;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onPickDay(day)}
              className={[
                "flex h-9 flex-col items-center justify-center rounded-md text-xs transition-colors",
                isSelected
                  ? "bg-brand text-brand-foreground"
                  : isToday
                    ? "bg-accent font-semibold"
                    : "hover:bg-muted",
              ].join(" ")}
            >
              <span className="numeric leading-none">{Number(day.slice(-2))}</span>
              <span className="mt-1 flex gap-0.5">
                {m?.incapacidad && <i className="size-1.5 rounded-full bg-danger" />}
                {m?.permiso && <i className="size-1.5 rounded-full bg-warning" />}
                {m?.vencimiento && <i className="size-1.5 rounded-full bg-brand-light" />}
                {m?.salida && <i className="size-1.5 rounded-full bg-retired-foreground" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <i className="size-1.5 rounded-full bg-danger" /> Incapacidad
        </span>
        <span className="flex items-center gap-1">
          <i className="size-1.5 rounded-full bg-warning" /> Permiso
        </span>
        <span className="flex items-center gap-1">
          <i className="size-1.5 rounded-full bg-brand-light" /> Vence contrato
        </span>
        <span className="flex items-center gap-1">
          <i className="size-1.5 rounded-full bg-retired-foreground" /> Salida
        </span>
      </div>
    </div>
  );
}
