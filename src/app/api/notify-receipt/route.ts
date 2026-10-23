import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export const runtime = "nodejs";

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Tells camp staff on Telegram that a receipt is waiting. Only fires for a receipt
// this camper really sent in the last two minutes, so the route can't be used to spam.
export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!token || !chatId || !url) return Response.json({ ok: true, sent: false });
  let playerKey = "";
  try { playerKey = String((await req.json()).playerKey ?? ""); } catch { /* empty body */ }
  const me = await new ConvexHttpClient(url).query(api.accounts.me, { playerKey });
  const fresh = me.account && me.payments?.find(p => p.status === "pending" && Date.now() - p.createdAt < 120_000);
  if (!me.account || !fresh) return Response.json({ ok: true, sent: false });
  const text = [
    "<b>MAD SETTINGS — receipt to check</b>",
    `<b>Camper:</b> ${escapeHtml(me.account.name)} (${escapeHtml(me.account.phone)})`,
    `<b>For:</b> ${fresh.kind === "registration" ? "Camp fee" : "Wallet top-up"}`,
    `<b>Amount:</b> ₦${fresh.amount.toLocaleString("en-NG")}`,
    "Check the bank app, then approve: https://madsettings.theboostnation.space/admin",
  ].join("\n");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  return Response.json({ ok: true, sent: res.ok });
}
