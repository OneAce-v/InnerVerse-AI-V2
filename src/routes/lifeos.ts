import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { recommendations, systemHealth, orchestrationTasks, digitalTwins } from "../db/schema.ts";
import { eq, and, sql } from "drizzle-orm";
import { getDigitalTwin } from "../db/digitalTwinService.ts";
import { timeAgo } from "../lib/serverHelpers.ts";

const router = express.Router();

router.get("/api/lifeos/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

    const twin = await getDigitalTwin(userResult.id);
    const [twinRow] = await db.select().from(digitalTwins).where(eq(digitalTwins.userId, userResult.id));
    const twinAgeMs = twinRow?.updatedAt ? Date.now() - new Date(twinRow.updatedAt).getTime() : Infinity;
    const supervisorStatus = twinAgeMs < 24 * 3600 * 1000 ? "Active" : "Idle";

    const activeRecs = await db.select().from(recommendations).where(and(eq(recommendations.userId, userResult.id), eq(recommendations.status, "active")));
    const activeAgents = new Set(activeRecs.map(r => r.agentType)).size;

    const userTasks = await db.select().from(orchestrationTasks).where(eq(orchestrationTasks.userId, userResult.id));
    const todoTasks = userTasks.filter(t => t.status === "todo");

    let dbReachable = true;
    try { await db.execute(sql`SELECT 1`); } catch { dbReachable = false; }

    const agentDomainMap: { name: string; key: string }[] = [
      { name: "Physical Health", key: "physical" },
      { name: "Mental Wellness", key: "mental" },
      { name: "Nutrition Intelligence", key: "nutrition" },
      { name: "Habit Formation", key: "habit" },
      { name: "Learning", key: "learning" }
    ];
    const agents = agentDomainMap.map(({ name, key }) => {
      const state = (twin as any)[key];
      const status = !state ? "idle" : state.trend === "up" ? "optimizing" : state.trend === "down" ? "analyzing" : "idle";
      const load = !state ? "low" : (state.gap || 0) >= 25 ? "high" : (state.gap || 0) >= 10 ? "medium" : "low";
      return { name, status, load };
    });

    const recentDecisions = activeRecs
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 3)
      .map(r => ({
        id: r.id,
        topic: r.agentType,
        recommendation: r.title,
        confidence: r.confidenceScore,
        time: timeAgo(r.createdAt),
        agentsInvolved: [r.agentType]
      }));

    const todayStr = new Date().toISOString().substring(0, 10);
    const todaysTasks = userTasks.filter(t => t.dueDate && new Date(t.dueDate).toISOString().substring(0, 10) === todayStr);
    const doneToday = todaysTasks.filter(t => t.status === "done").length;
    const progress = todaysTasks.length > 0 ? Math.round((doneToday / todaysTasks.length) * 100) : 0;
    const nextTask = todaysTasks.find(t => t.status !== "done");
    const upcoming = todaysTasks
      .filter(t => t.status !== "done")
      .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
      .map(t => ({
        time: t.dueDate ? new Date(t.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        title: t.title,
        type: "task"
      }));

    const validKeys = ["physical", "nutrition", "exercise", "recovery", "sleep", "stress", "mental", "emotional", "yoga", "meditation", "habit", "learning", "career", "financial", "social", "purpose"] as const;
    const activeOptimizations = validKeys
      .map(key => ({ key, state: (twin as any)[key] }))
      .filter(d => d.state)
      .sort((a, b) => (b.state.gap || 0) - (a.state.gap || 0))
      .slice(0, 2)
      .map(d => ({
        dimension: d.key.charAt(0).toUpperCase() + d.key.slice(1),
        currentScore: d.state.score,
        targetScore: d.state.targetScore,
        strategy: `${d.state.expectedImprovement || "Steady progress"} over ${d.state.estimatedTime || "several weeks"}`
      }));

    res.json({
      supervisorStatus,
      activeAgents,
      pendingTasks: todoTasks.length,
      systemHealth: dbReachable ? "Optimal" : "Degraded",
      agents,
      recentDecisions,
      dailyPlan: {
        progress,
        nextTask: nextTask?.title || "No tasks scheduled today",
        upcoming
      },
      activeOptimizations
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
