// Display helpers for the billing settings page. Every label/price is
// derived from the plan catalog (plans.ts) so the page can never drift
// from what is actually sold or grandfathered.

import { normalizeTierId } from "@/lib/billing/features";
import { PLANS, getPlan } from "@/lib/billing/plans";

export type TierDisplay = { label: string; caption: string };

/** Map a stored subscription tier (current or legacy id) to the display
 *  label + caption. normalizeTierId absorbs legacy aliases (cloud_pro,
 *  pro_3, ...) so pre-migration paying customers see their real plan. */
export function getTierDisplay(rawTier: string | null | undefined): TierDisplay {
  const plan = getPlan(normalizeTierId(rawTier));
  if (!plan) return { label: "No active plan", caption: "Choose a plan to get started" };
  const caption = plan.tagline.startsWith("$") ? plan.tagline : `$${plan.price}/mo · ${plan.tagline}`;
  return { label: plan.name, caption };
}

/** Currently sellable tiers, e.g. "Builder ($29/mo), Managed ($49/mo), ...". */
export function sellableTiersSummary(): string {
  return PLANS.filter((p) => p.sellable)
    .map((p) => `${p.name} ($${p.price}/mo)`)
    .join(", ");
}

/** Names of the currently sellable tiers, e.g. "Builder, Managed, ...". */
export function sellableTierNames(): string {
  return PLANS.filter((p) => p.sellable)
    .map((p) => p.name)
    .join(", ");
}
