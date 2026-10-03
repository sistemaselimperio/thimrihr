/** Liquidación de prestaciones: cálculo, valores iniciales y texto plano para el historial. */

import {
  MONTHS_LONG,
  calendarDaysInclusive,
  parseDate,
  todayISO,
  type Company,
  type Employee,
} from "./hr";

/** Dependencias de la liquidación y la empresa de la que toman el logo. */
export const DEPENDENCIAS = [
  { key: "ninguna", label: "Sin empresa" },
  { key: "transportes", label: "Transportes", match: /transportes/i },
  { key: "fabian", label: "Fabian Leonardo Páez", match: /fabi[aá]n/i },
  { key: "sandra", label: "Sandra Marcela Páez Porras", match: /sandra/i },
  { key: "comercializadora", label: "Comercializadora El Imperio", match: /comercializadora/i },
  { key: "plantuladora", label: "Plantuladora", match: /plantuladora/i },
  { key: "eds", label: "Estación de servicio" },
] as const satisfies readonly { key: string; label: string; match?: RegExp }[];

export type DependenciaKey = (typeof DEPENDENCIAS)[number]["key"];

/** Empresa asociada a la dependencia (solo las que tienen empresa propia). */
export function dependenciaCompany<C extends { name: string }>(
  key: DependenciaKey,
  companies: readonly C[],
): C | undefined {
  const dep = DEPENDENCIAS.find((d) => d.key === key);
  const match = dep && "match" in dep ? dep.match : undefined;
  return match ? companies.find((c) => match.test(c.name)) : undefined;
}

/** Nombre que sale en el documento: razón social de la empresa, o la etiqueta. */
export function dependenciaNombre(key: DependenciaKey, companies: readonly Company[]): string {
  if (key === "ninguna") return "";
  return (
    dependenciaCompany(key, companies)?.name ?? DEPENDENCIAS.find((d) => d.key === key)?.label ?? ""
  );
}

/** Ruta del logo según la dependencia: islero para EDS, ninguno para "Sin empresa". */
export function dependenciaLogoPath(
  key: DependenciaKey,
  companies: readonly Company[],
  isleroLogoPath: string | null | undefined,
): string | null {
  if (key === "ninguna") return null;
  if (key === "eds") return isleroLogoPath ?? null;
  return dependenciaCompany(key, companies)?.logo_path ?? null;
}

export interface LiquidacionInput {
  ciudad: string;
  /** Fecha del documento (ISO). */
  fecha: string;
  nombre: string;
  cedula: string;
  cargo: string;
  /** Dependencia elegida en la lista (define el logo). */
  dependenciaKey: DependenciaKey;
  /** Nombre de la dependencia tal como sale en el documento. */
  dependencia: string;
  /** ISO */
  fechaIngreso: string;
  /** ISO */
  fechaHasta: string;
  diasServicio: number;
  salario: number;
  auxilio: number;
  diasCesantias: number;
  diasIntereses: number;
  diasPrima: number;
  diasVacaciones: number;
  /** Divisores por concepto (360 / 360 / 360 / 720 por defecto). */
  divCesantias: number;
  divIntereses: number;
  divPrima: number;
  divVacaciones: number;
  /** Tasa de intereses de cesantías (0.12 = 12 %). */
  tasaIntereses: number;
  /** Valor de cesantías para los intereses; null = usa el calculado. */
  valorCesantias: number | null;
}

export interface LiquidacionCalc {
  base: number;
  cesantias: number;
  /** Valor de cesantías usado para los intereses. */
  valorCesantias: number;
  intereses: number;
  prima: number;
  vacaciones: number;
  total: number;
}

/** a × b / d, redondeado al peso; 0 si el divisor no es válido. */
function prorata(value: number, dias: number, div: number): number {
  return div > 0 ? Math.round((value * dias) / div) : 0;
}

export function calcLiquidacion(i: LiquidacionInput): LiquidacionCalc {
  const base = i.salario + i.auxilio;
  const cesantias = prorata(base, i.diasCesantias, i.divCesantias);
  const valorCesantias = i.valorCesantias ?? cesantias;
  const intereses = prorata(valorCesantias * i.tasaIntereses, i.diasIntereses, i.divIntereses);
  const prima = prorata(base, i.diasPrima, i.divPrima);
  const vacaciones = prorata(i.salario, i.diasVacaciones, i.divVacaciones);
  return {
    base,
    cesantias,
    valorCesantias,
    intereses,
    prima,
    vacaciones,
    total: cesantias + intereses + prima + vacaciones,
  };
}

/** 0.12 → "0,12" */
export function fmtTasa(n: number): string {
  return String(n).replace(".", ",");
}

const copFmt = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function fmtCOP(n: number): string {
  return copFmt.format(Number.isFinite(n) ? n : 0);
}

export function isLiquidacion(t: { category?: string | null; name?: string | null }): boolean {
  return t.category === "liquidacion" || /liquidaci[oó]n/i.test(t.name ?? "");
}

export function liquidacionDefaults(
  employee: Employee,
  company: Company | undefined | null,
  companies: readonly Company[] = [],
): LiquidacionInput {
  const hoy = todayISO();
  const fechaHasta = employee.exit_date || hoy;
  const fechaIngreso = employee.hire_date || "";
  const diasServicio = fechaIngreso ? calendarDaysInclusive(fechaIngreso, fechaHasta) : 0;
  const isIslero = `${employee.position ?? ""} ${employee.work_location ?? ""}`
    .toLowerCase()
    .includes("isler");
  const dependenciaKey: DependenciaKey = isIslero
    ? "eds"
    : (DEPENDENCIAS.find((d) => "match" in d && company && d.match.test(company.name))?.key ??
      "ninguna");
  return {
    ciudad: employee.municipality || "Chiquinquirá",
    fecha: hoy,
    nombre: employee.full_name,
    cedula: employee.cedula,
    cargo: employee.position,
    dependenciaKey,
    dependencia: company?.name ?? dependenciaNombre(dependenciaKey, companies),
    fechaIngreso,
    fechaHasta,
    diasServicio,
    salario: 0,
    auxilio: 0,
    diasCesantias: diasServicio,
    diasIntereses: diasServicio,
    diasPrima: diasServicio,
    diasVacaciones: diasServicio,
    divCesantias: 360,
    divIntereses: 360,
    divPrima: 360,
    divVacaciones: 720,
    tasaIntereses: 0.12,
    valorCesantias: null,
  };
}

/** "SEPTIEMBRE 07 2026" */
export function fmtFechaLarga(iso: string): string {
  if (!iso) return "";
  const d = parseDate(iso);
  return `${MONTHS_LONG[d.getMonth()]?.toUpperCase() ?? ""} ${String(d.getDate()).padStart(2, "0")} ${d.getFullYear()}`;
}

/** "CHIQUINQUIRÁ, SEPTIEMBRE 10 DE 2026" */
export function fmtCiudadFecha(ciudad: string, iso: string): string {
  if (!iso) return ciudad.toUpperCase();
  const d = parseDate(iso);
  const mes = MONTHS_LONG[d.getMonth()]?.toUpperCase() ?? "";
  return `${ciudad.toUpperCase()}, ${mes} ${String(d.getDate()).padStart(2, "0")} DE ${d.getFullYear()}`;
}

/** "EN CONSTANCIA FIRMO EN {CIUDAD} A LOS {DD} DÍAS DEL MES DE {MES} DE {AÑO}" */
export function constanciaLine(i: LiquidacionInput): string {
  const d = parseDate(i.fechaHasta || todayISO());
  const mes = MONTHS_LONG[d.getMonth()]?.toUpperCase() ?? "";
  return `EN CONSTANCIA FIRMO EN ${i.ciudad.toUpperCase()} A LOS ${String(d.getDate()).padStart(2, "0")} DÍAS DEL MES DE ${mes} DE ${d.getFullYear()}`;
}

export function pazYSalvoLine(i: LiquidacionInput): string {
  return `QUE ${i.dependencia.toUpperCase()} HA QUEDADO TOTALMENTE A PAZ Y SALVO, CONMIGO POR TODO CONCEPTO RECIBIENDO MI LIQUIDACIÓN A ENTERA SATISFACCIÓN`;
}

export function liquidacionText(i: LiquidacionInput, c: LiquidacionCalc): string {
  return [
    "LIQUIDACIÓN",
    "",
    `CIUDAD Y FECHA: ${fmtCiudadFecha(i.ciudad, i.fecha)}`,
    `DEPENDENCIA: ${i.dependencia.toUpperCase()}`,
    `NOMBRE DEL TRABAJADOR: ${i.nombre.toUpperCase()}`,
    `CÉDULA: ${i.cedula} DE ${i.ciudad.toUpperCase()}`,
    `CARGO: ${i.cargo.toUpperCase()}`,
    `FECHA DE INGRESO: ${fmtFechaLarga(i.fechaIngreso)}`,
    `HASTA: ${fmtFechaLarga(i.fechaHasta)}`,
    `NÚMERO DÍAS SERVICIO: ${i.diasServicio}`,
    `SALARIO BÁSICO MENSUAL: ${fmtCOP(i.salario)}`,
    `AUXILIO DE TRANSPORTE: ${fmtCOP(i.auxilio)}`,
    "",
    `1 CESANTÍAS: ${i.diasCesantias}/${i.divCesantias} x ${fmtCOP(c.base)} = ${fmtCOP(c.cesantias)}`,
    `2 INTERESES CESANTÍAS: ${fmtCOP(c.valorCesantias)} x ${i.diasIntereses}/${i.divIntereses} x ${fmtTasa(i.tasaIntereses)} = ${fmtCOP(c.intereses)}`,
    `3 PRIMA DE SERVICIOS: ${i.diasPrima}/${i.divPrima} x ${fmtCOP(c.base)} = ${fmtCOP(c.prima)}`,
    `4 VACACIONES: ${i.diasVacaciones}/${i.divVacaciones} x ${fmtCOP(i.salario)} = ${fmtCOP(c.vacaciones)}`,
    "",
    `TOTAL LIQUIDACIÓN: ${fmtCOP(c.total)}`,
    "",
    "HAGO CONSTAR",
    pazYSalvoLine(i),
    constanciaLine(i),
  ].join("\n");
}
