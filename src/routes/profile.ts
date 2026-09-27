import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { profiles } from "../db/schema.ts";
import { eq, and, sql } from "drizzle-orm";
import { recalibrateDigitalTwin } from "../db/digitalTwinService.ts";
import { generateContentWithRetry } from "../lib/gemini.ts";
import { calculateLevel, computeStreak } from "../lib/serverHelpers.ts";

const router = express.Router();

// Inclusive bounds for the integer columns. Settings posts these straight from <input>
// values, so numeric strings are accepted and "" (a cleared box) clears the field.
const INTEGER_FIELDS: Record<string, [number, number]> = {
  age: [1, 150],
  height: [1, 300],
  weight: [1, 700],
  stressLevel: [1, 10],
};
const TEXT_FIELDS = [
  "gender", "occupation", "sleepDuration", "primaryGoal", "fitnessLevel", "activityLevel",
  "workoutExperience", "workoutLocation", "availableDays", "sessionDuration",
  "preferredWorkoutTime", "sleepQuality", "dietType", "waterIntake", "mealFrequency",
];
const ARRAY_FIELDS = ["secondaryGoals", "availableEquipment", "exercisePreference", "healthRestrictions"];

const COACH_PERSONALITIES = ["Professional", "Motivational", "Friendly", "Strict Coach", "Scientific", "Spiritual"];
const COACH_STYLES =["Short Responses", "Detailed Explanations", "Research Based", "High Energy"];

/** Keeps only known preference keys with valid values; returns an error message on bad input. */
function normalizePreferences(raw: unknown): { value?: Record<string, unknown>; error?: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { error: "preferences must be an object" };
  const p = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (p.coachName !== undefined) {
    if (typeof p.coachName !== "string" || p.coachName.trim().length > 40) return { error: "coachName must be a string of at most 40 characters" };
    out.coachName = p.coachName.trim();
  }
  if (p.coachPersonality !== undefined) {
    if (!COACH_PERSONALITIES.includes(p.coachPersonality as string)) return { error: "Unknown coachPersonality" };
    out.coachPersonality = p.coachPersonality;
  }
  if (p.coachStyle !== undefined) {
    if (!COACH_STYLES.includes(p.coachStyle as string)) return { error: "Unknown coachStyle" };
    out.coachStyle = p.coachStyle;
  }
  if (p.gamificationEnabled !== undefined) {
    if (typeof p.gamificationEnabled !== "boolean") return { error: "gamificationEnabled must be a boolean" };
    out.gamificationEnabled = p.gamificationEnabled;
  }
  if (p.dietaryStrategy !== undefined) {
    if (typeof p.dietaryStrategy !== "string") return { error: "dietaryStrategy must be a string" };
    out.dietaryStrategy = p.dietaryStrategy;
  }
  return { value: out };
}

/** Coerces/validates the profile fields present in `body`; returns an error message on bad input. */
function normalizeProfileInput(body: Record<string, any>): string | null {
  for (const [field, [min, max]] of Object.entries(INTEGER_FIELDS)) {
    const raw = body[field];
    if (raw === undefined || raw === null) continue;
    if (raw === "") { body[field] = null; continue; }
    const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\s*\d+\s*$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isInteger(n) || n < min || n > max) return `${field} must be a whole number between ${min} and ${max}`;
    body[field] = n;
  }
  for (const field of TEXT_FIELDS) {
    const raw = body[field];
    if (raw !== undefined && raw !== null && typeof raw !== "string") return `${field} must be a string`;
  }
  for (const field of ARRAY_FIELDS) {
    const raw = body[field];
    if (raw !== undefined && raw !== null && !Array.isArray(raw)) return `${field} must be an array`;
  }
  if (body.preferences !== undefined && body.preferences !== null) {
    const { value, error } = normalizePreferences(body.preferences);
    if (error) return error;
    body.preferences = value;
  }
  return null;
}

// User Profile Setup
router.post("/api/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    if (typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const pData = req.body;
    const invalid = normalizeProfileInput(pData);
    if (invalid) return res.status(400).json({ error: invalid });

    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

    // Optional: Generate Archetypes with Gemini if we are saving a full profile.
    // Left empty (not defaulted to nulls) when the goal/level/activity trio isn't present
    // in this particular request, so a partial update (e.g. just changing dietType) doesn't
    // wipe out archetypes computed by an earlier, fuller submission.
    let archetypes: Record<string, string | null> = {};

    if (pData.primaryGoal && pData.fitnessLevel && pData.activityLevel) {
      archetypes = {
        fitnessArchetype: null,
        wellnessArchetype: null,
        motivationType: null,
        recoveryCapacity: null,
      };
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
      preferences: pData.preferences,
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

      // Derived from real logged activity rather than stored, since nothing ever increments it.
      const activity = await db.execute(sql`
        SELECT to_char(created_at, 'YYYY-MM-DD') AS day FROM food_logs WHERE user_id = ${userResult.id}
        UNION SELECT to_char(created_at, 'YYYY-MM-DD') FROM exercise_logs WHERE user_id = ${userResult.id}
        UNION SELECT to_char(created_at, 'YYYY-MM-DD') FROM journal_entries WHERE user_id = ${userResult.id}
        UNION SELECT completed_date FROM quest_completions WHERE user_id = ${userResult.id}`);
      const streak = computeStreak(activity.rows.map((r: any) => r.day));
      if (profile.streakDays !== streak) {
        await db.execute(sql`UPDATE profiles SET streak_days = ${streak} WHERE id = ${profile.id}`);
        profile.streakDays = streak;
      }
    }
    res.json({ profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
