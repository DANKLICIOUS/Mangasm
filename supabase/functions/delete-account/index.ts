/**
 * delete-account — App Store Guideline 5.1.1(v) / GDPR.
 * Bearer user JWT required (verified by @supabase/server, auth: 'user').
 * Purges DMs, then auth.users (profiles cascade).
 *
 * Env: auto-injected by the Supabase Edge runtime; key resolution is handled
 * by @supabase/server (publishable + secret keys).
 */
import { withSupabase } from "npm:@supabase/server";
import { readAppleConfig, revokeToken } from "../_shared/apple.ts";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const userId = ctx.userClaims!.id;
    const admin = ctx.supabaseAdmin;

    // ── Guideline 5.1.1(v): revoke the Sign in with Apple token, if any ──────
    // Best-effort: deletion MUST still proceed (and purge data) even if revoke
    // fails or Apple is unconfigured. Outcome is logged only.
    let appleRevoked: boolean | "skipped" = "skipped";
    try {
      const cfg = readAppleConfig();
      if (cfg) {
        const { data: cred } = await admin
          .from("apple_credentials")
          .select("refresh_token")
          .eq("user_id", userId)
          .maybeSingle();
        if (cred?.refresh_token) {
          appleRevoked = await revokeToken(cfg, cred.refresh_token);
          console.log(`[delete-account] apple revoke for ${userId}: ${appleRevoked}`);
        } else {
          console.log(`[delete-account] no stored apple token for ${userId}`);
        }
      } else {
        console.log("[delete-account] apple not configured; skipping revoke");
      }
    } catch (e) {
      console.error("[delete-account] apple revoke error:", (e as Error).message);
      appleRevoked = false;
    }

    // Explicit purge before auth delete (block/report/DM leftovers).
    // Errors here must FAIL the deletion (B5): a swallowed purge error would
    // delete the auth user while leaving their messages behind.
    const purges: Array<[string, { error: { message: string } | null }]> = [
      [
        "messages",
        await admin
          .from("messages")
          .delete()
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
      ],
      ["blocks", await admin.from("blocks").delete().eq("blocker_id", userId)],
      ["reports", await admin.from("reports").delete().eq("reporter_id", userId)],
    ];
    for (const [table, { error }] of purges) {
      // A missing table is tolerated (schema not yet migrated everywhere);
      // any other failure aborts so no partial deletion happens.
      if (error && !/does not exist|relation .* not/i.test(error.message)) {
        return json({ error: `Purge failed for ${table}: ${error.message}` }, 500);
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return json({ error: deleteError.message }, 500);
    }

    return json({ deleted: true, userId, appleRevoked }, 200);
  }),
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
