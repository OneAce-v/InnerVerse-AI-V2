import { describe, it, expect } from "vitest";
import { apiPost, apiGet, createTestUser } from "./helpers.ts";

describe("POST /api/quests/complete", () => {
  it("awards the server-defined xp/coins for a valid quest", async () => {
    const uid = await createTestUser("quest-basic");

    const res = await apiPost("/api/quests/complete", uid, { questId: "1" });

    expect(res.status).toBe(200);
    expect(res.body.alreadyCompletedToday).toBe(false);
    expect(res.body.profile.xp).toBe(50);
    expect(res.body.profile.coins).toBe(10);
  });

  it("ignores a client-supplied reward and always grants the catalog amount", async () => {
    const uid = await createTestUser("quest-spoof");

    // A client could try to smuggle its own reward in the body; the server must
    // ignore it entirely and look the reward up from questId alone.
    const res = await apiPost("/api/quests/complete", uid, { questId: "1", xp: 999999, coins: 999999 });

    expect(res.status).toBe(200);
    expect(res.body.profile.xp).toBe(50);
    expect(res.body.profile.coins).toBe(10);
  });

  it("does not award twice for the same quest on the same day", async () => {
    const uid = await createTestUser("quest-idempotent");

    const first = await apiPost("/api/quests/complete", uid, { questId: "2" });
    const second = await apiPost("/api/quests/complete", uid, { questId: "2" });

    expect(first.body.alreadyCompletedToday).toBe(false);
    expect(second.body.alreadyCompletedToday).toBe(true);
    // Still only one quest's worth of reward, not two.
    expect(second.body.profile.xp).toBe(50);
    expect(second.body.profile.coins).toBe(10);
  });

  it("rejects an unknown questId", async () => {
    const uid = await createTestUser("quest-unknown");

    const res = await apiPost("/api/quests/complete", uid, { questId: "does-not-exist" });

    expect(res.status).toBe(400);
  });

  it("rejects a request with no auth token", async () => {
    const res = await fetch("http://localhost:3000/api/quests/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questId: "1" }),
    });
    expect(res.status).toBe(401);
  });
});

// Regression check for the "gimmick" bug this session found and fixed: a purely
// client-only optimistic update in Community.tsx used to let the coin balance
// diverge from what the server actually recorded, since nothing was persisted.
describe("GET /api/profile", () => {
  it("reflects the real, persisted coin balance after a quest reward", async () => {
    const uid = await createTestUser("quest-persisted");
    await apiPost("/api/quests/complete", uid, { questId: "3" });

    const res = await apiGet("/api/profile", uid);

    expect(res.body.profile.coins).toBe(10);
  });
});
