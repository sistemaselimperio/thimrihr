/**
 * Festivos colombianos y cálculo de días laborales.
 *
 * Los festivos se cargan automáticamente desde una API pública y se guardan en
 * la base de datos. Aquí vive el registro en memoria (para que los cálculos sean
 * sincrónicos) y los helpers de días laborales: se excluyen domingos y festivos.
 *
 * Nota: las utilidades de fecha se duplican a propósito (mínimas) para evitar un
 * ciclo de importación con hr.ts.
 */

export interface Holiday {
  date: string;
  name: string;
  year: number;
  source: string;
}

function parse(iso: string): Date {
  const p = iso.split("-").map(Number);
  return new Date(p[0] ?? 1970, (p[1] ?? 1) - 1, p[2] ?? 1);
}

function iso(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Festivos de respaldo (fijos por ley) si la API nunca respondió. */
export function offlineHolidays(year: number): Holiday[] {
  const fixed: [string, string][] = [
    ["01-01", "Año Nuevo"],
    ["05-01", "Día del Trabajo"],
    ["07-20", "Grito de Independencia"],
    ["08-07", "Batalla de Boyacá"],
    ["12-08", "Inmaculada Concepción"],
    ["12-25", "Navidad"],
  ];
  return fixed.map(([md, name]) => ({
    date: `${year}-${md}`,
    name,
    year,
    source: "offline",
  }));
}

/* ------------------------------------------------------- registro en memoria */

let registry = new Set<string>();

export function setHolidayRegistry(dates: Iterable<string>) {
  registry = new Set(dates);
}

export function holidayCount(): number {
  return registry.size;
}

export function isHoliday(day: string): boolean {
  return registry.has(day);
}

/** Domingo: día no laboral en Colombia. */
export function isSunday(day: string): boolean {
  return parse(day).getDay() === 0;
}

/** Laboral = lunes a sábado que no sea festivo. */
export function isWorkingDay(day: string): boolean {
  return !isSunday(day) && !isHoliday(day);
}

/** Días laborales entre dos fechas, inclusive (excluye domingos y festivos). */
export function workingDaysInclusive(startISO: string, endISO: string): number {
  if (!startISO || !endISO || startISO > endISO) return 0;
  let count = 0;
  const end = parse(endISO);
  for (const d = parse(startISO); d <= end; d.setDate(d.getDate() + 1)) {
    if (isWorkingDay(iso(d))) count++;
  }
  return count;
}

/** Días laborales de solape entre dos rangos, inclusive. */
export function workingOverlapDays(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): number {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (start > end) return 0;
  return workingDaysInclusive(start, end);
}
