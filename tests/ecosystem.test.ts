import { describe, it, expect } from "vitest";
import { apiGet, apiPost, createTestUser, emailFor } from "./helpers.ts";

describe("GET /api/ecosystem", () => {
  it("returns empty collaborators/knowledge for a fresh user, plus the model status card", async () => {
    const uid = await createTestUser("ecosystem-fresh");
    const res = await apiGet("/api/ecosystem", uid);

    expect(res.status).toBe(200);
    expect(res.body.collaborators).toEqual([]);
    expect(res.body.knowledgeBase).toEqual([]);
    expect(res.body.models[0].id).toBe("gemini-2.5-flash");
  });
});

describe("POST /api/ecosystem/collaborators", () => {
  it("requires an email", async () => {
    const uid = await createTestUser("ecosystem-collab-noemail");
    const res = await apiPost("/api/ecosystem/collaborators", uid, {});
    expect(res.status).toBe(400);
  });

  it("rejects inviting an email with no InnerVerse account", async () => {
    const uid = await createTestUser("ecosystem-collab-unknown");
    const res = await apiPost("/api/ecosystem/collaborators", uid, { email: "nobody-real@nowhere.test" });
    expect(res.status).toBe(404);
  });

  it("rejects inviting yourself", async () => {
    const uid = await createTestUser("ecosystem-collab-self");
    const res = await apiPost("/api/ecosystem/collaborators", uid, { email: emailFor(uid) });
    expect(res.status).toBe(400);
  });

  it("creates a share between two real users, and it shows up on the owner's ecosystem view", async () => {
    const owner = await createTestUser("ecosystem-owner");
    const collaborator = await createTestUser("ecosystem-collaborator");

    const invite = await apiPost("/api/ecosystem/collaborators", owner, { email: emailFor(collaborator) });
    expect(invite.status).toBe(200);

    const view = await apiGet("/api/ecosystem", owner);
    expect(view.body.collaborators.length).toBe(1);
  });
});

describe("POST /api/ecosystem/collaborators/:id/revoke", () => {
  it("does not let a different user revoke someone else's share", async () => {
    const owner = await createTestUser("ecosystem-revoke-owner");
    const collaborator = await createTestUser("ecosystem-revoke-collab");
    const attacker = await createTestUser("ecosystem-revoke-attacker");
    const invite = await apiPost("/api/ecosystem/collaborators", owner, { email: emailFor(collaborator) });

    const res = await apiPost(`/api/ecosystem/collaborators/${invite.body.share.id}/revoke`, attacker);
    expect(res.status).toBe(404);
  });

  it("lets the owner revoke their own share", async () => {
    const owner = await createTestUser("ecosystem-revoke-selfowner");
    const collaborator = await createTestUser("ecosystem-revoke-selfcollab");
    const invite = await apiPost("/api/ecosystem/collaborators", owner, { email: emailFor(collaborator) });

    const res = await apiPost(`/api/ecosystem/collaborators/${invite.body.share.id}/revoke`, owner);
    expect(res.status).toBe(200);
    expect(res.body.share.status).toBe("revoked");
  });
});

describe("POST /api/ecosystem/biomarkers", () => {
  it("requires markerName, value, and unit", async () => {
    const uid = await createTestUser("ecosystem-biomarker-missing");
    const res = await apiPost("/api/ecosystem/biomarkers", uid, { markerName: "HRV" });
    expect(res.status).toBe(400);
  });

  it("records a biomarker reading", async () => {
    const uid = await createTestUser("ecosystem-biomarker");
    const res = await apiPost("/api/ecosystem/biomarkers", uid, { markerName: "HRV", value: 55, unit: "ms" });
    expect(res.status).toBe(200);
    expect(res.body.marker.markerName).toBe("HRV");
  });
});

describe("POST /api/ecosystem/knowledge", () => {
  it("requires a title", async () => {
    const uid = await createTestUser("ecosystem-knowledge-notitle");
    const res = await apiPost("/api/ecosystem/knowledge", uid, { content: "no title" });
    expect(res.status).toBe(400);
  });

  it("creates a knowledge document that shows up on the ecosystem view", async () => {
    const uid = await createTestUser("ecosystem-knowledge");
    await apiPost("/api/ecosystem/knowledge", uid, { title: "My allergy notes", content: "No shellfish" });

    const view = await apiGet("/api/ecosystem", uid);
    expect(view.body.knowledgeBase.length).toBe(1);
    expect(view.body.knowledgeBase[0].title).toBe("My allergy notes");
  });
});
