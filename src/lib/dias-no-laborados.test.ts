import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DNL_ASUNTO,
  diasNoLaboradosCarta,
  diasNoLaboradosCuerpo,
  diasNoLaboradosDefaults,
  diasNoLaboradosText,
  isDiasNoLaborados,
  quincenaDe,
  validateDiasNoLaborados,
} from "./dias-no-laborados.ts";
import type { Employee } from "./hr";

const employee = {
  full_name: "Luis Fernando Pineda Moreno",
  cedula: "1053348102",
  position: "MOSTRADOR",
  company_id: "empresa-1",
} as Employee;

const filled = () => ({
  ...diasNoLaboradosDefaults(employee),
  fecha: "2026-10-22",
  cedulaLugar: "Chiquinquirá",
  desde: "2026-10-05",
  hasta: "2026-10-06",
  quincena: "primera" as const,
  quincenaMes: "10",
});

const plain = (segs: { text: string }[]) => segs.map((s) => s.text).join("");

describe("isDiasNoLaborados", () => {
  it("detects by category or by name", () => {
    assert.equal(isDiasNoLaborados({ category: "dias_no_laborados", name: "X" }), true);
    assert.equal(
      isDiasNoLaborados({ category: "permiso", name: "Permiso días no laborados" }),
      true,
    );
    assert.equal(
      isDiasNoLaborados({ category: "otros", name: "Descuento dias no laborados" }),
      true,
    );
    assert.equal(isDiasNoLaborados({ category: "permiso", name: "Permiso" }), false);
    assert.equal(
      isDiasNoLaborados({ category: "descuento_vacaciones", name: "Descuento de vacaciones" }),
      false,
    );
  });
});

describe("quincenaDe", () => {
  it("returns the fortnight and month of a date", () => {
    assert.deepEqual(quincenaDe("2026-10-15"), { quincena: "primera", mes: "10" });
    assert.deepEqual(quincenaDe("2026-10-16"), { quincena: "segunda", mes: "10" });
    assert.deepEqual(quincenaDe(""), { quincena: "", mes: "" });
  });
});

describe("diasNoLaboradosDefaults", () => {
  it("prefills employee data and the employer of the format", () => {
    const d = diasNoLaboradosDefaults(employee);
    assert.equal(d.nombre, employee.full_name);
    assert.equal(d.cedula, employee.cedula);
    assert.equal(d.empresaId, "empresa-1");
    assert.equal(d.empleador, "FABIAN LEONARDO PAEZ LANCHEROS");
    assert.equal(d.empleadorNit, "74.439.231");
    assert.equal(d.empresaNombre, "Comercializadora El Imperio");
    assert.equal(d.desde, "");
    assert.equal(d.hasta, "");
    assert.match(d.fecha, /^\d{4}-\d{2}-\d{2}$/);
    assert.deepEqual(quincenaDe(d.fecha), { quincena: d.quincena, mes: d.quincenaMes });
  });
});

describe("validateDiasNoLaborados", () => {
  it("accepts a complete input", () => {
    assert.equal(validateDiasNoLaborados(filled()), null);
  });

  it("requires name, id, both dates, fortnight and month", () => {
    for (const key of ["nombre", "cedula", "desde", "hasta", "quincena", "quincenaMes"] as const) {
      assert.equal(typeof validateDiasNoLaborados({ ...filled(), [key]: "" }), "string", key);
    }
  });

  it("rejects an end date before the start date", () => {
    assert.equal(
      typeof validateDiasNoLaborados({ ...filled(), desde: "2026-10-06", hasta: "2026-10-05" }),
      "string",
    );
  });
});

describe("diasNoLaboradosCuerpo", () => {
  it("fills the paragraph of the format with NO in bold", () => {
    const segs = diasNoLaboradosCuerpo(filled());
    assert.equal(
      plain(segs),
      "Yo LUIS FERNANDO PINEDA MORENO identificado con cedula número 1053348102 de Chiquinquirá autoriza al empleador FABIAN LEONARDO PAEZ LANCHEROS con NIT. 74.439.231, descontar, el día NO laborado que es del 5 al 6 de octubre de 2026 correspondiente a la primera quincena del mes de octubre.",
    );
    assert.deepEqual(
      segs.filter((s) => s.bold).map((s) => s.text),
      ["NO"],
    );
  });

  it("names both months when the period crosses the month", () => {
    const body = plain(
      diasNoLaboradosCuerpo({ ...filled(), desde: "2026-10-31", hasta: "2026-11-01" }),
    );
    assert.match(body, /del 31 de octubre al 1 de noviembre de 2026 correspondiente/);
  });

  it("uses blanks for missing data", () => {
    const body = plain(
      diasNoLaboradosCuerpo({ ...filled(), cedulaLugar: "", desde: "", hasta: "", quincena: "" }),
    );
    assert.match(body, /de ___________________ autoriza/);
    assert.match(body, /del ______ al ______ de _______________ de 202_ correspondiente/);
    assert.match(body, /a la ____________ quincena/);
  });
});

describe("diasNoLaboradosCarta", () => {
  it("keeps the recipient of the format with the employer in bold", () => {
    const c = diasNoLaboradosCarta(filled());
    assert.deepEqual(c.destinatario, [
      { text: "Señores" },
      { text: "FABIAN LEONARDO PAEZ LANCHEROS", bold: true },
      { text: "Comercializadora El Imperio" },
      { text: "Chiquinquirá" },
    ]);
    assert.equal(c.fechaLinea, "Chiquinquirá, 22 de octubre de 2026");
    assert.equal(c.asunto, DNL_ASUNTO);
    assert.equal(c.despedida, "Atentamente");
  });
});

describe("diasNoLaboradosText", () => {
  it("contains the date, recipient, subject, body and signature", () => {
    const text = diasNoLaboradosText(filled());
    for (const part of [
      "Chiquinquirá, 22 de octubre de 2026",
      "Señores",
      DNL_ASUNTO,
      "el día NO laborado que es del 5 al 6 de octubre de 2026",
      "C.C. 1053348102",
    ]) {
      assert.ok(text.includes(part), part);
    }
  });
});
