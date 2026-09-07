import "dotenv/config";
import express from "express";
import path from "path";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { recordRequestMetric } from "./src/lib/requestMetrics.ts";

import healthRoutes from "./src/routes/health.ts";
import authRoutes from "./src/routes/auth.ts";
import profileRoutes from "./src/routes/profile.ts";
import chatRoutes from "./src/routes/chat.ts";
import recommendationsRoutes from "./src/routes/recommendations.ts";
import journalRoutes from "./src/routes/journal.ts";
import trackingRoutes from "./src/routes/tracking.ts";
import timelineRoutes from "./src/routes/timeline.ts";
import digitalTwinRoutes from "./src/routes/digitalTwin.ts";
import gamificationRoutes from "./src/routes/gamification.ts";
import storeRoutes from "./src/routes/store.ts";
import orchestrationRoutes from "./src/routes/orchestration.ts";
import ecosystemRoutes from "./src/routes/ecosystem.ts";
import cognitionRoutes from "./src/routes/cognition.ts";
import researchRoutes from "./src/routes/research.ts";
import lifeosRoutes from "./src/routes/lifeos.ts";
import analyticsRoutes from "./src/routes/analytics.ts";
import billingRoutes from "./src/routes/billing.ts";
import notificationsRoutes from "./src/routes/notifications.ts";
import adminRoutes from "./src/routes/admin.ts";
import privacyRoutes from "./src/routes/privacy.ts";
import wearablesRoutes from "./src/routes/wearables.ts";
import developerRoutes from "./src/routes/developer.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      recordRequestMetric(Date.now() - start, res.statusCode >= 500);
    });
    next();
  });

  // Rate limiting is meaningless (and actively gets in the way) when the whole test
  // suite hammers the same server from one process, so it's a no-op under NODE_ENV=test -
  // same gating as the TEST_AUTH bypass in src/middleware/auth.ts.
  const isTestEnv = process.env.NODE_ENV === "test";

  // General abuse/scraping guard on the whole API surface.
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTestEnv,
    message: { error: "Too many requests, please try again later." },
  });
  app.use("/api", apiLimiter);

  // Tighter limit on routes that call the Gemini API directly - these are
  // the expensive, cost-per-call endpoints most worth protecting.
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTestEnv,
    message: { error: "AI request limit reached. Please wait a few minutes and try again." },
  });
  app.use(
    [
      "/api/agents/chat",
      "/api/recommendations/generate",
      "/api/simulation",
      "/api/track/food/vision",
      "/api/digital-twin/recalibrate",
      "/api/orchestration/decision",
      "/api/cognition/experiments",
    ],
    aiLimiter,
  );

  // Wait for Cloud SQL proxy to be ready if needed, or define directly
  // In AI Studio, the proxy is launched automatically.

  // --- API Routes ---
  app.use(healthRoutes);
  app.use(authRoutes);
  app.use(profileRoutes);
  app.use(chatRoutes);
  app.use(recommendationsRoutes);
  app.use(journalRoutes);
  app.use(trackingRoutes);
  app.use(timelineRoutes);
  app.use(digitalTwinRoutes);
  app.use(gamificationRoutes);
  app.use(storeRoutes);
  app.use(orchestrationRoutes);
  app.use(ecosystemRoutes);
  app.use(cognitionRoutes);
  app.use(researchRoutes);
  app.use(lifeosRoutes);
  app.use(analyticsRoutes);
  app.use(billingRoutes);
  app.use(notificationsRoutes);
  app.use(adminRoutes);
  app.use(privacyRoutes);
  app.use(wearablesRoutes);
  app.use(developerRoutes);

  // --- Vite Middleware for Development ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For Express 4
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Exported so the test suite can await startup and close the listener during teardown
// (see tests/global-setup.ts); normal `npm run dev` / `npm start` just let this run.
export const serverReady = startServer();
