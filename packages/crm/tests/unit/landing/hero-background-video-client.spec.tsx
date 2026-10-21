// Client-side gating of the hero background video: it only attaches its
// source and plays after mount, and only when the visitor hasn't asked for
// reduced motion, isn't on Save-Data, and has a viewport >= 640px.
import "../../setup-dom";

import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { render, cleanup, act } from "@testing-library/react";
import React from "react";

import { Hero } from "../../../src/components/landing-r1/sections/hero";
import {
  shouldPlayHeroVideo,
  readHeroVideoSignals,
  HERO_VIDEO_MIN_WIDTH_PX,
} from "../../../src/components/landing-r1/_shared/hero-video-policy";

afterEach(() => cleanup());

// framer-motion's <Reveal> wrappers observe viewport entry; jsdom has no IntersectionObserver.
class StubIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = StubIntersectionObserver;

const SRC = "https://ex.public.blob.vercel-storage.com/clip.mp4";
const props = {
  archetype: "bold-urgency" as const,
  businessName: "Test Plumbing",
  tagline: "Emergency plumbing service.",
  subhead: "24/7 service available.",
  primaryCTA: { label: "Call Now", href: "tel:+1234567890" },
  trustBadges: [],
  backgroundVideo: { src: SRC, poster: "https://ex.com/poster.jpg" },
};

describe("shouldPlayHeroVideo (pure policy)", () => {
  test("plays only when motion is allowed, no Save-Data and a wide viewport", () => {
    assert.equal(shouldPlayHeroVideo({ prefersReducedMotion: false, saveData: false, isWideViewport: true }), true);
    assert.equal(shouldPlayHeroVideo({ prefersReducedMotion: true, saveData: false, isWideViewport: true }), false);
    assert.equal(shouldPlayHeroVideo({ prefersReducedMotion: false, saveData: true, isWideViewport: true }), false);
    assert.equal(shouldPlayHeroVideo({ prefersReducedMotion: false, saveData: false, isWideViewport: false }), false);
  });

  test("mobile cutoff is 640px", () => {
    assert.equal(HERO_VIDEO_MIN_WIDTH_PX, 640);
  });

  test("no matchMedia support fails closed (no video)", () => {
    const signals = readHeroVideoSignals({} as unknown as Window, undefined);
    assert.equal(shouldPlayHeroVideo(signals), false);
  });
});

describe("HeroBackgroundLayer client gating", () => {
  const originalMatchMedia = window.matchMedia;
  const playCalls: Element[] = [];
  const proto = window.HTMLMediaElement.prototype as unknown as { play: () => Promise<void>; pause: () => void };
  const originalPlay = proto.play;
  const originalPause = proto.pause;
  let connection: unknown;

  function stubEnv(opts: { reduced: boolean; wide: boolean; saveData?: boolean }) {
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? opts.reduced : opts.wide,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    connection = { saveData: opts.saveData === true };
    Object.defineProperty(window.navigator, "connection", { value: connection, configurable: true });
  }

  beforeEach(() => {
    playCalls.length = 0;
    proto.play = function (this: Element) {
      playCalls.push(this);
      return Promise.resolve();
    };
    proto.pause = () => {};
  });
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    proto.play = originalPlay;
    proto.pause = originalPause;
    Reflect.deleteProperty(window.navigator, "connection");
  });

  async function mount() {
    let utils!: ReturnType<typeof render>;
    await act(async () => {
      utils = render(React.createElement(Hero, props));
    });
    return utils.container.querySelector("video") as HTMLVideoElement;
  }

  test("desktop, motion allowed, no Save-Data: attaches src and plays", async () => {
    stubEnv({ reduced: false, wide: true });
    const video = await mount();
    assert.equal(video.getAttribute("src"), SRC);
    assert.equal(playCalls.length, 1);
    assert.equal(video.hasAttribute("autoplay"), false);
  });

  test("small viewport: poster only, src never attached, no play()", async () => {
    stubEnv({ reduced: false, wide: false });
    const video = await mount();
    assert.equal(video.hasAttribute("src"), false);
    assert.equal(video.getAttribute("poster"), "https://ex.com/poster.jpg");
    assert.equal(playCalls.length, 0);
  });

  test("prefers-reduced-motion: poster only", async () => {
    stubEnv({ reduced: true, wide: true });
    const video = await mount();
    assert.equal(video.hasAttribute("src"), false);
    assert.equal(playCalls.length, 0);
  });

  test("navigator.connection.saveData: poster only", async () => {
    stubEnv({ reduced: false, wide: true, saveData: true });
    const video = await mount();
    assert.equal(video.hasAttribute("src"), false);
    assert.equal(playCalls.length, 0);
  });
});
