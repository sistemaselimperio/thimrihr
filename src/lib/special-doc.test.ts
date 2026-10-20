import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findSignableDoc, findSpecialDoc } from "./special-doc.ts";

const doc = (key: string, re: RegExp) => ({
  key,
  matches: (t: { category?: string | null; name?: string | null }) =>
    t.category === key || re.test(t.name ?? ""),
});

const docs = [doc("liquidacion", /liquidaci[oó]n/i), doc("nomina", /n[oó]mina/i)];

describe("findSpecialDoc", () => {
  it("returns the matching document type", () => {
    assert.equal(findSpecialDoc(docs, { category: "nomina", name: "X" })?.key, "nomina");
  });

  it("returns undefined for plain templates", () => {
    assert.equal(findSpecialDoc(docs, { category: "certificado", name: "Certificado" }), undefined);
  });

  it("first registered type wins when several match", () => {
    const t = { category: "otros", name: "Liquidación de nómina" };
    assert.equal(findSpecialDoc(docs, t)?.key, "liquidacion");
  });
});

describe("findSignableDoc", () => {
  const signable = [
    { key: "liquidacion", share: {} },
    { key: "nomina" },
    { key: "dotacion", share: {} },
  ];

  it("finds a signable document by its stored kind", () => {
    assert.equal(findSignableDoc(signable, "dotacion")?.key, "dotacion");
  });

  it("ignores documents that cannot be signed", () => {
    assert.equal(findSignableDoc(signable, "nomina"), undefined);
  });

  it("returns undefined for unknown kinds", () => {
    assert.equal(findSignableDoc(signable, "contrato"), undefined);
  });
});
