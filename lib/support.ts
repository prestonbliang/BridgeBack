import { evaluatePlan, type PlannerInput, type PlanAnalysis } from "./planner";
import { programs, documentTypes } from "./programs";
import {
  type SupportReason,
  type SupportRecord,
  type SupportMicrostep,
  supportReasonSchema,
  supportTargetSchema,
} from "./support-model";
import { resourcesForReason } from "./support-resources";
export type SmallStep = { id: SupportMicrostep; title: string; detail: string };
export function supportTargetName(id: string): string {
  if (id === "general") return "Housing assistance paperwork";
  if (id.startsWith("doc:"))
    return documentTypes.find((d) => `doc:${d.id}` === id)?.name ?? id;
  const [owner, local] = id.split(":");
  const p = programs.find((p) => p.id === owner);
  return (
    p?.tasks.find((t) => t.id === local)?.name ??
    (p?.accepts.find((a) => a.id === local)
      ? `${p.shortName}: ${p.accepts.find((a) => a.id === local)!.name}`
      : id)
  );
}
export function buildSupportPlan(
  input: PlannerInput,
  targetId: string,
  reason: SupportReason,
  analysis: PlanAnalysis = evaluatePlan(input),
) {
  supportTargetSchema.parse(targetId);
  supportReasonSchema.parse(reason);
  const node = analysis.nodes.find((n) => n.id === targetId);
  const raw = targetId.replace(/^doc:/, "");
  const acceptance = programs
    .filter((p) => input.selectedProgramIds.includes(p.id))
    .flatMap((program) =>
      program.accepts
        .filter(
          (rule) =>
            rule.documentIds.includes(raw) ||
            targetId === `${program.id}:${rule.id}` ||
            node?.all.includes(`${program.id}:${rule.id}`),
        )
        .map((rule) => ({
          program: program.shortName,
          requirement: rule.name,
          documentIds: rule.documentIds,
          source: program.source,
        })),
    );
  const missing = node
    ? [
        ...node.all.filter((id) => analysis.statuses[id] !== "complete"),
        ...(node.any.some((id) => analysis.statuses[id] === "complete")
          ? []
          : node.any),
      ]
    : [];
  const title = supportTargetName(targetId);
  const document = documentTypes.find((d) => d.id === raw);
  const smallSteps: SmallStep[] =
    reason === "missing"
      ? [
          {
            id: "read",
            title: "Name the paper you are missing",
            detail:
              document?.description ??
              `Check what ${title.toLowerCase()} needs. The items below come from your selected practice plans.`,
          },
          {
            id: "locate",
            title: "Try the place that issued it",
            detail:
              raw === "paystub" || raw === "letter"
                ? "If you have an employer, check your pay portal or ask payroll how to get a copy or letter. You do not need to share account details here."
                : raw === "identity"
                  ? "Use the issuing agency's official replacement instructions. Do not enter identification numbers in BridgeBack."
                  : "Check your own records or ask the issuing organization how to get a copy. Do not upload the document here.",
          },
          {
            id: "compare",
            title: "Check the alternatives for each plan",
            detail:
              "Use the exact options below. One document may count for one plan and not another. If the rules say ‘or,’ one listed option is enough for that requirement.",
          },
          {
            id: "ask",
            title: "If that does not work, prepare a question",
            detail:
              "Use the question sheet below to ask the actual provider what else it accepts. A request or a phone call does not mean you have the document yet.",
          },
        ]
      : reason === "mistake"
        ? [
            {
              id: "read",
              title: "Check what was marked ready",
              detail: `Look at ${title.toLowerCase()} and decide whether you can actually access it or have finished the task.`,
            },
            {
              id: "locate",
              title: "Reopen the item if it is not ready",
              detail:
                "Use the correction button below or change it in Documents. Other steps may wait again; that is an honest reflection of what is missing.",
            },
            {
              id: "compare",
              title: "Review what changed",
              detail:
                "Check the updated checklist and its missing items. A correction does not erase the history of what you changed.",
            },
            {
              id: "ask",
              title: "Choose one next step",
              detail:
                "You can work on another available task or use a listed alternative. Asking for help does not change application eligibility.",
            },
          ]
        : reason === "access"
          ? [
              {
                id: "read",
                title: "Choose the help you want to ask for",
                detail:
                  "You can ask about an interpreter, a readable format, help reading instructions, or a way to complete a form without using a website.",
              },
              {
                id: "locate",
                title: "Make the app easier to read",
                detail:
                  "Larger text and theme options are in Settings. You can use the checklist instead of the map. These settings do not change program rules.",
              },
              {
                id: "compare",
                title: "Ask what the provider can offer",
                detail:
                  "Use the question sheet to ask about language or accessibility support. Confirm what is available; BridgeBack cannot promise a particular service.",
              },
              {
                id: "ask",
                title: "Save where the conversation stands",
                detail:
                  "Record whether you are waiting and choose your own reminder date. You do not need to write a diagnosis or other private details here.",
              },
            ]
          : reason === "rejected" || reason === "contact"
            ? [
                {
                  id: "read",
                  title: "Identify the question that is still unanswered",
                  detail:
                    "Ask which requirement needs clarification. Do not assume a request for more paperwork is a final rejection or an appeal decision.",
                },
                {
                  id: "locate",
                  title: "Ask for the requirement in writing",
                  detail:
                    "Ask which document or information is missing, which alternatives are accepted, and whether a deadline applies. The app cannot interpret a notice you have not shared with a qualified helper.",
                },
                {
                  id: "compare",
                  title: "Check any notice or date with a real helper",
                  detail:
                    "If you received a tenancy notice or deadline, seek appropriate provider or legal help promptly. A reminder in this app does not extend a deadline.",
                },
                {
                  id: "ask",
                  title: "Use the question sheet and record the result",
                  detail:
                    "Open an official or provider link yourself. Then record a broad outcome below; you do not need to save names, documents or private case details.",
                },
              ]
            : [
                {
                  id: "read",
                  title:
                    reason === "overwhelmed"
                      ? "Pick just this one item for now"
                      : "Read what the step is asking for",
                  detail:
                    document?.description ??
                    node?.description ??
                    `Review ${title.toLowerCase()}. If the related plan was removed, you can still keep this help note.`,
                },
                {
                  id: "locate",
                  title: "Separate what you have from what you requested",
                  detail:
                    "A paper is ready only when you can access it. Asking for a replacement or calling someone is useful, but is not the same as having it.",
                },
                {
                  id: "compare",
                  title: "Look at what this step needs first",
                  detail: missing.length
                    ? `Still needed: ${missing.map(supportTargetName).join("; ")}. Check the listed alternatives rather than trying to gather every option.`
                    : "There is no unfinished prerequisite for this item in the current checklist. You can prepare it when you are able.",
                },
                {
                  id: "ask",
                  title: "Take a break or ask one specific question",
                  detail:
                    "You can stop and return here. If the instructions are still unclear, use the question sheet to ask a real provider. Your support notes save in this browser.",
                },
              ];
  const hasAlternatives = acceptance.some(
    (rule) => rule.documentIds.length > 1,
  );
  return {
    targetId,
    title,
    reason,
    smallSteps,
    acceptance,
    missing,
    node,
    resources: resourcesForReason(reason, targetId),
    actionable: analysis.actions.some((action) => action.id === targetId),
    completed: analysis.statuses[targetId] === "complete",
    question: hasAlternatives
      ? {
          prompt:
            "If this plan lists a pay stub OR another document, do you need both for that requirement?",
          correct: "one",
          options: [
            { id: "both", label: "Yes, both are required" },
            { id: "one", label: "No, one accepted option is enough" },
          ],
          explanation:
            "One option satisfies that particular OR rule. Other plans may accept different documents, so check each list separately.",
        }
      : {
          prompt:
            "You requested a document but cannot access it yet. Is it ready to mark done?",
          correct: "wait",
          options: [
            { id: "ready", label: "Yes, because I requested it" },
            { id: "wait", label: "No, I need to be able to access it" },
          ],
          explanation:
            "Requesting it is progress toward getting it. Keep the document unchecked until you can access it; record the request as waiting instead.",
        },
  };
}
export function providerQuestionSheet(
  title: string,
  reason: SupportReason,
  record?: SupportRecord,
): string {
  const topic = programs.some((program) =>
    title.toLowerCase().includes(program.shortName.toLowerCase()),
  )
    ? "the paperwork for a housing application"
    : title.toLowerCase();
  const questions = [
    "Which real program serves my area and situation, and how do I apply?",
    `I need help understanding ${topic}. What exactly do you need for that requirement?`,
    "Which other documents can you accept if I cannot get the first one? Please point me to the current written instructions.",
    "Can you help explain the form, or offer language, accessible-format, paper or in-person options?",
    "Is there a deadline I need to act on, and how can I confirm that date?",
    "What should I do next, and who should I contact if I do not hear back?",
  ];
  if (reason === "rejected")
    questions.splice(
      1,
      0,
      "Does this request mean more information is needed, or is it a decision? What are my next steps and any response deadlines?",
    );
  return [
    "BRIDGEBACK — QUESTIONS TO ASK A REAL PROVIDER",
    "",
    "This is a question sheet, not an application or legal advice. Current BridgeBack preparation plans are fictional. Their program names and acceptance rules do not apply to a real provider.",
    "",
    ...(record?.contact
      ? [
          `Contact I selected: ${record.contact.name}`,
          ...(record.contact.phone
            ? [`Listed phone: ${record.contact.phone}`]
            : []),
          `Source: ${record.contact.sourceUrl}`,
          "Confirm the contact information and today's services before relying on it.",
          "",
        ]
      : []),
    "I am trying to understand housing assistance paperwork and would like help with one requirement.",
    ...questions.map((q, i) => `${i + 1}. ${q}`),
    "",
    "You choose what to share with the provider. BridgeBack does not send this sheet or your profile.",
    ...(record
      ? [
          "",
          `Contact status: ${record.outcome}`,
          `My reminder date: ${record.followUpDate || "not set"} (not an agency deadline)`,
        ]
      : []),
  ].join("\n");
}
export function annualIncomeEstimate(
  amount: number,
  frequency: "weekly" | "biweekly" | "semimonthly" | "monthly" | "annual",
) {
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000000)
    throw Error("Enter an amount from 0 to 1,000,000.");
  const multipliers = {
    weekly: 52,
    biweekly: 26,
    semimonthly: 24,
    monthly: 12,
    annual: 1,
  };
  if (!(frequency in multipliers))
    throw Error("Choose a supported pay frequency.");
  const multiplier = multipliers[frequency];
  return {
    annual: Math.round(amount * multiplier * 100) / 100,
    multiplier,
    explanation: `${amount.toLocaleString("en-US", { style: "currency", currency: "USD" })} × ${multiplier} payments = ${(amount * multiplier).toLocaleString("en-US", { style: "currency", currency: "USD" })} per year. This assumes the same amount every time, without missed payments or changes. This is one income source, not necessarily your whole household's income. Use the amount and time period a real provider asks for.`,
  };
}
