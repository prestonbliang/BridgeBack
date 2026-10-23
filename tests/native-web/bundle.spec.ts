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
    page.getByRole("heading", { name: "Get your housing paperwork ready." }),
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
