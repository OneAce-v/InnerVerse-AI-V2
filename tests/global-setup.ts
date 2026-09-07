const BASE_URL = "http://localhost:3000";

async function waitForServer(timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // Server not listening yet - keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Server did not become healthy within ${timeoutMs}ms. Check SQL_* env vars and that Postgres is reachable.`);
}

export default async function globalSetup() {
  process.env.NODE_ENV = "test";

  const required = ["SQL_HOST", "SQL_USER", "SQL_PASSWORD", "SQL_DB_NAME"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing env vars for the test database: ${missing.join(", ")}. ` +
      `Set them to a real (throwaway) Postgres instance with the schema already pushed via "npm run db:push".`
    );
  }
  if (!process.env.GEMINI_API_KEY) {
    // The app's Gemini call sites all have deterministic heuristic fallbacks for
    // when the API is unreachable/unauthorized, so any placeholder value is fine here.
    process.env.GEMINI_API_KEY = "test-placeholder-key";
  }

  // Importing server.ts runs its top-level `startServer()` call, which registers every
  // route and starts listening on port 3000 - see server.ts's own PORT constant.
  const serverModule = await import("../server.ts");
  const httpServer = await serverModule.serverReady;
  await waitForServer(20000);

  // Deliberately does NOT also close the Postgres pool here: several routes kick off
  // a "fire and forget" background recalibration (see recalibrateDigitalTwin(...).catch(...)
  // call sites in server.ts) that isn't awaited by the request handler, so a test can
  // finish and this teardown can run while one of those is still using a pool connection.
  // Ending the pool while that's in flight just replaces a quiet teardown with a scary
  // (but harmless) "Cannot use a pool after calling end on the pool" log line. Closing
  // the HTTP listener alone is enough to stop accepting new connections cleanly.
  return () => new Promise<void>((resolve) => httpServer.close(() => resolve()));
}
