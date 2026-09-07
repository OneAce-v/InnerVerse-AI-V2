import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { profiles, storePurchases } from "../db/schema.ts";
import { eq, and, sql } from "drizzle-orm";
import { STORE_CATALOG } from "../lib/catalogs.ts";

const router = express.Router();

// Rewards store: what's for sale, and what this user already owns.
router.get("/api/store", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

    const [profileResult] = await db.select().from(profiles).where(eq(profiles.userId, userResult.id));
    const purchases = await db.select().from(storePurchases).where(eq(storePurchases.userId, userResult.id));

    const owned: Record<string, number> = {};
    for (const p of purchases) {
      owned[p.itemId] = (owned[p.itemId] || 0) + p.quantity;
    }

    const items = Object.entries(STORE_CATALOG).map(([id, item]) => ({
      id,
      title: item.title,
      cost: item.cost,
      consumable: !!item.consumable,
      owned: owned[id] || 0,
    }));

    res.json({ items, coins: profileResult?.coins || 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Purchase a store item. Price is always looked up server-side from STORE_CATALOG and
// the coin deduction is atomic (the WHERE clause guards against a race spending more
// than the user has), so this can never be exploited to go negative or mint items for free.
router.post("/api/store/purchase", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const { itemId } = req.body;

    const item = STORE_CATALOG[itemId];
    if (!item) {
      return res.status(400).json({ error: "Unknown itemId" });
    }

    if (!item.consumable) {
      const [existing] = await db.select().from(storePurchases).where(and(
        eq(storePurchases.userId, userResult.id),
        eq(storePurchases.itemId, itemId)
      ));
      if (existing) {
        return res.status(400).json({ error: "You already own this item" });
      }
    }

    const deducted = await db.execute(sql`UPDATE profiles SET coins = coins - ${item.cost} WHERE user_id = ${userResult.id} AND coins >= ${item.cost} RETURNING coins`);
    if (deducted.rows.length === 0) {
      return res.status(400).json({ error: "Not enough coins" });
    }

    await db.insert(storePurchases).values({
      userId: userResult.id,
      itemId,
      quantity: 1,
      coinsCost: item.cost,
    });

    res.json({ success: true, coins: (deducted.rows[0] as any).coins, item: { id: itemId, title: item.title } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
