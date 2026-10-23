import { z } from "zod";
import { topologicalSort, type Requirement } from "./engine";
import {
  officialCatalog,
  officialProgramIdSchema,
  type OfficialProgram,
} from "./official-catalog";
export const officialRoleSchema = z.enum(["new", "existing"]);
const ids = [
  "read-status",
  "email-access",
  "assisted-access",
  "review-contact",
  "review-notices",
  "next-followup",
  "find-helper",
  "prepare-questions",
  "contact-helper",
  "review-reply",
] as const;
export const officialStepIdSchema = z.enum(ids);
export const officialPlanSchema = z
  .object({
    documents: z
      .record(z.enum(["recent-paystubs", "employer-statement"]), z.boolean())
      .default({}),
    programId: officialProgramIdSchema,
    role: officialRoleSchema,
    completed: z
      .array(officialStepIdSchema)
      .max(ids.length)
      .refine((v) => new Set(v).size === v.length, "Duplicate official step"),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((plan, ctx) => {
    const program = officialCatalog.programs.find(
      (p) => p.id === plan.programId,
    )!;
    if (
      plan.programId !== "county-public" &&
      Object.keys(plan.documents).length
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Document rule is specific to County Public Housing preferences",
      });
    const tasks = new Set(
      officialPlanNodes(program, plan.role)
        .filter((n) => n.type === "task")
        .map((n) => n.id),
    );
    if (plan.completed.some((id) => !tasks.has(id)))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Step does not belong to this program route",
      });
  });
export type OfficialPlan = z.infer<typeof officialPlanSchema>;
export type OfficialRole = z.infer<typeof officialRoleSchema>;
export type OfficialStepId = z.infer<typeof officialStepIdSchema>;
export function officialPlanNodes(
  program: OfficialProgram,
  role: OfficialRole,
): Requirement[] {
  const node = (
    id: string,
    name: string,
    description: string,
    all: string[] = [],
    any: string[] = [],
    type: Requirement["type"] = "task",
    source = program.availability.sourceId,
  ): Requirement => ({ id, name, description, all, any, type, source });
  const start = node(
    "read-status",
    "Read the current access instructions",
    `${program.availability.detail} This is saved guidance, not a live opening. Read the official page before relying on it.`,
  );
  if (role === "existing" && program.availability.kind === "closed")
    return [
      start,
      node(
        "review-notices",
        "Check and respond to County letters",
        "The County warns that missing a response or returned mail can remove someone from a waiting list. Read your own letter for its actual deadline. BridgeBack cannot see it or extend it.",
        ["read-status"],
        [],
        "task",
        "county-applications",
      ),
      node(
        "email-access",
        "Use your existing agency account or its registration guide",
        "Use the County’s own website and a valid email you can access. The guide includes registration with or without a code. Keep codes, passwords and identity numbers out of BridgeBack.",
        ["read-status"],
        [],
        "task",
        "county-registration",
      ),
      node(
        "assisted-access",
        "Arrange County help without the online portal",
        "Call 858-694-4801 and ask for an assisted way to update your existing application. The County says mail, fax and in-person methods remain available. Do not mark this complete merely because you opened the phone link.",
        ["read-status"],
        [],
        "task",
        "county-access",
      ),
      node(
        "access",
        "One access route is arranged",
        "Use the online route OR an assisted route. Both are not required.",
        [],
        ["email-access", "assisted-access"],
        "gate",
        "county-access",
      ),
      node(
        "review-contact",
        "Check your contact information with the County",
        "Confirm that the County can reach you. Make changes only through its official portal or the assisted method it gives you; BridgeBack sends nothing.",
        ["access"],
        [],
        "task",
        "county-update",
      ),
      node(
        "next-followup",
        "Keep your confirmation and decide whether to follow up",
        "Keep any confirmation privately. If the update or response is unclear, ask HACSD what remains outstanding. Checking this off records your own follow-up work, not County acceptance.",
        ["review-contact", "review-notices"],
        [],
        "task",
        "county-update",
      ),
    ];
  const vash = program.eligibility === "referral";
  return [
    start,
    node(
      "find-helper",
      vash
        ? "Choose the VA information route"
        : "Choose a real helper while this waiting list is closed",
      vash
        ? "The County directs people to the VA at 877-424-3838 for information. This is an assessment/referral conversation, not a confirmed voucher opening."
        : "For a place to stay tonight or soon, the County says to call 211. You can also ask a listed housing counselor about other current options. A closed waiting list is not emergency assistance.",
      ["read-status"],
      [],
      "task",
      vash ? "county-vash" : "county-urgent",
    ),
    node(
      "prepare-questions",
      "Prepare the questions you want answered",
      "Ask which service covers your situation, whether it is accepting referrals, what to bring, and what to do if the first document is unavailable. Do not enter personal records here.",
      ["read-status"],
    ),
    node(
      "contact-helper",
      vash
        ? "Ask the VA about assessment and next steps"
        : "Ask the chosen helper about current options",
      "You make the call or visit. Mark this only after you actually contact someone; BridgeBack does not make calls, send applications or verify a response.",
      ["find-helper", "prepare-questions"],
    ),
    node(
      "review-reply",
      "Review the reply and your next step",
      "Confirm the instructions and any actual deadline with the provider. If there is no answer, ask about another contact route. This checklist is not a benefit application or an eligibility decision.",
      ["contact-helper"],
    ),
  ];
}
export function analyzeOfficialPlan(plan: OfficialPlan) {
  const program = officialCatalog.programs.find((p) => p.id === plan.programId);
  if (!program) throw Error("Unknown official program");
  const nodes = officialPlanNodes(program, plan.role),
    order = topologicalSort(nodes),
    byId = new Map(nodes.map((n) => [n.id, n]));
  const statuses: Record<string, "complete" | "available" | "blocked"> = {};
  for (const id of order) {
    const node = byId.get(id)!;
    const ready =
      node.all.every((id) => statuses[id] === "complete") &&
      (!node.any.length || node.any.some((id) => statuses[id] === "complete"));
    statuses[id] = ready
      ? node.type === "gate" || plan.completed.includes(id as OfficialStepId)
        ? "complete"
        : "available"
      : "blocked";
  }
  // The two access tasks satisfy one milestone, never two mandatory documents.
  const milestones =
    plan.role === "existing" && program.availability.kind === "closed"
      ? [
          "read-status",
          "access",
          "review-contact",
          "review-notices",
          "next-followup",
        ]
      : [
          "read-status",
          "find-helper",
          "prepare-questions",
          "contact-helper",
          "review-reply",
        ];
  const complete = milestones.filter(
    (id) => statuses[id] === "complete",
  ).length;
  const actions = nodes.filter(
    (n) =>
      n.type === "task" &&
      statuses[n.id] === "available" &&
      !(
        (n.id === "email-access" || n.id === "assisted-access") &&
        statuses.access === "complete"
      ),
  );
  return {
    program,
    nodes,
    statuses,
    milestones,
    complete,
    total: milestones.length,
    progress: Math.round((100 * complete) / milestones.length),
    next: actions[0] ?? null,
  };
}
export function updateOfficialStep(
  plan: OfficialPlan,
  stepId: OfficialStepId,
  checked: boolean,
  now: string,
): OfficialPlan {
  const current = analyzeOfficialPlan(plan);
  if (!current.nodes.some((n) => n.id === stepId && n.type === "task"))
    throw Error("Unknown official plan step");
  if (
    checked &&
    current.statuses[stepId] !== "available" &&
    current.statuses[stepId] !== "complete"
  )
    throw Error("Finish a prerequisite before marking this step complete.");
  const completed = checked
    ? [...new Set([...plan.completed, stepId])]
    : plan.completed.filter((id) => id !== stepId);
  const provisional = { ...plan, completed, updatedAt: now };
  const evaluated = analyzeOfficialPlan(provisional);
  // Corrections discard downstream completion claims; they do not silently return later.
  return officialPlanSchema.parse({
    ...provisional,
    completed: completed.filter((id) => evaluated.statuses[id] === "complete"),
  });
}

export const officialDocumentIdSchema = z.enum([
  "recent-paystubs",
  "employer-statement",
]);
export type OfficialDocumentId = z.infer<typeof officialDocumentIdSchema>;
export function officialPreferenceProof(plan: OfficialPlan) {
  const applicable = plan.programId === "county-public";
  return {
    applicable,
    satisfied:
      applicable &&
      (plan.documents["recent-paystubs"] === true ||
        plan.documents["employer-statement"] === true),
    sourceId: "county-public-policy",
  };
}
