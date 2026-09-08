/**
 * Vercel serverless — Mangasm rebuild waitlist
 * Lives at repo-root /api so it deploys with root vercel.json
 * (outputDirectory: "web" only ships static files from web/).
 *
 * Env (Vercel project):
 *   RESEND_API_KEY (required)
 *   WAITLIST_NOTIFY_TO (default bae@slay.llc)
 *   WAITLIST_FROM (default Resend onboarding sender until mangasm.app domain verified)
 *   SUPABASE_URL (required for persist — live: https://dvomzrvslwdabwcwtvrg.supabase.co)
 *   SUPABASE_ANON_KEY (required for persist — legacy anon JWT or sb_publishable_*)
 */

const RATE = new Map();

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res, status, body) {
  cors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function validEmail(email) {
  return (
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    email.length < 200
  );
}

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string") return xf.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

async function persistSignup(email, source) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { ok: false, skipped: true, error: "SUPABASE_URL/SUPABASE_ANON_KEY not configured" };
  }
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/waitlist_signups`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ email, source: source || null }),
  });
  if (res.status === 409 || res.status === 200 || res.status === 201) {
    return { ok: true };
  }
  if (res.ok) return { ok: true };
  const detail = await res.text().catch(() => "");
  if (res.status === 409 || /duplicate|unique/i.test(detail)) {
    return { ok: true, duplicate: true };
  }
  console.error("waitlist persist failed", res.status, detail);
  return { ok: false, error: detail || String(res.status) };
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return json(res, 500, { ok: false, error: "RESEND_API_KEY not configured" });
  }

  const ip = clientIp(req);
  const now = Date.now();
  const last = RATE.get(ip) || 0;
  if (now - last < 8000) {
    return json(res, 429, { ok: false, error: "Slow down — try again in a few seconds" });
  }
  RATE.set(ip, now);

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return json(res, 400, { ok: false, error: "Invalid JSON" });
    }
  }

  const email = String(body?.email || "")
    .trim()
    .toLowerCase();
  const source = String(body?.source || "mangasm-landing").slice(0, 80);
  if (!validEmail(email)) {
    return json(res, 400, { ok: false, error: "Valid email required" });
  }

  const stored = await persistSignup(email, source);
  if (!stored.ok && !stored.skipped) {
    return json(res, 502, { ok: false, error: "Could not save signup", detail: stored.error });
  }
  if (stored.skipped) {
    console.warn("waitlist persist skipped:", stored.error);
  }

  const from =
    process.env.WAITLIST_FROM || "Mangasm Rebuild <onboarding@resend.dev>";
  const notifyTo = process.env.WAITLIST_NOTIFY_TO || "bae@slay.llc";
  const stamp = new Date().toISOString();

  try {
    const notify = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [notifyTo],
        subject: `[Mangasm] Rebuild waitlist: ${email}`,
        text: `New rebuild waitlist signup\n\nEmail: ${email}\nSource: ${source}\nWhen: ${stamp}\nPersisted: ${stored.skipped ? "no (env missing)" : stored.duplicate ? "already had row" : "yes"}\n`,
      }),
    });
    const notifyJson = await notify.json().catch(() => ({}));
    if (!notify.ok) {
      console.error("Resend notify failed", notify.status, notifyJson);
      return json(res, 502, {
        ok: false,
        error: "Email provider error",
        detail: notifyJson?.message || String(notify.status),
      });
    }

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "You're on the Mangasm rebuild list",
        text:
          "Welcome home.\n\n" +
          "You're on the Mangasm rebuild waitlist. Safety-first — connection without extraction.\n\n" +
          "The autopsy is over. The rebuild begins.\n\n" +
          "— mangasm.app\n" +
          "Privacy: https://www.mangasm.app/privacy.html",
      }),
    }).catch(() => null);

    return json(res, 200, {
      ok: true,
      message: "You're on the rebuild list. Check your inbox.",
      persisted: !stored.skipped,
    });
  } catch (e) {
    console.error(e);
    return json(res, 500, { ok: false, error: "Server error" });
  }
};
