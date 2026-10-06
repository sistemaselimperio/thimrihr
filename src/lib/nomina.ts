/** Recibo de pago mensual de nómina: cálculo, valores iniciales y texto plano para el historial. */

import { MONTHS_LONG, parseDate, type Employee } from "./hr";
import { fmtCOP } from "./liquidacion";

export interface NominaInput {
  nombre: string;
  cedula: string;
  /** Ciudad de expedición de la cédula. */
  expedicion: string;
  /** ISO */
  fechaIngreso: string;
  /** Mes del pago (0 = enero). */
  mes: number;
  anio: number;
  salario: number;
  /** Auxilio de transporte mensual completo. */
  auxilio: number;
  dias: number;
  /** Porcentajes de deducción (0.04 = 4 %). */
  tasaSalud: number;
  tasaPension: number;
  otrasDeducciones: number;
}

export interface NominaCalc {
  devengado: number;
  auxTransporte: number;
  totalDevengado: number;
  salud: number;
  pension: number;
  totalDeducciones: number;
  neto: number;
}

export function calcNomina(i: NominaInput): NominaCalc {
  const devengado = Math.round((i.salario * i.dias) / 30);
  const auxTransporte = Math.round((i.auxilio * i.dias) / 30);
  const totalDevengado = devengado + auxTransporte;
  const salud = Math.round(devengado * i.tasaSalud);
  const pension = Math.round(devengado * i.tasaPension);
  const totalDeducciones = salud + pension + i.otrasDeducciones;
  return {
    devengado,
    auxTransporte,
    totalDevengado,
    salud,
    pension,
    totalDeducciones,
    neto: totalDevengado - totalDeducciones,
  };
}

export function isNomina(t: { category?: string | null; name?: string | null }): boolean {
  return t.category === "nomina" || /n[oó]mina/i.test(t.name ?? "");
}

export function nominaDefaults(employee: Employee): NominaInput {
  const now = new Date();
  return {
    nombre: employee.full_name,
    cedula: employee.cedula,
    expedicion: employee.municipality || "Chiquinquirá",
    fechaIngreso: employee.hire_date || "",
    mes: now.getMonth(),
    anio: now.getFullYear(),
    salario: 0,
    auxilio: 200000,
    dias: 30,
    tasaSalud: 0.04,
    tasaPension: 0.04,
    otrasDeducciones: 0,
  };
}

export function mesNombre(mes: number): string {
  return MONTHS_LONG[mes]?.toUpperCase() ?? "";
}

/** "MARZO 15 - 2024" */
export function fmtIngreso(iso: string): string {
  if (!iso) return "";
  const d = parseDate(iso);
  return `${mesNombre(d.getMonth())} ${String(d.getDate()).padStart(2, "0")} - ${d.getFullYear()}`;
}

/** 1423500 → "1.423.500" */
export function fmtNum(n: number): string {
  return n ? new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n) : "";
}

export function nominaText(i: NominaInput, c: NominaCalc): string {
  return [
    "RECIBO DE PAGO MENSUAL DE NOMINA",
    `MES DE ${mesNombre(i.mes)} DE ${i.anio}`,
    "",
    `NOMINA: ${i.nombre.toUpperCase()}`,
    `C.C. ${i.cedula} DE ${i.expedicion.toUpperCase()}`,
    `INGRESO: ${fmtIngreso(i.fechaIngreso)}`,
    `SALARIO: ${fmtCOP(i.salario)}`,
    `N° DÍAS: ${i.dias}`,
    "",
    `DEVENGADO: ${fmtCOP(c.devengado)}`,
    `AUX. TRANSPORTE: ${fmtCOP(c.auxTransporte)}`,
    `TOTAL DEVENGADO: ${fmtCOP(c.totalDevengado)}`,
    "",
    `SALUD: ${fmtCOP(c.salud)}`,
    `PENSIÓN: ${fmtCOP(c.pension)}`,
    `OTRAS DEDUCCIONES: ${fmtCOP(i.otrasDeducciones)}`,
    `TOTAL DEDUCCIONES: ${fmtCOP(c.totalDeducciones)}`,
    "",
    `NETO PAGO: ${fmtCOP(c.neto)}`,
  ].join("\n");
}
