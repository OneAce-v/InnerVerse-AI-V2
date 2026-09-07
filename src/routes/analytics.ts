import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { foodLogs, exerciseLogs } from "../db/schema.ts";
import { eq, and, sql } from "drizzle-orm";

const router = express.Router();

// Analytics API
router.get("/api/analytics", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

    // For MVP, return food and exercise aggregates over the last 7 days
    // Simplification: just return all recent logs, client computes.
    const recentFood = await db.select().from(foodLogs).where(eq(foodLogs.userId, userResult.id)).orderBy(sql`${foodLogs.createdAt} DESC`).limit(50);
    const recentExercise = await db.select().from(exerciseLogs).where(eq(exerciseLogs.userId, userResult.id)).orderBy(sql`${exerciseLogs.createdAt} DESC`).limit(50);
    
    res.json({ food: recentFood, exercise: recentExercise });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
