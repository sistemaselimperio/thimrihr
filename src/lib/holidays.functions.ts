import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { offlineHolidays, type Holiday } from "./holidays";

interface NagerHoliday {
  date: string;
  localName?: string;
  name?: string;
}

async function fetchYear(year: number): Promise<Holiday[]> {
  const res = await fetch(`https://date.nager.at/api/v3/publicholidays/${year}/CO`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const rows = (await res.json()) as NagerHoliday[];
  return rows
    .filter((r) => typeof r.date === "string")
    .map((r) => ({
      date: r.date,
      name: r.localName ?? r.name ?? "Festivo",
      year,
      source: "api",
    }));
}

/** Descarga los festivos de Colombia de los años pedidos y los guarda. */
export const syncHolidays = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { years: number[] }) => ({
    years: (input?.years ?? []).map(Number).filter((y) => y > 2000 && y < 2100),
  }))
  .handler(async ({ data, context }) => {
    let online = true;
    const rows: Holiday[] = [];

    for (const year of data.years) {
      try {
        rows.push(...(await fetchYear(year)));
      } catch {
        online = false;
        rows.push(...offlineHolidays(year));
      }
    }

    if (rows.length) {
      const { error } = await context.supabase
        .from("holidays")
        .upsert(rows, { onConflict: "date", ignoreDuplicates: false });
      if (error) return { online: false, saved: 0, error: error.message };
    }

    return { online, saved: rows.length, error: null as string | null };
  });
