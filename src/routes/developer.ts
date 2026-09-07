import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { apiKeys } from "../db/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

const router = express.Router();

// Developer API keys: a real key is generated and only its SHA-256 hash is stored,
// so the plaintext is shown to the user exactly once, at creation time.
router.get("/api/developer/keys", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.userId, userResult.id)).orderBy(desc(apiKeys.createdAt)).limit(1);
    res.json({
      hasKey: Boolean(key),
      keyPreview: key ? `iv_live_${"*".repeat(28)}${key.keyPreview}` : null,
      createdAt: key?.createdAt || null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/developer/keys/regenerate", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

    const rawKey = `iv_live_${crypto.randomBytes(24).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPreview = rawKey.slice(-4);

    await db.delete(apiKeys).where(eq(apiKeys.userId, userResult.id));
    await db.insert(apiKeys).values({
      userId: userResult.id,
      keyHash,
      keyPreview,
      scopes: ["read_twin", "read_metrics"],
      name: "Default Key"
    });

    // The plaintext key is returned only in this response; it cannot be recovered later.
    res.json({ key: rawKey });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
