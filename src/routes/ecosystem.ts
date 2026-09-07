import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { getOrCreateUser } from "../db/users.ts";
import { db } from "../db/index.ts";
import { users, collaborationShares, ragDocuments, biomarkers } from "../db/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import { getAiAverageLatencyMs, aiMetrics } from "../lib/aiMetrics.ts";

const router = express.Router();

router.get("/api/ecosystem", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");

    const collaboratorRows = await db.select({
      id: collaborationShares.id,
      name: users.fullName,
      email: users.email,
      permissions: collaborationShares.permissions,
      status: collaborationShares.status,
    })
    .from(collaborationShares)
    .innerJoin(users, eq(collaborationShares.collaboratorId, users.id))
    .where(and(eq(collaborationShares.ownerId, userResult.id), eq(collaborationShares.status, "active")));

    const collaborators = collaboratorRows.map(c => ({
      id: c.id,
      name: c.name || c.email,
      role: "Collaborator",
      org: c.email,
      permissions: Object.keys((c.permissions as any) || {}).filter(k => (c.permissions as any)[k]),
      status: c.status
    }));

    const knowledgeRows = await db.select().from(ragDocuments).where(eq(ragDocuments.userId, userResult.id)).orderBy(desc(ragDocuments.createdAt));
    const knowledgeBase = knowledgeRows.map(d => ({
      id: d.id,
      title: d.title,
      type: d.documentType || "personal_note",
      status: "indexed",
      relevance: 100
    }));

    const biomarkerRows = await db.select().from(biomarkers).where(eq(biomarkers.userId, userResult.id)).orderBy(desc(biomarkers.timestamp));
    const latestByMarker = new Map<string, typeof biomarkerRows>();
    for (const b of biomarkerRows) {
      const list = latestByMarker.get(b.markerName) || [];
      list.push(b);
      latestByMarker.set(b.markerName, list);
    }
    const markerBiomarkers = Array.from(latestByMarker.values()).map(list => {
      const [latest, previous] = list;
      let trend: "improving" | "declining" | "stable" = "stable";
      if (previous) {
        const a = parseFloat(latest.value);
        const b = parseFloat(previous.value);
        if (!Number.isNaN(a) && !Number.isNaN(b) && b !== 0) {
          trend = a > b ? "improving" : a < b ? "declining" : "stable";
        }
      }
      return {
        id: latest.id,
        name: latest.markerName,
        value: latest.value,
        unit: latest.unit,
        trend,
        lastChecked: latest.timestamp ? new Date(latest.timestamp).toLocaleDateString() : ""
      };
    });

    const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
    const geminiLatency = getAiAverageLatencyMs();

    res.json({
      collaborators,
      knowledgeBase,
      healthcare: { biomarkers: markerBiomarkers },
      models: [
        {
          id: "gemini-2.5-flash",
          status: geminiConfigured ? "active" : "offline",
          latency: aiMetrics.callCount > 0 ? `${geminiLatency}ms` : "-",
          tasks: ["Coach Nova Chat", "Digital Twin Recalibration", "Specialist Agent Council", "Daily/Weekly/Monthly Briefings"]
        }
      ]
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/ecosystem/collaborators", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const { email, permissions } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });

    const [collaboratorUser] = await db.select().from(users).where(eq(users.email, email));
    if (!collaboratorUser) {
      return res.status(404).json({ error: "No InnerVerse account found for that email. Ask them to sign up first." });
    }
    if (collaboratorUser.id === userResult.id) {
      return res.status(400).json({ error: "You cannot invite yourself." });
    }

    const [share] = await db.insert(collaborationShares).values({
      ownerId: userResult.id,
      collaboratorId: collaboratorUser.id,
      permissions: permissions || { read_metrics: true },
      status: "active"
    }).returning();

    res.json({ share });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/ecosystem/collaborators/:id/revoke", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const shareId = Number(req.params.id);
    if (!Number.isInteger(shareId)) return res.status(400).json({ error: "Invalid id" });

    const [share] = await db.update(collaborationShares)
      .set({ status: "revoked" })
      .where(and(eq(collaborationShares.id, shareId), eq(collaborationShares.ownerId, userResult.id)))
      .returning();

    if (!share) return res.status(404).json({ error: "Collaborator share not found" });
    res.json({ share });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/ecosystem/biomarkers", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const { markerName, value, unit } = req.body;
    if (!markerName || value === undefined || !unit) {
      return res.status(400).json({ error: "markerName, value, and unit are required" });
    }

    const [marker] = await db.insert(biomarkers).values({
      userId: userResult.id,
      markerName,
      value: String(value),
      unit,
      source: "manual"
    }).returning();

    res.json({ marker });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/ecosystem/knowledge", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return Object.assign(res.status(401), { json: () => {} }).json({ error: "Unauthorized" });
    const userResult = await getOrCreateUser(req.user.uid, req.user.email || "");
    const { title, documentType, content } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });

    const [doc] = await db.insert(ragDocuments).values({
      userId: userResult.id,
      title,
      documentType: documentType || "personal_note",
      content: content || ""
    }).returning();

    res.json({ document: doc });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
