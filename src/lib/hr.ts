/**
 * Lógica de negocio de RRHH El Imperio: quincenas, vacaciones y alertas.
 * Todo el cálculo es determinístico y se deriva de las novedades registradas.
 */

import { workingDaysInclusive, workingOverlapDays } from "./holidays";

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
  first_name?: string | null;
  last_name?: string | null;
  cedula: string;
  company_id: string | null;
  position: string;
  hire_date: string;
  contract_end_date: string | null;
  contract_type?: string | null;
  exit_date: string | null;
  phone: string | null;
  landline?: string | null;
  email?: string | null;
  folder_number?: string | null;
  municipality?: string | null;
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

export interface License {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  notes: string | null;
}

export interface Vacation {
  id: string;
  employee_id: string;
  year: number;
  start_date: string;
  end_date: string;
  days: number;
  destination: string | null;
  notes: string | null;
}

export function vacationStatus(
  v: Pick<Vacation, "start_date" | "end_date">,
  today = todayISO(),
): "Programada" | "En curso" | "Finalizada" {
  if (v.start_date > today) return "Programada";
  if (v.end_date < today) return "Finalizada";
  return "En curso";
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

export const LICENSE_LABELS: Record<string, string> = {
  maternidad: "Licencia de maternidad",
  paternidad: "Licencia de paternidad",
  luto: "Licencia por luto",
  calamidad: "Calamidad doméstica",
  no_remunerada: "Licencia no remunerada",
};

/** Licencias remuneradas: no descuentan días de la quincena. */
export const PAID_LICENSE_TYPES = ["maternidad", "paternidad", "luto", "calamidad"];

/** Días legales sugeridos por tipo de licencia (Colombia). */
export const LICENSE_DEFAULT_DAYS: Record<string, number | null> = {
  maternidad: 126,
  paternidad: 14,
  luto: null,
  calamidad: null,
  no_remunerada: null,
};

export function licenseStatus(
  license: Pick<License, "start_date" | "end_date">,
  today = todayISO(),
): "Próxima" | "Activa" | "Finalizada" {
  if (license.start_date > today) return "Próxima";
  if (license.end_date < today) return "Finalizada";
  return "Activa";
}

export const TERMINATION_LABELS: Record<string, string> = {
  vencimiento: "Vencimiento de término",
  renuncia: "Renuncia",
  justa_causa: "Justa causa",
};


export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  fijo: "Término fijo",
  indefinido: "Indefinido",
};

/** Un contrato genera alertas de vencimiento solo si es a término fijo con fecha. */
export function isFixedTerm(e: Pick<Employee, "contract_type" | "contract_end_date">): boolean {
  const type = e.contract_type ?? (e.contract_end_date ? "fijo" : "indefinido");
  return type === "fijo" && Boolean(e.contract_end_date);
}

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

/** Días calendario entre dos fechas, inclusive. */
export function calendarDaysInclusive(startISO: string, endISO: string): number {
  return Math.max(0, daysUntil(endISO, startISO) + 1);
}

/**
 * Duración en días LABORALES (excluye domingos y festivos colombianos).
 * Es el cálculo usado para vacaciones, permisos, incapacidades y licencias.
 */
export function daysInclusive(startISO: string, endISO: string): number {
  return workingDaysInclusive(startISO, endISO);
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
  return workingOverlapDays(aStart, aEnd, bStart, bEnd);
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
  /** Días de licencia remunerada en la quincena (no descuentan). */
  paidLicenseDays: number;
  /** Días de licencia no remunerada en la quincena (sí descuentan). */
  unpaidLicenseDays: number;
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
  const real = calendarDaysInclusive(effStart, effEnd);
  const full = calendarDaysInclusive(start, end);
  // Se normaliza a 15 días base (convención de nómina colombiana).
  return Math.min(nominal, Math.round((real / full) * nominal * 10) / 10);
}

export function buildQuincenas(
  employee: Employee,
  incapacities: Incapacity[],
  leaves: Leave[],
  overrides: PayrollPeriodOverride[],
  year: number,
  licenses: License[] = [],
  vacationPeriods: Vacation[] = [],

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
        incapacityDays += workingOverlapDays(inc.start_date, inc.end_date, start, end);
      }

      let leaveDays = 0;
      let vacationDays = 0;
      for (const lv of leaves) {
        const d = workingOverlapDays(lv.start_date, lv.end_date, start, end);
        if (d === 0) continue;
        // Si el permiso cabe completo en la quincena se respeta el valor
        // declarado (permite medios días); si se parte, se usa el solape.
        const spanned = workingDaysInclusive(lv.start_date, lv.end_date);
        const value = d === spanned ? Number(lv.days) : d;
        if (lv.type === "vacaciones") vacationDays += value;
        else leaveDays += value;
      }

      // Períodos de vacaciones: descuentan días de la quincena.
      for (const vac of vacationPeriods) {
        vacationDays += workingOverlapDays(vac.start_date, vac.end_date, start, end);
      }



      // Las licencias remuneradas no descuentan; la no remunerada sí.
      let paidLicenseDays = 0;
      let unpaidLicenseDays = 0;
      for (const lic of licenses) {
        const d = workingOverlapDays(lic.start_date, lic.end_date, start, end);
        if (d === 0) continue;
        if (PAID_LICENSE_TYPES.includes(lic.type)) paidLicenseDays += d;
        else unpaidLicenseDays += d;
      }

      const baseDays = ov ? Number(ov.base_days) : defaultBaseDays(employee, key);
      const workedDays = Math.max(
        0,
        Math.round(
          (baseDays - leaveDays - incapacityDays - vacationDays - unpaidLicenseDays) * 10,
        ) / 10,
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
        paidLicenseDays,
        unpaidLicenseDays,
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
  /** Días usados por permisos con descuento de vacaciones. */
  usedLeaves?: number;
  /** Días usados en períodos de vacaciones registrados. */
  usedPeriods?: number;
  /** Rango real considerado en el año (ingreso / 01-ene → hoy, salida o 31-dic). */
  from?: string | undefined;
  to?: string | undefined;
  /** Días laborales del rango (sin domingos ni festivos). */
  workingDays?: number | undefined;
  /** Disponibles del año: derecho − tomados (puede ser negativo). */
  availableYear?: number | undefined;
  /** Saldo acumulado al cerrar ese año. */
  balance: number;
}

export interface VacationSummary {
  rows: VacationYearRow[];
  totalEntitled: number;
  totalUsed: number;
  available: number;
  /** Días en deuda de años anteriores (valor positivo). */
  owed: number;
}

/**
 * Rango efectivo del año para causar vacaciones: arranca en el ingreso si
 * ingresó ese año y termina hoy (año en curso), en la salida o el 31 de dic.
 */
export function vacationYearRange(
  employee: Pick<Employee, "hire_date" | "exit_date">,
  year: number,
  today = todayISO(),
): { from: string; to: string } | null {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const from = employee.hire_date > yearStart ? employee.hire_date : yearStart;
  let to = yearEnd;
  if (today < to) to = today;
  if (employee.exit_date && employee.exit_date < to) to = employee.exit_date;
  if (!from || from > to) return null;
  return { from, to };
}

/**
 * Derecho causado en un año: (días laborales × 15) ÷ 360.
 * Los días laborales excluyen domingos y festivos colombianos, y se restan los
 * permisos con descuento de vacaciones de ese año (nada más).
 */
export function entitlementForYear(
  employee: Employee,
  leaves: Leave[],
  year: number,
  today = todayISO(),
): { entitled: number; raw: number; workingDays: number; discounts: number; from: string; to: string } | null {
  const range = vacationYearRange(employee, year, today);
  if (!range) return null;
  const gross = workingDaysInclusive(range.from, range.to);
  const discounts =
    Math.round(
      leaves
        .filter(
          (l) => l.type === "vacaciones" && parseDate(l.start_date).getFullYear() === year,
        )
        .reduce((s, l) => s + Number(l.days), 0) * 10,
    ) / 10;
  const workingDays = Math.max(0, Math.round((gross - discounts) * 10) / 10);
  const raw = (workingDays * 15) / 360;
  return {
    entitled: Math.round(raw),
    raw: Math.round(raw * 100) / 100,
    workingDays,
    discounts,
    from: range.from,
    to: range.to,
  };
}

export function buildVacationSummary(
  employee: Employee,
  entitlements: VacationEntitlement[],
  leaves: Leave[],
  vacationPeriods: Vacation[] = [],
  today = todayISO(),
): VacationSummary {
  const hireYear = parseDate(employee.hire_date).getFullYear();
  const lastYear = employee.exit_date
    ? parseDate(employee.exit_date).getFullYear()
    : parseDate(today).getFullYear();

  const years = new Set<number>();
  for (let y = hireYear; y <= lastYear; y++) years.add(y);
  entitlements.forEach((e) => years.add(e.year));
  leaves
    .filter((l) => l.type === "vacaciones")
    .forEach((l) => years.add(parseDate(l.start_date).getFullYear()));
  vacationPeriods.forEach((v) =>
    years.add(Number(v.year) || parseDate(v.start_date).getFullYear()),
  );

  const sorted = [...years].sort((a, b) => a - b);
  let running = 0;
  const rows: VacationYearRow[] = sorted.map((year) => {
    const computed = entitlementForYear(employee, leaves, year, today);
    const ent = entitlements.find((e) => e.year === year);
    const entitled = ent ? Number(ent.entitled_days) : (computed?.entitled ?? 0);
    const usedLeaves = leaves
      .filter(
        (l) => l.type === "vacaciones" && parseDate(l.start_date).getFullYear() === year,
      )
      .reduce((sum, l) => sum + Number(l.days), 0);
    const usedPeriods = vacationPeriods
      .filter((v) => (Number(v.year) || parseDate(v.start_date).getFullYear()) === year)
      .reduce((sum, v) => sum + Number(v.days), 0);
    const used = Math.round((usedLeaves + usedPeriods) * 10) / 10;
    running += entitled - used;
    return {
      year,
      entitled,
      used,
      usedLeaves: Math.round(usedLeaves * 10) / 10,
      usedPeriods: Math.round(usedPeriods * 10) / 10,
      from: computed?.from,
      to: computed?.to,
      workingDays: computed?.workingDays,
      availableYear: Math.round((entitled - used) * 10) / 10,
      balance: Math.round(running * 10) / 10,
    };
  });

  const totalEntitled = rows.reduce((s, r) => s + r.entitled, 0);
  const totalUsed = rows.reduce((s, r) => s + r.used, 0);
  const owed = rows.reduce(
    (s, r) => s + Math.max(0, -(r.availableYear ?? 0)),
    0,
  );
  return {
    rows,
    totalEntitled,
    totalUsed,
    available: Math.round((totalEntitled - totalUsed) * 10) / 10,
    owed: Math.round(owed * 10) / 10,
  };
}

export interface EntitlementRecalc {
  /** Días laborales netos usados en la fórmula. */
  workedDays: number;
  /** Días descontados por permisos con descuento de vacaciones. */
  discounts: number;
  raw: number;
  entitled: number;
  from?: string | undefined;
  to?: string | undefined;
  error?: string | undefined;
}

/**
 * Recalcula el derecho de un año con la fórmula colombiana:
 * (días laborales × 15) ÷ 360, prorrateando el año de ingreso.
 */
export function recalcEntitlement(
  employee: Employee,
  leaves: Leave[],
  year = new Date().getFullYear(),
  today = todayISO(),
): EntitlementRecalc {
  const empty: EntitlementRecalc = { workedDays: 0, discounts: 0, raw: 0, entitled: 0 };

  if (!employee.hire_date)
    return { ...empty, error: "El empleado no tiene fecha de ingreso registrada." };
  if (daysUntil(employee.hire_date, today) > 0)
    return { ...empty, error: "La fecha de ingreso no puede ser futura." };

  const computed = entitlementForYear(employee, leaves, year, today);
  if (!computed)
    return { ...empty, error: `El empleado no tenía contrato vigente en ${year}.` };

  return {
    workedDays: computed.workingDays,
    discounts: computed.discounts,
    raw: computed.raw,
    entitled: computed.entitled,
    from: computed.from,
    to: computed.to,
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
