import type { Profile } from "./engine";
import { profileSchema } from "./engine";
import {
  countyServedCities,
  officialCatalog,
  officialSource,
  sourceNeedsReview,
  type OfficialProgram,
} from "./official-catalog";
export type OfficialScreening = {
  result:
    "Potentially eligible" | "More information needed" | "Likely ineligible";
  reasons: string[];
  sourceIds: string[];
  limit: number | null;
  scope: string;
};
/** Incomplete or conflicting published rules must never be converted into a denial. */
export function screenOfficialProgram(
  program: OfficialProgram,
  input: Profile,
  now = Date.now(),
  changedSources: string[] = [],
): OfficialScreening {
  const profile = profileSchema.parse(input);
  const relevant =
    program.eligibility === "public-housing"
      ? [
          "county-public",
          "county-public-policy",
          "county-income",
          "county-areas",
        ]
      : program.sourceIds;
  const base = {
    sourceIds: relevant,
    limit: null as number | null,
    scope:
      "Partial published-criteria comparison; not an agency eligibility decision.",
  };
  if (
    relevant.some(
      (id) =>
        changedSources.includes(id) ||
        sourceNeedsReview(officialSource(id), now),
    )
  )
    return {
      ...base,
      result: "More information needed",
      reasons: [
        "A source changed or its BridgeBack review period expired. Confirm the published criteria with the agency before relying on this comparison.",
      ],
    };
  if (program.eligibility !== "public-housing")
    return {
      ...base,
      result: "More information needed",
      reasons:
        program.eligibility === "hcv"
          ? [
              "The County determines HCV eligibility after waiting-list selection. Income categories, exceptions and other agency checks are not fully modeled here.",
              "Living outside the County authority’s service area is not an automatic HCV disqualification. Check the authority for your city and any portability or preference rules.",
            ]
          : [
              "The VA must assess the applicable veteran, housing and referral requirements. BridgeBack does not collect military or medical records.",
            ],
    };
  const reasons: string[] = [
    "AMI means area median income, a local income benchmark. Published limits depend on household size; this is not the amount you must spend on rent.",
  ];
  const municipality = profile.municipality ?? "Unknown";
  if (municipality === "Unknown")
    reasons.push(
      "Choose your city or unincorporated area to identify the housing authority. “San Diego” alone does not establish jurisdiction.",
    );
  else if ((countyServedCities as readonly string[]).includes(municipality))
    reasons.push(
      `${municipality} is in the published County service area. The agency must confirm any residency/work preference.`,
    );
  else
    reasons.push(
      `${municipality} is outside the County authority’s listed jurisdiction. Its Public Housing policy treats residency as a preference and includes applicants without that preference, so this does not automatically mean you are ineligible. Ask HACSD and your city’s authority about the applicable route.`,
    );
  let limit: number | null = null;
  if (profile.household === null || profile.income === null)
    reasons.push(
      "Household size and approximate annual gross income would allow a comparison with the published income table. They are optional.",
    );
  else if (profile.household > officialCatalog.incomeTable.values.length)
    reasons.push(
      "The reviewed table lists only households of one through eight. BridgeBack does not extrapolate a limit for a larger household.",
    );
  else if (
    now < Date.parse(officialCatalog.incomeTable.effectiveOn + "T00:00:00Z")
  )
    reasons.push(
      "The reviewed income table is not yet effective on this date.",
    );
  else {
    limit = officialCatalog.incomeTable.values[profile.household - 1];
    const upper = officialCatalog.incomeTable.values80[profile.household - 1];
    reasons.push(
      `For ${profile.household} ${profile.household === 1 ? "person" : "people"}, the published 2026 table gives $${limit.toLocaleString("en-US")} at 50% AMI and $${upper.toLocaleString("en-US")} at 80% AMI. Your approximate annual income is ${profile.income <= limit ? "at or below both figures" : profile.income <= upper ? "above the 50% figure and at or below the 80% figure" : "above both figures"}. The agency determines countable income and any applicable exceptions.`,
    );
  }
  reasons.push(
    "Published sources conflict: the program overview states a 50%-AMI ceiling and a residence requirement; the admissions policy (2-1 and 4-4–4-5) describes an 80%-AMI limit and residency preferences. Ask HACSD which applies to your case. BridgeBack does not turn this conflict into a positive or negative eligibility decision.",
    "Other household, admission and verification conditions still need agency review. No citizenship, military, medical, disability or identity records are requested here.",
  );
  return { ...base, result: "More information needed", limit, reasons };
}
