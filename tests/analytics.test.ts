import { describe, it, expect } from "vitest";
import { apiGet, apiPost, createTestUser } from "./helpers.ts";

describe("GET /api/analytics", () => {
  it("returns empty arrays for a fresh user", async () => {
    const uid = await createTestUser("analytics-fresh");
    const res = await apiGet("/api/analytics", uid);
    expect(res.status).toBe(200);
    expect(res.body.food).toEqual([]);
    expect(res.body.exercise).toEqual([]);
  });

  it("reflects real logged food and exercise", async () => {
    const uid = await createTestUser("analytics-logged");
    await apiPost("/api/track/food", uid, { input: "chicken" });
    await apiPost("/api/track/exercise", uid, { input: "run" });

    const res = await apiGet("/api/analytics", uid);
    expect(res.body.food.length).toBe(1);
    expect(res.body.exercise.length).toBe(1);
  });

  it("only returns this user's own logs, not another user's", async () => {
    const userA = await createTestUser("analytics-a");
    const userB = await createTestUser("analytics-b");
    await apiPost("/api/track/food", userA, { input: "chicken" });

    const res = await apiGet("/api/analytics", userB);
    expect(res.body.food).toEqual([]);
  });
});
