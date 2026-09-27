/**
 * Fills one account with a few weeks of realistic demo activity so the Dashboard,
 * Digital Twin trends, streak, Cognition and Orchestration pages have real history
 * to show.
 *
 *   npm run seed:demo -- you@gmail.com            # an account you've signed into once
 *   npm run seed:demo -- you@gmail.com --reset    # replace that account's existing activity
 *   options: --days <n> (default 21), --use-ai (use GEMINI_API_KEY instead of the rule engine)
 *
 * Only the input activity (meals, workouts, journal entries, quest completions) is
 * synthetic, and it is marked: logs use source "demo-seed" and twin snapshots use
 * trigger "demo_seed_recalibrate". Every Digital Twin state is computed by the app's
 * own recalibrateDigitalTwin(), replayed day by day over only the data that existed
 * on that day, then backdated to that day.
 */
import "dotenv/config";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const target = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--days");
const DAYS = Number(option("--days") ?? 21);
const RESET = flag("--reset");

if (!target || !Number.isInteger(DAYS) || DAYS < 3 || DAYS > 90) {
  console.error("Usage: npm run seed:demo -- <email-or-uid> [--reset] [--days 3-90] [--use-ai]");
  process.exit(1);
}

// Without --use-ai, recalibration runs on the app's deterministic rule engine: fast,
// repeatable, and it doesn't spend Gemini quota on dozens of back-to-back calls.
if (!flag("--use-ai")) process.env.GEMINI_API_KEY = "demo-seed-offline";

const { db, pool } = await import("../src/db/index.ts");
const schema = await import("../src/db/schema.ts");
const { eq, gt, and, sql } = await import("drizzle-orm");
const { recalibrateDigitalTwin } = await import("../src/db/digitalTwinService.ts");
const { QUEST_REWARDS } = await import("../src/lib/catalogs.ts");
const { users, profiles, foodLogs, exerciseLogs, journalEntries, questCompletions, digitalTwins, digitalTwinSnapshots, cognitiveMemory } = schema;

// Deterministic PRNG so re-running the seed produces the same demo account.
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];

const MEALS = {
  breakfast: [
    { item: "Poha with peanuts and a cup of chai", calories: 380, protein: 9, carbs: 58, fats: 12 },
    { item: "Oats with banana and almonds", calories: 360, protein: 12, carbs: 55, fats: 11 },
    { item: "Moong dal chilla with mint chutney", calories: 320, protein: 18, carbs: 36, fats: 10 },
    { item: "Greek yogurt with berries and granola", calories: 340, protein: 20, carbs: 42, fats: 9 },
  ],
  lunch: [
    { item: "Dal, brown rice and cucumber salad", calories: 540, protein: 20, carbs: 88, fats: 10 },
    { item: "Paneer tikka wrap", calories: 480, protein: 24, carbs: 46, fats: 21 },
    { item: "Rajma chawal with salad", calories: 560, protein: 21, carbs: 92, fats: 9 },
    { item: "Quinoa and chickpea bowl", calories: 510, protein: 22, carbs: 70, fats: 14 },
  ],
  dinner: [
    { item: "Two rotis with mixed vegetable sabzi", calories: 450, protein: 13, carbs: 64, fats: 14 },
    { item: "Grilled tofu with sauteed vegetables", calories: 420, protein: 28, carbs: 24, fats: 22 },
    { item: "Vegetable khichdi with curd", calories: 430, protein: 16, carbs: 68, fats: 9 },
    { item: "Palak paneer with one roti", calories: 470, protein: 22, carbs: 30, fats: 28 },
  ],
  lateSnack: [
    { item: "Samosa and chai", calories: 310, protein: 6, carbs: 38, fats: 15 },
    { item: "Instant noodles", calories: 390, protein: 8, carbs: 52, fats: 16 },
  ],
};

// Indexed by UTC weekday (0 = Sunday); null is a planned rest day.
const WEEKLY_PLAN: ({ exercise: string; durationMins: number; caloriesBurned: number; volume: number } | null)[] = [
  null,
  { exercise: "Morning run", durationMins: 30, caloriesBurned: 280, volume: 0 },
  { exercise: "Vinyasa yoga", durationMins: 40, caloriesBurned: 160, volume: 0 },
  { exercise: "Upper body strength (dumbbells)", durationMins: 45, caloriesBurned: 250, volume: 3200 },
  null,
  { exercise: "Cycling", durationMins: 35, caloriesBurned: 300, volume: 0 },
  { exercise: "Hatha yoga and breathing", durationMins: 30, caloriesBurned: 110, volume: 0 },
];

const JOURNAL = {
  early: [
    { content: "Deadline week. Slept badly and skipped my workout again, feeling anxious and tired.", sentiment: "Negative", mood: "Anxious" },
    { content: "Too much screen time last night and a heavy late snack. Woke up groggy and stressed.", sentiment: "Negative", mood: "Tired" },
  ],
  mid: [
    { content: "Managed a yoga session before work and felt calmer through the afternoon.", sentiment: "Positive", mood: "Calm" },
    { content: "Mixed day - good lunch and a walk, but work stress crept back in the evening.", sentiment: "Mixed", mood: "Reflective" },
  ],
  late: [
    { content: "Third workout this week and meal prep is working. Energy is noticeably better.", sentiment: "Positive", mood: "Energized" },
    { content: "Slept well, kept screens away before bed, and the breathing practice is becoming a habit.", sentiment: "Positive", mood: "Calm" },
  ],
};

const quiet = async <T,>(fn: () => Promise<T>): Promise<T> => {
  const saved = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = () => {};
  try {
    return await fn();
  } finally {
    Object.assign(console, saved);
  }
};

async function main() {
  const [user] = await db.select().from(users).where(
    target!.includes("@") ? sql`lower(${users.email}) = ${target!.toLowerCase()}` : eq(users.uid, target!),
  );
  if (!user) {
    console.error(`No account found for "${target}". Sign in to the app once with that Google account, then re-run this command.`);
    process.exit(1);
  }
  const userId = user.id;

  const [existing] = await db.execute(sql`
    SELECT (SELECT count(*) FROM food_logs WHERE user_id = ${userId})
         + (SELECT count(*) FROM exercise_logs WHERE user_id = ${userId})
         + (SELECT count(*) FROM journal_entries WHERE user_id = ${userId}) AS n`).then((r) => r.rows as any[]);
  if (Number(existing.n) > 0 && !RESET) {
    console.error(`${user.email} already has ${existing.n} logged entries. Re-run with --reset to replace its activity with demo data.`);
    process.exit(1);
  }

  if (RESET) {
    // Recommendations are left alone: three tracking tables reference them by foreign key.
    for (const table of [foodLogs, exerciseLogs, journalEntries, questCompletions, digitalTwinSnapshots, cognitiveMemory, digitalTwins]) {
      await db.delete(table).where(eq((table as any).userId, userId));
    }
    await db.update(profiles).set({ xp: 0, coins: 0, streakDays: 0 }).where(eq(profiles.userId, userId));
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  if (!profile) {
    await db.insert(profiles).values({
      userId, age: 26, gender: "female", height: 165, weight: 62, occupation: "Software engineer",
      sleepDuration: "6-7 hours", primaryGoal: "Improve fitness and reduce stress", fitnessLevel: "Intermediate",
      activityLevel: "Moderately Active", workoutExperience: "1-2 years", availableEquipment: ["Dumbbells", "Yoga Mat"],
      workoutLocation: "Home", availableDays: "5 days", sessionDuration: "30-45 minutes", sleepQuality: "Fair",
      stressLevel: 6, dietType: "Vegetarian", healthRestrictions: ["None"],
    });
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const at = (dayStart: number, hour: number, minute = 0) => new Date(dayStart + (hour * 60 + minute) * 60_000);
  const gapDay = DAYS >= 13 ? DAYS - 13 : -1; // one missed day, leaving a 12-day streak
  let xp = 0, coins = 0, meals = 0, workouts = 0, entries = 0;

  for (let i = 0; i < DAYS; i++) {
    const dayStart = todayUtc - (DAYS - 1 - i) * 86_400_000;
    const date = new Date(dayStart).toISOString().slice(0, 10);
    const phase = i < DAYS / 3 ? "early" : i < (2 * DAYS) / 3 ? "mid" : "late";
    const past = (d: Date) => d.getTime() <= now.getTime();
    const done = new Set<string>();

    if (i !== gapDay) {
      const dayMeals = [
        { ...pick(MEALS.breakfast), createdAt: at(dayStart, 3) },
        { ...pick(MEALS.lunch), createdAt: at(dayStart, 7, 45) },
        { ...pick(MEALS.dinner), createdAt: at(dayStart, 14, 30) },
      ];
      if (phase === "early") {
        if (rand() < 0.5) dayMeals.shift(); // skipped breakfast
        if (rand() < 0.6) dayMeals.push({ ...pick(MEALS.lateSnack), createdAt: at(dayStart, 17, 30) });
      }
      const loggedMeals = dayMeals.filter((m) => past(m.createdAt));
      if (loggedMeals.length) {
        await db.insert(foodLogs).values(loggedMeals.map((m) => ({ userId, ...m, confidence: 85, source: "demo-seed" })));
        meals += loggedMeals.length;
        done.add("3");
      }

      const planned = WEEKLY_PLAN[new Date(dayStart).getUTCDay()];
      const skip = phase === "early" ? rand() < 0.5 : phase === "mid" ? rand() < 0.2 : false;
      const workoutAt = at(dayStart, 1, 30);
      if (planned && !skip && past(workoutAt)) {
        await db.insert(exerciseLogs).values({ userId, ...planned, source: "demo-seed", createdAt: workoutAt });
        workouts++;
        done.add("2");
      }

      const journalAt = at(dayStart, 16, 30);
      if (i % 2 === 0 && past(journalAt)) {
        const entry = pick(JOURNAL[phase]);
        const summary = `Reflection logged: "${entry.content.slice(0, 60)}..."`;
        await db.insert(journalEntries).values({ userId, date, ...entry, summary, createdAt: journalAt });
        await db.insert(cognitiveMemory).values({
          userId, memoryType: "episodic", content: { date, mood: entry.mood, sentiment: entry.sentiment, summary },
          consolidationStatus: "raw", importanceScore: entry.sentiment === "Negative" ? 70 : 50, createdAt: journalAt,
        });
        entries++;
        done.add("1");
      }

      for (const questId of done) {
        const reward = QUEST_REWARDS[questId];
        await db.insert(questCompletions).values({ userId, questId, completedDate: date, xpAwarded: reward.xp, coinsAwarded: reward.coins, createdAt: at(dayStart, 17) });
        await db.insert(cognitiveMemory).values({
          userId, memoryType: "procedural", content: { questId, xpAwarded: reward.xp, coinsAwarded: reward.coins, date },
          consolidationStatus: "consolidated", importanceScore: 40, createdAt: at(dayStart, 17),
        });
        xp += reward.xp;
        coins += reward.coins;
      }
    }

    // Recalibrate on the data as it stood that day, then move what it wrote onto that day.
    const stamp = at(dayStart, 18);
    const when = past(stamp) ? stamp : now;
    const [lastSnap] = await db.select({ id: sql<number>`coalesce(max(${digitalTwinSnapshots.id}), 0)` }).from(digitalTwinSnapshots);
    const [lastMem] = await db.select({ id: sql<number>`coalesce(max(${cognitiveMemory.id}), 0)` }).from(cognitiveMemory);
    await quiet(() => recalibrateDigitalTwin(userId, "demo_seed_recalibrate", when));
    await db.update(digitalTwinSnapshots).set({ createdAt: when, snapshotTimestamp: when })
      .where(and(eq(digitalTwinSnapshots.userId, userId), gt(digitalTwinSnapshots.id, lastSnap.id)));
    await db.update(cognitiveMemory).set({ createdAt: when, updatedAt: when })
      .where(and(eq(cognitiveMemory.userId, userId), gt(cognitiveMemory.id, lastMem.id)));
    process.stdout.write(`\r  day ${i + 1}/${DAYS} (${date})`);
  }

  await db.execute(sql`UPDATE profiles SET xp = xp + ${xp}, coins = coins + ${coins} WHERE user_id = ${userId}`);
  const [twin] = await db.select().from(digitalTwins).where(eq(digitalTwins.userId, userId));
  const states: any = twin?.states || {};

  console.log(`\n\nSeeded ${user.email}:`);
  console.log(`  ${meals} meals, ${workouts} workouts, ${entries} journal entries over ${DAYS} days (+${xp} XP, +${coins} coins)`);
  console.log(`  Digital Twin health index ${states.overallHealthIndex?.score} (fitness ${states.exercise?.score}, recovery ${states.recovery?.score}, nutrition ${states.nutrition?.score}) via ${states.researchMetadata?.modelVersion}`);
  console.log("  Open the Dashboard to see it; the streak updates when the profile loads.");
}

try {
  await main();
} finally {
  await pool.end();
}
