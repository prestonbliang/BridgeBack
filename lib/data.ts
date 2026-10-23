import { Requirement, Profile } from "./engine";
const source =
  "Fictional BridgeBack demonstration rules; not an agency requirement";
export const requirements: Requirement[] = [
  {
    id: "identity",
    name: "Prepare identity information",
    description:
      "For this fictional plan, mark identification as available. Do not upload or enter ID numbers.",
    type: "document",
    all: [],
    any: [],
    source,
  },
  {
    id: "paystub",
    name: "Find an accepted pay stub",
    description:
      "One fictional income route. An employer letter is an alternative, not an additional requirement.",
    type: "document",
    all: [],
    any: [],
    source,
  },
  {
    id: "letter",
    name: "Request an employer letter",
    description: "Alternative to a pay stub for this fictional plan.",
    type: "document",
    all: [],
    any: [],
    source,
    difficulty: 2,
  },
  {
    id: "income",
    name: "Income verification",
    description: "Satisfied by either a pay stub OR an employer letter.",
    type: "gate",
    all: [],
    any: ["paystub", "letter"],
    source,
  },
  {
    id: "household",
    name: "Confirm household details",
    description:
      "Review household size and approximate income in Settings, then mark this review complete.",
    type: "task",
    all: [],
    any: [],
    source,
  },
  {
    id: "form",
    name: "Prepare the application form",
    description:
      "Use your identity information and accepted income route to prepare a fictional form. No application is submitted.",
    type: "task",
    all: ["identity", "income"],
    any: [],
    source,
  },
  {
    id: "review",
    name: "Review your preparation checklist",
    description:
      "Check your fictional preparation plan before contacting an official provider.",
    type: "task",
    all: ["form", "household"],
    any: [],
    source,
  },
  {
    id: "ready",
    name: "Ready to contact the provider",
    description:
      "Preparation complete. This is not an eligibility decision or application submission.",
    type: "gate",
    all: ["review"],
    any: [],
    source,
  },
];
export const blankProfile: Profile = {
  household: null,
  income: null,
  location: "Unknown",
  need: "Rent support",
};
export const demos = [
  {
    name: "Missing documentation",
    detail:
      "Identity and household details are ready. Choose one income route.",
    completed: ["identity", "household"],
    profile: {
      household: 2,
      income: 32000,
      location: "San Diego",
      need: "Rent support",
    } as Profile,
  },
  {
    name: "Multiple blockers",
    detail: "Start from the beginning and see which tasks unlock the rest.",
    completed: [],
    profile: {
      household: 1,
      income: 24000,
      location: "San Diego",
      need: "At risk",
    } as Profile,
  },
  {
    name: "Eligibility changes",
    detail:
      "Change income from $70,000 to $30,000 in Settings and compare screening results.",
    completed: ["identity"],
    profile: {
      household: 1,
      income: 70000,
      location: "San Diego",
      need: "Housing search",
    } as Profile,
  },
];
export const resources = [
  {
    name: "San Diego Housing Commission",
    url: "https://www.sdhc.org/",
    description:
      "Visit the official agency for current housing resources and application information.",
    region: "City of San Diego",
  },
  {
    name: "County Housing & Community Development",
    url: "https://www.sandiegocounty.gov/content/sdc/sdhcd.html",
    description:
      "Check the County’s official site for service areas and current programs.",
    region: "San Diego County",
  },
  {
    name: "211 San Diego",
    url: "https://211sandiego.org/",
    description: "Find local referral and support resources directly with 211.",
    region: "San Diego County",
  },
  {
    name: "HUD housing resources",
    url: "https://www.hud.gov/",
    description:
      "Explore federal housing guidance and official local contacts.",
    region: "National",
  },
];
