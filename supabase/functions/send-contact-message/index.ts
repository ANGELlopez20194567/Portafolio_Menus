const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SecretMap = Record<string, string>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function readSecretMap(name: string): SecretMap {
  const raw = Deno.env.get(name);
  if (!raw) return {};

  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? value as SecretMap : {};
  } catch {
    return {};
  }
}

function isAuthorizedCaller(request: Request): boolean {
  const publishableKeys = Object.values(readSecretMap("SUPABASE_PUBLISHABLE_KEYS"));
  const legacyAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacyAnonKey) publishableKeys.push(legacyAnonKey);

  const apiKey = request.headers.get("apikey");
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : null;

  return publishableKeys.some((key) => key === apiKey || key === bearer);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanText(value: unknown, limit: number): string {
  return String(value ?? "").trim().slice(0, limit);
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  const origin = request.headers.get("origin");
  const isLocalDevelopment = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "");
  if (origin !== "https://rayeltech.lat" && origin !== "null" && !isLocalDevelopment) {
    return jsonResponse({ error: "Invalid origin." }, 403);
  }
  if (!isAuthorizedCaller(request)) return jsonResponse({ error: "Unauthorized." }, 401);

  const resendApiKey = Deno.env.get("RESEND_API_KEY_ENVIO");
  if (!resendApiKey) {
    console.error("send-contact-message: missing RESEND_API_KEY_ENVIO.");
    return jsonResponse({ error: "Email service is not configured." }, 500);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  // Honeypot: automated clients often fill fields that people cannot see.
  if (cleanText(payload.company, 200)) return jsonResponse({ status: "sent" });

  const name = cleanText(payload.name, 120);
  const phone = cleanText(payload.phone, 40);
  const email = cleanText(payload.email, 254).toLowerCase();
  const message = cleanText(payload.message, 5000);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!name || !phone || !validEmail) {
    return jsonResponse({ error: "Invalid contact data." }, 400);
  }

  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f0eee8;color:#541267;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#f7f5ef;border:1px solid #d8cadc"><tr><td style="padding:30px"><p style="margin:0 0 12px;color:#dc5d45;font-size:12px;font-weight:bold;letter-spacing:1.5px">RAYELTECH.LAT · CONTACTO</p><h1 style="margin:0 0 26px;font-size:28px;color:#541267">Nuevo mensaje</h1><p><strong>Nombre:</strong> ${escapeHtml(name)}</p><p><strong>Teléfono:</strong> ${escapeHtml(phone)}</p><p><strong>Correo:</strong> ${escapeHtml(email)}</p><p><strong>Mensaje:</strong></p><p style="white-space:pre-wrap;line-height:1.55">${escapeHtml(message || "Sin mensaje adicional.")}</p></td></tr></table></td></tr></table></body></html>`;

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Formulario <contacto@send.rayeltech.lat>",
        to: ["info@rayeltech.lat"],
        reply_to: email,
        subject: `Nuevo contacto de ${name}`,
        html,
        text: `Nombre: ${name}\nTeléfono: ${phone}\nCorreo: ${email}\n\nMensaje:\n${message || "Sin mensaje adicional."}`,
        tags: [{ name: "type", value: "contact_form" }],
      }),
    });
    const result = await resendResponse.json().catch(() => ({})) as { id?: string; message?: string; name?: string };

    if (!resendResponse.ok || !result.id) {
      console.error(`send-contact-message: Resend error ${resendResponse.status}: ${result.message || "unknown"}`);
      return jsonResponse({ error: "Email delivery failed." }, 502);
    }

    return jsonResponse({ status: "sent" });
  } catch (error) {
    console.error("send-contact-message: unexpected delivery error.", error);
    return jsonResponse({ error: "Email delivery failed." }, 502);
  }
});
