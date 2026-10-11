export const STAY_OPTIONS = [
  { value: "sleepover", label: "Sleepover — I am staying the night" },
  { value: "day", label: "Day guest — I will leave before lights-out" },
  { value: "undecided", label: "Not sure yet" },
] as const;

export type Stay = (typeof STAY_OPTIONS)[number]["value"];

export type RegistrationInput = {
  name: string;
  email: string;
  phone: string;
  guests: number;
  stay: Stay;
  notes?: string;
  website?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(body: unknown): { ok: true; data: RegistrationInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Send a registration form." };
  const b = body as Record<string, unknown>;
  if (typeof b.website === "string" && b.website.trim()) {
    return { ok: false, error: "Could not submit. Refresh and try again." };
  }
  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const phone = String(b.phone ?? "").trim();
  const guests = Number(b.guests);
  const stay = String(b.stay ?? "");
  const notes = String(b.notes ?? "").trim();

  if (name.length < 2) return { ok: false, error: "Enter your name." };
  if (name.length > 80) return { ok: false, error: "Name is too long." };
  if (!EMAIL.test(email)) return { ok: false, error: "Enter a valid email." };
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return { ok: false, error: "Enter a valid phone or WhatsApp number." };
  if (!Number.isInteger(guests) || guests < 1 || guests > 8) {
    return { ok: false, error: "Party size must be between 1 and 8." };
  }
  if (!STAY_OPTIONS.some((o) => o.value === stay)) {
    return { ok: false, error: "Pick how you plan to stay." };
  }
  if (notes.length > 400) return { ok: false, error: "Notes are too long." };

  return {
    ok: true,
    data: {
      name,
      email,
      phone,
      guests,
      stay: stay as Stay,
      notes: notes || undefined,
    },
  };
}
