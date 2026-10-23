import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function nav(page: Page, label: string) {
  await page
    .locator('nav[aria-label="Main navigation"]')
    .waitFor({ state: "attached" });
  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation")
    .getByRole("button", {
      name:
        (
          {
            Dashboard: "Overview",
            Discover: "Find help",
            PathFinder: "My checklist",
            Timeline: "Activity",
            Support: "Get support",
          } as Record<string, string>
        )[label] ?? label,
      exact: true,
    })
    .click();
}
async function addPlan(page: Page, name: string) {
  await nav(page, "Discover");
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await card.getByRole("button", { name: "Add preparation plan" }).click();
}
async function saved(page: Page) {
  await expect(page.locator(".sidebar-foot")).toContainText(
    "Saved on this device",
  );
}
test("what-if parity, real progress, corrections and offline persistence across two plans", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await addPlan(page, "Fresh Start Housing Preparation");
  await addPlan(page, "Harbor Rental Preparation");
  await nav(page, "Documents");
  await page
    .getByRole("checkbox", { name: "I have Identity document", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "I have Proof of residence", exact: true })
    .check();
  await nav(page, "PathFinder");
  await page
    .getByRole("button", {
      name: "Complete Confirm household details",
      exact: true,
    })
    .click();
  await expect(page.locator(".pathfinder-total")).toContainText(
    "4 of 10 steps",
  );
  await page
    .getByRole("combobox", { name: "Choose a step to preview", exact: true })
    .selectOption("doc:paystub");
  const preview = page.locator(".what-if-panel");
  await expect(
    preview.getByText("Preview only — not marked done"),
  ).toBeVisible();
  await expect(preview.locator(".simulation-scores")).toContainText("60%");
  await expect(page.locator(".pathfinder-total")).toContainText("40");
  await saved(page);
  await page.reload();
  await nav(page, "PathFinder");
  await expect(page.locator(".pathfinder-total")).toContainText(
    "4 of 10 steps",
  );
  await expect(page.getByText("Preview only — not marked done")).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Choose a step to preview", exact: true })
    .selectOption("doc:paystub");
  await page
    .getByRole("button", { name: "Update my checklist", exact: true })
    .click();
  await expect(page.locator(".pathfinder-total")).toContainText(
    "6 of 10 steps",
  );
  await expect(
    page.getByRole("button", {
      name: "Complete Prepare the Fresh Start form",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", {
      name: "Complete Prepare the Harbor form",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(page.locator(".state-announcement")).toContainText(
    "2 more steps are ready",
  );
  await nav(page, "Timeline");
  await page
    .getByRole("listitem")
    .filter({
      has: page.getByRole("heading", {
        name: "Available: Pay stub",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Correct this action" })
    .click();
  await nav(page, "PathFinder");
  await expect(
    page.getByRole("button", {
      name: "Complete Prepare the Fresh Start form",
      exact: true,
    }),
  ).toBeDisabled();
  await saved(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  expect(
    await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('16px "Atkinson Hyperlegible"');
    }),
  ).toBe(true);
  await expect(
    page.getByText("You’re offline.", { exact: false }),
  ).toBeVisible();
  await nav(page, "Documents");
  await expect(
    page.getByRole("checkbox", {
      name: "I have Identity document",
      exact: true,
    }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "I have Pay stub", exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole("checkbox", { name: "I have Pay stub", exact: true })
    .check();
  await saved(page);
  await page.reload();
  await nav(page, "PathFinder");
  await expect(page.locator(".pathfinder-total")).toContainText(
    "6 of 10 steps",
  );
  await context.setOffline(false);
  expect(errors).toEqual([]);
});
test("demo scenes and eligibility changes preserve the personal workspace", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page, "Settings");
  await page.getByLabel("Household size", { exact: true }).fill("3");
  await page
    .getByLabel("Approximate annual household income ($)", { exact: true })
    .fill("36000");
  await saved(page);
  await nav(page, "Dashboard");
  await page.getByRole("button", { name: "Try a guided example" }).click();
  await expect(page.getByText("Personal progress preserved")).toBeAttached();
  await page.getByRole("button", { name: /Demo scene 4:/ }).click();
  await expect(
    page.getByRole("heading", { name: "See what would change" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Choose a step to preview", exact: true })
    .selectOption("doc:paystub");
  await page
    .getByRole("button", { name: "Update my checklist", exact: true })
    .click();
  await page.getByRole("button", { name: /Demo scene 6:/ }).click();
  await expect(
    page.getByRole("heading", { name: "Your documents" }),
  ).toBeVisible();
  await page
    .getByText("Try another fictional scenario", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Eligibility changes", exact: true })
    .click();
  await expect(
    page.getByText("Fresh Start: Likely ineligible", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Approximate annual household income ($)", { exact: true })
    .fill("30000");
  await expect(
    page.getByText("Fresh Start: Potentially eligible", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Return to my workspace" }).click();
  await nav(page, "Settings");
  await expect(page.getByLabel("Household size", { exact: true })).toHaveValue(
    "3",
  );
  await expect(
    page.getByLabel("Approximate annual household income ($)", { exact: true }),
  ).toHaveValue("36000");
  await page.reload();
  await nav(page, "Settings");
  await expect(page.getByLabel("Household size", { exact: true })).toHaveValue(
    "3",
  );
});
test("explicit reuse, unavailable-document rescue, export, print and program removal", async ({
  page,
}) => {
  await page.goto("/");
  for (const name of [
    "Fresh Start Housing Preparation",
    "Harbor Rental Preparation",
    "Keys Housing Search Preparation",
  ])
    await addPlan(page, name);
  await nav(page, "Documents");
  await page
    .getByRole("checkbox", { name: "I have Identity document", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "I have Proof of residence", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "I cannot obtain Pay stub", exact: true })
    .check();
  const rescue = page.locator(".rescue-panel");
  await expect(rescue).toContainText("Employer letter");
  await expect(rescue).toContainText("Benefits statement");
  await expect(rescue).toContainText("2 additional");
  await page
    .getByRole("checkbox", { name: "I have Employer letter", exact: true })
    .check();
  await nav(page, "PathFinder");
  await expect(
    page.getByRole("button", {
      name: "Complete Prepare the Fresh Start form",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", {
      name: "Complete Prepare the Harbor form",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Journey map", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "PathFinder interactive dependency map" }),
  ).toBeVisible();
  await page.getByLabel("Show steps for").selectOption("fresh");
  await expect(page.locator(".react-flow__node")).toHaveCount(9);
  await nav(page, "Documents");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export preparation packet" }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe("bridgeback-preparation-packet.txt");
  const body = await readFile((await file.path())!, "utf8");
  expect(body).toContain("FICTIONAL");
  expect(body).toContain("ROUTE RESCUE");
  expect(body).toContain("Harbor Rental Preparation".toUpperCase());
  await page.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset.printRequested = "true";
    };
  });
  await page.getByRole("button", { name: "Print", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-print-requested",
    "true",
  );
  await nav(page, "Discover");
  await page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Harbor Rental Preparation",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Remove plan" })
    .click();
  await nav(page, "PathFinder");
  await expect(page.locator(".pf-program-progress")).not.toContainText(
    "Harbor Rental",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("adaptive onboarding skips irrelevant questions, resumes, and supports deletion", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Help me get started", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Find your starting point" });
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await dialog
    .getByRole("combobox", { name: "Location", exact: true })
    .selectOption("Other");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Continue my checklist setup",
      exact: true,
    }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Continue my checklist setup", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Where are you looking?" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Find housing help" }),
  ).toBeVisible();
  await nav(page, "Settings");
  await expect(page.getByLabel("Household size", { exact: true })).toHaveValue(
    "",
  );
  await page.getByLabel("Appearance").selectOption("dark");
  await page.getByLabel("Larger reading text").check();
  await expect(page.locator("html")).toHaveAttribute("data-large-text", "true");
  await saved(page);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await nav(page, "Settings");
  await page.getByRole("button", { name: "Delete all saved data" }).click();
  await page.getByRole("button", { name: "Yes, delete my data" }).click();
  await expect(
    page.getByText("Your saved profile and progress have been deleted.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".sidebar-foot")).toContainText(
    "Local data deleted",
  );
  await page.reload();
  await nav(page, "Settings");
  await expect(
    page.getByRole("combobox", { name: "Location", exact: true }),
  ).toHaveValue("Unknown");
  await expect(page.getByLabel("Larger reading text")).not.toBeChecked();
});

test("other tabs refresh and stale tabs cannot resurrect deleted progress", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await nav(page, "Settings");
  await page.getByLabel("Household size", { exact: true }).fill("3");
  await saved(page);
  const observer = await context.newPage();
  await observer.goto("/");
  await nav(observer, "Settings");
  await expect(
    observer.getByLabel("Household size", { exact: true }),
  ).toHaveValue("3");
  await page.getByLabel("Household size", { exact: true }).fill("4");
  await saved(page);
  await expect(
    observer.getByLabel("Household size", { exact: true }),
  ).toHaveValue("4");
  await observer.close();

  // Model an old or suspended tab that missed cross-tab notifications. The
  // transaction guard must protect data even without BroadcastChannel support.
  const stale = await context.newPage();
  await stale.addInitScript(() => {
    Object.defineProperty(window, "BroadcastChannel", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(document, "visibilityState", {
      get: () => "hidden",
      configurable: true,
    });
  });
  await stale.goto("/");
  await nav(stale, "Settings");
  await expect(stale.getByLabel("Household size", { exact: true })).toHaveValue(
    "4",
  );
  await page.getByRole("button", { name: "Delete all saved data" }).click();
  await page.getByRole("button", { name: "Yes, delete my data" }).click();
  await expect(
    page.getByText("Your saved profile and progress have been deleted.", {
      exact: true,
    }),
  ).toBeVisible();
  await stale.getByLabel("Household size", { exact: true }).fill("5");
  await expect(
    stale
      .getByText("Another tab changed this workspace.", { exact: false })
      .first(),
  ).toBeVisible();
  await expect(stale.getByLabel("Household size", { exact: true })).toHaveValue(
    "",
  );
  await page.reload();
  await nav(page, "Settings");
  await expect(page.getByLabel("Household size", { exact: true })).toHaveValue(
    "",
  );
  await stale.close();
});

test("plain-language help explains the worked example and keeps it separate from personal progress", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "See what a pay stub changes", exact: true })
    .click();
  await expect(page.locator(".sample-result")).toContainText(
    "2 more steps are ready to start",
  );
  await expect(page.locator(".sample-result")).toContainText("40% to 60%");
  await expect(page.locator(".sample-form-list")).toContainText(
    "Fresh Start form",
  );
  await expect(
    page
      .locator(".sample-form-list")
      .getByText("Ready to work on", { exact: true }),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "Reset the example", exact: true })
    .click();
  await expect(
    page
      .locator(".sample-form-list")
      .getByText("Waiting for income proof", { exact: true }),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Help", exact: true }).click();
  const help = page.getByRole("dialog", { name: "Help with BridgeBack" });
  await expect(
    help.getByRole("heading", { name: "A few words you’ll see" }),
  ).toBeVisible();
  await expect(
    help.getByText("Accepted alternative", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Help", exact: true }),
  ).toBeFocused();
  await nav(page, "PathFinder");
  await expect(
    page.getByRole("heading", { name: "Choose a plan to make a checklist." }),
  ).toBeVisible();
  await page.getByText("How to use this page", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "How to work through your checklist" }),
  ).toBeVisible();
});

test("a stuck applicant saves a real contact and follow-up without inventing checklist completion", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await addPlan(page, "Fresh Start Housing Preparation");
  await addPlan(page, "Harbor Rental Preparation");
  await nav(page, "Documents");
  await page
    .getByRole("checkbox", { name: "I have Identity document", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Get help with Pay stub", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Get help with a difficult step" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "I can’t get the document", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Try one small step at a time" }),
  ).toBeFocused();
  await expect(page.locator(".support-options")).toContainText(
    "Pay stub OR Employer letter",
  );
  await expect(page.locator(".support-options")).toContainText(
    "Pay stub OR Benefits statement",
  );
  await expect(
    page.getByRole("button", { name: "Mark the actual step ready" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Talk to someone", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Housing counselors listed near downtown San Diego",
    }),
  ).toBeVisible();
  await expect(page.locator(".counselor-card")).toHaveCount(4);
  await expect(page.locator(".counselor-directory")).toContainText(
    "not your address",
  );
  await page
    .getByRole("combobox", { name: "Listed language", exact: true })
    .selectOption("Vietnamese");
  await expect(page.locator(".counselor-card")).toHaveCount(0);
  await expect(
    page.getByText("This result does not mean there is no help available.", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Listed language", exact: true })
    .selectOption("Spanish");
  await page
    .locator(".counselor-card")
    .first()
    .getByRole("button", { name: "Use this contact in my question sheet" })
    .click();
  const questions = page.getByLabel("Questions to ask a real provider", {
    exact: true,
  });
  await expect.poll(() => questions.inputValue()).toContain("Navicore");
  expect(await questions.inputValue()).not.toMatch(/Fresh Start|Harbor|Keys/);
  await page
    .getByRole("combobox", {
      name: "Where does the conversation stand?",
      exact: true,
    })
    .selectOption("waiting");
  await page
    .getByLabel("My follow-up reminder (optional)", { exact: true })
    .fill("2026-11-05");
  await saved(page);
  await nav(page, "PathFinder");
  await expect(page.locator(".pathfinder-total")).toContainText(
    "2 of 10 steps",
  );
  await nav(page, "Dashboard");
  await expect(
    page.getByRole("heading", { name: "Keep your help questions moving" }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await nav(page, "Support");
  await expect(page.locator(".support-saved")).toContainText(
    "Waiting for a reply",
  );
  await page
    .getByRole("button", { name: "Talk to someone", exact: true })
    .click();
  await expect(page.locator(".counselor-card")).toHaveCount(4);
  await expect(
    page.getByLabel("My follow-up reminder (optional)", { exact: true }),
  ).toHaveValue("2026-11-05");
  await context.setOffline(false);
});

test("guided readiness checks prevent accidental completion and teach income periods", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Try a guided example", exact: true })
    .click();
  await nav(page, "PathFinder");
  await page
    .getByRole("button", { name: "Get help with Pay stub", exact: true })
    .click();
  await page
    .getByRole("button", { name: "I’m not sure what this means", exact: true })
    .click();
  for (const checkbox of await page
    .getByRole("checkbox", { name: /^Reviewed:/ })
    .all())
    await checkbox.check();
  await page
    .getByRole("radio", { name: "Yes, both are required", exact: true })
    .check();
  await page
    .getByRole("checkbox", {
      name: "I can actually access this document, or I have finished what this task asks.",
      exact: true,
    })
    .check();
  await expect(
    page.getByRole("button", { name: "Mark the actual step ready" }),
  ).toBeDisabled();
  await expect(page.getByText("Not quite.", { exact: false })).toBeVisible();
  await page
    .getByRole("radio", {
      name: "No, one accepted option is enough",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Mark the actual step ready" })
    .click();
  await nav(page, "PathFinder");
  await expect(page.locator(".pathfinder-total")).toContainText(
    "6 of 10 steps",
  );
  await page
    .getByRole("button", { name: "Get help with Pay stub", exact: true })
    .click();
  await page
    .getByRole("button", { name: "I checked this off by mistake", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reopen this checklist item", exact: true })
    .click();
  await nav(page, "PathFinder");
  await expect(page.locator(".pathfinder-total")).toContainText(
    "4 of 10 steps",
  );
  await nav(page, "Support");
  await page
    .getByRole("button", { name: "Learn the paperwork", exact: true })
    .click();
  await page
    .getByRole("radio", { name: "$820 — net pay", exact: true })
    .check();
  await expect(
    page.getByText("Look at gross pay:", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("radio", { name: "$1,000 — gross pay", exact: true })
    .check();
  await expect(
    page.getByText("Yes. Gross pay is $1,000", { exact: false }),
  ).toBeVisible();
  await page
    .getByLabel("Amount for one payment ($)", { exact: true })
    .fill("2000");
  await page
    .getByRole("combobox", { name: "How often is that payment?", exact: true })
    .selectOption("biweekly");
  await expect(
    page.getByText("$52,000.00 per year, approximately", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "How often is that payment?", exact: true })
    .selectOption("semimonthly");
  await expect(
    page.getByText("$48,000.00 per year, approximately", { exact: true }),
  ).toBeVisible();
  await nav(page, "Settings");
  await expect(
    page.getByLabel("Approximate annual household income ($)", { exact: true }),
  ).toHaveValue("32000");
});

test("real contacts and follow-up are usable without adding a fictional program", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find a real person to help", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Make a follow-up plan for my question",
      exact: true,
    })
    .click();
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
  await saved(page);
  await page.reload();
  await nav(page, "Support");
  await expect(
    page.getByRole("combobox", {
      name: "Which step do you need help with?",
      exact: true,
    }),
  ).toHaveValue("general");
  await expect(page.locator(".support-saved")).toContainText(
    "Waiting for a reply",
  );
  await page
    .getByRole("button", { name: "Talk to someone", exact: true })
    .click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download questions", exact: true })
    .click();
  const file = await pending;
  const body = await readFile((await file.path())!, "utf8");
  expect(body).toContain("Navicore");
  expect(body).toContain("consumerfinance.gov");
  expect(body).not.toMatch(/Fresh Start|Harbor|Keys/);
  await nav(page, "Dashboard");
  await expect(
    page.getByRole("heading", { name: "Get your housing paperwork ready." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Keep your help questions moving" }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await nav(page, "Settings");
  await page.context().setOffline(true);
  const popup = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Read the privacy policy" }).click();
  const policy = await popup;
  await expect(
    policy.getByRole("heading", { name: "Your paperwork stays with you." }),
  ).toBeVisible();
  await policy.getByRole("link", { name: "← Return to BridgeBack" }).click();
  await expect(
    policy.getByRole("heading", { name: "Get your housing paperwork ready." }),
  ).toBeVisible();
  await policy.close();
  const noticesPopup = page.waitForEvent("popup");
  await page
    .getByRole("link", { name: "Open-source acknowledgments", exact: true })
    .click();
  const notices = await noticesPopup;
  await expect(
    notices.getByRole("heading", { name: "Built with open-source software." }),
  ).toBeVisible();
  await notices.close();
  await page.context().setOffline(false);
});
