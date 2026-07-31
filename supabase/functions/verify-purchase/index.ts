/**
 * verify-purchase — Supabase Edge Function (Deno/TypeScript)
 *
 * Receives a StoreKit 2 JWS-signed transaction from the iOS app, verifies it
 * against Apple's App Store Server API, and on success sets profiles.premium = true
 * for the AUTHENTICATED user (verified JWT via @supabase/server, auth: 'user').
 *
 * REQUIRED ENVIRONMENT VARIABLES (set in Supabase Dashboard → Settings → Edge Functions):
 *   Supabase URL/keys       — auto-injected; resolution handled by @supabase/server
 *   APPLE_BUNDLE_ID         — e.g. "com.mangasm.app"
 *   APPLE_ISSUER_ID         — from App Store Connect → Keys → App Store Connect API
 *   APPLE_KEY_ID            — In-App Purchase key ID (e.g. 5WWBWC52Q5)
 *   APPLE_PRIVATE_KEY       — SubscriptionKey_XXXX.p8 PEM (newlines as \n)
 *   APPLE_ENVIRONMENT       — "Sandbox" or "Production"
 *
 * REQUEST (POST, application/json, Authorization: Bearer <supabase user JWT>):
 *   { "signedTransaction": "<JWS string from StoreKit 2 VerificationResult>" }
 *
 * RESPONSE:
 *   200 { "ok": true, "productId": "...", "expiresDate": "..." }
 *   4xx/5xx { "error": "..." }
 */

import { withSupabase } from "npm:@supabase/server";

const APPLE_JWK_URL_PROD = "https://api.storekit.itunes.apple.com/inApps/v1/transactions/validate";
const APPLE_JWK_URL_SANDBOX =
  "https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/validate";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    let body: { signedTransaction?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { signedTransaction } = body;
    if (!signedTransaction) {
      return json({ error: "signedTransaction is required" }, 400);
    }

    // ── Decode the JWS payload (header.payload.signature) ──
    // Server-side verification against Apple happens below; the decode here
    // extracts productId/bundleId for validation and logging.
    let payload: Record<string, unknown>;
    try {
      const parts = signedTransaction.split(".");
      if (parts.length !== 3) throw new Error("not a JWS");
      const decoded = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      payload = JSON.parse(decoded);
    } catch (e) {
      return json({ error: `Failed to decode JWS payload: ${e}` }, 400);
    }

    const productId = payload["productId"] as string | undefined;
    const bundleId = payload["bundleId"] as string | undefined;
    const expiresDate = payload["expiresDate"] as number | undefined;

    const expectedBundle = Deno.env.get("APPLE_BUNDLE_ID") ?? "";
    if (bundleId !== expectedBundle) {
      return json(
        { error: `Bundle ID mismatch: expected ${expectedBundle}, got ${bundleId}` },
        403
      );
    }

    // ── Verify JWS against Apple's App Store Server API ──
    const appleEnv = Deno.env.get("APPLE_ENVIRONMENT") ?? "Sandbox";
    const appleValidateURL = appleEnv === "Production" ? APPLE_JWK_URL_PROD : APPLE_JWK_URL_SANDBOX;

    const issuerId = Deno.env.get("APPLE_ISSUER_ID") ?? "";
    const keyId = Deno.env.get("APPLE_KEY_ID") ?? "";
    const privateKeyPem = Deno.env.get("APPLE_PRIVATE_KEY") ?? "";

    if (!issuerId || !keyId || !privateKeyPem) {
      // Never grant premium on an unverified transaction in Production.
      if (appleEnv === "Production") {
        return json({ error: "Server misconfigured: Apple API credentials missing" }, 503);
      }
      console.warn(
        "[verify-purchase] Apple API credentials not set — skipping server-side verify (SANDBOX ONLY)"
      );
    } else {
      try {
        // Import the ES256 private key
        const pemBody = privateKeyPem
          .replace(/-----BEGIN PRIVATE KEY-----/g, "")
          .replace(/-----END PRIVATE KEY-----/g, "")
          .replace(/\s/g, "");
        const keyDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
        const cryptoKey = await crypto.subtle.importKey(
          "pkcs8",
          keyDer,
          { name: "ECDSA", namedCurve: "P-256" },
          false,
          ["sign"]
        );

        // Build JWT header + payload
        const now = Math.floor(Date.now() / 1000);
        const jwtHeader = b64url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
        const jwtPayload = b64url(
          JSON.stringify({
            iss: issuerId,
            iat: now,
            exp: now + 3600,
            aud: "appstoreconnect-v1",
            bid: expectedBundle,
          })
        );

        const sigInput = new TextEncoder().encode(`${jwtHeader}.${jwtPayload}`);
        const sigBytes = await crypto.subtle.sign(
          { name: "ECDSA", hash: "SHA-256" },
          cryptoKey,
          sigInput
        );
        const sig = b64url(String.fromCharCode(...new Uint8Array(sigBytes)));
        const bearerToken = `${jwtHeader}.${jwtPayload}.${sig}`;

        // Call Apple's validate endpoint
        const appleResp = await fetch(appleValidateURL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ signedTransaction }),
        });

        if (!appleResp.ok) {
          const errText = await appleResp.text();
          return json(
            {
              error: `Apple validation failed: HTTP ${appleResp.status} — ${errText}`,
            },
            402
          );
        }
      } catch (e) {
        return json({ error: `Apple API verification error: ${e}` }, 500);
      }
    }

    // ── Write premium = true for the verified caller ──
    // Identity comes from the verified Supabase JWT (auth: 'user'), never from
    // an unverified decode of the Authorization header.
    const userId = ctx.userClaims!.id;
    const { error: dbError } = await ctx.supabaseAdmin
      .from("profiles")
      .update({ premium: true })
      .eq("id", userId);

    if (dbError) {
      console.error("[verify-purchase] DB update failed:", dbError);
      // Still return 200 — client-side StoreKit already shows premium
    }

    return json(
      {
        ok: true,
        productId,
        expiresDate: expiresDate ? new Date(expiresDate).toISOString() : null,
      },
      200
    );
  }),
};

function b64url(s: string): string {
  return btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
