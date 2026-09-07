import { describe, it, expect } from "vitest";
import { apiPost, apiGet, createTestUser, setCoins } from "./helpers.ts";

// Regression coverage for the "Community rewards store" gimmick this session fixed:
// handlePurchase() used to be a purely client-side optimistic state update with no
// backend call at all, so a purchase reset the moment the page refreshed.

describe("GET /api/store", () => {
  it("lists the catalog with zero ownership for a brand-new user", async () => {
    const uid = await createTestUser("store-catalog");

    const res = await apiGet("/api/store", uid);

    expect(res.status).toBe(200);
    expect(res.body.coins).toBe(0);
    const ids = res.body.items.map((i: any) => i.id);
    expect(ids).toEqual(expect.arrayContaining(["streak_freeze", "cosmic_theme", "nova_voice", "pro_analytics"]));
  });
});

describe("POST /api/store/purchase", () => {
  it("deducts coins and records ownership for a one-time item", async () => {
    const uid = await createTestUser("store-buy-onetime");
    await setCoins(uid, 200);

    const res = await apiPost("/api/store/purchase", uid, { itemId: "cosmic_theme" });

    expect(res.status).toBe(200);
    expect(res.body.coins).toBe(0);

    const store = await apiGet("/api/store", uid);
    const item = store.body.items.find((i: any) => i.id === "cosmic_theme");
    expect(item.owned).toBe(1);
  });

  it("rejects buying a one-time item twice", async () => {
    const uid = await createTestUser("store-duplicate");
    await setCoins(uid, 400);

    const first = await apiPost("/api/store/purchase", uid, { itemId: "cosmic_theme" });
    const second = await apiPost("/api/store/purchase", uid, { itemId: "cosmic_theme" });

    expect(first.status).toBe(200);
    expect(second.status).toBe(400);
    // Only charged once.
    expect(second.body.error).toMatch(/already own/i);
  });

  it("rejects a purchase the user can't afford, and takes no coins", async () => {
    const uid = await createTestUser("store-broke");
    await setCoins(uid, 10);

    const res = await apiPost("/api/store/purchase", uid, { itemId: "pro_analytics" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not enough coins/i);

    const profile = await apiGet("/api/profile", uid);
    expect(profile.body.profile.coins).toBe(10);
  });

  it("lets a consumable item stack across repeat purchases", async () => {
    const uid = await createTestUser("store-consumable");
    await setCoins(uid, 200);

    await apiPost("/api/store/purchase", uid, { itemId: "streak_freeze" });
    await apiPost("/api/store/purchase", uid, { itemId: "streak_freeze" });

    const store = await apiGet("/api/store", uid);
    const item = store.body.items.find((i: any) => i.id === "streak_freeze");
    expect(item.owned).toBe(2);
    expect(store.body.coins).toBe(100); // 200 - 50 - 50
  });

  it("rejects an unknown itemId without touching the balance", async () => {
    const uid = await createTestUser("store-unknown-item");
    await setCoins(uid, 100);

    const res = await apiPost("/api/store/purchase", uid, { itemId: "does-not-exist" });

    expect(res.status).toBe(400);
    const profile = await apiGet("/api/profile", uid);
    expect(profile.body.profile.coins).toBe(100);
  });
});
