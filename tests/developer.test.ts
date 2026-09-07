import { describe, it, expect } from "vitest";
import { apiGet, apiPost, createTestUser } from "./helpers.ts";

describe("GET /api/developer/keys", () => {
  it("reports no key for a fresh user", async () => {
    const uid = await createTestUser("dev-keys-fresh");
    const res = await apiGet("/api/developer/keys", uid);
    expect(res.status).toBe(200);
    expect(res.body.hasKey).toBe(false);
    expect(res.body.keyPreview).toBeNull();
  });
});

describe("POST /api/developer/keys/regenerate", () => {
  it("generates a real key and only shows the plaintext once", async () => {
    const uid = await createTestUser("dev-keys-generate");
    const res = await apiPost("/api/developer/keys/regenerate", uid);

    expect(res.status).toBe(200);
    expect(res.body.key).toMatch(/^iv_live_[0-9a-f]{48}$/);

    const after = await apiGet("/api/developer/keys", uid);
    expect(after.body.hasKey).toBe(true);
    expect(after.body.keyPreview).not.toBe(res.body.key);
    expect(after.body.keyPreview).toContain(res.body.key.slice(-4));
  });

  it("replaces the old key when regenerated again", async () => {
    const uid = await createTestUser("dev-keys-rotate");
    const first = await apiPost("/api/developer/keys/regenerate", uid);
    const second = await apiPost("/api/developer/keys/regenerate", uid);

    expect(first.body.key).not.toBe(second.body.key);
  });
});
