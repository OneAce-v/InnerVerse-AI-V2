import { describe, it, expect } from "vitest";
import { apiGet, createTestUser } from "./helpers.ts";

describe("GET /api/admin/health", () => {
  it("reports real database and Gemini gateway status", async () => {
    const uid = await createTestUser("admin-health");
    const res = await apiGet("/api/admin/health", uid);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Healthy");
    expect(res.body.services.find((s: any) => s.name === "PostgreSQL Primary").status).toBe("operational");
    expect(typeof res.body.metrics.totalUsers).toBe("number");
    expect(res.body.metrics.totalUsers).toBeGreaterThan(0);
  });

  it("rejects a request with no auth token", async () => {
    const res = await fetch("http://localhost:3000/api/admin/health");
    expect(res.status).toBe(401);
  });
});
