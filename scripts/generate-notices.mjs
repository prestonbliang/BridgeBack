import { readFile, writeFile, readdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url);
const lockText = await readFile(new URL("package-lock.json", root), "utf8");
const lock = JSON.parse(lockText);
const entries = [];
const seen = new Set();
const missingTexts = [];
const excludedBuildOnly = [];
for (const [path, record] of Object.entries(lock.packages)) {
  if (!path || record.dev) continue;
  const dir = new URL(`${path}/`, root);
  try {
    await access(new URL("package.json", dir));
  } catch {
    continue;
  }
  const meta = JSON.parse(await readFile(new URL("package.json", dir), "utf8"));
  const key = `${meta.name}@${meta.version}`;
  if (seen.has(key)) continue;
  seen.add(key);
  // Build/server binaries and this empty browser marker are not copied into the
  // exported front end or iOS web bundle; retain a separate source inventory.
  if (
    meta.name.startsWith("@img/sharp-libvips-") ||
    meta.name.startsWith("@next/swc-") ||
    meta.name === "@next/env" ||
    meta.name === "client-only"
  ) {
    excludedBuildOnly.push({
      name: meta.name,
      version: meta.version,
      license: meta.license ?? record.license,
    });
    continue;
  }
  const files = (await readdir(dir))
    .filter((name) => /^(?:licen[cs]e|notice)(?:[.-]|$)/i.test(name))
    .sort();
  const texts = [];
  for (const name of files) {
    try {
      texts.push(await readFile(new URL(name, dir), "utf8"));
    } catch {
      /* A license directory is not a text notice. */
    }
  }
  if (!texts.length) missingTexts.push(key);
  entries.push({
    name: meta.name,
    version: meta.version,
    license:
      typeof meta.license === "string"
        ? meta.license
        : (record.license ?? "See distribution"),
    text:
      texts.join("\n\n") ||
      "A standalone license text was not present in the installed package. Consult the original distribution.",
    source: `https://www.npmjs.com/package/${meta.name}/v/${meta.version}`,
  });
}
entries.push({
  name: "Atkinson Hyperlegible fonts",
  version: "bundled",
  license: "OFL-1.1",
  text: await readFile(new URL("public/fonts/OFL.txt", root), "utf8"),
  source: null,
});
entries.push({
  name: "ION iOS Filesystem",
  version: "2.0.1",
  license: "MIT",
  text: await readFile(
    new URL("licenses/ion-ios-filesystem-2.0.1.txt", root),
    "utf8",
  ),
  source: "https://github.com/ionic-team/ion-ios-filesystem/tree/2.0.1",
});
entries.sort(
  (a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
);
await writeFile(
  new URL("lib/dependency-notices.json", root),
  JSON.stringify(
    {
      schemaVersion: 1,
      lockSha256: createHash("sha256").update(lockText).digest("hex"),
      scope:
        "Installed production dependencies with standalone notices, bundled fonts, and the native Filesystem library. Build/server binaries and an empty browser marker are inventoried separately; optional packages for other platforms may not be present. Review the final distribution and its transitive native SDK notices before release.",
      excludedBuildOnly,
      missingTexts,
      entries,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Recorded ${entries.length} dependency/font notices; ${missingTexts.length} packages need standalone-license review.`,
);
