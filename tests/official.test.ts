import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  officialCatalog,
  officialCatalogSchema,
  officialSource,
} from "../lib/official-catalog";
import { screenOfficialProgram } from "../lib/official-screening";
import {
  analyzeOfficialPlan,
  officialPlanSchema,
  officialPreferenceProof,
  updateOfficialStep,
} from "../lib/official-plans";
import {
  checkOfficialSource,
  compareOfficialContent,
} from "../lib/official-source-check";
import { freshSourceReport, sourceReportSchema } from "../lib/official-status";
import {
  initialWorkspace,
  migrateWorkspace,
  updateWorkspace,
} from "../lib/workspace";
import { deleteWorkspace, loadWorkspace, saveWorkspace } from "../lib/store";
import { preparationPacket } from "../lib/packet";
import { evaluatePlan } from "../lib/planner";
const at = "2026-10-23T17:00:00.000Z",
  now = Date.parse(at);
const program = officialCatalog.programs.find((p) => p.id === "county-public")!;
const profile = {
  ...initialWorkspace().profile,
  household: 2,
  income: 70000,
  municipality: "Chula Vista" as const,
};
const newPlan = () =>
  officialPlanSchema.parse({
    programId: "county-public",
    role: "existing",
    completed: [],
    updatedAt: at,
  });
afterEach(async () => {
  await deleteWorkspace();
});
describe("real-program provenance and screening", () => {
  it("rejects unapproved URLs, missing sources and duplicate identities", () => {
    const duplicate = structuredClone(officialCatalog);
    duplicate.programs.push(duplicate.programs[0]);
    expect(() => officialCatalogSchema.parse(duplicate)).toThrow();
    const missing = structuredClone(officialCatalog);
    missing.programs[0].sourceIds.push("invented");
    expect(() => officialCatalogSchema.parse(missing)).toThrow();
    const external = structuredClone(officialCatalog);
    external.sources[0].url = "https://example.com/";
    expect(() => officialCatalogSchema.parse(external)).toThrow();
  });
  it("uses actual household table boundaries without turning conflicting 50/80% rules into eligibility", () => {
    const exact = screenOfficialProgram(program, profile, now);
    expect(exact.limit).toBe(70000);
    expect(exact.result).toBe("More information needed");
    expect(exact.reasons.join(" ")).toContain("at or below both figures");
    const above = screenOfficialProgram(
      program,
      { ...profile, income: 70001 },
      now,
    );
    expect(above.reasons.join(" ")).toContain(
      "above the 50% figure and at or below the 80% figure",
    );
    expect(above.result).toBe("More information needed");
    const eight = screenOfficialProgram(
      program,
      { ...profile, household: 8, income: 115450 },
      now,
    );
    expect(eight.limit).toBe(115450);
  });
  it("does not fabricate larger-household limits or disqualify missing/outside-jurisdiction answers", () => {
    expect(
      screenOfficialProgram(program, { ...profile, household: 9 }, now).limit,
    ).toBeNull();
    expect(
      screenOfficialProgram(program, initialWorkspace().profile, now).result,
    ).toBe("More information needed");
    const outside = screenOfficialProgram(
      program,
      { ...profile, municipality: "City of San Diego" },
      now,
    );
    expect(outside.result).toBe("More information needed");
    expect(outside.reasons.join(" ")).toContain(
      "does not automatically mean you are ineligible",
    );
  });
  it("pauses comparisons after a source change or review expiry and never extrapolates HCV rules", () => {
    expect(
      screenOfficialProgram(program, profile, now, ["county-income"])
        .reasons[0],
    ).toContain("source changed");
    expect(
      screenOfficialProgram(program, profile, now + 31 * 86400000).limit,
    ).toBeNull();
    const hcv = officialCatalog.programs.find((p) => p.id === "county-hcv")!;
    expect(
      screenOfficialProgram(hcv, { ...profile, income: 999999 }, now).result,
    ).toBe("More information needed");
  });
});
describe("real follow-up dependency plans", () => {
  it("requires one online OR assisted route and calculates five milestones without counting both options", () => {
    let p = newPlan();
    expect(analyzeOfficialPlan(p).progress).toBe(0);
    expect(() => updateOfficialStep(p, "review-contact", true, at)).toThrow(
      /prerequisite/,
    );
    p = updateOfficialStep(p, "read-status", true, at);
    expect(analyzeOfficialPlan(p).progress).toBe(20);
    p = updateOfficialStep(p, "assisted-access", true, at);
    const a = analyzeOfficialPlan(p);
    expect(a.progress).toBe(40);
    expect(a.statuses.access).toBe("complete");
    expect(a.statuses["review-contact"]).toBe("available");
    expect(a.total).toBe(5);
    expect(p.completed).not.toContain("email-access");
  });
  it("reopens dependents on correction without resurrecting prior check marks", () => {
    let p = newPlan();
    for (const id of [
      "read-status",
      "email-access",
      "review-contact",
      "review-notices",
      "next-followup",
    ] as const)
      p = updateOfficialStep(p, id, true, at);
    expect(analyzeOfficialPlan(p).progress).toBe(100);
    p = updateOfficialStep(p, "email-access", false, at);
    expect(p.completed).toEqual(["read-status", "review-notices"]);
    expect(analyzeOfficialPlan(p).statuses["review-contact"]).toBe("blocked");
    p = updateOfficialStep(p, "assisted-access", true, at);
    expect(p.completed).toEqual([
      "read-status",
      "review-notices",
      "assisted-access",
    ]);
    expect(analyzeOfficialPlan(p).progress).toBe(60);
  });
  it("keeps closed-list new-inquiry steps separate from existing-application portal guidance", () => {
    const p = { ...newPlan(), role: "new" as const };
    const a = analyzeOfficialPlan(p);
    expect(a.nodes.some((n) => n.id === "email-access")).toBe(false);
    expect(a.nodes.some((n) => n.id === "contact-helper")).toBe(true);
    expect(() =>
      officialPlanSchema.parse({ ...p, completed: ["email-access"] }),
    ).toThrow();
  });
  it("accepts either actual working-preference document without changing follow-up or fictional readiness", () => {
    const p = newPlan();
    expect(officialPreferenceProof(p).satisfied).toBe(false);
    expect(
      officialPreferenceProof({
        ...p,
        documents: { "employer-statement": true },
      }).satisfied,
    ).toBe(true);
    expect(
      officialPreferenceProof({ ...p, documents: { "recent-paystubs": true } })
        .satisfied,
    ).toBe(true);
    expect(
      analyzeOfficialPlan({ ...p, documents: { "employer-statement": true } })
        .progress,
    ).toBe(0);
    expect(() =>
      officialPlanSchema.parse({
        ...p,
        programId: "county-hcv",
        documents: { "employer-statement": true },
      }),
    ).toThrow();
  });
  it("migrates v2 safely, persists real plans/documents, separates demo state and clears with deletion", async () => {
    const old = { ...initialWorkspace(), schemaVersion: 2 };
    delete (old as { officialPlans?: unknown }).officialPlans;
    delete (old as { sourceReport?: unknown }).sourceReport;
    const migrated = migrateWorkspace(old);
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.officialPlans).toEqual([]);
    let s = updateWorkspace(
      migrated,
      { type: "official-plan", id: "county-public", selected: true },
      at,
    );
    s = updateWorkspace(
      s,
      { type: "official-role", id: "county-public", role: "existing" },
      at,
    );
    s = updateWorkspace(
      s,
      {
        type: "official-step",
        id: "county-public",
        stepId: "read-status",
        checked: true,
      },
      at,
    );
    s = updateWorkspace(
      s,
      {
        type: "official-document",
        id: "county-public",
        documentId: "employer-statement",
        available: true,
      },
      at,
    );
    await saveWorkspace(s);
    expect(
      (await loadWorkspace())?.officialPlans[0].documents["employer-statement"],
    ).toBe(true);
    expect(evaluatePlan(s).total).toBe(0);
    expect(s.documents).toEqual({});
    const packet = preparationPacket(s, evaluatePlan(s), new Date(at));
    expect(packet).toContain("REAL PROGRAM — PERSONAL FOLLOW-UP");
    expect(packet).toContain("page 7-23");
    expect(packet).toContain("Not application readiness");
    expect(packet).not.toContain("0/0 milestones");
    expect(packet).not.toContain("ROUTE RESCUE");
    const changed = updateWorkspace(
      s,
      { type: "official-role", id: "county-public", role: "new" },
      at,
    );
    expect(changed.officialPlans[0].completed).toEqual(["read-status"]);
    await deleteWorkspace();
    expect(await loadWorkspace()).toBeNull();
  });
});
describe("source change and network safeguards", () => {
  const source = officialSource("county-applications");
  const bytes = (value: string) => new TextEncoder().encode(value);
  it("recognizes reviewed facts across markup/entities but rejects changed or contradictory opening wording", () => {
    const same = `<main>${source.evidence.join(" <br> ").replace(/ /g, "&nbsp;")}</main>`;
    expect(compareOfficialContent(source, bytes(same), at).state).toBe(
      "matches-reviewed-facts",
    );
    expect(
      compareOfficialContent(
        source,
        bytes("<p>The waiting list has reopened.</p>"),
        at,
      ).state,
    ).toBe("needs-review");
    expect(
      compareOfficialContent(
        source,
        bytes(same + "<p>The waiting list is now open.</p>"),
        at,
      ).state,
    ).toBe("needs-review");
    expect(
      compareOfficialContent(
        source,
        bytes(`<script>${source.evidence.join(" ")}</script>`),
        at,
      ).state,
    ).toBe("needs-review");
  });
  it("detects changed table cells and changed PDF bytes instead of just a reachable page", () => {
    const income = officialSource("county-income");
    const table = income.evidence.join(" ");
    expect(compareOfficialContent(income, bytes(table), at).state).toBe(
      "matches-reviewed-facts",
    );
    expect(
      compareOfficialContent(
        income,
        bytes(table.replace("70,000", "70,001")),
        at,
      ).state,
    ).toBe("needs-review");
    const pdf = {
      ...officialSource("county-registration"),
      sha256: createHash("sha256").update("known pdf").digest("hex"),
    };
    expect(compareOfficialContent(pdf, bytes("known pdf"), at).state).toBe(
      "matches-reviewed-facts",
    );
    expect(compareOfficialContent(pdf, bytes("changed pdf"), at).state).toBe(
      "needs-review",
    );
  });
  it("blocks arbitrary proxy targets, bad content and oversized responses; failures confirm no availability", async () => {
    const fetcher = vi.fn();
    expect(
      (
        await checkOfficialSource(
          { ...source, url: "https://example.com" },
          fetcher,
          new Date(at),
        )
      ).state,
    ).toBe("unavailable");
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(
      new Response("not html", {
        headers: { "content-type": "application/json" },
      }),
    );
    expect(
      (await checkOfficialSource(source, fetcher, new Date(at))).state,
    ).toBe("unavailable");
    fetcher.mockResolvedValue(
      new Response("too big", {
        headers: {
          "content-type": "text/html",
          "content-length": String(3 * 1024 * 1024),
        },
      }),
    );
    expect(
      (await checkOfficialSource(source, fetcher, new Date(at))).state,
    ).toBe("unavailable");
    fetcher.mockResolvedValue(new Response("denied", { status: 403 }));
    expect(
      (await checkOfficialSource(source, fetcher, new Date(at))).state,
    ).toBe("unavailable");
    fetcher.mockResolvedValue(
      new Response(source.evidence.join(" "), {
        headers: { "content-type": "text/html" },
      }),
    );
    const matched = await checkOfficialSource(source, fetcher, new Date(at));
    expect(matched.state).toBe("matches-reviewed-facts");
    expect(matched.checkedAt).toBe(at);
    expect(fetcher.mock.calls.at(-1)?.[1]).toMatchObject({
      cache: "no-store",
      redirect: "error",
    });
  });
  it("does not call cached, future, older-catalog or offline checks fresh and rejects incomplete reports", () => {
    const report = {
      schemaVersion: 1 as const,
      catalogVersion: officialCatalog.version,
      mode: "online" as const,
      checkedAt: at,
      checks: officialCatalog.sources.map((s) => ({
        sourceId: s.id,
        checkedAt: at,
        state: "matches-reviewed-facts" as const,
        sha256: s.sha256,
        reason: "The reviewed excerpt is present.",
      })),
    };
    expect(sourceReportSchema.parse(report).checks).toHaveLength(
      officialCatalog.sources.length,
    );
    expect(freshSourceReport(report, true, now)).toBe(true);
    expect(freshSourceReport(report, false, now)).toBe(false);
    expect(freshSourceReport(report, true, now + 16 * 60000)).toBe(false);
    expect(freshSourceReport(report, true, now - 2 * 60000)).toBe(false);
    expect(
      freshSourceReport({ ...report, catalogVersion: "older" }, true, now),
    ).toBe(false);
    expect(() =>
      sourceReportSchema.parse({ ...report, checks: report.checks.slice(1) }),
    ).toThrow();
    expect(() =>
      sourceReportSchema.parse({ ...report, mode: "bundled" }),
    ).toThrow();
    expect(
      sourceReportSchema.parse({
        ...report,
        catalogVersion: "older",
        checks: report.checks.slice(1),
      }).catalogVersion,
    ).toBe("older");
  });
});
