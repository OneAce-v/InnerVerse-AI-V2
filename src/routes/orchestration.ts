import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { profiles, users, lifeMissions, goals, orchestrationTasks } from "../db/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import { getDigitalTwin } from "../db/digitalTwinService.ts";
import { generateContentWithRetry } from "../lib/gemini.ts";

const router = express.Router();

router.get("/api/orchestration", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

    let userMissions = await db.select().from(lifeMissions).where(eq(lifeMissions.userId, userResult.id)).orderBy(desc(lifeMissions.createdAt));
    let userGoals = await db.select().from(goals).where(eq(goals.userId, userResult.id)).orderBy(desc(goals.priorityScore));
    let userTasks = await db.select().from(orchestrationTasks).where(eq(orchestrationTasks.userId, userResult.id)).orderBy(orchestrationTasks.dueDate);

    // First-time users get one real mission + goals seeded from their own profile and Digital Twin
    // gaps (not fabricated demo content) so the page isn't permanently empty.
    if (userMissions.length === 0) {
      const profileResult = await db.select().from(profiles).where(eq(profiles.userId, userResult.id));
      const userProfile: any = profileResult[0] || {};
      const twin = await getDigitalTwin(userResult.id);

      const [seededMission] = await db.insert(lifeMissions).values({
        userId: userResult.id,
        title: userProfile.primaryGoal ? `Achieve: ${userProfile.primaryGoal}` : "Holistic Human Development",
        vision: `Long-term mission generated from your onboarding goal and current Digital Twin baseline (Overall Health Index: ${twin.overallHealthIndex?.score ?? 65}/100).`,
        alignmentScore: twin.overallHealthIndex?.confidenceAdjustedScore ?? 70
      }).returning();
      userMissions = [seededMission];

      const domainKeys: (keyof typeof twin)[] = ["physical", "nutrition", "exercise", "sleep", "mental", "learning"] as any;
      const gapRanked = domainKeys
        .map(k => ({ key: k as string, state: (twin as any)[k] }))
        .filter(d => d.state)
        .sort((a, b) => (b.state.gap || 0) - (a.state.gap || 0))
        .slice(0, 2);

      for (const d of gapRanked) {
        const [seededGoal] = await db.insert(goals).values({
          userId: userResult.id,
          missionId: seededMission.id,
          title: `Close the ${d.key} gap (${d.state.score} → ${d.state.targetScore})`,
          domain: d.key,
          status: "active",
          progress: d.state.progressPercentage || 0,
          priorityScore: d.state.priority === "High" ? 85 : d.state.priority === "Medium" ? 60 : 35,
          targetDate: new Date(Date.now() + 60 * 24 * 3600 * 1000)
        }).returning();
        userGoals.push(seededGoal);
      }
    }

    const missions = userMissions.map(m => ({ id: m.id, title: m.title, vision: m.vision, alignmentScore: m.alignmentScore }));
    const formattedGoals = userGoals.map(g => ({
      id: g.id,
      title: g.title,
      domain: g.domain,
      status: g.status,
      progress: g.progress,
      priority: g.priorityScore,
      target: g.targetDate ? new Date(g.targetDate).toISOString().substring(0, 10) : null
    }));
    const plans = userTasks
      .filter(t => t.status !== "done")
      .map(t => {
        const due = t.dueDate ? new Date(t.dueDate) : null;
        const time = due ? due.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Unscheduled";
        return { id: t.id, title: t.title, time, status: t.status, ai: t.aiGenerated, reason: t.description || "" };
      });

    res.json({ missions, goals: formattedGoals, plans });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/orchestration/missions", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const { title, vision } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });

    const [mission] = await db.insert(lifeMissions).values({
      userId: userResult.id,
      title,
      vision: vision || "",
      alignmentScore: 100
    }).returning();

    res.json({ mission });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/orchestration/tasks/:id/complete", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId)) return res.status(400).json({ error: "Invalid task id" });

    const [task] = await db.update(orchestrationTasks)
      .set({ status: "done", updatedAt: new Date() })
      .where(and(eq(orchestrationTasks.id, taskId), eq(orchestrationTasks.userId, userResult.id)))
      .returning();

    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json({ task });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/orchestration/decision", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const { query } = req.body;
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    
    const prompt = `You are the InnerVerse Supervisor AI (Decision Intelligence Engine).
The user is facing a strategic decision: "${query}".

Analyze this decision considering long-term holistic human development, opportunity costs, and risks.
Provide two options (A and B) with pros, cons, and a final Supervisor Recommendation that prioritizes the user's primary wellness missions.

Return a JSON object with this structure:
{
"optionA": { "title": "...", "pros": ["..."], "cons": ["..."] },
"optionB": { "title": "...", "pros": ["..."], "cons": ["..."] },
"recommendation": "..."
}`;

    let decisionResult = {
      optionA: { title: "Accept", pros: ["Career Growth"], cons: ["Sleep Debt"] },
      optionB: { title: "Decline", pros: ["Stable Health"], cons: ["Missed promotion"] },
      recommendation: "Maintain balance."
    };
    
    try {
      const response = await generateContentWithRetry({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      decisionResult = JSON.parse(response.text || "{}");
    } catch (e) {
      console.warn("Decision gemini error fallback:", e);
    }

    res.json({ decision: decisionResult });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
