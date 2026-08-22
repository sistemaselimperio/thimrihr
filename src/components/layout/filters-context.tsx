import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { emptyFilters, type HrFilters } from "@/lib/filters";

interface FiltersContextValue {
  filters: HrFilters;
  setFilters: (next: HrFilters) => void;
  patch: (next: Partial<HrFilters>) => void;
  reset: () => void;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<HrFilters>(emptyFilters);

  const value = useMemo<FiltersContextValue>(
    () => ({
      filters,
      setFilters,
      patch: (next) => setFilters((prev) => ({ ...prev, ...next })),
      reset: () => setFilters(emptyFilters),
    }),
    [filters],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters debe usarse dentro de FiltersProvider");
  return ctx;
}
