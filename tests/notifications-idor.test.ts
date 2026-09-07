import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import { notifications, users } from "../src/db/schema.ts";
import { apiPost, apiGet, createTestUser } from "./helpers.ts";

// Regression test for a real IDOR fixed earlier in this project: marking a
// notification read used to have no ownership check, so any authenticated user
// could mark (and by extension, probe the existence of) another user's notification
// just by guessing its id.

describe("POST /api/notifications (mark read)", () => {
  it("does not let user A mark user B's notification as read", async () => {
    const uidA = await createTestUser("notif-attacker");
    const uidB = await createTestUser("notif-victim");

    const [userB] = await db.select().from(users).where(eq(users.uid, uidB));
    const [victimNotif] = await db.insert(notifications).values({
      userId: userB.id,
      title: "Private",
      message: "Only for user B",
    }).returning();

    await apiPost("/api/notifications", uidA, { notificationId: victimNotif.id });

    const [afterAttack] = await db.select().from(notifications).where(eq(notifications.id, victimNotif.id));
    expect(afterAttack.isRead).toBe(false);
  });

  it("lets a user mark their own notification as read", async () => {
    const uid = await createTestUser("notif-owner");
    const [user] = await db.select().from(users).where(eq(users.uid, uid));
    const [notif] = await db.insert(notifications).values({
      userId: user.id,
      title: "Mine",
      message: "For me",
    }).returning();

    const res = await apiPost("/api/notifications", uid, { notificationId: notif.id });
    expect(res.status).toBe(200);

    const list = await apiGet("/api/notifications", uid);
    const found = list.body.notifications.find((n: any) => n.id === notif.id);
    expect(found.isRead).toBe(true);
  });
});
