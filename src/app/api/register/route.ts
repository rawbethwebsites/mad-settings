import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { validateRegistration } from "@/lib/registration";

export const runtime = "nodejs";

function client() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("Registration store is not configured.");
  return new ConvexHttpClient(url);
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
