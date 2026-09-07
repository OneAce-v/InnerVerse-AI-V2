import { describe, it, expect } from "vitest";
import { apiGet, apiPost, createTestUser } from "./helpers.ts";

describe("GET /api/cognition", () => {
  it("returns a baseline semantic memory (from profile-triggered recalibration) and no experiments yet", async () => {
    const uid = await createTestUser("cognition-fresh");
    const res = await apiGet("/api/cognition", uid);

    expect(res.status).toBe(200);
    // Profile creation triggers a recalibration, which itself records one semantic
    // memory - so "fresh" here means no experiments yet, not literally zero memories.
    expect(res.body.memorySystem.length).toBe(1);
    expect(res.body.memorySystem[0].type).toBe("Semantic");
    expect(res.body.researchExperiments).toEqual([]);
    expect(typeof res.body.twinProjections.currentBaseline).toBe("string");
  });

  it("aggregates real cognitive memory entries written by journaling", async () => {
    const uid = await createTestUser("cognition-memory");
    await apiPost("/api/journal", uid, { content: "Reflecting on today" });

    const res = await apiGet("/api/cognition", uid);
    const episodic = res.body.memorySystem.find((m: any) => m.type === "Episodic");
    expect(episodic).toBeDefined();
    expect(episodic.count).toBe(1);
  });

  it("counts recalibrations toward decisionAudits", async () => {
    const uid = await createTestUser("cognition-audits");
    await apiPost("/api/digital-twin/recalibrate", uid);

    const res = await apiGet("/api/cognition", uid);
    expect(res.body.metaReasoning.decisionAudits).toBeGreaterThan(0);
  }, 15000);
});

describe("POST /api/cognition/experiments", () => {
  it("requires a hypothesis", async () => {
    const uid = await createTestUser("cognition-exp-nohyp");
    const res = await apiPost("/api/cognition/experiments", uid, {});
    expect(res.status).toBe(400);
  });

  it("creates a running experiment that shows up on the cognition view", async () => {
    const uid = await createTestUser("cognition-exp-create");
    await apiPost("/api/cognition/experiments", uid, { hypothesis: "Morning meditation reduces stress" });

    const res = await apiGet("/api/cognition", uid);
    expect(res.body.researchExperiments.length).toBe(1);
    expect(res.body.researchExperiments[0].hypothesis).toBe("Morning meditation reduces stress");
    expect(res.body.researchExperiments[0].status).toBe("running");
  });
});
