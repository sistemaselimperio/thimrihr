import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calcLiquidacion, liquidacionDefaults, type LiquidacionInput } from "./liquidacion.ts";
import {
  compareLiquidacion,
  hasManualOverrides,
  toMinTrabajoPayload,
} from "./mintrabajo-compare.ts";

function baseInput(over: Partial<LiquidacionInput> = {}): LiquidacionInput {
  const i = liquidacionDefaults(
    {
      full_name: "Prueba",
      cedula: "1",
      position: "Operario",
      hire_date: "2026-02-01",
      exit_date: "2026-09-30",
      municipality: "Chiquinquirá",
    } as never,
    null,
  );
  return { ...i, salario: 1750905, auxilio: 249095, ...over };
}

describe("compareLiquidacion", () => {
  it("marks every row ok when values match", () => {
    const calc = calcLiquidacion(baseInput());
    const res = compareLiquidacion(calc, {
      cesantias: calc.cesantias,
      intereses: calc.intereses,
      prima: calc.prima,
      vacaciones: calc.vacaciones,
      total: calc.total,
    });
    assert.equal(res.allOk, true);
    assert.deepEqual(
      res.rows.map((r) => r.key),
      ["cesantias", "intereses", "prima", "vacaciones", "total"],
    );
    assert.deepEqual(
      res.rows.map((r) => r.label),
      ["Cesantías", "Intereses de cesantías", "Prima de servicios", "Vacaciones", "Total"],
    );
    assert.ok(res.rows.every((r) => r.diff === 0 && r.ok));
  });

  it("applies the tolerance to rounding differences", () => {
    const calc = calcLiquidacion(baseInput());
    const ext = {
      cesantias: calc.cesantias + 0.33,
      intereses: calc.intereses - 0.67,
      prima: calc.prima,
      vacaciones: calc.vacaciones,
      total: calc.total,
    };
    assert.equal(compareLiquidacion(calc, ext).allOk, true);
    assert.equal(compareLiquidacion(calc, ext, 0.1).allOk, false);
  });

  it("reports signed diff (app minus MinTrabajo) and flags mismatches", () => {
    const calc = calcLiquidacion(baseInput());
    const res = compareLiquidacion(calc, {
      cesantias: calc.cesantias - 500,
      intereses: calc.intereses,
      prima: calc.prima,
      vacaciones: calc.vacaciones,
      total: calc.total - 500,
    });
    const ces = res.rows.find((r) => r.key === "cesantias");
    assert.equal(ces?.diff, 500);
    assert.equal(ces?.ok, false);
    assert.equal(res.allOk, false);
  });
});

describe("toMinTrabajoPayload", () => {
  it("maps dates, salary and auxilio flag", () => {
    const payload = toMinTrabajoPayload(baseInput(), {
      claseRiesgo: 2,
      dosOMasTrabajadores: false,
    });
    assert.deepEqual(payload, {
      fechaInicio: "2026-02-01",
      fechaFin: "2026-09-30",
      salario: 1750905,
      auxilioTransporte: true,
      claseRiesgo: 2,
      dosOMasTrabajadores: false,
    });
  });

  it("sets auxilioTransporte false when auxilio is 0", () => {
    const payload = toMinTrabajoPayload(baseInput({ auxilio: 0 }), {
      claseRiesgo: 1,
      dosOMasTrabajadores: true,
    });
    assert.equal(payload.auxilioTransporte, false);
  });

  it("does not leak personal data", () => {
    const payload = toMinTrabajoPayload(baseInput({ nombre: "Ana", cedula: "123" }), {
      claseRiesgo: 1,
      dosOMasTrabajadores: true,
    });
    assert.ok(!JSON.stringify(payload).includes("Ana"));
    assert.ok(!JSON.stringify(payload).includes("123"));
  });
});

describe("hasManualOverrides", () => {
  it("is false for default values", () => {
    assert.equal(hasManualOverrides(baseInput()), false);
  });

  it("detects changed days", () => {
    assert.equal(hasManualOverrides(baseInput({ diasPrima: 100 })), true);
    assert.equal(hasManualOverrides(baseInput({ diasVacaciones: 1 })), true);
  });

  it("detects changed divisors", () => {
    assert.equal(hasManualOverrides(baseInput({ divVacaciones: 360 })), true);
    assert.equal(hasManualOverrides(baseInput({ divCesantias: 365 })), true);
  });

  it("detects a manual cesantías value", () => {
    assert.equal(hasManualOverrides(baseInput({ valorCesantias: 1000 })), true);
  });
});
