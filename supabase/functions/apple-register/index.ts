/**
 * apple-register — App Store Guideline 5.1.1(v) support.
 *
 * Called right after a successful Sign in with Apple. Exchanges the one-time
 * `authorizationCode` (valid ~5 min) for an Apple *refresh token* and stores it
 * server-side, keyed to the user, so `delete-account` can later revoke the SIWA
 * grant.
 *
 * Bearer user JWT required (verified by @supabase/server, auth: 'user').
 * Body: { "authorizationCode": "<code from ASAuthorizationAppleIDCredential>" }
 *
 * No-ops gracefully (200) if Apple env is unconfigured or the code can't be
 * exchanged — sign-in must never fail because token persistence failed.
 *
 * Required secrets: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_CLIENT_ID.
 */
import { withSupabase } from "npm:@supabase/server";
import { exchangeAuthorizationCode, readAppleConfig } from "../_shared/apple.ts";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const cfg = readAppleConfig();
    if (!cfg) {
      // Not configured yet — safe no-op so sign-in still completes.
      return json({ stored: false, reason: "apple_not_configured" }, 200);
    }

    let authorizationCode: string | undefined;
    try {
      const b = await req.json();
      authorizationCode =
        typeof b?.authorizationCode === "string" ? b.authorizationCode : undefined;
    } catch {
      // fall through to 400 below
    }
    if (!authorizationCode) {
      return json({ error: "authorizationCode required" }, 400);
    }

    const refreshToken = await exchangeAuthorizationCode(cfg, authorizationCode);
    if (!refreshToken) {
      return json({ stored: false, reason: "exchange_failed" }, 200);
    }

    const userId = ctx.userClaims!.id;
    const { error } = await ctx.supabaseAdmin
      .from("apple_credentials")
      .upsert({
        user_id: userId,
        refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("[apple-register] store failed:", error.message);
      return json({ stored: false, reason: "store_failed" }, 200);
    }
    return json({ stored: true }, 200);
  }),
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
