import { afterEach, describe, expect, it } from "vitest";
import {
  annualIncomeEstimate,
  buildSupportPlan,
  providerQuestionSheet,
} from "../lib/support";
import { supportReasons, supportMicrosteps } from "../lib/support-model";
import {
  initialWorkspace,
  updateWorkspace,
  workspaceSchema,
} from "../lib/workspace";
import { evaluatePlan } from "../lib/planner";
import { evaluationInput } from "../lib/evaluation";
import { saveWorkspace, loadWorkspace, deleteWorkspace } from "../lib/store";
import { preparationPacket } from "../lib/packet";
const at = "2026-10-23T03:00:00.000Z";
function workspace() {
  return { ...initialWorkspace(), ...evaluationInput() };
}
function reviewed() {
  let state = updateWorkspace(
    workspace(),
    { type: "support-open", targetId: "doc:paystub", reason: "missing" },
    at,
  );
  for (const stepId of supportMicrosteps)
    state = updateWorkspace(
      state,
      { type: "support-check", targetId: "doc:paystub", stepId, checked: true },
      at,
    );
  return state;
}
afterEach(async () => {
  await deleteWorkspace();
});
describe("step support and actual solvency boundaries", () => {
  it("offers a small, contextual plan for every supported difficulty", () => {
    for (const reason of supportReasons) {
      const plan = buildSupportPlan(
        evaluationInput(),
        "doc:paystub",
        reason.id,
      );
      expect(plan.smallSteps.map((step) => step.id)).toEqual([
        ...supportMicrosteps,
      ]);
      expect(plan.smallSteps.every((step) => step.detail.length > 20)).toBe(
        true,
      );
    }
    const plan = buildSupportPlan(evaluationInput(), "doc:paystub", "missing");
    expect(
      plan.acceptance.map((rule) => [rule.program, rule.documentIds]),
    ).toEqual([
      ["Fresh Start", ["paystub", "letter"]],
      ["Harbor", ["paystub", "benefits"]],
    ]);
    expect(() =>
      buildSupportPlan(evaluationInput(), "invented", "missing"),
    ).toThrow();
  });
  it("keeps all microsteps, contact selection and a pending reply separate from readiness", () => {
    let state = reviewed();
    state = updateWorkspace(
      state,
      {
        type: "support-provider",
        targetId: "doc:paystub",
        providerId: "hud-84874",
      },
      at,
    );
    state = updateWorkspace(
      state,
      { type: "support-contact", targetId: "doc:paystub", outcome: "waiting" },
      at,
    );
    state = updateWorkspace(
      state,
      { type: "support-reminder", targetId: "doc:paystub", date: "2026-11-05" },
      at,
    );
    expect(state.supportRecords[0].checked).toHaveLength(4);
    expect(state.supportRecords[0].contact?.sourceUrl).toContain(
      "consumerfinance.gov",
    );
    expect(state.supportRecords[0].status).toBe("waiting");
    expect(evaluatePlan(state).readiness).toBe(30);
    expect(state.documents.paystub).toBeUndefined();
    expect(state.completed).toEqual(["fresh:household"]);
  });
  it("requires reviewed steps, a correct check answer and explicit actual readiness", () => {
    const opened = updateWorkspace(
      workspace(),
      { type: "support-open", targetId: "doc:paystub", reason: "missing" },
      at,
    );
    expect(() =>
      updateWorkspace(
        opened,
        {
          type: "support-finish",
          targetId: "doc:paystub",
          answer: "one",
          confirmed: true,
        },
        at,
      ),
    ).toThrow();
    const state = reviewed();
    expect(() =>
      updateWorkspace(
        state,
        {
          type: "support-finish",
          targetId: "doc:paystub",
          answer: "both",
          confirmed: true,
        },
        at,
      ),
    ).toThrow();
    expect(() =>
      updateWorkspace(
        state,
        {
          type: "support-finish",
          targetId: "doc:paystub",
          answer: "one",
          confirmed: false,
        },
        at,
      ),
    ).toThrow();
    const done = updateWorkspace(
      state,
      {
        type: "support-finish",
        targetId: "doc:paystub",
        answer: "one",
        confirmed: true,
      },
      at,
    );
    expect(done.documents.paystub).toBe(true);
    expect(evaluatePlan(done).readiness).toBe(50);
    expect(evaluatePlan(done).statuses["harbor:form"]).toBe("available");
    expect(done.supportRecords[0].status).toBe("resolved");
    expect(new Set(done.events.map((event) => event.id)).size).toBe(
      done.events.length,
    );
  });
  it("rechecks actual prerequisites and unavailability at completion time", () => {
    const unavailable = updateWorkspace(
      reviewed(),
      { type: "unavailable", id: "paystub", value: true },
      at,
    );
    expect(() =>
      updateWorkspace(
        unavailable,
        {
          type: "support-finish",
          targetId: "doc:paystub",
          answer: "one",
          confirmed: true,
        },
        at,
      ),
    ).toThrow("not ready");
    let state = updateWorkspace(
      workspace(),
      { type: "support-open", targetId: "fresh:form", reason: "understand" },
      at,
    );
    for (const stepId of supportMicrosteps)
      state = updateWorkspace(
        state,
        {
          type: "support-check",
          targetId: "fresh:form",
          stepId,
          checked: true,
        },
        at,
      );
    expect(() =>
      updateWorkspace(
        state,
        {
          type: "support-finish",
          targetId: "fresh:form",
          answer: "one",
          confirmed: true,
        },
        at,
      ),
    ).toThrow("not ready");
  });
  it("can resolve or reopen a help question without changing document status", () => {
    let state = updateWorkspace(
      reviewed(),
      { type: "support-status", targetId: "doc:paystub", status: "resolved" },
      at,
    );
    expect(state.supportRecords[0].status).toBe("resolved");
    expect(evaluatePlan(state).readiness).toBe(30);
    state = updateWorkspace(
      state,
      { type: "support-open", targetId: "doc:paystub", reason: "contact" },
      at,
    );
    expect(state.supportRecords[0].checked).toEqual([]);
    expect(state.supportRecords[0].status).toBe("working");
  });
  it("does not send fictional program names or personal income in provider questions", () => {
    for (const title of [
      "Prepare the Fresh Start form",
      "Harbor: Income verification",
      "Review the Keys checklist",
    ]) {
      const sheet = providerQuestionSheet(title, "rejected");
      expect(sheet).not.toMatch(/Fresh Start|Harbor|Keys|32000/);
      expect(sheet).toContain("fictional");
      expect(sheet).toContain("deadlines");
    }
    const state = reviewed();
    const packet = preparationPacket(state, evaluatePlan(state));
    expect(packet).toContain("SAVED HELP AND FOLLOW-UP");
    expect(packet).toContain("SEPARATE FROM READINESS");
  });
  it("preserves older v2 workspaces and validates invalid support records", async () => {
    const previous = workspace();
    const { supportRecords: omitted, ...old } = previous;
    void omitted;
    expect(workspaceSchema.parse(old).supportRecords).toEqual([]);
    await saveWorkspace(reviewed());
    expect((await loadWorkspace())?.supportRecords[0].checked).toHaveLength(4);
    expect(() =>
      updateWorkspace(
        reviewed(),
        {
          type: "support-reminder",
          targetId: "doc:paystub",
          date: "2026-02-30",
        },
        at,
      ),
    ).toThrow();
    expect(() =>
      updateWorkspace(
        reviewed(),
        {
          type: "support-provider",
          targetId: "doc:paystub",
          providerId: "unlisted",
        },
        at,
      ),
    ).toThrow();
    await deleteWorkspace();
    expect(await loadWorkspace()).toBeNull();
  });
});
describe("income period teaching, not eligibility rules", () => {
  it("distinguishes every two weeks from twice monthly and explains assumptions", () => {
    expect(annualIncomeEstimate(2000, "biweekly").annual).toBe(52000);
    expect(annualIncomeEstimate(2000, "semimonthly").annual).toBe(48000);
    expect(annualIncomeEstimate(2000, "monthly").annual).toBe(24000);
    expect(annualIncomeEstimate(500, "weekly").annual).toBe(26000);
    expect(annualIncomeEstimate(0, "annual").annual).toBe(0);
    expect(annualIncomeEstimate(2000, "monthly").explanation).toContain(
      "not necessarily your whole household",
    );
    expect(() => annualIncomeEstimate(NaN, "monthly")).toThrow();
    expect(() => annualIncomeEstimate(-1, "monthly")).toThrow();
  });
});

it("supports a real-world help question without choosing any fictional preparation plan", () => {
  let state = updateWorkspace(
    initialWorkspace(),
    { type: "support-open", targetId: "general", reason: "contact" },
    at,
  );
  state = updateWorkspace(
    state,
    { type: "support-provider", targetId: "general", providerId: "hud-84874" },
    at,
  );
  state = updateWorkspace(
    state,
    { type: "support-contact", targetId: "general", outcome: "waiting" },
    at,
  );
  expect(state.supportRecords[0].contact?.name).toContain("Navicore");
  expect(state.selectedProgramIds).toEqual([]);
  expect(evaluatePlan(state).total).toBe(0);
  expect(evaluatePlan(state).complete).toBe(0);
});
