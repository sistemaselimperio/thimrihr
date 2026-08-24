/**
 * Lógica de negocio de RRHH El Imperio: quincenas, vacaciones y alertas.
 * Todo el cálculo es determinístico y se deriva de las novedades registradas.
 */

export type EmployeeStatus = "activo" | "retirado";
export type IncapacityType = "general" | "laboral";
export type LeaveType = "sin_pago" | "vacaciones";
export type TerminationType = "vencimiento" | "renuncia" | "justa_causa";

export interface Company {
  id: string;
  name: string;
  logo_path?: string | null;
  logo_name?: string | null;
}

export interface Employee {
  id: string;
  full_name: string;
  cedula: string;
  company_id: string | null;
  position: string;
  hire_date: string;
  contract_end_date: string | null;
  exit_date: string | null;
  phone: string | null;
  work_location: string | null;
  work_schedule: string | null;
  status: string;
  notes: string | null;
}

export interface Incapacity {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  certificate_path: string | null;
  notes: string | null;
}

export interface Leave {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  notes: string | null;
}

export interface Termination {
  id: string;
  employee_id: string;
  type: string;
  exit_date: string;
  reason: string | null;
  settlement_paid: boolean;
  notes: string | null;
}

export interface VacationEntitlement {
  id: string;
  employee_id: string;
  year: number;
  entitled_days: number;
}

export interface PayrollPeriodOverride {
  id: string;
  employee_id: string;
  period_key: string;
  base_days: number;
  notes: string | null;
}

export const MONTHS_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export const MONTHS_LONG = [
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

export const INCAPACITY_LABELS: Record<string, string> = {
  general: "Incapacidad general",
  laboral: "Accidente laboral",
};

export const LEAVE_LABELS: Record<string, string> = {
  sin_pago: "Permiso sin pago",
  vacaciones: "Permiso con descuento de vacaciones",
};

export const TERMINATION_LABELS: Record<string, string> = {
  vencimiento: "Vencimiento de término",
  renuncia: "Renuncia",
  justa_causa: "Justa causa",
};

export const MAX_VACATION_LEAVE_DAYS = 7;
export const VACATION_MIN_RESERVE = 7;
export const CONTRACT_ALERT_DAYS = 40;
export const EXIT_ALERT_DAYS = 30;

/* ------------------------------------------------------------------ fechas */

export function monthShort(index: number): string {
  return MONTHS_SHORT[index] ?? "";
}

export function monthLong(index: number): string {
  return MONTHS_LONG[index] ?? "";
}

/** Convierte "2026-08-15" en Date local (sin corrimiento de zona horaria). */
export function parseDate(iso: string): Date {
  const parts = iso.split("-").map(Number);
  return new Date(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1);
}

export function toISO(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

/** "15/ago/2026" */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseDate(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${monthShort(d.getMonth()).toLowerCase()}/${d.getFullYear()}`;
}

/** "15/ago" */
export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseDate(iso);
  return `${d.getDate()}/${monthShort(d.getMonth()).toLowerCase()}`;
}

export function daysUntil(iso: string, from = todayISO()): number {
  const ms = parseDate(iso).getTime() - parseDate(from).getTime();
  return Math.round(ms / 86400000);
}

export function daysInclusive(startISO: string, endISO: string): number {
  return Math.max(0, daysUntil(endISO, startISO) + 1);
}

export function addDays(iso: string, n: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/* --------------------------------------------------------------- quincenas */

/** Clave estable de quincena: "2026-08-Q1" (días 1-15) / "2026-08-Q2" (16-fin). */
export function periodKeyOf(iso: string): string {
  const d = parseDate(iso);
  const half = d.getDate() <= 15 ? "Q1" : "Q2";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${half}`;
}

function splitKey(key: string): { y: string; m: string; half: string } {
  const parts = key.split("-");
  return { y: parts[0] ?? "1970", m: parts[1] ?? "01", half: parts[2] ?? "Q1" };
}

export function periodBounds(key: string): { start: string; end: string } {
  const { y, m, half } = splitKey(key);
  if (half === "Q1") {
    return { start: `${y}-${m}-01`, end: `${y}-${m}-15` };
  }
  const last = new Date(Number(y), Number(m), 0).getDate();
  return { start: `${y}-${m}-16`, end: `${y}-${m}-${last}` };
}

export function periodLabel(key: string): string {
  const { y, m, half } = splitKey(key);
  return `${half} ${monthShort(Number(m) - 1)} ${y}`;
}

export function periodLabelLong(key: string): string {
  const { y, m, half } = splitKey(key);
  const n = half === "Q1" ? "1" : "2";
  return `Quincena ${n} — ${monthLong(Number(m) - 1)} ${y}`;
}

export function periodYear(key: string): number {
  return Number(splitKey(key).y);
}

export function periodKeysOfYear(year: number): string[] {
  const keys: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, "0");
    keys.push(`${year}-${mm}-Q1`, `${year}-${mm}-Q2`);
  }
  return keys;
}

export function currentPeriodKey(): string {
  return periodKeyOf(todayISO());
}

/** Días de solape entre [aStart,aEnd] y [bStart,bEnd], inclusive. */
export function overlapDays(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): number {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (start > end) return 0;
  return daysInclusive(start, end);
}

export interface QuincenaRow {
  periodKey: string;
  label: string;
  start: string;
  end: string;
  baseDays: number;
  baseDaysOverridden: boolean;
  leaveDays: number;
  incapacityDays: number;
  vacationDays: number;
  workedDays: number;
  notes: string | null;
}

/** Días base por defecto de una quincena para un empleado (recorta ingreso/salida). */
export function defaultBaseDays(
  employee: Pick<Employee, "hire_date" | "exit_date">,
  periodKey: string,
): number {
  const { start, end } = periodBounds(periodKey);
  const nominal = start.endsWith("-01") ? 15 : 15;
  const effStart = employee.hire_date > start ? employee.hire_date : start;
  const effEnd = employee.exit_date && employee.exit_date < end ? employee.exit_date : end;
  if (effStart > effEnd) return 0;
  const real = daysInclusive(effStart, effEnd);
  const full = daysInclusive(start, end);
  // Se normaliza a 15 días base (convención de nómina colombiana).
  return Math.min(nominal, Math.round((real / full) * nominal * 10) / 10);
}

export function buildQuincenas(
  employee: Employee,
  incapacities: Incapacity[],
  leaves: Leave[],
  overrides: PayrollPeriodOverride[],
  year: number,
): QuincenaRow[] {
  const today = todayISO();
  const overrideMap = new Map(overrides.map((o) => [o.period_key, o]));

  return periodKeysOfYear(year)
    .filter((key) => {
      const { start, end } = periodBounds(key);
      if (end < employee.hire_date) return false;
      if (employee.exit_date && start > employee.exit_date) return false;
      if (start > today) return false;
      return true;
    })
    .map((key) => {
      const { start, end } = periodBounds(key);
      const ov = overrideMap.get(key);

      let incapacityDays = 0;
      for (const inc of incapacities) {
        incapacityDays += overlapDays(inc.start_date, inc.end_date, start, end);
      }

      let leaveDays = 0;
      let vacationDays = 0;
      for (const lv of leaves) {
        const d = overlapDays(lv.start_date, lv.end_date, start, end);
        if (d === 0) continue;
        // Si el permiso cabe completo en la quincena se respeta el valor
        // declarado (permite medios días); si se parte, se usa el solape.
        const spanned = daysInclusive(lv.start_date, lv.end_date);
        const value = d === spanned ? Number(lv.days) : d;
        if (lv.type === "vacaciones") vacationDays += value;
        else leaveDays += value;
      }

      const baseDays = ov ? Number(ov.base_days) : defaultBaseDays(employee, key);
      const workedDays = Math.max(
        0,
        Math.round((baseDays - leaveDays - incapacityDays - vacationDays) * 10) / 10,
      );

      return {
        periodKey: key,
        label: periodLabel(key),
        start,
        end,
        baseDays,
        baseDaysOverridden: Boolean(ov),
        leaveDays,
        incapacityDays,
        vacationDays,
        workedDays,
        notes: ov?.notes ?? null,
      };
    });
}

/* -------------------------------------------------------------- vacaciones */

export interface VacationYearRow {
  year: number;
  entitled: number;
  used: number;
  /** Saldo acumulado al cerrar ese año. */
  balance: number;
}

export interface VacationSummary {
  rows: VacationYearRow[];
  totalEntitled: number;
  totalUsed: number;
  available: number;
}

export function buildVacationSummary(
  employee: Employee,
  entitlements: VacationEntitlement[],
  leaves: Leave[],
): VacationSummary {
  const hireYear = parseDate(employee.hire_date).getFullYear();
  const lastYear = employee.exit_date
    ? parseDate(employee.exit_date).getFullYear()
    : new Date().getFullYear();

  const years = new Set<number>();
  for (let y = hireYear; y <= lastYear; y++) years.add(y);
  entitlements.forEach((e) => years.add(e.year));
  leaves
    .filter((l) => l.type === "vacaciones")
    .forEach((l) => years.add(parseDate(l.start_date).getFullYear()));

  const sorted = [...years].sort((a, b) => a - b);
  let running = 0;
  const rows: VacationYearRow[] = sorted.map((year) => {
    const ent = entitlements.find((e) => e.year === year);
    const entitled = ent ? Number(ent.entitled_days) : 15;
    const used = leaves
      .filter(
        (l) => l.type === "vacaciones" && parseDate(l.start_date).getFullYear() === year,
      )
      .reduce((sum, l) => sum + Number(l.days), 0);
    running += entitled - used;
    return { year, entitled, used, balance: Math.round(running * 10) / 10 };
  });

  const totalEntitled = rows.reduce((s, r) => s + r.entitled, 0);
  const totalUsed = rows.reduce((s, r) => s + r.used, 0);
  return {
    rows,
    totalEntitled,
    totalUsed,
    available: Math.round((totalEntitled - totalUsed) * 10) / 10,
  };
}

/** Validación legal del permiso con descuento de vacaciones. */
export function validateVacationLeave(
  requestedDays: number,
  available: number,
): { blocked: boolean; message: string | null; level: "error" | "warning" | null } {
  if (requestedDays <= 0) {
    return { blocked: true, message: "La duración debe ser mayor a 0 días.", level: "error" };
  }
  if (requestedDays > available) {
    return {
      blocked: true,
      message: `Bloqueado: solo hay ${available} días disponibles y se intentan descontar ${requestedDays}.`,
      level: "error",
    };
  }
  if (requestedDays > MAX_VACATION_LEAVE_DAYS) {
    return {
      blocked: true,
      message: `Bloqueado: el máximo legal de permiso con descuento de vacaciones es ${MAX_VACATION_LEAVE_DAYS} días.`,
      level: "error",
    };
  }
  if (available - requestedDays < VACATION_MIN_RESERVE) {
    return {
      blocked: false,
      message: `Atención: quedarían ${Math.round((available - requestedDays) * 10) / 10} días, menos de los ${VACATION_MIN_RESERVE} días que deben reservarse. El empleado debería solicitar pago.`,
      level: "warning",
    };
  }
  return { blocked: false, message: null, level: null };
}

/* ------------------------------------------------------------------ estado */

export function isIncapacityActive(inc: Incapacity, today = todayISO()): boolean {
  return inc.start_date <= today && inc.end_date >= today;
}

export function incapacityStatus(inc: Incapacity, today = todayISO()): string {
  if (inc.start_date > today) return "Programada";
  return inc.end_date >= today ? "Activa" : "Finalizada";
}

export function isActive(e: Employee): boolean {
  return e.status === "activo";
}
