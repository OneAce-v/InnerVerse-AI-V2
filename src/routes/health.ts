import express from "express";
import { db } from "../db/index.ts";
import { sql } from "drizzle-orm";

const router = express.Router();

router.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

router.get("/api/system/status", async (req, res) => {
  let dbReachable = true;
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    dbReachable = false;
  }
  res.json({
    status: dbReachable ? "operational" : "degraded",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

export default router;
