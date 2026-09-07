import { describe, it, expect } from "vitest";
import { apiGet, apiPost, createTestUser } from "./helpers.ts";

describe("GET /api/digital-twin", () => {
  it("returns a baseline twin for a fresh user", async () => {
    const uid = await createTestUser("twin-baseline");
    const res = await apiGet("/api/digital-twin", uid);
    expect(res.status).toBe(200);
    expect(res.body.twin.physical).toBeDefined();
    expect(typeof res.body.twin.physical.score).toBe("number");
  });
});

describe("POST /api/digital-twin/recalibrate", () => {
  it("recalibrates the twin and logs a notification about it", async () => {
    const uid = await createTestUser("twin-recalibrate");
    const res = await apiPost("/api/digital-twin/recalibrate", uid);

    expect(res.status).toBe(200);
    expect(res.body.twin.overallHealthIndex.score).toBeGreaterThanOrEqual(0);

    const notifs = await apiGet("/api/notifications", uid);
    const recalNotif = notifs.body.notifications.find((n: any) => n.title === "Digital Twin Recalibrated");
    expect(recalNotif).toBeDefined();
  }, 15000);
});

describe("POST /api/digital-twin/update", () => {
  it("requires a stateName", async () => {
    const uid = await createTestUser("twin-update-missing");
    const res = await apiPost("/api/digital-twin/update", uid, { score: 80 });
    expect(res.status).toBe(400);
  });

  it("updates a single named dimension", async () => {
    const uid = await createTestUser("twin-update");
    const res = await apiPost("/api/digital-twin/update", uid, {
      stateName: "sleep",
      score: 88,
      trend: "up",
      supportingEvidence: "Test-seeded evidence",
      aiSummary: "Test-seeded summary",
    });

    expect(res.status).toBe(200);
    expect(res.body.twin.sleep.score).toBe(88);
    expect(res.body.twin.sleep.trend).toBe("up");
  });
});

describe("GET /api/digital-twin/history", () => {
  it("records a snapshot after each recalibration", async () => {
    const uid = await createTestUser("twin-history");
    await apiPost("/api/digital-twin/recalibrate", uid);

    const res = await apiGet("/api/digital-twin/history", uid);
    expect(res.status).toBe(200);
    expect(res.body.history.length).toBeGreaterThan(0);
  }, 15000);
});

describe("GET /api/digital-twin/dependencies", () => {
  it("returns the static dependency graph with no auth-dependent data", async () => {
    const uid = await createTestUser("twin-deps");
    const res = await apiGet("/api/digital-twin/dependencies", uid);
    expect(res.status).toBe(200);
    expect(res.body.dependencies).toBeDefined();
  });
});

describe("GET /api/digital-twin/contributors", () => {
  it("returns contribution data for a user", async () => {
    const uid = await createTestUser("twin-contributors");
    const res = await apiGet("/api/digital-twin/contributors", uid);
    expect(res.status).toBe(200);
    expect(res.body.contributors).toBeDefined();
  });
});

describe("GET /api/digital-twin/goals", () => {
  it("returns goal data for a user", async () => {
    const uid = await createTestUser("twin-goals");
    const res = await apiGet("/api/digital-twin/goals", uid);
    expect(res.status).toBe(200);
    expect(res.body.goals).toBeDefined();
  });
});

describe("GET /api/digital-twin/confidence", () => {
  it("returns confidence data for a user", async () => {
    const uid = await createTestUser("twin-confidence");
    const res = await apiGet("/api/digital-twin/confidence", uid);
    expect(res.status).toBe(200);
    expect(res.body.confidence).toBeDefined();
  });
});
