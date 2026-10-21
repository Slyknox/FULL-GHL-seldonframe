// The SF_TIER_LADDER flag (server) and NEXT_PUBLIC_SF_TIER_LADDER (client twin)
// share one decision: ON unless explicitly "0" (CLAUDE.md §1b — the 5-tier
// ladder is the finalized pricing). Before this helper /pricing treated an
// unset flag as ON while the upgrade modal treated it as OFF.
import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { isTierLadderOn } from "../../../src/lib/billing/tier-ladder";

describe("isTierLadderOn", () => {
  test("unset / empty / null means ON (the ladder is the default)", () => {
    assert.equal(isTierLadderOn(undefined), true);
    assert.equal(isTierLadderOn(null), true);
    assert.equal(isTierLadderOn(""), true);
    assert.equal(isTierLadderOn("   "), true);
  });

  test('"1" and any non-"0" value means ON', () => {
    assert.equal(isTierLadderOn("1"), true);
    assert.equal(isTierLadderOn(" 1 "), true);
    assert.equal(isTierLadderOn("true"), true);
    assert.equal(isTierLadderOn("off"), true);
  });

  test('only an explicit "0" (trimmed) turns it OFF — the rollback hatch', () => {
    assert.equal(isTierLadderOn("0"), false);
    assert.equal(isTierLadderOn(" 0\n"), false);
  });
});
