import {
  type PlannerInput,
  type PlanAnalysis,
  findRescueRoute,
} from "./planner";
import {
  analyzeOfficialPlan,
  officialPreferenceProof,
  type OfficialPlan,
} from "./official-plans";
import { officialSource } from "./official-catalog";
import { programs, documentTypes } from "./programs";
import { type SupportRecord } from "./support-model";
import { providerQuestionSheet, supportTargetName } from "./support";
import {
  assistanceSheet,
  localCalendarDate,
  type AssistanceCase,
} from "./assistance";
export function preparationPacket(
  input: PlannerInput & {
    supportRecords?: SupportRecord[];
    officialPlans?: OfficialPlan[];
    assistanceCases?: AssistanceCase[];
  },
  analysis: PlanAnalysis,
  now = new Date(),
): string {
  const lines = [
    "BRIDGEBACK — PREPARATION PACKET",
    `Created: ${now.toISOString()}`,
    input.officialPlans?.length || input.assistanceCases?.length
      ? "REAL-PROGRAM FOLLOW-UP AND SEPARATELY LABELED FICTIONAL PRACTICE. Not an application, eligibility decision or housing offer."
      : "FICTIONAL PRACTICE PLANS. Not an application, eligibility determination or housing offer.",
    "No current housing availability or verified agency deadlines are asserted. Any personal dates are entered by the user. Confirm real requirements with an official provider.",
    "",
    ...(analysis.total
      ? [
          `Practice preparation: ${analysis.complete}/${analysis.total} milestones (${analysis.readiness}%)`,
        ]
      : input.officialPlans?.length || input.assistanceCases?.length
        ? [
            `Real-program follow-up plans: ${input.officialPlans?.length ?? 0}. Contact plans: ${input.assistanceCases?.length ?? 0}. Each plan is shown separately below.`,
          ]
        : ["No preparation plans selected."]),
  ];
  for (const contactPlan of input.assistanceCases ?? [])
    lines.push("", assistanceSheet(contactPlan, localCalendarDate(now)));
  for (const plan of input.officialPlans ?? []) {
    const real = analyzeOfficialPlan(plan);
    lines.push(
      "",
      "REAL PROGRAM — PERSONAL FOLLOW-UP",
      real.program.name,
      `Route: ${plan.role === "existing" ? "Already on the County waiting list" : "New inquiry / referral"}`,
      `Follow-up milestones: ${real.complete}/${real.total} (${real.progress}%). Not application readiness or agency acceptance.`,
      `Saved access guidance: ${real.program.availability.detail}`,
      "Content reviewed October 23, 2026; confirm current instructions directly.",
      `Official instructions: ${officialSource(real.program.availability.sourceId).url}`,
      `Next: ${real.next?.name ?? "Confirm the result with the provider"}`,
      real.program.documentNote,
    );
    if (plan.programId === "county-public") {
      const proof = officialPreferenceProof(plan);
      lines.push(
        "OPTIONAL WORKING-PREFERENCE EVIDENCE (NOT BASIC ELIGIBILITY)",
        "Recent paystub(s) OR employer statement; the County confirms whether this preference and the records apply.",
        `Recent paystub(s): ${plan.documents["recent-paystubs"] ? "marked available" : "not marked available"}`,
        `Employer statement: ${plan.documents["employer-statement"] ? "marked available" : "not marked available"}`,
        `One listed option marked available: ${proof.satisfied ? "yes" : "no"}. Not agency verification or admission.`,
        `Source: ${officialSource(proof.sourceId).url}, page 7-23. Confirm current acceptance; no other substitute is inferred.`,
      );
    }
    for (const task of real.nodes.filter((n) => n.type === "task"))
      lines.push(
        `[${real.statuses[task.id] === "complete" ? "x" : " "}] ${task.name} — ${real.statuses[task.id]}`,
        task.description,
        `Source: ${officialSource(task.source).url}`,
      );
  }
  if (analysis.programs.length)
    lines.push("", "FICTIONAL PRACTICE PLANS — NOT REAL PROGRAM RULES");
  if (analysis.actions[0])
    lines.push(
      `NEXT ACTION: ${analysis.actions[0].name}`,
      analysis.actions[0].explanation.summary,
      ...analysis.actions[0].explanation.facts,
    );
  for (const progress of analysis.programs) {
    const p = programs.find((p) => p.id === progress.id)!;
    lines.push(
      "",
      p.name.toUpperCase(),
      `Preparation: ${progress.complete}/${progress.total} · ${progress.readiness}%`,
      `Screening: ${progress.screening.result}`,
      ...progress.screening.reasons,
      `Source: ${p.source.label}`,
    );
    for (const rule of p.accepts)
      lines.push(
        `[${analysis.statuses[p.id + ":" + rule.id] === "complete" ? "x" : " "}] ${rule.name}: ${rule.documentIds.map((id) => documentTypes.find((d) => d.id === id)!.name).join(" OR ")}`,
      );
    for (const task of p.tasks.filter((t) => t.type === "task"))
      lines.push(
        `[${analysis.statuses[p.id + ":" + task.id] === "complete" ? "x" : " "}] ${task.name} — ${analysis.statuses[p.id + ":" + task.id]}`,
        task.description,
      );
  }
  if (analysis.programs.length) {
    lines.push("", "DOCUMENT REUSE (EXPLICIT ACCEPTANCE ONLY)");
    for (const doc of analysis.documents)
      lines.push(
        `${doc.name}: ${input.documents[doc.id] ? "available" : input.unavailable.includes(doc.id) ? "unavailable" : "not yet available"}; accepted by ${doc.programIds.map((id) => programs.find((p) => p.id === id)!.shortName).join(", ")}`,
      );
    const rescue = findRescueRoute(input);
    lines.push(
      "",
      "ROUTE RESCUE",
      rescue.explanation.summary,
      ...rescue.impossibleRequirements,
      ...rescue.documentIds.map(
        (id) => documentTypes.find((d) => d.id === id)!.name,
      ),
    );
  }
  lines.push(
    "",
    "This packet contains availability and preparation steps only. Keep actual documents secure.",
  );
  if (input.supportRecords?.length) {
    lines.push("", "SAVED HELP AND FOLLOW-UP (SEPARATE FROM READINESS)");
    for (const record of input.supportRecords)
      lines.push(
        "",
        `Help with: ${supportTargetName(record.targetId)}`,
        `Help status: ${record.status}. Contact outcome: ${record.outcome}.`,
        `Small help steps reviewed: ${record.checked.length}/4; this is not document completion.`,
        providerQuestionSheet(
          supportTargetName(record.targetId),
          record.reason,
          record,
        ),
      );
  }
  return lines.join("\n");
}
