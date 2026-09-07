import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import { profiles, users } from "../src/db/schema.ts";

export const BASE_URL = "http://localhost:3000";

/** A fresh, collision-free test user id for one test. */
export function testUid(label: string): string {
  return `test-${label}-${randomUUID().slice(0, 8)}`;
}

function authHeaders(uid: string): Record<string, string> {
  return { Authorization: `Bearer TEST_AUTH:${uid}` };
}

export async function apiGet(path: string, uid: string) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders(uid) });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

export async function apiPost(path: string, uid: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { ...authHeaders(uid), "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

/** Registers a fresh user and gives them a minimal complete profile, ready for testing. */
export async function createTestUser(label: string, profileOverrides: Record<string, unknown> = {}) {
  const uid = testUid(label);
  await apiPost("/api/auth/sync", uid);
  await apiPost("/api/profile", uid, {
    age: 30,
    gender: "female",
    primaryGoal: "Fitness",
    fitnessLevel: "Intermediate",
    activityLevel: "Active",
    dietType: "Balanced",
    ...profileOverrides,
  });
  return uid;
}

/**
 * Directly sets a user's coin balance for test setup. `coins` is deliberately not
 * settable through POST /api/profile (it's server-authoritative, earned only via
 * quests/tracking), so tests that need a specific starting balance write it straight
 * to the database instead of going through the API.
 */
export async function setCoins(uid: string, coins: number) {
  const [user] = await db.select().from(users).where(eq(users.uid, uid));
  if (!user) throw new Error(`setCoins: no user found for uid ${uid} - call createTestUser first`);
  await db.update(profiles).set({ coins }).where(eq(profiles.userId, user.id));
}
