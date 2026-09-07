import { describe, it, expect } from "vitest";
import { apiPost, createTestUser } from "./helpers.ts";

describe("POST /api/export", () => {
  it("exports this user's own profile and logs, not anyone else's", async () => {
    const uid = await createTestUser("privacy-export");
    await apiPost("/api/track/food", uid, { input: "chicken" });

    const res = await apiPost("/api/export", uid);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toContain(uid);
    expect(res.body.data.foodLogs.length).toBe(1);
    expect(typeof res.body.exportedAt).toBe("string");
  });
});

describe("POST /api/privacy", () => {
  it("acknowledges a settings update", async () => {
    const uid = await createTestUser("privacy-settings");
    const res = await apiPost("/api/privacy", uid, { action: "update_settings" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/privacy settings updated/i);
  });

  it("acknowledges a deletion request with GDPR-appropriate messaging", async () => {
    const uid = await createTestUser("privacy-delete");
    const res = await apiPost("/api/privacy", uid, { action: "delete" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/gdpr/i);
  });
});
