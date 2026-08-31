/**
 * stripe-webhook — Stripe subscription lifecycle → billing_subscriptions.
 * The 0012 trigger flips profiles.premium from that state.
 *
 * Handled: customer.subscription.created / .updated / .deleted,
 *          invoice.payment_failed (refresh — Stripe also emits
 *          subscription.updated with status past_due).
 *
 * Env (supabase secrets set … — never commit real values):
 *   STRIPE_SECRET_KEY          sk_test_… / sk_live_…
 *   STRIPE_WEBHOOK_SECRET      whsec_… from the Stripe webhook endpoint
 *
 * Deploy WITHOUT JWT verification (Stripe signs; it does not log in):
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 *
 * Stripe Dashboard webhook URL:
 *   https://dvomzrvslwdabwcwtvrg.functions.supabase.co/stripe-webhook
 */
import Stripe from "https://esm.sh/stripe@14.25.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cryptoProvider = Stripe.createSubtleCryptoProvider();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200 });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabase = serviceClient();
  if (!secretKey || !webhookSecret || !supabase) {
    return json({ error: "Webhook not configured" }, 503);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const stripe = new Stripe(secretKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed", err);
    return new Response("Bad signature", { status: 400 });
  }

  async function userIdForCustomer(customerId: string): Promise<string | null> {
    const { data } = await supabase
      .from("billing_customers")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    return data?.user_id ?? null;
  }

  async function upsertSubscription(sub: Stripe.Subscription) {
    const userId =
      sub.metadata?.mangasm_user_id ||
      (await userIdForCustomer(sub.customer as string));
    if (!userId) {
      console.error(`[stripe-webhook] no Mangasm user for Stripe customer ${sub.customer}`);
      return;
    }
    const { error } = await supabase.from("billing_subscriptions").upsert({
      id: sub.id,
      user_id: userId,
      source: "stripe",
      status: sub.status,
      price_id: sub.items.data[0]?.price?.id ?? null,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
    });
    if (error) {
      console.error("[stripe-webhook] upsert failed:", error.message);
      throw error;
    }
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await upsertSubscription(sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] handler failed", err);
    return json({ error: "Handler failed" }, 500);
  }

  return json({ received: true });
});
