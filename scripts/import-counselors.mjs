import { readFile, writeFile, rename } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  parseCounselorPage,
  COUNSELOR_SOURCE,
} from "../lib/counselor-import.mjs";
const run = promisify(execFile);
let html;
if (process.argv[2] === "--file" && process.argv[3])
  html = await readFile(process.argv[3], "utf8");
else
  html = (
    await run(
      "curl",
      [
        "--fail",
        "--silent",
        "--show-error",
        "--location",
        "--max-time",
        "25",
        COUNSELOR_SOURCE,
      ],
      { maxBuffer: 5 * 1024 * 1024 },
    )
  ).stdout;
const snapshot = parseCounselorPage(html, new Date().toISOString());
const destination = new URL("../lib/counselor-snapshot.json", import.meta.url);
const temporary = new URL(
  "../lib/counselor-snapshot.json.tmp",
  import.meta.url,
);
await writeFile(temporary, JSON.stringify(snapshot, null, 2) + "\n");
await rename(temporary, destination);
console.log(
  `Imported ${snapshot.counselors.length} public agency listings from the official CFPB search for 92101. This is a dated snapshot, not live appointment availability.`,
);
