import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DV_ASUNTO,
  descuentoVacacionesCuerpo,
  descuentoVacacionesDefaults,
  descuentoVacacionesText,
  dvFechaCarta,
  isDescuentoVacaciones,
  validateDescuentoVacaciones,
} from "./descuento-vacaciones.ts";
import type { Employee } from "./hr";

const employee = {
  full_name: "Luis Fernando Pineda Moreno",
  cedula: "1053348102",
  position: "MOSTRADOR",
  company_id: "empresa-1",
} as Employee;

const filled = () => ({
  ...descuentoVacacionesDefaults(employee),
  fecha: "2026-10-22",
  cedulaLugar: "Chiquinquirá",
  desde: "2026-10-13",
  hasta: "2026-10-15",
  dias: "3",
});

describe("isDescuentoVacaciones", () => {
  it("detects by category or by name", () => {
    assert.equal(isDescuentoVacaciones({ category: "descuento_vacaciones", name: "X" }), true);
    assert.equal(
      isDescuentoVacaciones({ category: "permiso", name: "Permiso descuento de vacaciones" }),
      true,
    );
    assert.equal(
      isDescuentoVacaciones({ category: "otros", name: "Vacaciones con descuento" }),
      true,
    );
    assert.equal(isDescuentoVacaciones({ category: "permiso", name: "Permiso" }), false);
    assert.equal(isDescuentoVacaciones({ category: "otros", name: "Vacaciones" }), false);
  });
});

describe("descuentoVacacionesDefaults", () => {
  it("prefills employee data and the employer of the format", () => {
    const d = descuentoVacacionesDefaults(employee);
    assert.equal(d.nombre, employee.full_name);
    assert.equal(d.cedula, employee.cedula);
    assert.equal(d.empresaId, "empresa-1");
    assert.equal(d.empleador, "FABIAN LEONARDO PAEZ LANCHEROS");
    assert.equal(d.empleadorNit, "74439231-1");
    assert.equal(d.empresaNombre, "Comercializadora El Imperio");
    assert.equal(d.direccion, "CRA. 12 Nº 10-03");
    assert.equal(d.desde, "");
    assert.equal(d.hasta, "");
    assert.equal(d.dias, "");
    assert.match(d.fecha, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("validateDescuentoVacaciones", () => {
  it("accepts a complete input", () => {
    assert.equal(validateDescuentoVacaciones(filled()), null);
  });

  it("requires name, id, both dates and the days", () => {
    for (const key of ["nombre", "cedula", "desde", "hasta", "dias"] as const) {
      assert.equal(typeof validateDescuentoVacaciones({ ...filled(), [key]: "  " }), "string", key);
    }
  });

  it("rejects an end date before the start date", () => {
    assert.equal(
      typeof validateDescuentoVacaciones({ ...filled(), desde: "2026-10-15", hasta: "2026-10-13" }),
      "string",
    );
  });

  it("rejects a non positive or non integer number of days", () => {
    for (const dias of ["0", "-2", "1.5", "tres"]) {
      assert.equal(typeof validateDescuentoVacaciones({ ...filled(), dias }), "string", dias);
    }
  });
});

describe("dvFechaCarta", () => {
  it("writes the city and the long date", () => {
    assert.equal(dvFechaCarta("2026-10-02"), "Chiquinquirá, 2 de octubre de 2026");
  });

  it("leaves a blank when there is no date", () => {
    assert.equal(dvFechaCarta(""), "Chiquinquirá, ___________________");
  });
});

describe("descuentoVacacionesCuerpo", () => {
  it("fills the authorization paragraph of the format", () => {
    assert.equal(
      descuentoVacacionesCuerpo(filled()),
      "Yo LUIS FERNANDO PINEDA MORENO identificado con número de cédula 1053348102 de Chiquinquirá autorizo al empleador FABIAN LEONARDO PAEZ LANCHEROS con NIT. 74439231-1 a descontar los días no laborados que son del 13 de octubre al 15 de octubre de 2026 por el tiempo que corresponde a 3 días de mis VACACIONES.",
    );
  });

  it("names both years when the period crosses the year", () => {
    const body = descuentoVacacionesCuerpo({
      ...filled(),
      desde: "2026-12-30",
      hasta: "2027-01-02",
    });
    assert.match(body, /del 30 de diciembre de 2026 al 2 de enero de 2027 por/);
  });

  it("uses blanks for missing data", () => {
    const body = descuentoVacacionesCuerpo({ ...filled(), cedulaLugar: "", desde: "", dias: "" });
    assert.match(body, /de _____________ autorizo/);
    assert.match(body, /del _______ de ______________ al 15 de octubre de 2026/);
    assert.match(body, /a _____ días/);
  });
});

describe("descuentoVacacionesText", () => {
  it("contains the date, recipient, subject and body", () => {
    const text = descuentoVacacionesText(filled());
    for (const part of [
      "Chiquinquirá, 22 de octubre de 2026",
      "Señores:",
      "FABIAN LEONARDO PAEZ LANCHEROS",
      "CRA. 12 Nº 10-03",
      DV_ASUNTO,
      "del 13 de octubre al 15 de octubre de 2026",
      "Atentamente,",
      "C.C. 1053348102",
    ]) {
      assert.ok(text.includes(part), part);
    }
  });
});
