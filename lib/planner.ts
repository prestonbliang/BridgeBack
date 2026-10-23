import {
  profileSchema,
  topologicalSort,
  type Profile,
  type Requirement,
} from "./engine";
import {
  programs as catalog,
  documentTypes,
  type Program,
  type Source,
} from "./programs";

export type PlannerInput = {
  selectedProgramIds: string[];
  completed: string[];
  documents: Record<string, boolean>;
  unavailable: string[];
  priority: "momentum" | "effort" | "balanced";
  effort: Record<string, number>;
  preferredProgram: string | null;
  profile: Profile;
};
export type Explanation = {
  summary: string;
  facts: string[];
  missing: string[];
  assumptions: string[];
  sources: Source[];
  changesIf: string[];
};
export type Screening = {
  result:
    "Potentially eligible" | "More information needed" | "Likely ineligible";
  reasons: string[];
  explanation: Explanation;
};
export type PlanAction = {
  id: string;
  name: string;
  programIds: string[];
  downstreamCount: number;
  unlockedIds: string[];
  score: number;
  explanation: Explanation;
};
export type Barrier = {
  id: string;
  name: string;
  blockedCount: number;
  actionable: boolean;
  alternativeIds: string[];
  unlockedIds: string[];
  programIds: string[];
  effort: number | null;
  deadline: { date: string; days: number; taskName: string } | null;
  explanation: Explanation;
};
export type DocumentAnalysis = {
  id: string;
  name: string;
  programIds: string[];
  acceptance: {
    programId: string;
    requirementName: string;
    accepted: boolean;
    source: Source;
  }[];
  needed: boolean;
};
export type ProgramAnalysis = {
  id: string;
  name: string;
  complete: number;
  total: number;
  readiness: number;
  screening: Screening;
};
export type DeadlineConflict = {
  date: string;
  ids: string[];
  programIds: string[];
  explanation: string;
};
export type PlanAnalysis = {
  nodes: Requirement[];
  statuses: Record<string, "complete" | "available" | "blocked">;
  actions: PlanAction[];
  barriers: Barrier[];
  programs: ProgramAnalysis[];
  readiness: number;
  complete: number;
  total: number;
  documents: DocumentAnalysis[];
  deadlineConflicts: DeadlineConflict[];
};
export type Simulation = {
  before: PlanAnalysis;
  after: PlanAnalysis;
  newlyAvailable: string[];
  newlyComplete: string[];
  readinessDelta: number;
  actionId: string;
};
export type Transition = {
  newlyAvailable: string[];
  newlyComplete: string[];
  readinessDelta: number;
  summary: string;
};
export type RescueResult = {
  documentIds: string[];
  impossibleRequirements: string[];
  feasible: boolean;
  explanation: Explanation;
  alternativesConsidered: number;
};

type Compiled = {
  nodes: Requirement[];
  order: string[];
  byId: Map<string, Requirement>;
  consumers: Map<string, string[]>;
  selected: Program[];
};
const rawDoc = (id: string) => (id.startsWith("doc:") ? id.slice(4) : id);
const unique = <T>(values: T[]) => [...new Set(values)];
function selectedPrograms(input: PlannerInput): Program[] {
  profileSchema.parse(input.profile);
  const knownDocuments = new Set(documentTypes.map((document) => document.id));
  const knownTasks = new Set(
    catalog.flatMap((program) =>
      program.tasks
        .filter((task) => task.type !== "gate")
        .map((task) => `${program.id}:${task.id}`),
    ),
  );
  const knownEffortIds = new Set([
    ...knownTasks,
    ...documentTypes.map((document) => `doc:${document.id}`),
  ]);
  if (
    [input.selectedProgramIds, input.completed, input.unavailable].some(
      (ids) => new Set(ids).size !== ids.length,
    )
  )
    throw Error("Duplicate planning identifiers");
  if (input.selectedProgramIds.some((id) => !catalog.some((p) => p.id === id)))
    throw Error("Unknown selected program");
  if (input.completed.some((id) => !knownTasks.has(id)))
    throw Error("Unknown completed task");
  if (
    [...Object.keys(input.documents), ...input.unavailable].some(
      (id) => !knownDocuments.has(id),
    )
  )
    throw Error("Unknown document type");
  if (input.unavailable.some((id) => input.documents[id]))
    throw Error(
      "A document cannot be available and unobtainable at the same time",
    );
  if (
    input.preferredProgram !== null &&
    !input.selectedProgramIds.includes(input.preferredProgram)
  )
    throw Error("The preferred program must be selected");
  if (!["momentum", "effort", "balanced"].includes(input.priority))
    throw Error("Unknown planning priority");
  if (
    Object.entries(input.effort).some(
      ([id, value]) =>
        !knownEffortIds.has(id) ||
        !Number.isInteger(value) ||
        value < 1 ||
        value > 5,
    )
  )
    throw Error("Effort must be between 1 and 5");
  if (
    Object.values(input.documents).some((value) => typeof value !== "boolean")
  )
    throw Error("Document availability must be a boolean");
  return catalog.filter((p) => input.selectedProgramIds.includes(p.id));
}
function compile(input: PlannerInput): Compiled {
  const selected = selectedPrograms(input);
  const used = new Set(
    selected.flatMap((p) => p.accepts.flatMap((a) => a.documentIds)),
  );
  const nodes: Requirement[] = documentTypes
    .filter((d) => used.has(d.id))
    .map((d) => ({
      id: `doc:${d.id}`,
      name: d.name,
      description: d.description,
      type: "document",
      all: [],
      any: [],
      source: "Accepted only by the explicit program rules shown in Documents",
      difficulty: input.effort[`doc:${d.id}`],
    }));
  for (const program of selected) {
    for (const rule of program.accepts) {
      if (
        !rule.documentIds.length ||
        rule.documentIds.some((id) => !documentTypes.some((d) => d.id === id))
      )
        throw Error("Invalid document acceptance rule");
      nodes.push({
        id: `${program.id}:${rule.id}`,
        name: `${program.shortName}: ${rule.name}`,
        description: rule.description,
        type: "gate",
        all: [],
        any: rule.documentIds.map((id) => `doc:${id}`),
        source: program.source.label,
      });
    }
    for (const node of program.tasks)
      nodes.push({
        ...node,
        id: `${program.id}:${node.id}`,
        all: node.all.map((id) => `${program.id}:${id}`),
        any: node.any.map((id) => `${program.id}:${id}`),
        difficulty: input.effort[`${program.id}:${node.id}`] ?? node.difficulty,
        source: program.source.label,
      });
  }
  const order = topologicalSort(nodes),
    byId = new Map(nodes.map((n) => [n.id, n])),
    consumers = new Map(nodes.map((n) => [n.id, [] as string[]]));
  for (const node of nodes)
    for (const prerequisite of [...node.all, ...node.any])
      consumers.get(prerequisite)!.push(node.id);
  for (const program of selected)
    for (const id of program.milestones)
      if (!byId.has(`${program.id}:${id}`))
        throw Error("Unknown readiness milestone");
  return { nodes, order, byId, consumers, selected };
}
function evaluateStatuses(compiled: Compiled, input: PlannerInput) {
  const unavailable = new Set(input.unavailable.map(rawDoc));
  const marked = new Set(
    input.completed.filter((id) => !id.startsWith("doc:")),
  );
  for (const [id, available] of Object.entries(input.documents))
    if (available && !unavailable.has(rawDoc(id)))
      marked.add(`doc:${rawDoc(id)}`);
  const statuses: PlanAnalysis["statuses"] = {};
  for (const id of compiled.order) {
    const node = compiled.byId.get(id)!;
    if (id.startsWith("doc:") && unavailable.has(rawDoc(id))) {
      statuses[id] = "blocked";
      continue;
    }
    const prerequisites =
      node.all.every((x) => statuses[x] === "complete") &&
      (!node.any.length || node.any.some((x) => statuses[x] === "complete"));
    statuses[id] =
      prerequisites && (node.type === "gate" || marked.has(id))
        ? "complete"
        : prerequisites
          ? "available"
          : "blocked";
  }
  return statuses;
}
function downstream(compiled: Compiled, id: string): string[] {
  const found = new Set<string>(),
    pending = [...(compiled.consumers.get(id) ?? [])];
  while (pending.length) {
    const current = pending.pop()!;
    if (found.has(current)) continue;
    found.add(current);
    pending.push(...(compiled.consumers.get(current) ?? []));
  }
  return compiled.order.filter((nodeId) => found.has(nodeId));
}
function memberships(compiled: Compiled, id: string): string[] {
  if (!id.startsWith("doc:")) return [id.split(":")[0]];
  return compiled.selected
    .filter((p) => p.accepts.some((a) => a.documentIds.includes(rawDoc(id))))
    .map((p) => p.id);
}
function relevant(
  compiled: Compiled,
  id: string,
  statuses: PlanAnalysis["statuses"],
) {
  const consumers = compiled.consumers.get(id) ?? [];
  // An alternative satisfied elsewhere is still relevant to any unfinished consumer.
  return (
    !consumers.length ||
    consumers.some(
      (consumer) =>
        statuses[consumer] !== "complete" &&
        (compiled.byId.get(consumer)!.all.includes(id) ||
          !compiled.byId
            .get(consumer)!
            .any.some((other) => statuses[other] === "complete")),
    )
  );
}
function withAction(input: PlannerInput, id: string): PlannerInput {
  return id.startsWith("doc:")
    ? { ...input, documents: { ...input.documents, [rawDoc(id)]: true } }
    : { ...input, completed: unique([...input.completed, id]) };
}
function statusDelta(
  before: PlanAnalysis["statuses"],
  after: PlanAnalysis["statuses"],
) {
  return {
    newlyAvailable: Object.keys(after).filter(
      (id) => before[id] === "blocked" && after[id] === "available",
    ),
    newlyComplete: Object.keys(after).filter(
      (id) => before[id] !== "complete" && after[id] === "complete",
    ),
  };
}
function nodeSources(compiled: Compiled, id: string): Source[] {
  return memberships(compiled, id)
    .map(
      (programId) => compiled.selected.find((p) => p.id === programId)!.source,
    )
    .filter(
      (source, index, all) =>
        all.findIndex(
          (s) => s.label === source.label && s.url === source.url,
        ) === index,
    );
}
function missingPrerequisites(
  compiled: Compiled,
  id: string,
  statuses: PlanAnalysis["statuses"],
) {
  const node = compiled.byId.get(id)!;
  const missing = node.all
    .filter((x) => statuses[x] !== "complete")
    .map((x) => compiled.byId.get(x)!.name);
  if (node.any.length && !node.any.some((x) => statuses[x] === "complete"))
    missing.push(
      `One accepted alternative: ${node.any.map((x) => compiled.byId.get(x)!.name).join(" OR ")}`,
    );
  return missing;
}
function verifiedDeadline(compiled: Compiled, node: Requirement, now: number) {
  const source = compiled.selected.find((p) =>
    node.id.startsWith(`${p.id}:`),
  )?.source;
  if (!node.deadline || source?.kind !== "verified" || !source.verifiedAt)
    return null;
  const time = Date.parse(node.deadline);
  return Number.isFinite(time)
    ? { date: node.deadline, days: (time - now) / 86400000 }
    : null;
}
export function screenProgram(program: Program, profile: Profile): Screening {
  profileSchema.parse(profile);
  const reasons: string[] = [],
    missing: string[] = [];
  let failed = false;
  if (profile.location === "Unknown") missing.push("Location is unknown.");
  else if (profile.location !== program.screening.location) {
    failed = true;
    reasons.push(
      `This ${program.source.kind === "fictional" ? "fictional " : ""}program covers ${program.screening.location}; your selected location is outside that area.`,
    );
  } else
    reasons.push(
      `Your selected location matches ${program.screening.location}.`,
    );
  if (profile.household === null)
    missing.push("Household size is needed to calculate the income threshold.");
  if (profile.income === null)
    missing.push("Approximate annual household income is unknown.");
  if (profile.household !== null && profile.income !== null) {
    const ceiling =
      program.screening.incomeBase +
      (profile.household - 1) * program.screening.increment;
    failed ||= profile.income > ceiling;
    reasons.push(
      `For ${profile.household} ${profile.household === 1 ? "person" : "people"}, the ${program.source.kind === "fictional" ? "fictional " : ""}income limit is $${ceiling.toLocaleString("en-US")}; your approximate income is ${profile.income <= ceiling ? "within" : "above"} that limit.`,
    );
  }
  const result = failed
    ? "Likely ineligible"
    : missing.length
      ? "More information needed"
      : "Potentially eligible";
  return {
    result,
    reasons: [...reasons, ...missing],
    explanation: {
      summary: `${program.shortName}: ${result.toLowerCase()}.`,
      facts: reasons,
      missing,
      sources: [program.source],
      assumptions: [
        "Screening uses the information you chose to provide and is not an official eligibility decision.",
        ...(program.source.kind === "fictional"
          ? ["All criteria in this sample program are fictional."]
          : []),
      ],
      changesIf: [
        "Changing household size, income or location can change this result.",
        "Housing need is context and is not treated as a disqualifying condition.",
      ],
    },
  };
}
export function evaluatePlan(
  input: PlannerInput,
  now = Date.now(),
): PlanAnalysis {
  const compiled = compile(input),
    statuses = evaluateStatuses(compiled, input);
  // A prerequisite inherits urgency from unfinished requirements it supports.
  // Only dates with verified source provenance can affect priority.
  const routeDeadline = (node: Requirement) => {
    const dates = [node.id, ...downstream(compiled, node.id)]
      .filter((id) => statuses[id] !== "complete")
      .flatMap((id) => {
        const task = compiled.byId.get(id)!;
        const deadline = verifiedDeadline(compiled, task, now);
        return deadline ? [{ ...deadline, taskName: task.name }] : [];
      });
    const upcoming = dates
      .filter((date) => date.days >= 0)
      .sort((a, b) => a.days - b.days);
    return upcoming[0] ?? dates.sort((a, b) => b.days - a.days)[0] ?? null;
  };
  const programResults = compiled.selected.map((program) => {
    const total = program.milestones.length,
      complete = program.milestones.filter(
        (id) => statuses[`${program.id}:${id}`] === "complete",
      ).length;
    return {
      id: program.id,
      name: program.name,
      total,
      complete,
      readiness: total ? Math.round((complete / total) * 100) : 0,
      screening: screenProgram(program, input.profile),
    };
  });
  const total = programResults.reduce((sum, p) => sum + p.total, 0),
    complete = programResults.reduce((sum, p) => sum + p.complete, 0);
  const actions: PlanAction[] = compiled.nodes
    .filter(
      (node) =>
        node.type !== "gate" &&
        statuses[node.id] === "available" &&
        relevant(compiled, node.id, statuses),
    )
    .map((node) => {
      const affected = downstream(compiled, node.id).filter(
        (id) => statuses[id] !== "complete",
      );
      const after = evaluateStatuses(compiled, withAction(input, node.id));
      const unlockedIds = statusDelta(statuses, after).newlyAvailable;
      const satisfiedIds = statusDelta(statuses, after).newlyComplete.filter(
        (id) => id !== node.id,
      );
      const programIds = memberships(compiled, node.id),
        effort = input.effort[node.id] ?? node.difficulty;
      const deadline = routeDeadline(node),
        deadlinePoints =
          deadline && deadline.days >= 0 && deadline.days <= 7 ? 25 : 0;
      const progress =
        unlockedIds.length * 20 + satisfiedIds.length * 8 + affected.length * 2;
      const score =
        (input.priority === "effort"
          ? progress * 0.25
          : input.priority === "momentum"
            ? progress * 1.5
            : progress) -
        (effort ?? 0) *
          (input.priority === "effort"
            ? 12
            : input.priority === "momentum"
              ? 1
              : 3) +
        deadlinePoints +
        (input.preferredProgram && programIds.includes(input.preferredProgram)
          ? 10
          : 0);
      const facts = [
        `${unlockedIds.length} ${unlockedIds.length === 1 ? "task becomes" : "tasks become"} available immediately.`,
        `${affected.length} later, unfinished items are connected to this step. Some may also need other documents or tasks first.`,
        `${satisfiedIds.length} additional ${satisfiedIds.length === 1 ? "requirement becomes" : "requirements become"} satisfied.`,
        `Your planning preference: ${input.priority === "momentum" ? "make more steps ready to start" : input.priority === "effort" ? "start with easier tasks" : "balance progress and effort"}.`,
        ...(effort ? [`Your reported effort: ${effort} of 5.`] : []),
        ...(input.preferredProgram &&
        programIds.includes(input.preferredProgram)
          ? [
              `You prioritized ${compiled.selected.find((p) => p.id === input.preferredProgram)?.shortName ?? input.preferredProgram}.`,
            ]
          : []),
        ...(deadline
          ? [
              `Verified deadline for ${deadline.taskName}: ${deadline.date}${deadline.days < 0 ? " (passed; confirm options with the provider)" : ""}.`,
            ]
          : []),
      ];
      return {
        id: node.id,
        name: node.name,
        programIds,
        downstreamCount: affected.length,
        unlockedIds,
        score,
        explanation: {
          summary: unlockedIds.length
            ? `${node.type === "document" ? `Having your ${node.name.toLowerCase()} ready` : "Finishing this step"} lets you start ${unlockedIds.length} more ${unlockedIds.length === 1 ? "step" : "steps"}: ${unlockedIds.map((id) => compiled.byId.get(id)!.name).join("; ")}.`
            : `You can work on ${node.name.toLowerCase()} now. It helps you finish the checklist for ${programIds.map((id) => compiled.selected.find((program) => program.id === id)!.shortName).join(" and ")}.`,
          facts,
          missing: missingPrerequisites(compiled, node.id, statuses),
          sources: nodeSources(compiled, node.id),
          assumptions: [
            "We use the document status you entered. A real provider decides whether it accepts the actual document.",
            ...(!effort
              ? [
                  "No effort estimate has been supplied; no time or difficulty is invented.",
                ]
              : []),
          ],
          changesIf: [
            "Completing or reopening prerequisites recalculates available work.",
            "Changing selected programs, accepted alternatives, your effort or priority may change the recommendation.",
          ],
        },
      };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const barriers: Barrier[] = compiled.nodes
    .filter(
      (node) =>
        statuses[node.id] !== "complete" &&
        relevant(compiled, node.id, statuses) &&
        downstream(compiled, node.id).some((id) => statuses[id] === "blocked"),
    )
    .map((node) => {
      const affected = downstream(compiled, node.id).filter(
        (id) => statuses[id] === "blocked",
      );
      const action = actions.find((a) => a.id === node.id);
      const effort = input.effort[node.id] ?? node.difficulty ?? null;
      const deadline = routeDeadline(node);
      const alternatives = node.any.length
        ? node.any.filter((id) => statuses[id] !== "complete")
        : unique(
            (compiled.consumers.get(node.id) ?? []).flatMap((id) =>
              compiled.byId.get(id)!.any.includes(node.id)
                ? compiled.byId
                    .get(id)!
                    .any.filter(
                      (other) =>
                        other !== node.id && statuses[other] !== "complete",
                    )
                : [],
            ),
          );
      return {
        id: node.id,
        name: node.name,
        blockedCount: affected.length,
        actionable: !!action,
        alternativeIds: alternatives,
        unlockedIds: action?.unlockedIds ?? [],
        programIds: memberships(compiled, node.id),
        effort,
        deadline,
        explanation: {
          summary: `${node.name} is connected to ${affected.length} later ${affected.length === 1 ? "item that is" : "items that are"} waiting. This item, or an accepted alternative, needs to be ready first. Other missing items may still hold up those steps.`,
          facts: [
            `${affected.length} currently blocked downstream requirements share this dependency route.`,
            action
              ? `${action.unlockedIds.length} tasks become available if you complete this action now.`
              : "This requirement must be satisfied through its prerequisites or an accepted alternative.",
            ...(alternatives.length
              ? [
                  ...compiled.selected.flatMap((program) =>
                    program.accepts
                      .filter(
                        (rule) =>
                          node.id === `${program.id}:${rule.id}` ||
                          rule.documentIds.includes(rawDoc(node.id)),
                      )
                      .map(
                        (rule) =>
                          `${program.shortName} — ${rule.name}: ${rule.documentIds.map((id) => compiled.byId.get(`doc:${id}`)!.name).join(" OR ")}.`,
                      ),
                  ),
                ]
              : []),
            ...(effort ? [`Your reported effort: ${effort} of 5.`] : []),
            ...(deadline
              ? [
                  `Verified deadline for ${deadline.taskName}: ${deadline.date}${deadline.days < 0 ? " (passed; confirm options with the provider)" : ""}.`,
                ]
              : []),
          ],
          missing: missingPrerequisites(compiled, node.id, statuses),
          assumptions: [
            "A connection to a later step does not mean this one item is enough to finish it. Other papers or tasks may still be needed.",
            "Alternatives are program-specific; one replacement may not satisfy every plan.",
            ...(!effort ? ["No effort estimate has been supplied."] : []),
          ],
          sources: nodeSources(compiled, node.id),
          changesIf: [
            "An accepted alternative can remove a barrier without requiring every document.",
            "Removing a program can remove requirements unique to that program.",
          ],
        },
      };
    })
    .sort(
      (a, b) =>
        b.blockedCount - a.blockedCount ||
        Number(b.actionable) - Number(a.actionable) ||
        a.id.localeCompare(b.id),
    );
  const documents: DocumentAnalysis[] = documentTypes.map((document) => {
    const acceptance = compiled.selected.flatMap((program) =>
      program.accepts.map((rule) => ({
        programId: program.id,
        requirementName: rule.name,
        accepted: rule.documentIds.includes(document.id),
        source: program.source,
      })),
    );
    return {
      id: document.id,
      name: document.name,
      programIds: compiled.selected
        .filter((p) =>
          p.accepts.some((rule) => rule.documentIds.includes(document.id)),
        )
        .map((p) => p.id),
      acceptance,
      needed: compiled.selected.some((p) =>
        p.accepts.some(
          (rule) =>
            rule.documentIds.includes(document.id) &&
            statuses[`${p.id}:${rule.id}`] !== "complete",
        ),
      ),
    };
  });
  const deadlines = new Map<string, Requirement[]>();
  for (const node of compiled.nodes) {
    const deadline = verifiedDeadline(compiled, node, now);
    if (deadline && statuses[node.id] !== "complete") {
      const date = deadline.date.slice(0, 10);
      deadlines.set(date, [...(deadlines.get(date) ?? []), node]);
    }
  }
  const deadlineConflicts = [...deadlines]
    .filter(
      ([, nodes]) =>
        unique(nodes.flatMap((node) => memberships(compiled, node.id))).length >
        1,
    )
    .map(([date, nodes]) => ({
      date,
      ids: nodes.map((n) => n.id),
      programIds: unique(nodes.flatMap((n) => memberships(compiled, n.id))),
      explanation:
        "Multiple selected programs have verified requirements due on this date. Confirm scheduling with their providers.",
    }));
  return {
    nodes: compiled.nodes,
    statuses,
    actions,
    barriers,
    programs: programResults,
    readiness: total ? Math.round((complete / total) * 100) : 0,
    complete,
    total,
    documents,
    deadlineConflicts,
  };
}
export function transitionPlan(
  before: PlanAnalysis,
  after: PlanAnalysis,
): Transition {
  const delta = statusDelta(before.statuses, after.statuses),
    readinessDelta = after.readiness - before.readiness;
  const oldNext = before.actions[0],
    newNext = after.actions[0];
  const changed = oldNext?.id !== newNext?.id;
  return {
    ...delta,
    readinessDelta,
    summary: `${delta.newlyAvailable.length ? `${delta.newlyAvailable.length} more ${delta.newlyAvailable.length === 1 ? "step is" : "steps are"} ready to start.` : "Your checklist has been updated."} ${after.complete} of ${after.total} preparation steps are finished. ${changed ? (newNext ? `The recommendation changed to ${newNext.name.toLowerCase()}. ${newNext.explanation.summary}` : after.readiness === 100 ? "Your preparation steps are finished. Nothing has been submitted." : "Check Documents for missing items and listed alternatives.") : newNext ? `The suggested next step is still ${newNext.name.toLowerCase()}.` : "Check the remaining missing items before continuing."}`,
  };
}
export function simulatePlan(
  input: PlannerInput,
  actionId: string,
  now = Date.now(),
): Simulation {
  const before = evaluatePlan(input, now);
  if (!before.actions.some((action) => action.id === actionId))
    throw Error(
      "Choose an available action to simulate; blocked requirements need their prerequisites first.",
    );
  const after = evaluatePlan(withAction(input, actionId), now),
    delta = transitionPlan(before, after);
  return {
    before,
    after,
    actionId,
    newlyAvailable: delta.newlyAvailable,
    newlyComplete: delta.newlyComplete,
    readinessDelta: delta.readinessDelta,
  };
}
export function findRescueRoute(input: PlannerInput): RescueResult {
  const selected = selectedPrograms(input),
    unavailable = new Set(input.unavailable.map(rawDoc));
  const available = new Set(
    Object.entries(input.documents)
      .filter(([id, value]) => value && !unavailable.has(rawDoc(id)))
      .map(([id]) => rawDoc(id)),
  );
  const groups = selected.flatMap((program) =>
    program.accepts.map((rule) => ({
      name: `${program.shortName}: ${rule.name}`,
      documentIds: rule.documentIds,
    })),
  );
  const outstanding = groups.filter(
    (group) => !group.documentIds.some((id) => available.has(id)),
  );
  const impossibleRequirements = outstanding
    .filter((group) => !group.documentIds.some((id) => !unavailable.has(id)))
    .map((group) => group.name);
  const candidates = documentTypes
    .map((d) => d.id)
    .filter(
      (id) =>
        !available.has(id) &&
        !unavailable.has(id) &&
        outstanding.some((group) => group.documentIds.includes(id)),
    );
  // Five canonical document types keep exact subset enumeration bounded to 32 subsets.
  if (candidates.length > 16)
    throw Error("Rescue route catalog exceeds the bounded exact search size");
  let best: string[] | null = null,
    bestEffort = Infinity,
    alternativesConsidered = 0;
  if (!impossibleRequirements.length)
    for (let mask = 0; mask < 2 ** candidates.length; mask++) {
      alternativesConsidered++;
      const subset = candidates.filter((_, index) => mask & (1 << index));
      if (best && subset.length > best.length) continue;
      if (
        !outstanding.every((group) =>
          group.documentIds.some((id) => subset.includes(id)),
        )
      )
        continue;
      const effort = subset.reduce(
        (sum, id) => sum + (input.effort[`doc:${id}`] ?? 0),
        0,
      );
      if (
        !best ||
        subset.length < best.length ||
        (subset.length === best.length &&
          (effort < bestEffort ||
            (effort === bestEffort &&
              subset.join(",").localeCompare(best.join(",")) < 0)))
      ) {
        best = subset;
        bestEffort = effort;
      }
    }
  const feasible = !impossibleRequirements.length && best !== null;
  return {
    documentIds: best ?? [],
    impossibleRequirements,
    feasible,
    alternativesConsidered,
    explanation: {
      summary: feasible
        ? best!.length
          ? `You need ${best!.length} additional ${best!.length === 1 ? "document type" : "document types"} to cover the remaining document requirements in these plans. This is the shortest list we found using their stated rules.`
          : "You already have a listed document for every document requirement in these plans. Check the remaining form and review tasks next."
        : "At least one plan needs a document you cannot get, and its rules do not list a usable alternative.",
      facts: [
        `${groups.length} program-specific acceptance rules were checked.`,
        `${available.size} document types are already reported available.`,
        `${alternativesConsidered} possible combinations of documents were checked.`,
        ...(feasible
          ? [
              "Every selected program keeps its own acceptance rules; a route is reused only where explicitly accepted.",
            ]
          : []),
      ],
      missing: impossibleRequirements,
      assumptions: [
        "This finds the fewest additional document types, not a guarantee that a provider will approve them.",
        "Unavailable documents are excluded from both completed evidence and proposed routes.",
        "Remaining forms and review tasks still need to be completed.",
      ],
      sources: unique(selected.map((p) => p.source)),
      changesIf: [
        "Change document availability or select different programs to recalculate the route.",
        "If no accepted route remains, confirm alternatives directly with the provider; BridgeBack does not invent one.",
      ],
    },
  };
}
