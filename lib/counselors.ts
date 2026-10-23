import { z } from "zod";
import snapshot from "./counselor-snapshot.json";
const counselorSchema = z.object({
  id: z.string().regex(/^hud-\d+$/),
  name: z.string().min(1).max(300),
  phone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/),
  address: z.string().min(1),
  languages: z.array(z.string()),
  services: z.array(z.string()),
  methods: z.array(z.string()),
  distanceMiles: z.number().finite().min(0),
});
export const counselorSnapshot = z
  .object({
    schemaVersion: z.literal(1),
    sourceUrl: z.literal(
      "https://www.consumerfinance.gov/find-a-housing-counselor/?zipcode=92101",
    ),
    centerZip: z.literal("92101"),
    retrievedAt: z.string().datetime(),
    counselors: z
      .array(counselorSchema)
      .min(1)
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
      ),
  })
  .parse(snapshot);
export type Counselor = z.infer<typeof counselorSchema>;
export function filterCounselors(
  {
    language = "all",
    service = "rental",
    maxMiles = 25,
  }: {
    language?: string;
    service?: "rental" | "all";
    maxMiles?: number;
  } = {},
  dataset: Counselor[] = counselorSnapshot.counselors,
): Counselor[] {
  if (!Number.isFinite(maxMiles) || maxMiles < 0)
    throw Error("Choose a nonnegative distance.");
  return dataset
    .filter(
      (item) =>
        item.distanceMiles <= maxMiles &&
        (language === "all" || item.languages.includes(language)) &&
        (service === "all" ||
          item.services.some((value) => value === "Rental Housing Counseling")),
    )
    .sort(
      (a, b) => a.distanceMiles - b.distanceMiles || a.id.localeCompare(b.id),
    );
}
