import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import AxeBuilder from "@axe-core/playwright";

// Browser-level verification of shipped assets and JS bridge integration.
// This shim is deliberately not described as an iOS simulator or native test.
test.beforeEach(async ({ page, context }) => {
  await page.addInitScript(() => {
    const host = window as unknown as Record<string, unknown>;
    host.__nativeCalls = [];
    host.__shareOutcome = "shared";
    host.webkit = { messageHandlers: { bridge: {} } };
    host.Capacitor = {
      PluginHeaders: [
        {
          name: "Filesystem",
          methods: ["readdir", "writeFile", "deleteFile"].map((name) => ({
            name,
            rtype: "promise",
          })),
        },
        { name: "Share", methods: [{ name: "share", rtype: "promise" }] },
        {
          name: "SystemBars",
          methods: [{ name: "setStyle", rtype: "promise" }],
        },
      ],
      nativePromise: async (plugin: string, method: string) => {
        (host.__nativeCalls as string[]).push(`${plugin}.${method}`);
        if (method === "readdir") return { files: [] };
        if (method === "writeFile")
          return { uri: "file:///cache/questions.txt" };
        if (method === "share") {
          if (host.__shareOutcome === "cancelled")
            throw new Error("Share canceled");
          if (host.__shareOutcome === "failed")
            throw new Error("Native export failed");
          return { activityType: "com.apple.UIKit.activity.SaveToFiles" };
        }
        return {};
      },
    };
  });
  const bundle = resolve("ios/App/App/public");
  const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".png": "image/png",
    ".ttf": "font/ttf",
    ".txt": "text/plain",
  };
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://127.0.0.1:3001") return route.abort();
    const path = resolve(
      bundle,
      decodeURIComponent(
        url.pathname === "/" ? "index.html" : url.pathname.slice(1),
      ),
    );
    if (!path.startsWith(bundle + sep)) return route.abort();
    try {
      await route.fulfill({
        body: await readFile(path),
        contentType: types[extname(path)] ?? "application/octet-stream",
      });
    } catch {
      await route.fulfill({ status: 404, body: "Missing bundled asset" });
    }
  });
  await context.setOffline(true);
});
async function nav(page: Page, name: string) {
  await page.locator("#main-navigation").waitFor({ state: "attached" });
  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}
test("bundled contact scripts, legal-help details, personal reminders and contact-sheet sharing work offline", async ({ page }) => {
  await page.goto("/");
  const desk = page.getByTestId("help-desk");
  await desk.getByRole("button", { name: /I received a housing notice/ }).click();
  await expect(desk.getByRole("link", { name: "Call 1-877-534-2524", exact: true })).toHaveAttribute("href", "tel:18775342524");
  await expect(desk.getByRole("link", { name: "TTY: 1-800-735-2929", exact: true })).toHaveAttribute("href", "tel:18007352929");
  await desk.getByText("After you try: record what happened", { exact: true }).click();
  await desk.getByRole("combobox", { name: "What actually happened?", exact: true }).selectOption("message");
  await desk.getByRole("button", { name: "Save my contact outcome", exact: true }).click();
  await desk.getByLabel("My follow-up reminder", { exact: true }).fill("2099-10-24");
  await expect(page.locator(".sidebar-foot")).toContainText("Saved on this device");
  await page.reload();
  await expect(desk.getByRole("heading", { name: "You still need a reply", exact: true })).toBeVisible();
  await expect(desk.getByLabel("My follow-up reminder", { exact: true })).toHaveValue("2099-10-24");
  await desk.getByRole("button", { name: "Save my contact sheet", exact: true }).click();
  await expect(desk.getByRole("status").filter({ hasText: "You shared the contact sheet" })).toBeVisible();
  const calls = await page.evaluate(() => (window as unknown as { __nativeCalls: string[] }).__nativeCalls);
  expect(calls).toContain("Share.share");
  expect(calls).toContain("Filesystem.deleteFile");
});
test("first launch needs only the bundled files; local help and privacy work without a connection", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-platform", "native");
  await page
    .getByRole("button", { name: "Find a real person to help", exact: true })
    .click();
  await expect(page.locator(".counselor-card")).toHaveCount(4);
  await expect(
    page.getByRole("heading", {
      name: "Housing counselors listed near downtown San Diego",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
  ).toBe(0);
  await nav(page, "Settings");
  await page.getByLabel("Household size", { exact: true }).fill("3");
  await expect(page.locator(".sidebar-foot")).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await nav(page, "Settings");
  await expect(page.getByLabel("Household size", { exact: true })).toHaveValue(
    "3",
  );
  await page.getByLabel("Appearance").selectOption("dark");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as { __nativeCalls: string[] }
          ).__nativeCalls.filter((call) => call === "SystemBars.setStyle")
            .length,
      ),
    )
    .toBeGreaterThan(1);
  await page
    .getByRole("link", { name: "Open-source acknowledgments", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Built with open-source software." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByText("Atkinson Hyperlegible fonts", { exact: false }).click();
  await expect(
    page.getByText("SIL OPEN FONT LICENSE", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "← Return to BridgeBack" }).click();
  await nav(page, "Settings");
  await page.getByRole("link", { name: "Read the privacy policy" }).click();
  await expect(
    page.getByRole("heading", { name: "Your paperwork stays with you." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("link", { name: "← Return to BridgeBack" }).click();
  await expect(
    page.getByRole("heading", { name: "Housing help, with a clear next step." }),
  ).toBeVisible();
  await nav(page, "Settings");
  await expect(page.getByLabel("Household size", { exact: true })).toHaveValue(
    "3",
  );
  expect(errors).toEqual([]);
});
test("native export dismissal and failures preserve progress and clean temporary files", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page, "Settings");
  await page.getByLabel("Household size", { exact: true }).fill("2");
  const outcome = async (value: string) =>
    page.evaluate((value) => {
      (window as unknown as Record<string, unknown>).__shareOutcome = value;
    }, value);
  await outcome("cancelled");
  await page.getByRole("button", { name: "Export my progress" }).click();
  await expect(
    page.getByText("Sharing cancelled. Your saved progress is unchanged."),
  ).toBeVisible();
  await outcome("failed");
  await page.getByRole("button", { name: "Export my progress" }).click();
  await expect(
    page.getByText(
      "We could not confirm the export finished. Check your chosen destination before trying again. Your saved progress is unchanged.",
    ),
  ).toBeVisible();
  await outcome("shared");
  await page.getByRole("button", { name: "Export my progress" }).click();
  await expect(
    page.getByText("You shared your progress using the system share sheet.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Household size", { exact: true })).toHaveValue(
    "2",
  );
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __nativeCalls: string[] }).__nativeCalls.filter(
          (call) => call === "Filesystem.deleteFile",
        ).length,
    ),
  ).toBe(3);
});
test("bundled real-program instructions and preference documents persist without claiming an online check", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find real programs", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Check official pages", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".official-check-control")).toContainText(
    "bundled reviewed guidance",
  );
  const card = page.getByTestId("official-program-county-public");
  await expect(card).toContainText("Waiting list closed to new applicants");
  await card
    .getByRole("button", {
      name: "Save County Public Housing follow-up plan",
      exact: true,
    })
    .click();
  await page
    .getByRole("combobox", { name: "Which situation fits you?", exact: true })
    .selectOption("existing");
  await page
    .getByRole("checkbox", {
      name: "Read the current access instructions",
      exact: false,
    })
    .check();
  await page
    .getByRole("checkbox", {
      name: "Arrange County help without the online portal",
      exact: false,
    })
    .check();
  await expect(
    page.locator('.official-plan-card [role="progressbar"]'),
  ).toHaveAttribute("aria-valuenow", "40");
  await nav(page, "Documents");
  await page
    .getByRole("checkbox", {
      name: "Employer statement for the working preference",
      exact: true,
    })
    .check();
  await expect(page.locator(".sidebar-foot")).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await nav(page, "Documents");
  await expect(
    page.getByRole("checkbox", {
      name: "Employer statement for the working preference",
      exact: true,
    }),
  ).toBeChecked();
  await nav(page, "My checklist");
  await expect(
    page.locator('.official-plan-card [role="progressbar"]'),
  ).toHaveAttribute("aria-valuenow", "40");
});
