import {
  evaluatePlan,
  findRescueRoute,
  screenProgram,
  simulatePlan,
  type PlannerInput,
} from "./planner";
import { programs } from "./programs";

/** Small, inspectable benchmark fixtures. Expected answers are authored independently of the engine. */
export const evaluationProfile = {
  household: 2,
  income: 32000,
  location: "San Diego" as const,
  need: "Rent support" as const,
};
export function evaluationInput(
  overrides: Partial<PlannerInput> = {},
): PlannerInput {
  return {
    selectedProgramIds: ["fresh", "harbor"],
    completed: ["fresh:household"],
    documents: { identity: true },
    unavailable: [],
    priority: "balanced",
    effort: {},
    preferredProgram: null,
    profile: evaluationProfile,
    ...overrides,
  };
}
export type EvaluationCase = {
  id: string;
  measure: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
};
export type EvaluationReport = {
  fixtureKind: "fictional";
  cases: EvaluationCase[];
  passed: number;
  total: number;
  measurements: Record<string, number>;
};
const canonical = (value: unknown): string => JSON.stringify(value);
export function runEvaluation(): EvaluationReport {
  const cases: EvaluationCase[] = [];
  const record = (
    id: string,
    measure: string,
    expected: unknown,
    actual: unknown,
  ) =>
    cases.push({
      id,
      measure,
      expected,
      actual,
      passed: canonical(expected) === canonical(actual),
    });
  const missingIncome = evaluationInput();
  const initial = evaluatePlan(missingIncome);
  const simulation = simulatePlan(missingIncome, "doc:paystub");
  const actual = evaluatePlan({
    ...missingIncome,
    documents: { identity: true, paystub: true },
  });
  record(
    "blocker-impact",
    "The shared pay stub lies on eight currently blocked downstream requirement paths",
    8,
    initial.barriers.find((barrier) => barrier.id === "doc:paystub")
      ?.blockedCount,
  );
  record(
    "next-action",
    "A shared pay stub ranks first under the fixture's balanced priorities",
    "doc:paystub",
    initial.actions[0]?.id,
  );
  record(
    "income-prerequisites",
    "Both sample forms are blocked without an accepted income route",
    ["blocked", "blocked"],
    [initial.statuses["fresh:form"], initial.statuses["harbor:form"]],
  );
  record(
    "starting-readiness",
    "Three of ten explicit milestones are satisfied",
    30,
    initial.readiness,
  );
  record(
    "immediate-unlocks",
    "A shared pay stub makes exactly the two forms actionable",
    ["fresh:form", "harbor:form"],
    [...simulation.newlyAvailable].sort(),
  );
  record(
    "readiness-delta",
    "The two income milestones add twenty percentage points",
    20,
    simulation.readinessDelta,
  );
  record(
    "actual-readiness",
    "Actual document preparation satisfies five of ten milestones",
    50,
    actual.readiness,
  );
  record(
    "what-if-purity",
    "Simulation leaves the caller's document inventory unchanged",
    { identity: true },
    missingIncome.documents,
  );
  record(
    "what-if-parity",
    "Simulated statuses equal statuses after the actual same change",
    simulation.after.statuses,
    actual.statuses,
  );
  const letterRoute = evaluatePlan(
    evaluationInput({ documents: { identity: true, letter: true } }),
  );
  record(
    "accepted-or",
    "Fresh Start accepts an employer letter without a pay stub",
    "available",
    letterRoute.statuses["fresh:form"],
  );
  record(
    "rejected-reuse",
    "Harbor does not accept Fresh Start's employer-letter route",
    "blocked",
    letterRoute.statuses["harbor:form"],
  );
  const missingIdentity = evaluatePlan(
    evaluationInput({ documents: { paystub: true } }),
  );
  record(
    "and-enforcement",
    "Income alone cannot bypass identity prerequisites",
    ["blocked", "blocked"],
    [
      missingIdentity.statuses["fresh:form"],
      missingIdentity.statuses["harbor:form"],
    ],
  );
  const allPrograms = evaluatePlan(
    evaluationInput({
      selectedProgramIds: ["fresh", "harbor", "keys"],
      completed: [],
      documents: {},
    }),
  );
  const shared = allPrograms.documents.filter(
    (document) => document.programIds.length > 1,
  );
  record(
    "shared-document-types",
    "Five document types have explicit acceptance in two sample programs",
    5,
    shared.length,
  );
  record(
    "paystub-coverage",
    "Pay stubs contribute to Fresh Start and Harbor only",
    ["fresh", "harbor"],
    [
      ...(allPrograms.documents.find((document) => document.id === "paystub")
        ?.programIds ?? []),
    ].sort(),
  );
  record(
    "letter-coverage",
    "Employer letters contribute to Fresh Start and Keys only",
    ["fresh", "keys"],
    [
      ...(allPrograms.documents.find((document) => document.id === "letter")
        ?.programIds ?? []),
    ].sort(),
  );
  const fresh = programs.find((program) => program.id === "fresh")!;
  record(
    "income-boundary",
    "The fictional two-person limit includes exactly $56,000",
    "Potentially eligible",
    screenProgram(fresh, { ...evaluationProfile, income: 56000 }).result,
  );
  record(
    "above-boundary",
    "One dollar above that fictional limit fails the income criterion",
    "Likely ineligible",
    screenProgram(fresh, { ...evaluationProfile, income: 56001 }).result,
  );
  record(
    "unknown-screening",
    "Missing income stays uncertain",
    "More information needed",
    screenProgram(fresh, { ...evaluationProfile, income: null }).result,
  );
  const rescued = findRescueRoute(
    evaluationInput({
      selectedProgramIds: ["fresh", "harbor", "keys"],
      documents: { identity: true, residence: true },
      completed: [],
      unavailable: ["paystub"],
    }),
  );
  record(
    "rescue-alternatives",
    "Without a pay stub, letter plus benefits cover all three income rules",
    ["benefits", "letter"],
    [...rescued.documentIds].sort(),
  );
  record(
    "rescue-feasibility",
    "The alternate route is feasible",
    true,
    rescued.feasible,
  );
  const impossible = findRescueRoute(
    evaluationInput({ unavailable: ["identity"], documents: {} }),
  );
  record(
    "mandatory-document",
    "Route Rescue never skips an unavailable mandatory identity requirement",
    false,
    impossible.feasible,
  );
  record(
    "no-fabricated-deadlines",
    "Fictional fixtures carry no verified deadline conflicts",
    0,
    allPrograms.deadlineConflicts.length,
  );
  return {
    fixtureKind: "fictional",
    cases,
    passed: cases.filter((item) => item.passed).length,
    total: cases.length,
    measurements: {
      sharedPaystubBlockedRequirements:
        initial.barriers.find((barrier) => barrier.id === "doc:paystub")
          ?.blockedCount ?? 0,
      correctlyRecommendedFirstActions:
        initial.actions[0]?.id === "doc:paystub" ? 1 : 0,
      sharedDocumentTypes: shared.length,
      newlyAvailableTasks: simulation.newlyAvailable.length,
      readinessBefore: initial.readiness,
      readinessAfter: actual.readiness,
      readinessDelta: simulation.readinessDelta,
      rescueDocumentCount: rescued.documentIds.length,
    },
  };
}
