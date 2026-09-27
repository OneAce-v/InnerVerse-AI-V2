import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { profiles, foodLogs, exerciseLogs, journalEntries } from "../db/schema.ts";
import { eq, desc } from "drizzle-orm";
import { getDigitalTwin, DEPENDENCY_MODEL } from "../db/digitalTwinService.ts";
import { generateContentWithRetry } from "../lib/gemini.ts";
import { nonEmptyString } from "../lib/validation.ts";

const router = express.Router();

// Agents API (Coach Nova / InnerVerse AI)
router.post("/api/agents/chat", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const message = nonEmptyString(req.body.message);
    if (!message) return res.status(400).json({ error: "message must be a non-empty string" });
    const history = Array.isArray(req.body.history)
      ? req.body.history.filter((m: any) => m && typeof m.content === "string")
      : [];

    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const profileResult = await db.select().from(profiles).where(eq(profiles.userId, userResult.id));
    const userProfile: any = profileResult[0] || {};

    // Real tracked context for the coach - never invented weather, calendar, or biometrics.
    const today = new Date().toISOString().slice(0, 10);
    const [twin, recentFood, recentExercise, [lastJournal]] = await Promise.all([
      getDigitalTwin(userResult.id),
      db.select().from(foodLogs).where(eq(foodLogs.userId, userResult.id)).orderBy(desc(foodLogs.createdAt)).limit(20),
      db.select().from(exerciseLogs).where(eq(exerciseLogs.userId, userResult.id)).orderBy(desc(exerciseLogs.createdAt)).limit(20),
      db.select().from(journalEntries).where(eq(journalEntries.userId, userResult.id)).orderBy(desc(journalEntries.createdAt)).limit(1),
    ]);
    const isToday = (d: Date | null) => !!d && d.toISOString().slice(0, 10) === today;
    const foodToday = recentFood.filter((f) => isToday(f.createdAt));
    const exerciseToday = recentExercise.filter((e) => isToday(e.createdAt));
    const weakestDomains = Object.entries(twin)
      .filter(([key, state]: [string, any]) => key in DEPENDENCY_MODEL && typeof state?.score === "number")
      .sort(([, a]: any, [, b]: any) => a.score - b.score)
      .slice(0, 3)
      .map(([key, state]: [string, any]) => `${key} ${state.score}/100`)
      .join(", ");

    const prefs = userProfile.preferences || {};
    const coachName = prefs.coachName || "Coach Nova";
    const systemInstruction = `You are "${coachName}", the AI Mentor and ambient companion for InnerVerse AI, an Explainable Agentic Generative AI Framework for Personalized Yoga, Meditation, Exercise and Nutrition Intelligence towards Holistic Human Development.
You coordinate multiple agents (Wellness, Yoga, Meditation, Fitness, Nutrition, Sleep, Mental).

User Profile context:
- Goals: ${userProfile.primaryGoal || 'general wellness'}
- Age: ${userProfile.age || 'unknown'}, Height: ${userProfile.height || '?'}cm, Weight: ${userProfile.weight || '?'}kg
- Sleep: ${userProfile.sleepDuration || 'unknown'}
- Fitness Level: ${userProfile.fitnessLevel || 'unknown'}
- Available Equipment: ${JSON.stringify(userProfile.availableEquipment || [])}
- Stress Level: ${userProfile.stressLevel || 'unknown'}/10
- Diet: ${userProfile.dietType || 'unknown'}${prefs.dietaryStrategy ? ` (strategy: ${prefs.dietaryStrategy})` : ''}

Tracked context (from the user's real logs and Digital Twin):
- Digital Twin overall health index: ${twin.overallHealthIndex?.score ?? 'not yet calibrated'}/100; weakest areas: ${weakestDomains || 'unknown'}
- Meals logged today: ${foodToday.length ? `${foodToday.length} (${foodToday.reduce((s, f) => s + (f.calories || 0), 0)} kcal: ${foodToday.map((f) => f.item).join(', ')})` : 'none'}
- Workouts logged today: ${exerciseToday.length ? exerciseToday.map((e) => `${e.exercise} (${e.durationMins ?? '?'} min)`).join(', ') : 'none'}
- Latest journal mood: ${lastJournal ? `${lastJournal.mood} / ${lastJournal.sentiment} (${lastJournal.date})` : 'no journal entries yet'}

Guidelines:
- Be supportive, concise, and use a modern, confident tone. Keep responses short (under 3-4 sentences) unless they ask a complex question requiring detailed instructions.
- Ground advice in the tracked context above. You have no access to weather, location, calendar, or live heart-rate data - never invent them; if something you'd need is missing, say so or ask.
- Ensure every recommendation uses Explainable AI principles by briefly explaining WHY, what logic/evidence supports it, and any risk factors.
- Maintain flow by acknowledging previous messages in the chat history.${prefs.coachPersonality ? `\n- The user chose a "${prefs.coachPersonality}" personality for you; adopt it.` : ''}${prefs.coachStyle ? `\n- The user chose a "${prefs.coachStyle}" communication style; it overrides the length guideline above.` : ''}`;

    const prompt = `Conversation History:
${history.slice(-10).map((m: any) => `${m.role === 'user' ? 'User' : coachName}: ${m.content}`).join('\n')}

User's new message: "${message}"`;

    let text = "";
    try {
      const response = await generateContentWithRetry({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { systemInstruction }
      });
      text = response.text || "";
    } catch (e) {
      console.warn("[Coach Nova Fallback] Gemini API unavailable, using coach fallback:", e);
      text = `Hello! I am currently running in offline-fallback mode because the AI service is unavailable, so this is a general tip rather than a personalized answer. Keep track of your daily habits, log your meals and workouts, and reflect regularly in your journal. Small, consistent steps build momentum towards your goal of ${userProfile.primaryGoal || 'holistic wellness'}!`;
    }
    
    res.json({ text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
