import { it, expect } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { checkOfficialCatalog } from "../../lib/official-source-check";
it("checks reviewed excerpts against the current official pages without promoting changed rules", async () => {
  const report = await checkOfficialCatalog();
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    "artifacts/official-source-audit.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  for (const check of report.checks)
    console.log(`${check.sourceId}: ${check.state}`);
  expect(
    report.checks
      .filter((c) => c.state !== "matches-reviewed-facts")
      .map((c) => ({ source: c.sourceId, state: c.state })),
  ).toEqual([]);
});
