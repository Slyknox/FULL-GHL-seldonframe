// Curated vertical hero loops: selection rules + the assets they point at.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";

import { pickVerticalHeroVideo } from "../../../src/lib/landing/vertical-hero-video";
import { inferVertical } from "../../../src/lib/landing/r1-payload-prompt";
import { classifyArchetype } from "../../../src/lib/workspace/aesthetic-archetypes";

const welding = (services: string[], businessDescription = "", businessName = "Kiln Iron Works") =>
  pickVerticalHeroVideo({ vertical: "welding", services, businessDescription, businessName });

describe("pickVerticalHeroVideo", () => {
  test("returns null for a vertical without curated clips", () => {
    assert.equal(
      pickVerticalHeroVideo({ vertical: "hvac", services: [], businessDescription: "", businessName: "Acme" }),
      null,
    );
  });

  test("matches the clip to the shop's specialty", () => {
    assert.match(welding(["Titanium aerospace welding"])!.src, /inert-chamber-weld\.mp4$/);
    assert.match(welding(["Sanitary process piping"], "Orbital TIG and purge.")!.src, /purge-oxygen-check\.mp4$/);
    assert.match(welding(["Structural steel erection"])!.src, /structural-bolting\.mp4$/);
    assert.match(welding(["Stainless handrails"])!.src, /tig-tube-fitting\.mp4$/);
  });

  test("falls back to a general clip, stable for the same business name", () => {
    const a = welding(["Mobile welding"], "", "Kiln Iron Works");
    const b = welding(["Mobile welding"], "", "Kiln Iron Works");
    assert.deepEqual(a, b);
    assert.match(a!.src, /\/(tig-bead-closeup|tig-tube-fitting)\.mp4$/);
  });

  test("every curated clip and poster exists under public/", () => {
    const topics = [["titanium"], ["purge"], ["structural"], ["tube"], ["general"]];
    const names = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const picks = [
      ...topics.map((t) => welding(t)!),
      ...names.map((n) => welding(["general"], "", n)!),
    ];
    for (const pick of picks) {
      for (const asset of [pick.src, pick.poster]) {
        assert.ok(existsSync(path.join(process.cwd(), "public", asset)), `missing ${asset}`);
      }
    }
  });
});

describe("welding vertical detection", () => {
  test("pipe welding is welding, not plumbing", () => {
    assert.equal(inferVertical(["Pipe welding", "Fabrication"], ""), "welding");
    assert.equal(inferVertical(["Custom gates"], "Metal fabrication and ironwork."), "welding");
  });

  test("a plumber named Weldon stays a plumber", () => {
    assert.equal(inferVertical(["Drain cleaning"], "Weldon Plumbing serves Fresno."), "plumbing");
  });

  test("welding classifies as a trade, not the editorial-warm catch-all", () => {
    assert.equal(classifyArchetype({ vertical: "welding" }), "bold-urgency");
    assert.equal(
      classifyArchetype({ vertical: "welding", businessDescription: "Family-owned since 1962." }),
      "editorial-warm",
    );
  });
});
