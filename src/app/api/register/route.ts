import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { validateRegistration, STAY_OPTIONS } from "@/lib/registration";

export const runtime = "nodejs";

function client() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("Registration store is not configured.");
  return new ConvexHttpClient(url);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function notifyTelegram(data: {
  name: string;
  email: string;
  phone: string;
  guests: number;
  stay: string;
  notes?: string;
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const stayLabel = STAY_OPTIONS.find((o) => o.value === data.stay)?.label || data.stay;
  const when = new Date().toLocaleString("en-GB", { timeZone: "Africa/Lagos" });
  const text = [
    "<b>MAD SETTINGS — new camp registration</b>",
    `<b>Name:</b> ${escapeHtml(data.name)}`,
    `<b>Email:</b> ${escapeHtml(data.email)}`,
    `<b>WhatsApp:</b> ${escapeHtml(data.phone)}`,
    `<b>People:</b> ${data.guests}`,
    `<b>Stay:</b> ${escapeHtml(stayLabel)}`,
    data.notes ? `<b>Notes:</b> ${escapeHtml(data.notes)}` : "",
    `<b>Time:</b> ${escapeHtml(when)} WAT`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    console.error("telegram notify failed", res.status);
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Send JSON." }, { status: 400 });
  }

  const parsed = validateRegistration(body);
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  try {
    const convex = client();
    const result = await convex.mutation(api.registrations.create, {
      ...parsed.data,
      source: "madsettings.theboostnation.space/register",
    });
    try {
      await notifyTelegram(parsed.data);
    } catch (notifyErr) {
      console.error("telegram notify failed", notifyErr);
    }
    return Response.json({ ok: true, email: result.email });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save your registration.";
    const duplicate = /already registered/i.test(message);
    return Response.json(
      { ok: false, error: message },
      { status: duplicate ? 409 : 502 },
    );
  }
}
