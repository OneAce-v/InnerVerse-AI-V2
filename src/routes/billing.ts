import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { subscriptions, payments, notifications } from "../db/schema.ts";
import { eq, sql } from "drizzle-orm";

const router = express.Router();

// --- Phase 9: Enterprise Infrastructure & SaaS Endpoints ---

router.get("/api/subscription", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    let sub = await db.select().from(subscriptions).where(eq(subscriptions.userId, userResult.id)).then(r => r[0]);
    if (!sub) {
      const [newSub] = await db.insert(subscriptions).values({
        userId: userResult.id,
        plan: 'Free',
        status: 'active',
        billingCycle: 'monthly'
      }).returning();
      sub = newSub;
    }
    res.json({ subscription: sub });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/subscription", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const { plan, billingCycle } = req.body;
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

    const subValues = {
      userId: userResult.id,
      plan: plan || 'Pro',
      billingCycle: billingCycle || 'monthly',
      status: 'active',
      updatedAt: new Date()
    };
    const [updated] = await db.insert(subscriptions).values(subValues).onConflictDoUpdate({
      target: subscriptions.userId,
      set: subValues
    }).returning();

    // Record payment log
    const amount = plan === 'Enterprise' ? 9900 : plan === 'Pro' ? 2900 : plan === 'Premium' ? 1200 : 0;
    if (amount > 0) {
      await db.insert(payments).values({
        userId: userResult.id,
        amount,
        currency: 'USD',
        status: 'succeeded',
        invoiceUrl: `https://invoices.innerverse.ai/inv_${Date.now()}`
      });
    }

    await db.insert(notifications).values({
      userId: userResult.id,
      title: "Subscription Updated",
      message: `Your plan is now ${updated?.plan || plan || 'Pro'} (${updated?.billingCycle || billingCycle || 'monthly'} billing).`,
      type: "info"
    });

    res.json({ success: true, plan, billingCycle });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/billing", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const userPayments = await db.select().from(payments).where(eq(payments.userId, userResult.id)).orderBy(sql`${payments.createdAt} DESC`);
    res.json({ invoices: userPayments });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
