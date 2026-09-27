// Lightweight, dependency-free User-Agent summarizer used to label real tracked devices.
export function describeDevice(userAgent: string): { name: string; type: string } {
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

export function timeAgo(date: Date | string | null | undefined): string {
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

/**
 * Consecutive days with any logged activity, counting back from today (UTC). A streak
 * is still alive if the last activity was yesterday - today just hasn't been logged yet.
 */
export function computeStreak(activeDays: Iterable<string>, now: Date = new Date()): number {
  const days = new Set(activeDays);
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const key = () => cursor.toISOString().slice(0, 10);
  if (!days.has(key())) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(key())) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function calculateLevel(xp: number): number {
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
