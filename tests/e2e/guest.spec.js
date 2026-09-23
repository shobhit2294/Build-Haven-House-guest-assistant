import { test, expect } from "@playwright/test";
import { checkAvailability } from "../../server/domain.js";
test("device location permission sends coordinates and renders distances", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 18.5204, longitude: 73.8567 });
  let payload;
  await page.route("**/api/chat", async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ json: {
      answer: "Hotels near your current location, closest first.", mode: "location",
      context: { location: "Goa, India", topic: "nearbyHotels" },
      notice: "Approximate straight-line distances from your device location.",
      nearbyHotels: [{ name: "Nearby Test Hotel", distance: "250 m", type: "Hotel", reason: "From your location" }],
    } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByText("Nearby Test Hotel")).toBeVisible();
  await expect(page.getByText("250 m", { exact: true })).toBeVisible();
  expect(payload.position).toEqual({ lat: 18.5204, lon: 73.8567 });
  await page.getByLabel("Your question").fill("Pool?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("button", { name: "Use my location" })).toBeEnabled();
  expect(payload.position).toBeUndefined();
});

test("denied device location shows a recoverable error without searching", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", { value: {
      getCurrentPosition: (_success, failure) => failure({ code: 1 }),
    } });
  });
  let calls = 0;
  await page.route("**/api/chat", route => { calls++; return route.abort(); });
  await page.goto("/");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByRole("alert")).toContainText("permission was denied");
  await expect(page.getByRole("button", { name: "Search", exact: true })).toBeEnabled();
  expect(calls).toBe(0);
});
const nextDate = (n) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
test("guest journey: real backend facts, follow-up, availability, unknown and reset", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Local guide · demo", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Your question").fill("Does the hotel have a pool?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(/Our outdoor swimming pool/)).toBeVisible();
  await page.getByLabel("Your question").fill("And when is it open?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(/Our outdoor swimming pool/)).toHaveCount(2);
  await page.getByLabel("Your question").fill("Are rooms available?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(/Please choose your check-in/)).toBeVisible();
  await expect(page.getByLabel("Check-in", { exact: true })).toBeFocused();
  // Choose a positive fixture dynamically: some deterministic dates sell out.
  const offset = Array.from({ length: 30 }, (_, i) => i + 10).find(
    (n) => checkAvailability(nextDate(n), nextDate(n + 1), 2).rooms.length > 0,
  );
  expect(offset).toBeDefined();
  await page.getByLabel("Check-in", { exact: true }).fill(nextDate(offset));
  await page.getByLabel("Check-out", { exact: true }).fill(nextDate(offset + 1));
  await page.getByLabel("Guests", { exact: true }).selectOption("2");
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/chat") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Check availability" }).click();
  const data = await (await response).json();
  expect(data.availability.mock).toBe(true);
  expect(data.availability.rooms.length).toBeGreaterThan(0);
  await expect(
    page.getByText("Simulated room-only totals", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Your question").fill("Is there a helipad?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByText(/I don't have verified information/),
  ).toBeVisible();
  await page.getByRole("button", { name: "New chat" }).click();
  await expect(page.getByText(/Our outdoor swimming pool/)).toHaveCount(0);
});
test("loading disables duplicate submission and shows processing", async ({
  page,
}) => {
  await page.route("**/api/chat", async (route) => {
    await new Promise((r) => setTimeout(r, 700));
    await route.continue();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "What time is check-in?" }).click();
  await expect(page.getByRole("status")).toContainText("Looking into");
  await expect(
    page.getByRole("button", { name: "Send message" }),
  ).toBeDisabled();
  await expect(page.getByText(/Check-in is from 3:00 PM/)).toBeVisible();
});
test("network failure is recoverable with retry", async ({ page }) => {
  let fail = true;
  await page.route("**/api/chat", (route) =>
    fail ? route.abort() : route.continue(),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "What time is check-in?" }).click();
  await expect(page.getByRole("alert")).toContainText("connect");
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText(/Check-in is from 3:00 PM/)).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
test("no rooms and invalid date order are clearly explained", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Check-in", { exact: true }).fill(nextDate(10));
  await page.getByLabel("Check-out", { exact: true }).fill(nextDate(10));
  await page.getByRole("button", { name: "Check availability" }).click();
  await expect(page.getByRole("alert")).toContainText("after check-in");
  await page.getByLabel("Check-out", { exact: true }).fill(nextDate(11));
  await page.getByLabel("Guests", { exact: true }).selectOption("8");
  await page.getByRole("button", { name: "Check availability" }).click();
  await expect(page.getByText(/No single room is available/)).toBeVisible();
});
test("mobile layout remains usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Your question").fill("Is breakfast included?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(/Breakfast is served/)).toBeVisible();
  await page.getByLabel("Check-in", { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByLabel("Check-in", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});
test("desktop preview", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(
    page.getByText("Local guide · demo", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
});

test("chat location overrides the search field without showing unrelated demo hotels", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Your question").fill("Hotels in Pune, India");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(/could not find nearby hotel listings for Pune, India/)).toBeVisible();
  await expect(page.getByLabel("Search location")).toHaveValue("Pune, India");
  await page.getByLabel("Search location").fill("Goa");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText(/not live search results/)).toBeVisible();
});
