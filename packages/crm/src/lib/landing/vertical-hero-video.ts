// packages/crm/src/lib/landing/vertical-hero-video.ts
//
// Curated, self-hosted hero background loops per vertical. The r1 generator
// reaches for these ONLY when the hero is already stock (the business had no
// scrapeable photo of its own) — the client's real media always wins.
//
// Clips live under public/media/verticals/<vertical>/ as muted H.264 MP4s
// (1280w, faststart) with a JPEG poster. They are AI-generated b-roll, the
// video equivalent of the Unsplash stock fallback — decorative, never
// presented as the client's own work. Same-origin static paths, so they
// load on /w/<slug>, <slug>.app.seldonframe.com, and custom domains alike
// (proxy.ts's matcher never admits /media).
//
// Selection is deterministic: a clip whose topic matches the business's own
// services/description wins (most specific first); otherwise a general clip
// is picked by business-name hash, so regenerating never rolls the dice.

export type HeroVideo = { src: string; poster: string };

type CuratedClip = HeroVideo & {
  id: string;
  /** Topic keywords that make this the best-fit clip for a business. */
  match?: RegExp;
  /** Eligible for the name-hash pick when no topic matches. */
  general: boolean;
};

const clip = (vertical: string, id: string, rest: Omit<CuratedClip, "id" | "src" | "poster">): CuratedClip => ({
  id,
  src: `/media/verticals/${vertical}/${id}.mp4`,
  poster: `/media/verticals/${vertical}/${id}.jpg`,
  ...rest,
});

// Order matters: the first clip whose `match` hits wins, so the narrowest
// specialties come first.
const WELDING_CLIPS: CuratedClip[] = [
  clip("welding", "inert-chamber-weld", {
    match: /titanium|aerospace|glove.?box|inert|chamber|exotic alloy/,
    general: false,
  }),
  clip("welding", "purge-oxygen-check", {
    match: /purge|sanitary|orbital|pharma|food.?grade|process pip/,
    general: false,
  }),
  clip("welding", "structural-bolting", {
    match: /structural|steel erect|erection|ironwork|beam|girder|bolt/,
    general: false,
  }),
  clip("welding", "tig-tube-fitting", {
    match: /tube|tubing|stainless|roll.?cage|handrail|railing/,
    general: true,
  }),
  clip("welding", "tig-bead-closeup", { general: true }),
];

const CLIPS_BY_VERTICAL: Record<string, CuratedClip[]> = {
  welding: WELDING_CLIPS,
};

function nameHash(businessName: string): number {
  let hash = 5381;
  for (let i = 0; i < businessName.length; i++) {
    hash = ((hash << 5) + hash + businessName.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Pick a curated hero background loop for a vertical, or null when the
 * vertical has no curated clips.
 */
export function pickVerticalHeroVideo(input: {
  vertical: string;
  services: string[];
  businessDescription: string;
  businessName: string;
}): HeroVideo | null {
  const clips = CLIPS_BY_VERTICAL[input.vertical];
  if (!clips || clips.length === 0) return null;

  const topic = [...input.services, input.businessDescription].join(" ").toLowerCase();
  const topical = clips.find((c) => c.match?.test(topic));
  const chosen = topical ?? (() => {
    const pool = clips.filter((c) => c.general);
    return pool[nameHash(input.businessName) % pool.length];
  })();

  return { src: chosen.src, poster: chosen.poster };
}
