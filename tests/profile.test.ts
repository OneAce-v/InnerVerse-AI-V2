import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import { profiles } from "../src/db/schema.ts";
import { apiGet, apiPost, testUid, getUserId } from "./helpers.ts";

describe("POST /api/profile", () => {
  it("computes a fallback archetype when goal/level/activity are all submitted together", async () => {
    const uid = testUid("profile-full");
    await apiPost("/api/auth/sync", uid);

    const res = await apiPost("/api/profile", uid, {
      age: 25,
      primaryGoal: "Weight Loss",
      fitnessLevel: "Beginner",
      activityLevel: "Active",
      dietType: "Balanced",
    });

    expect(res.status).toBe(200);
    expect(res.body.profile.fitnessArchetype).toBe("The Metabolism Optimizer");
    expect(res.body.profile.motivationType).toBe("Goal-Oriented Habituation");
  });

  it("picks a different fallback archetype for a muscle-gain goal", async () => {
    const uid = testUid("profile-muscle");
    await apiPost("/api/auth/sync", uid);

    const res = await apiPost("/api/profile", uid, {
      primaryGoal: "Muscle Gain",
      fitnessLevel: "Advanced",
      activityLevel: "Very Active",
    });

    expect(res.body.profile.fitnessArchetype).toBe("The Hypertrophy Architect");
    expect(res.body.profile.recoveryCapacity).toBe("High Capacity");
  });

  it("flags high stress in the wellness archetype", async () => {
    const uid = testUid("profile-stress");
    await apiPost("/api/auth/sync", uid);

    const res = await apiPost("/api/profile", uid, {
      primaryGoal: "Fitness",
      fitnessLevel: "Intermediate",
      activityLevel: "Active",
      stressLevel: 9,
    });

    expect(res.body.profile.wellnessArchetype).toBe("The Stress Resilience Explorer");
  });

  // Regression test: a partial update used to unconditionally spread a default
  // { fitnessArchetype: null, ... } object into the upsert's SET clause, silently
  // wiping out archetypes computed by an earlier, fuller submission.
  it("does not wipe previously computed archetypes on a partial update", async () => {
    const uid = testUid("profile-partial");
    await apiPost("/api/auth/sync", uid);
    await apiPost("/api/profile", uid, {
      primaryGoal: "Weight Loss",
      fitnessLevel: "Beginner",
      activityLevel: "Active",
    });

    const partial = await apiPost("/api/profile", uid, { dietType: "Vegan" });

    expect(partial.status).toBe(200);
    expect(partial.body.profile.dietType).toBe("Vegan");
    expect(partial.body.profile.fitnessArchetype).toBe("The Metabolism Optimizer");
  });

  it("preserves fields from an earlier request that a later partial update omits", async () => {
    const uid = testUid("profile-preserve");
    await apiPost("/api/auth/sync", uid);
    await apiPost("/api/profile", uid, { age: 40, gender: "male", primaryGoal: "Better Sleep" });

    const partial = await apiPost("/api/profile", uid, { sleepDuration: "7-8 hours" });

    expect(partial.body.profile.age).toBe(40);
    expect(partial.body.profile.gender).toBe("male");
    expect(partial.body.profile.primaryGoal).toBe("Better Sleep");
    expect(partial.body.profile.sleepDuration).toBe("7-8 hours");
  });

  it("rejects a request with no auth token", async () => {
    const res = await fetch("http://localhost:3000/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ age: 30 }),
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/profile", () => {
  it("returns null for a user with no profile yet", async () => {
    const uid = testUid("profile-none");
    await apiPost("/api/auth/sync", uid);

    const res = await apiGet("/api/profile", uid);
    expect(res.status).toBe(200);
    expect(res.body.profile).toBeNull();
  });

  it("self-corrects a stale level to match the real xp total", async () => {
    const uid = testUid("profile-level");
    await apiPost("/api/auth/sync", uid);
    await apiPost("/api/profile", uid, { age: 22 });

    const userId = await getUserId(uid);
    // 600 xp should be level 4 (see calculateLevel), but force a wrong stored level.
    await db.update(profiles).set({ xp: 600, level: 1 }).where(eq(profiles.userId, userId));

    const res = await apiGet("/api/profile", uid);
    expect(res.body.profile.xp).toBe(600);
    expect(res.body.profile.level).toBe(4);
  });
});
