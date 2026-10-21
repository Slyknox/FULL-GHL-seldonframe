// packages/crm/src/lib/billing/tier-ladder.ts
//
// Single definition of the SF_TIER_LADDER rollout flag. CLAUDE.md §1b
// settles the 5-tier ladder as the finalized pricing, so the ladder is ON
// by default. The only way to turn it off is an explicit "0" — a
// controlled-rollback escape hatch. An unset (or any other) value must
// never send a visitor to the retired single-card checkout.
//
// The flag has a server spelling (SF_TIER_LADDER) and a client-safe,
// build-time twin (NEXT_PUBLIC_SF_TIER_LADDER). Callers pass the raw env
// value in, because Next inlines NEXT_PUBLIC_ vars only for literal
// `process.env.NEXT_PUBLIC_X` reads; a dynamic lookup in here would be
// undefined in the browser bundle.

export function isTierLadderOn(value: string | undefined | null): boolean {
  return value?.trim() !== "0";
}
