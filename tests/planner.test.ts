import { describe, expect, it } from "vitest";
import {
  evaluatePlan,
  simulatePlan,
  findRescueRoute,
  transitionPlan,
  type PlannerInput,
} from "../lib/planner";
import { evaluationInput } from "../lib/evaluation";
import { programs } from "../lib/programs";
import { preparationPacket } from "../lib/packet";
describe("multi-program dependency decisions", () => {
  it("keeps a shared alternative actionable when another program still requires it", () => {
    const a = evaluatePlan(
      evaluationInput({ documents: { identity: true, letter: true } }),
    );
    expect(a.statuses["fresh:income"]).toBe("complete");
    expect(a.statuses["harbor:income"]).toBe("blocked");
    expect(a.actions.some((n) => n.id === "doc:paystub")).toBe(true);
  });
  it("counts actual immediate unlocks independently from downstream impacts", () => {
    const a = evaluatePlan(evaluationInput());
    const pay = a.actions.find((a) => a.id === "doc:paystub")!;
    expect(pay.unlockedIds.sort()).toEqual(["fresh:form", "harbor:form"]);
    expect(pay.downstreamCount).toBeGreaterThan(pay.unlockedIds.length);
    expect(a.barriers.find((b) => b.id === "doc:paystub")?.blockedCount).toBe(
      8,
    );
    expect(a.actions[0].id).toBe("doc:paystub");
  });
  it("does not simulate blocked or unavailable work and does not mutate inputs", () => {
    const input = evaluationInput({ unavailable: ["paystub"] });
    const snapshot = structuredClone(input);
    expect(() => simulatePlan(input, "doc:paystub")).toThrow();
    expect(() => simulatePlan(input, "harbor:form")).toThrow();
    simulatePlan(input, "doc:letter");
    expect(input).toEqual(snapshot);
  });
  it("reopens all dependent milestones when shared evidence disappears", () => {
    const input = evaluationInput({
      documents: { identity: true, paystub: true, residence: true },
      completed: [
        "fresh:household",
        "fresh:form",
        "fresh:review",
        "harbor:form",
        "harbor:review",
      ],
    });
    expect(evaluatePlan(input).readiness).toBe(100);
    const after = evaluatePlan({
      ...input,
      documents: { ...input.documents, paystub: false },
    });
    expect(after.statuses["fresh:review"]).toBe("blocked");
    expect(after.statuses["harbor:review"]).toBe("blocked");
    expect(after.readiness).toBe(40);
  });
  it("changes ranking based on reported effort without fabricating estimates", () => {
    const input = evaluationInput({
      priority: "effort",
      effort: { "doc:paystub": 5, "doc:letter": 1 },
    });
    const a = evaluatePlan(input);
    expect(a.actions[0].id).not.toBe("doc:paystub");
    expect(
      a.actions
        .find((n) => n.id === "doc:residence")
        ?.explanation.assumptions.join(" "),
    ).toContain("No effort estimate");
  });
  it("removing a plan removes its rules without deleting the shared document inventory", () => {
    const input = evaluationInput({ documents: { paystub: true } });
    const one = evaluatePlan({ ...input, selectedProgramIds: ["fresh"] });
    expect(one.nodes.some((n) => n.id.startsWith("harbor:"))).toBe(false);
    expect(input.documents.paystub).toBe(true);
    expect(one.total).toBe(5);
  });
  it("does not treat fictional deadlines as verified; verified same-day requirements conflict", () => {
    const p = programs[0],
      q = programs[1];
    const oldP = p.source,
      oldQ = q.source;
    const oldD = p.tasks[1].deadline,
      oldE = q.tasks[0].deadline;
    try {
      p.tasks[1].deadline = "2026-10-25";
      q.tasks[0].deadline = "2026-10-25";
      expect(evaluatePlan(evaluationInput()).deadlineConflicts).toEqual([]);
      p.source = {
        kind: "verified",
        label: "Test-only authoritative fixture",
        verifiedAt: "2026-10-22",
        url: "https://example.test",
      };
      q.source = p.source;
      expect(
        evaluatePlan(evaluationInput(), Date.parse("2026-10-22"))
          .deadlineConflicts,
      ).toHaveLength(1);
      const urgent = evaluatePlan(evaluationInput(), Date.parse("2026-10-22"));
      expect(
        urgent.barriers.find((barrier) => barrier.id === "doc:paystub")
          ?.deadline?.date,
      ).toBe("2026-10-25");
      expect(
        urgent.actions
          .find((action) => action.id === "doc:paystub")
          ?.explanation.facts.join(" "),
      ).toContain("Verified deadline for");
    } finally {
      p.source = oldP;
      q.source = oldQ;
      p.tasks[1].deadline = oldD;
      q.tasks[0].deadline = oldE;
    }
  });
  it("rejects invalid planning inputs independently of UI validation", () => {
    const invalidInputs: Partial<PlannerInput>[] = [
      { documents: { invented: true } },
      { completed: ["fresh:income"] },
      { selectedProgramIds: ["fresh", "fresh"] },
      { documents: { identity: true }, unavailable: ["identity"] },
      { preferredProgram: "keys" },
      { effort: { "doc:paystub": 2.5 } },
    ];
    for (const invalid of invalidInputs)
      expect(() => evaluatePlan(evaluationInput(invalid))).toThrow();
  });
  it("finds minimum document routes, respects unavailability, and handles no plans", () => {
    expect(
      findRescueRoute(
        evaluationInput({ documents: { identity: true, residence: true } }),
      ).documentIds,
    ).toEqual(["paystub"]);
    expect(
      findRescueRoute(evaluationInput({ selectedProgramIds: [] })).documentIds,
    ).toEqual([]);
    const route = findRescueRoute(
      evaluationInput({
        documents: { identity: true, residence: true },
        unavailable: ["paystub", "letter"],
      }),
    );
    expect(route.feasible).toBe(false);
    expect(route.impossibleRequirements).toContain(
      "Fresh Start: Income verification",
    );
  });
  it("explains changed recommendations and exports only real current completion flags", () => {
    const input = evaluationInput(),
      before = evaluatePlan(input),
      sim = simulatePlan(input, "doc:paystub");
    expect(transitionPlan(before, sim.after).summary).toContain(
      "recommendation changed",
    );
    const packet = preparationPacket(input, before, new Date("2026-10-22"));
    expect(packet).toContain("FICTIONAL");
    expect(packet).toContain("[ ] Income verification");
    expect(packet).toContain("Employer letter");
  });
});
