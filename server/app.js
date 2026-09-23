import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  hotel,
  chatSchema,
  staySchema,
  checkAvailability,
  unknownAnswer,
  resolveNearbyHotels,
} from "./domain.js";
import { routeQuestion } from "./ai.js";
export function createApp({
  aiOptions = {},
  logger = console.log,
  rateLimitEnabled = true,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use((req, res, next) => {
    const start = Date.now();
    req.id = randomUUID();
    res.set("X-Request-Id", req.id);
    res.on("finish", () =>
      logger(
        JSON.stringify({
          requestId: req.id,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Date.now() - start,
        }),
      ),
    );
    next();
  });
  app.use(express.json({ limit: "32kb" }));
  if (rateLimitEnabled)
    app.use(
      "/api",
      rateLimit({
        windowMs: 60000,
        limit: 60,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { error: "Too many requests. Please wait a minute." },
      }),
    );
  app.get("/api/health", (_req, res) =>
    res.json({
      status: "ok",
      hotel: hotel.name,
      mode:
        process.env.GROQ_API_KEY && process.env.DEMO_MODE !== "true"
          ? "groq"
          : "demo",
    }),
  );
  app.post("/api/availability", (req, res, next) => {
    try {
      const s = staySchema.parse(req.body);
      res.json(checkAvailability(s.checkIn, s.checkOut, s.adults));
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/chat", async (req, res, next) => {
    try {
      const input = chatSchema.parse(req.body);
      const route = await routeQuestion(input, aiOptions);
      const requestedArea = hotel.location;
      const wantsAvailability =
        !!input.stay || route.topics.includes("availability");
      const wantsNearbyHotels = route.topics.includes("nearbyHotels");
      let availability = null;
      let nearbyHotels = [];
      const facts = route.topics.filter((t) => hotel.facts[t]);
      let answer = facts.map((t) => hotel.facts[t]).join("\n\n");

      if (wantsAvailability) {
        if (input.stay) {
          availability = checkAvailability(
            input.stay.checkIn,
            input.stay.checkOut,
            input.stay.adults,
          );
          answer +=
            (answer ? "\n\n" : "") +
            (availability.rooms.length
              ? `I found ${availability.rooms.length} simulated room option(s) for your ${availability.nights}-night stay.`
              : "No single room is available for your dates and guest count in our demo inventory. You could try a shorter stay, different dates, or ask reception about booking multiple rooms.");
        } else
          answer +=
            (answer ? "\n\n" : "") +
            "Please choose your check-in date, check-out date and number of guests in the stay form. I will check our simulated inventory.";
      }

      if (wantsNearbyHotels) {
        nearbyHotels = resolveNearbyHotels(requestedArea);
        const areaLabel = requestedArea.trim() || hotel.location;
        answer =
          nearbyHotels.length > 0
            ? `I found a few nearby stay options in ${areaLabel}.`
            : `I could not find a nearby hotel list for ${areaLabel}. Please try a major city or area near your destination.`;
      }

      if (!answer) answer = unknownAnswer;
      if (route.topics.includes("unknown") && facts.length)
        answer += "\n\n" + unknownAnswer;
      res.json({
        answer,
        mode: route.mode,
        context: {
          topic: wantsNearbyHotels
            ? "nearbyHotels"
            : wantsAvailability
              ? "availability"
              : route.topics.at(-1),
          location: requestedArea.trim() || hotel.location,
        },
        needsStay: wantsAvailability && !input.stay,
        availability,
        nearbyHotels,
        sources: facts.map((id) => ({ id, label: `Hotel guide · ${id}` })),
        notice:
          route.mode === "fallback"
            ? "AI is temporarily unavailable. This answer uses the local hotel guide."
            : route.mode === "demo"
              ? "Demo mode · answering from the local hotel guide."
              : null,
      });
    } catch (e) {
      next(e);
    }
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API route not found" }),
  );
  const dist = fileURLToPath(new URL("../dist", import.meta.url));
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(`${dist}/index.html`));
  app.use((err, req, res, _next) => {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({
          error: "Please check your details.",
          details: err.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
          requestId: req.id,
        });
    const status =
      err.status === 413 ? 413 : err.type === "entity.parse.failed" ? 400 : 500;
    res
      .status(status)
      .json({
        error:
          status === 413
            ? "Request is too large."
            : status === 400
              ? "Invalid JSON request."
              : "Something went wrong. Please try again.",
        requestId: req.id,
      });
  });
  return app;
}
