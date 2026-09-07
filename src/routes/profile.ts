import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { profiles } from "../db/schema.ts";
import { eq, and, sql } from "drizzle-orm";
import { recalibrateDigitalTwin } from "../db/digitalTwinService.ts";
import { generateContentWithRetry } from "../lib/gemini.ts";
import { calculateLevel } from "../lib/serverHelpers.ts";

const router = express.Router();

// User Profile Setup
router.post("/api/profile", requireAuth, async (req: AuthRequest, res) => {
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

router.get("/api/profile", requireAuth, async (req: AuthRequest, res) => {
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

export default router;
