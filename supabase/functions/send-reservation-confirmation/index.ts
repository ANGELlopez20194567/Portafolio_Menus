const FUNCTION_NAME = "send-reservation-confirmation";
const MAX_RESEND_ATTEMPTS = 3;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SecretMap = Record<string, string>;

type Delivery = {
  delivery_id: number;
  recipient: string;
  template: string;
  reservation_code: string;
  guest_name: string;
  party_size: number;
  starts_at: string;
  restaurant_name: string;
  timezone: string;
  section_name: string | null;
  public_email: string | null;
  public_phone: string | null;
};

type ResendResult = {
  id?: string;
  message?: string;
  name?: string;
};

class ResendRequestError extends Error {
  retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "ResendRequestError";
    this.retryable = retryable;
  }
}

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

function getServerKey(): string | null {
  const secretKeys = readSecretMap("SUPABASE_SECRET_KEYS");
  return secretKeys.default || Object.values(secretKeys)[0] ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || null;
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

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatReservationDate(startsAt: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(startsAt));
  } catch {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(startsAt));
  }
}

function buildEmail(delivery: Delivery, from: string): Record<string, unknown> {
  const restaurant = escapeHtml(delivery.restaurant_name);
  const guest = escapeHtml(delivery.guest_name);
  const code = escapeHtml(delivery.reservation_code);
  const section = delivery.section_name
    ? `<tr><td style="padding:10px 0;border-bottom:1px solid #c9d5da;color:#567c91;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Área</td><td style="padding:10px 0;border-bottom:1px solid #c9d5da;text-align:right;color:#182026;font-size:15px;font-weight:700">${escapeHtml(delivery.section_name)}</td></tr>`
    : "";
  const contact = [delivery.public_phone, delivery.public_email]
    .filter(Boolean)
    .join(" · ");
  const contactHtml = escapeHtml(contact);

  const html = `<!doctype html>
<html lang="es-MX">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Reserva confirmada en ${restaurant}</title>
  </head>
  <body style="margin:0;padding:0;background:#052438;color:#182026;font-family:Arial,Helvetica,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">Tu mesa bajo el cielo índigo está confirmada.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#052438">
      <tr>
        <td align="center" style="padding:34px 12px">
          <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:#fbf7ed;border-collapse:collapse">
            <tr><td style="height:8px;background:#b43b2f;font-size:0;line-height:0">&nbsp;</td></tr>
            <tr>
              <td style="padding:25px 30px;background:#082f49;color:#f3ead7">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="58" valign="middle">
                      <div style="width:46px;height:46px;border:1px solid #f3ead7;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;line-height:46px;color:#f3ead7">さ</div>
                    </td>
                    <td valign="middle">
                      <p style="margin:0;color:#ffffff;font-size:19px;font-weight:800;letter-spacing:4px">SAKURA</p>
                      <p style="margin:4px 0 0;color:#a8c0cc;font-size:9px;font-weight:700;letter-spacing:2.3px">COCINA JAPONESA</p>
                    </td>
                    <td align="right" valign="middle" style="color:#a8c0cc;font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:2px">さくら</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:42px 38px 36px">
                <p style="margin:0 0 13px;color:#b43b2f;font-size:11px;font-weight:800;letter-spacing:2px">予約 · RESERVA CONFIRMADA</p>
                <h1 style="margin:0;color:#082f49;font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:400;line-height:1.12">Tu mesa está lista.</h1>
                <p style="margin:20px 0 28px;color:#465660;font-size:16px;line-height:1.65">Hola <strong style="color:#182026">${guest}</strong>. Preparamos tu lugar en ${restaurant}. Conserva este correo y presenta tu código al llegar.</p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-left:5px solid #b43b2f;background:#e8eef0;border-collapse:collapse">
                  <tr>
                    <td style="padding:20px 23px">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse">
                        <tr><td style="padding:0 0 10px;border-bottom:1px solid #c9d5da;color:#567c91;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Fecha y hora</td><td style="padding:0 0 10px;border-bottom:1px solid #c9d5da;text-align:right;color:#182026;font-size:15px;font-weight:700">${escapeHtml(formatReservationDate(delivery.starts_at, delivery.timezone))}</td></tr>
                        <tr><td style="padding:10px 0;border-bottom:1px solid #c9d5da;color:#567c91;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Personas</td><td style="padding:10px 0;border-bottom:1px solid #c9d5da;text-align:right;color:#182026;font-size:15px;font-weight:700">${delivery.party_size}</td></tr>
                        ${section}
                      </table>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:18px;border-collapse:collapse">
                  <tr>
                    <td style="padding:18px 22px;background:#b43b2f;color:#ffffff">
                      <p style="margin:0 0 5px;font-size:9px;font-weight:800;letter-spacing:2px">CÓDIGO DE RESERVACIÓN</p>
                      <p style="margin:0;font-family:'Courier New',monospace;font-size:24px;font-weight:700;letter-spacing:3px">${code}</p>
                    </td>
                    <td width="82" align="center" style="background:#082f49;color:#f3ead7;font-family:Georgia,'Times New Roman',serif;font-size:28px">桜</td>
                  </tr>
                </table>

                <p style="margin:27px 0 0;color:#082f49;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-style:italic">Tu mesa bajo el cielo índigo.</p>
                ${contactHtml ? `<p style="margin:12px 0 0;color:#687982;font-size:12px;line-height:1.6">¿Necesitas ayuda? ${contactHtml}</p>` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:19px 30px;background:#031b2b;color:#9db3bd;text-align:center;font-size:10px;letter-spacing:1.4px">SAKURA · COCINA JAPONESA · MÉXICO</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `SAKURA · Cocina Japonesa`,
    `Reserva confirmada en ${delivery.restaurant_name}`,
    `Hola ${delivery.guest_name}, tu mesa está confirmada.`,
    `Fecha y hora: ${formatReservationDate(delivery.starts_at, delivery.timezone)}`,
    `Personas: ${delivery.party_size}`,
    delivery.section_name ? `Área: ${delivery.section_name}` : null,
    `Código de reservación: ${delivery.reservation_code}`,
    `Tu mesa bajo el cielo índigo.`,
    contact ? `Contacto: ${contact}` : null,
  ].filter(Boolean).join("\n");

  return {
    from,
    to: [delivery.recipient],
    subject: `Tu reserva en ${delivery.restaurant_name} está confirmada`,
    html,
    text,
    ...(delivery.public_email ? { reply_to: delivery.public_email } : {}),
    tags: [
      { name: "type", value: "reservation_confirmation" },
      { name: "delivery_id", value: String(delivery.delivery_id) },
    ],
  };
}

async function callRpc<T>(
  supabaseUrl: string,
  serverKey: string,
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: serverKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Database RPC ${name} failed (${response.status}): ${text.slice(0, 300)}`);
  }

  return (text ? JSON.parse(text) : null) as T;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function sendWithResend(
  apiKey: string,
  delivery: Delivery,
  from: string,
): Promise<string> {
  const payload = buildEmail(delivery, from);
  const idempotencyKey = `reservation-confirmation/${delivery.delivery_id}`;
  let lastError: Error = new Error("Resend request failed.");

  for (let attempt = 1; attempt <= MAX_RESEND_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({})) as ResendResult;

      if (response.ok && result.id) return result.id;

      const message = result.message || result.name || `Resend returned HTTP ${response.status}.`;
      const retryable = response.status === 408 || response.status === 409 ||
        response.status === 429 || response.status >= 500;
      throw new ResendRequestError(message, retryable);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable = !(error instanceof ResendRequestError) || error.retryable;
      if (!retryable || attempt === MAX_RESEND_ATTEMPTS) break;
      await wait(250 * (2 ** (attempt - 1)));
    }
  }

  throw lastError;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }
  if (!isAuthorizedCaller(request)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serverKey = getServerKey();
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFrom = Deno.env.get("RESEND_FROM");

  const missingConfiguration = [
    !supabaseUrl ? "SUPABASE_URL" : null,
    !serverKey ? "SUPABASE_SECRET_KEYS" : null,
    !resendApiKey ? "RESEND_API_KEY" : null,
    !resendFrom ? "RESEND_FROM" : null,
  ].filter(Boolean);
  if (missingConfiguration.length) {
    console.error(`${FUNCTION_NAME}: missing ${missingConfiguration.join(", ")}.`);
    return jsonResponse({
      error: "Email service is not configured.",
      missing: missingConfiguration,
    }, 500);
  }

  let reservationCode = "";
  try {
    const body = await request.json();
    reservationCode = String(body?.reservationCode || "").trim().toUpperCase();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  if (!/^[A-Z0-9]{16}$/.test(reservationCode)) {
    return jsonResponse({ error: "Invalid reservation code." }, 400);
  }

  let delivery: Delivery | null = null;
  try {
    delivery = await callRpc<Delivery | null>(
      supabaseUrl,
      serverKey,
      "claim_reservation_confirmation",
      { p_reservation_code: reservationCode },
    );

    if (!delivery) {
      return jsonResponse({ status: "already_processed" });
    }
    if (delivery.template !== "reservation_confirmation") {
      throw new Error("Unsupported email template.");
    }

    const providerMessageId = await sendWithResend(resendApiKey, delivery, resendFrom);
    await callRpc<boolean>(supabaseUrl, serverKey, "complete_reservation_email_delivery", {
      p_delivery_id: delivery.delivery_id,
      p_sent: true,
      p_provider_message_id: providerMessageId,
      p_error: null,
    });

    return jsonResponse({ status: "sent" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email delivery error.";
    console.error(`${FUNCTION_NAME}: delivery ${delivery?.delivery_id ?? "unclaimed"} failed: ${message.slice(0, 300)}`);

    if (delivery?.delivery_id) {
      try {
        await callRpc<boolean>(supabaseUrl, serverKey, "complete_reservation_email_delivery", {
          p_delivery_id: delivery.delivery_id,
          p_sent: false,
          p_provider_message_id: null,
          p_error: message.slice(0, 1000),
        });
      } catch (updateError) {
        console.error(`${FUNCTION_NAME}: could not persist failure for delivery ${delivery.delivery_id}.`, updateError);
      }
    }

    return jsonResponse({ error: "Email delivery failed." }, 502);
  }
});
