import { mutation } from "./_generated/server";
import { v } from "convex/values";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    guests: v.number(),
    stay: v.union(v.literal("sleepover"), v.literal("day"), v.literal("undecided")),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const email = args.email.trim().toLowerCase();
    const phone = args.phone.replace(/[^\d+]/g, "");
    const notes = args.notes?.trim() || undefined;

    if (name.length < 2 || name.length > 80) throw new Error("Enter your name.");
    if (!EMAIL.test(email) || email.length > 120) throw new Error("Enter a valid email.");
    if (phone.replace(/\D/g, "").length < 10 || phone.length > 20) {
      throw new Error("Enter a valid phone or WhatsApp number.");
    }
    if (!Number.isInteger(args.guests) || args.guests < 1 || args.guests > 8) {
      throw new Error("Party size must be between 1 and 8.");
    }
    if (notes && notes.length > 400) throw new Error("Notes are too long.");

    const existing = await ctx.db
      .query("registrations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      throw new Error("This email is already registered for camp.");
    }

    const id = await ctx.db.insert("registrations", {
      name,
      email,
      phone,
      guests: args.guests,
      stay: args.stay,
      notes,
      source: args.source?.slice(0, 80) || "madsettings.theboostnation.space",
      createdAt: Date.now(),
    });

    return { id, email };
  },
});
