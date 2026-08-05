/**
 * validate-referral — record signup with a cartoon referral code.
 *
 * POST { "referrer_code": "TAZ", "ip_hash"?, "device_fp"? }
 *
 * The referred user is the AUTHENTICATED caller (verified JWT via
 * @supabase/server, auth: 'user') — never a client-supplied id, so referral
 * rewards cannot be farmed by posting arbitrary user ids.
 *
 * Reward: every 5 completed signups → 1 free month M+ (~$20 value).
 */
import { withSupabase } from "npm:@supabase/server";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }

    let body: {
      referrer_code?: string;
      ip_hash?: string;
      device_fp?: string;
    };

    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    const code = body.referrer_code?.trim();
    if (!code) {
      return json({ error: "missing_fields" }, 400);
    }

    // Identity comes from the verified JWT, not the request body.
    const referredId = ctx.userClaims!.id;

    const { data, error } = await ctx.supabaseAdmin.rpc("record_referral_signup", {
      p_code: code,
      p_referred_id: referredId,
      p_ip_hash: body.ip_hash ?? null,
      p_device_fp: body.device_fp ?? null,
    });

    if (error) {
      const msg = error.message ?? "referral_failed";
      const status = msg.includes("invalid_referral_code")
        ? 404
        : msg.includes("self_referral") || msg.includes("already_referred")
          ? 409
          : 400;
      return json({ error: msg }, status);
    }

    return json(data, 200);
  }),
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
