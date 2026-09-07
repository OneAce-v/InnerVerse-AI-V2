import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { profiles, recommendations, foodLogs, exerciseLogs, journalEntries } from "../db/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import { getDigitalTwin } from "../db/digitalTwinService.ts";
import { runSupervisor } from "../agents/supervisor.ts";
import { generateContentWithRetry } from "../lib/gemini.ts";

const router = express.Router();

// Global in-memory caches for API rate limit protection
const briefingCache: Record<string, { briefing: any; conflictResolutionLog: string; timestamp: number }> = {};
const recommendationsCache: Record<string, { recommendations: any[]; conflictResolutionLog: string; timestamp: number }> = {};

// Dashboard & Recommendations
router.post("/api/recommendations/generate", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const profileResult = await db.select().from(profiles).where(eq(profiles.userId, userResult.id));
    const userProfile: any = profileResult[0];

    if (!userProfile) {
       return Object.assign(res.status(400), { json: () => {} }).json({ error: "Profile not found. Please complete onboarding." });
    }

    // Fetch recent logs
    const recentFood = await db.select()
      .from(foodLogs)
      .where(eq(foodLogs.userId, userResult.id))
      .orderBy(desc(foodLogs.createdAt))
      .limit(10);

    const recentExercise = await db.select()
      .from(exerciseLogs)
      .where(eq(exerciseLogs.userId, userResult.id))
      .orderBy(desc(exerciseLogs.createdAt))
      .limit(10);

    const recentJournal = await db.select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, userResult.id))
      .orderBy(desc(journalEntries.createdAt))
      .limit(10);

    // Check cache first
    const cacheKey = `${userResult.id}_recs_${recentFood.length}_${recentExercise.length}_${recentJournal.length}`;
    const now = Date.now();
    const cached = recommendationsCache[cacheKey];
    if (cached && (now - cached.timestamp < 10 * 60 * 1000)) {
      console.log(`[Cache Hit] Returning cached recommendations for user ${userResult.id}`);
      const dbRecs = await db.select().from(recommendations).where(eq(recommendations.userId, userResult.id));
      if (dbRecs.length > 0) {
        return res.json({ recommendations: dbRecs, conflictResolutionLog: cached.conflictResolutionLog, cached: true });
      }
    }

    const digitalTwin = await getDigitalTwin(userResult.id);

    // Run Supervisor to coordinate specialized agents (Yoga, Meditation, Fitness, Nutrition, Sleep, Mental, etc.)
    console.log(`[Supervisor] Generating agentic recommendations for user ${userResult.id}...`);
    const supervisorResult = await runSupervisor(
      userProfile,
      digitalTwin,
      { food: recentFood, exercise: recentExercise, journal: recentJournal },
      "manual"
    );

    // Delete stale recommendations so the user has the absolute latest fresh multi-agent plan
    await db.delete(recommendations).where(eq(recommendations.userId, userResult.id));

    // Insert fresh supervised agentic recommendations into DB
    for (const rec of supervisorResult.recommendations) {
      await db.insert(recommendations).values({
        userId: userResult.id,
        agentType: rec.agentType || "WELLNESS",
        title: rec.title || "Generic Recommendation",
        reason: rec.reason || "AI Insight",
        evidence: rec.evidence || "Wellness principles",
        confidenceScore: rec.confidenceScore || 85,
        expectedBenefit: rec.expectedBenefit || "General well-being",
        riskFactors: rec.riskFactors || "None identified",
        content: {
          alternatives: rec.alternatives || [],
          affectedDomains: rec.affectedDomains || [],
          hdiImprovement: rec.hdiImprovement || 0,
          conflictResolutionLog: supervisorResult.conflictResolutionLog || "No conflict detected."
        } as any
      });
    }

    // Update Cache
    recommendationsCache[cacheKey] = {
      recommendations: supervisorResult.recommendations,
      conflictResolutionLog: supervisorResult.conflictResolutionLog || "No conflict detected.",
      timestamp: now
    };

    const freshRecs = await db.select().from(recommendations).where(eq(recommendations.userId, userResult.id));
    res.json({ recommendations: freshRecs, conflictResolutionLog: supervisorResult.conflictResolutionLog });

  } catch (error: any) {
    console.error("[Recommendations Generation Error]", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/briefings", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const profileResult = await db.select().from(profiles).where(eq(profiles.userId, userResult.id));
    const userProfile: any = profileResult[0];

    if (!userProfile) {
      return Object.assign(res.status(400), { json: () => {} }).json({ error: "Profile not found." });
    }

    const recentFood = await db.select()
      .from(foodLogs)
      .where(eq(foodLogs.userId, userResult.id))
      .orderBy(desc(foodLogs.createdAt))
      .limit(10);

    const recentExercise = await db.select()
      .from(exerciseLogs)
      .where(eq(exerciseLogs.userId, userResult.id))
      .orderBy(desc(exerciseLogs.createdAt))
      .limit(10);

    const recentJournal = await db.select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, userResult.id))
      .orderBy(desc(journalEntries.createdAt))
      .limit(10);

    const timeframe = (req.query.timeframe as "daily" | "weekly" | "monthly") || "daily";

    // Check Cache
    const cacheKey = `${userResult.id}_briefing_${timeframe}_${recentFood.length}_${recentExercise.length}_${recentJournal.length}`;
    const now = Date.now();
    const cached = briefingCache[cacheKey];
    if (cached && (now - cached.timestamp < 10 * 60 * 1000)) {
      console.log(`[Cache Hit] Returning cached ${timeframe} briefing for user ${userResult.id}`);
      return res.json({ briefing: cached.briefing, conflictResolutionLog: cached.conflictResolutionLog, cached: true });
    }

    const digitalTwin = await getDigitalTwin(userResult.id);

    console.log(`[Supervisor] Generating proactive briefing (${timeframe}) for user ${userResult.id}...`);
    const supervisorResult = await runSupervisor(
      userProfile,
      digitalTwin,
      { food: recentFood, exercise: recentExercise, journal: recentJournal },
      timeframe
    );

    // Update Cache
    briefingCache[cacheKey] = {
      briefing: supervisorResult.briefing,
      conflictResolutionLog: supervisorResult.conflictResolutionLog || "No conflict detected.",
      timestamp: now
    };

    res.json({ briefing: supervisorResult.briefing, conflictResolutionLog: supervisorResult.conflictResolutionLog });
  } catch (error: any) {
    console.error("[Briefing Generation Error]", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/simulation", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const { query } = req.body;
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const digitalTwin = await getDigitalTwin(userResult.id);

    const prompt = `You are the InnerVerse AI Simulation Engine (Predictive Digital Twin Model).
The user is asking a "What if" simulation query: "${query}".

Current Digital Twin Context:
- Overall Health Score: ${digitalTwin.overallHealthIndex?.score || 65}
- Top strengths: ${Object.entries(digitalTwin).filter(([k, v]: any) => v && v.score > 75 && k !== 'overallHealthIndex' && k !== 'researchMetadata').map(([k]) => k).join(', ')}
- Areas for improvement: ${Object.entries(digitalTwin).filter(([k, v]: any) => v && v.score < 60 && k !== 'overallHealthIndex' && k !== 'researchMetadata').map(([k]) => k).join(', ')}

Predict the outcome of this action on their future wellness. Be scientifically grounded (referencing habit formation, exercise science, or sleep science).

Return a JSON object with the following structure:
{
"hdi": "String representing the new expected HDI score (e.g., '78/100 (+4)')",
"timeline": "String (e.g., '30 days', '7 days', '6 months')",
"confidence": Integer (0-100),
"riskLevel": "Low" | "Medium" | "High",
"explanation": "A 2-3 sentence scientific explanation of the simulated outcome, including momentum shifts.",
"domainChanges": [
  { "domain": "physical", "change": 5 },
  { "domain": "sleep", "change": 10 }
]
}`;

    let simulationResult: any = {
      hdi: "72/100 (+2)",
      timeline: "14 days",
      confidence: 85,
      riskLevel: "Low",
      explanation: "Consistent execution of this action initiates positive compounding effects across the nervous system.",
      domainChanges: [{ domain: "physical", change: 3 }]
    };

    try {
      const response = await generateContentWithRetry({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
      simulationResult = JSON.parse(response.text || "{}");
    } catch (e) {
      console.warn("Simulation gemini error fallback:", e);
    }

    res.json({ simulation: simulationResult });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/recommendations", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    
    const result = await db.select().from(recommendations).where(eq(recommendations.userId, userResult.id));
    res.json({ recommendations: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/omnibar", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const { query } = req.body;
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    
    const profileResult = await db.select().from(profiles).where(eq(profiles.userId, userResult.id));
    const userProfile: any = profileResult[0] || {};
    
    const prompt = `You are "InnerVerse AI", the intelligent coach for ${userProfile.name || 'this user'}.
The user has asked you a quick question via the global omnibar search: "${query}".
Answer naturally and directly in 1-2 short sentences. Do not use markdown. If it's a question about their data, infer from their profile (goal: ${userProfile.primaryGoal || 'wellness'}, sleep: ${userProfile.sleepDuration || 'avg'}, activity: ${userProfile.activityLevel || 'moderate'}).`;

    let answer = "";
    try {
      const response = await generateContentWithRetry({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      answer = response.text || "";
    } catch (e) {
      console.warn("[Omnibar Fallback] Gemini API unavailable, using offline response:", e);
      answer = `To monitor your health index and progress, review the 16-Domain Digital Twin. Keep logging your meals and exercise to train your twin!`;
    }

    res.json({ answer });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
