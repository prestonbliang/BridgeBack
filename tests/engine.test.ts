import { describe, it, expect } from "vitest";
import {
  DependencyEngine,
  analyze,
  topologicalSort,
  screen,
  Requirement,
  profileSchema,
} from "../lib/engine";
import { requirements, demos, blankProfile } from "../lib/data";
import { saveState, loadState, db, stateSchema } from "../lib/store";
describe("dependency engine", () => {
  it("orders all prerequisites before consumers", () => {
    const order = topologicalSort(requirements);
    for (const n of requirements)
      for (const id of [...n.all, ...n.any])
        expect(order.indexOf(id)).toBeLessThan(order.indexOf(n.id));
  });
  it("detects cycles, duplicate ids and dangling edges", () => {
    const node = (id: string, all: string[]): Requirement => ({
      id,
      name: id,
      description: "",
      type: "task",
      all,
      any: [],
      source: "fixture",
    });
    expect(() => topologicalSort([node("a", ["b"]), node("b", ["a"])])).toThrow(
      "Cyclic",
    );
    expect(() => topologicalSort([node("a", ["missing"])])).toThrow("Unknown");
    expect(() => topologicalSort([node("a", []), node("a", [])])).toThrow(
      "Duplicate",
    );
  });
  it("accepts either income route without requiring both", () => {
    for (const alternative of ["paystub", "letter"]) {
      const a = analyze(requirements, ["identity", alternative]);
      expect(a.statuses.income).toBe("complete");
      expect(a.statuses.form).toBe("available");
    }
  });
  it("enforces AND gates even when downstream completion was saved", () => {
    const a = analyze(requirements, ["form", "review", "ready"]);
    expect(a.statuses.form).toBe("blocked");
    expect(a.readiness).toBe(0);
    expect(a.blockers("form")).toEqual(["identity", "income"]);
  });
  it("ranks useful actionable tasks deterministically", () => {
    const a = analyze(requirements, demos[0].completed);
    expect(a.actions[0].node.id).toBe("paystub");
    expect(a.actions[0].unlocks).toBe(4);
    expect(a.actions.every((x) => a.statuses[x.node.id] === "available")).toBe(
      true,
    );
  });
  it("recalculates readiness and reverses dependents when an upstream task reopens", () => {
    const done = ["identity", "paystub", "household", "form", "review"];
    expect(analyze(requirements, done).readiness).toBe(100);
    const reopened = analyze(
      requirements,
      done.filter((x) => x !== "paystub"),
    );
    expect(reopened.statuses.review).toBe("blocked");
    expect(reopened.readiness).toBeLessThan(100);
  });
  it("prioritizes verified near-term deadlines and user difficulty", () => {
    const fixture: Requirement[] = ["a", "b"].map((id) => ({
      id,
      name: id,
      description: "",
      type: "task",
      all: [],
      any: [],
      source: "test",
      difficulty: id === "a" ? 3 : 1,
    }));
    expect(analyze(fixture, []).actions[0].node.id).toBe("b");
    fixture[0].deadline = "2026-10-23";
    expect(
      analyze(fixture, [], Date.parse("2026-10-22")).actions[0].node.id,
    ).toBe("a");
  });
});
describe("transparent fictional screening", () => {
  it("handles exact income boundaries and household adjustments", () => {
    expect(screen({ ...demos[0].profile, income: 56000 }).result).toBe(
      "Potentially eligible",
    );
    expect(screen({ ...demos[0].profile, income: 56001 }).result).toBe(
      "Likely ineligible",
    );
  });
  it("preserves uncertainty for missing data", () => {
    expect(screen(blankProfile).result).toBe("More information needed");
  });
  it("explains geographic failure despite missing income", () => {
    const r = screen({ ...blankProfile, location: "Other" });
    expect(r.result).toBe("Likely ineligible");
    expect(r.reasons[0]).toContain("San Diego");
  });
  it("rejects invalid and out-of-range data", () => {
    expect(() =>
      profileSchema.parse({ ...blankProfile, household: 0 }),
    ).toThrow();
    expect(() =>
      profileSchema.parse({ ...blankProfile, income: -1 }),
    ).toThrow();
    expect(() => stateSchema.parse({})).toThrow();
  });
});
it("persists validated progress through IndexedDB and deletes it", async () => {
  await saveState({
    id: "current",
    profile: blankProfile,
    completed: ["identity"],
    active: true,
    demo: true,
    theme: "light",
    expires: {},
    difficulty: {},
    history: [],
  });
  expect((await loadState())?.completed).toEqual(["identity"]);
  await db.state.clear();
  expect(await loadState()).toBeNull();
});

it("incremental recalculation matches full evaluation while preserving unaffected branches", () => {
  const engine = new DependencyEngine(requirements);
  engine.update([]);
  const result = engine.update(["identity"]);
  expect(result.statuses).toEqual(analyze(requirements, ["identity"]).statuses);
  expect(result.recalculated).toBe(4);
  const alternative = engine.update(["identity", "letter"]);
  expect(alternative.statuses).toEqual(
    analyze(requirements, ["identity", "letter"]).statuses,
  );
  expect(alternative.actions.some((a) => a.node.id === "paystub")).toBe(false);
});

it("surfaces corrupted persisted profile data instead of trusting it", async () => {
  await db.state.put({
    id: "current",
    profile: { ...blankProfile, household: 0 },
    completed: [],
    active: false,
    demo: false,
    theme: "light",
    expires: {},
    difficulty: {},
    history: [],
  });
  await expect(loadState()).rejects.toThrow();
  await db.state.clear();
});
