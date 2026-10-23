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
    .getByRole("button", { name: label, exact: true })
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
    "4 of 10 milestones",
  );
  await page
    .getByLabel("Preview an available action")
    .selectOption("doc:paystub");
  const preview = page.locator(".what-if-panel");
  await expect(preview.getByText("HYPOTHETICAL · NOT SAVED")).toBeVisible();
  await expect(preview.locator(".simulation-scores")).toContainText("60%");
  await expect(page.locator(".pathfinder-total")).toContainText("40");
  await saved(page);
  await page.reload();
  await nav(page, "PathFinder");
  await expect(page.locator(".pathfinder-total")).toContainText(
    "4 of 10 milestones",
  );
  await expect(page.getByText("HYPOTHETICAL · NOT SAVED")).toHaveCount(0);
  await page
    .getByLabel("Preview an available action")
    .selectOption("doc:paystub");
  await page
    .getByRole("button", { name: "Apply this step", exact: true })
    .click();
  await expect(page.locator(".pathfinder-total")).toContainText(
    "6 of 10 milestones",
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
    "2 newly available tasks",
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
    "6 of 10 milestones",
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
  await page.getByRole("button", { name: "Try a guided demo" }).click();
  await expect(page.getByText("Personal progress preserved")).toBeAttached();
  await page.getByRole("button", { name: /Demo scene 4:/ }).click();
  await expect(
    page.getByRole("heading", { name: "What changes if…" }),
  ).toBeVisible();
  await page
    .getByLabel("Preview an available action")
    .selectOption("doc:paystub");
  await page
    .getByRole("button", { name: "Apply this step", exact: true })
    .click();
  await page.getByRole("button", { name: /Demo scene 6:/ }).click();
  await expect(
    page.getByRole("heading", { name: "Prepare once. Open more routes." }),
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
  await page.getByLabel("Show a focused route").selectOption("fresh");
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
    .getByRole("button", { name: "Find my starting point", exact: true })
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
      name: "Continue my starting point",
      exact: true,
    }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Continue my starting point", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Where are you looking?" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "More clarity. Fewer dead ends." }),
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
