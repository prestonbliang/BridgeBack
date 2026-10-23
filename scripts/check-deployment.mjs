import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";

const root = new URL("../", import.meta.url);
const catalog = JSON.parse(
  await readFile(new URL("lib/official-catalog.json", root), "utf8"),
);
const input = process.env.BRIDGEBACK_PUBLIC_URL || process.argv[2];
if (!input)
  throw Error(
    "Set BRIDGEBACK_PUBLIC_URL or pass your deployment's HTTPS origin.",
  );
const url = new URL(input);
const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
if (
  (url.protocol !== "https:" &&
    !(process.argv.includes("--local") && local && url.protocol === "http:")) ||
  url.username ||
  url.password ||
  url.pathname !== "/" ||
  url.search ||
  url.hash
)
  throw Error(
    "Use a plain HTTPS origin, without credentials, a path or query. HTTP loopback requires --local.",
  );

const results = [],
  warnings = [];
let release = null;
const expectedRevision = process.env.BRIDGEBACK_EXPECT_REVISION;
if (expectedRevision && !/^[a-f0-9]{40}$/.test(expectedRevision))
  throw Error("Expected revision must be a full Git commit hash.");
if (expectedRevision) {
  const expires = Date.now() + 6 * 60 * 1000;
  console.log(
    "Waiting up to six minutes for the expected Vercel production revision.",
  );
  while (Date.now() < expires) {
    try {
      const response = await fetch(new URL("/api/release", url), {
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const candidate =
        response.ok &&
        response.headers.get("content-type")?.includes("application/json")
          ? await response.json()
          : null;
      if (candidate?.revision === expectedRevision) break;
    } catch {
      /* A rolling deployment can be briefly unavailable. */
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}
async function check(name, run) {
  try {
    await run();
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    // Do not record response bodies, cookies, authorization headers or private data.
    const detail =
      error instanceof assert.AssertionError
        ? error.message.split("\n")[0]
        : error instanceof z.ZodError
          ? "Invalid public response fields: " +
            error.issues
              .map((issue) => issue.path.join(".") + ": " + issue.message)
              .join("; ")
              .slice(0, 1000)
          : "Request failed" +
            (error?.cause?.code
              ? " (" +
                String(error.cause.code)
                  .replace(/[^A-Z0-9_]/g, "")
                  .slice(0, 80) +
                ")"
              : "");
    results.push({ name, passed: false, detail });
    console.error(`FAIL ${name}: ${detail}`);
  }
}
async function get(path, type) {
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(new URL(path, url), {
      redirect: "manual",
      signal: AbortSignal.timeout(45000),
      headers: {
        "User-Agent": "BridgeBack-deployment-check",
        "Cache-Control": "no-cache",
      },
    });
    if (![404, 502, 503].includes(response.status) || attempt === 2) break;
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  assert.equal(
    response.status,
    200,
    `${path}: HTTP ${response.status}; expected 200 after bounded retries. Check the published build and host logs`,
  );
  if (type)
    assert.ok(
      response.headers.get("content-type")?.includes(type),
      `${path}: unexpected content type`,
    );
  return response;
}
let html = "";
await check("Published web revision and guided-contact feature", async () => {
  release = z
    .object({
      schemaVersion: z.literal(1),
      revision: z
        .string()
        .regex(/^[a-f0-9]{40}$/)
        .nullable(),
      workspaceVersion: z.literal(4),
      deploymentId: z
        .string()
        .regex(/^[a-zA-Z0-9_-]{1,160}$/)
        .nullable()
        .default(null),
      catalogVersion: z.literal(catalog.version),
      target: z.literal("web"),
      features: z.array(z.string()),
    })
    .strict()
    .parse(await (await get("/api/release", "application/json")).json());
  assert.ok(
    release.features.includes("guided-contact-workflows"),
    "The deployed app is missing the guided contact workflow",
  );
  if (expectedRevision)
    assert.equal(
      release.revision,
      expectedRevision,
      "Vercel has not published the expected revision; review its build status",
    );
});
await check("Public app, security headers and compiled assets", async () => {
  const response = await get("/", "text/html");
  for (const [key, value] of Object.entries({
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
  }))
    assert.equal(response.headers.get(key), value, `Missing ${key}`);
  assert.ok(
    response.headers
      .get("content-security-policy")
      ?.includes("frame-ancestors 'none'"),
    "Missing production CSP",
  );
  assert.ok(
    response.headers.get("permissions-policy")?.includes("geolocation=()"),
    "Missing permissions policy",
  );
  html = await response.text();
  assert.ok(html.includes("BridgeBack"), "BridgeBack HTML was not served");
  const assets = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="([^" ]+)"/g)]
        .map((m) => m[1].replaceAll("&amp;", "&"))
        .filter((path) => path.startsWith("/_next/static/")),
    ),
  ];
  assert.ok(assets.length > 0, "Missing compiled application assets");
  if (release?.deploymentId)
    assert.ok(
      assets.some(
        (path) =>
          new URL(path, url).searchParams.get("dpl") === release.deploymentId,
      ),
      "Compiled assets are not tagged with the published deployment ID",
    );
  await Promise.all(
    assets.map(async (path) => {
      await get(path);
    }),
  );
});
for (const [path, label] of [
  ["/privacy", "Your paperwork stays with you."],
  ["/notices", "Open-source"],
]) {
  await check(`Public ${path}`, async () => {
    const body = await (await get(path, "text/html")).text();
    assert.ok(
      body.toLowerCase().includes(label.toLowerCase()),
      `${path}: expected page content missing`,
    );
  });
}
await check("Install manifest and icons", async () => {
  const manifest = await (await get("/manifest.webmanifest", "json")).json();
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  for (const size of ["192x192", "512x512"]) {
    const icon = manifest.icons.find((item) => item.sizes === size);
    assert.ok(
      icon?.src?.startsWith("/") && !icon.src.startsWith("//"),
      `Missing local ${size} icon`,
    );
    await get(icon.src, "image/png");
  }
});
await check("Versioned service worker and update headers", async () => {
  const response = await get("/sw.js", "javascript");
  assert.ok(
    response.headers.get("cache-control")?.includes("no-cache"),
    "Worker must be revalidated for updates",
  );
  assert.equal(response.headers.get("service-worker-allowed"), "/");
  const worker = await response.text();
  assert.ok(
    /const RELEASE = "[A-Za-z0-9_-]+";/.test(worker),
    "Missing production build stamp",
  );
  assert.ok(
    worker.includes('self.addEventListener("fetch"'),
    "Worker fetch handler missing",
  );
});
await check(
  "Online source endpoint, catalog coverage and honest timestamps",
  async () => {
    const schema = z
      .object({
        schemaVersion: z.literal(1),
        catalogVersion: z.literal(catalog.version),
        mode: z.literal("online"),
        checkedAt: z.string().datetime(),
        checks: z.array(
          z
            .object({
              sourceId: z.string(),
              checkedAt: z.string().datetime(),
              state: z.enum([
                "matches-reviewed-facts",
                "needs-review",
                "unavailable",
              ]),
              sha256: z
                .string()
                .regex(/^[a-f0-9]{64}$/)
                .nullable(),
              reason: z.string().min(1).max(500),
            })
            .strict(),
        ),
      })
      .strict();
    const report = schema.parse(
      await (await get("/api/source-status", "application/json")).json(),
    );
    assert.deepEqual(
      report.checks.map((c) => c.sourceId).sort(),
      catalog.sources.map((s) => s.id).sort(),
      "Source coverage differs from this checkout",
    );
    assert.ok(
      Date.parse(report.checkedAt) <= Date.now() + 60000,
      "Source check timestamp is in the future",
    );
    if (Date.now() - Date.parse(report.checkedAt) > 15 * 60 * 1000)
      warnings.push(
        "Shared source report is older than 15 minutes. ISR may be refreshing; repeat the check and review the app's stale label.",
      );
    for (const source of report.checks) {
      assert.equal(
        source.checkedAt,
        report.checkedAt,
        "Source timestamp mismatch",
      );
      if (source.state === "matches-reviewed-facts")
        assert.ok(source.sha256, "Matched source has no digest");
      else
        warnings.push(
          `${source.sourceId}: ${source.state}; human review required before promoting this guidance.`,
        );
    }
    // Public content only. No household answers are sent or recorded.
  },
);
for (const warning of warnings) console.warn(`REVIEW ${warning}`);
await mkdir(new URL("artifacts/", root), { recursive: true });
const report = {
  schemaVersion: 1,
  origin: url.origin,
  checkedAt: new Date().toISOString(),
  catalogVersion: catalog.version,
  release,
  transport: local ? "local rehearsal" : "public HTTPS",
  passed: results.every((result) => result.passed),
  results,
  warnings,
  limits:
    "HTTP checks do not establish browser workflows, physical-device installation, agency approval or live housing availability. Run the deployment browser suite separately.",
};
await writeFile(
  new URL("artifacts/deployment-check.json", root),
  JSON.stringify(report, null, 2) + "\n",
);
console.log("Saved artifacts/deployment-check.json");
if (
  !report.passed ||
  (process.argv.includes("--require-matched-sources") && warnings.length)
)
  process.exitCode = 1;
