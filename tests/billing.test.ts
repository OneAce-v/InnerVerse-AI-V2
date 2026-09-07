import { describe, it, expect } from "vitest";
import { apiGet, apiPost, createTestUser } from "./helpers.ts";

describe("GET /api/subscription", () => {
  it("creates and returns a Free plan by default", async () => {
    const uid = await createTestUser("billing-default");
    const res = await apiGet("/api/subscription", uid);
    expect(res.status).toBe(200);
    expect(res.body.subscription.plan).toBe("Free");
    expect(res.body.subscription.status).toBe("active");
  });

  it("is idempotent - repeat calls don't create duplicate subscriptions", async () => {
    const uid = await createTestUser("billing-idempotent");
    const first = await apiGet("/api/subscription", uid);
    const second = await apiGet("/api/subscription", uid);
    expect(first.body.subscription.id).toBe(second.body.subscription.id);
  });
});

describe("POST /api/subscription", () => {
  it("upgrades the plan and records a payment for a paid tier", async () => {
    const uid = await createTestUser("billing-upgrade");
    const res = await apiPost("/api/subscription", uid, { plan: "Pro", billingCycle: "monthly" });

    expect(res.status).toBe(200);
    expect(res.body.plan).toBe("Pro");

    const sub = await apiGet("/api/subscription", uid);
    expect(sub.body.subscription.plan).toBe("Pro");

    const invoices = await apiGet("/api/billing", uid);
    expect(invoices.body.invoices.length).toBe(1);
    expect(invoices.body.invoices[0].amount).toBe(2900);
  });

  it("does not record a payment for the Free plan", async () => {
    const uid = await createTestUser("billing-free-nopay");
    await apiPost("/api/subscription", uid, { plan: "Free" });

    const invoices = await apiGet("/api/billing", uid);
    expect(invoices.body.invoices).toEqual([]);
  });

  it("sends a notification when the plan changes", async () => {
    const uid = await createTestUser("billing-notif");
    await apiPost("/api/subscription", uid, { plan: "Premium" });

    const notifs = await apiGet("/api/notifications", uid);
    const planNotif = notifs.body.notifications.find((n: any) => n.title === "Subscription Updated");
    expect(planNotif).toBeDefined();
  });
});

describe("GET /api/billing", () => {
  it("only returns this user's own invoices", async () => {
    const userA = await createTestUser("billing-a");
    const userB = await createTestUser("billing-b");
    await apiPost("/api/subscription", userA, { plan: "Enterprise" });

    const res = await apiGet("/api/billing", userB);
    expect(res.body.invoices).toEqual([]);
  });
});
