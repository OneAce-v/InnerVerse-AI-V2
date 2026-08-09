import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, fullName: string = '') {
  try {
    const safeEmail = email || `${uid}@placeholder.local`;
    const result = await db.insert(users)
      .values({
        uid,
        email: safeEmail,
        fullName,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: safeEmail,
          fullName: fullName || undefined, // keep existing if new is empty
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Error in getOrCreateUser:", error);
    throw new Error("Failed to get or create user", { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid));
    return result[0];
  } catch (error) {
    console.error("Error in getUserByUid:", error);
    throw new Error("Failed to get user", { cause: error });
  }
}
