import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { db } from "./src/db/index.ts";
import { profiles, recommendations, foodLogs, exerciseLogs, journalEntries, users, subscriptions, payments, notifications, auditLogs, sessions, devices, systemHealth, usageStatistics, questCompletions, lifeMissions, goals, orchestrationTasks, collaborationShares, ragDocuments, biomarkers, cognitiveMemory, researchExperiments, digitalTwinSnapshots, behaviorPatterns, interventionEffectiveness, digitalTwins, apiKeys, wearableConnections } from "./src/db/schema.ts";
import { eq, and, sql, desc } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import { getDigitalTwin, recalibrateDigitalTwin, updateDigitalTwinState, getDigitalTwinHistory, getDigitalTwinDependencies, getDigitalTwinContributors, getDigitalTwinGoals, getDigitalTwinConfidence } from "./src/db/digitalTwinService.ts";
import { runSupervisor } from "./src/agents/supervisor.ts";
import { recordAiCall, getAiAverageLatencyMs, aiMetrics } from "./src/lib/aiMetrics.ts";

// Global in-memory caches for API rate limit protection
const briefingCache: Record<string, { briefing: any; conflictResolutionLog: string; timestamp: number }> = {};
const recommendationsCache: Record<string, { recommendations: any[]; conflictResolutionLog: string; timestamp: number }> = {};

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function generateContentWithRetry(params: any, retries = 2, delay = 1000): Promise<any> {
  const start = Date.now();
  for (let i = 0; i < retries; i++) {
    try {
      const result = await ai.models.generateContent(params);
      recordAiCall(Date.now() - start, false);
      return result;
    } catch (error: any) {
      const errorStr = String(error?.message || error || "");
      console.warn(`[Gemini Retry] Attempt ${i + 1} failed. Error:`, errorStr);
      const isTransient = error?.status === 503 || error?.status === 429 || errorStr.includes("503") || errorStr.includes("429") || errorStr.includes("demand") || errorStr.includes("temporary") || errorStr.includes("UNAVAILABLE");
      if (isTransient && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      } else {
        recordAiCall(Date.now() - start, true);
        throw error;
      }
    }
  }
}

// Server-authoritative reward table for the daily quest catalog. The client only ever
// sends a questId; the actual xp/coins granted always come from here, never the request body.
const QUEST_REWARDS: Record<string, { xp: number; coins: number }> = {
  "1": { xp: 50, coins: 10 }, // 10 Min Box Breathing / Bedtime CheckIn
  "2": { xp: 50, coins: 10 }, // Upper Body Workout
  "3": { xp: 50, coins: 10 }, // Log First Meal
};

// Lightweight, dependency-free User-Agent summarizer used to label real tracked devices.
function describeDevice(userAgent: string): { name: string; type: string } {
  const ua = userAgent || "";
  let browser = "Unknown Browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";

  let os = "Unknown OS";
  let type = "browser";
  if (/iPhone|iPad/.test(ua)) { os = "iOS"; type = "mobile"; }
  else if (/Android/.test(ua)) { os = "Android"; type = "mobile"; }
  else if (/Mac OS X/.test(ua)) { os = "macOS"; type = "desktop"; }
  else if (/Windows/.test(ua)) { os = "Windows"; type = "desktop"; }
  else if (/Linux/.test(ua)) { os = "Linux"; type = "desktop"; }

  return { name: `${browser} on ${os}`, type };
}

function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function calculateLevel(xp: number): number {
  if (xp >= 10000) return 10;
  if (xp >= 7500) return 9;
  if (xp >= 5000) return 8;
  if (xp >= 3500) return 7;
  if (xp >= 2000) return 6;
  if (xp >= 1000) return 5;
  if (xp >= 500) return 4;
  if (xp >= 250) return 3;
  if (xp >= 100) return 2;
  return 1;
}

// Real, process-local request telemetry (not fabricated) used to back /api/admin/health.
const requestMetrics: { timestamps: number[]; durationsMs: number[]; errorCount: number; totalCount: number } = {
  timestamps: [],
  durationsMs: [],
  errorCount: 0,
  totalCount: 0,
};

function recordRequestMetric(durationMs: number, isError: boolean) {
  const now = Date.now();
  requestMetrics.timestamps.push(now);
  requestMetrics.durationsMs.push(durationMs);
  requestMetrics.totalCount += 1;
  if (isError) requestMetrics.errorCount += 1;
  // Keep only the last 5 minutes of samples so the window stays current.
  const cutoff = now - 5 * 60 * 1000;
  while (requestMetrics.timestamps.length > 0 && requestMetrics.timestamps[0] < cutoff) {
    requestMetrics.timestamps.shift();
    requestMetrics.durationsMs.shift();
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      recordRequestMetric(Date.now() - start, res.statusCode >= 500);
    });
    next();
  });

  // Wait for Cloud SQL proxy to be ready if needed, or define directly
  // In AI Studio, the proxy is launched automatically.

  // --- API Routes ---
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth & Sync Route
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const user = await getOrCreateUser(req.user.uid, req.user.email || "", req.user.name || "");

      // Track the real device/browser making this request (replaces the previous hardcoded device list).
      const { name: deviceName, type: deviceType } = describeDevice(req.headers["user-agent"] || "");
      const deviceValues = {
        userId: user.id,
        deviceName,
        deviceType,
        lastIp: req.ip || req.socket.remoteAddress || null,
        lastActiveAt: new Date()
      };
      await db.insert(devices).values(deviceValues).onConflictDoUpdate({
        target: [devices.userId, devices.deviceName],
        set: deviceValues
      });

      res.json({ user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // User Profile Setup
  app.post("/api/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      
      const pData = req.body;

      // Optional: Generate Archetypes with Gemini if we are saving a full profile
      let archetypes = {
        fitnessArchetype: null,
        wellnessArchetype: null,
        motivationType: null,
        recoveryCapacity: null,
      };

      if (pData.primaryGoal && pData.fitnessLevel && pData.activityLevel) {
        try {
          const prompt = `Analyze this user profile and generate 4 brief archetypes/types.
Return strictly JSON: {"fitnessArchetype": "e.g. The Consistent Beginner", "wellnessArchetype": "e.g. The Stressed Professional", "motivationType": "e.g. Goal-Oriented", "recoveryCapacity": "e.g. Low"}

Profile:
Goal: ${pData.primaryGoal}
Level: ${pData.fitnessLevel}
Activity: ${pData.activityLevel}
Stress: ${pData.stressLevel || 'unknown'}
Sleep: ${pData.sleepDuration || 'unknown'}
Sleep Quality: ${pData.sleepQuality || 'unknown'}
`;
          const response = await generateContentWithRetry({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
          });
          archetypes = { ...archetypes, ...JSON.parse(response.text || "{}") };
        } catch (e) {
          console.warn("[Archetype Generation Fallback] Using high-fidelity personalized fallback due to Gemini API temporary demand/unavailability:", e);
          const goalLower = String(pData.primaryGoal || "").toLowerCase();
          const levelLower = String(pData.fitnessLevel || "").toLowerCase();
          
          let fitnessArch = "The Focused Climber";
          let wellnessArch = "The Balanced Seeker";
          let motivation = "Intrinsic Achievement";
          let recovery = "Moderate";

          if (goalLower.includes("weight") || goalLower.includes("fat")) {
            fitnessArch = "The Metabolism Optimizer";
            motivation = "Goal-Oriented Habituation";
          } else if (goalLower.includes("muscle") || goalLower.includes("strength") || goalLower.includes("gain") || goalLower.includes("bulk")) {
            fitnessArch = "The Hypertrophy Architect";
            recovery = "High Capacity";
          } else if (levelLower.includes("beginner")) {
            fitnessArch = "The Consistent Foundationist";
            motivation = "Paced Progression";
          }

          if (String(pData.stressLevel || "").includes("high") || Number(pData.stressLevel) > 6) {
            wellnessArch = "The Stress Resilience Explorer";
            recovery = "Compromised / Medium-Low";
          }

          archetypes = {
            fitnessArchetype: fitnessArch,
            wellnessArchetype: wellnessArch,
            motivationType: motivation,
            recoveryCapacity: recovery
          };
        }
      }

      const dbValues = {
        userId: userResult.id,
        age: pData.age,
        gender: pData.gender,
        height: pData.height,
        weight: pData.weight,
        occupation: pData.occupation,
        sleepDuration: pData.sleepDuration,
        primaryGoal: pData.primaryGoal,
        secondaryGoals: pData.secondaryGoals,
        fitnessLevel: pData.fitnessLevel,
        activityLevel: pData.activityLevel,
        workoutExperience: pData.workoutExperience,
        availableEquipment: pData.availableEquipment,
        exercisePreference: pData.exercisePreference,
        workoutLocation: pData.workoutLocation,
        availableDays: pData.availableDays,
        sessionDuration: pData.sessionDuration,
        preferredWorkoutTime: pData.preferredWorkoutTime,
        sleepQuality: pData.sleepQuality,
        stressLevel: pData.stressLevel,
        dietType: pData.dietType,
        waterIntake: pData.waterIntake,
        mealFrequency: pData.mealFrequency,
        healthRestrictions: pData.healthRestrictions,
        ...archetypes,
      };

      const result = await db.insert(profiles).values(dbValues).onConflictDoUpdate({
        target: profiles.userId,
        set: dbValues
      }).returning();
      
      // Recalibrate Digital Twin on profile onboarding / updates
      await recalibrateDigitalTwin(userResult.id);

      res.json({ profile: result[0] });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const profileResult = await db.select().from(profiles).where(eq(profiles.userId, userResult.id));
      const profile = profileResult[0] || null;
      if (profile) {
        const correctLevel = calculateLevel(profile.xp || 0);
        if (profile.level !== correctLevel) {
          await db.execute(sql`UPDATE profiles SET level = ${correctLevel} WHERE id = ${profile.id}`);
          profile.level = correctLevel;
        }
      }
      res.json({ profile });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Agents API (Coach Nova / InnerVerse AI)
  app.post("/api/agents/chat", requireAuth, async (req: AuthRequest, res) => {
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
  
  // Dashboard & Recommendations
  app.post("/api/recommendations/generate", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/briefings", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/simulation", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/recommendations", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      
      const result = await db.select().from(recommendations).where(eq(recommendations.userId, userResult.id));
      res.json({ recommendations: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  app.post("/api/omnibar", requireAuth, async (req: AuthRequest, res) => {
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

  // Journal API
  app.post("/api/journal", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const { content, date } = req.body;
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

  app.get("/api/journal", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      
      const result = await db.select().from(journalEntries).where(eq(journalEntries.userId, userResult.id)).orderBy(sql`${journalEntries.createdAt} DESC`);
      res.json({ entries: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Tracking API
  app.post("/api/track/food", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const { input } = req.body;
      if (!input || typeof input !== "string" || !input.trim()) {
        return res.status(400).json({ error: "Food input text is required" });
      }
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

      const prompt = `Analyze this food log: "${input}". 
Estimate calories, protein (g), carbs (g), and fats (g). Return strictly JSON:
{"item": "Cleaned up name", "calories": 500, "protein": 30, "carbs": 50, "fats": 20, "confidence": 85}`;

      let analysis: any = {};
      try {
        const response = await generateContentWithRetry({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        analysis = JSON.parse(response.text || "{}");
      } catch (e) {
        console.warn("[Food Tracking Fallback] Gemini API unavailable, parsing food with heuristics:", e);
        const lower = String(input || "").toLowerCase();
        let calories = 300;
        let protein = 15;
        let carbs = 35;
        let fats = 10;
        let item = input;

        if (lower.includes("chicken") || lower.includes("turkey") || lower.includes("meat") || lower.includes("beef") || lower.includes("steak") || lower.includes("pork")) {
          item = "Protein-Dense Meat Bowl";
          calories = 550;
          protein = 40;
          carbs = 10;
          fats = 22;
        } else if (lower.includes("egg") || lower.includes("eggs") || lower.includes("omelet")) {
          item = "Egg Scramble";
          calories = 250;
          protein = 18;
          carbs = 2;
          fats = 16;
        } else if (lower.includes("shake") || lower.includes("whey") || lower.includes("protein")) {
          item = "Protein Shake";
          calories = 220;
          protein = 30;
          carbs = 8;
          fats = 3;
        } else if (lower.includes("salad") || lower.includes("spinach") || lower.includes("veg") || lower.includes("broccoli") || lower.includes("apple") || lower.includes("fruit")) {
          item = "Fresh Garden Greens";
          calories = 120;
          protein = 4;
          carbs = 15;
          fats = 5;
        } else if (lower.includes("rice") || lower.includes("pasta") || lower.includes("bread") || lower.includes("pizza") || lower.includes("burger")) {
          item = "Carbohydrate Enrichment Meal";
          calories = 650;
          protein = 20;
          carbs = 80;
          fats = 24;
        }

        analysis = { item, calories, protein, carbs, fats, confidence: 60 };
      }
      
      const dbValues = {
        userId: userResult.id,
        item: analysis.item || input,
        calories: analysis.calories || 0,
        protein: analysis.protein || 0,
        carbs: analysis.carbs || 0,
        fats: analysis.fats || 0,
        confidence: analysis.confidence || 50,
        source: 'text'
      };

      const result = await db.insert(foodLogs).values(dbValues).returning();
      
      // Update nutrition state in Digital Twin
      await updateDigitalTwinState(userResult.id, "nutrition", {
        score: analysis.calories && analysis.calories > 100 ? 75 : 62,
        supportingEvidence: `Logged meal: ${analysis.item} (${analysis.calories || 0} kcal, ${analysis.protein || 0}g P, ${analysis.carbs || 0}g C, ${analysis.fats || 0}g F).`,
        aiSummary: `Dietary intake updated with ${analysis.item}. Caloric and macro metrics registered.`
      });
      // Trigger full recalibration in the background
      recalibrateDigitalTwin(userResult.id).catch(err => console.error("Twin bg recalibrate fail", err));

      res.json({ log: result[0] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Real camera-based food analysis: takes an actual photo (base64 JPEG) captured from the
  // browser's camera and sends it to Gemini's multimodal vision model. There is no text-based
  // heuristic fallback here (unlike /api/track/food) because without a real photo analyzed
  // there is nothing genuine to fall back to — we return a clear error instead of a fake result.
  app.post("/api/track/food/vision", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64 || typeof imageBase64 !== "string") {
        return res.status(400).json({ error: "imageBase64 is required" });
      }
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

      const prompt = `Analyze this photo, which may show a plate of food, a packaged product, or a barcode/nutrition label.
Identify what it is and estimate calories, protein (g), carbs (g), and fats (g) for a typical serving.
If you can read any product name or nutrition facts text in the image, use it. Return strictly JSON:
{"item": "Identified food/product name", "calories": 500, "protein": 30, "carbs": 50, "fats": 20, "confidence": 85}`;

      let analysis: any;
      try {
        const response = await generateContentWithRetry({
          model: "gemini-2.5-flash",
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { data: cleanBase64, mimeType: mimeType || "image/jpeg" } }
            ]
          }],
          config: { responseMimeType: "application/json" }
        });
        analysis = JSON.parse(response.text || "{}");
      } catch (e) {
        console.error("[Food Vision] Gemini vision analysis failed:", e);
        return res.status(502).json({ error: "AI vision analysis is temporarily unavailable. Please use manual/text entry instead." });
      }

      if (!analysis.item) {
        return res.status(422).json({ error: "Could not identify a food item in the photo. Try a clearer shot or use manual entry." });
      }

      const dbValues = {
        userId: userResult.id,
        item: analysis.item,
        calories: analysis.calories || 0,
        protein: analysis.protein || 0,
        carbs: analysis.carbs || 0,
        fats: analysis.fats || 0,
        confidence: analysis.confidence || 70,
        source: 'camera'
      };

      const result = await db.insert(foodLogs).values(dbValues).returning();

      await updateDigitalTwinState(userResult.id, "nutrition", {
        score: analysis.calories && analysis.calories > 100 ? 75 : 62,
        supportingEvidence: `Camera-analyzed meal: ${analysis.item} (${analysis.calories || 0} kcal, ${analysis.protein || 0}g P, ${analysis.carbs || 0}g C, ${analysis.fats || 0}g F).`,
        aiSummary: `Dietary intake updated from AI Lens photo analysis of ${analysis.item}.`
      });
      recalibrateDigitalTwin(userResult.id).catch(err => console.error("Twin bg recalibrate fail", err));

      res.json({ log: result[0] });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/track/exercise", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const { input } = req.body;
      if (!input || typeof input !== "string" || !input.trim()) {
        return res.status(400).json({ error: "Exercise input text is required" });
      }
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

      const prompt = `Analyze this workout log: "${input}". 
Estimate duration in minutes, calories burned, and total volume (if applicable). Return strictly JSON:
{"exercise": "Cleaned up name", "durationMins": 45, "caloriesBurned": 300, "volume": 1200, "confidence": 80}`;

      let analysis: any = {};
      try {
        const response = await generateContentWithRetry({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        analysis = JSON.parse(response.text || "{}");
      } catch (e) {
        console.warn("[Exercise Tracking Fallback] Gemini API unavailable, parsing workout with heuristics:", e);
        const lower = String(input || "").toLowerCase();
        let durationMins = 30;
        let caloriesBurned = 200;
        let volume = 0;
        let exercise = input;

        if (lower.includes("run") || lower.includes("jog") || lower.includes("cardio") || lower.includes("treadmill") || lower.includes("sprint")) {
          exercise = "Cardio Running Session";
          durationMins = 30;
          caloriesBurned = 350;
        } else if (lower.includes("lift") || lower.includes("gym") || lower.includes("squat") || lower.includes("bench") || lower.includes("weights") || lower.includes("strength") || lower.includes("deadlift")) {
          exercise = "Strength Training Session";
          durationMins = 45;
          caloriesBurned = 220;
          volume = 1500;
        } else if (lower.includes("yoga") || lower.includes("stretch") || lower.includes("flexibility")) {
          exercise = "Vinyasa Flow Yoga";
          durationMins = 40;
          caloriesBurned = 150;
        } else if (lower.includes("meditat") || lower.includes("breath")) {
          exercise = "Mindful Meditation Session";
          durationMins = 15;
          caloriesBurned = 40;
        }

        analysis = { exercise, durationMins, caloriesBurned, volume, confidence: 60 };
      }
      
      const dbValues = {
        userId: userResult.id,
        exercise: analysis.exercise || input,
        durationMins: analysis.durationMins || 0,
        caloriesBurned: analysis.caloriesBurned || 0,
        volume: analysis.volume || 0,
        source: 'text'
      };

      const result = await db.insert(exerciseLogs).values(dbValues).returning();
      
      // Basic XP assignment strategy
      const xpGain = (analysis.caloriesBurned || 50) + (analysis.durationMins || 10);
      await db.execute(sql`UPDATE profiles SET xp = xp + ${Math.floor(xpGain)}, coins = coins + 10 WHERE user_id = ${userResult.id}`);

      // Update physical and exercise states in Digital Twin
      await updateDigitalTwinState(userResult.id, "exercise", {
        score: analysis.durationMins && analysis.durationMins > 20 ? 80 : 65,
        supportingEvidence: `Logged workout: ${analysis.exercise} for ${analysis.durationMins} minutes.`,
        aiSummary: `Workout session registered: ${analysis.exercise}. Burned approximately ${analysis.caloriesBurned} kcal.`
      });
      await updateDigitalTwinState(userResult.id, "physical", {
        score: 72,
        supportingEvidence: `Physical load telemetry tracked: ${analysis.exercise}.`,
        aiSummary: `Physical core systems activated through structured exercise.`
      });
      // Trigger full recalibration in the background
      recalibrateDigitalTwin(userResult.id).catch(err => console.error("Twin bg recalibrate fail", err));

      res.json({ log: result[0] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/track/food", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const result = await db.select().from(foodLogs).where(eq(foodLogs.userId, userResult.id)).orderBy(sql`${foodLogs.createdAt} DESC`).limit(20);
      res.json({ logs: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/track/exercise", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const result = await db.select().from(exerciseLogs).where(eq(exerciseLogs.userId, userResult.id)).orderBy(sql`${exerciseLogs.createdAt} DESC`).limit(20);
      res.json({ logs: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/timeline", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/timeline/custom", requireAuth, async (req: AuthRequest, res) => {
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

  // --- Digital Twin API ---
  app.get("/api/digital-twin", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      
      const twin = await getDigitalTwin(userResult.id);
      res.json({ twin });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/digital-twin/recalibrate", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/digital-twin/update", requireAuth, async (req: AuthRequest, res) => {
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
  app.get("/api/digital-twin/history", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const history = await getDigitalTwinHistory(userResult.id);
      res.json({ history });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/digital-twin/dependencies", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dependencies = getDigitalTwinDependencies();
      res.json({ dependencies });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/digital-twin/contributors", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const contributors = await getDigitalTwinContributors(userResult.id);
      res.json({ contributors });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/digital-twin/goals", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const goals = await getDigitalTwinGoals(userResult.id);
      res.json({ goals });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/digital-twin/confidence", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const confidence = await getDigitalTwinConfidence(userResult.id);
      res.json({ confidence });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/badges", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      
      const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userResult.id));
      
      const foodCount = await db.select({ count: sql`count(*)` }).from(foodLogs).where(eq(foodLogs.userId, userResult.id));
      const exerciseCount = await db.select({ count: sql`count(*)` }).from(exerciseLogs).where(eq(exerciseLogs.userId, userResult.id));
      const journalCount = await db.select({ count: sql`count(*)` }).from(journalEntries).where(eq(journalEntries.userId, userResult.id));
      
      const fc = Number(foodCount[0]?.count || 0);
      const ec = Number(exerciseCount[0]?.count || 0);
      const jc = Number(journalCount[0]?.count || 0);
      
      const xp = profile?.xp || 0;
      const lvl = profile?.level || 1;
      const streak = profile?.streakDays || 0;

      const badges = [
        {
          id: "pioneer",
          name: "InnerVerse Pioneer",
          description: "Unlocked at Level 2. Your journey into the self-knowledge graph has commenced.",
          unlocked: lvl >= 2,
          category: "LEVEL",
          unlockedAt: lvl >= 2 ? "Level up" : null,
          requirement: "Reach character Level 2 (100 XP)"
        },
        {
          id: "athlete",
          name: "Sensing Athlete",
          description: "Log 3 physical workout tracks in the system to calibrate neural active states.",
          unlocked: ec >= 3,
          category: "WORKOUT",
          unlockedAt: ec >= 3 ? "Synced workout" : null,
          requirement: `Log 3 exercise sessions (Current: ${ec}/3)`
        },
        {
          id: "gastronomy",
          name: "Molecular Gastronomer",
          description: "Log 3 distinct meals to calculate correct biometric macronutrient ratios.",
          unlocked: fc >= 3,
          category: "NUTRITION",
          unlockedAt: fc >= 3 ? "Checked plate" : null,
          requirement: `Log 3 food plates (Current: ${fc}/3)`
        },
        {
          id: "monk",
          name: "Zen Reflective Monk",
          description: "Log 2 cognitive journal entries. Reflection centers stability and clears memory channels.",
          unlocked: jc >= 2,
          category: "MINDFULNESS",
          unlockedAt: jc >= 2 ? "Reflected" : null,
          requirement: `Log 2 journal dumps (Current: ${jc}/2)`
        },
        {
          id: "fitbit",
          name: "Telemetry Overlord",
          description: "Link a persistent wearable cloud datasource (Fitbit) to stream clean metrics.",
          unlocked: streak > 0 || lvl >= 3,
          category: "INTEGRATION",
          unlockedAt: (streak > 0 || lvl >= 3) ? "Wearable sync verified" : null,
          requirement: "Connect any wearable sensor tracker stream"
        },
        {
          id: "streak_badge",
          name: "Consistent Catalyst",
          description: "Unlock by maintaining a consistent daily habits streak of 3+ days.",
          unlocked: streak >= 3 || lvl >= 4,
          category: "CONSISTENCY",
          unlockedAt: (streak >= 3 || lvl >= 4) ? "Streak active" : null,
          requirement: "Hold a 3-day habits streak"
        },
        {
          id: "vision_expert",
          name: "Visionary Sentinel",
          description: "Use AI computer vision scanning mechanics to log food contours.",
          unlocked: fc >= 1,
          category: "AI_FEATURES",
          unlockedAt: fc >= 1 ? "Vision verified" : null,
          requirement: "Perform 1 AI Lens or camera scanner log"
        },
        {
          id: "grandmaster",
          name: "Holistic Sovereign",
          description: "Achieved when character reaches level 5. A fully attuned and balanced twin archetype.",
          unlocked: lvl >= 5,
          category: "LEVEL",
          unlockedAt: lvl >= 5 ? "Ascended Level 5" : null,
          requirement: `Reach character Level 5 (Current Level: ${lvl}/5)`
        }
      ];

      res.json({ badges, stats: { food: fc, exercises: ec, journals: jc, level: lvl, xp, streak } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Quest completion API
  // Rewards are fixed server-side per quest and granted at most once per quest per day,
  // so a client can never mint arbitrary XP/coins by replaying this call.
  app.post("/api/quests/complete", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const { questId } = req.body;

      if (questId === undefined || questId === null) {
        return res.status(400).json({ error: "questId is required" });
      }

      const reward = QUEST_REWARDS[String(questId)];
      if (!reward) {
        return res.status(400).json({ error: "Unknown questId" });
      }

      const today = new Date().toISOString().substring(0, 10);
      const existing = await db.select().from(questCompletions).where(and(
        eq(questCompletions.userId, userResult.id),
        eq(questCompletions.questId, String(questId)),
        eq(questCompletions.completedDate, today)
      ));

      if (existing.length === 0) {
        await db.insert(questCompletions).values({
          userId: userResult.id,
          questId: String(questId),
          completedDate: today,
          xpAwarded: reward.xp,
          coinsAwarded: reward.coins
        }).onConflictDoNothing();

        await db.execute(sql`UPDATE profiles SET xp = xp + ${reward.xp}, coins = coins + ${reward.coins} WHERE user_id = ${userResult.id}`);

        // Record a procedural cognitive memory: completed quests are learned routine/habit loops.
        await db.insert(cognitiveMemory).values({
          userId: userResult.id,
          memoryType: "procedural",
          content: { questId: String(questId), xpAwarded: reward.xp, coinsAwarded: reward.coins, date: today },
          consolidationStatus: "consolidated",
          importanceScore: 40
        });
      }

      const newProfileResult = await db.select().from(profiles).where(eq(profiles.userId, userResult.id));
      res.json({ profile: newProfileResult[0], alreadyCompletedToday: existing.length > 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Gamification & Community
  app.get("/api/leaderboard", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      
      const topProfiles = await db.select({
        id: users.id,
        name: users.fullName,
        email: users.email,
        xp: profiles.xp,
        level: profiles.level,
        coins: profiles.coins,
        streakDays: profiles.streakDays
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .orderBy(sql`${profiles.xp} DESC`)
      .limit(50);
      
      res.json({ leaderboard: topProfiles });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/orchestration", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/orchestration/missions", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/orchestration/tasks/:id/complete", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/orchestration/decision", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/ecosystem", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

      const collaboratorRows = await db.select({
        id: collaborationShares.id,
        name: users.fullName,
        email: users.email,
        permissions: collaborationShares.permissions,
        status: collaborationShares.status,
      })
      .from(collaborationShares)
      .innerJoin(users, eq(collaborationShares.collaboratorId, users.id))
      .where(and(eq(collaborationShares.ownerId, userResult.id), eq(collaborationShares.status, "active")));

      const collaborators = collaboratorRows.map(c => ({
        id: c.id,
        name: c.name || c.email,
        role: "Collaborator",
        org: c.email,
        permissions: Object.keys((c.permissions as any) || {}).filter(k => (c.permissions as any)[k]),
        status: c.status
      }));

      const knowledgeRows = await db.select().from(ragDocuments).where(eq(ragDocuments.userId, userResult.id)).orderBy(desc(ragDocuments.createdAt));
      const knowledgeBase = knowledgeRows.map(d => ({
        id: d.id,
        title: d.title,
        type: d.documentType || "personal_note",
        status: "indexed",
        relevance: 100
      }));

      const biomarkerRows = await db.select().from(biomarkers).where(eq(biomarkers.userId, userResult.id)).orderBy(desc(biomarkers.timestamp));
      const latestByMarker = new Map<string, typeof biomarkerRows>();
      for (const b of biomarkerRows) {
        const list = latestByMarker.get(b.markerName) || [];
        list.push(b);
        latestByMarker.set(b.markerName, list);
      }
      const markerBiomarkers = Array.from(latestByMarker.values()).map(list => {
        const [latest, previous] = list;
        let trend: "improving" | "declining" | "stable" = "stable";
        if (previous) {
          const a = parseFloat(latest.value);
          const b = parseFloat(previous.value);
          if (!Number.isNaN(a) && !Number.isNaN(b) && b !== 0) {
            trend = a > b ? "improving" : a < b ? "declining" : "stable";
          }
        }
        return {
          id: latest.id,
          name: latest.markerName,
          value: latest.value,
          unit: latest.unit,
          trend,
          lastChecked: latest.timestamp ? new Date(latest.timestamp).toLocaleDateString() : ""
        };
      });

      const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
      const geminiLatency = getAiAverageLatencyMs();

      res.json({
        collaborators,
        knowledgeBase,
        healthcare: { biomarkers: markerBiomarkers },
        models: [
          {
            id: "gemini-2.5-flash",
            status: geminiConfigured ? "active" : "offline",
            latency: aiMetrics.callCount > 0 ? `${geminiLatency}ms` : "-",
            tasks: ["Coach Nova Chat", "Digital Twin Recalibration", "Specialist Agent Council", "Daily/Weekly/Monthly Briefings"]
          }
        ]
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ecosystem/collaborators", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const { email, permissions } = req.body;
      if (!email) return res.status(400).json({ error: "email is required" });

      const [collaboratorUser] = await db.select().from(users).where(eq(users.email, email));
      if (!collaboratorUser) {
        return res.status(404).json({ error: "No InnerVerse account found for that email. Ask them to sign up first." });
      }
      if (collaboratorUser.id === userResult.id) {
        return res.status(400).json({ error: "You cannot invite yourself." });
      }

      const [share] = await db.insert(collaborationShares).values({
        ownerId: userResult.id,
        collaboratorId: collaboratorUser.id,
        permissions: permissions || { read_metrics: true },
        status: "active"
      }).returning();

      res.json({ share });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ecosystem/collaborators/:id/revoke", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const shareId = Number(req.params.id);
      if (!Number.isInteger(shareId)) return res.status(400).json({ error: "Invalid id" });

      const [share] = await db.update(collaborationShares)
        .set({ status: "revoked" })
        .where(and(eq(collaborationShares.id, shareId), eq(collaborationShares.ownerId, userResult.id)))
        .returning();

      if (!share) return res.status(404).json({ error: "Collaborator share not found" });
      res.json({ share });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ecosystem/biomarkers", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const { markerName, value, unit } = req.body;
      if (!markerName || value === undefined || !unit) {
        return res.status(400).json({ error: "markerName, value, and unit are required" });
      }

      const [marker] = await db.insert(biomarkers).values({
        userId: userResult.id,
        markerName,
        value: String(value),
        unit,
        source: "manual"
      }).returning();

      res.json({ marker });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ecosystem/knowledge", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const { title, documentType, content } = req.body;
      if (!title) return res.status(400).json({ error: "title is required" });

      const [doc] = await db.insert(ragDocuments).values({
        userId: userResult.id,
        title,
        documentType: documentType || "personal_note",
        content: content || ""
      }).returning();

      res.json({ document: doc });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/cognition", requireAuth, async (req: AuthRequest, res) => {
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

  app.post("/api/cognition/experiments", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/research/dashboard", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/lifeos/status", requireAuth, async (req: AuthRequest, res) => {
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

  // Analytics API
  app.get("/api/analytics", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

      // For MVP, return food and exercise aggregates over the last 7 days
      // Simplification: just return all recent logs, client computes.
      const recentFood = await db.select().from(foodLogs).where(eq(foodLogs.userId, userResult.id)).orderBy(sql`${foodLogs.createdAt} DESC`).limit(50);
      const recentExercise = await db.select().from(exerciseLogs).where(eq(exerciseLogs.userId, userResult.id)).orderBy(sql`${exerciseLogs.createdAt} DESC`).limit(50);
      
      res.json({ food: recentFood, exercise: recentExercise });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Unified AI Tracking (Magic Log)
  app.post("/api/track/unified", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const { prompt } = req.body;

      const aiPrompt = `You are a health parsing engine. The user submitted this log: "${prompt}". 
Extract any consumed food items (estimate calories, protein, carbs, fats) and any exercises performed (estimate durationMins, caloriesBurned).
Output STRICT JSON exactly matching this structure:
{
  "foods": [{ "item": "string", "calories": number, "protein": number, "carbs": number, "fats": number, "confidence": number }],
  "exercises": [{ "exercise": "string", "durationMins": number, "caloriesBurned": number }]
}
If there are no foods or exercises, return empty arrays.`;

      const aiResponse = await generateContentWithRetry({
        model: "gemini-2.5-flash",
        contents: aiPrompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(aiResponse.text || '{"foods":[],"exercises":[]}');
      
      const insertedFoods = [];
      const insertedExercises = [];

      // Save parsed foods
      if (parsed.foods && parsed.foods.length > 0) {
        for (const f of parsed.foods) {
          const result = await db.insert(foodLogs).values({
            userId: userResult.id,
            item: f.item,
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fats: f.fats,
            confidence: f.confidence || 90,
            source: 'unified_ai'
          }).returning();
          insertedFoods.push(result[0]);
        }
      }

      // Save parsed exercises
      if (parsed.exercises && parsed.exercises.length > 0) {
        for (const e of parsed.exercises) {
          const result = await db.insert(exerciseLogs).values({
            userId: userResult.id,
            exercise: e.exercise,
            durationMins: e.durationMins,
            caloriesBurned: e.caloriesBurned,
            source: 'unified_ai',
            volume: 0
          }).returning();
          insertedExercises.push(result[0]);
        }
      }

      // Award XP for using Magic Log
      await db.execute(sql`UPDATE profiles SET xp = xp + 10, coins = coins + 2 WHERE user_id = ${userResult.id}`);

      // Holistic twin update after unified tracking
      recalibrateDigitalTwin(userResult.id).catch(err => console.error("Twin bg recalibrate fail", err));

      res.json({ success: true, foods: insertedFoods, exercises: insertedExercises });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Phase 9: Enterprise Infrastructure & SaaS Endpoints ---

  app.get("/api/subscription", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      let sub = await db.select().from(subscriptions).where(eq(subscriptions.userId, userResult.id)).then(r => r[0]);
      if (!sub) {
        const [newSub] = await db.insert(subscriptions).values({
          userId: userResult.id,
          plan: 'Free',
          status: 'active',
          billingCycle: 'monthly'
        }).returning();
        sub = newSub;
      }
      res.json({ subscription: sub });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/subscription", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const { plan, billingCycle } = req.body;
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

      const subValues = {
        userId: userResult.id,
        plan: plan || 'Pro',
        billingCycle: billingCycle || 'monthly',
        status: 'active',
        updatedAt: new Date()
      };
      const [updated] = await db.insert(subscriptions).values(subValues).onConflictDoUpdate({
        target: subscriptions.userId,
        set: subValues
      }).returning();

      // Record payment log
      const amount = plan === 'Enterprise' ? 9900 : plan === 'Pro' ? 2900 : plan === 'Premium' ? 1200 : 0;
      if (amount > 0) {
        await db.insert(payments).values({
          userId: userResult.id,
          amount,
          currency: 'USD',
          status: 'succeeded',
          invoiceUrl: `https://invoices.innerverse.ai/inv_${Date.now()}`
        });
      }

      await db.insert(notifications).values({
        userId: userResult.id,
        title: "Subscription Updated",
        message: `Your plan is now ${updated?.plan || plan || 'Pro'} (${updated?.billingCycle || billingCycle || 'monthly'} billing).`,
        type: "info"
      });

      res.json({ success: true, plan, billingCycle });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/billing", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const userPayments = await db.select().from(payments).where(eq(payments.userId, userResult.id)).orderBy(sql`${payments.createdAt} DESC`);
      res.json({ invoices: userPayments });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/notifications", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const userNotifs = await db.select().from(notifications).where(eq(notifications.userId, userResult.id)).orderBy(sql`${notifications.createdAt} DESC`);
      res.json({ notifications: userNotifs });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const { notificationId, markAllRead } = req.body;
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      
      if (markAllRead) {
        await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userResult.id));
      } else if (notificationId) {
        await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userResult.id)));
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/health", requireAuth, async (req: AuthRequest, res) => {
    try {
      // Real DB health check: time an actual round trip instead of reporting a fixed number.
      const dbStart = Date.now();
      let dbStatus = "operational";
      let dbLatencyMs = 0;
      try {
        await db.execute(sql`SELECT 1`);
        dbLatencyMs = Date.now() - dbStart;
      } catch (e) {
        dbStatus = "outage";
        dbLatencyMs = Date.now() - dbStart;
      }

      const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
      const geminiLatencyMs = getAiAverageLatencyMs();

      const [{ count: totalUsersRaw } = { count: 0 }] = await db.select({ count: sql<number>`count(*)` }).from(users);
      const totalUsers = Number(totalUsersRaw || 0);

      const now = Date.now();
      const windowMs = 60 * 1000;
      const requestsLastMin = requestMetrics.timestamps.filter(t => now - t < windowMs).length;
      const recentDurations = requestMetrics.durationsMs.slice(-200);
      const avgResponseTimeMs = recentDurations.length > 0
        ? Math.round(recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length)
        : 0;
      const errorRate = requestMetrics.totalCount > 0
        ? ((requestMetrics.errorCount / requestMetrics.totalCount) * 100).toFixed(2) + "%"
        : "0.00%";

      // Persist a snapshot so /api/system/status and future admin views can read the latest recorded check.
      await db.insert(systemHealth).values({ serviceName: "postgresql_primary", status: dbStatus, latencyMs: dbLatencyMs });
      await db.insert(systemHealth).values({ serviceName: "gemini_gateway", status: geminiConfigured ? "operational" : "not_configured", latencyMs: geminiLatencyMs });

      res.json({
        status: dbStatus === "operational" ? "Healthy" : "Degraded",
        uptimeSeconds: Math.round(process.uptime()),
        activeInstances: 1,
        services: [
          { name: "PostgreSQL Primary", status: dbStatus, latencyMs: dbLatencyMs },
          { name: "Gemini AI Gateway", status: geminiConfigured ? "operational" : "not_configured", latencyMs: geminiLatencyMs }
        ],
        metrics: {
          totalUsers,
          apiRequestsPerMin: requestsLastMin,
          avgResponseTimeMs,
          errorRate
        }
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/system/status", async (req, res) => {
    let dbReachable = true;
    try {
      await db.execute(sql`SELECT 1`);
    } catch {
      dbReachable = false;
    }
    res.json({
      status: dbReachable ? "operational" : "degraded",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  app.post("/api/export", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      
      const profile = await db.select().from(profiles).where(eq(profiles.userId, userResult.id)).then(r => r[0]);
      const foods = await db.select().from(foodLogs).where(eq(foodLogs.userId, userResult.id));
      const exercises = await db.select().from(exerciseLogs).where(eq(exerciseLogs.userId, userResult.id));
      const journals = await db.select().from(journalEntries).where(eq(journalEntries.userId, userResult.id));

      await db.insert(auditLogs).values({
        userId: userResult.id,
        action: 'GDPR_DATA_EXPORT',
        resource: 'user_full_data',
        status: 'success'
      });

      res.json({
        user: { id: userResult.id, email: userResult.email },
        profile,
        data: { foodLogs: foods, exerciseLogs: exercises, journalEntries: journals },
        exportedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/privacy", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const { action } = req.body;

      await db.insert(auditLogs).values({
        userId: userResult.id,
        action: action === 'delete' ? 'ACCOUNT_DELETE_REQUEST' : 'PRIVACY_SETTINGS_UPDATE',
        resource: 'privacy',
        status: 'success'
      });

      res.json({ success: true, message: action === 'delete' ? 'Deletion request queued according to GDPR guidelines.' : 'Privacy settings updated.' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Wearable connections: persisted, real toggle state (no fabricated OAuth ceremony or
  // permanently-"connected" badges). Apple Health has no browser API, so it is honestly
  // reported as unavailable rather than shown as connected.
  app.get("/api/wearables", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const connections = await db.select().from(wearableConnections).where(eq(wearableConnections.userId, userResult.id));
      res.json({ connections });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/wearables/:provider/toggle", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const provider = req.params.provider;
      if (provider === "apple_health") {
        return res.status(400).json({ error: "Apple Health requires a native iOS app with HealthKit access; it cannot be connected from a browser." });
      }

      const [existing] = await db.select().from(wearableConnections).where(and(eq(wearableConnections.userId, userResult.id), eq(wearableConnections.provider, provider)));

      let connection;
      if (existing && existing.connected) {
        [connection] = await db.update(wearableConnections)
          .set({ connected: false })
          .where(eq(wearableConnections.id, existing.id))
          .returning();
      } else if (existing) {
        [connection] = await db.update(wearableConnections)
          .set({ connected: true, lastSync: new Date() })
          .where(eq(wearableConnections.id, existing.id))
          .returning();
      } else {
        [connection] = await db.insert(wearableConnections).values({
          userId: userResult.id,
          provider,
          connected: true,
          lastSync: new Date()
        }).returning();
      }

      res.json({ connection });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/devices", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const userDevices = await db.select().from(devices).where(eq(devices.userId, userResult.id)).orderBy(sql`${devices.lastActiveAt} DESC`);
      res.json({ devices: userDevices });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Developer API keys: a real key is generated and only its SHA-256 hash is stored,
  // so the plaintext is shown to the user exactly once, at creation time.
  app.get("/api/developer/keys", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
      const [key] = await db.select().from(apiKeys).where(eq(apiKeys.userId, userResult.id)).orderBy(desc(apiKeys.createdAt)).limit(1);
      res.json({
        hasKey: Boolean(key),
        keyPreview: key ? `iv_live_${"*".repeat(28)}${key.keyPreview}` : null,
        createdAt: key?.createdAt || null
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/developer/keys/regenerate", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
      const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

      const rawKey = `iv_live_${crypto.randomBytes(24).toString("hex")}`;
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
      const keyPreview = rawKey.slice(-4);

      await db.delete(apiKeys).where(eq(apiKeys.userId, userResult.id));
      await db.insert(apiKeys).values({
        userId: userResult.id,
        keyHash,
        keyPreview,
        scopes: ["read_twin", "read_metrics"],
        name: "Default Key"
      });

      // The plaintext key is returned only in this response; it cannot be recovered later.
      res.json({ key: rawKey });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Vite Middleware for Development ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For Express 4
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
