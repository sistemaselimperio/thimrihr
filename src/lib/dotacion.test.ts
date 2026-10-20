import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DOTACION_ITEMS,
  dotacionDefaults,
  dotacionFechaPartes,
  dotacionLogoPath,
  dotacionText,
  isDotacion,
  validateDotacion,
} from "./dotacion.ts";
import type { Employee } from "./hr";

const employee = {
  full_name: "Luis Fernando Pineda Moreno",
  cedula: "1053348102",
  position: "MOSTRADOR",
  company_id: "empresa-1",
} as Employee;

const keyOf = (seccion: string, label: string) =>
  DOTACION_ITEMS.find((i) => i.seccion === seccion && i.label === label)!.key;

describe("isDotacion", () => {
  it("detects by category or by name", () => {
    assert.equal(isDotacion({ category: "dotacion", name: "X" }), true);
    assert.equal(isDotacion({ category: "otros", name: "Entrega de dotación" }), true);
    assert.equal(isDotacion({ category: "otros", name: "Entrega de dotacion" }), true);
    assert.equal(isDotacion({ category: "nomina", name: "Nómina" }), false);
  });
});

describe("DOTACION_ITEMS", () => {
  it("has a single section with 20 items split evenly in two columns", () => {
    assert.ok(DOTACION_ITEMS.every((i) => i.seccion === "dotacion"));
    assert.equal(DOTACION_ITEMS.length, 20);
    assert.equal(DOTACION_ITEMS.filter((i) => i.col === 0).length, 10);
  });

  it("has unique keys", () => {
    const keys = DOTACION_ITEMS.map((i) => i.key);
    assert.equal(new Set(keys).size, keys.length);
  });

  it("uses the current format labels", () => {
    const labels = DOTACION_ITEMS.map((i) => i.label);
    assert.equal(labels[0], "Camiseta Tipo Polo");
    assert.ok(labels.includes("Barbuquejo"));
    assert.equal(labels.includes("BATA"), false);
    assert.equal(labels.includes("Casco"), false);
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
    assert.equal(d.empresaId, "empresa-1");
    assert.match(d.fecha, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("validateDotacion", () => {
  it("requires at least one delivered item", () => {
    const d = dotacionDefaults(employee);
    assert.equal(typeof validateDotacion(d), "string");
    assert.equal(
      validateDotacion({ ...d, entregados: [keyOf("dotacion", "Camisa oxford")] }),
      null,
    );
  });
});

describe("dotacionLogoPath", () => {
  const companies = [
    { id: "empresa-1", logo_path: "a/logo1.png" },
    { id: "empresa-2", logo_path: null },
  ];

  it("uses the logo of the selected company", () => {
    assert.equal(dotacionLogoPath("empresa-1", companies), "a/logo1.png");
  });

  it("returns null without company, without logo or for unknown ids", () => {
    assert.equal(dotacionLogoPath(null, companies), null);
    assert.equal(dotacionLogoPath("empresa-2", companies), null);
    assert.equal(dotacionLogoPath("otra", companies), null);
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
      entregados: [keyOf("dotacion", "Barbuquejo"), keyOf("dotacion", "Camiseta Tipo Polo")],
    };
    const text = dotacionText(d);
    assert.match(text, /30\/4\/2026/);
    assert.match(text, /LUIS FERNANDO PINEDA MORENO/);
    const order = ["DOTACION ENTREGADA:", "Camiseta Tipo Polo", "Barbuquejo"].map((l) =>
      text.indexOf(l),
    );
    assert.ok(order.every((i) => i >= 0));
    assert.deepEqual(
      [...order].sort((a, b) => a - b),
      order,
    );
    assert.equal(text.includes("Antifluido"), false);
  });
});
