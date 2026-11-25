import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MONTHS_LONG } from "@/lib/hr";
import { cn } from "@/lib/utils";

/** Month selector (value: "YYYY-MM" or null for "all months"). */
export function MonthPicker({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selYear, selMonth] = value ? value.split("-").map(Number) : [null, null];
  const [year, setYear] = useState<number>(selYear ?? new Date().getFullYear());

  const label =
    value && selYear && selMonth ? `${MONTHS_LONG[selMonth - 1]} ${selYear}` : "Todos los meses";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setYear(selYear ?? new Date().getFullYear());
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-48 justify-start gap-2 font-normal", className)}>
          <CalendarDays className="size-4 text-muted-foreground" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setYear((y) => y - 1)}
            aria-label="Año anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold">{year}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setYear((y) => y + 1)}
            aria-label="Año siguiente"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS_LONG.map((m, i) => {
            const selected = selYear === year && selMonth === i + 1;
            return (
              <Button
                key={m}
                variant={selected ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  onChange(`${year}-${String(i + 1).padStart(2, "0")}`);
                  setOpen(false);
                }}
              >
                {m.slice(0, 3)}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
