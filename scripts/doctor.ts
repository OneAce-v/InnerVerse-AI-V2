/**
 * `npm run doctor` - checks that this computer is set up to run InnerVerse AI for real
 * (not in demo mode) and tells you exactly what to fix when something is wrong.
 *
 * It checks, in order:
 *   1. .env has the database settings and a Gemini key
 *   2. firebase-applet-config.json holds a real Firebase web-app config
 *   3. PostgreSQL accepts the connection, and the tables exist
 *   4. Gemini accepts the key (one tiny request)
 *   5. the port the app needs is free
 *
 * It never prints a password or key. Exit code 0 = everything passed, 1 = something failed.
 */
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:net";

type Result = { ok: boolean; warn?: boolean; message: string; fix?: string };
const results: Result[] = [];
const pass = (message: string) => results.push({ ok: true, message });
const warn = (message: string, fix: string) => results.push({ ok: true, warn: true, message, fix });
const fail = (message: string, fix: string) => results.push({ ok: false, message, fix });
const heading = (text: string) => console.log(`\n${text}`);
const show = (from: number) => {
  for (const r of results.slice(from)) {
    console.log(`  ${r.ok ? (r.warn ? "!" : "✓") : "✗"} ${r.message}`);
    if (r.fix) console.log(`      → ${r.fix}`);
  }
};

const isBlank = (v: string | undefined) => !v || v.trim() === "" || /^(MY_|YOUR_|<)/i.test(v.trim());

// --- 1. .env ---------------------------------------------------------------
heading("1. Settings in .env");
let mark = results.length;
if (!existsSync(".env")) {
  fail(".env file not found", "Copy .env.example to .env (same folder as package.json) and fill it in.");
}
for (const name of ["SQL_HOST", "SQL_USER", "SQL_PASSWORD", "SQL_DB_NAME", "SQL_ADMIN_USER", "SQL_ADMIN_PASSWORD"]) {
  if (isBlank(process.env[name])) fail(`${name} is missing`, `Add a line  ${name}=...  to .env`);
}
if (isBlank(process.env.GEMINI_API_KEY)) {
  fail("GEMINI_API_KEY is missing", "Create a key at aistudio.google.com/apikey and add  GEMINI_API_KEY=...  to .env");
} else if (!process.env.GEMINI_API_KEY!.startsWith("AIza")) {
  warn("GEMINI_API_KEY does not start with 'AIza'", "Keys from aistudio.google.com/apikey normally do. A different format may not work with this app.");
}
if (results.length === mark) pass("All database settings and the Gemini key are present");
show(mark);

// --- 2. Firebase config -----------------------------------------------------
heading("2. Firebase web-app config (firebase-applet-config.json)");
mark = results.length;
try {
  const cfg = JSON.parse(readFileSync("firebase-applet-config.json", "utf8"));
  const missing = ["apiKey", "authDomain", "projectId", "appId"].filter((k) => isBlank(cfg[k]));
  if (missing.length) {
    fail(`Missing: ${missing.join(", ")}`, "Firebase console → Project settings → Your apps → Web app → copy the config values into the file.");
  } else if (cfg.projectId === "still-light-1bndl") {
    fail("Still using the original Firebase project (still-light-1bndl)", "That project is locked by the university's organisation policy. Paste the config of YOUR new Firebase project.");
  } else {
    pass(`Project "${cfg.projectId}" (sign-in domain ${cfg.authDomain})`);
  }
} catch (error) {
  fail(`Could not read firebase-applet-config.json (${(error as Error).message})`, "The file must be valid JSON in the project folder.");
}
show(mark);

// --- 3. PostgreSQL ----------------------------------------------------------
heading("3. PostgreSQL");
mark = results.length;
if (["SQL_HOST", "SQL_USER", "SQL_PASSWORD", "SQL_DB_NAME"].some((n) => isBlank(process.env[n]))) {
  fail("Skipped: database settings missing (see step 1)", "Fix step 1 first.");
} else {
  const { createPool } = await import("../src/db/index.ts");
  const pool = createPool();
  pool.on("error", () => {});
  const where = `${process.env.SQL_HOST}:${process.env.SQL_PORT || 5432}, database "${process.env.SQL_DB_NAME}"`;
  try {
    const { rows } = await pool.query("select version() as v");
    pass(`Connected to ${where} (${String(rows[0].v).split(",")[0]})`);
    const tables = await pool.query("select to_regclass('public.users') as users, (select count(*) from information_schema.columns where table_name = 'profiles' and column_name = 'preferences') as prefs");
    if (!tables.rows[0].users) fail("Connected, but the tables do not exist yet", "Run:  npm run db:push");
    else if (Number(tables.rows[0].prefs) === 0) fail("Tables exist but are from an older version of the app", "Run:  npm run db:push");
    else pass("Tables are present and up to date");
  } catch (error) {
    const e = error as NodeJS.ErrnoException & { message: string };
    const text = `${e.code ? e.code + ": " : ""}${e.message || (error as any)?.errors?.[0]?.message || "connection failed"}`;
    if (e.code === "ECONNREFUSED" || /ECONNREFUSED/.test(text)) {
      fail(`Nothing is listening at ${where}`, "Start the PostgreSQL service (Windows: Services → postgresql-x64-… → Start), and check the port. Set SQL_PORT in .env if it is not 5432.");
    } else if (e.code === "28P01" || /password authentication failed/i.test(text)) {
      fail("PostgreSQL rejected the password", "SQL_PASSWORD in .env must be the password of the 'postgres' user. If you forgot it, reset it (pgAdmin cannot help when you cannot log in; see README).");
    } else if (e.code === "3D000" || /does not exist/i.test(text)) {
      fail(`Database "${process.env.SQL_DB_NAME}" does not exist`, `Create it:  psql -U postgres -c "CREATE DATABASE ${process.env.SQL_DB_NAME}"`);
    } else {
      fail(`Could not connect to ${where}: ${text}`, "Check SQL_HOST, SQL_PORT, SQL_USER and SQL_PASSWORD in .env.");
    }
  } finally {
    await pool.end().catch(() => {});
  }
}
show(mark);

// --- 4. Gemini ---------------------------------------------------------------
heading("4. Gemini API key");
mark = results.length;
if (isBlank(process.env.GEMINI_API_KEY)) {
  fail("Skipped: no GEMINI_API_KEY (see step 1)", "Fix step 1 first.");
} else {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const started = Date.now();
    const reply = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: "Reply with the single word OK." });
    pass(`Gemini answered in ${Date.now() - started} ms: "${(reply.text || "").trim().slice(0, 40)}"`);
  } catch (error) {
    const text = String((error as Error)?.message || error);
    if (/API_KEY_INVALID|API key not valid/i.test(text)) fail("Gemini says the API key is not valid", "Create a new key at aistudio.google.com/apikey and paste it into .env without quotes or spaces.");
    else if (/429|RESOURCE_EXHAUSTED/i.test(text)) warn("Gemini key works but the free quota is used up", "Wait a minute, or check usage in Google AI Studio.");
    else if (/PERMISSION_DENIED|403/i.test(text)) fail("Gemini refused the request (permission denied)", "The key's project may not have the Generative Language API enabled, or your region/account is restricted.");
    else if (/fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT/i.test(text)) fail("Could not reach Gemini (network)", "Check your internet connection, VPN or firewall.");
    else fail(`Gemini call failed: ${text.slice(0, 160)}`, "Copy this message when asking for help.");
  }
}
show(mark);

// --- 5. Port --------------------------------------------------------------------
heading("5. Port for the app");
mark = results.length;
const port = Number(process.env.PORT) || 3000;
const free = await new Promise<boolean>((resolve) => {
  const probe = createServer();
  probe.once("error", () => resolve(false));
  probe.listen(port, "0.0.0.0", () => probe.close(() => resolve(true)));
});
if (free) pass(`Port ${port} is free`);
else fail(`Port ${port} is already in use`, `Another program (maybe PostgreSQL itself) is using it. Run the app on another port: PowerShell  $env:PORT=3001; npm run dev`);
show(mark);

// --- Summary --------------------------------------------------------------------
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} problem(s) to fix. Fix the first ✗ above, then run  npm run doctor  again.\n` : "\nAll checks passed. Start the app with:  npm run dev\n");
process.exit(failed ? 1 : 0);
