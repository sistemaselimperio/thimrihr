/** Comparación de la liquidación con el resultado de la calculadora del MinTrabajo. */

import type { LiquidacionCalc, LiquidacionInput } from "./liquidacion";

export interface MinTrabajoValues {
  cesantias: number;
  intereses: number;
  prima: number;
  vacaciones: number;
  total: number;
}

export interface MinTrabajoOptions {
  /** 1..5 (clase I..V de la ARL) */
  claseRiesgo: number;
  dosOMasTrabajadores: boolean;
}

/** Cuerpo que recibe el microservicio: solo fechas, salario y banderas, sin datos personales. */
export interface MinTrabajoPayload extends MinTrabajoOptions {
  fechaInicio: string;
  fechaFin: string;
  salario: number;
  auxilioTransporte: boolean;
}

export interface ComparisonRow {
  key: keyof MinTrabajoValues;
  label: string;
  app: number;
  mintrabajo: number;
  /** app − mintrabajo */
  diff: number;
  ok: boolean;
}

const ROWS: { key: keyof MinTrabajoValues; label: string }[] = [
  { key: "cesantias", label: "Cesantías" },
  { key: "intereses", label: "Intereses de cesantías" },
  { key: "prima", label: "Prima de servicios" },
  { key: "vacaciones", label: "Vacaciones" },
  { key: "total", label: "Total" },
];

export function compareLiquidacion(
  calc: LiquidacionCalc,
  ext: MinTrabajoValues,
  tolerance = 1,
): { rows: ComparisonRow[]; allOk: boolean } {
  const rows = ROWS.map(({ key, label }) => {
    const app = calc[key];
    const mintrabajo = ext[key];
    const diff = Math.round((app - mintrabajo) * 100) / 100;
    return { key, label, app, mintrabajo, diff, ok: Math.abs(diff) <= tolerance };
  });
  return { rows, allOk: rows.every((r) => r.ok) };
}

export function toMinTrabajoPayload(
  i: LiquidacionInput,
  opts: MinTrabajoOptions,
): MinTrabajoPayload {
  return {
    fechaInicio: i.fechaIngreso,
    fechaFin: i.fechaHasta,
    salario: i.salario,
    auxilioTransporte: i.auxilio > 0,
    claseRiesgo: opts.claseRiesgo,
    dosOMasTrabajadores: opts.dosOMasTrabajadores,
  };
}

/** True si el usuario cambió días, divisores o el valor de cesantías respecto a los valores estándar. */
export function hasManualOverrides(i: LiquidacionInput): boolean {
  const dias = [i.diasCesantias, i.diasIntereses, i.diasPrima, i.diasVacaciones];
  return (
    dias.some((d) => d !== i.diasServicio) ||
    i.divCesantias !== 360 ||
    i.divIntereses !== 360 ||
    i.divPrima !== 360 ||
    i.divVacaciones !== 720 ||
    i.valorCesantias !== null
  );
}
