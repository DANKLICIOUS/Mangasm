/**
 * Public client config for /plus checkout.
 *
 * Returns the live Supabase URL + the publishable/anon key from Vercel env.
 * The live anon key is NOT in git — set one of:
 *   SUPABASE_ANON_KEY
 *   SUPABASE_PUBLISHABLE_KEY
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * Never returns service_role / sb_secret_* / Stripe secrets.
 */

const LIVE_URL = "https://dvomzrvslwdabwcwtvrg.supabase.co";
const RETIRED_REFS = [
  "hcpzbxplnkyythzwkovy",
  "zfwzrloxqqkkikedpruf",
  "pwmddvigardiyhqtihdw",
];

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res, status, body) {
  cors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/** Only the public client key may leave this endpoint. */
function publicClientKey(raw) {
  const key = typeof raw === "string" ? raw.trim() : "";
  if (!key) return "";
  if (key.startsWith("sb_secret_")) return "";
  if (key.startsWith("sk_")) return "";
  if (key.startsWith("sb_publishable_")) return key;
  if (key.startsWith("eyJ")) {
    const payload = decodeJwtPayload(key);
    if (!payload || payload.role !== "anon") return "";
    const ref = typeof payload.ref === "string" ? payload.ref : "";
    if (RETIRED_REFS.includes(ref)) return "";
    if (ref && ref !== "dvomzrvslwdabwcwtvrg") return "";
    return key;
  }
  return "";
}

function liveUrl(raw) {
  const url = typeof raw === "string" ? raw.trim().replace(/\/$/, "") : "";
  if (!url) return LIVE_URL;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return LIVE_URL;
    if (RETIRED_REFS.some((ref) => parsed.hostname.includes(ref))) return LIVE_URL;
    if (!parsed.hostname.endsWith(".supabase.co")) return LIVE_URL;
    return parsed.origin;
  } catch {
    return LIVE_URL;
  }
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== "GET") {
    return json(res, 405, { error: "GET only" });
  }

  const key = publicClientKey(
    process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "",
  );

  return json(res, 200, {
    supabaseUrl: liveUrl(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || LIVE_URL),
    supabaseAnonKey: key,
  });
};
