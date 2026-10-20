import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DOTACION_ITEMS,
  dotacionDefaults,
  dotacionFechaPartes,
  dotacionText,
  isDotacion,
  validateDotacion,
} from "./dotacion.ts";
import type { Employee } from "./hr";

const employee = {
  full_name: "Marlon Estiven Saavedra Sarmiento",
  cedula: "1002623209",
  position: "Auxiliar de Bodega",
} as Employee;

describe("isDotacion", () => {
  it("detects by category or by name", () => {
    assert.equal(isDotacion({ category: "dotacion", name: "X" }), true);
    assert.equal(isDotacion({ category: "otros", name: "Entrega de dotación" }), true);
    assert.equal(isDotacion({ category: "otros", name: "Entrega de dotacion" }), true);
    assert.equal(isDotacion({ category: "nomina", name: "Nómina" }), false);
  });
});

describe("dotacionDefaults", () => {
  it("prefills employee data with nothing delivered", () => {
    const d = dotacionDefaults(employee);
    assert.equal(d.nombre, employee.full_name);
    assert.equal(d.cedula, employee.cedula);
    assert.equal(d.cargo, employee.position);
    assert.equal(d.proceso, "");
    assert.deepEqual(d.entregados, []);
    assert.match(d.fecha, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("validateDotacion", () => {
  it("requires at least one delivered item", () => {
    const d = dotacionDefaults(employee);
    assert.equal(typeof validateDotacion(d), "string");
    assert.equal(validateDotacion({ ...d, entregados: ["gorra"] }), null);
  });
});

describe("dotacionFechaPartes", () => {
  it("splits an ISO date without leading zeros", () => {
    assert.deepEqual(dotacionFechaPartes("2026-04-30"), { dd: "30", mm: "4", aaaa: "2026" });
    assert.deepEqual(dotacionFechaPartes(""), { dd: "", mm: "", aaaa: "" });
  });
});

describe("dotacionText", () => {
  it("lists only the delivered items, in catalogue order", () => {
    const d = {
      ...dotacionDefaults(employee),
      fecha: "2026-04-30",
      entregados: ["gorra", "overol", "bota_cuero_dielectrica"],
    };
    const text = dotacionText(d);
    assert.match(text, /30\/4\/2026/);
    assert.match(text, /MARLON ESTIVEN SAAVEDRA SARMIENTO/);
    const order = ["Overol", "Bota de Cuero con Puntera Dieléctrica", "Gorra"].map((l) =>
      text.indexOf(l),
    );
    assert.ok(order.every((i) => i >= 0));
    assert.deepEqual(
      [...order].sort((a, b) => a - b),
      order,
    );
    assert.equal(text.includes("Pantalon"), false);
  });

  it("has unique item keys", () => {
    const keys = DOTACION_ITEMS.map((i) => i.key);
    assert.equal(new Set(keys).size, keys.length);
  });
});
