import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { profiles, foodLogs, exerciseLogs } from "../db/schema.ts";
import { eq, and, sql } from "drizzle-orm";
import { recalibrateDigitalTwin, updateDigitalTwinState } from "../db/digitalTwinService.ts";
import { generateContentWithRetry } from "../lib/gemini.ts";

const router = express.Router();

// Tracking API
router.post("/api/track/food", requireAuth, async (req: AuthRequest, res) => {
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
router.post("/api/track/food/vision", requireAuth, async (req: AuthRequest, res) => {
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

router.post("/api/track/exercise", requireAuth, async (req: AuthRequest, res) => {
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

router.get("/api/track/food", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const result = await db.select().from(foodLogs).where(eq(foodLogs.userId, userResult.id)).orderBy(sql`${foodLogs.createdAt} DESC`).limit(20);
    res.json({ logs: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/track/exercise", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const result = await db.select().from(exerciseLogs).where(eq(exerciseLogs.userId, userResult.id)).orderBy(sql`${exerciseLogs.createdAt} DESC`).limit(20);
    res.json({ logs: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Unified AI Tracking (Magic Log)
router.post("/api/track/unified", requireAuth, async (req: AuthRequest, res) => {
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

export default router;
