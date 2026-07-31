/**
 * delete-account — App Store Guideline 5.1.1(v) / GDPR.
 * Bearer user JWT required (verified by @supabase/server, auth: 'user').
 * Purges DMs, then auth.users (profiles cascade).
 *
 * Env: auto-injected by the Supabase Edge runtime; key resolution is handled
 * by @supabase/server (publishable + secret keys).
 */
import { withSupabase } from "npm:@supabase/server";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const userId = ctx.userClaims!.id;
    const admin = ctx.supabaseAdmin;

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

    return json({ deleted: true, userId }, 200);
  }),
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
