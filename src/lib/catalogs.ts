// Server-authoritative reward table for the daily quest catalog. The client only ever
// sends a questId; the actual xp/coins granted always come from here, never the request body.
export const QUEST_REWARDS: Record<string, { xp: number; coins: number }> = {
  "1": { xp: 50, coins: 10 }, // 10 Min Box Breathing / Bedtime CheckIn
  "2": { xp: 50, coins: 10 }, // Upper Body Workout
  "3": { xp: 50, coins: 10 }, // Log First Meal
};

// Server-authoritative rewards store catalog. The client only ever sends an itemId;
// the price always comes from here, never the request body. `consumable: true` items
// (like streak_freeze) can be bought more than once and accumulate a quantity;
// everything else is a one-time unlock.
export const STORE_CATALOG: Record<string, { title: string; cost: number; consumable?: boolean }> = {
  streak_freeze: { title: "Streak Freeze", cost: 50, consumable: true },
  cosmic_theme: { title: "Cosmic Theme", cost: 200 },
  nova_voice: { title: "Nova Voice Module", cost: 500 },
  pro_analytics: { title: "Pro Analytics", cost: 1000 },
};

// Options for the Yoga & Meditation preferences in Settings. Shared by the Settings page
// (which renders them) and POST /api/profile (which rejects anything else).
export const PRACTICE_PREFERENCE_OPTIONS = {
  yogaStyle: ["Hatha", "Vinyasa Flow", "Ashtanga", "Iyengar", "Yin Yoga", "Restorative"],
  meditationStyle: ["Mindfulness", "Vipassana", "Transcendental", "Loving-Kindness (Metta)", "Zen", "Sound Bath"],
  breathingPractice: ["Energy & Heat (Kapalabhati)", "Balance (Nadi Shodhana)", "Relaxation (Box Breathing)", "None"],
  spiritualFocus: ["Secular/Physical", "Chakra Alignment", "Mantra-based", "Holistic Mind-Body Connection"],
} as const;
export type PracticePreferenceKey = keyof typeof PRACTICE_PREFERENCE_OPTIONS;
