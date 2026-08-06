/**
 * Shared Sign in with Apple server helpers (Guideline 5.1.1(v)).
 *
 * Sign in with Apple is no longer offered — the app is email-only. These helpers
 * remain solely so `delete-account` can revoke the refresh token of a legacy
 * account that still has a row in `apple_credentials`.
 *
 * Required environment (set via `supabase secrets set …`; NEVER hardcode):
 *   APPLE_TEAM_ID     — 10-char Apple Developer Team ID.
 *   APPLE_KEY_ID      — Key ID of the .p8 signing key created in the Apple portal.
 *   APPLE_PRIVATE_KEY — Contents of the AuthKey_XXXX.p8 (PEM, may include literal
 *                       \n — they are normalised below).
 *   APPLE_CLIENT_ID   — The Services ID / bundle ID used as `aud` "client_id"
 *                       (e.g. com.mangasm.app).
 *
 * If any are missing, callers treat Apple integration as unconfigured and skip
 * (deletion still succeeds; see delete-account).
 */

const APPLE_AUD = "https://appleid.apple.com";

export interface AppleConfig {
  teamId: string;
  keyId: string;
  privateKeyPem: string;
  clientId: string;
}

/** Returns null (not throws) when SIWA env vars are absent — lets callers no-op. */
export function readAppleConfig(): AppleConfig | null {
  const teamId = Deno.env.get("APPLE_TEAM_ID");
  const keyId = Deno.env.get("APPLE_KEY_ID");
  const privateKeyPem = Deno.env.get("APPLE_PRIVATE_KEY");
  const clientId = Deno.env.get("APPLE_CLIENT_ID");
  if (!teamId || !keyId || !privateKeyPem || !clientId) return null;
  return { teamId, keyId, privateKeyPem, clientId };
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlStr(s: string): string {
  return b64url(new TextEncoder().encode(s));
}

/** Import an Apple .p8 (PKCS#8 PEM) key for ES256 signing. */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const normalised = pem.replace(/\\n/g, "\n");
  const body = normalised
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

/**
 * Build the ES256 client-secret JWT Apple requires for token/revoke calls.
 * Valid for ~5 minutes (Apple allows up to 6 months; short is safer).
 */
export async function makeClientSecret(cfg: AppleConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: cfg.keyId, typ: "JWT" };
  const payload = {
    iss: cfg.teamId,
    iat: now,
    exp: now + 300,
    aud: APPLE_AUD,
    sub: cfg.clientId,
  };
  const signingInput = `${b64urlStr(JSON.stringify(header))}.${b64urlStr(JSON.stringify(payload))}`;
  const key = await importPrivateKey(cfg.privateKeyPem);
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(signingInput)
    )
  );
  // Web Crypto returns raw r||s (64 bytes) — exactly the JOSE ES256 format.
  return `${signingInput}.${b64url(sig)}`;
}

/**
 * Revoke a stored Apple refresh token. Returns true on success.
 * A 200 (with empty body) is success per Apple's spec.
 */
export async function revokeToken(cfg: AppleConfig, refreshToken: string): Promise<boolean> {
  const clientSecret = await makeClientSecret(cfg);
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: clientSecret,
    token: refreshToken,
    token_type_hint: "refresh_token",
  });
  const res = await fetch(`${APPLE_AUD}/auth/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    console.error("[apple] revoke failed:", res.status, await res.text());
    return false;
  }
  return true;
}
