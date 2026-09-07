import { describe, it, expect } from "vitest";
import { apiGet, apiPost, createTestUser, testUid } from "./helpers.ts";

describe("POST /api/recommendations/generate", () => {
  it("rejects a user with no profile", async () => {
    const uid = testUid("recs-no-profile");
    await apiPost("/api/auth/sync", uid);

    const res = await apiPost("/api/recommendations/generate", uid);
    expect(res.status).toBe(400);
  });

  it("generates and persists recommendations for a user with a profile", async () => {
    const uid = await createTestUser("recs-generate");

    const res = await apiPost("/api/recommendations/generate", uid);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.recommendations)).toBe(true);
    expect(res.body.recommendations.length).toBeGreaterThan(0);
    for (const rec of res.body.recommendations) {
      expect(typeof rec.agentType).toBe("string");
      expect(typeof rec.title).toBe("string");
    }
  }, 20000);
});

describe("GET /api/recommendations", () => {
  it("returns an empty list before any have been generated", async () => {
    const uid = await createTestUser("recs-empty");
    const res = await apiGet("/api/recommendations", uid);
    expect(res.status).toBe(200);
    expect(res.body.recommendations).toEqual([]);
  });
});

describe("GET /api/briefings", () => {
  it("rejects a user with no profile", async () => {
    const uid = testUid("briefing-no-profile");
    await apiPost("/api/auth/sync", uid);
    const res = await apiGet("/api/briefings", uid);
    expect(res.status).toBe(400);
  });

  it("generates a daily briefing for a user with a profile", async () => {
    const uid = await createTestUser("briefing-daily");
    const res = await apiGet("/api/briefings?timeframe=daily", uid);
    expect(res.status).toBe(200);
    expect(res.body.briefing).toBeDefined();
  }, 20000);
});

describe("POST /api/simulation", () => {
  it("returns a structured simulation result even without a real Gemini key", async () => {
    const uid = await createTestUser("simulation");
    const res = await apiPost("/api/simulation", uid, { query: "What happens if I sleep 8 hours every night?" });

    expect(res.status).toBe(200);
    expect(res.body.simulation).toBeDefined();
    expect(typeof res.body.simulation.hdi).toBe("string");
    expect(typeof res.body.simulation.explanation).toBe("string");
  }, 15000);
});

describe("POST /api/omnibar", () => {
  it("answers a quick question with a fallback response", async () => {
    const uid = await createTestUser("omnibar");
    const res = await apiPost("/api/omnibar", uid, { query: "How is my progress?" });
    expect(res.status).toBe(200);
    expect(typeof res.body.answer).toBe("string");
    expect(res.body.answer.length).toBeGreaterThan(0);
  });
});
