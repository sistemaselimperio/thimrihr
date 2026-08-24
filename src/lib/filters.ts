import {
  CONTRACT_ALERT_DAYS,
  EXIT_ALERT_DAYS,
  daysUntil,
  todayISO,
  type Employee,
  type Incapacity,
  type Leave,
} from "./hr";

export interface HrFilters {
  search: string;
  companyId: string;
  position: string;
  workLocation: string;
  status: "activo" | "retirado" | "todos";
  hireFrom: string;
  hireTo: string;
  expiry: "none" | "40" | "30";
  novelty: "none" | "incapacidad" | "permiso";
  day: string | null;
}

export const emptyFilters: HrFilters = {
  search: "",
  companyId: "all",
  position: "",
  workLocation: "",
  status: "activo",
  hireFrom: "",
  hireTo: "",
  expiry: "none",
  novelty: "none",
  day: null,
};

export function activeFilterCount(f: HrFilters): number {
  let n = 0;
  if (f.companyId !== "all") n++;
  if (f.position.trim()) n++;
  if (f.status !== "activo") n++;
  if (f.hireFrom || f.hireTo) n++;
  if (f.expiry !== "none") n++;
  if (f.novelty !== "none") n++;
  if (f.day) n++;
  return n;
}

function coversDay(start: string, end: string, day: string) {
  return start <= day && end >= day;
}

/** Aplica todos los filtros combinados con lógica AND. */
export function filterEmployees(
  employees: Employee[],
  f: HrFilters,
  ctx: { incapacities: Incapacity[]; leaves: Leave[] },
): Employee[] {
  const today = todayISO();
  const term = f.search.trim().toLowerCase();

  return employees.filter((e) => {
    if (term) {
      const hit =
        e.full_name.toLowerCase().includes(term) ||
        e.cedula.toLowerCase().includes(term) ||
        (e.work_location ?? "").toLowerCase().includes(term);
      if (!hit) return false;
    }
    if (f.status !== "todos" && e.status !== f.status) return false;
    if (f.companyId !== "all" && e.company_id !== f.companyId) return false;
    if (f.position.trim() && !e.position.toLowerCase().includes(f.position.trim().toLowerCase()))
      return false;
    if (f.hireFrom && e.hire_date < f.hireFrom) return false;
    if (f.hireTo && e.hire_date > f.hireTo) return false;

    if (f.expiry !== "none") {
      const window = Number(f.expiry);
      if (!e.contract_end_date) return false;
      const d = daysUntil(e.contract_end_date, today);
      if (d < 0 || d > window) return false;
    }

    if (f.novelty === "incapacidad") {
      const has = ctx.incapacities.some(
        (i) => i.employee_id === e.id && coversDay(i.start_date, i.end_date, today),
      );
      if (!has) return false;
    }
    if (f.novelty === "permiso") {
      const has = ctx.leaves.some(
        (l) => l.employee_id === e.id && coversDay(l.start_date, l.end_date, today),
      );
      if (!has) return false;
    }

    if (f.day) {
      const day = f.day;
      const hit =
        e.contract_end_date === day ||
        e.hire_date === day ||
        e.exit_date === day ||
        ctx.incapacities.some(
          (i) => i.employee_id === e.id && coversDay(i.start_date, i.end_date, day),
        ) ||
        ctx.leaves.some(
          (l) => l.employee_id === e.id && coversDay(l.start_date, l.end_date, day),
        );
      if (!hit) return false;
    }

    return true;
  });
}

export interface DashboardAlerts {
  expiring: { employee: Employee; days: number }[];
  activeIncapacities: { employee: Employee; incapacity: Incapacity }[];
  upcomingExits: { employee: Employee; days: number }[];
}

export function buildAlerts(
  employees: Employee[],
  incapacities: Incapacity[],
): DashboardAlerts {
  const today = todayISO();
  const byId = new Map(employees.map((e) => [e.id, e]));

  const expiring = employees
    .filter((e) => e.status === "activo" && e.contract_end_date)
    .map((e) => ({ employee: e, days: daysUntil(e.contract_end_date as string, today) }))
    .filter((r) => r.days >= 0 && r.days <= CONTRACT_ALERT_DAYS)
    .sort((a, b) => a.days - b.days);

  const activeIncapacities = incapacities
    .filter((i) => coversDay(i.start_date, i.end_date, today))
    .map((i) => ({ employee: byId.get(i.employee_id), incapacity: i }))
    .filter((r): r is { employee: Employee; incapacity: Incapacity } => Boolean(r.employee))
    .sort((a, b) => a.incapacity.end_date.localeCompare(b.incapacity.end_date));

  const upcomingExits = employees
    .filter((e) => e.exit_date && e.exit_date >= today)
    .map((e) => ({ employee: e, days: daysUntil(e.exit_date as string, today) }))
    .filter((r) => r.days <= EXIT_ALERT_DAYS)
    .sort((a, b) => a.days - b.days);

  return { expiring, activeIncapacities, upcomingExits };
}
