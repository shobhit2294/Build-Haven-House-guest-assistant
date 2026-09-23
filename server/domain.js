import { readFileSync } from "node:fs";
import { z } from "zod";
export const hotel = JSON.parse(
  readFileSync(new URL("./hotel.json", import.meta.url)),
);
export const topics = Object.keys(hotel.facts);
export const day = 86400000;
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      Number.isFinite(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Use a valid calendar date",
  );
export const staySchema = z
  .object({
    checkIn: date,
    checkOut: date,
    adults: z.number().int().min(1).max(8),
  })
  .strict()
  .superRefine((v, c) => {
    if (v.checkIn < today())
      c.addIssue({
        code: "custom",
        path: ["checkIn"],
        message: "Check-in cannot be in the past (India time)",
      });
    const nights = (Date.parse(v.checkOut) - Date.parse(v.checkIn)) / day;
    if (!(nights >= 1 && nights <= 30))
      c.addIssue({
        code: "custom",
        path: ["checkOut"],
        message: "Choose a stay of 1–30 nights",
      });
    if (Date.parse(v.checkIn) > Date.parse(today()) + 365 * day)
      c.addIssue({
        code: "custom",
        path: ["checkIn"],
        message: "Choose arrival within the next 365 days",
      });
  });
export const chatSchema = z
  .object({
    message: z.string().trim().min(1).max(1500),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().max(4000),
          })
          .strict(),
      )
      .max(12)
      .default([]),
    context: z
      .object({
        topic: z
          .enum([...topics, "availability", "nearbyHotels", "unknown"])
          .optional(),
        location: z.string().max(80).optional(),
      })
      .strict()
      .default({}),
    stay: staySchema.optional(),
  })
  .strict();
// Stable across runs: use the minimum remaining inventory across ALL nights.
export function checkAvailability(checkIn, checkOut, adults) {
  const stay = staySchema.parse({ checkIn, checkOut, adults });
  const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / day;
  const rooms = hotel.rooms
    .filter((r) => r.capacity >= adults)
    .map((r) => {
      let available = r.inventory;
      for (let t = Date.parse(checkIn); t < Date.parse(checkOut); t += day) {
        const n = Math.floor(t / day);
        const occupied = (n * 7 + r.capacity * 11) % (r.inventory + 1);
        available = Math.min(available, r.inventory - occupied);
      }
      return { ...r, available, total: r.nightlyRate * nights };
    })
    .filter((r) => r.available > 0);
  return {
    ...stay,
    nights,
    currency: hotel.currency,
    rooms,
    mock: true,
    priceNote:
      "Simulated room-only totals, excluding taxes and extras. No reservation is made.",
  };
}
export function resolveNearbyHotels(area = "") {
  return hotel.nearbyHotels?.goa || [];
}

export function localRoute(message, context = {}) {
  const m = message.toLowerCase();
  if (/availab|vacanc|book|reserv|check rooms|rooms? for.*\d{4}-/.test(m))
    return ["availability"];
  if (
    /nearby.*hotel|hotels?.*(near|around)|search.*(hotel|stay).*in|in\s+(pune|mumbai|goa|bangalore|jaipur|delhi|hyderabad)/.test(
      m,
    )
  )
    return ["nearbyHotels"];
  const rules = {
    checkin: /check.?in|check.?out|early arrival|late departure/,
    pool: /pool|swim/,
    breakfast: /breakfast/,
    cancellation: /cancel|refund|no.show/,
    rooms: /room|three guests|3 guests|suite|beds?/,
    wifi: /wi.?fi|internet/,
    parking: /park/,
    pets: /pets?|dogs?|cats?/,
    accessibility: /accessib|wheelchair|step.free/,
    contact: /contact|reception|phone|email/,
  };
  const found = Object.entries(rules)
    .filter(([, r]) => r.test(m))
    .map(([k]) => k);
  if (found.length) return found;
  if (
    /^(and |what about |is it |does it |when |what time|how much|is that)/.test(
      m,
    ) &&
    [...topics, "availability", "nearbyHotels"].includes(context.topic)
  )
    return [context.topic];
  return ["unknown"];
}
export const unknownAnswer =
  "I don't have verified information about that in the hotel guide. Please ask reception to confirm. I can help with rooms, breakfast, check-in, the pool and cancellation policies.";
