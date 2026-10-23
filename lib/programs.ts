import type { Requirement } from "./engine";

export type Source = {
  label: string;
  kind: "fictional" | "verified";
  url?: string;
  verifiedAt: string | null;
};
export type DocumentType = { id: string; name: string; description: string };
export type AcceptanceRule = {
  id: string;
  name: string;
  documentIds: string[];
  description: string;
};
export type Program = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  source: Source;
  screening: { incomeBase: number; increment: number; location: "San Diego" };
  accepts: AcceptanceRule[];
  tasks: Requirement[];
  milestones: string[];
};
export const fictionalSource: Source = {
  label: "BridgeBack fictional competition fixture — not an agency rule",
  kind: "fictional",
  verifiedAt: null,
};
export const documentTypes: DocumentType[] = [
  {
    id: "identity",
    name: "Identity document",
    description:
      "Track availability only. Never enter an ID number or upload a document.",
  },
  {
    id: "paystub",
    name: "Pay stub",
    description:
      "A fictional accepted income route for Fresh Start and Harbor. Not accepted by every sample program.",
  },
  {
    id: "letter",
    name: "Employer letter",
    description:
      "A fictional income route accepted by Fresh Start and Keys, but not Harbor.",
  },
  {
    id: "residence",
    name: "Proof of residence",
    description:
      "A shared document route explicitly accepted by Harbor and Keys in this demonstration.",
  },
  {
    id: "benefits",
    name: "Benefits statement",
    description:
      "An alternative income route accepted by Harbor and Keys in this demonstration.",
  },
];
const task = (
  id: string,
  name: string,
  description: string,
  all: string[],
  type: Requirement["type"] = "task",
): Requirement => ({
  id,
  name,
  description,
  type,
  all,
  any: [],
  source: fictionalSource.label,
});
export const programs: Program[] = [
  {
    id: "fresh",
    name: "Fresh Start Housing Preparation",
    shortName: "Fresh Start",
    description:
      "Practice preparing identity, income and household information for a fictional housing application.",
    source: fictionalSource,
    screening: { incomeBase: 48000, increment: 8000, location: "San Diego" },
    accepts: [
      {
        id: "identity",
        name: "Identity verification",
        documentIds: ["identity"],
        description:
          "This fictional plan accepts the identity document listed here.",
      },
      {
        id: "income",
        name: "Income verification",
        documentIds: ["paystub", "letter"],
        description:
          "Either a pay stub OR an employer letter. One accepted route is enough.",
      },
    ],
    tasks: [
      task(
        "household",
        "Confirm household details",
        "Review household information; unknown income can remain unknown.",
        [],
      ),
      task(
        "form",
        "Prepare the Fresh Start form",
        "Use the accepted identity and income route to prepare this fictional form.",
        ["identity", "income"],
      ),
      task(
        "review",
        "Review the Fresh Start checklist",
        "Check the form and household information before contacting a provider.",
        ["form", "household"],
      ),
      task(
        "ready",
        "Fresh Start preparation ready",
        "Preparation only; no application is submitted and acceptance is never guaranteed.",
        ["review"],
        "gate",
      ),
    ],
    milestones: ["identity", "income", "household", "form", "review"],
  },
  {
    id: "harbor",
    name: "Harbor Rental Preparation",
    shortName: "Harbor",
    description:
      "A fictional rental-support preparation plan that accepts a pay stub or benefits statement, plus residence information.",
    source: fictionalSource,
    screening: { incomeBase: 42000, increment: 7000, location: "San Diego" },
    accepts: [
      {
        id: "identity",
        name: "Identity verification",
        documentIds: ["identity"],
        description:
          "The same identity document is explicitly accepted in this sample plan.",
      },
      {
        id: "income",
        name: "Income verification",
        documentIds: ["paystub", "benefits"],
        description:
          "Either a pay stub OR a benefits statement. An employer letter is not accepted by this fictional rule.",
      },
      {
        id: "residence",
        name: "Residence verification",
        documentIds: ["residence"],
        description:
          "Prepare the residence document for this fictional requirement.",
      },
    ],
    tasks: [
      task(
        "form",
        "Prepare the Harbor form",
        "Identity and income information unlock this fictional form.",
        ["identity", "income"],
      ),
      task(
        "review",
        "Review the Harbor checklist",
        "Review the form alongside residence information.",
        ["form", "residence"],
      ),
      task(
        "ready",
        "Harbor preparation ready",
        "A preparation milestone, not a benefit approval.",
        ["review"],
        "gate",
      ),
    ],
    milestones: ["identity", "income", "residence", "form", "review"],
  },
  {
    id: "keys",
    name: "Keys Housing Search Preparation",
    shortName: "Keys",
    description:
      "A fictional housing-search plan using residence information and either an employer letter or benefits statement.",
    source: fictionalSource,
    screening: { incomeBase: 54000, increment: 9000, location: "San Diego" },
    accepts: [
      {
        id: "income",
        name: "Income verification",
        documentIds: ["letter", "benefits"],
        description:
          "Either an employer letter OR a benefits statement. A pay stub is not accepted by this fictional rule.",
      },
      {
        id: "residence",
        name: "Residence verification",
        documentIds: ["residence"],
        description:
          "The residence document is explicitly accepted by this sample plan.",
      },
    ],
    tasks: [
      task(
        "preferences",
        "Choose housing-search priorities",
        "Decide which housing needs to discuss with a provider; do not enter sensitive details.",
        [],
      ),
      task(
        "form",
        "Prepare the Keys request",
        "Use the accepted income and residence route to prepare this fictional request.",
        ["income", "residence"],
      ),
      task(
        "review",
        "Review the Keys checklist",
        "Check your request against your chosen housing-search priorities.",
        ["form", "preferences"],
      ),
      task(
        "ready",
        "Keys preparation ready",
        "Preparation does not guarantee eligibility or housing availability.",
        ["review"],
        "gate",
      ),
    ],
    milestones: ["income", "residence", "preferences", "form", "review"],
  },
];
