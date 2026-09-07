import { describe, it, expect } from "vitest";
import { apiPost, createTestUser } from "./helpers.ts";

// Regression test for a real bug found while verifying this session's work: the
// journal_entries.date column is NOT NULL with no database-level default, but the
// route destructured `date` straight from the request body with no fallback. The
// real frontend always sends a date, but nothing enforced that, so any caller that
// omitted it hit a NOT NULL violation and got a 500.
describe("POST /api/journal", () => {
  it("succeeds and defaults the date when the caller omits it", async () => {
    const uid = await createTestUser("journal-no-date");

    const res = await apiPost("/api/journal", uid, { content: "Felt calm and focused today." });

    expect(res.status).toBe(200);
    expect(res.body.entry).toBeDefined();
    expect(typeof res.body.entry.date).toBe("string");
    expect(res.body.entry.date.length).toBeGreaterThan(0);
  });

  it("uses the caller-supplied date when one is given", async () => {
    const uid = await createTestUser("journal-with-date");

    const res = await apiPost("/api/journal", uid, {
      content: "Retroactive entry.",
      date: "2020-01-01",
    });

    expect(res.status).toBe(200);
    expect(res.body.entry.date).toBe("2020-01-01");
  });
});
