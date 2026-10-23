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
  label: "Made-up BridgeBack programs for practice; not agency rules",
  kind: "fictional",
  verifiedAt: null,
};
export const documentTypes: DocumentType[] = [
  {
    id: "identity",
    name: "Identity document",
    description:
      "A document that shows who you are, such as photo ID. Just check whether you have one; never enter an ID number or upload a file here.",
  },
  {
    id: "paystub",
    name: "Pay stub",
    description:
      "The statement you get with a paycheck, usually showing your earnings and deductions. Fresh Start and Harbor accept it as income proof in these examples.",
  },
  {
    id: "letter",
    name: "Employer letter",
    description:
      "A letter from your employer about your work and pay. Fresh Start and Keys accept it in these examples; Harbor does not.",
  },
  {
    id: "residence",
    name: "Proof of residence",
    description:
      "Paperwork showing where you live. The Harbor and Keys examples both need it. A real provider decides which address documents count.",
  },
  {
    id: "benefits",
    name: "Benefits statement",
    description:
      "A letter or statement showing benefits you receive. The Harbor and Keys examples accept it instead of another listed income document.",
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
          "Have your identity document ready. This practice rule does not check or upload the actual document.",
      },
      {
        id: "income",
        name: "Income verification",
        documentIds: ["paystub", "letter"],
        description:
          "Have a pay stub or an employer letter ready. Either one meets this sample rule; you do not need both.",
      },
    ],
    tasks: [
      task(
        "household",
        "Confirm household details",
        "Check your household size and approximate yearly income in Settings. Leave income blank if you do not know it; this step does not require an exact amount.",
        [],
      ),
      task(
        "form",
        "Prepare the Fresh Start form",
        "For this practice step, check that your ID and one accepted income document are ready. There is no real Fresh Start application form to send from this app.",
        ["identity", "income"],
      ),
      task(
        "review",
        "Review the Fresh Start checklist",
        "Review the items you marked ready and your household details. Correct any mistakes before treating this practice checklist as finished.",
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
          "Have your identity document ready. The same document also counts for the Fresh Start example.",
      },
      {
        id: "income",
        name: "Income verification",
        documentIds: ["paystub", "benefits"],
        description:
          "Have a pay stub or a benefits statement ready. You only need one. This sample rule does not accept an employer letter.",
      },
      {
        id: "residence",
        name: "Residence verification",
        documentIds: ["residence"],
        description:
          "Have your proof of address ready. Keep the actual paper or file with you; do not upload it here.",
      },
    ],
    tasks: [
      task(
        "form",
        "Prepare the Harbor form",
        "Once your ID and one accepted income document are ready, check off this practice form step. There is no real Harbor form to send from this app.",
        ["identity", "income"],
      ),
      task(
        "review",
        "Review the Harbor checklist",
        "Check your form preparation and proof of address. Uncheck any document you no longer have before marking the review done.",
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
          "Have an employer letter or a benefits statement ready. You only need one. A pay stub does not meet this sample rule.",
      },
      {
        id: "residence",
        name: "Residence verification",
        documentIds: ["residence"],
        description:
          "Have your proof of address ready. The same document also counts for the Harbor example.",
      },
    ],
    tasks: [
      task(
        "preferences",
        "Choose housing-search priorities",
        "Think about what you need from a home, such as location or accessibility, so you can explain it to a provider. You do not need to write personal details here.",
        [],
      ),
      task(
        "form",
        "Prepare the Keys request",
        "Check that your proof of address and one accepted income document are ready. This is a practice request; nothing is sent to an agency.",
        ["income", "residence"],
      ),
      task(
        "review",
        "Review the Keys checklist",
        "Review your prepared documents and the housing needs you want to discuss. Correct anything missing before marking this practice review done.",
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
