import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

// Capture actual interactions in a fresh fictional workspace. This produces
// review footage, not entrant identification, narration, or a submitted video.
execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
await mkdir("artifacts/demo-raw", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (existsSync("/usr/bin/chromium")
      ? "/usr/bin/chromium"
      : chromium.executablePath()),
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: {
    dir: "artifacts/demo-raw",
    size: { width: 1280, height: 800 },
  },
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const video = page.video();
const started = performance.now();
const cues = [];
const elapsed = () => (performance.now() - started) / 1000;
const nav = async (name) => {
  await page.locator("#main-navigation").waitFor({ state: "attached" });
  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
};
const phase = async (seconds, caption, action) => {
  const start = elapsed();
  console.log(`Recording: ${caption.split(".")[0]}`);
  await action();
  await page.waitForTimeout(
    Math.max(0, seconds * 1000 - (elapsed() - start) * 1000),
  );
  cues.push({ start, end: elapsed(), caption });
};
try {
  await phase(
    7,
    "BridgeBack helps people understand housing paperwork and prepare their next useful step.",
    async () => {
      await page.goto("http://127.0.0.1:3000/");
      await page
        .getByRole("button", {
          name: "Find a real person to help",
          exact: true,
        })
        .waitFor();
      await page.evaluate(() => document.fonts.ready);
    },
  );
  await phase(
    9,
    "Fictional practice: two forms are waiting for income proof. Checklist progress is calculated from state.",
    async () => {
      await page
        .getByRole("button", { name: "Try a guided example", exact: true })
        .click();
      await page.locator(".desk-main").scrollIntoViewIfNeeded();
    },
  );
  await phase(
    10,
    "The dependency graph connects shared documents to separate program requirements. OR means one accepted option.",
    async () => {
      await nav("My checklist");
      await page
        .getByRole("button", { name: "Journey map", exact: true })
        .click();
      await page.locator(".journey-panel").scrollIntoViewIfNeeded();
    },
  );
  await phase(
    12,
    "Preview one action with the same engine. The hypothetical result leaves saved progress untouched.",
    async () => {
      await page
        .getByRole("button", { name: "Checklist", exact: true })
        .click();
      await page
        .getByRole("combobox", {
          name: "Choose a step to preview",
          exact: true,
        })
        .selectOption("doc:paystub");
      await page.locator(".what-if-panel").scrollIntoViewIfNeeded();
    },
  );
  await phase(
    10,
    "Apply the document only when it is actually available. The two fictional forms can now proceed.",
    async () => {
      await page
        .getByRole("button", { name: "Update my checklist", exact: true })
        .click();
      await page.locator(".pathfinder-total").scrollIntoViewIfNeeded();
    },
  );
  await phase(
    12,
    "Cannot get the pay stub? Route Rescue checks the exact alternatives instead of inventing an exception.",
    async () => {
      await nav("Documents");
      await page
        .getByRole("checkbox", {
          name: "I cannot obtain Pay stub",
          exact: true,
        })
        .check();
      await page.locator(".rescue-panel").scrollIntoViewIfNeeded();
    },
  );
  await phase(
    12,
    "A stuck step gets smaller instructions. Reviewing help or requesting a paper does not mark it ready.",
    async () => {
      await page
        .getByRole("button", { name: "Get help with Pay stub", exact: true })
        .click();
      await page
        .getByRole("button", { name: "I can’t get the document", exact: true })
        .click();
      await page.locator(".support-small-steps").scrollIntoViewIfNeeded();
    },
  );
  await phase(
    8,
    "A short fictional exercise explains gross pay. Learning answers do not change personal income or readiness.",
    async () => {
      await page
        .getByRole("button", { name: "Learn the paperwork", exact: true })
        .click();
      await page
        .getByRole("radio", { name: "$1,000 — gross pay", exact: true })
        .check();
      await page.locator(".learning-lesson").first().scrollIntoViewIfNeeded();
    },
  );
  await phase(
    14,
    "Real public counselor listings are separate from the sample rules. Source date, languages and search area are visible.",
    async () => {
      await page
        .getByRole("button", { name: "Talk to someone", exact: true })
        .click();
      await page
        .getByRole("combobox", { name: "Listed language", exact: true })
        .selectOption("Spanish");
      await page
        .locator(".counselor-directory")
        .evaluate((element) => element.scrollIntoView({ block: "start" }));
    },
  );
  await phase(
    10,
    "Prepare focused questions and record that you are waiting. No call, application or document completion is fabricated.",
    async () => {
      await page
        .locator(".counselor-card")
        .first()
        .getByRole("button", { name: "Use this contact in my question sheet" })
        .click();
      await page
        .getByRole("combobox", {
          name: "Where does the conversation stand?",
          exact: true,
        })
        .selectOption("waiting");
      await page.locator(".contact-plan").scrollIntoViewIfNeeded();
    },
  );
  await phase(
    9,
    "No account or document uploads. People control exports and deletion; browser storage is not encrypted secure storage.",
    async () => {
      await page
        .getByRole("button", { name: "Return to my workspace", exact: true })
        .click();
      await nav("Settings");
      await page
        .getByRole("heading", { name: "Your data belongs to you", exact: true })
        .scrollIntoViewIfNeeded();
    },
  );
  await phase(
    7,
    "TypeScript, Next.js/React, IndexedDB and Capacitor/Swift. Review footage: add entrant names, your own narration and full AI disclosure.",
    async () => {
      await nav("Overview");
      await page.evaluate(() => window.scrollTo(0, 0));
    },
  );
} finally {
  await context.close();
  await browser.close();
}
const wrap = (text, width = 90) => {
  const lines = [""];
  for (const word of text.split(" ")) {
    if (lines.at(-1).length + word.length + 1 > width) lines.push(word);
    else lines[lines.length - 1] += `${lines.at(-1) ? " " : ""}${word}`;
  }
  return lines;
};
const timestamp = (seconds, ass = false) => {
  const total = Math.floor(seconds * (ass ? 100 : 1000));
  const unit = ass ? 100 : 1000;
  const hour = Math.floor(total / unit / 3600);
  const minute = Math.floor(total / unit / 60) % 60;
  const second = Math.floor(total / unit) % 60;
  const fraction = total % unit;
  return `${ass ? hour : String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}${ass ? "." : ","}${String(fraction).padStart(ass ? 2 : 3, "0")}`;
};
await writeFile(
  "artifacts/BridgeBack-review.srt",
  cues
    .map(
      (cue, index) =>
        `${index + 1}\n${timestamp(cue.start)} --> ${timestamp(cue.end)}\n${wrap(cue.caption).join("\n")}\n`,
    )
    .join("\n"),
);
const header =
  "[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 912\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Atkinson Hyperlegible,22,&H00FFFFFF,&H00FFFFFF,&H00172F43,&H00172F43,0,0,0,0,100,100,0,0,1,0,0,2,35,35,20,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n";
await writeFile(
  "artifacts/demo-captions.ass",
  header +
    cues
      .map(
        (cue) =>
          `Dialogue: 0,${timestamp(cue.start, true)},${timestamp(cue.end, true)},Default,,0,0,0,,${wrap(cue.caption).join("\\N")}\n`,
      )
      .join(""),
);
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-i",
    await video.path(),
    "-vf",
    "pad=iw:ih+112:0:0:color=0x172f43,ass=artifacts/demo-captions.ass:fontsdir=public/fonts",
    "-t",
    String(cues.at(-1).end),
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "24",
    "-pix_fmt",
    "yuv420p",
    "-an",
    "-movflags",
    "+faststart",
    "artifacts/BridgeBack-review.mp4",
  ],
  { stdio: ["ignore", "ignore", "inherit"] },
);
console.log(
  "Created two-minute review footage and captions in artifacts. This is not the final public, identified, narrated contest video.",
);
