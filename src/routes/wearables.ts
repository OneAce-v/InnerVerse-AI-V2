import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { devices, wearableConnections } from "../db/schema.ts";
import { eq, and, sql } from "drizzle-orm";

const router = express.Router();

// Wearable connections: persisted, real toggle state (no fabricated OAuth ceremony or
// permanently-"connected" badges). Apple Health has no browser API, so it is honestly
// reported as unavailable rather than shown as connected.
router.get("/api/wearables", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const connections = await db.select().from(wearableConnections).where(eq(wearableConnections.userId, userResult.id));
    res.json({ connections });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/wearables/:provider/toggle", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const provider = req.params.provider;
    if (provider === "apple_health") {
      return res.status(400).json({ error: "Apple Health requires a native iOS app with HealthKit access; it cannot be connected from a browser." });
    }

    const [existing] = await db.select().from(wearableConnections).where(and(eq(wearableConnections.userId, userResult.id), eq(wearableConnections.provider, provider)));

    let connection;
    if (existing && existing.connected) {
      [connection] = await db.update(wearableConnections)
        .set({ connected: false })
        .where(eq(wearableConnections.id, existing.id))
        .returning();
    } else if (existing) {
      [connection] = await db.update(wearableConnections)
        .set({ connected: true, lastSync: new Date() })
        .where(eq(wearableConnections.id, existing.id))
        .returning();
    } else {
      [connection] = await db.insert(wearableConnections).values({
        userId: userResult.id,
        provider,
        connected: true,
        lastSync: new Date()
      }).returning();
    }

    res.json({ connection });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/devices", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const userDevices = await db.select().from(devices).where(eq(devices.userId, userResult.id)).orderBy(sql`${devices.lastActiveAt} DESC`);
    res.json({ devices: userDevices });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
