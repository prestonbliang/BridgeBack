import { z } from "zod";
import { profileSchema, type Profile } from "./engine";
import { programs, documentTypes } from "./programs";
import type { PlannerInput } from "./planner";
import {
  supportRecordSchema,
  supportTargetSchema,
  supportReasonSchema,
  supportOutcomeSchema,
  followUpDateSchema,
  type SupportReason,
  type SupportMicrostep,
} from "./support-model";
import { buildSupportPlan } from "./support";
import { supportResources } from "./support-resources";
import { counselorSnapshot } from "./counselors";

import { officialCatalog, officialProgramIdSchema } from "./official-catalog";
import {
  officialDocumentIdSchema,
  officialPlanSchema,
  officialRoleSchema,
  officialStepIdSchema,
  updateOfficialStep,
  type OfficialDocumentId,
  type OfficialRole,
  type OfficialStepId,
} from "./official-plans";
import { sourceReportSchema, type SourceReport } from "./official-status";
import {
  assistanceCaseSchema,
  assistanceGoalSchema,
  assistanceAgencySchema,
  newAssistanceCase,
  updateAssistanceCase,
  assistanceGoals,
  type AssistanceGoal,
  type AssistanceAgency,
  type AssistanceChange,
} from "./assistance";

const programIds = new Set(programs.map((program) => program.id));
const documentIds = new Set(documentTypes.map((document) => document.id));
const taskIds = new Set(
  programs.flatMap((program) =>
    program.tasks
      .filter((task) => task.type === "task")
      .map((task) => `${program.id}:${task.id}`),
  ),
);
const effortIds = new Set([
  ...taskIds,
  ...documentTypes.map((document) => `doc:${document.id}`),
]);
const programIdSchema = z
  .string()
  .refine((id) => programIds.has(id), "Unknown program");
const documentIdSchema = z
  .string()
  .refine((id) => documentIds.has(id), "Unknown document type");
const taskIdSchema = z
  .string()
  .refine((id) => taskIds.has(id), "Unknown preparation task");
const effortIdSchema = z
  .string()
  .refine((id) => effortIds.has(id), "Unknown effort target");
const dateSchema = z
  .string()
  .refine(
    (value) =>
      value === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value),
    "Invalid reminder date",
  );
const unique = <T>(items: T[]) => new Set(items).size === items.length;
const prioritySchema = z.enum(["momentum", "effort", "balanced"]);

const inverseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("task"),
    id: taskIdSchema,
    oldValue: z.boolean(),
    newValue: z.boolean(),
  }),
  z.object({
    kind: z.literal("document"),
    id: documentIdSchema,
    oldValue: z.boolean(),
    newValue: z.boolean(),
    wasUnavailable: z.boolean(),
  }),
  z.object({
    kind: z.literal("program"),
    id: programIdSchema,
    oldValue: z.boolean(),
    newValue: z.boolean(),
    oldPreferred: programIdSchema.nullable(),
  }),
  z.object({
    kind: z.literal("unavailable"),
    id: documentIdSchema,
    oldValue: z.boolean(),
    newValue: z.boolean(),
    wasAvailable: z.boolean(),
  }),
]);
export const progressEventSchema = z.object({
  id: z.string().min(1).max(100),
  at: z.string().datetime(),
  type: z.enum([
    "task",
    "document",
    "program",
    "profile",
    "screening",
    "export",
    "unlocked",
    "correction",
    "migration",
    "unavailable",
    "support",
    "official",
  ]),
  label: z.string().min(1).max(500),
  targetId: z.string().max(100).optional(),
  targetKey: z.string().max(120).optional(),
  undone: z.boolean(),
  canUndo: z.boolean(),
  inverse: inverseSchema.optional(),
});
export type ProgressEvent = z.infer<typeof progressEventSchema>;

export const workspaceSchema = z
  .object({
    schemaVersion: z.literal(4),
    id: z.literal("current"),
    assistanceCases: z
      .array(assistanceCaseSchema)
      .max(9)
      .refine(
        (cases) => new Set(cases.map((c) => c.key)).size === cases.length,
        "Duplicate help plan",
      )
      .default([]),
    profile: profileSchema,
    officialPlans: z
      .array(officialPlanSchema)
      .max(officialCatalog.programs.length)
      .refine(
        (plans) => new Set(plans.map((p) => p.programId)).size === plans.length,
        "Duplicate official plan",
      )
      .default([]),
    sourceReport: sourceReportSchema.nullable().default(null),
    selectedProgramIds: z
      .array(programIdSchema)
      .max(programs.length)
      .refine(unique, "Duplicate program"),
    completed: z
      .array(taskIdSchema)
      .max(100)
      .refine(unique, "Duplicate completion"),
    documents: z.record(documentIdSchema, z.boolean()),
    unavailable: z
      .array(documentIdSchema)
      .max(documentTypes.length)
      .refine(unique, "Duplicate unavailable document"),
    priority: prioritySchema,
    effort: z.record(effortIdSchema, z.number().int().min(1).max(5)),
    preferredProgram: programIdSchema.nullable(),
    theme: z.enum(["light", "dark"]),
    largeText: z.boolean(),
    onboarding: z.object({
      step: z.number().int().min(0).max(4),
      done: z.boolean(),
    }),
    events: z
      .array(progressEventSchema)
      .max(100)
      .refine(
        (events) => unique(events.map((event) => event.id)),
        "Duplicate event ID",
      ),
    eventSequence: z.number().int().min(0).default(0),
    expires: z.record(documentIdSchema, dateSchema),
    legacyHistory: z.array(z.string().max(500)).max(30).default([]),
    supportRecords: z
      .array(supportRecordSchema)
      .max(100)
      .refine(
        (records) => unique(records.map((record) => record.targetId)),
        "Duplicate support target",
      )
      .default([]),
  })
  .superRefine((state, context) => {
    if (
      state.preferredProgram !== null &&
      !state.selectedProgramIds.includes(state.preferredProgram)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["preferredProgram"],
        message: "Preferred program must be selected",
      });
    }
    if (state.unavailable.some((id) => state.documents[id])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documents"],
        message: "A document cannot be available and unavailable",
      });
    }
    for (const event of state.events) {
      if (
        event.canUndo &&
        (!event.inverse || !event.targetKey || event.undone)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["events"],
          message: "Undo event lacks a valid inverse",
        });
      }
    }
  });
export type Workspace = z.infer<typeof workspaceSchema>;
// This assignment is type-only evidence that the state satisfies the planner boundary.
export type WorkspacePlannerInput = Workspace extends PlannerInput
  ? Workspace
  : never;

export function initialWorkspace(): Workspace {
  return {
    schemaVersion: 4,
    id: "current",
    assistanceCases: [],
    officialPlans: [],
    sourceReport: null,
    profile: {
      household: null,
      income: null,
      location: "Unknown",
      need: "Rent support",
    },
    selectedProgramIds: [],
    completed: [],
    documents: {},
    unavailable: [],
    priority: "balanced",
    effort: {},
    preferredProgram: null,
    theme: "light",
    largeText: false,
    onboarding: { step: 0, done: false },
    events: [],
    eventSequence: 0,
    expires: {},
    legacyHistory: [],
    supportRecords: [],
  };
}

export const legacyWorkspaceSchema = z.object({
  id: z.literal("current"),
  profile: profileSchema,
  completed: z.array(z.string()).max(100),
  active: z.boolean(),
  demo: z.boolean(),
  theme: z.enum(["light", "dark"]),
  expires: z.record(z.string()).default({}),
  difficulty: z.record(z.number().int().min(1).max(5)).default({}),
  history: z.array(z.string()).max(30),
});

export function migrateWorkspace(
  value: unknown,
  now = new Date().toISOString(),
): Workspace {
  if (typeof value === "object" && value !== null && "schemaVersion" in value) {
    if (value.schemaVersion === 2 || value.schemaVersion === 3)
      return workspaceSchema.parse({ ...value, schemaVersion: 4 });
    return workspaceSchema.parse(value);
  }
  const old = legacyWorkspaceSchema.parse(value);
  const current = initialWorkspace();
  current.profile = old.profile;
  current.selectedProgramIds = old.active ? ["fresh"] : [];
  current.completed = [
    ...new Set(
      old.completed
        .filter((id) => taskIds.has(`fresh:${id}`))
        .map((id) => `fresh:${id}`),
    ),
  ];
  for (const id of old.completed)
    if (documentIds.has(id)) current.documents[id] = true;
  for (const [id, value] of Object.entries(old.difficulty)) {
    const migratedId = documentIds.has(id) ? `doc:${id}` : `fresh:${id}`;
    if (effortIds.has(migratedId)) current.effort[migratedId] = value;
  }
  for (const [id, value] of Object.entries(old.expires))
    if (documentIds.has(id)) current.expires[id] = dateSchema.parse(value);
  current.theme = old.theme;
  current.legacyHistory = old.history;
  current.onboarding = { step: 0, done: old.active };
  current.eventSequence = 1;
  current.events = [
    {
      id: "migration-1",
      at: now,
      type: "migration",
      label:
        "Imported earlier preparation progress. Earlier activity is retained without invented timestamps.",
      undone: false,
      canUndo: false,
    },
  ];
  return workspaceSchema.parse(current);
}

export type WorkspaceAction =
  | { type: "assistance-open"; goal: AssistanceGoal; agency: AssistanceAgency }
  | { type: "assistance-change"; key: string; change: AssistanceChange }
  | { type: "assistance-remove"; key: string }
  | {
      type: "official-document";
      id: string;
      documentId: OfficialDocumentId;
      available: boolean;
    }
  | { type: "official-plan"; id: string; selected: boolean }
  | { type: "official-role"; id: string; role: OfficialRole }
  | {
      type: "official-step";
      id: string;
      stepId: OfficialStepId;
      checked: boolean;
    }
  | { type: "source-report"; report: SourceReport }
  | { type: "task"; id: string; complete: boolean }
  | { type: "document"; id: string; available: boolean }
  | { type: "program"; id: string; selected: boolean }
  | { type: "profile"; profile: Profile }
  | { type: "priority"; priority: PlannerInput["priority"] }
  | { type: "effort"; id: string; value: number }
  | { type: "preferred"; id: string | null }
  | { type: "unavailable"; id: string; value: boolean }
  | { type: "theme"; theme: "light" | "dark" }
  | { type: "largeText"; value: boolean }
  | { type: "onboarding"; step: number; done: boolean }
  | {
      type: "record";
      eventType: "screening" | "export" | "unlocked";
      label: string;
    }
  | { type: "undo"; eventId: string }
  | { type: "expiration"; id: string; value: string }
  | { type: "support-open"; targetId: string; reason: SupportReason }
  | {
      type: "support-check";
      targetId: string;
      stepId: SupportMicrostep;
      checked: boolean;
    }
  | {
      type: "support-contact";
      targetId: string;
      outcome:
        | "not-contacted"
        | "waiting"
        | "no-response"
        | "different-proof"
        | "answered";
    }
  | { type: "support-reminder"; targetId: string; date: string }
  | {
      type: "support-status";
      targetId: string;
      status: "working" | "waiting" | "resolved";
    }
  | { type: "support-remove"; targetId: string }
  | {
      type: "support-finish";
      targetId: string;
      confirmed: boolean;
      answer: string;
    }
  | { type: "support-provider"; targetId: string; providerId: string };

const documentName = (id: string) =>
  documentTypes.find((document) => document.id === id)?.name ?? id;
const taskName = (id: string) => {
  const [programId, taskId] = id.split(":");
  return (
    programs
      .find((program) => program.id === programId)
      ?.tasks.find((task) => task.id === taskId)?.name ?? id
  );
};
const programName = (id: string) =>
  programs.find((program) => program.id === id)?.shortName ?? id;
const setMembership = (values: string[], id: string, selected: boolean) =>
  selected
    ? [...new Set([...values, id])]
    : values.filter((value) => value !== id);

function appendEvent(
  state: Workspace,
  details: Omit<ProgressEvent, "id" | "at" | "undone" | "canUndo">,
  now: string,
): Workspace {
  const event: ProgressEvent = {
    ...details,
    id: `event-${state.eventSequence + 1}`,
    at: now,
    undone: false,
    canUndo: !!details.inverse,
  };
  const earlier = state.events.map((old) =>
    details.targetKey && old.targetKey === details.targetKey
      ? { ...old, canUndo: false }
      : old,
  );
  return {
    ...state,
    eventSequence: state.eventSequence + 1,
    events: [event, ...earlier].slice(0, 100),
  };
}

/** Mutations are explicit and reversible; simulations never call this reducer. */
export function updateWorkspace(
  previous: Workspace,
  action: WorkspaceAction,
  now = new Date().toISOString(),
): Workspace {
  let state = workspaceSchema.parse(previous);
  let details:
    Omit<ProgressEvent, "id" | "at" | "undone" | "canUndo"> | undefined;
  switch (action.type) {
    case "assistance-open": {
      const item = newAssistanceCase(
        assistanceGoalSchema.parse(action.goal),
        assistanceAgencySchema.parse(action.agency),
        now,
      );
      if (state.assistanceCases.some((c) => c.key === item.key)) return state;
      state = { ...state, assistanceCases: [item, ...state.assistanceCases] };
      details = {
        type: "support",
        label: `Started a real contact plan: ${assistanceGoals.find((g) => g.id === item.goal)!.label}`,
      };
      break;
    }
    case "assistance-change": {
      const current = state.assistanceCases.find((c) => c.key === action.key);
      if (!current) throw Error("Open this help plan before changing it.");
      const updated = updateAssistanceCase(current, action.change, now);
      state = {
        ...state,
        assistanceCases: [
          updated,
          ...state.assistanceCases.filter((c) => c.key !== action.key),
        ],
      };
      details = {
        type: "support",
        label:
          action.change.type === "contact"
            ? "Recorded my own contact outcome; BridgeBack did not make or verify the contact."
            : action.change.type === "date"
              ? "Updated a personal help-plan date; this is not a deadline verified by BridgeBack."
              : "Updated my contact and follow-up plan.",
      };
      break;
    }
    case "assistance-remove":
      if (!state.assistanceCases.some((c) => c.key === action.key))
        return state;
      state = {
        ...state,
        assistanceCases: state.assistanceCases.filter(
          (c) => c.key !== action.key,
        ),
      };
      details = {
        type: "support",
        label: "Removed a contact and follow-up plan from this workspace.",
      };
      break;
    case "official-document": {
      const id = officialProgramIdSchema.parse(action.id);
      const documentId = officialDocumentIdSchema.parse(action.documentId);
      if (
        id !== "county-public" ||
        !state.officialPlans.some((p) => p.programId === id)
      )
        throw Error(
          "This document option belongs only to a saved County Public Housing plan.",
        );
      if (typeof action.available !== "boolean")
        throw Error("Document availability must be a boolean.");
      state = {
        ...state,
        officialPlans: state.officialPlans.map((p) =>
          p.programId === id
            ? {
                ...p,
                documents: { ...p.documents, [documentId]: action.available },
                updatedAt: now,
              }
            : p,
        ),
      };
      details = {
        type: "official",
        label: `Updated a County Public Housing working-preference document option. This does not establish eligibility, selection priority or document acceptance for another program.`,
      };
      break;
    }
    case "source-report": {
      const report = sourceReportSchema.parse(action.report);
      if (report.catalogVersion !== officialCatalog.version)
        throw Error(
          "This source check belongs to another catalog version. Reload the updated app before using it.",
        );
      state = { ...state, sourceReport: report };
      break;
    }
    case "official-plan": {
      const id = officialProgramIdSchema.parse(action.id);
      const exists = state.officialPlans.some((p) => p.programId === id);
      if (exists === action.selected) return previous;
      state = {
        ...state,
        officialPlans: action.selected
          ? [
              ...state.officialPlans,
              {
                programId: id,
                role: "new",
                documents: {},
                completed: [],
                updatedAt: now,
              },
            ]
          : state.officialPlans.filter((p) => p.programId !== id),
      };
      details = {
        type: "official",
        label: `${action.selected ? "Saved" : "Removed"} real-program follow-up plan: ${officialCatalog.programs.find((p) => p.id === id)!.name}. No agency application was sent.`,
      };
      break;
    }
    case "official-role": {
      const id = officialProgramIdSchema.parse(action.id);
      const role = officialRoleSchema.parse(action.role);
      const plan = state.officialPlans.find((p) => p.programId === id);
      if (!plan) throw Error("Save this real program before choosing a route.");
      if (plan.role === role) return previous;
      state = {
        ...state,
        officialPlans: state.officialPlans.map((p) =>
          p.programId === id
            ? {
                ...p,
                role,
                completed: p.completed.filter((step) => step === "read-status"),
                updatedAt: now,
              }
            : p,
        ),
      };
      details = {
        type: "official",
        label: `Changed ${officialCatalog.programs.find((p) => p.id === id)!.name} to ${role === "existing" ? "existing applicant" : "new inquiry"} guidance. Route-specific check marks were reset.`,
      };
      break;
    }
    case "official-step": {
      const id = officialProgramIdSchema.parse(action.id);
      const stepId = officialStepIdSchema.parse(action.stepId);
      const plan = state.officialPlans.find((p) => p.programId === id);
      if (!plan) throw Error("Save this real program before tracking a step.");
      const next = updateOfficialStep(plan, stepId, action.checked, now);
      state = {
        ...state,
        officialPlans: state.officialPlans.map((p) =>
          p.programId === id ? next : p,
        ),
      };
      details = {
        type: "official",
        label: `${action.checked ? "Finished" : "Corrected"} a personal follow-up step for ${officialCatalog.programs.find((p) => p.id === id)!.name}. This does not record agency acceptance.`,
      };
      break;
    }
    case "support-finish": {
      const record = state.supportRecords.find(
        (record) => record.targetId === action.targetId,
      );
      if (!record) throw Error("Start the guided help first.");
      const plan = buildSupportPlan(state, action.targetId, record.reason);
      if (
        !action.confirmed ||
        action.answer !== plan.question.correct ||
        !plan.smallSteps.every((step) => record.checked.includes(step.id))
      )
        throw Error(
          "Review the small steps, answer the check question and confirm the item is actually ready.",
        );
      if (!plan.actionable)
        throw Error(
          "This step is not ready to complete. Check its missing items first.",
        );
      state = updateWorkspace(
        state,
        action.targetId.startsWith("doc:")
          ? { type: "document", id: action.targetId.slice(4), available: true }
          : { type: "task", id: action.targetId, complete: true },
        now,
      );
      state = {
        ...state,
        supportRecords: state.supportRecords.map((value) =>
          value.targetId === action.targetId
            ? { ...value, status: "resolved", updatedAt: now }
            : value,
        ),
      };
      details = {
        type: "support",
        label:
          "Finished a guided readiness check and marked the actual checklist item ready. This is not agency verification.",
      };
      break;
    }
    case "support-open": {
      supportTargetSchema.parse(action.targetId);
      supportReasonSchema.parse(action.reason);
      const old = state.supportRecords.find(
        (record) => record.targetId === action.targetId,
      );
      const record = supportRecordSchema.parse({
        targetId: action.targetId,
        reason: action.reason,
        checked: old?.reason === action.reason ? old.checked : [],
        outcome: old?.outcome ?? "not-contacted",
        followUpDate: old?.followUpDate ?? "",
        contact: old?.contact ?? null,
        status: old?.status === "waiting" ? "waiting" : "working",
        updatedAt: now,
      });
      state = {
        ...state,
        supportRecords: [
          record,
          ...state.supportRecords.filter(
            (record) => record.targetId !== action.targetId,
          ),
        ],
      };
      details = {
        type: "support",
        label:
          "Opened a step-by-step help plan. Checklist completion has not changed.",
      };
      break;
    }
    case "support-check":
    case "support-provider":
    case "support-contact":
    case "support-reminder":
    case "support-status": {
      supportTargetSchema.parse(action.targetId);
      const old = state.supportRecords.find(
        (record) => record.targetId === action.targetId,
      );
      if (!old) throw Error("Choose a help topic before saving its progress.");
      const counselor =
        action.type === "support-provider"
          ? counselorSnapshot.counselors.find(
              (provider) => provider.id === action.providerId,
            )
          : undefined;
      const resource =
        action.type === "support-provider"
          ? supportResources.find(
              (provider) => provider.id === action.providerId,
            )
          : undefined;
      if (
        action.type === "support-provider" &&
        action.providerId &&
        !counselor &&
        !resource
      )
        throw Error("Choose a contact from the provided source list.");
      const record = supportRecordSchema.parse({
        ...old,
        ...(action.type === "support-check"
          ? {
              checked: action.checked
                ? [...new Set([...old.checked, action.stepId])]
                : old.checked.filter((id) => id !== action.stepId),
            }
          : {}),
        ...(action.type === "support-contact"
          ? {
              outcome: supportOutcomeSchema.parse(action.outcome),
              status: ["waiting", "no-response"].includes(action.outcome)
                ? "waiting"
                : "working",
            }
          : {}),
        ...(action.type === "support-reminder"
          ? { followUpDate: followUpDateSchema.parse(action.date) }
          : {}),
        ...(action.type === "support-status" ? { status: action.status } : {}),
        ...(action.type === "support-provider"
          ? {
              contact: counselor
                ? {
                    id: counselor.id,
                    name: counselor.name,
                    phone: counselor.phone,
                    sourceUrl: counselorSnapshot.sourceUrl,
                  }
                : resource
                  ? {
                      id: resource.id,
                      name: resource.organization,
                      ...(resource.phone ? { phone: resource.phone } : {}),
                      sourceUrl: resource.url,
                    }
                  : null,
            }
          : {}),
        updatedAt: now,
      });
      state = {
        ...state,
        supportRecords: state.supportRecords.map((value) =>
          value.targetId === action.targetId ? record : value,
        ),
      };
      if (action.type !== "support-check")
        details = {
          type: "support",
          label:
            action.type === "support-contact"
              ? "Updated a provider-contact outcome. No application or document was marked complete."
              : action.type === "support-reminder"
                ? "Changed a personal follow-up reminder; this is not an agency deadline."
                : action.type === "support-provider"
                  ? "Selected public provider contact details for a help question; nothing was sent."
                  : action.status === "resolved"
                    ? "Marked a help question resolved; checklist completion is separate."
                    : "Reopened a saved help plan.",
        };
      break;
    }
    case "support-remove":
      supportTargetSchema.parse(action.targetId);
      state = {
        ...state,
        supportRecords: state.supportRecords.filter(
          (record) => record.targetId !== action.targetId,
        ),
      };
      break;
    case "task": {
      taskIdSchema.parse(action.id);
      const oldValue = state.completed.includes(action.id);
      if (oldValue === action.complete) return previous;
      state = {
        ...state,
        completed: setMembership(state.completed, action.id, action.complete),
      };
      details = {
        type: "task",
        targetId: action.id,
        targetKey: `task:${action.id}`,
        label: `${action.complete ? "Completed" : "Reopened"}: ${taskName(action.id)}`,
        inverse: {
          kind: "task",
          id: action.id,
          oldValue,
          newValue: action.complete,
        },
      };
      break;
    }
    case "document": {
      documentIdSchema.parse(action.id);
      const oldValue = !!state.documents[action.id],
        wasUnavailable = state.unavailable.includes(action.id);
      if (
        oldValue === action.available &&
        !(action.available && wasUnavailable)
      )
        return previous;
      state = {
        ...state,
        documents: { ...state.documents, [action.id]: action.available },
        unavailable: action.available
          ? state.unavailable.filter((id) => id !== action.id)
          : state.unavailable,
      };
      details = {
        type: "document",
        targetId: action.id,
        targetKey: `document:${action.id}`,
        label: `${action.available ? "Available" : "Marked missing"}: ${documentName(action.id)}`,
        inverse: {
          kind: "document",
          id: action.id,
          oldValue,
          newValue: action.available,
          wasUnavailable,
        },
      };
      break;
    }
    case "program": {
      programIdSchema.parse(action.id);
      const oldValue = state.selectedProgramIds.includes(action.id),
        oldPreferred = state.preferredProgram;
      if (oldValue === action.selected) return previous;
      state = {
        ...state,
        selectedProgramIds: setMembership(
          state.selectedProgramIds,
          action.id,
          action.selected,
        ),
        preferredProgram:
          !action.selected && state.preferredProgram === action.id
            ? null
            : state.preferredProgram,
      };
      details = {
        type: "program",
        targetId: action.id,
        targetKey: `program:${action.id}`,
        label: `${action.selected ? "Added" : "Removed"} ${programName(action.id)} preparation plan`,
        inverse: {
          kind: "program",
          id: action.id,
          oldValue,
          newValue: action.selected,
          oldPreferred,
        },
      };
      break;
    }
    case "unavailable": {
      documentIdSchema.parse(action.id);
      const oldValue = state.unavailable.includes(action.id),
        wasAvailable = !!state.documents[action.id];
      if (oldValue === action.value) return previous;
      state = {
        ...state,
        unavailable: setMembership(state.unavailable, action.id, action.value),
        documents: action.value
          ? { ...state.documents, [action.id]: false }
          : state.documents,
      };
      details = {
        type: "unavailable",
        targetId: action.id,
        targetKey: `document:${action.id}`,
        label: `${documentName(action.id)} ${action.value ? "is currently out of reach" : "is a possible route again"}`,
        inverse: {
          kind: "unavailable",
          id: action.id,
          oldValue,
          newValue: action.value,
          wasAvailable,
        },
      };
      break;
    }
    case "profile":
      profileSchema.parse(action.profile);
      if (JSON.stringify(state.profile) === JSON.stringify(action.profile))
        return previous;
      state = { ...state, profile: action.profile };
      details = {
        type: "profile",
        label: "Updated household information; screening results recalculated.",
      };
      break;
    case "priority":
      state = { ...state, priority: action.priority };
      break;
    case "effort":
      effortIdSchema.parse(action.id);
      state = {
        ...state,
        effort: { ...state.effort, [action.id]: action.value },
      };
      break;
    case "preferred":
      state = { ...state, preferredProgram: action.id };
      break;
    case "theme":
      state = { ...state, theme: action.theme };
      break;
    case "largeText":
      state = { ...state, largeText: action.value };
      break;
    case "onboarding":
      state = {
        ...state,
        onboarding: { step: action.step, done: action.done },
      };
      break;
    case "expiration":
      documentIdSchema.parse(action.id);
      state = {
        ...state,
        expires: { ...state.expires, [action.id]: action.value },
      };
      break;
    case "record":
      details = { type: action.eventType, label: action.label };
      break;
    case "undo": {
      const target = state.events.find((event) => event.id === action.eventId);
      if (!target || !target.canUndo || target.undone || !target.inverse)
        return previous;
      // A newer edit of the same field makes the older correction obsolete.
      const latest = state.events.find(
        (event) =>
          event.targetKey === target.targetKey && event.type !== "correction",
      );
      if (latest?.id !== target.id) return previous;
      const inverse = target.inverse;
      if (inverse.kind === "task") {
        if (state.completed.includes(inverse.id) !== inverse.newValue)
          return previous;
        state = {
          ...state,
          completed: setMembership(
            state.completed,
            inverse.id,
            inverse.oldValue,
          ),
        };
      } else if (inverse.kind === "document") {
        if (!!state.documents[inverse.id] !== inverse.newValue) return previous;
        state = {
          ...state,
          documents: { ...state.documents, [inverse.id]: inverse.oldValue },
          unavailable: setMembership(
            state.unavailable,
            inverse.id,
            inverse.wasUnavailable,
          ),
        };
      } else if (inverse.kind === "program") {
        if (state.selectedProgramIds.includes(inverse.id) !== inverse.newValue)
          return previous;
        const selectedProgramIds = setMembership(
          state.selectedProgramIds,
          inverse.id,
          inverse.oldValue,
        );
        state = {
          ...state,
          selectedProgramIds,
          preferredProgram:
            state.preferredProgram &&
            selectedProgramIds.includes(state.preferredProgram)
              ? state.preferredProgram
              : inverse.oldPreferred &&
                  selectedProgramIds.includes(inverse.oldPreferred)
                ? inverse.oldPreferred
                : null,
        };
      } else {
        if (state.unavailable.includes(inverse.id) !== inverse.newValue)
          return previous;
        state = {
          ...state,
          unavailable: setMembership(
            state.unavailable,
            inverse.id,
            inverse.oldValue,
          ),
          documents: { ...state.documents, [inverse.id]: inverse.wasAvailable },
        };
      }
      state = {
        ...state,
        events: state.events.map((event) =>
          event.id === target.id
            ? { ...event, undone: true, canUndo: false }
            : event,
        ),
      };
      details = {
        type: "correction",
        label: `Corrected earlier action: ${target.label}`,
        targetId: target.targetId,
        targetKey: target.targetKey,
      };
      break;
    }
  }
  if (details) state = appendEvent(state, details, now);
  return workspaceSchema.parse(state);
}
