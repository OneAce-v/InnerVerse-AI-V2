import { describe, it, expect } from "vitest";
import { apiGet, apiPost, createTestUser } from "./helpers.ts";

describe("POST /api/track/food", () => {
  it("rejects an empty input", async () => {
    const uid = await createTestUser("food-empty");
    const res = await apiPost("/api/track/food", uid, { input: "   " });
    expect(res.status).toBe(400);
  });

  it("classifies a protein-heavy meal via the deterministic fallback heuristic", async () => {
    const uid = await createTestUser("food-protein");
    const res = await apiPost("/api/track/food", uid, { input: "grilled chicken breast with steak" });

    expect(res.status).toBe(200);
    expect(res.body.log.item).toBe("Protein-Dense Meat Bowl");
    expect(res.body.log.calories).toBe(550);
    expect(res.body.log.protein).toBe(40);
  });

  it("classifies a carb-heavy meal differently", async () => {
    const uid = await createTestUser("food-carb");
    const res = await apiPost("/api/track/food", uid, { input: "a large plate of pasta and bread" });

    expect(res.body.log.item).toBe("Carbohydrate Enrichment Meal");
    expect(res.body.log.calories).toBe(650);
  });

  it("falls back to a generic estimate for unrecognized input", async () => {
    const uid = await createTestUser("food-generic");
    const res = await apiPost("/api/track/food", uid, { input: "xyzzy mystery snack" });

    expect(res.body.log.calories).toBe(300);
    expect(res.body.log.protein).toBe(15);
  });
});

describe("GET /api/track/food", () => {
  it("lists this user's own logged meals, most recent first", async () => {
    const uid = await createTestUser("food-list");
    await apiPost("/api/track/food", uid, { input: "eggs" });
    await apiPost("/api/track/food", uid, { input: "chicken" });

    const res = await apiGet("/api/track/food", uid);
    expect(res.status).toBe(200);
    expect(res.body.logs.length).toBe(2);
    expect(res.body.logs[0].item).toBe("Protein-Dense Meat Bowl");
  });
});

describe("POST /api/track/food/vision", () => {
  it("rejects a request with no image", async () => {
    const uid = await createTestUser("vision-empty");
    const res = await apiPost("/api/track/food/vision", uid, {});
    expect(res.status).toBe(400);
  });

  it("returns a clear error instead of a fake result when AI vision is unavailable", async () => {
    const uid = await createTestUser("vision-unavailable");
    const res = await apiPost("/api/track/food/vision", uid, { imageBase64: "ZmFrZWltYWdlZGF0YQ==" });
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/temporarily unavailable/i);
  });
});

describe("POST /api/track/exercise", () => {
  it("rejects an empty input", async () => {
    const uid = await createTestUser("exercise-empty");
    const res = await apiPost("/api/track/exercise", uid, { input: "" });
    expect(res.status).toBe(400);
  });

  it("classifies a run via the deterministic fallback heuristic", async () => {
    const uid = await createTestUser("exercise-run");
    const res = await apiPost("/api/track/exercise", uid, { input: "went for a 5k jog this morning" });

    expect(res.status).toBe(200);
    expect(res.body.log.exercise).toBe("Cardio Running Session");
    expect(res.body.log.caloriesBurned).toBe(350);
  });

  it("classifies a strength session differently and records volume", async () => {
    const uid = await createTestUser("exercise-strength");
    const res = await apiPost("/api/track/exercise", uid, { input: "heavy squats and deadlifts at the gym" });

    expect(res.body.log.exercise).toBe("Strength Training Session");
    expect(res.body.log.volume).toBe(1500);
  });

  it("awards xp and coins for the logged workout", async () => {
    const uid = await createTestUser("exercise-xp");
    await apiPost("/api/track/exercise", uid, { input: "30 min run" });

    const profile = await apiGet("/api/profile", uid);
    // xp = caloriesBurned (350) + durationMins (30) for the running-session heuristic.
    expect(profile.body.profile.xp).toBe(380);
    expect(profile.body.profile.coins).toBe(10);
  });
});

describe("GET /api/track/exercise", () => {
  it("lists this user's own logged workouts", async () => {
    const uid = await createTestUser("exercise-list");
    await apiPost("/api/track/exercise", uid, { input: "yoga session" });

    const res = await apiGet("/api/track/exercise", uid);
    expect(res.status).toBe(200);
    expect(res.body.logs.length).toBe(1);
    expect(res.body.logs[0].exercise).toBe("Vinyasa Flow Yoga");
  });
});

describe("POST /api/track/unified", () => {
  it("surfaces an error rather than silently faking parsed data when AI parsing is unavailable", async () => {
    const uid = await createTestUser("unified-unavailable");
    const res = await apiPost("/api/track/unified", uid, { prompt: "ate a chicken salad and ran 5k" });
    // No heuristic fallback exists for this route (unlike /api/track/food and
    // /api/track/exercise), so with no working AI backend it must fail loudly.
    expect(res.status).toBe(500);
  });
});
