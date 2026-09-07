import { describe, it, expect } from "vitest";
import { apiGet, apiPost, createTestUser } from "./helpers.ts";

describe("GET /api/research/dashboard", () => {
  it("returns empty sections for a fresh user", async () => {
    const uid = await createTestUser("research-fresh");
    const res = await apiGet("/api/research/dashboard", uid);

    expect(res.status).toBe(200);
    expect(res.body.recommendations).toEqual([]);
    expect(res.body.behaviorPatterns).toEqual([]);
    expect(res.body.interventions).toEqual([]);
    expect(Array.isArray(res.body.predictions)).toBe(true);
  });

  it("surfaces active recommendations with a derived priority", async () => {
    const uid = await createTestUser("research-recs");
    await apiPost("/api/recommendations/generate", uid);

    const res = await apiGet("/api/research/dashboard", uid);
    expect(res.body.recommendations.length).toBeGreaterThan(0);
    for (const rec of res.body.recommendations) {
      expect(["High", "Medium", "Low"]).toContain(rec.priority);
    }
  }, 20000);
});
