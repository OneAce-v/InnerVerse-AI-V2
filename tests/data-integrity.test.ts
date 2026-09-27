import { describe, it, expect } from "vitest";
import { db } from "../src/db/index.ts";
import { foodLogs, journalEntries } from "../src/db/schema.ts";
import { computeStreak } from "../src/lib/serverHelpers.ts";
import { apiGet, apiPost, createTestUser, getUserId } from "./helpers.ts";

const NOW = new Date("2026-09-27T15:00:00Z");

describe("computeStreak", () => {
  it("is 0 with no activity", () => {
    expect(computeStreak([], NOW)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(computeStreak(["2026-09-27", "2026-09-26", "2026-09-25"], NOW)).toBe(3);
  });

  it("stays alive when the last activity was yesterday", () => {
    expect(computeStreak(["2026-09-26", "2026-09-25"], NOW)).toBe(2);
  });

  it("breaks on a missed day", () => {
    expect(computeStreak(["2026-09-27", "2026-09-25", "2026-09-24"], NOW)).toBe(1);
  });

  it("is 0 when the last activity was two days ago", () => {
    expect(computeStreak(["2026-09-25"], NOW)).toBe(0);
  });
});

// The stored streak_days column was never written by anything, so every user's streak
// was permanently 0 and the Dashboard papered over it with a hardcoded fallback of 12.
describe("streak on GET /api/profile", () => {
  it("is 0 for a new user with no logged activity", async () => {
    const uid = await createTestUser("streak-new");
    const res = await apiGet("/api/profile", uid);
    expect(res.body.profile.streakDays).toBe(0);
  });

  it("reflects consecutive days of real logged activity", async () => {
    const uid = await createTestUser("streak-real");
    const userId = await getUserId(uid);
    const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
    await db.insert(foodLogs).values([
      { userId, item: "oats", calories: 300, protein: 10, carbs: 50, fats: 5, confidence: 90, source: "manual", createdAt: daysAgo(0) },
      { userId, item: "rice", calories: 400, protein: 8, carbs: 80, fats: 2, confidence: 90, source: "manual", createdAt: daysAgo(2) },
    ]);
    await db.insert(journalEntries).values({
      userId, date: daysAgo(1).toISOString().slice(0, 10), content: "reflection", sentiment: "Neutral", mood: "Calm", summary: "s", createdAt: daysAgo(1),
    });

    const res = await apiGet("/api/profile", uid);
    expect(res.body.profile.streakDays).toBe(3);
  });
});

describe("profile preferences", () => {
  it("persists the coach persona and gamification switch", async () => {
    const uid = await createTestUser("prefs-save");
    const preferences = { coachName: "Aria", coachPersonality: "Scientific", coachStyle: "Research Based", gamificationEnabled: false };
    const save = await apiPost("/api/profile", uid, { preferences });
    expect(save.status).toBe(200);

    const res = await apiGet("/api/profile", uid);
    expect(res.body.profile.preferences).toEqual(preferences);
  });

  it("drops unknown preference keys", async () => {
    const uid = await createTestUser("prefs-unknown");
    await apiPost("/api/profile", uid, { preferences: { coachName: "Aria", isAdmin: true } });
    const res = await apiGet("/api/profile", uid);
    expect(res.body.profile.preferences).toEqual({ coachName: "Aria" });
  });

  it.each([
    [{ coachPersonality: "Sarcastic" }], [{ coachStyle: 5 }], [{ gamificationEnabled: "no" }],
    [{ coachName: "x".repeat(41) }], ["not-an-object"],
  ])("rejects the invalid preferences %j", async (preferences) => {
    const uid = await createTestUser("prefs-bad");
    const res = await apiPost("/api/profile", uid, { preferences });
    expect(res.status).toBe(400);
  });

  it("keeps preferences when a later save omits them", async () => {
    const uid = await createTestUser("prefs-keep");
    await apiPost("/api/profile", uid, { preferences: { coachName: "Aria" } });
    await apiPost("/api/profile", uid, { dietType: "Vegan" });
    const res = await apiGet("/api/profile", uid);
    expect(res.body.profile.preferences).toEqual({ coachName: "Aria" });
  });
});

// There is no payment processor, so paid-plan records must not claim a real charge or
// link to an invoice that doesn't exist.
describe("demo billing", () => {
  it("records paid-plan payments as demo, with no invoice link", async () => {
    const uid = await createTestUser("billing-demo");
    await apiPost("/api/subscription", uid, { plan: "Pro" });
    const res = await apiGet("/api/billing", uid);
    expect(res.body.invoices).toHaveLength(1);
    expect(res.body.invoices[0].status).toBe("demo");
    expect(res.body.invoices[0].invoiceUrl).toBeNull();
  });

  it("says in the notification that no payment was taken", async () => {
    const uid = await createTestUser("billing-demo-notif");
    await apiPost("/api/subscription", uid, { plan: "Premium" });
    const notifs = await apiGet("/api/notifications", uid);
    const planNotif = notifs.body.notifications.find((n: any) => n.title === "Subscription Updated");
    expect(planNotif.message).toMatch(/no payment was taken/i);
  });
});
