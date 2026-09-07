import { describe, it, expect } from "vitest";
import { apiGet, apiPost, createTestUser } from "./helpers.ts";

describe("GET /api/wearables", () => {
  it("starts with no connections for a fresh user", async () => {
    const uid = await createTestUser("wearables-fresh");
    const res = await apiGet("/api/wearables", uid);
    expect(res.status).toBe(200);
    expect(res.body.connections).toEqual([]);
  });
});

describe("POST /api/wearables/:provider/toggle", () => {
  it("honestly rejects Apple Health as browser-unconnectable", async () => {
    const uid = await createTestUser("wearables-apple");
    const res = await apiPost("/api/wearables/apple_health/toggle", uid);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/native iOS app/i);
  });

  it("connects a real provider on first toggle", async () => {
    const uid = await createTestUser("wearables-connect");
    const res = await apiPost("/api/wearables/fitbit/toggle", uid);
    expect(res.status).toBe(200);
    expect(res.body.connection.connected).toBe(true);
    expect(res.body.connection.provider).toBe("fitbit");
  });

  it("disconnects on a second toggle", async () => {
    const uid = await createTestUser("wearables-disconnect");
    await apiPost("/api/wearables/fitbit/toggle", uid);
    const res = await apiPost("/api/wearables/fitbit/toggle", uid);
    expect(res.body.connection.connected).toBe(false);
  });

  it("persists the connection so a later GET reflects it", async () => {
    const uid = await createTestUser("wearables-persist");
    await apiPost("/api/wearables/oura/toggle", uid);

    const res = await apiGet("/api/wearables", uid);
    expect(res.body.connections.length).toBe(1);
    expect(res.body.connections[0].provider).toBe("oura");
  });
});

describe("GET /api/devices", () => {
  it("records the calling device from auth/sync", async () => {
    const uid = await createTestUser("devices-list");
    const res = await apiGet("/api/devices", uid);
    expect(res.status).toBe(200);
    expect(res.body.devices.length).toBeGreaterThan(0);
  });
});
