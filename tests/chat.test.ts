import { describe, it, expect } from "vitest";
import { apiPost, createTestUser, testUid } from "./helpers.ts";

describe("POST /api/agents/chat", () => {
  it("returns a fallback coach reply mentioning the user's goal when Gemini is unavailable", async () => {
    const uid = await createTestUser("chat-fallback", { primaryGoal: "Better Sleep" });

    const res = await apiPost("/api/agents/chat", uid, { message: "Hey coach", history: [] });

    expect(res.status).toBe(200);
    expect(typeof res.body.text).toBe("string");
    expect(res.body.text.length).toBeGreaterThan(0);
    expect(res.body.text).toContain("Better Sleep");
  });

  it("works for a user with no profile yet", async () => {
    const uid = testUid("chat-no-profile");
    await apiPost("/api/auth/sync", uid);

    const res = await apiPost("/api/agents/chat", uid, { message: "hi", history: [] });
    expect(res.status).toBe(200);
    expect(typeof res.body.text).toBe("string");
  });

  it("rejects a request with no auth token", async () => {
    const res = await fetch("http://localhost:3000/api/agents/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hi" }),
    });
    expect(res.status).toBe(401);
  });
});
