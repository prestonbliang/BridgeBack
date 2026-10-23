import { z } from "zod";
import { programs, documentTypes } from "./programs";
export const supportReasons = [
  { id: "understand", label: "I’m not sure what this means" },
  { id: "missing", label: "I can’t get the document" },
  { id: "rejected", label: "I was told my paperwork is not enough" },
  { id: "access", label: "I need language, reading, or accessibility help" },
  { id: "overwhelmed", label: "This feels like too much right now" },
  { id: "mistake", label: "I checked this off by mistake" },
  { id: "contact", label: "I tried, and I need a person to help" },
] as const;
export const supportReasonSchema = z.enum([
  "understand",
  "missing",
  "rejected",
  "access",
  "overwhelmed",
  "mistake",
  "contact",
]);
export type SupportReason = z.infer<typeof supportReasonSchema>;
export const supportOutcomes = [
  { id: "not-contacted", label: "I have not contacted anyone yet" },
  { id: "waiting", label: "I contacted someone and am waiting" },
  { id: "no-response", label: "I have not heard back" },
  { id: "different-proof", label: "I need to ask about different paperwork" },
  { id: "answered", label: "My question was answered" },
] as const;
export const supportOutcomeSchema = z.enum([
  "not-contacted",
  "waiting",
  "no-response",
  "different-proof",
  "answered",
]);
const targetIds = new Set([
  "general",
  ...documentTypes.map((d) => `doc:${d.id}`),
  ...programs.flatMap((p) =>
    [...p.accepts, ...p.tasks].map((t) => `${p.id}:${t.id}`),
  ),
]);
export const supportTargetSchema = z
  .string()
  .refine((id) => targetIds.has(id), "Unknown support step");
export const supportMicrosteps = ["read", "locate", "compare", "ask"] as const;
export const followUpDateSchema = z
  .string()
  .refine(
    (value) =>
      value === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value),
    "Use a valid calendar date",
  );
export const supportRecordSchema = z.object({
  targetId: supportTargetSchema,
  reason: supportReasonSchema,
  checked: z
    .array(z.enum(supportMicrosteps))
    .max(4)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Duplicate support step",
    ),
  outcome: supportOutcomeSchema,
  followUpDate: followUpDateSchema,
  status: z.enum(["working", "waiting", "resolved"]),
  contact: z
    .object({
      id: z.string().max(100),
      name: z.string().min(1).max(300),
      phone: z
        .string()
        .regex(/^[0-9-]+$/)
        .optional(),
      sourceUrl: z
        .string()
        .url()
        .refine((value) => new URL(value).protocol === "https:"),
    })
    .nullable()
    .default(null),
  updatedAt: z.string().datetime(),
});
export type SupportRecord = z.infer<typeof supportRecordSchema>;
export type SupportMicrostep = (typeof supportMicrosteps)[number];
