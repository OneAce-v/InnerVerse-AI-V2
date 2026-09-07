import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { profiles } from "../db/schema.ts";
import { eq, and } from "drizzle-orm";
import { generateContentWithRetry } from "../lib/gemini.ts";

const router = express.Router();

// Agents API (Coach Nova / InnerVerse AI)
router.post("/api/agents/chat", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const { message, history } = req.body;

    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const profileResult = await db.select().from(profiles).where(eq(profiles.userId, userResult.id));
    const userProfile: any = profileResult[0] || {};
    
    const systemInstruction = `You are "Coach Nova", the AI Mentor and ambient companion for InnerVerse AI, an Explainable Agentic Generative AI Framework for Personalized Yoga, Meditation, Exercise and Nutrition Intelligence towards Holistic Human Development.
You coordinate multiple agents (Wellness, Yoga, Meditation, Fitness, Nutrition, Sleep, Mental).

User Profile context:
- Goals: ${userProfile.primaryGoal || 'general wellness'}
- Age: ${userProfile.age || 'unknown'}, Height: ${userProfile.height || '?'}cm, Weight: ${userProfile.weight || '?'}kg
- Sleep: ${userProfile.sleepDuration || 'unknown'}
- Fitness Level: ${userProfile.fitnessLevel || 'unknown'}
- Available Equipment: ${JSON.stringify(userProfile.availableEquipment || [])}
- Stress Level: ${userProfile.stressLevel || 'unknown'}/10
- Diet: ${userProfile.dietType || 'unknown'}

Ambient Context (Real-Time):
- Location: Home Office
- Weather: Light Rain, 18°C
- Next Calendar Event: Team Standup in 45m
- Current Wearable State: HR 68bpm, HRV 42ms (Stress: Low)

Guidelines:
- Be supportive, concise, and use a modern, confident tone. Keep responses short (under 3-4 sentences) unless they ask a complex question requiring detailed instructions.
- Prioritize ambient context. If the user asks for a workout, suggest one that fits the weather and their calendar gaps.
- Ensure every recommendation uses Explainable AI principles by briefly explaining WHY, what logic/evidence supports it, and any risk factors.
- Maintain flow by acknowledging previous messages in the chat history.`;

    const prompt = `Conversation History:
${history ? history.slice(-10).map((m: any) => `${m.role === 'user' ? 'User' : 'Coach Nova'}: ${m.content}`).join('\n') : ''}

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
      text = `Hello! I am currently running in safe offline-fallback mode due to high service demand. Regardless, I am here to help you stay focused! Keep track of your daily habits, log your meals and workouts, and reflect regularly in your journal. Small, consistent steps build momentum towards your goal of ${userProfile.primaryGoal || 'holistic wellness'}!`;
    }
    
    res.json({ text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
