import { z } from "zod";
export const COUNSELOR_SOURCE =
  "https://www.consumerfinance.gov/find-a-housing-counselor/?zipcode=92101";
const agency = z.object({
  agcid: z.string().regex(/^\d+$/),
  nme: z.string().trim().min(1).max(300),
  phone1: z.string().regex(/^\d{3}-\d{3}-\d{4}$/),
  adr1: z.string(),
  adr2: z.string().nullable().optional(),
  city: z.string(),
  statecd: z.string(),
  zipcd: z.string(),
  languages: z.array(z.string().min(1)).min(1),
  services: z.array(z.string().min(1)).min(1),
  distance: z.number().finite().min(0).max(5000),
  counslg_METHOD: z.string(),
});
/** Extract only the JSON assignment, never execute scripts from an external page. */
export function parseCounselorPage(html, retrievedAt) {
  z.string().datetime().parse(retrievedAt);
  const markers = [
    ...html.matchAll(/window\.cfpbHudSettings\.hud_data\s*=\s*/g),
  ];
  const marker = markers[markers.length - 1];
  if (!marker)
    throw Error(
      "The official page no longer contains the expected data. The saved directory must be retained.",
    );
  const start = marker.index + marker[0].length;
  if (html[start] !== "{") throw Error("Counselor data is not a JSON object.");
  let depth = 0,
    inString = false,
    escaped = false,
    end = -1;
  for (let index = start; index < html.length; index++) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) {
      end = index + 1;
      break;
    }
  }
  if (end < 0) throw Error("Incomplete counselor data.");
  const raw = z
    .object({
      zip: z.object({ zipcode: z.literal("92101") }),
      counseling_agencies: z.array(agency).min(1).max(100),
    })
    .parse(JSON.parse(html.slice(start, end)));
  if (
    new Set(raw.counseling_agencies.map((item) => item.agcid)).size !==
    raw.counseling_agencies.length
  )
    throw Error("Duplicate agency identifiers.");
  return {
    schemaVersion: 1,
    sourceUrl: COUNSELOR_SOURCE,
    centerZip: "92101",
    retrievedAt,
    counselors: raw.counseling_agencies.map((item) => ({
      id: `hud-${item.agcid}`,
      name: item.nme,
      phone: item.phone1,
      address: [
        item.adr1,
        item.adr2,
        `${item.city}, ${item.statecd} ${item.zipcd}`,
      ]
        .filter(Boolean)
        .join(", "),
      languages: item.languages,
      services: item.services,
      methods: item.counslg_METHOD
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      distanceMiles: Math.round(item.distance * 10) / 10,
    })),
  };
}
