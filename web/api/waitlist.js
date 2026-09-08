/**
 * NOTE: Production serverless entry is repo-root `/api/waitlist.js`.
 * Root vercel.json uses outputDirectory: "web", so this path is NOT deployed
 * as a function. Kept for reference / if Root Directory is set to web/.
 *
 * Original handler body retained below for local reference.
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
  if (!validEmail(email)) {
    return json(res, 400, { ok: false, error: "Valid email required" });
  }

  // Default from Resend test sender until slay.llc / mangasm.app verified on resend.com/domains
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
        // Do not include visitor IP in email body (operator privacy + minimize PII in mail)
        text: `New rebuild waitlist signup\n\nEmail: ${email}\nWhen: ${stamp}\n\n(IP used only for rate-limit in memory, not stored in this email.)`,
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
    });
  } catch (e) {
    console.error(e);
    return json(res, 500, { ok: false, error: "Server error" });
  }
};
