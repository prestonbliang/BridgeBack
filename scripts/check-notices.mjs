import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url);
const lock = await readFile(new URL("package-lock.json", root), "utf8");
const notices = JSON.parse(
  await readFile(new URL("lib/dependency-notices.json", root), "utf8"),
);
if (notices.lockSha256 !== createHash("sha256").update(lock).digest("hex"))
  throw Error(
    "Dependency notices are stale. Run npm run notices:generate and review the changed licenses.",
  );
const manifest = JSON.parse(
  await readFile(new URL("package.json", root), "utf8"),
);
const packages = JSON.parse(lock).packages;
for (const name of Object.keys(manifest.dependencies)) {
  const version = packages[`node_modules/${name}`].version;
  if (
    !notices.entries.some(
      (entry) =>
        entry.name === name &&
        entry.version === version &&
        entry.text.length > 100,
    )
  )
    throw Error(`Missing direct dependency license: ${name}@${version}`);
}
console.log(
  "Dependency notices match the locked source tree and cover all direct runtime dependencies.",
);
