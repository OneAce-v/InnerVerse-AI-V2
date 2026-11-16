/**
 * `npm run demo` - runs the whole app on this computer with nothing else to install.
 *
 *   Database  An embedded PostgreSQL (PGlite: the real PostgreSQL engine compiled to
 *             WebAssembly) stored in .demo-db/. To use the PostgreSQL server from your
 *             SQL_* settings instead, put DEMO_DB=postgres in .env.
 *   Sign-in   A local demo account, so no Firebase project is needed.
 *   Data      The first run fills that account with three weeks of sample activity
 *             (scripts/seed-demo.ts). Set DEMO_NAME in .env to change the display name.
 *
 *   npm run demo          start, keeping whatever was logged last time
 *   npm run demo:fresh    wipe the demo account and re-seed it up to today
 *
 * For demonstrations only. The server accepts the demo sign-in token in this mode, so
 * it listens on localhost only. Never deploy it like this.
 */
import "dotenv/config";
import { fork } from "node:child_process";
import { rmSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";

const DEMO_UID = "demo-user";
const FRESH = process.argv.includes("--fresh");
const USE_POSTGRES = (process.env.DEMO_DB || "").toLowerCase() === "postgres";
const DATA_DIR = path.resolve(".demo-db");

process.env.NODE_ENV = "test"; // the only mode in which the server accepts the demo sign-in
process.env.VITE_DEMO_UID = DEMO_UID;
process.env.DEMO_NAME ||= "Demo User";
process.env.VITE_DEMO_NAME = process.env.DEMO_NAME;

const step = (message: string) => console.log(`[demo] ${message}`);
const fail = (message: string): never => {
  console.error(`\n[demo] ${message}\n`);
  process.exit(1);
};

const hasAiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY");
if (!hasAiKey) process.env.GEMINI_API_KEY = "demo-no-key";

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });

// Checked before the slower steps so a second copy of the app fails with a clear message.
await new Promise<void>((resolve) => {
  const probe = createServer();
  probe.once("error", (error: NodeJS.ErrnoException) =>
    fail(error.code === "EADDRINUSE" ? "Port 3000 is already in use. Close the other program using it (often another copy of this app, in another terminal window) and try again." : error.message),
  );
  probe.listen(3000, "127.0.0.1", () => probe.close(() => resolve()));
});

let closeEmbedded: (() => Promise<void>) | null = null;

async function startEmbeddedDatabase() {
  const { PGlite } = await import("@electric-sql/pglite");
  const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");

  if (FRESH) rmSync(DATA_DIR, { recursive: true, force: true });
  let pglite: InstanceType<typeof PGlite>;
  let where = ".demo-db/";
  try {
    pglite = await PGlite.create(DATA_DIR);
  } catch (first) {
    // A demo must still start if the saved database can't be opened (for example after
    // the process was killed mid-write): start over, in memory if the folder is unusable.
    console.warn("[demo] Could not open .demo-db/, starting with a new database:", (first as Error).message);
    try {
      rmSync(DATA_DIR, { recursive: true, force: true });
      pglite = await PGlite.create(DATA_DIR);
    } catch {
      pglite = await PGlite.create();
      where = "memory (nothing will be kept after you stop the demo)";
    }
  }

  const port = await freePort();
  const socket = new PGLiteSocketServer({ db: pglite, host: "127.0.0.1", port, maxConnections: 10 });
  await socket.start();
  Object.assign(process.env, { SQL_HOST: "127.0.0.1", SQL_PORT: String(port), SQL_USER: "postgres", SQL_PASSWORD: "postgres", SQL_DB_NAME: "postgres" });
  closeEmbedded = async () => {
    await socket.stop();
    await pglite.close();
  };
  step(`Embedded PostgreSQL ready (stored in ${where})`);
}

if (USE_POSTGRES) {
  const missing = ["SQL_HOST", "SQL_USER", "SQL_PASSWORD", "SQL_DB_NAME"].filter((key) => !process.env[key]);
  if (missing.length) fail(`DEMO_DB=postgres needs ${missing.join(", ")} in .env.`);
  step(`Using the PostgreSQL server at ${process.env.SQL_HOST}:${process.env.SQL_PORT || 5432}, database ${process.env.SQL_DB_NAME}`);
} else {
  await startEmbeddedDatabase();
}

// Imported only now, so the connection pool is created with the settings chosen above.
const { db, pool } = await import("../src/db/index.ts");
const schema = await import("../src/db/schema.ts");
const { eq, sql } = await import("drizzle-orm");

try {
  await db.execute(sql`select 1`);
} catch (error) {
  fail(
    `Cannot connect to PostgreSQL at ${process.env.SQL_HOST}:${process.env.SQL_PORT || 5432} (${((error as any).cause ?? error).message}).\n` +
      "       Check the SQL_* values in .env, or remove DEMO_DB=postgres to use the embedded database.",
  );
}

// Tables are created only in an empty database. (drizzle-kit's "push" is not used on an
// existing one: it can stop to ask whether to truncate tables, which a demo must never do.)
const [{ existing }] = (await db.execute(sql`select to_regclass('public.users') as existing`)).rows as { existing: string | null }[];
if (!existing) {
  step("Creating the database tables...");
  const { generateDrizzleJson, generateMigration } = await import("drizzle-kit/api");
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));
  for (const statement of statements) await db.execute(sql.raw(statement));
} else {
  const [{ ok }] = (await db.execute(sql`select count(*)::int as ok from information_schema.columns where table_name = 'profiles' and column_name = 'preferences'`)).rows as { ok: number }[];
  if (!ok) {
    fail(
      USE_POSTGRES
        ? 'This database was created by an older version of the app. Run "npm run db:push" once, then start the demo again.'
        : 'The saved demo database was created by an older version of the app. Run "npm run demo:fresh" to rebuild it.',
    );
  }
}

const runSeed = (args: string[]) =>
  new Promise<void>((resolve, reject) => {
    // fork() re-uses this process's loader flags, so the TypeScript file runs as-is.
    const child = fork(path.resolve("scripts/seed-demo.ts"), args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(`seed-demo exited with code ${code}`))));
  });

const [account] = await db.select().from(schema.users).where(eq(schema.users.uid, DEMO_UID));
const [{ meals }] = account
  ? await db.select({ meals: sql<number>`count(*)::int` }).from(schema.foodLogs).where(eq(schema.foodLogs.userId, account.id))
  : [{ meals: 0 }];
if (!account || meals === 0 || FRESH) {
  step("Filling the demo account with three weeks of sample activity...");
  await runSeed([DEMO_UID, "--create", "--name", process.env.DEMO_NAME!, ...(account ? ["--reset"] : [])]);
} else {
  step(`Demo account already has data (${meals} meals logged). Run "npm run demo:fresh" to start again from sample data.`);
}

step(hasAiKey ? "GEMINI_API_KEY found: AI features will call Gemini." : "No GEMINI_API_KEY in .env: AI features will use their offline fallbacks.");

const { serverReady } = await import("../server.ts");
const httpServer = await serverReady;
const announce = () =>
  console.log(`\n[demo] InnerVerse AI is running in demo mode. Open http://localhost:3000 in your browser.\n[demo] Press Ctrl+C here to stop.\n`);
if (httpServer.listening) announce();
else httpServer.once("listening", announce);

let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  httpServer.close();
  await pool.end().catch(() => {});
  await closeEmbedded?.().catch(() => {});
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
