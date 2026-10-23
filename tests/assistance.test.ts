import { afterEach, describe, expect, it } from "vitest";
import {
  assistanceRoute,
  newAssistanceCase,
  updateAssistanceCase,
  assistanceCaseSchema,
  assistanceNext,
  assistanceBarrierAdvice,
  assistanceSheet,
} from "../lib/assistance";
import {
  initialWorkspace,
  migrateWorkspace,
  updateWorkspace,
  workspaceSchema,
} from "../lib/workspace";
import { loadWorkspace, saveWorkspace, deleteWorkspace } from "../lib/store";
import { evaluatePlan } from "../lib/planner";
import { preparationPacket } from "../lib/packet";
const at = "2026-10-23T19:00:00.000Z",
  today = "2026-10-23";
afterEach(async () => {
  await deleteWorkspace();
});
const start = () => newAssistanceCase("application", "county", at);
describe("real contact and administrative follow-through", () => {
  it("tracks only user-confirmed requested categories, rejects unrequested preparation and clears corrected items", () => {
    expect(() =>
      updateAssistanceCase(
        start(),
        { type: "paper-request", id: "income", value: true },
        at,
      ),
    ).toThrow();
    let c = updateAssistanceCase(
      start(),
      { type: "contact", channel: "phone", outcome: "spoke" },
      at,
    );
    c = updateAssistanceCase(c, { type: "instruction", value: "gather" }, at);
    c = updateAssistanceCase(c, { type: "confirm", value: true }, at);
    expect(() =>
      updateAssistanceCase(
        c,
        { type: "paper-ready", id: "income", value: true },
        at,
      ),
    ).toThrow();
    c = updateAssistanceCase(
      c,
      { type: "paper-request", id: "income", value: true },
      at,
    );
    expect(assistanceNext(c, today).title).toBe(
      "Prepare the remaining requested paperwork",
    );
    c = updateAssistanceCase(c, { type: "resolve", value: true }, at);
    expect(assistanceNext(c, today).title).toBe(
      "Prepare the remaining requested paperwork",
    );
    c = updateAssistanceCase(
      c,
      { type: "paper-ready", id: "income", value: true },
      at,
    );
    expect(assistanceSheet(c, today)).toContain("[x] Income paperwork");
    c = updateAssistanceCase(
      c,
      { type: "paper-request", id: "income", value: false },
      at,
    );
    expect(c.preparedPapers).toEqual([]);
    expect(() =>
      assistanceCaseSchema.parse({ ...c, preparedPapers: ["identity"] }),
    ).toThrow();
  });
  it("keeps an entered response date visible after a help question is marked resolved", () => {
    let c = updateAssistanceCase(
      start(),
      { type: "contact", channel: "phone", outcome: "spoke" },
      at,
    );
    c = updateAssistanceCase(c, { type: "instruction", value: "wait" }, at);
    c = updateAssistanceCase(c, { type: "confirm", value: true }, at);
    c = updateAssistanceCase(c, { type: "resolve", value: true }, at);
    c = updateAssistanceCase(
      c,
      { type: "date", kind: "response", value: today },
      at,
    );
    expect(assistanceNext(c, today).title).toBe(
      "Check the response date you saved",
    );
  });
  it("routes an urgent housing need, a legal notice and a veteran inquiry to their sourced contacts", () => {
    expect(assistanceRoute("urgent", "county").contact.phone).toBe("211");
    expect(assistanceRoute("notice", "county").contact.phone).toBe(
      "1-877-534-2524",
    );
    expect(assistanceRoute("veteran", "city").contact.phone).toBe(
      "877-424-3838",
    );
  });
  it("distinguishes the City and County and does not guess an agency for unknown cases", () => {
    expect(assistanceRoute("application", "city").contact.phone).toBe(
      "619-231-9400",
    );
    expect(assistanceRoute("application", "county").contact.phone).toBe(
      "858-694-4801",
    );
    expect(assistanceRoute("paperwork", "unknown").contact.phone).toBe("211");
    expect(assistanceRoute("application", "unknown").script).toContain(
      "not sure which organization",
    );
  });
  it("keeps new help plans uncontacted and does not claim approval or mark preparation complete", () => {
    const state = updateWorkspace(
      initialWorkspace(),
      { type: "assistance-open", goal: "paperwork", agency: "county" },
      at,
    );
    expect(state.assistanceCases[0].attempts).toEqual([]);
    expect(assistanceNext(state.assistanceCases[0], today).title).toContain(
      "Contact",
    );
    expect(evaluatePlan(state).readiness).toBe(0);
    expect(state.officialPlans).toEqual([]);
  });
  it("an unanswered call or unanswered message cannot confirm instructions or resolve a question", () => {
    for (const outcome of ["no-answer", "message"] as const) {
      let c = updateAssistanceCase(
        start(),
        { type: "contact", outcome, channel: "phone" },
        at,
      );
      c = updateAssistanceCase(c, { type: "instruction", value: "gather" }, at);
      expect(() =>
        updateAssistanceCase(c, { type: "confirm", value: true }, at),
      ).toThrow();
      expect(() =>
        updateAssistanceCase(c, { type: "resolve", value: true }, at),
      ).toThrow();
      expect(assistanceNext(c, today).title).toBe("You still need a reply");
    }
  });
  it("requires a specific reported next step after contact and reopens instructions after a new attempt", () => {
    let c = updateAssistanceCase(
      start(),
      { type: "contact", outcome: "spoke", channel: "phone" },
      at,
    );
    expect(() =>
      updateAssistanceCase(c, { type: "confirm", value: true }, at),
    ).toThrow();
    c = updateAssistanceCase(c, { type: "instruction", value: "gather" }, at);
    c = updateAssistanceCase(c, { type: "confirm", value: true }, at);
    c = updateAssistanceCase(c, { type: "resolve", value: true }, at);
    expect(c.resolved).toBe(true);
    c = updateAssistanceCase(
      c,
      { type: "contact", outcome: "no-answer", channel: "website" },
      at,
    );
    expect(c.resolved).toBe(false);
    expect(c.instructionsConfirmed).toBe(false);
  });
  it("treats a referral as an unconfirmed handoff until the user confirms it", () => {
    let c = updateAssistanceCase(
      start(),
      { type: "contact", outcome: "referred", channel: "phone" },
      at,
    );
    expect(c.resolved).toBe(false);
    expect(assistanceNext(c, today).title).toBe("Make the referral usable");
    c = updateAssistanceCase(c, { type: "confirm", value: true }, at);
    expect(assistanceNext(c, today).title).toContain(
      "Contact the organization",
    );
  });
  it("tracks a user-reported submission separately from agency acceptance", () => {
    const c = updateAssistanceCase(
      start(),
      { type: "contact", outcome: "sent", channel: "website" },
      at,
    );
    expect(c.instruction).toBe("wait");
    expect(c.resolved).toBe(false);
    expect(assistanceSheet(c, today)).toContain("NOT VERIFIED BY BRIDGEBACK");
    expect(assistanceSheet(c, today)).toContain(
      "No application was sent by BridgeBack",
    );
  });
  it("prioritizes a user-entered response date over a follow-up date without calculating a legal deadline", () => {
    let c = updateAssistanceCase(
      start(),
      { type: "date", kind: "response", value: today },
      at,
    );
    c = updateAssistanceCase(
      c,
      { type: "date", kind: "followup", value: "2026-10-22" },
      at,
    );
    expect(assistanceNext(c, today).title).toBe(
      "Check the response date you saved",
    );
    expect(assistanceNext(c, today).detail).toContain(
      "not a deadline verified",
    );
    c = updateAssistanceCase(
      c,
      { type: "date", kind: "response", value: "" },
      at,
    );
    expect(assistanceNext(c, today).title).toBe(
      "Follow up on your saved reminder",
    );
  });
  it("rejects invalid calendar dates, keys, unknown outcomes, wrong types and invented changes", () => {
    for (const value of ["2026-02-29", "2026-11-31", "tomorrow"])
      expect(() =>
        updateAssistanceCase(
          start(),
          { type: "date", kind: "response", value },
          at,
        ),
      ).toThrow();
    expect(() =>
      assistanceCaseSchema.parse({ ...start(), key: "application:city" }),
    ).toThrow();
    expect(() =>
      updateAssistanceCase(
        start(),
        { type: "contact", outcome: "approved", channel: "phone" } as never,
        at,
      ),
    ).toThrow();
    expect(() =>
      updateAssistanceCase(
        start(),
        { type: "unknown", value: true } as never,
        at,
      ),
    ).toThrow();
    expect(() =>
      updateAssistanceCase(
        start(),
        { type: "date", kind: "agency", value: today } as never,
        at,
      ),
    ).toThrow();
  });
  it("bounds contact history to twelve actual recorded attempts", () => {
    let c = start();
    for (let i = 0; i < 15; i++)
      c = updateAssistanceCase(
        c,
        { type: "contact", outcome: "message", channel: "phone" },
        `2026-10-23T19:${String(i).padStart(2, "0")}:00.000Z`,
      );
    expect(c.attempts).toHaveLength(12);
    expect(c.attempts[0].at).toBe("2026-10-23T19:03:00.000Z");
    expect(c.attempts.at(-1)!.at).toBe("2026-10-23T19:14:00.000Z");
  });
  it("keeps agency cases separate and reuses a saved case without erasing its history", () => {
    let s = initialWorkspace();
    for (const agency of ["county", "city"] as const)
      s = updateWorkspace(
        s,
        { type: "assistance-open", goal: "application", agency },
        at,
      );
    s = updateWorkspace(
      s,
      {
        type: "assistance-change",
        key: "application:county",
        change: { type: "contact", outcome: "no-answer", channel: "phone" },
      },
      at,
    );
    const again = updateWorkspace(
      s,
      { type: "assistance-open", goal: "application", agency: "county" },
      at,
    );
    expect(again.assistanceCases).toHaveLength(2);
    expect(
      again.assistanceCases.find((c) => c.agency === "city")!.attempts,
    ).toHaveLength(0);
    expect(
      again.assistanceCases.find((c) => c.agency === "county")!.attempts,
    ).toHaveLength(1);
    expect(() =>
      workspaceSchema.parse({
        ...again,
        assistanceCases: [again.assistanceCases[0], again.assistanceCases[0]],
      }),
    ).toThrow();
  });
  it("preserves v3 real plans and profile on migration to v4 without writing over the input", () => {
    const current = updateWorkspace(
      initialWorkspace(),
      { type: "official-plan", id: "county-public", selected: true },
      at,
    );
    const old = {
      ...current,
      schemaVersion: 3,
      profile: { ...current.profile, household: 2 },
    };
    delete (old as { assistanceCases?: unknown }).assistanceCases;
    const migrated = migrateWorkspace(old);
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.assistanceCases).toEqual([]);
    expect(migrated.officialPlans).toEqual(old.officialPlans);
    expect(migrated.profile.household).toBe(2);
    expect(old.schemaVersion).toBe(3);
  });
  it("persists, exports and deletes contact plans using the existing local workspace", async () => {
    let s = updateWorkspace(
      initialWorkspace(),
      { type: "assistance-open", goal: "notice", agency: "unknown" },
      at,
    );
    s = updateWorkspace(
      s,
      {
        type: "assistance-change",
        key: "notice:unknown",
        change: { type: "date", kind: "response", value: today },
      },
      at,
    );
    await saveWorkspace(s);
    expect((await loadWorkspace())!.assistanceCases).toEqual(s.assistanceCases);
    const packet = preparationPacket(s, evaluatePlan(s), new Date(at));
    expect(packet).toContain("MY CONTACT AND FOLLOW-UP SHEET");
    expect(packet).toContain("not verified: 2026-10-23");
    expect(packet).not.toContain(
      "FICTIONAL PRACTICE PLANS. Not an application",
    );
    await deleteWorkspace();
    expect(await loadWorkspace()).toBeNull();
  });
  it("never changes official or practice readiness through contact logging or help resolution", () => {
    let s = updateWorkspace(
      initialWorkspace(),
      { type: "official-plan", id: "county-hcv", selected: true },
      at,
    );
    s = updateWorkspace(
      s,
      { type: "program", id: "fresh", selected: true },
      at,
    );
    const before = evaluatePlan(s);
    s = updateWorkspace(
      s,
      { type: "assistance-open", goal: "application", agency: "county" },
      at,
    );
    for (const change of [
      { type: "contact", channel: "phone", outcome: "spoke" },
      { type: "instruction", value: "gather" },
      { type: "confirm", value: true },
      { type: "resolve", value: true },
    ] as const)
      s = updateWorkspace(
        s,
        { type: "assistance-change", key: "application:county", change },
        at,
      );
    expect(evaluatePlan(s).readiness).toBe(before.readiness);
    expect(s.officialPlans[0].completed).toEqual([]);
  });
  it("provides the County's sourced assisted route without inventing a document substitute", () => {
    const c = updateAssistanceCase(
      start(),
      { type: "barrier", value: "technology" },
      at,
    );
    expect(assistanceBarrierAdvice(c)).toContain("mail, fax and in-person");
    expect(
      assistanceBarrierAdvice(
        updateAssistanceCase(c, { type: "barrier", value: "documents" }, at),
      ),
    ).toContain("Which alternatives do you accept");
  });
});
