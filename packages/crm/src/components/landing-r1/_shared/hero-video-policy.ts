// Decides whether the hero background video may load and play. Pure so it is
// unit-testable without a browser; the effect in sections/hero.tsx feeds it
// live browser signals.
//
// The video is a nice-to-have behind the hero copy, never required to read
// the page, so it is skipped (poster only, nothing downloaded) when:
//   • the visitor asked for reduced motion,
//   • the connection reports Save-Data (navigator.connection.saveData), or
//   • the viewport is narrower than HERO_VIDEO_MIN_WIDTH_PX (phones would
//     otherwise pull the whole clip, up to ~888 KB, for a decorative loop).

export const HERO_VIDEO_MIN_WIDTH_PX = 640;
export const HERO_VIDEO_MIN_WIDTH_QUERY = `(min-width: ${HERO_VIDEO_MIN_WIDTH_PX}px)`;
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export type HeroVideoSignals = {
  prefersReducedMotion: boolean;
  saveData: boolean;
  isWideViewport: boolean;
};

export function shouldPlayHeroVideo(signals: HeroVideoSignals): boolean {
  return !signals.prefersReducedMotion && !signals.saveData && signals.isWideViewport;
}

type NetworkInformationLike = {
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

export function getNetworkInformation(nav: unknown): NetworkInformationLike | undefined {
  return (nav as { connection?: NetworkInformationLike } | undefined)?.connection;
}

/** Reads the three signals from the live browser. Missing APIs fail closed
 *  for the heavy path: no matchMedia means we can't tell the viewport width,
 *  so the video is not loaded. */
export function readHeroVideoSignals(win: Window, nav: unknown): HeroVideoSignals {
  const mq = typeof win.matchMedia === "function" ? win.matchMedia.bind(win) : null;
  return {
    prefersReducedMotion: mq ? mq(REDUCED_MOTION_QUERY).matches : true,
    saveData: getNetworkInformation(nav)?.saveData === true,
    isWideViewport: mq ? mq(HERO_VIDEO_MIN_WIDTH_QUERY).matches : false,
  };
}
