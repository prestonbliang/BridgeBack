import { z } from "zod";
import { profileSchema, type Profile } from "./engine";
import { programs, documentTypes } from "./programs";
import type { PlannerInput } from "./planner";

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
    schemaVersion: z.literal(2),
    id: z.literal("current"),
    profile: profileSchema,
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
    schemaVersion: 2,
    id: "current",
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
  if (typeof value === "object" && value !== null && "schemaVersion" in value)
    return workspaceSchema.parse(value);
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
  | { type: "expiration"; id: string; value: string };

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
