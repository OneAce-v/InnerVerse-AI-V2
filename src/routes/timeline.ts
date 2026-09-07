import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { profiles, foodLogs, exerciseLogs, journalEntries } from "../db/schema.ts";
import { eq, and, sql } from "drizzle-orm";
import { recalibrateDigitalTwin, updateDigitalTwinState } from "../db/digitalTwinService.ts";

const router = express.Router();

router.get("/api/timeline", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    
    const food = await db.select().from(foodLogs).where(eq(foodLogs.userId, userResult.id)).orderBy(sql`${foodLogs.createdAt} DESC`).limit(10);
    const exercises = await db.select().from(exerciseLogs).where(eq(exerciseLogs.userId, userResult.id)).orderBy(sql`${exerciseLogs.createdAt} DESC`).limit(10);
    const journals = await db.select().from(journalEntries).where(eq(journalEntries.userId, userResult.id)).orderBy(sql`${journalEntries.createdAt} DESC`).limit(15);
    
    let timeline: any[] = [];
    
    food.forEach(f => {
       timeline.push({ id: `f-${f.id}`, time: f.createdAt, event: `${f.item} (${f.calories || 0} kcal)`, type: 'nutrition' });
    });
    exercises.forEach(e => {
       timeline.push({ id: `e-${e.id}`, time: e.createdAt, event: `${e.exercise} (${e.durationMins || 0}m)`, type: 'activity' });
    });
    journals.forEach(j => {
       let type = 'mindfulness';
       let label = j.content;
       if (j.content.startsWith("[Bedtime CheckIn")) {
         label = `Guided Bedtime Routine: ${j.content.split(']')[1] || j.content}`;
         type = 'sleep';
       } else if (j.content.startsWith("[Custom Event]")) {
         label = j.content.replace("[Custom Event] ", "");
         type = 'custom';
       } else {
         label = `Logged Journal Thoughts: "${j.summary || j.content.substring(0, 45)}..."`;
       }
       timeline.push({ id: `j-${j.id}`, time: j.createdAt, event: label, type });
    });
    
    timeline.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    
    // format time strings with date support
    timeline = timeline.map(t => {
       const date = new Date(t.time);
       const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
       const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
       return { ...t, time: `${formattedDate}, ${formattedTime}` };
    });

    res.json({ timeline });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/timeline/custom", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    
    const result = await db.insert(journalEntries).values({
      userId: userResult.id,
      date: new Date().toISOString().substring(0, 10),
      content: `[Custom Event] ${text}`,
      sentiment: "neutral",
      mood: "stable",
      summary: text
    }).returning();
    
    // Award 15 XP for logging a timeline item
    await db.execute(sql`UPDATE profiles SET xp = xp + 15, coins = coins + 5 WHERE user_id = ${userResult.id}`);

    // Update habit or relevant custom state, and trigger background recalibration
    await updateDigitalTwinState(userResult.id, "habit", {
      score: 75,
      supportingEvidence: `Logged custom event: ${text}.`,
      aiSummary: `Consistency strengthened by logging real-world event: "${text}".`
    });
    recalibrateDigitalTwin(userResult.id).catch(err => console.error("Twin bg recalibrate fail", err));

    res.json({ success: true, entry: result[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
