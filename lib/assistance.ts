import { z } from "zod";
import rawContacts from "./assistance-contacts.json";

export const assistanceGoalSchema = z.enum([
  "urgent",
  "notice",
  "application",
  "paperwork",
  "veteran",
]);
export const assistanceAgencySchema = z.enum(["unknown", "county", "city"]);
export type AssistanceGoal = z.infer<typeof assistanceGoalSchema>;
export type AssistanceAgency = z.infer<typeof assistanceAgencySchema>;
export const assistanceGoals: {
  id: AssistanceGoal;
  label: string;
  description: string;
}[] = [
  {
    id: "urgent",
    label: "I need a place to stay",
    description: "Find a real referral contact for tonight or soon.",
  },
  {
    id: "application",
    label: "I’m working on an application",
    description: "Reach the agency handling it and keep the next step clear.",
  },
  {
    id: "paperwork",
    label: "I’m stuck on paperwork",
    description: "Ask what counts, what’s missing, or how to get help.",
  },
  {
    id: "notice",
    label: "I received a housing notice",
    description: "Find legal help and track a date from your own notice.",
  },
  {
    id: "veteran",
    label: "I’m a veteran seeking housing help",
    description: "Use the County’s published VA information route.",
  },
];
export const assistanceBarrierSchema = z.enum([
  "none",
  "phone",
  "language",
  "technology",
  "documents",
  "unclear",
]);
export const assistanceBarriers = [
  { id: "none", label: "Choose what is getting in the way" },
  { id: "phone", label: "I cannot make a phone call" },
  { id: "language", label: "I need language or accessibility help" },
  { id: "technology", label: "I cannot use the online account" },
  { id: "documents", label: "I do not have the requested paper" },
  { id: "unclear", label: "I do not understand the instructions" },
] as const;
export const assistanceOutcomeSchema = z.enum([
  "no-answer",
  "message",
  "spoke",
  "referred",
  "sent",
]);
export const assistanceOutcomes = [
  { id: "no-answer", label: "I tried, but did not reach anyone" },
  { id: "message", label: "I left a message or sent a question" },
  { id: "spoke", label: "Someone answered my question" },
  { id: "referred", label: "I was directed to another organization" },
  { id: "sent", label: "I sent the requested paperwork to the provider" },
] as const;
export const assistanceInstructionSchema = z.enum([
  "clarify",
  "gather",
  "submit",
  "wait",
  "referral",
]);
export const assistancePaperSchema = z.enum([
  "identity",
  "income",
  "household",
  "residence",
  "other",
]);
export type AssistancePaper = z.infer<typeof assistancePaperSchema>;
export const assistancePapers: { id: AssistancePaper; label: string }[] = [
  { id: "identity", label: "Identity paperwork" },
  { id: "income", label: "Income paperwork" },
  { id: "household", label: "Household paperwork" },
  { id: "residence", label: "Address or residence paperwork" },
  { id: "other", label: "Other requested paperwork" },
];
export const assistanceInstructions = [
  { id: "clarify", label: "I still need clear instructions" },
  { id: "gather", label: "Gather paperwork they specifically requested" },
  { id: "submit", label: "Send paperwork using their instructions" },
  { id: "wait", label: "Wait for a reply and confirm when to follow up" },
  { id: "referral", label: "Contact the organization they referred me to" },
] as const;
export const assistanceDateSchema = z
  .string()
  .refine(
    (value) =>
      value === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value),
    "Use a valid calendar date",
  );
export function assistanceKey(goal: AssistanceGoal, agency: AssistanceAgency) {
  return `${goal}:${["application", "paperwork"].includes(goal) ? agency : "unknown"}`;
}
export const assistanceCaseSchema = z
  .object({
    key: z.string().max(40),
    goal: assistanceGoalSchema,
    agency: assistanceAgencySchema,
    barrier: assistanceBarrierSchema,
    attempts: z
      .array(
        z
          .object({
            at: z.string().datetime(),
            channel: z.enum(["phone", "website", "in-person"]),
            outcome: assistanceOutcomeSchema,
          })
          .strict(),
      )
      .max(12),
    instruction: assistanceInstructionSchema,
    instructionsConfirmed: z.boolean(),
    requestedPapers: z
      .array(assistancePaperSchema)
      .max(5)
      .refine(
        (items) => new Set(items).size === items.length,
        "Duplicate requested category",
      )
      .default([]),
    preparedPapers: z
      .array(assistancePaperSchema)
      .max(5)
      .refine(
        (items) => new Set(items).size === items.length,
        "Duplicate prepared category",
      )
      .default([]),
    followUpDate: assistanceDateSchema,
    responseDate: assistanceDateSchema,
    resolved: z.boolean(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.preparedPapers.some((id) => !value.requestedPapers.includes(id)))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A prepared category must be on your reported request list",
      });
    if (
      value.key !== assistanceKey(value.goal, value.agency) ||
      (!["application", "paperwork"].includes(value.goal) &&
        value.agency !== "unknown")
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Contact route does not match this case",
      });
    const last = value.attempts.at(-1);
    if (
      (value.instructionsConfirmed || value.resolved) &&
      (!last ||
        !["spoke", "sent", "referred"].includes(last.outcome) ||
        value.instruction === "clarify")
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Confirm a reported contact and a specific next step first",
      });
    if (value.resolved && !value.instructionsConfirmed)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Resolution needs a confirmed next step",
      });
  });
export type AssistanceCase = z.infer<typeof assistanceCaseSchema>;
const allowedHosts = new Set([
  "www.sandiegocounty.gov",
  "211sandiego.org",
  "sdhc.org",
  "www.lassd.org",
]);
const safeUrl = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      allowedHosts.has(url.hostname) &&
      !url.username &&
      !url.password
    );
  });
export const assistanceContacts = z
  .array(
    z
      .object({
        id: z.enum(["211", "county", "city", "legal", "va"]),
        name: z.string().min(1),
        phone: z.string().regex(/^[0-9-]+$/),
        tty: z
          .string()
          .regex(/^[0-9-]+$/)
          .optional(),
        url: safeUrl,
        sourceUrl: safeUrl,
        sourceTitle: z.string().min(1),
        excerpt: z.string().min(10),
        reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reviewAfterDays: z.number().int().positive(),
        description: z.string().min(1),
      })
      .strict(),
  )
  .parse(rawContacts);
export function assistanceRoute(
  goal: AssistanceGoal,
  agency: AssistanceAgency,
) {
  const id =
    goal === "urgent"
      ? "211"
      : goal === "notice"
        ? "legal"
        : goal === "veteran"
          ? "va"
          : agency === "county"
            ? "county"
            : agency === "city"
              ? "city"
              : "211";
  const contact = assistanceContacts.find((c) => c.id === id)!;
  const purpose =
    goal === "urgent"
      ? "I need a place to stay tonight or soon. Which service can help with my situation, and how do I contact it?"
      : goal === "notice"
        ? "I received a housing notice. Can you help me understand it, or direct me to appropriate legal help?"
        : goal === "veteran"
          ? "I’m a veteran looking for housing help. How do I ask for an assessment or the right referral?"
          : agency === "unknown"
            ? "I need help with housing paperwork, but I’m not sure which organization handles it. Can you help me find the right contact?"
            : goal === "paperwork"
              ? "I’m working on housing paperwork with your organization. I cannot get or understand one of the requested documents. Who can explain the accepted options?"
              : "I already have an application or case with your organization. I need to confirm what I should do next and how to keep my contact information current.";
  const questions =
    goal === "notice"
      ? [
          "Can you review this kind of notice, and how do I request help?",
          "Who can confirm the actual response date and required action?",
          "If you cannot help, which legal service should I contact next?",
        ]
      : goal === "urgent"
        ? [
            "Which service should I contact for my situation today?",
            "Do I need a referral, and how do I request it?",
            "If that service cannot help, what is the next contact?",
          ]
        : [
            "What is the next step for my situation? Could I have the instructions in writing?",
            "Exactly which papers are needed? If I cannot get one, which alternatives do you accept?",
            "How should I send them, how do I confirm receipt, and is there a response date?",
          ];
  return { contact, script: purpose, questions };
}
export function newAssistanceCase(
  goal: AssistanceGoal,
  agency: AssistanceAgency,
  now: string,
): AssistanceCase {
  const normalized = ["application", "paperwork"].includes(goal)
    ? agency
    : "unknown";
  return assistanceCaseSchema.parse({
    key: assistanceKey(goal, normalized),
    goal,
    agency: normalized,
    barrier: "none",
    attempts: [],
    instruction: "clarify",
    instructionsConfirmed: false,
    requestedPapers: [],
    preparedPapers: [],
    followUpDate: "",
    responseDate: "",
    resolved: false,
    updatedAt: now,
  });
}
export type AssistanceChange =
  | { type: "barrier"; value: z.infer<typeof assistanceBarrierSchema> }
  | {
      type: "contact";
      outcome: z.infer<typeof assistanceOutcomeSchema>;
      channel: "phone" | "website" | "in-person";
    }
  | { type: "instruction"; value: z.infer<typeof assistanceInstructionSchema> }
  | { type: "confirm"; value: boolean }
  | { type: "paper-request"; id: AssistancePaper; value: boolean }
  | { type: "paper-ready"; id: AssistancePaper; value: boolean }
  | { type: "date"; kind: "followup" | "response"; value: string }
  | { type: "resolve"; value: boolean };
const assistanceChangeSchema = z.discriminatedUnion("type", [
  z
    .object({ type: z.literal("barrier"), value: assistanceBarrierSchema })
    .strict(),
  z
    .object({
      type: z.literal("contact"),
      outcome: assistanceOutcomeSchema,
      channel: z.enum(["phone", "website", "in-person"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("instruction"),
      value: assistanceInstructionSchema,
    })
    .strict(),
  z.object({ type: z.literal("confirm"), value: z.boolean() }).strict(),
  z
    .object({
      type: z.literal("paper-request"),
      id: assistancePaperSchema,
      value: z.boolean(),
    })
    .strict(),
  z
    .object({
      type: z.literal("paper-ready"),
      id: assistancePaperSchema,
      value: z.boolean(),
    })
    .strict(),
  z
    .object({
      type: z.literal("date"),
      kind: z.enum(["followup", "response"]),
      value: assistanceDateSchema,
    })
    .strict(),
  z.object({ type: z.literal("resolve"), value: z.boolean() }).strict(),
]);
export function updateAssistanceCase(
  value: AssistanceCase,
  change: AssistanceChange,
  now: string,
) {
  change = assistanceChangeSchema.parse(change);
  const current = assistanceCaseSchema.parse(value);
  let next = { ...current, updatedAt: now };
  if (change.type === "barrier")
    next.barrier = assistanceBarrierSchema.parse(change.value);
  if (change.type === "contact") {
    next = {
      ...next,
      attempts: [
        ...current.attempts,
        {
          at: now,
          channel: change.channel,
          outcome: assistanceOutcomeSchema.parse(change.outcome),
        },
      ].slice(-12),
      instructionsConfirmed: false,
      resolved: false,
      instruction:
        change.outcome === "referred"
          ? "referral"
          : change.outcome === "sent"
            ? "wait"
            : "clarify",
    };
  }
  if (change.type === "instruction")
    next = {
      ...next,
      instruction: assistanceInstructionSchema.parse(change.value),
      instructionsConfirmed: false,
      resolved: false,
    };
  if (change.type === "confirm")
    next = {
      ...next,
      instructionsConfirmed: change.value,
      resolved: change.value ? next.resolved : false,
    };
  if (change.type === "date")
    next = {
      ...next,
      [change.kind === "followup" ? "followUpDate" : "responseDate"]:
        assistanceDateSchema.parse(change.value),
    };
  if (change.type === "resolve") next.resolved = change.value;
  if (change.type === "paper-request") {
    if (change.value && !current.instructionsConfirmed)
      throw Error(
        "Confirm the provider's instructions before recording what it requested.",
      );
    next.requestedPapers = change.value
      ? [...new Set([...current.requestedPapers, change.id])]
      : current.requestedPapers.filter((id) => id !== change.id);
    if (!change.value)
      next.preparedPapers = current.preparedPapers.filter(
        (id) => id !== change.id,
      );
  }
  if (change.type === "paper-ready") {
    if (!current.requestedPapers.includes(change.id))
      throw Error("Only prepare a category on your reported request list.");
    next.preparedPapers = change.value
      ? [...new Set([...current.preparedPapers, change.id])]
      : current.preparedPapers.filter((id) => id !== change.id);
  }
  return assistanceCaseSchema.parse(next);
}
export function localCalendarDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function assistanceNext(value: AssistanceCase, today: string) {
  const route = assistanceRoute(value.goal, value.agency),
    last = value.attempts.at(-1);
  if (value.responseDate && value.responseDate <= today)
    return {
      title: "Check the response date you saved",
      detail:
        "This is a date you entered, not a deadline verified by BridgeBack. Contact the issuing organization or an appropriate legal helper promptly to confirm what action is needed. Do not assume an extension.",
      reason: "Your saved response date is today or earlier.",
    };
  if (value.followUpDate && value.followUpDate <= today)
    return {
      title: "Follow up on your saved reminder",
      detail:
        "Ask whether your earlier question or paperwork was received and what remains outstanding. Keep any confirmation outside BridgeBack.",
      reason:
        "Your personal follow-up reminder is due. It is not an agency deadline.",
    };
  if (
    value.resolved &&
    !(
      value.instructionsConfirmed &&
      ["gather", "submit"].includes(value.instruction) &&
      value.requestedPapers.some((id) => !value.preparedPapers.includes(id))
    )
  )
    return {
      title: "Your question is marked resolved",
      detail:
        "Keep your confirmation privately. You can reopen this help plan if instructions change. This does not mean an agency approved an application.",
      reason: "You reported a contact and confirmed the next step.",
    };
  if (!last)
    return {
      title: `Contact ${route.contact.name}`,
      detail:
        "Use the short script below. If calling is difficult, choose what is getting in the way for another route.",
      reason: "You have not recorded a contact attempt yet.",
    };
  if (["no-answer", "message"].includes(last.outcome))
    return {
      title: "You still need a reply",
      detail:
        value.agency === "county"
          ? "Open the County instructions for mail, fax or in-person access, or try its published number again. Ask which route is appropriate for your case; do not send documents to BridgeBack."
          : "Check the organization’s official website for another contact method. If the first service cannot help, ask 211 to identify another appropriate organization. Choose a personal follow-up date below.",
      reason:
        last.outcome === "message"
          ? "You recorded a message, not an answered question."
          : "Your last contact did not reach anyone.",
    };
  if (last.outcome === "referred" && !value.instructionsConfirmed)
    return {
      title: "Make the referral usable",
      detail:
        "Confirm the organization’s name, official contact route, what it can help with and whether it needs a referral. Verify contact details on its official website before sharing records.",
      reason: "Being referred is a next step, not a completed handoff.",
    };
  if (!value.instructionsConfirmed)
    return {
      title: "Confirm what the organization asked you to do",
      detail:
        "Choose the next step they actually gave you below. Read it back, ask what counts and confirm how to send it. Do not guess at an accepted document or deadline.",
      reason:
        "A contact was recorded, but its next instructions are not confirmed.",
    };
  if (
    ["gather", "submit"].includes(value.instruction) &&
    value.requestedPapers.some((id) => !value.preparedPapers.includes(id))
  )
    return {
      title: "Prepare the remaining requested paperwork",
      detail: `On your own list: ${assistancePapers
        .filter(
          (p) =>
            value.requestedPapers.includes(p.id) &&
            !value.preparedPapers.includes(p.id),
        )
        .map((p) => p.label.toLowerCase())
        .join(
          ", ",
        )}. Use the provider’s exact written requirements. If you cannot get something, choose the missing-paperwork help below and ask about accepted options.`,
      reason:
        "These are categories you reported, not document requirements invented or accepted by BridgeBack.",
    };
  const detail = {
    clarify: "Ask for a short, written explanation of what to do next.",
    gather:
      "Gather only the papers the organization actually requested. Ask it about accepted substitutes if something is missing. Use Documents for the separately sourced County working-preference options when they apply.",
    submit:
      "Use the organization’s official submission instructions. Check the requested items, send them there, and keep your receipt privately. Record “I sent the requested paperwork” only after you do it.",
    wait: "Keep any receipt or reference privately. Use the organization’s stated response time to choose a follow-up date; BridgeBack does not invent one.",
    referral:
      "Use the referral contact you confirmed with the organization. Ask the receiving service to confirm that it handles your situation and what to do next.",
  }[value.instruction];
  return {
    title: assistanceInstructions.find((i) => i.id === value.instruction)!
      .label,
    detail,
    reason:
      "This follows the instructions you reported and confirmed, not an AI guess or an agency decision.",
  };
}
export function assistanceBarrierAdvice(value: AssistanceCase) {
  const county = value.agency === "county";
  return {
    none: "",
    phone: county
      ? "The County says mail, fax and in-person methods remain available without internet or device access. Open its access instructions below and ask which method fits your case."
      : "Open the official contact page and check for a contact form, office or accessibility route. A trusted helper can help you make a call. Confirm any method before sending personal records.",
    language:
      "Ask the organization for an interpreter, an accessible format or help completing a step. Ask how to request that support. BridgeBack cannot confirm which accommodations are available or arrange them for you.",
    technology: county
      ? "You do not have to solve the portal problem first. The County lists mail, fax and in-person alternatives. Ask it how to update your case using one of those methods."
      : "Ask the organization whether you can get help by phone or in person. Do not share your password or verification code with BridgeBack or a public helper forum.",
    documents:
      "Ask: “Which document is missing? Which alternatives do you accept for this exact requirement? What should I do while I am waiting for a replacement?” Ask for the answer in writing. A different program’s accepted paper may not count.",
    unclear:
      "Ask for one step at a time: “What should I do first, what exactly should I bring, and how will I know you received it?” Read the answer back before ending the conversation.",
  }[value.barrier];
}
export function assistanceSheet(value: AssistanceCase, today: string) {
  const { contact, script, questions } = assistanceRoute(
      value.goal,
      value.agency,
    ),
    next = assistanceNext(value, today);
  return [
    "BRIDGEBACK — MY CONTACT AND FOLLOW-UP SHEET",
    assistanceGoals.find((g) => g.id === value.goal)!.label,
    `${contact.name}: ${contact.phone}`,
    contact.url,
    `Contact source: ${contact.sourceUrl}`,
    `Details reviewed: ${contact.reviewedAt}; confirm current services directly.`,
    "",
    "WHAT I CAN SAY",
    script,
    "",
    "QUESTIONS TO ASK",
    ...questions.map((q) => `- ${q}`),
    "",
    "NEXT ACTION",
    next.title,
    next.detail,
    next.reason,
    "",
    "MY REPORTED CONTACTS (NOT VERIFIED BY BRIDGEBACK)",
    ...value.attempts.map(
      (a) =>
        `${a.at}: ${a.channel}; ${assistanceOutcomes.find((o) => o.id === a.outcome)!.label}`,
    ),
    `Instructions confirmed by me: ${value.instructionsConfirmed ? "yes" : "no"}`,
    "MY REPORTED REQUEST LIST — CATEGORIES ONLY, NOT AGENCY ACCEPTANCE",
    ...assistancePapers
      .filter((p) => value.requestedPapers.includes(p.id))
      .map(
        (p) =>
          `[${value.preparedPapers.includes(p.id) ? "x" : " "}] ${p.label}`,
      ),
    `Personal follow-up reminder: ${value.followUpDate || "not set"}`,
    `Response date entered by me, not verified: ${value.responseDate || "not set"}`,
    "No profile, income, private case number or document contents are included. No application was sent by BridgeBack. Keep receipts and records privately.",
  ].join("\n");
}
