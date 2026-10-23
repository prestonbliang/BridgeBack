import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function nav(page: Page, label: string) {
  await page.locator("#main-navigation").waitFor({ state: "attached" });
  if (
    await page
      .getByRole("button", { name: "Open menu", exact: true })
      .isVisible()
  )
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
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
test("accessibility, keyboard focus, themes, graph, and console errors across primary flows", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Help me get started", exact: true })
    .waitFor();
  const check = async () => {
    const r = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      r.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  };
  await check();
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await check();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Help", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Help me get started", exact: true })
    .click();
  await check();
  const dialog = page.getByRole("dialog");
  await page.keyboard.press("Tab");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Help me get started", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Try a guided example" }).click();
  await nav(page, "PathFinder");
  await check();
  await page
    .getByRole("button", { name: "What if I do this?", exact: true })
    .click();
  await check();
  await page.getByRole("button", { name: "Journey map", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "PathFinder interactive dependency map" }),
  ).toBeVisible();
  await check();
  await nav(page, "Documents");
  await check();
  await nav(page, "Settings");
  await page.getByLabel("Appearance").selectOption("dark");
  await check();
  await nav(page, "PathFinder");
  await check();
  await nav(page, "Documents");
  await check();
  await nav(page, "Discover");
  await check();
  await nav(page, "Timeline");
  await check();
  await nav(page, "PathFinder");
  await page
    .getByRole("button", { name: "Get help with Pay stub", exact: true })
    .click();
  await page
    .getByRole("button", { name: "I’m not sure what this means", exact: true })
    .click();
  await check();
  await page
    .getByRole("button", { name: "Learn the paperwork", exact: true })
    .click();
  await check();
  await page
    .getByRole("button", { name: "Talk to someone", exact: true })
    .click();
  await check();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
