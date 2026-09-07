import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { journalEntries, cognitiveMemory } from "../db/schema.ts";
import { eq, and, sql } from "drizzle-orm";
import { recalibrateDigitalTwin, updateDigitalTwinState } from "../db/digitalTwinService.ts";
import { generateContentWithRetry } from "../lib/gemini.ts";

const router = express.Router();

// Journal API
router.post("/api/journal", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const { content, date: bodyDate } = req.body;
    const date = bodyDate || new Date().toISOString().substring(0, 10);
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

    // Analyze entry with AI
    const prompt = `Analyze the following journal entry for a wellness platform.
Extract the overall sentiment (Positive, Negative, Neutral, Mixed), the dominant mood (e.g., Anxious, Reflective, Energized, Calm), and a 1-sentence summary of the entry.
Return as JSON strictly: {"sentiment": "string", "mood": "string", "summary": "string"}

Journal Entry: "${content}"`;

    let aiAnalysis = { sentiment: 'Neutral', mood: 'Calm', summary: 'User logged an entry.' };
    try {
      const response = await generateContentWithRetry({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      if (response.text) {
         aiAnalysis = JSON.parse(response.text);
      }
    } catch (e) {
      console.warn("[Journal Fallback] Gemini API unavailable, applying custom sentiment heuristics:", e);
      const lower = String(content || "").toLowerCase();
      let sentiment = "Neutral";
      let mood = "Reflective";
      
      if (lower.includes("happy") || lower.includes("great") || lower.includes("good") || lower.includes("love") || lower.includes("excited") || lower.includes("wonderful") || lower.includes("amazing") || lower.includes("peaceful")) {
        sentiment = "Positive";
        mood = "Calm";
      } else if (lower.includes("sad") || lower.includes("tired") || lower.includes("bad") || lower.includes("anxious") || lower.includes("stress") || lower.includes("worry") || lower.includes("hurt") || lower.includes("angry") || lower.includes("pain")) {
        sentiment = "Negative";
        mood = (lower.includes("stress") || lower.includes("anxious") || lower.includes("worry")) ? "Anxious" : "Tired";
      }
      
      let cleanSummary = String(content || "").substring(0, 60);
      if (String(content || "").length > 60) {
        cleanSummary += "...";
      }
      
      aiAnalysis = {
        sentiment,
        mood,
        summary: `Reflection logged: "${cleanSummary}"`
      };
    }

    const dbValues = {
      userId: userResult.id,
      content,
      date,
      ...aiAnalysis
    };
    
    const result = await db.insert(journalEntries).values(dbValues).returning();

    // Record an episodic cognitive memory of this reflection for the Cognition dashboard.
    await db.insert(cognitiveMemory).values({
      userId: userResult.id,
      memoryType: "episodic",
      content: { date, mood: aiAnalysis.mood, sentiment: aiAnalysis.sentiment, summary: aiAnalysis.summary },
      consolidationStatus: "raw",
      importanceScore: aiAnalysis.sentiment === "Negative" ? 70 : 50
    });

    // Update emotional, mental, and stress states in Digital Twin based on sentiment/mood analysis
    await updateDigitalTwinState(userResult.id, "emotional", {
      score: aiAnalysis.sentiment === "Positive" ? 85 : aiAnalysis.sentiment === "Negative" ? 45 : 65,
      supportingEvidence: `Mood analyzed as "${aiAnalysis.mood}" with "${aiAnalysis.sentiment}" sentiment in journal entry.`,
      aiSummary: `Emotional state is currently evaluated as "${aiAnalysis.mood}" following journal entry insights.`
    });
    await updateDigitalTwinState(userResult.id, "mental", {
      score: aiAnalysis.mood === "Reflective" || aiAnalysis.mood === "Energized" ? 82 : aiAnalysis.mood === "Anxious" ? 52 : 70,
      supportingEvidence: `User logged thoughts with dominant mood: ${aiAnalysis.mood}.`,
      aiSummary: `Reflective journaling is supporting mental focus and cognitive resilience.`
    });
    // Fire holistic recalibration in the background
    recalibrateDigitalTwin(userResult.id).catch(err => console.error("Twin bg recalibrate fail", err));

    res.json({ entry: result[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/journal", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    
    const result = await db.select().from(journalEntries).where(eq(journalEntries.userId, userResult.id)).orderBy(sql`${journalEntries.createdAt} DESC`);
    res.json({ entries: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
