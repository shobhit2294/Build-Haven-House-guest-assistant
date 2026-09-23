import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import handler from "../api/[...path].js";

test("Vercel entry point serves health and JSON API errors", async () => {
  const health = await request(handler).get("/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.body.status, "ok");
  const invalid = await request(handler).post("/api/chat").send({ message: "" });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error, "Please check your details.");
  const missing = await request(handler).get("/api/not-found");
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error, "API route not found");
});
