import { z } from "zod";
import rawCatalog from "./official-catalog.json";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
    "Invalid calendar date",
  );
const officialUrl = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "www.sandiegocounty.gov" &&
      !url.username &&
      !url.password
    );
  }, "A reviewed County HTTPS source is required");
export const officialSourceSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    url: officialUrl,
    reviewedAt: date,
    reviewAfterDays: z.number().int().min(1).max(90),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    format: z.enum(["html", "pdf"]),
    evidence: z.array(z.string().min(10)).min(1),
  })
  .strict();
export const officialProgramSchema = z
  .object({
    id: z.enum(["county-hcv", "county-public", "county-vash"]),
    name: z.string(),
    organization: z.string(),
    description: z.string(),
    category: z.string(),
    coverage: z.string(),
    sourceIds: z.array(z.string()).min(1),
    eligibility: z.enum(["hcv", "public-housing", "referral"]),
    availability: z
      .object({
        kind: z.enum(["closed", "referral"]),
        sourceId: z.string(),
        detail: z.string(),
        closedOn: date.optional(),
      })
      .strict(),
    contactPhone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/),
    contactUrl: officialUrl,
    documentNote: z.string(),
    cautions: z.array(z.string()).min(1),
  })
  .strict();
export const officialCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    version: z.string(),
    reviewedAt: date,
    incomeTable: z
      .object({
        sourceId: z.string(),
        effectiveOn: date,
        year: z.number().int(),
        percentOfAmi: z.literal(50),
        values: z.array(z.number().int().positive()).length(8),
        values80: z.array(z.number().int().positive()).length(8),
      })
      .strict(),
    sources: z.array(officialSourceSchema).min(1),
    programs: z.array(officialProgramSchema).min(1),
  })
  .strict()
  .superRefine((catalog, ctx) => {
    const ids = new Set(catalog.sources.map((s) => s.id));
    if (
      ids.size !== catalog.sources.length ||
      new Set(catalog.programs.map((p) => p.id)).size !==
        catalog.programs.length
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate catalog identifier",
      });
    for (const program of catalog.programs) {
      if (
        [...program.sourceIds, program.availability.sourceId].some(
          (id) => !ids.has(id),
        ) ||
        !program.sourceIds.includes(program.availability.sourceId)
      )
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Unattributed program fact",
        });
    }
    if (!ids.has(catalog.incomeTable.sourceId))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Income table lacks a source",
      });
  });
export const officialCatalog = officialCatalogSchema.parse(rawCatalog);
export type OfficialProgram = z.infer<typeof officialProgramSchema>;
export type OfficialProgramId = OfficialProgram["id"];
export type OfficialSource = z.infer<typeof officialSourceSchema>;
export const officialProgramIdSchema = officialProgramSchema.shape.id;
export function officialSource(id: string) {
  const source = officialCatalog.sources.find((source) => source.id === id);
  if (!source) throw Error("Unknown official source");
  return source;
}
export function sourceNeedsReview(
  source: OfficialSource,
  now = Date.now(),
): boolean {
  const reviewed = Date.parse(`${source.reviewedAt}T00:00:00Z`);
  return (
    !Number.isFinite(now) ||
    now < reviewed ||
    now - reviewed > source.reviewAfterDays * 86400000
  );
}
export const countyServedCities = [
  "Chula Vista",
  "Coronado",
  "Del Mar",
  "El Cajon",
  "Escondido",
  "Imperial Beach",
  "La Mesa",
  "Lemon Grove",
  "Poway",
  "San Marcos",
  "Santee",
  "Solana Beach",
  "Vista",
  "Unincorporated San Diego County",
] as const;
export const municipalitySchema = z.enum([
  "Unknown",
  "City of San Diego",
  ...countyServedCities,
  "Carlsbad",
  "Encinitas",
  "National City",
  "Oceanside",
  "Outside San Diego County",
]);
export type Municipality = z.infer<typeof municipalitySchema>;
