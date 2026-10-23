import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.setTimeout(60000);
async function nav(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}
test("real contact routing, unanswered-call recovery, agency separation, confirmed instructions, export and offline persistence", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const desk = page.getByTestId("help-desk");
  await desk.getByRole("button", { name: /I need a place to stay/ }).click();
  await expect(
    desk.getByRole("link", { name: "Call 211", exact: true }),
  ).toHaveAttribute("href", "tel:211");
  await expect(desk).toContainText("I need a place to stay tonight or soon");
  await expect(desk.getByText("Last reported:", { exact: false })).toHaveCount(
    0,
  );
  await desk
    .getByText("After you try: record what happened", { exact: true })
    .click();
  await desk
    .getByRole("combobox", { name: "What actually happened?", exact: true })
    .selectOption("message");
  await desk
    .getByRole("button", { name: "Save my contact outcome", exact: true })
    .click();
  await expect(
    desk.getByRole("heading", { name: "You still need a reply", exact: true }),
  ).toBeVisible();
  await expect(
    desk.getByRole("checkbox", {
      name: "I confirmed this next step with the organization.",
      exact: true,
    }),
  ).toBeDisabled();
  await desk
    .getByLabel("My follow-up reminder", { exact: true })
    .fill("2099-10-24");
  await desk
    .getByRole("button", {
      name: "Start a different contact plan",
      exact: true,
    })
    .click();
  await desk
    .getByRole("button", { name: /I’m working on an application/ })
    .click();
  await desk
    .getByRole("combobox", {
      name: "Organization on my application or letter",
      exact: true,
    })
    .selectOption("city");
  await desk
    .getByRole("button", {
      name: "Show my contact and next steps",
      exact: true,
    })
    .click();
  await expect(
    desk.getByRole("link", { name: "Call 619-231-9400", exact: true }),
  ).toHaveAttribute("href", "tel:6192319400");
  await expect(desk).not.toContainText("858-694-4801");
  await desk
    .getByRole("combobox", {
      name: "Is something making this difficult?",
      exact: true,
    })
    .selectOption("technology");
  await expect(desk).toContainText(
    "Do not share your password or verification code",
  );
  await desk
    .getByText("After you try: record what happened", { exact: true })
    .click();
  await desk
    .getByRole("combobox", { name: "What actually happened?", exact: true })
    .selectOption("spoke");
  await desk
    .getByRole("button", { name: "Save my contact outcome", exact: true })
    .click();
  await desk
    .getByRole("combobox", {
      name: "What did the organization ask you to do next?",
      exact: true,
    })
    .selectOption("submit");
  await desk
    .getByRole("checkbox", {
      name: "I confirmed this next step with the organization.",
      exact: true,
    })
    .check();
  await expect(
    desk.getByRole("heading", {
      name: "Send paperwork using their instructions",
      exact: true,
    }),
  ).toBeVisible();
  await desk
    .getByRole("checkbox", {
      name: "They requested income paperwork",
      exact: true,
    })
    .check();
  await expect(
    desk.getByRole("heading", {
      name: "Prepare the remaining requested paperwork",
      exact: true,
    }),
  ).toBeVisible();
  await desk
    .getByRole("checkbox", {
      name: "I prepared the requested income paperwork",
      exact: true,
    })
    .check();
  await desk
    .getByRole("combobox", { name: "What actually happened?", exact: true })
    .selectOption("sent");
  await desk
    .getByRole("button", { name: "Save my contact outcome", exact: true })
    .click();
  await expect(
    desk.getByRole("checkbox", {
      name: "I confirmed this next step with the organization.",
      exact: true,
    }),
  ).not.toBeChecked();
  await desk
    .getByRole("checkbox", {
      name: "I confirmed this next step with the organization.",
      exact: true,
    })
    .check();
  await desk
    .getByRole("checkbox", {
      name: "My question is resolved and I know what to do next.",
      exact: true,
    })
    .check();
  await expect(
    desk.getByRole("heading", {
      name: "Your question is marked resolved",
      exact: true,
    }),
  ).toBeVisible();
  const downloading = page.waitForEvent("download");
  await desk
    .getByRole("button", { name: "Save my contact sheet", exact: true })
    .click();
  const stream = await (await downloading).createReadStream();
  let sheet = "";
  for await (const chunk of stream!) sheet += chunk.toString();
  expect(sheet).toContain("San Diego Housing Commission");
  expect(sheet).toContain("NOT VERIFIED BY BRIDGEBACK");
  expect(sheet).not.toContain("Fresh Start");
  await expect(page.locator(".sidebar-foot")).toContainText(
    "Saved on this device",
  );
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    desk.getByRole("heading", {
      name: "Your question is marked resolved",
      exact: true,
    }),
  ).toBeVisible();
  await desk
    .getByRole("combobox", { name: "Your saved contact plans", exact: true })
    .selectOption("urgent:unknown");
  await expect(
    desk.getByRole("heading", { name: "You still need a reply", exact: true }),
  ).toBeVisible();
  await expect(
    desk.getByLabel("My follow-up reminder", { exact: true }),
  ).toHaveValue("2099-10-24");
  await context.setOffline(false);
  await nav(page, "Settings");
  await page
    .getByRole("combobox", { name: "Appearance", exact: true })
    .selectOption("dark");
  await nav(page, "Overview");
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(
    axe.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await desk
    .getByRole("button", {
      name: "Start a different contact plan",
      exact: true,
    })
    .click();
  await desk
    .getByRole("button", { name: /I received a housing notice/ })
    .click();
  await desk
    .getByText("After you try: record what happened", { exact: true })
    .click();
  await desk
    .getByLabel("Response date from my letter or provider, if any", {
      exact: true,
    })
    .fill("2000-01-01");
  await desk
    .getByRole("combobox", { name: "Your saved contact plans", exact: true })
    .selectOption("application:city");
  await desk
    .getByRole("button", {
      name: "Review saved dates: I received a housing notice",
      exact: true,
    })
    .click();
  await expect(
    desk.getByRole("heading", {
      name: "Check the response date you saved",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    desk.getByRole("link", { name: "Call 1-877-534-2524", exact: true }),
  ).toBeVisible();
});
test("real-program step help respects new versus existing applicants and offers the sourced assisted route", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find real programs", exact: true })
    .click();
  await page
    .getByTestId("official-program-county-public")
    .getByRole("button", {
      name: "Save County Public Housing follow-up plan",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Get real help with Read the current access instructions",
      exact: true,
    })
    .click();
  const desk = page.getByTestId("help-desk");
  await expect(
    desk.getByRole("link", { name: "Call 211", exact: true }),
  ).toBeVisible();
  await nav(page, "My checklist");
  await page
    .getByRole("combobox", { name: "Which situation fits you?", exact: true })
    .selectOption("existing");
  await page
    .getByRole("button", {
      name: "Get real help with Use your existing agency account or its registration guide",
      exact: true,
    })
    .click();
  await expect(
    desk.getByRole("link", { name: "Call 858-694-4801", exact: true }),
  ).toBeVisible();
  await desk
    .getByRole("combobox", {
      name: "Is something making this difficult?",
      exact: true,
    })
    .selectOption("technology");
  await expect(desk).toContainText("mail, fax and in-person alternatives");
  await expect(
    desk.getByRole("link", {
      name: "County instructions for assisted access",
      exact: false,
    }),
  ).toHaveAttribute(
    "href",
    "https://www.sandiegocounty.gov/content/sdc/sdhcd/rental-assistance/Yardi.html",
  );
  await nav(page, "My checklist");
  await expect(
    page.locator('.official-plan-card [role="progressbar"]'),
  ).toHaveAttribute("aria-valuenow", "0");
  await expect(
    page.getByRole("checkbox", {
      name: "Read the current access instructions",
      exact: false,
    }),
  ).not.toBeChecked();
});
