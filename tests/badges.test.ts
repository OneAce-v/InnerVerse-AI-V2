import { describe, it, expect } from "vitest";
import { apiGet, apiPost, createTestUser } from "./helpers.ts";

describe("GET /api/badges", () => {
  it("starts with every badge locked for a fresh user", async () => {
    const uid = await createTestUser("badges-fresh");
    const res = await apiGet("/api/badges", uid);

    expect(res.status).toBe(200);
    expect(res.body.stats).toEqual({ food: 0, exercises: 0, journals: 0, level: 1, xp: 0, streak: 0 });
    for (const badge of res.body.badges) {
      expect(badge.unlocked).toBe(false);
    }
  });

  it("unlocks the nutrition badge after 3 logged meals, and the vision badge after 1", async () => {
    const uid = await createTestUser("badges-nutrition");
    await apiPost("/api/track/food", uid, { input: "chicken" });
    await apiPost("/api/track/food", uid, { input: "eggs" });
    await apiPost("/api/track/food", uid, { input: "salad" });

    const res = await apiGet("/api/badges", uid);
    const gastronomy = res.body.badges.find((b: any) => b.id === "gastronomy");
    const vision = res.body.badges.find((b: any) => b.id === "vision_expert");

    expect(res.body.stats.food).toBe(3);
    expect(gastronomy.unlocked).toBe(true);
    expect(vision.unlocked).toBe(true);
  });

  it("unlocks the athlete badge only once 3 workouts are logged, not before", async () => {
    const uid = await createTestUser("badges-athlete");
    await apiPost("/api/track/exercise", uid, { input: "run" });
    await apiPost("/api/track/exercise", uid, { input: "lift" });

    let res = await apiGet("/api/badges", uid);
    expect(res.body.badges.find((b: any) => b.id === "athlete").unlocked).toBe(false);

    await apiPost("/api/track/exercise", uid, { input: "yoga" });
    res = await apiGet("/api/badges", uid);
    expect(res.body.badges.find((b: any) => b.id === "athlete").unlocked).toBe(true);
  });

  it("unlocks the monk badge after 2 journal entries", async () => {
    const uid = await createTestUser("badges-monk");
    await apiPost("/api/journal", uid, { content: "First reflection" });
    await apiPost("/api/journal", uid, { content: "Second reflection" });

    const res = await apiGet("/api/badges", uid);
    expect(res.body.badges.find((b: any) => b.id === "monk").unlocked).toBe(true);
  });
});
