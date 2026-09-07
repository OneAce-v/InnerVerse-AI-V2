import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { recommendations, behaviorPatterns, interventionEffectiveness } from "../db/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import { getDigitalTwin } from "../db/digitalTwinService.ts";

const router = express.Router();

router.get("/api/research/dashboard", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

    // Recommendations: reshape the real, AI-generated recommendations already produced by the
    // Specialist Agent Council (see /api/recommendations/generate) into the Explainable AI view.
    const recRows = await db.select().from(recommendations).where(and(eq(recommendations.userId, userResult.id), eq(recommendations.status, "active")));
    const recommendationsOut = recRows.map(r => {
      const content: any = r.content || {};
      const evidence: any = {};
      if (r.agentType === "NUTRITION") evidence.nutritional = r.reason;
      else if (r.agentType === "MENTAL" || r.agentType === "MEDITATION") evidence.psychological = r.reason;
      else evidence.biological = r.reason;
      evidence.supportingMetrics = Array.isArray(content.affectedDomains) && content.affectedDomains.length > 0
        ? content.affectedDomains.map((d: string) => `Affects ${d} domain`)
        : [r.expectedBenefit];
      evidence.conflictingMetrics = (r.riskFactors && !/none identified/i.test(r.riskFactors)) ? [r.riskFactors] : [];

      return {
        id: r.id,
        title: r.title,
        dimension: r.agentType,
        priority: r.confidenceScore >= 90 ? "High" : r.confidenceScore >= 75 ? "Medium" : "Low",
        confidence: r.confidenceScore,
        uncertainty: Math.max(0, 100 - r.confidenceScore),
        evidence
      };
    });

    // Predictions: pull the Digital Twin's own already-computed 7-day forecasts for the
    // domains with the largest gap, instead of inventing forecasts.
    const twin = await getDigitalTwin(userResult.id);
    const validKeys = ["physical", "nutrition", "exercise", "recovery", "sleep", "stress", "mental", "emotional", "yoga", "meditation", "habit", "learning", "career", "financial", "social", "purpose"] as const;
    const predictions = validKeys
      .map(key => ({ key, state: (twin as any)[key] }))
      .filter(d => d.state)
      .sort((a, b) => (b.state.gap || 0) - (a.state.gap || 0))
      .slice(0, 3)
      .map(d => ({
        dimension: d.key.charAt(0).toUpperCase() + d.key.slice(1),
        predictedValue: `${d.state.predictedScore7d ?? d.state.score}/100`,
        timeframe: "Next 7 Days",
        confidence: d.state.predictionConfidence ?? d.state.confidence ?? 50,
        uncertainty: Math.max(0, 100 - (d.state.predictionConfidence ?? d.state.confidence ?? 50))
      }));

    const behaviorPatternRows = await db.select().from(behaviorPatterns).where(eq(behaviorPatterns.userId, userResult.id)).orderBy(desc(behaviorPatterns.detectedAt));
    const behaviorPatternsOut = behaviorPatternRows.map(p => ({
      name: p.patternName,
      type: p.patternType,
      frequency: p.frequency,
      trigger: p.trigger,
      impact: p.impact
    }));

    const interventionRows = await db.select().from(interventionEffectiveness).where(eq(interventionEffectiveness.userId, userResult.id)).orderBy(desc(interventionEffectiveness.createdAt));
    const interventionsOut = interventionRows.map(i => ({
      title: i.analysis || `Recommendation #${i.recommendationId}`,
      baseline: i.baselineScore,
      post: i.postScore,
      adherence: i.adherenceRate,
      status: i.successStatus
    }));

    res.json({
      recommendations: recommendationsOut,
      predictions,
      behaviorPatterns: behaviorPatternsOut,
      interventions: interventionsOut
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
