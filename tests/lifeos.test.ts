import { describe, it, expect } from "vitest";
import { apiGet, createTestUser } from "./helpers.ts";

describe("GET /api/lifeos/status", () => {
  it("returns a coherent status shape for a fresh user", async () => {
    const uid = await createTestUser("lifeos-fresh");
    const res = await apiGet("/api/lifeos/status", uid);

    expect(res.status).toBe(200);
    expect(["Active", "Idle"]).toContain(res.body.supervisorStatus);
    expect(res.body.systemHealth).toBe("Optimal");
    expect(res.body.agents.length).toBe(5);
    expect(res.body.dailyPlan.nextTask).toBe("No tasks scheduled today");
    expect(Array.isArray(res.body.activeOptimizations)).toBe(true);
  });
});
