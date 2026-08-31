/**
 * revenue-metrics — owner-only snapshot for /admin/revenue.
 *
 * Auth: header x-admin-token: <ADMIN_DASHBOARD_TOKEN>
 * Deploy: supabase functions deploy revenue-metrics --no-verify-jwt
 *
 * Env: STRIPE_SECRET_KEY, ADMIN_DASHBOARD_TOKEN, SUPABASE_URL,
 *      SUPABASE_SERVICE_ROLE_KEY (auto-injected on hosted).
 */
import Stripe from "https://esm.sh/stripe@14.25.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const WEEKS = 8;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function monthlyCents(item: Stripe.SubscriptionItem): number {
  const price = item.price;
  if (!price?.unit_amount || !price.recurring) return 0;
  const { interval, interval_count } = price.recurring;
  const months = interval === "year"
    ? 12 * interval_count
    : interval === "month"
    ? interval_count
    : interval === "week"
    ? interval_count / 4.345
    : interval_count / 30.44;
  return Math.round(price.unit_amount / months);
}

async function listAll<T>(
  page: (params: Record<string, unknown>) => Promise<Stripe.ApiList<T>>,
  params: Record<string, unknown>,
  cap = 1000,
): Promise<T[]> {
  const out: T[] = [];
  let starting_after: string | undefined;
  while (out.length < cap) {
    const res = await page({ ...params, limit: 100, starting_after });
    out.push(...res.data);
    if (!res.has_more) break;
    starting_after = (res.data[res.data.length - 1] as { id: string }).id;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const token = req.headers.get("x-admin-token");
  const expected = Deno.env.get("ADMIN_DASHBOARD_TOKEN");
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secretKey || !url || !serviceKey) {
    return new Response(JSON.stringify({ error: "Metrics not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });
  const supabase = createClient(url, serviceKey);

  const now = Date.now();
  const windowStart = now - WEEKS * WEEK_MS;
  const sinceUnix = Math.floor(windowStart / 1000);

  const [active, trialing, canceled, invoices] = await Promise.all([
    listAll<Stripe.Subscription>(
      (p) => stripe.subscriptions.list(p as Stripe.SubscriptionListParams),
      { status: "active" },
    ),
    listAll<Stripe.Subscription>(
      (p) => stripe.subscriptions.list(p as Stripe.SubscriptionListParams),
      { status: "trialing" },
    ),
    listAll<Stripe.Subscription>(
      (p) => stripe.subscriptions.list(p as Stripe.SubscriptionListParams),
      { status: "canceled", created: { gte: sinceUnix } },
    ),
    listAll<Stripe.Invoice>(
      (p) => stripe.invoices.list(p as Stripe.InvoiceListParams),
      { created: { gte: sinceUnix } },
    ),
  ]);

  const live = [...active, ...trialing];
  const mrrCents = live.reduce(
    (sum, s) => sum + s.items.data.reduce((a, i) => a + monthlyCents(i), 0),
    0,
  );

  const byPlan: Record<string, number> = {};
  for (const s of live) {
    const nick = s.items.data[0]?.price?.nickname ??
      s.items.data[0]?.price?.id ?? "unknown";
    byPlan[nick] = (byPlan[nick] ?? 0) + 1;
  }

  const pastDue = await listAll<Stripe.Subscription>(
    (p) => stripe.subscriptions.list(p as Stripe.SubscriptionListParams),
    { status: "past_due" },
  );

  const failedInvoices = invoices.filter((inv) =>
    inv.attempt_count > 0 && !inv.paid &&
    (inv.status === "open" || inv.status === "uncollectible")
  );

  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const start = windowStart + i * WEEK_MS;
    const inWeek = (unix: number | null | undefined) => {
      if (!unix) return false;
      const ms = unix * 1000;
      return ms >= start && ms < start + WEEK_MS;
    };
    return {
      week_start: new Date(start).toISOString().slice(0, 10),
      new_subs: live.concat(canceled).filter((s) => inWeek(s.created)).length,
      canceled: canceled.filter((s) => inWeek(s.canceled_at)).length,
      failed_payments: failedInvoices.filter((i) => inWeek(i.created)).length,
    };
  });

  // This repo's entitlement column is profiles.premium (boolean).
  const { count: plusMembers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("premium", true);

  return new Response(
    JSON.stringify({
      generated_at: new Date(now).toISOString(),
      livemode: !secretKey.startsWith("sk_test"),
      mrr_cents: mrrCents,
      active_subscriptions: live.length,
      by_plan: byPlan,
      past_due: pastDue.length,
      failed_payments_open: failedInvoices.length,
      plus_members_in_db: plusMembers ?? 0,
      weeks,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
