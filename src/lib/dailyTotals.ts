export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

type FoodLogLike = { createdAt?: string | Date | null; calories?: number | null; protein?: number | null; carbs?: number | null; fats?: number | null };

/**
 * Sums the calories and macros of the meals logged on the same local calendar day as
 * `now`. The food-log API returns the most recent meals across all days, so adding up
 * the whole list would report several days of eating as one day's intake.
 */
export function todaysMacroTotals(logs: FoodLogLike[], now: Date = new Date()): MacroTotals {
  const today = now.toDateString();
  const totals: MacroTotals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
  for (const log of logs) {
    if (!log.createdAt || new Date(log.createdAt).toDateString() !== today) continue;
    totals.calories += log.calories || 0;
    totals.protein += log.protein || 0;
    totals.carbs += log.carbs || 0;
    totals.fats += log.fats || 0;
  }
  return totals;
}
