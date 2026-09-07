import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { db } from "../db/index.ts";
import { users, systemHealth } from "../db/schema.ts";
import { and, sql } from "drizzle-orm";
import { getAiAverageLatencyMs } from "../lib/aiMetrics.ts";
import { requestMetrics } from "../lib/requestMetrics.ts";

const router = express.Router();

router.get("/api/admin/health", requireAuth, async (req: AuthRequest, res) => {
  try {
    // Real DB health check: time an actual round trip instead of reporting a fixed number.
    const dbStart = Date.now();
    let dbStatus = "operational";
    let dbLatencyMs = 0;
    try {
      await db.execute(sql`SELECT 1`);
      dbLatencyMs = Date.now() - dbStart;
    } catch (e) {
      dbStatus = "outage";
      dbLatencyMs = Date.now() - dbStart;
    }

    const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
    const geminiLatencyMs = getAiAverageLatencyMs();

    const [{ count: totalUsersRaw } = { count: 0 }] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalUsers = Number(totalUsersRaw || 0);

    const now = Date.now();
    const windowMs = 60 * 1000;
    const requestsLastMin = requestMetrics.timestamps.filter(t => now - t < windowMs).length;
    const recentDurations = requestMetrics.durationsMs.slice(-200);
    const avgResponseTimeMs = recentDurations.length > 0
      ? Math.round(recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length)
      : 0;
    const errorRate = requestMetrics.totalCount > 0
      ? ((requestMetrics.errorCount / requestMetrics.totalCount) * 100).toFixed(2) + "%"
      : "0.00%";

    // Persist a snapshot so /api/system/status and future admin views can read the latest recorded check.
    await db.insert(systemHealth).values({ serviceName: "postgresql_primary", status: dbStatus, latencyMs: dbLatencyMs });
    await db.insert(systemHealth).values({ serviceName: "gemini_gateway", status: geminiConfigured ? "operational" : "not_configured", latencyMs: geminiLatencyMs });

    res.json({
      status: dbStatus === "operational" ? "Healthy" : "Degraded",
      uptimeSeconds: Math.round(process.uptime()),
      activeInstances: 1,
      services: [
        { name: "PostgreSQL Primary", status: dbStatus, latencyMs: dbLatencyMs },
        { name: "Gemini AI Gateway", status: geminiConfigured ? "operational" : "not_configured", latencyMs: geminiLatencyMs }
      ],
      metrics: {
        totalUsers,
        apiRequestsPerMin: requestsLastMin,
        avgResponseTimeMs,
        errorRate
      }
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
