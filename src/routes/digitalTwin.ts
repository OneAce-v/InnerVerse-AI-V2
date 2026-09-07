import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { notifications, goals } from "../db/schema.ts";
import { getDigitalTwin, recalibrateDigitalTwin, updateDigitalTwinState, getDigitalTwinHistory, getDigitalTwinDependencies, getDigitalTwinContributors, getDigitalTwinGoals, getDigitalTwinConfidence } from "../db/digitalTwinService.ts";

const router = express.Router();

// --- Digital Twin API ---
router.get("/api/digital-twin", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    
    const twin = await getDigitalTwin(userResult.id);
    res.json({ twin });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/digital-twin/recalibrate", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

    const twin = await recalibrateDigitalTwin(userResult.id);

    const score = twin.overallHealthIndex?.score;
    if (score !== undefined) {
      await db.insert(notifications).values({
        userId: userResult.id,
        title: "Digital Twin Recalibrated",
        message: `Your Overall Health Index is now ${score}/100. ${twin.overallHealthIndex?.explanation || ""}`.trim(),
        type: "recommendation"
      });
    }

    res.json({ twin });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/digital-twin/update", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const { stateName, score, trend, confidence, supportingEvidence, aiSummary } = req.body;
    
    if (!stateName) {
      return res.status(400).json({ error: "stateName is required" });
    }
    
    const twin = await updateDigitalTwinState(userResult.id, stateName, {
      score,
      trend,
      confidence,
      supportingEvidence,
      aiSummary
    });
    
    res.json({ twin });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Expanded Digital Twin Engine API ---
router.get("/api/digital-twin/history", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const history = await getDigitalTwinHistory(userResult.id);
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/digital-twin/dependencies", requireAuth, async (req: AuthRequest, res) => {
  try {
    const dependencies = getDigitalTwinDependencies();
    res.json({ dependencies });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/digital-twin/contributors", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const contributors = await getDigitalTwinContributors(userResult.id);
    res.json({ contributors });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/digital-twin/goals", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const goals = await getDigitalTwinGoals(userResult.id);
    res.json({ goals });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/digital-twin/confidence", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const confidence = await getDigitalTwinConfidence(userResult.id);
    res.json({ confidence });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
