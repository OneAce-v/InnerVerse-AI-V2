import { describe, it, expect } from "vitest";
import { BASE_URL } from "./helpers.ts";

describe("GET /api/health", () => {
  it("responds ok with no auth required", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("GET /api/system/status", () => {
  it("reports operational status backed by a real DB round trip", async () => {
    const res = await fetch(`${BASE_URL}/api/system/status`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("operational");
    expect(body.environment).toBe("test");
    expect(typeof body.timestamp).toBe("string");
  });
});
