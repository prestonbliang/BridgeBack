import { z } from "zod";
import { officialCatalog } from "./official-catalog";
const sourceIds = new Set(officialCatalog.sources.map((s) => s.id));
export const sourceCheckSchema = z
  .object({
    sourceId: z.string().regex(/^[a-z0-9-]{1,80}$/),
    checkedAt: z.string().datetime(),
    state: z.enum(["matches-reviewed-facts", "needs-review", "unavailable"]),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    reason: z.string().min(1).max(500),
  })
  .strict()
  .superRefine((check, ctx) => {
    if (check.state === "matches-reviewed-facts" && check.sha256 === null)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A matched source requires a content digest",
      });
  });
export const sourceReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    catalogVersion: z.string().max(100),
    mode: z.enum(["online", "bundled"]),
    checkedAt: z.string().datetime().nullable(),
    checks: z.array(sourceCheckSchema).max(100),
  })
  .strict()
  .superRefine((report, ctx) => {
    if (
      new Set(report.checks.map((c) => c.sourceId)).size !==
      report.checks.length
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate source check",
      });
    if (
      report.mode === "online" &&
      (!report.checkedAt ||
        report.checks.some((c) => c.checkedAt !== report.checkedAt) ||
        (report.catalogVersion === officialCatalog.version &&
          (report.checks.length !== sourceIds.size ||
            report.checks.some((c) => !sourceIds.has(c.sourceId)))))
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Incomplete online source check",
      });
    if (
      report.mode === "bundled" &&
      (report.checkedAt !== null || report.checks.length)
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bundled data cannot claim a live check",
      });
  });
export type SourceReport = z.infer<typeof sourceReportSchema>;
export function freshSourceReport(
  report: SourceReport | null | undefined,
  online: boolean,
  now = Date.now(),
) {
  if (
    !report ||
    !online ||
    report.mode !== "online" ||
    report.catalogVersion !== officialCatalog.version ||
    !report.checkedAt
  )
    return false;
  const age = now - Date.parse(report.checkedAt);
  return age >= -60000 && age <= 15 * 60 * 1000;
}
