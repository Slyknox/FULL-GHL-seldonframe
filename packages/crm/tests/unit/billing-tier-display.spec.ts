// Billing settings page label/price mapping. Derived from plans.ts, so
// every current tier and every legacy id on a paying customer must resolve.

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { getTierDisplay, sellableTierNames, sellableTiersSummary } from "@/lib/billing/tier-display";

describe("getTierDisplay", () => {
  const cases: Array<[string, string, string]> = [
    ["builder", "Builder", "$29/mo"],
    ["managed", "Managed", "$49/mo"],
    ["agency_starter", "Agency Starter", "$99/mo"],
    ["agency_growth", "Agency Growth", "$199/mo"],
    ["agency_scale", "Agency Scale", "$299/mo"],
    ["workspace", "Workspace", "$49/mo"],
    ["agency", "SeldonFrame", "$29/mo"],
    ["cloud_pro", "SeldonFrame", "$29/mo"],
    ["pro_5", "SeldonFrame", "$29/mo"],
    ["cloud-starter", "Workspace", "$49/mo"],
  ];
  for (const [raw, label, price] of cases) {
    test(`${raw} -> ${label} ${price}`, () => {
      const d = getTierDisplay(raw);
      assert.equal(d.label, label);
      assert.ok(d.caption.startsWith(price), d.caption);
    });
  }

  test("no plan / unknown -> No active plan", () => {
    for (const raw of [null, undefined, "", "inactive", "free", "bogus"]) {
      assert.equal(getTierDisplay(raw).label, "No active plan");
    }
  });

  test("stale legacy prices never appear", () => {
    for (const t of ["builder", "agency", "workspace"]) {
      const c = getTierDisplay(t).caption;
      assert.ok(!c.includes("$297") && !c.includes("$19/mo"), c);
    }
  });
});

describe("sellable tier copy", () => {
  test("lists all five current tiers with prices", () => {
    const s = sellableTiersSummary();
    for (const x of ["Builder ($29/mo)", "Managed ($49/mo)", "Agency Starter ($99/mo)", "Agency Growth ($199/mo)", "Agency Scale ($299/mo)"]) {
      assert.ok(s.includes(x), s);
    }
    assert.ok(!s.includes("$297"));
    assert.ok(sellableTierNames().includes("Managed"));
  });
});
