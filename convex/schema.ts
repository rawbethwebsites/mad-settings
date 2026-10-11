import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  registrations: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    guests: v.number(),
    stay: v.union(v.literal("sleepover"), v.literal("day"), v.literal("undecided")),
    notes: v.optional(v.string()),
    source: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),
});
