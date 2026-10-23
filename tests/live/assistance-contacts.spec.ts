import { it, expect } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { assistanceContacts } from "../../lib/assistance";
import { normalizeOfficialText } from "../../lib/official-source-check";

it("checks the reviewed contact excerpts rather than treating HTTP 200 as verification", async () => {
  const checkedAt = new Date().toISOString();
  const results = await Promise.all(
    assistanceContacts.map(async (contact) => {
      try {
        const response = await fetch(contact.sourceUrl, {
          redirect: "error",
          signal: AbortSignal.timeout(12000),
          cache: "no-store",
        });
        if (
          !response.ok ||
          !response.body ||
          !response.headers.get("content-type")?.includes("text/html")
        )
          throw Error("Unavailable");
        const reader = response.body.getReader(),
          chunks: Uint8Array[] = [];
        let count = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          count += value.byteLength;
          if (count > 2 * 1024 * 1024) {
            await reader.cancel();
            throw Error("Review limit exceeded");
          }
          chunks.push(value);
        }
        const bytes = Buffer.concat(chunks);
        const text = normalizeOfficialText(bytes.toString());
        const matches =
          text.includes(normalizeOfficialText(contact.excerpt)) &&
          (!contact.tty || text.includes(contact.tty));
        return {
          id: contact.id,
          sourceUrl: contact.sourceUrl,
          checkedAt,
          status: matches ? "matches-reviewed-contact" : "needs-review",
          sha256: createHash("sha256").update(bytes).digest("hex"),
        };
      } catch {
        return {
          id: contact.id,
          sourceUrl: contact.sourceUrl,
          checkedAt,
          status: "unavailable",
          sha256: null,
        };
      }
    }),
  );
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    "artifacts/assistance-contact-audit.json",
    JSON.stringify(
      {
        checkedAt,
        results,
        limits:
          "Reviewed contact excerpts only. Not live services, a promised response, availability or an agency partnership.",
      },
      null,
      2,
    ) + "\n",
  );
  for (const result of results) console.log(`${result.id}: ${result.status}`);
  expect(
    results.filter((r) => r.status !== "matches-reviewed-contact"),
  ).toEqual([]);
});
