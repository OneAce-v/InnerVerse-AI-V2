import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { cognitiveMemory, researchExperiments } from "../db/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import { getDigitalTwin, getDigitalTwinHistory } from "../db/digitalTwinService.ts";
import { timeAgo } from "../lib/serverHelpers.ts";

const router = express.Router();

router.get("/api/cognition", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

    // Memory System: real cognitiveMemory rows written as the user journals, recalibrates
    // their twin, and completes quests (see /api/journal, digitalTwinService, /api/quests/complete).
    const memoryRows = await db.select().from(cognitiveMemory).where(eq(cognitiveMemory.userId, userResult.id));
    const memoryByType = new Map<string, { count: number; latest: Date | null; status: string }>();
    for (const m of memoryRows) {
      const entry = memoryByType.get(m.memoryType) || { count: 0, latest: null, status: m.consolidationStatus || "raw" };
      entry.count += 1;
      const updated = m.updatedAt ? new Date(m.updatedAt) : null;
      if (updated && (!entry.latest || updated > entry.latest)) {
        entry.latest = updated;
        entry.status = m.consolidationStatus || "raw";
      }
      memoryByType.set(m.memoryType, entry);
    }
    const memorySystem = Array.from(memoryByType.entries()).map(([type, v]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      count: v.count,
      status: v.status.charAt(0).toUpperCase() + v.status.slice(1),
      lastUpdated: timeAgo(v.latest)
    }));

    // Meta-Reasoning: derived from the real Digital Twin snapshot audit trail, not invented counters.
    const twin = await getDigitalTwin(userResult.id);
    const snapshots = await getDigitalTwinHistory(userResult.id);
    const correctedAssumptions = snapshots.filter(s => s.triggerSource.startsWith("manual_update_") || s.triggerSource.includes("recalibrate")).length;
    const latestSnapshot = snapshots[0];

    const researchExperimentRows = await db.select().from(researchExperiments).where(eq(researchExperiments.userId, userResult.id)).orderBy(desc(researchExperiments.createdAt));
    const researchExperimentsOut = researchExperimentRows.map(e => {
      const daysElapsed = e.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(e.createdAt).getTime()) / (24 * 3600 * 1000))) : 0;
      return {
        id: e.id,
        hypothesis: e.hypothesis,
        status: e.status,
        significance: e.statisticalSignificance,
        duration: e.concludedAt ? undefined : `${daysElapsed} day${daysElapsed === 1 ? "" : "s"} elapsed`,
        result: (e.results as any)?.result
      };
    });

    const validKeys = ["physical", "nutrition", "exercise", "recovery", "sleep", "stress", "mental", "emotional", "yoga", "meditation", "habit", "learning", "career", "financial", "social", "purpose"] as const;
    let lowestKey: string = "sleep";
    let lowestState: any = null;
    for (const key of validKeys) {
      const state = (twin as any)[key];
      if (state && (!lowestState || state.score < lowestState.score)) {
        lowestState = state;
        lowestKey = key;
      }
    }
    const overallScore = twin.overallHealthIndex?.score ?? 65;
    const baselineLabel = overallScore >= 80 ? "Peak Performance State" : overallScore >= 60 ? "Stable Development State" : "Foundational Calibration State";

    res.json({
      memorySystem,
      metaReasoning: {
        confidenceScore: twin.overallHealthIndex?.confidenceAdjustedScore ?? 0,
        correctedAssumptions,
        recentSelfCorrection: latestSnapshot?.generatedSummary || "No recalibrations recorded yet.",
        decisionAudits: snapshots.length
      },
      researchExperiments: researchExperimentsOut,
      twinProjections: {
        currentBaseline: `${baselineLabel} (Overall Health Index: ${overallScore}/100)`,
        forecast30Days: lowestState ? `${lowestKey.charAt(0).toUpperCase() + lowestKey.slice(1)} projected to move from ${lowestState.score} to ${lowestState.predictedScore30d ?? lowestState.score} over 30 days (${lowestState.riskLevel || "Medium"} risk).` : "Insufficient data to project.",
        suggestedIntervention: lowestState ? `${lowestState.expectedImprovement || "Steady progress"} expected over ${lowestState.estimatedTime || "several weeks"} if current habits continue.` : "Log activity to generate a projection."
      }
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/cognition/experiments", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const { hypothesis, experimentType } = req.body;
    if (!hypothesis) return res.status(400).json({ error: "hypothesis is required" });

    const [experiment] = await db.insert(researchExperiments).values({
      userId: userResult.id,
      hypothesis,
      experimentType: experimentType || "longitudinal",
      status: "running"
    }).returning();

    res.json({ experiment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
