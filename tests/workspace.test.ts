import { afterEach, describe, expect, it } from "vitest";
import {
  initialWorkspace,
  updateWorkspace,
  migrateWorkspace,
  workspaceSchema,
} from "../lib/workspace";
import {
  loadWorkspace,
  saveWorkspace,
  deleteWorkspace,
  saveState,
  openWorkspace,
  WorkspaceConflictError,
  db,
} from "../lib/store";
import { blankProfile } from "../lib/data";
const at = "2026-10-22T12:00:00.000Z";
afterEach(async () => {
  await deleteWorkspace();
});
describe("versioned local workspace", () => {
  it("migrates original progress, document status, dates, effort, theme and undated history", async () => {
    await saveState({
      id: "current",
      profile: blankProfile,
      completed: ["identity", "paystub", "form"],
      active: true,
      demo: true,
      theme: "dark",
      expires: { identity: "2028-01-01" },
      difficulty: { paystub: 3 },
      history: ["Prepared identity"],
    });
    const s = await loadWorkspace();
    expect(s?.schemaVersion).toBe(2);
    expect(s?.selectedProgramIds).toEqual(["fresh"]);
    expect(s?.completed).toEqual(["fresh:form"]);
    expect(s?.documents).toEqual({ identity: true, paystub: true });
    expect(s?.theme).toBe("dark");
    expect(s?.effort["doc:paystub"]).toBe(3);
    expect(s?.expires.identity).toBe("2028-01-01");
    expect(s?.legacyHistory).toEqual(["Prepared identity"]);
    expect(s?.events[0].type).toBe("migration");
  });
  it("does not overwrite invalid or future saved data during load", async () => {
    const raw = { ...initialWorkspace(), schemaVersion: 99 };
    await db.table("state").put(raw);
    await expect(loadWorkspace()).rejects.toThrow();
    expect(await db.table("state").get("current")).toEqual(raw);
    expect(() => migrateWorkspace({})).toThrow();
  });
  it("serializes saves and drains writes before deletion", async () => {
    const a = initialWorkspace();
    const b = updateWorkspace(
      a,
      { type: "document", id: "paystub", available: true },
      at,
    );
    await Promise.all([saveWorkspace(a), saveWorkspace(b)]);
    expect((await loadWorkspace())?.documents.paystub).toBe(true);
    const pending = saveWorkspace(b);
    await deleteWorkspace();
    await pending;
    expect(await loadWorkspace()).toBeNull();
  });
  it("rejects stale tab edits and prevents deleted personal data from being restored", async () => {
    const first = await openWorkspace();
    const second = await openWorkspace();
    const value = updateWorkspace(
      initialWorkspace(),
      { type: "document", id: "identity", available: true },
      at,
    );
    await saveWorkspace(value, first.session);
    await expect(
      saveWorkspace(initialWorkspace(), second.session),
    ).rejects.toBeInstanceOf(WorkspaceConflictError);
    expect((await loadWorkspace())?.documents.identity).toBe(true);
    const stale = await openWorkspace();
    const deleted = await deleteWorkspace(first.session);
    await expect(saveWorkspace(value, stale.session)).rejects.toBeInstanceOf(
      WorkspaceConflictError,
    );
    expect(await loadWorkspace()).toBeNull();
    const fresh = await openWorkspace();
    await saveWorkspace(initialWorkspace(), fresh.session);
    await expect(saveWorkspace(value, deleted)).rejects.toBeInstanceOf(
      WorkspaceConflictError,
    );
    expect((await loadWorkspace())?.documents).toEqual({});
  });
  it("advances one tab's revision inside the queue so quick edits remain ordered", async () => {
    const { session } = await openWorkspace();
    const first = initialWorkspace();
    const last = updateWorkspace(
      first,
      { type: "document", id: "paystub", available: true },
      at,
    );
    await Promise.all([
      saveWorkspace(first, session),
      saveWorkspace(last, session),
    ]);
    expect((await loadWorkspace())?.documents.paystub).toBe(true);
  });
  it("corrects availability including the unavailable route without retaining contradictory state", () => {
    let s = updateWorkspace(
      initialWorkspace(),
      { type: "unavailable", id: "paystub", value: true },
      at,
    );
    s = updateWorkspace(
      s,
      { type: "document", id: "paystub", available: true },
      at,
    );
    expect(s.unavailable).toEqual([]);
    const event = s.events[0];
    s = updateWorkspace(s, { type: "undo", eventId: event.id }, at);
    expect(s.documents.paystub).toBe(false);
    expect(s.unavailable).toEqual(["paystub"]);
    expect(s.events.find((e) => e.id === event.id)?.undone).toBe(true);
  });
  it("does not allow an old correction to undo a newer edit of the same target", () => {
    let s = updateWorkspace(
      initialWorkspace(),
      { type: "document", id: "identity", available: true },
      at,
    );
    const old = s.events[0].id;
    s = updateWorkspace(
      s,
      { type: "document", id: "identity", available: false },
      at,
    );
    expect(s.events.find((e) => e.id === old)?.canUndo).toBe(false);
    expect(
      updateWorkspace(s, { type: "undo", eventId: old }, at).documents.identity,
    ).toBe(false);
  });
  it("retains task progress on program removal and preserves later priority choices during correction", () => {
    let s = updateWorkspace(
      initialWorkspace(),
      { type: "program", id: "fresh", selected: true },
      at,
    );
    s = updateWorkspace(s, { type: "program", id: "keys", selected: true }, at);
    s = updateWorkspace(s, { type: "preferred", id: "fresh" }, at);
    s = updateWorkspace(
      s,
      { type: "task", id: "fresh:household", complete: true },
      at,
    );
    s = updateWorkspace(
      s,
      { type: "program", id: "fresh", selected: false },
      at,
    );
    const removed = s.events[0].id;
    s = updateWorkspace(s, { type: "preferred", id: "keys" }, at);
    s = updateWorkspace(s, { type: "undo", eventId: removed }, at);
    expect(s.completed).toContain("fresh:household");
    expect(s.preferredProgram).toBe("keys");
    expect(s.selectedProgramIds).toContain("fresh");
  });
  it("rejects unknown IDs, impossible dates, invalid onboarding and contradictory inventory", () => {
    expect(() =>
      updateWorkspace(
        initialWorkspace(),
        { type: "document", id: "fake", available: true },
        at,
      ),
    ).toThrow();
    expect(() =>
      updateWorkspace(
        initialWorkspace(),
        { type: "expiration", id: "identity", value: "2026-02-30" },
        at,
      ),
    ).toThrow();
    expect(() =>
      workspaceSchema.parse({
        ...initialWorkspace(),
        onboarding: { step: 9, done: false },
      }),
    ).toThrow();
    expect(() =>
      workspaceSchema.parse({
        ...initialWorkspace(),
        documents: { identity: true },
        unavailable: ["identity"],
      }),
    ).toThrow();
  });
  it("bounds activity history without inventing timestamps or achievements", () => {
    let s = initialWorkspace();
    for (let i = 0; i < 110; i++)
      s = updateWorkspace(
        s,
        { type: "record", eventType: "export", label: "Exported packet" },
        at,
      );
    expect(s.events).toHaveLength(100);
    expect(new Set(s.events.map((e) => e.id)).size).toBe(100);
    expect(s.events.every((e) => e.at === at)).toBe(true);
  });
});
