import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { notifications } from "../db/schema.ts";
import { eq, and, sql } from "drizzle-orm";
import { positiveIntId } from "../lib/validation.ts";

const router = express.Router();

router.get("/api/notifications", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const userNotifs = await db.select().from(notifications).where(eq(notifications.userId, userResult.id)).orderBy(sql`${notifications.createdAt} DESC`);
    res.json({ notifications: userNotifs });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/notifications", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const markAllRead = req.body.markAllRead === true;
    const notificationId = positiveIntId(req.body.notificationId);
    if (!markAllRead && notificationId === null) {
      return res.status(400).json({ error: "Provide markAllRead: true or a positive integer notificationId" });
    }
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

    if (markAllRead) {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userResult.id));
    } else {
      await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, notificationId!), eq(notifications.userId, userResult.id)));
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
