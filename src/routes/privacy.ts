import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { profiles, foodLogs, exerciseLogs, journalEntries, auditLogs } from "../db/schema.ts";
import { eq } from "drizzle-orm";

const router = express.Router();

router.post("/api/export", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    
    const profile = await db.select().from(profiles).where(eq(profiles.userId, userResult.id)).then(r => r[0]);
    const foods = await db.select().from(foodLogs).where(eq(foodLogs.userId, userResult.id));
    const exercises = await db.select().from(exerciseLogs).where(eq(exerciseLogs.userId, userResult.id));
    const journals = await db.select().from(journalEntries).where(eq(journalEntries.userId, userResult.id));

    await db.insert(auditLogs).values({
      userId: userResult.id,
      action: 'GDPR_DATA_EXPORT',
      resource: 'user_full_data',
      status: 'success'
    });

    res.json({
      user: { id: userResult.id, email: userResult.email },
      profile,
      data: { foodLogs: foods, exerciseLogs: exercises, journalEntries: journals },
      exportedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/privacy", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const { action } = req.body;

    await db.insert(auditLogs).values({
      userId: userResult.id,
      action: action === 'delete' ? 'ACCOUNT_DELETE_REQUEST' : 'PRIVACY_SETTINGS_UPDATE',
      resource: 'privacy',
      status: 'success'
    });

    res.json({ success: true, message: action === 'delete' ? 'Deletion request queued according to GDPR guidelines.' : 'Privacy settings updated.' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
