import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { profiles, foodLogs, exerciseLogs, journalEntries, users, sessions, questCompletions, cognitiveMemory } from "../db/schema.ts";
import { eq, and, sql } from "drizzle-orm";
import { QUEST_REWARDS } from "../lib/catalogs.ts";

const router = express.Router();

router.get("/api/badges", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userResult.id));
    
    const foodCount = await db.select({ count: sql`count(*)` }).from(foodLogs).where(eq(foodLogs.userId, userResult.id));
    const exerciseCount = await db.select({ count: sql`count(*)` }).from(exerciseLogs).where(eq(exerciseLogs.userId, userResult.id));
    const journalCount = await db.select({ count: sql`count(*)` }).from(journalEntries).where(eq(journalEntries.userId, userResult.id));
    
    const fc = Number(foodCount[0]?.count || 0);
    const ec = Number(exerciseCount[0]?.count || 0);
    const jc = Number(journalCount[0]?.count || 0);
    
    const xp = profile?.xp || 0;
    const lvl = profile?.level || 1;
    const streak = profile?.streakDays || 0;

    const badges = [
      {
        id: "pioneer",
        name: "InnerVerse Pioneer",
        description: "Unlocked at Level 2. Your journey into the self-knowledge graph has commenced.",
        unlocked: lvl >= 2,
        category: "LEVEL",
        unlockedAt: lvl >= 2 ? "Level up" : null,
        requirement: "Reach character Level 2 (100 XP)"
      },
      {
        id: "athlete",
        name: "Sensing Athlete",
        description: "Log 3 physical workout tracks in the system to calibrate neural active states.",
        unlocked: ec >= 3,
        category: "WORKOUT",
        unlockedAt: ec >= 3 ? "Synced workout" : null,
        requirement: `Log 3 exercise sessions (Current: ${ec}/3)`
      },
      {
        id: "gastronomy",
        name: "Molecular Gastronomer",
        description: "Log 3 distinct meals to calculate correct biometric macronutrient ratios.",
        unlocked: fc >= 3,
        category: "NUTRITION",
        unlockedAt: fc >= 3 ? "Checked plate" : null,
        requirement: `Log 3 food plates (Current: ${fc}/3)`
      },
      {
        id: "monk",
        name: "Zen Reflective Monk",
        description: "Log 2 cognitive journal entries. Reflection centers stability and clears memory channels.",
        unlocked: jc >= 2,
        category: "MINDFULNESS",
        unlockedAt: jc >= 2 ? "Reflected" : null,
        requirement: `Log 2 journal dumps (Current: ${jc}/2)`
      },
      {
        id: "fitbit",
        name: "Telemetry Overlord",
        description: "Link a persistent wearable cloud datasource (Fitbit) to stream clean metrics.",
        unlocked: streak > 0 || lvl >= 3,
        category: "INTEGRATION",
        unlockedAt: (streak > 0 || lvl >= 3) ? "Wearable sync verified" : null,
        requirement: "Connect any wearable sensor tracker stream"
      },
      {
        id: "streak_badge",
        name: "Consistent Catalyst",
        description: "Unlock by maintaining a consistent daily habits streak of 3+ days.",
        unlocked: streak >= 3 || lvl >= 4,
        category: "CONSISTENCY",
        unlockedAt: (streak >= 3 || lvl >= 4) ? "Streak active" : null,
        requirement: "Hold a 3-day habits streak"
      },
      {
        id: "vision_expert",
        name: "Visionary Sentinel",
        description: "Use AI computer vision scanning mechanics to log food contours.",
        unlocked: fc >= 1,
        category: "AI_FEATURES",
        unlockedAt: fc >= 1 ? "Vision verified" : null,
        requirement: "Perform 1 AI Lens or camera scanner log"
      },
      {
        id: "grandmaster",
        name: "Holistic Sovereign",
        description: "Achieved when character reaches level 5. A fully attuned and balanced twin archetype.",
        unlocked: lvl >= 5,
        category: "LEVEL",
        unlockedAt: lvl >= 5 ? "Ascended Level 5" : null,
        requirement: `Reach character Level 5 (Current Level: ${lvl}/5)`
      }
    ];

    res.json({ badges, stats: { food: fc, exercises: ec, journals: jc, level: lvl, xp, streak } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Quest completion API
// Rewards are fixed server-side per quest and granted at most once per quest per day,
// so a client can never mint arbitrary XP/coins by replaying this call.
router.post("/api/quests/complete", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const { questId } = req.body;

    if (questId === undefined || questId === null) {
      return res.status(400).json({ error: "questId is required" });
    }

    const reward = QUEST_REWARDS[String(questId)];
    if (!reward) {
      return res.status(400).json({ error: "Unknown questId" });
    }

    const today = new Date().toISOString().substring(0, 10);
    const existing = await db.select().from(questCompletions).where(and(
      eq(questCompletions.userId, userResult.id),
      eq(questCompletions.questId, String(questId)),
      eq(questCompletions.completedDate, today)
    ));

    if (existing.length === 0) {
      await db.insert(questCompletions).values({
        userId: userResult.id,
        questId: String(questId),
        completedDate: today,
        xpAwarded: reward.xp,
        coinsAwarded: reward.coins
      }).onConflictDoNothing();

      await db.execute(sql`UPDATE profiles SET xp = xp + ${reward.xp}, coins = coins + ${reward.coins} WHERE user_id = ${userResult.id}`);

      // Record a procedural cognitive memory: completed quests are learned routine/habit loops.
      await db.insert(cognitiveMemory).values({
        userId: userResult.id,
        memoryType: "procedural",
        content: { questId: String(questId), xpAwarded: reward.xp, coinsAwarded: reward.coins, date: today },
        consolidationStatus: "consolidated",
        importanceScore: 40
      });
    }

    const newProfileResult = await db.select().from(profiles).where(eq(profiles.userId, userResult.id));
    res.json({ profile: newProfileResult[0], alreadyCompletedToday: existing.length > 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Gamification & Community
router.get("/api/leaderboard", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    
    const topProfiles = await db.select({
      id: users.id,
      name: users.fullName,
      email: users.email,
      xp: profiles.xp,
      level: profiles.level,
      coins: profiles.coins,
      streakDays: profiles.streakDays
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .orderBy(sql`${profiles.xp} DESC`)
    .limit(50);
    
    res.json({ leaderboard: topProfiles });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
