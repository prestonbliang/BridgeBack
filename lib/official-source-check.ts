import { createHash } from "node:crypto";
import { officialCatalog, type OfficialSource } from "./official-catalog";
export type SourceCheck = {
  sourceId: string;
  checkedAt: string;
  state: "matches-reviewed-facts" | "needs-review" | "unavailable";
  sha256: string | null;
  reason: string;
};
export type SourceCheckReport = {
  schemaVersion: 1;
  catalogVersion: string;
  mode: "online" | "bundled";
  checkedAt: string | null;
  checks: SourceCheck[];
};
export function normalizeOfficialText(html: string): string {
  return html
    .replace(/<!--[^]*?-->/g, " ")
    .replace(/<(script|style)\b[^>]*>[^]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_match, hex, decimal) => {
      const code = parseInt(hex ?? decimal, hex ? 16 : 10);
      return code <= 0x10ffff ? String.fromCodePoint(code) : " ";
    })
    .replace(
      /&nbsp;|&amp;|&quot;|&apos;|&rsquo;|&lsquo;/gi,
      (entity) =>
        ({
          "&nbsp;": " ",
          "&amp;": "&",
          "&quot;": '"',
          "&apos;": "'",
          "&rsquo;": "'",
          "&lsquo;": "'",
        })[entity.toLowerCase()] ?? entity,
    )
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
export function compareOfficialContent(
  source: OfficialSource,
  bytes: Uint8Array,
  checkedAt: string,
): SourceCheck {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const normalized =
    source.format === "html"
      ? normalizeOfficialText(new TextDecoder().decode(bytes))
      : "";
  const conflictingAccess =
    source.id === "county-applications" &&
    /\b(?:wait(?:ing)?\s*lists?\b.{0,100}\b(?:reopen(?:ed|ing)?|(?:is|are|now)\s+(?:now\s+)?open|accepting\s+(?:new\s+)?applications)|(?:now\s+accepting|accepting\s+new)\s+(?:wait(?:ing)?\s*list\s+)?applications)\b/.test(
      normalized,
    );
  const matches =
    !conflictingAccess &&
    (source.format === "pdf"
      ? sha256 === source.sha256
      : source.evidence.every((quote) =>
          normalized.includes(normalizeOfficialText(quote)),
        ));
  return {
    sourceId: source.id,
    checkedAt,
    sha256,
    state: matches ? "matches-reviewed-facts" : "needs-review",
    reason: matches
      ? "The reviewed excerpt is still present (or the reviewed PDF is identical). This does not verify all program rules or available assistance."
      : "A reviewed excerpt is missing or the reviewed PDF changed. A person must review the source; no new eligibility or opening is inferred.",
  };
}
export async function checkOfficialSource(
  source: OfficialSource,
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<SourceCheck> {
  const checkedAt = now.toISOString();
  try {
    // Callers can select only a catalog source, never an arbitrary proxy URL.
    const known = officialCatalog.sources.find(
      (s) => s.id === source.id && s.url === source.url,
    );
    if (!known) throw Error("Unregistered source");
    const url = new URL(source.url);
    if (url.protocol !== "https:" || url.hostname !== "www.sandiegocounty.gov")
      throw Error("Unapproved source host");
    const response = await fetcher(url, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: source.format === "pdf" ? "application/pdf" : "text/html",
        "User-Agent": "BridgeBack-source-check/1.0",
      },
    });
    if (!response.ok || !response.body) throw Error("Source unavailable");
    const type = response.headers.get("content-type") ?? "";
    if (
      !(source.format === "pdf"
        ? type.includes("application/pdf")
        : type.includes("text/html"))
    )
      throw Error("Unexpected source format");
    const size = Number(response.headers.get("content-length") ?? 0);
    const maxBytes = (source.format === "pdf" ? 4 : 2) * 1024 * 1024;
    if (size > maxBytes) {
      await response.body.cancel();
      throw Error("Source exceeds review limit");
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw Error("Source exceeds review limit");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return compareOfficialContent(source, bytes, checkedAt);
  } catch {
    return {
      sourceId: source.id,
      checkedAt,
      sha256: null,
      state: "unavailable",
      reason:
        "The source could not be checked. Saved guidance was preserved; no current availability is confirmed.",
    };
  }
}
export async function checkOfficialCatalog(
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<SourceCheckReport> {
  // Small, fixed catalog; no applicant data or caller-supplied URLs are accepted.
  const checks = await Promise.all(
    officialCatalog.sources.map((s) => checkOfficialSource(s, fetcher, now)),
  );
  return {
    schemaVersion: 1,
    catalogVersion: officialCatalog.version,
    mode: "online",
    checkedAt: now.toISOString(),
    checks,
  };
}
