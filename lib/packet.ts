import {
  type PlannerInput,
  type PlanAnalysis,
  findRescueRoute,
} from "./planner";
import { programs, documentTypes } from "./programs";
export function preparationPacket(
  input: PlannerInput,
  analysis: PlanAnalysis,
  now = new Date(),
): string {
  const lines = [
    "BRIDGEBACK — PREPARATION PACKET",
    `Created: ${now.toISOString()}`,
    "FICTIONAL PRACTICE PLANS. Not an application, eligibility determination or housing offer.",
    "No current availability or deadlines are asserted. Confirm real requirements with an official provider.",
    "",
    `Preparation: ${analysis.complete}/${analysis.total} milestones (${analysis.readiness}%)`,
  ];
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
    "",
    "This packet contains availability and preparation steps only. Keep actual documents secure.",
  );
  return lines.join("\n");
}
