import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const git = (args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
if (git(["status", "--porcelain", "--untracked-files=normal"]))
  throw Error(
    "Commit or preserve pending changes before packaging a reviewable source snapshot.",
  );
const commit = git(["rev-parse", "--verify", "HEAD^{commit}"]);
const evidence = JSON.parse(
  await readFile(
    new URL("../docs/ios-build-evidence.json", import.meta.url),
    "utf8",
  ),
);
if (
  evidence.status !== "Success" ||
  !/^[a-f0-9]{40}$/.test(evidence.sourceCommit)
)
  throw Error("A successful, attributable native CI report is required.");
const sourcePaths = [
  "app",
  "components",
  "hooks",
  "lib",
  "ios",
  "public",
  "service-worker",
  "scripts",
  "package.json",
  "package-lock.json",
  "capacitor.config.ts",
  "next.config.ts",
  "tsconfig.json",
  ".github/workflows/ios-preflight.yml",
];
execFileSync(
  "git",
  ["diff", "--exit-code", evidence.sourceCommit, commit, "--", ...sourcePaths],
  { cwd: root, stdio: "pipe" },
);
const folder = new URL("../artifacts/", import.meta.url);
await mkdir(folder, { recursive: true });
const archive = new URL("BridgeBack-source.zip", folder);
execFileSync(
  "git",
  ["archive", "--format=zip", `--output=${fileURLToPath(archive)}`, commit],
  { cwd: root },
);
const bytes = await readFile(archive);
await writeFile(
  new URL("BridgeBack-review-manifest.json", folder),
  JSON.stringify(
    {
      purpose:
        "Review snapshot; not an eligibility certification, application submission or signed iOS release.",
      generatedAt: new Date().toISOString(),
      sourceCommit: commit,
      sourceArchive: {
        name: "BridgeBack-source.zip",
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      },
      nativeBuild: {
        testedCommit: evidence.sourceCommit,
        sameApplicationSource: true,
        runUrl: evidence.runUrl,
        artifacts: evidence.artifacts,
      },
      entrantMustComplete: [
        "truthful significant-contribution record and full AI disclosure",
        "personal eligibility/guardian/profile information in official portal",
        "own reflection and participant identification",
        "public 1–3 minute narrated demonstration URL",
        "current deadline confirmation and actual submission",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Created artifacts/BridgeBack-source.zip and review manifest for ${commit}. No entry was submitted and no eligibility claim was made.`,
);
