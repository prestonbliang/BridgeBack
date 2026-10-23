/** A curated referral registry, not eligibility data or a live availability feed.
 * Some pages remain inaccessible; reviewedAt is set only after reading a page.
 * Never promote these links into verified program acceptance rules. */
export type SupportResource = {
  id: string;
  name: string;
  organization: string;
  purpose: string;
  url: string;
  phone?: string;
  kind: "official-agency" | "service-provider";
  topics: ("documents" | "referral" | "rights" | "counseling" | "learning")[];
  ask: string;
  reviewedAt: string | null;
};
export const supportResources: SupportResource[] = [
  {
    id: "211",
    name: "Ask where to get local help",
    organization: "211 San Diego",
    purpose:
      "Ask about local housing referrals and help finding the right organization. Ask whether language assistance is available.",
    url: "https://211sandiego.org/",
    phone: "211",
    kind: "service-provider",
    topics: ["referral", "documents"],
    ask: "Which local organization can help me understand housing paperwork or get missing documents?",
    reviewedAt: null,
  },
  {
    id: "sdhc",
    phone: "619-231-9400",
    name: "Check City of San Diego housing information",
    organization: "San Diego Housing Commission",
    purpose:
      "Use the agency website to ask about its current programs, service area and application instructions.",
    url: "https://sdhc.org/about-us/contact-us/",
    kind: "official-agency",
    topics: ["referral", "documents"],
    ask: "Which program serves my situation, and where can I get its current document checklist?",
    reviewedAt: "2026-10-23",
  },
  {
    id: "county",
    phone: "858-694-4801",
    name: "Check County housing information",
    organization: "County of San Diego",
    purpose:
      "Use the County's housing website to check service areas and ask about current application instructions.",
    url: "https://www.sandiegocounty.gov/content/sdc/sdhcd.html",
    kind: "official-agency",
    topics: ["referral", "documents"],
    ask: "Does your program cover my area, and who can explain the application requirements?",
    reviewedAt: "2026-10-22",
  },
  {
    id: "counselor",
    name: "Look for a housing counselor",
    organization: "Consumer Financial Protection Bureau",
    purpose:
      "Open the CFPB's counselor finder. Confirm services, any fees, language support and appointments with the organization you choose.",
    url: "https://www.consumerfinance.gov/find-a-housing-counselor/",
    kind: "official-agency",
    topics: ["counseling", "referral"],
    ask: "Can you help me understand housing options or application paperwork? What should I bring, and is there a fee?",
    reviewedAt: "2026-10-22",
  },
  {
    id: "money-tools",
    name: "Read about income and money paperwork",
    organization: "Consumer Financial Protection Bureau",
    purpose:
      "Explore the Your Money, Your Goals toolkit for financial education. It is separate from any housing program's document rules.",
    url: "https://www.consumerfinance.gov/consumer-tools/educator-tools/your-money-your-goals/toolkit/",
    kind: "official-agency",
    topics: ["learning", "documents"],
    ask: "Which income records should I keep, and how can I understand the amounts on them?",
    reviewedAt: "2026-10-22",
  },
  {
    id: "replace-documents",
    name: "Find official replacement-document information",
    organization: "USA.gov",
    purpose:
      "Use official guidance to find the issuing agency for a lost document. Ask the housing provider what it accepts while you are replacing it.",
    url: "https://www.usa.gov/replace-vital-documents",
    kind: "official-agency",
    topics: ["documents", "learning"],
    ask: "What is the official replacement process, and what alternatives can the housing provider accept while I wait?",
    reviewedAt: "2026-10-22",
  },
  {
    id: "legal-aid",
    phone: "1-877-534-2524",
    name: "Ask about tenant or eviction-related help",
    organization: "Legal Aid Society of San Diego",
    purpose:
      "If a notice or deadline concerns your tenancy, use this provider's website to ask about legal assistance. Confirm current services and eligibility directly.",
    url: "https://www.lassd.org/",
    kind: "service-provider",
    topics: ["rights", "referral"],
    ask: "I have a housing notice or deadline. Can someone explain it, or refer me to the right legal help?",
    reviewedAt: "2026-10-22",
  },
];
export function resourcesForReason(
  reason: string,
  targetId: string,
): SupportResource[] {
  const ids =
    reason === "rejected"
      ? ["sdhc", "counselor", "211"]
      : reason === "access" || reason === "contact"
        ? ["211", "counselor", "sdhc"]
        : targetId === "doc:identity"
          ? ["replace-documents", "211", "sdhc"]
          : reason === "understand"
            ? ["money-tools", "counselor", "211"]
            : ["211", "sdhc", "county"];
  return ids.map((id) =>
    supportResources.find((resource) => resource.id === id)!,
  );
}
