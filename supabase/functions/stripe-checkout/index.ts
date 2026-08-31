/**
 * stripe-checkout — web Mangasm+ Stripe Checkout (NOT iOS StoreKit).
 *
 * Authenticated member asks for a Checkout Session and gets a hosted payment URL.
 * Reuses the member's Stripe customer if one exists; otherwise creates it.
 *
 * Body:    { "plan": "monthly" | "quarterly" }
 * Returns: { "url": "https://checkout.stripe.com/…" }
 *
 * Env (supabase secrets set … — never commit real values):
 *   STRIPE_SECRET_KEY        sk_test_… / sk_live_…
 *   STRIPE_PRICE_MONTHLY     Stripe price id for $9.99/mo
 *   STRIPE_PRICE_QUARTERLY   Stripe price id for $24.99/3mo
 *   CHECKOUT_SUCCESS_URL     e.g. https://mangasm.app/plus/success
 *   CHECKOUT_CANCEL_URL      e.g. https://mangasm.app/plus
 *   STRIPE_PAYMENT_METHOD_CONFIGURATION  optional pmc_… (account-scoped)
 *
 * Deploy: supabase functions deploy stripe-checkout --no-verify-jwt
 * (JWT is verified here via @supabase/server auth: "user".)
 */
import { withSupabase } from "npm:@supabase/server";
import Stripe from "https://esm.sh/stripe@14.25.0?target=denonext";

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stripeClient(): Stripe | null {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return json({ error: "POST only" }, 405);
    }

    const stripe = stripeClient();
    const monthly = Deno.env.get("STRIPE_PRICE_MONTHLY");
    const quarterly = Deno.env.get("STRIPE_PRICE_QUARTERLY");
    if (!stripe || !monthly || !quarterly) {
      return json({ error: "Checkout is not configured" }, 503);
    }

    const prices: Record<string, string> = { monthly, quarterly };

    let plan = "monthly";
    try {
      const body = await req.json();
      if (body && typeof body.plan === "string") plan = body.plan;
    } catch {
      // empty / invalid JSON → default monthly, then rejected if unknown
    }
    const price = prices[plan];
    if (!price) return json({ error: `Unknown plan '${plan}'` }, 400);

    const userId = ctx.userClaims!.id;
    const admin = ctx.supabaseAdmin;

    const { data: existing } = await admin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let customerId = existing?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      const customer = await stripe.customers.create({
        email: authUser.user?.email ?? undefined,
        metadata: { mangasm_user_id: userId },
      });
      customerId = customer.id;
      const { error: insertError } = await admin.from("billing_customers").upsert(
        { user_id: userId, stripe_customer_id: customerId },
        { onConflict: "user_id" },
      );
      if (insertError) {
        console.error("[stripe-checkout] billing_customers insert failed:", insertError.message);
        return json({ error: "Could not start checkout" }, 500);
      }
    }

    const pmc = Deno.env.get("STRIPE_PAYMENT_METHOD_CONFIGURATION");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      ...(pmc ? { payment_method_configuration: pmc } : {}),
      success_url:
        Deno.env.get("CHECKOUT_SUCCESS_URL") ?? "https://mangasm.app/plus/success",
      cancel_url: Deno.env.get("CHECKOUT_CANCEL_URL") ?? "https://mangasm.app/plus",
      subscription_data: { metadata: { mangasm_user_id: userId } },
    });

    if (!session.url) return json({ error: "Checkout did not return a URL" }, 502);
    return json({ url: session.url }, 200);
  }),
};
