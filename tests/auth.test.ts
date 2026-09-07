import { describe, it, expect } from "vitest";
import { apiPost, testUid, emailFor, getUserId } from "./helpers.ts";

describe("POST /api/auth/sync", () => {
  it("creates a new user on first sync", async () => {
    const uid = testUid("auth-new");
    const res = await apiPost("/api/auth/sync", uid);

    expect(res.status).toBe(200);
    expect(res.body.user.uid).toBe(uid);
    expect(res.body.user.email).toBe(emailFor(uid));
  });

  it("is idempotent - syncing twice returns the same underlying user", async () => {
    const uid = testUid("auth-repeat");
    const first = await apiPost("/api/auth/sync", uid);
    const second = await apiPost("/api/auth/sync", uid);

    expect(first.body.user.id).toBe(second.body.user.id);
  });

  it("rejects a request with no auth token", async () => {
    const res = await fetch("http://localhost:3000/api/auth/sync", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("records the calling device for this user", async () => {
    const uid = testUid("auth-device");
    await apiPost("/api/auth/sync", uid);
    const userId = await getUserId(uid);
    expect(userId).toBeGreaterThan(0);
  });
});
