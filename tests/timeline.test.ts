import { describe, it, expect } from "vitest";
import { apiGet, apiPost, createTestUser } from "./helpers.ts";

describe("GET /api/timeline", () => {
  it("merges food, exercise, and journal entries into one chronicle", async () => {
    const uid = await createTestUser("timeline-merge");
    await apiPost("/api/track/food", uid, { input: "chicken" });
    await apiPost("/api/track/exercise", uid, { input: "run" });
    await apiPost("/api/journal", uid, { content: "Felt great today" });

    const res = await apiGet("/api/timeline", uid);
    expect(res.status).toBe(200);
    expect(res.body.timeline.length).toBe(3);
    const types = res.body.timeline.map((t: any) => t.type).sort();
    expect(types).toEqual(["mindfulness", "activity", "nutrition"].sort());
  });

  it("is empty for a fresh user", async () => {
    const uid = await createTestUser("timeline-empty");
    const res = await apiGet("/api/timeline", uid);
    expect(res.body.timeline).toEqual([]);
  });
});

describe("POST /api/timeline/custom", () => {
  it("logs a custom event and awards xp/coins", async () => {
    const uid = await createTestUser("timeline-custom");
    const res = await apiPost("/api/timeline/custom", uid, { text: "Did 20 minutes of stretching" });

    expect(res.status).toBe(200);
    expect(res.body.entry.content).toBe("[Custom Event] Did 20 minutes of stretching");

    const profile = await apiGet("/api/profile", uid);
    expect(profile.body.profile.xp).toBe(15);
    expect(profile.body.profile.coins).toBe(5);
  });

  it("rejects an empty custom log", async () => {
    const uid = await createTestUser("timeline-custom-empty");
    const res = await apiPost("/api/timeline/custom", uid, { text: "" });
    expect(res.status).toBe(400);
  });

  it("a logged custom event shows up on the timeline with the right type", async () => {
    const uid = await createTestUser("timeline-custom-shows");
    await apiPost("/api/timeline/custom", uid, { text: "Meal prepped for the week" });

    const res = await apiGet("/api/timeline", uid);
    expect(res.body.timeline[0].type).toBe("custom");
    expect(res.body.timeline[0].event).toBe("Meal prepped for the week");
  });
});
