// The 14-day-trial plan picker (selectPlanAction) was dead code: nothing
// called it, and the 2026-07-05 founder decision removed trials (checkout
// charges immediately; the free build->claim->use flow is the trial). A
// server action is a public POST endpoint, so a dead one that writes
// `subscriptionStatus: "trialing"` is attack surface, not just clutter.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const src = (rel: string) => readFileSync(path.join(__dirname, "../../../src", rel), "utf8");

describe("legacy trial plan-picker stays removed", () => {
  test("lib/billing/actions.ts exports only the billing-portal action", () => {
    const source = src("lib/billing/actions.ts");
    assert.doesNotMatch(source, /selectPlanAction/);
    assert.doesNotMatch(source, /trialEndsAt|"trialing"|14 \* 24/);
    assert.doesNotMatch(source, /checkout\/sessions/, "no Stripe checkout call site here");
    assert.match(source, /export async function createBillingPortalSessionAction/);
  });

  test("workspace-create plan-required classification no longer matches the retired $9 wording", () => {
    const source = src("app/api/v1/workspace/create/route.ts");
    assert.doesNotMatch(source, /additional workspace is/);
    assert.match(source, /additional workspace requires a paid tier/);
  });
});
