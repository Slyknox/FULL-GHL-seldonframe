"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getOrgId } from "@/lib/auth/helpers";
import { getOrgSubscription } from "@/lib/billing/subscription";

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

async function createStripeBillingPortalUrl(params: { secretKey: string; customerId: string }) {
  const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      customer: params.customerId,
      return_url: `${getAppBaseUrl()}/settings/billing`,
    }),
  });

  if (!response.ok) {
    // contract:throw-ok: Stripe API error; caller is createBillingPortalSessionAction
    // which is form-submit-driven, not SSR-render-driven.
    throw new Error("Failed to create Stripe billing portal session");
  }

  const payload = (await response.json()) as { url?: string | null };

  if (!payload.url) {
    // contract:throw-ok: Stripe 200 with malformed body, unrecoverable.
    throw new Error("Stripe portal URL missing");
  }

  return payload.url;
}

export async function createBillingPortalSessionAction() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    redirect("/settings/billing");
  }

  const orgId = await getOrgId();
  const orgSubscription = await getOrgSubscription(orgId ?? session?.user?.orgId ?? null);

  const [user] = await db
    .select({
      stripeCustomerId: users.stripeCustomerId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const customerId = orgSubscription.stripeCustomerId ?? user?.stripeCustomerId ?? null;

  if (!customerId) {
    // v1.8.1 — graceful redirect instead of throwing. Users on free
    // tier (or any tier where they've never completed a Stripe
    // checkout) have no customer yet — clicking "Manage subscription"
    // shouldn't crash the page; it should send them to the pricing /
    // upgrade flow. The settings page itself ALSO conditionally hides
    // the button for free-tier users (defense in depth), but a stale
    // page state, a direct form POST, or a guest-admin-token edge
    // case can still hit this action with no customer. Redirect →
    // /settings/billing?upgrade=needed surfaces a banner explaining
    // why they were sent back.
    redirect("/settings/billing?upgrade=needed");
  }

  const portalUrl = await createStripeBillingPortalUrl({
    secretKey,
    customerId,
  });

  redirect(portalUrl);
}
