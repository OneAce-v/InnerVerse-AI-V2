import { describe, it, expect } from "vitest";
import { BASE_URL, apiGet, apiPost, createTestUser } from "./helpers.ts";

// Every authenticated route mounted in server.ts. A new route added without
// requireAuth should be added here and will fail until it's protected.
const PROTECTED_ROUTES: [string, string][] = [
  ["GET", "/api/ecosystem"], ["POST", "/api/ecosystem/collaborators"], ["POST", "/api/ecosystem/collaborators/1/revoke"],
  ["POST", "/api/ecosystem/biomarkers"], ["POST", "/api/ecosystem/knowledge"],
  ["GET", "/api/badges"], ["GET", "/api/quests/status"], ["POST", "/api/quests/complete"], ["GET", "/api/leaderboard"],
  ["GET", "/api/orchestration"], ["POST", "/api/orchestration/missions"], ["POST", "/api/orchestration/tasks/1/complete"],
  ["POST", "/api/orchestration/decision"],
  ["POST", "/api/journal"], ["GET", "/api/journal"], ["POST", "/api/export"], ["POST", "/api/privacy"],
  ["GET", "/api/wearables"], ["POST", "/api/wearables/fitbit/toggle"], ["GET", "/api/devices"],
  ["POST", "/api/recommendations/generate"], ["GET", "/api/briefings"], ["POST", "/api/simulation"],
  ["GET", "/api/recommendations"], ["POST", "/api/omnibar"],
  ["GET", "/api/developer/keys"], ["POST", "/api/developer/keys/regenerate"],
  ["GET", "/api/notifications"], ["POST", "/api/notifications"], ["POST", "/api/agents/chat"],
  ["POST", "/api/profile"], ["GET", "/api/profile"], ["GET", "/api/store"], ["POST", "/api/store/purchase"],
  ["GET", "/api/subscription"], ["POST", "/api/subscription"], ["GET", "/api/billing"],
  ["POST", "/api/track/food"], ["POST", "/api/track/food/vision"], ["POST", "/api/track/exercise"],
  ["GET", "/api/track/food"], ["GET", "/api/track/exercise"], ["POST", "/api/track/unified"],
  ["GET", "/api/research/dashboard"], ["POST", "/api/auth/sync"], ["GET", "/api/lifeos/status"], ["GET", "/api/analytics"],
  ["GET", "/api/cognition"], ["POST", "/api/cognition/experiments"], ["GET", "/api/admin/health"],
  ["GET", "/api/digital-twin"], ["POST", "/api/digital-twin/recalibrate"], ["POST", "/api/digital-twin/update"],
  ["GET", "/api/digital-twin/history"], ["GET", "/api/digital-twin/dependencies"], ["GET", "/api/digital-twin/contributors"],
  ["GET", "/api/digital-twin/goals"], ["GET", "/api/digital-twin/confidence"],
  ["GET", "/api/timeline"], ["POST", "/api/timeline/custom"],
];

async function rawPost(path: string, uid: string, body: string, contentType = "application/json") {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer TEST_AUTH:${uid}`, "Content-Type": contentType },
    body,
  });
  return { status: res.status, contentType: res.headers.get("content-type") || "", body: await res.json().catch(() => null) };
}

describe("auth is enforced on every protected route", () => {
  it.each(PROTECTED_ROUTES)("%s %s rejects missing, forged, and malformed tokens", async (method, path) => {
    for (const authorization of [undefined, "Bearer not-a-real-token", "TEST_AUTH:no-bearer-prefix"]) {
      const res = await fetch(`${BASE_URL}${path}`, { method, headers: authorization ? { Authorization: authorization } : {} });
      expect(res.status).toBe(401);
    }
  });
});

describe("request parsing", () => {
  it("answers malformed JSON with a JSON 400, not an HTML stack trace", async () => {
    const uid = await createTestUser("edge-malformed");
    const res = await rawPost("/api/journal", uid, '{"content": "hi",');
    expect(res.status).toBe(400);
    expect(res.contentType).toContain("application/json");
    expect(res.body.error).toBe("Malformed request body");
  });

  it("answers an unknown /api path with a JSON 404 instead of the SPA's index.html", async () => {
    const uid = await createTestUser("edge-404");
    const get = await apiGet("/api/does-not-exist", uid);
    const post = await apiPost("/api/does-not-exist", uid, {});
    expect(get.status).toBe(404);
    expect(get.body.error).toBe("Not found");
    expect(post.status).toBe(404);
  });

  it("still serves the SPA for non-API paths", async () => {
    const res = await fetch(`${BASE_URL}/dashboard`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("accepts a real-sized camera frame on the vision route (was capped at 100KB)", async () => {
    const uid = await createTestUser("edge-vision-size");
    const frame = "data:image/jpeg;base64," + "A".repeat(300_000);
    const res = await apiPost("/api/track/food/vision", uid, { imageBase64: frame, mimeType: "image/jpeg" });
    expect(res.status).not.toBe(413);
  });

  it("still rejects an oversized vision payload, as JSON", async () => {
    const uid = await createTestUser("edge-vision-huge");
    const res = await apiPost("/api/track/food/vision", uid, { imageBase64: "A".repeat(9_000_000) });
    expect(res.status).toBe(413);
    expect(res.body.error).toBe("Request body too large");
  });

  it("rejects a non-image mimeType on the vision route", async () => {
    const uid = await createTestUser("edge-vision-mime");
    const res = await apiPost("/api/track/food/vision", uid, { imageBase64: "abc", mimeType: "text/html" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/profile input types", () => {
  it("accepts Settings' numeric-string inputs and stores real integers", async () => {
    const uid = await createTestUser("edge-profile-numstr");
    const res = await apiPost("/api/profile", uid, { age: "31", height: "175", weight: "70" });
    expect(res.status).toBe(200);
    expect(res.body.profile.age).toBe(31);
    expect(res.body.profile.height).toBe(175);
  });

  it("treats a cleared number box as clearing the field, so the rest of the save isn't lost", async () => {
    const uid = await createTestUser("edge-profile-cleared");
    const res = await apiPost("/api/profile", uid, { age: "", dietType: "Keto" });
    expect(res.status).toBe(200);
    expect(res.body.profile.age).toBeNull();
    expect(res.body.profile.dietType).toBe("Keto");
  });

  it.each([
    [{ age: "abc" }], [{ age: 12.5 }], [{ age: 999 }], [{ stressLevel: 11 }],
    [{ gender: { $gt: "" } }], [{ primaryGoal: 42 }], [{ availableEquipment: "Dumbbells" }],
  ])("rejects %j with a 400 instead of a database error", async (body) => {
    const uid = await createTestUser("edge-profile-bad");
    const res = await apiPost("/api/profile", uid, body);
    expect(res.status).toBe(400);
  });

  it("rejects a non-object body", async () => {
    const uid = await createTestUser("edge-profile-array");
    const res = await apiPost("/api/profile", uid, [1, 2, 3]);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/journal input", () => {
  it.each([[{}], [{ content: "   " }], [{ content: { $gt: "" } }], [{ content: null }]])(
    "rejects %j with a 400 instead of a failed insert", async (body) => {
      const uid = await createTestUser("edge-journal-bad");
      const res = await apiPost("/api/journal", uid, body);
      expect(res.status).toBe(400);
    });

  it("rejects a text/plain body with a 400", async () => {
    const uid = await createTestUser("edge-journal-text");
    const res = await rawPost("/api/journal", uid, "content=hi", "text/plain");
    expect(res.status).toBe(400);
  });

  it("normalizes a full ISO timestamp (Dashboard's bedtime check-in) to YYYY-MM-DD", async () => {
    const uid = await createTestUser("edge-journal-iso");
    const res = await apiPost("/api/journal", uid, { content: "bedtime", date: "2026-09-27T21:15:00.000Z" });
    expect(res.status).toBe(200);
    expect(res.body.entry.date).toBe("2026-09-27");
  });

  it.each(["2026-02-30", "not-a-date", "27/09/2026"])("rejects the impossible or malformed date %s", async (date) => {
    const uid = await createTestUser("edge-journal-date");
    const res = await apiPost("/api/journal", uid, { content: "x", date });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/agents/chat input", () => {
  it("requires a message", async () => {
    const uid = await createTestUser("edge-chat-nomsg");
    const res = await apiPost("/api/agents/chat", uid, { history: [] });
    expect(res.status).toBe(400);
  });

  it.each([["oops"], [{ role: "user" }], [42], [[null, { role: "user" }]]])(
    "ignores a malformed history %j instead of crashing", async (history) => {
      const uid = await createTestUser("edge-chat-history");
      const res = await apiPost("/api/agents/chat", uid, { message: "hi", history });
      expect(res.status).toBe(200);
      expect(typeof res.body.text).toBe("string");
    });
});

describe("path-param ids", () => {
  it.each(["/api/ecosystem/collaborators", "/api/orchestration/tasks"])(
    "%s rejects ids outside the integer column range with a 400", async (base) => {
      const uid = await createTestUser("edge-ids");
      for (const id of ["2147483648", "99999999999999999999", "0", "-1", "1.5", "abc"]) {
        const suffix = base.includes("collaborators") ? "revoke" : "complete";
        const res = await apiPost(`${base}/${id}/${suffix}`, uid, {});
        expect(res.status, `id=${id}`).toBe(400);
      }
    });
});

describe("allow-listed values", () => {
  it.each(["unknown-provider", "FITBIT", "%00"])("rejects the wearable provider %s", async (provider) => {
    const uid = await createTestUser("edge-wearable");
    const res = await apiPost(`/api/wearables/${provider}/toggle`, uid);
    expect(res.status).toBe(400);
    const list = await apiGet("/api/wearables", uid);
    expect(list.body.connections).toEqual([]);
  });

  it("no longer upgrades to Pro for free on an empty subscription request", async () => {
    const uid = await createTestUser("edge-billing-empty");
    const res = await apiPost("/api/subscription", uid, {});
    expect(res.status).toBe(400);
    const sub = await apiGet("/api/subscription", uid);
    expect(sub.body.subscription.plan).toBe("Free");
  });

  it.each([[{ plan: "Platinum" }], [{ plan: { $gt: "" } }], [{ plan: "Pro", billingCycle: "hourly" }]])(
    "rejects the subscription change %j", async (body) => {
      const uid = await createTestUser("edge-billing-bad");
      const res = await apiPost("/api/subscription", uid, body);
      expect(res.status).toBe(400);
    });

  it("rejects an unknown privacy action", async () => {
    const uid = await createTestUser("edge-privacy");
    const res = await apiPost("/api/privacy", uid, { action: "drop_everything" });
    expect(res.status).toBe(400);
  });

  it.each([[{}], [{ markAllRead: "yes" }], [{ notificationId: "abc" }], [{ notificationId: 2147483648 }]])(
    "rejects the notification update %j", async (body) => {
      const uid = await createTestUser("edge-notif");
      const res = await apiPost("/api/notifications", uid, body);
      expect(res.status).toBe(400);
    });
});

describe("required text fields", () => {
  it.each([
    ["/api/orchestration/decision", { query: "   " }],
    ["/api/simulation", {}],
    ["/api/omnibar", { query: ["x"] }],
    ["/api/track/unified", { prompt: "" }],
    ["/api/orchestration/missions", { title: { $gt: "" } }],
    ["/api/orchestration/missions", { title: "Run a marathon", vision: 7 }],
    ["/api/ecosystem/knowledge", { title: ["x"] }],
    ["/api/ecosystem/biomarkers", { markerName: "LDL", value: { v: 1 }, unit: "mg/dL" }],
    ["/api/ecosystem/biomarkers", { markerName: " ", value: 100, unit: "mg/dL" }],
    ["/api/cognition/experiments", { hypothesis: "   " }],
    ["/api/timeline/custom", { text: { $gt: "" } }],
    ["/api/digital-twin/update", { stateName: "not-a-domain", score: 50 }],
    ["/api/digital-twin/update", { stateName: "sleep", score: "high" }],
    ["/api/digital-twin/update", { stateName: "sleep", trend: "sideways" }],
  ])("%s rejects %j with a 400", async (path, body) => {
    const uid = await createTestUser("edge-required");
    const res = await apiPost(path, uid, body);
    expect(res.status).toBe(400);
  });

  it("still accepts a numeric biomarker value", async () => {
    const uid = await createTestUser("edge-biomarker-ok");
    const res = await apiPost("/api/ecosystem/biomarkers", uid, { markerName: "LDL", value: 95, unit: "mg/dL" });
    expect(res.status).toBe(200);
    expect(res.body.marker.value).toBe("95");
  });
});
