"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CAMP_DATE, CAMP_START, TICKETS, naira, type TicketId } from "@/data/tickets";

type Status = "idle" | "submitting" | "done" | "error";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState(1);
  const [ticketId, setTicketId] = useState<TicketId>("attendee");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [savedEmail, setSavedEmail] = useState("");

  const ticket = TICKETS.find((t) => t.id === ticketId)!;
  // Attendee is priced per person; a tent is one price for the people it sleeps.
  const people = ticket.id === "attendee" ? guests : ticket.people;
  const total = ticket.id === "attendee" ? ticket.price * guests : ticket.price;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("submitting");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          guests: people,
          stay: ticket.stay,
          notes: [`Ticket: ${ticket.name} × ${ticket.id === "attendee" ? guests : 1} = ${naira(total)}`, notes.trim()].filter(Boolean).join(" · ").slice(0, 400),
          website,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; email?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setError(data.error || "Could not register. Try again.");
        return;
      }
      setSavedEmail(data.email || email);
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Network error. Check your connection and try again.");
    }
  }

  return (
    <main className="min-h-screen bg-brand-cream text-brand-black flex items-center justify-center p-6 py-16">
      <div className="w-full max-w-lg">
        <p className="font-display font-bold text-xs tracking-widest uppercase text-brand-purple mb-3">
          MAD SETTINGS · {CAMP_DATE} · FROM {CAMP_START.toUpperCase()}
        </p>
        <h1 className="font-display font-black text-5xl md:text-6xl uppercase italic leading-none">
          Register<br />
          <span className="text-brand-purple">for camp.</span>
        </h1>
        <p className="mt-4 font-body text-lg text-brand-black/70">
          Pick your ticket and save your spot for the pop-up · bonfire · sleepover. We will send you how to pay on WhatsApp.
        </p>

        {status === "done" ? (
          <div className="mt-10 p-8 poster-border poster-shadow bg-brand-black text-brand-cream" role="status">
            <div className="font-display font-black text-3xl uppercase italic mb-3">You are in.</div>
            <p className="font-body text-lg">
              {ticket.name} · <strong>{naira(total)}</strong> saved for <strong>{savedEmail}</strong>. We will send you how to pay on WhatsApp.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex min-h-11 items-center px-6 py-3 bg-brand-acid text-brand-black font-display font-black uppercase poster-border"
            >
              Back to camp →
            </Link>
          </div>
        ) : (
          <form className="mt-10 p-6 md:p-8 poster-border poster-shadow bg-white space-y-5" onSubmit={onSubmit} noValidate>
            <div className="sr-only" aria-hidden="true">
              <label>
                Website
                <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </label>
            </div>

            <Field label="Full name" htmlFor="reg-name">
              <input
                id="reg-name"
                name="name"
                autoComplete="name"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="reg-input"
              />
            </Field>

            <Field label="Email" htmlFor="reg-email">
              <input
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="reg-input"
              />
            </Field>

            <Field label="Phone / WhatsApp" htmlFor="reg-phone" hint="Include country code, e.g. +234…">
              <input
                id="reg-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="reg-input"
              />
            </Field>

            <fieldset>
              <legend className="block font-display font-black text-xs uppercase tracking-widest mb-2">Ticket</legend>
              <div className="grid gap-3">
                {TICKETS.map((t) => (
                  <label
                    key={t.id}
                    className={`flex items-center justify-between gap-3 p-4 poster-border cursor-pointer ${
                      ticketId === t.id ? "bg-brand-acid" : "bg-brand-cream"
                    }`}
                  >
                    <input
                      type="radio"
                      name="ticket"
                      value={t.id}
                      checked={ticketId === t.id}
                      onChange={() => setTicketId(t.id)}
                      className="sr-only"
                    />
                    <span>
                      <span className="block font-display font-black uppercase text-lg leading-tight">{t.name}</span>
                      <span className="block font-body text-sm text-brand-black/60">{t.note}</span>
                    </span>
                    <span className="font-display font-black text-xl whitespace-nowrap">{naira(t.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {ticket.id === "attendee" && (
              <Field label="How many people" htmlFor="reg-guests">
                <select
                  id="reg-guests"
                  name="guests"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="reg-input"
                >
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="flex items-baseline justify-between p-4 bg-brand-black text-brand-cream poster-border">
              <span className="font-display font-black uppercase text-sm tracking-widest">Total</span>
              <span className="font-display font-black text-2xl">{naira(total)}</span>
            </div>

            <Field label="Anything we should know" htmlFor="reg-notes" hint="Optional">
              <textarea
                id="reg-notes"
                name="notes"
                rows={3}
                maxLength={400}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="reg-input min-h-24"
              />
            </Field>

            {error && (
              <p className="font-display font-bold text-sm text-brand-coral" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full min-h-12 py-4 bg-brand-purple text-brand-cream font-display font-black uppercase tracking-tighter text-xl poster-border poster-shadow disabled:opacity-50"
            >
              {status === "submitting" ? "Saving…" : `Book my spot · ${naira(total)}`}
            </button>
            <p className="text-center font-body text-sm text-brand-black/50">
              Already playing tonight?{" "}
              <a href="/join" className="underline font-bold text-brand-purple">
                Join the games
              </a>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block font-display font-black text-xs uppercase tracking-widest mb-2">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 font-body text-xs text-brand-black/50">{hint}</p>}
    </div>
  );
}
