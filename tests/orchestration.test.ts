import { describe, it, expect } from "vitest";
import { db } from "../src/db/index.ts";
import { orchestrationTasks } from "../src/db/schema.ts";
import { apiGet, apiPost, createTestUser, getUserId } from "./helpers.ts";

describe("GET /api/orchestration", () => {
  it("seeds a real mission and goals from the user's own profile/twin on first visit", async () => {
    const uid = await createTestUser("orch-seed", { primaryGoal: "Reduce Stress" });

    const res = await apiGet("/api/orchestration", uid);

    expect(res.status).toBe(200);
    expect(res.body.missions.length).toBe(1);
    expect(res.body.missions[0].title).toBe("Achieve: Reduce Stress");
    expect(res.body.goals.length).toBeGreaterThan(0);
  });

  it("does not reseed a second mission on a repeat visit", async () => {
    const uid = await createTestUser("orch-no-reseed");
    await apiGet("/api/orchestration", uid);
    const second = await apiGet("/api/orchestration", uid);
    expect(second.body.missions.length).toBe(1);
  });
});

describe("POST /api/orchestration/missions", () => {
  it("requires a title", async () => {
    const uid = await createTestUser("orch-mission-notitle");
    const res = await apiPost("/api/orchestration/missions", uid, { vision: "no title here" });
    expect(res.status).toBe(400);
  });

  it("creates a mission with a full alignment score", async () => {
    const uid = await createTestUser("orch-mission-create");
    const res = await apiPost("/api/orchestration/missions", uid, { title: "Run a marathon", vision: "Cross the finish line" });
    expect(res.status).toBe(200);
    expect(res.body.mission.title).toBe("Run a marathon");
    expect(res.body.mission.alignmentScore).toBe(100);
  });
});

describe("POST /api/orchestration/tasks/:id/complete", () => {
  it("marks the caller's own task done", async () => {
    const uid = await createTestUser("orch-task-owner");
    const userId = await getUserId(uid);
    const [task] = await db.insert(orchestrationTasks).values({ userId, title: "Owned task" }).returning();

    const res = await apiPost(`/api/orchestration/tasks/${task.id}/complete`, uid);
    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe("done");
  });

  it("does not let a different user complete someone else's task", async () => {
    const owner = await createTestUser("orch-task-victim");
    const attacker = await createTestUser("orch-task-attacker");
    const ownerId = await getUserId(owner);
    const [task] = await db.insert(orchestrationTasks).values({ userId: ownerId, title: "Not yours" }).returning();

    const res = await apiPost(`/api/orchestration/tasks/${task.id}/complete`, attacker);
    expect(res.status).toBe(404);
  });

  it("rejects a non-numeric task id", async () => {
    const uid = await createTestUser("orch-task-badid");
    const res = await apiPost("/api/orchestration/tasks/not-a-number/complete", uid);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/orchestration/decision", () => {
  it("returns a structured decision even without a real Gemini key", async () => {
    const uid = await createTestUser("orch-decision");
    const res = await apiPost("/api/orchestration/decision", uid, { query: "Should I take the new job?" });

    expect(res.status).toBe(200);
    expect(res.body.decision.optionA).toBeDefined();
    expect(res.body.decision.optionB).toBeDefined();
    expect(typeof res.body.decision.recommendation).toBe("string");
  });
});
