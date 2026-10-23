import { z } from "zod";
import { municipalitySchema } from "./official-catalog";
export const profileSchema = z.object({
  municipality: municipalitySchema.optional(),
  household: z.number().int().min(1).max(20).nullable(),
  income: z.number().min(0).max(1000000).nullable(),
  location: z.enum(["San Diego", "Other", "Unknown"]),
  need: z.enum(["Rent support", "Housing search", "At risk"]),
});
export type Profile = z.infer<typeof profileSchema>;
export type Requirement = {
  id: string;
  name: string;
  description: string;
  type: "document" | "task" | "gate";
  all: string[];
  any: string[];
  source: string;
  deadline?: string;
  difficulty?: number;
};
export function topologicalSort(nodes: Requirement[]): string[] {
  const map = new Map(nodes.map((n) => [n.id, n]));
  if (map.size !== nodes.length) throw Error("Duplicate requirement");
  const visiting = new Set<string>(),
    done = new Set<string>(),
    order: string[] = [];
  function visit(id: string) {
    if (visiting.has(id)) throw Error("Cyclic dependency");
    if (done.has(id)) return;
    const n = map.get(id);
    if (!n) throw Error("Unknown prerequisite: " + id);
    visiting.add(id);
    [...n.all, ...n.any].forEach(visit);
    visiting.delete(id);
    done.add(id);
    order.push(id);
  }
  nodes.forEach((n) => visit(n.id));
  return order;
}
export function analyze(
  nodes: Requirement[],
  completed: string[],
  now = Date.now(),
  reuse?: {
    statuses: Record<string, "complete" | "available" | "blocked">;
    affected: Set<string>;
  },
) {
  const order = topologicalSort(nodes),
    map = new Map(nodes.map((n) => [n.id, n])),
    satisfied = new Set<string>(),
    statuses: Record<string, "complete" | "available" | "blocked"> = {};
  for (const id of order) {
    if (reuse && !reuse.affected.has(id)) {
      statuses[id] = reuse.statuses[id];
      if (statuses[id] === "complete") satisfied.add(id);
      continue;
    }
    const n = map.get(id)!;
    const ready =
      n.all.every((x) => satisfied.has(x)) &&
      (!n.any.length || n.any.some((x) => satisfied.has(x)));
    if (ready && (n.type === "gate" || completed.includes(id))) {
      satisfied.add(id);
      statuses[id] = "complete";
    } else statuses[id] = ready ? "available" : "blocked";
  }
  const blockers = (id: string): string[] => {
    const n = map.get(id)!;
    return [
      ...n.all.filter((x) => !satisfied.has(x)),
      ...(!n.any.some((x) => satisfied.has(x)) ? n.any : []),
    ];
  };
  const descendants = (id: string) => {
    const found = new Set<string>();
    function walk(x: string) {
      nodes
        .filter((n) => [...n.all, ...n.any].includes(x))
        .forEach((n) => {
          if (!found.has(n.id)) {
            found.add(n.id);
            walk(n.id);
          }
        });
    }
    walk(id);
    return found.size;
  };
  const actions = nodes
    .filter(
      (n) =>
        statuses[n.id] === "available" &&
        n.type !== "gate" &&
        (!nodes.some((g) => [...g.all, ...g.any].includes(n.id)) ||
          nodes.some(
            (g) =>
              [...g.all, ...g.any].includes(n.id) &&
              !satisfied.has(g.id) &&
              (g.all.includes(n.id) || !g.any.some((id) => satisfied.has(id))),
          )),
    )
    .map((n) => {
      const unlocks = descendants(n.id);
      const days = n.deadline
        ? (Date.parse(n.deadline) - now) / 86400000
        : Infinity;
      return {
        node: n,
        unlocks,
        score:
          unlocks * 10 +
          (days >= 0 && days <= 7 ? 20 : 0) -
          (n.difficulty ?? 1),
        reason: `Completing this unlocks a path to ${unlocks} dependent ${unlocks === 1 ? "step" : "steps"}${days < 0 ? "; its recorded deadline has passed" : days <= 7 ? "; its recorded deadline is within seven days" : ""}.`,
      };
    })
    .sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id));
  // Gates represent outcomes; optional document alternatives never inflate readiness.
  const milestones = nodes.filter(
    (n) =>
      n.type === "gate" ||
      (n.type === "task" && !nodes.some((p) => p.any.includes(n.id))),
  );
  const count = milestones.filter((n) => satisfied.has(n.id)).length;
  return {
    statuses,
    actions,
    blockers,
    readiness: milestones.length
      ? Math.round((count / milestones.length) * 100)
      : 0,
    complete: count,
    total: milestones.length,
  };
}
export function screen(profile: Profile, limit = 48000) {
  profileSchema.parse(profile);
  const reasons: string[] = [];
  let fail = false,
    missing = false;
  if (profile.location === "Other") {
    fail = true;
    reasons.push("This fictional program covers San Diego only.");
  } else if (profile.location === "Unknown") {
    missing = true;
    reasons.push("Add your location.");
  }
  if (profile.household === null || profile.income === null) {
    missing = true;
    reasons.push("Household size and approximate annual income are needed.");
  } else {
    const ceiling = limit + Math.max(0, profile.household - 1) * 8000;
    if (profile.income > ceiling) {
      fail = true;
      reasons.push(
        `Income exceeds this fictional household limit of $${ceiling.toLocaleString()}.`,
      );
    } else
      reasons.push(
        `Income is within the fictional household limit of $${ceiling.toLocaleString()}.`,
      );
  }
  return {
    result: fail
      ? "Likely ineligible"
      : missing
        ? "More information needed"
        : "Potentially eligible",
    reasons,
  };
}

/** Reevaluate only changed nodes and their transitive consumers; rerank the small action set. */
export class DependencyEngine {
  private completed: string[] = [];
  private previous: ReturnType<typeof analyze> | undefined;
  constructor(private nodes: Requirement[]) {
    topologicalSort(nodes);
  }
  update(completed: string[], now = Date.now()) {
    const changed = new Set([
      ...completed.filter((id) => !this.completed.includes(id)),
      ...this.completed.filter((id) => !completed.includes(id)),
    ]);
    const affected = new Set(changed);
    let grew = true;
    while (grew) {
      grew = false;
      for (const n of this.nodes)
        if (
          !affected.has(n.id) &&
          [...n.all, ...n.any].some((id) => affected.has(id))
        ) {
          affected.add(n.id);
          grew = true;
        }
    }
    const hadPrevious = !!this.previous;
    const result = analyze(
      this.nodes,
      completed,
      now,
      this.previous
        ? { statuses: this.previous.statuses, affected }
        : undefined,
    );
    this.completed = [...completed];
    this.previous = result;
    return {
      ...result,
      recalculated: hadPrevious ? affected.size : this.nodes.length,
    };
  }
}
