import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { devices } from "../db/schema.ts";
import { describeDevice } from "../lib/serverHelpers.ts";

const router = express.Router();

// Auth & Sync Route
router.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const user = await getOrCreateUser(req.user.uid, req.user.email || "", req.user.name || "");

    // Track the real device/browser making this request (replaces the previous hardcoded device list).
    const { name: deviceName, type: deviceType } = describeDevice(req.headers["user-agent"] || "");
    const deviceValues = {
      userId: user.id,
      deviceName,
      deviceType,
      lastIp: req.ip || req.socket.remoteAddress || null,
      lastActiveAt: new Date()
    };
    await db.insert(devices).values(deviceValues).onConflictDoUpdate({
      target: [devices.userId, devices.deviceName],
      set: deviceValues
    });

    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
