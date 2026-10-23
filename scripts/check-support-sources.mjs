import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
const catalog = await readFile(
  new URL("../lib/support-resources.ts", import.meta.url),
  "utf8",
);
const urls = [
  ...new Set(
    [...catalog.matchAll(/url:\s*"(https:[^"]+)"/g)].map((match) => match[1]),
  ),
];
if (!urls.length)
  throw Error("No support source URLs found. No report was written.");
const checkedAt = new Date().toISOString();
const checks = await Promise.all(
  urls.map(async (url) => {
    let httpStatus = null,
      status = "network-error";
    try {
      const response = await run("curl", [
        "--silent",
        "--show-error",
        "--location",
        "--max-time",
        "15",
        "--output",
        "/dev/null",
        "--write-out",
        "%{http_code}",
        url,
      ]);
      httpStatus = Number(response.stdout) || null;
      status =
        httpStatus >= 200 && httpStatus < 400
          ? "reachable"
          : httpStatus === 403
            ? "access-denied"
            : "http-error";
    } catch (error) {
      httpStatus = Number(error.stdout) || null;
      if (httpStatus === 403 || String(error.stderr).includes("403"))
        status = "access-denied";
    }
    return { url, checkedAt, httpStatus, status };
  }),
);
await writeFile(
  new URL("../lib/support-source-checks.json", import.meta.url),
  JSON.stringify(checks, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      checked: checks.length,
      reachable: checks.filter((item) => item.status === "reachable").length,
      results: checks.map(({ url, status }) => ({ url, status })),
      note: "Reachability is not source-content review, current availability, or verification of any program rule.",
    },
    null,
    2,
  ),
);
if (checks.some((item) => item.status !== "reachable")) process.exitCode = 1;
