import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { officialCatalog } from "../../lib/official-catalog";
test.setTimeout(60000);
async function nav(page: Page, name: string) {
  await page.locator("#main-navigation").waitFor({ state: "attached" });
  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}
function report(changed = false) {
  const checkedAt = new Date().toISOString();
  return {
    schemaVersion: 1,
    catalogVersion: officialCatalog.version,
    mode: "online",
    checkedAt,
    checks: officialCatalog.sources.map((source) => ({
      sourceId: source.id,
      checkedAt,
      state:
        changed &&
        ["county-applications", "county-public-policy"].includes(source.id)
          ? "needs-review"
          : "matches-reviewed-facts",
      sha256: source.sha256,
      reason:
        "Deterministic browser-test source response; not a provider request.",
    })),
  };
}
async function noAxe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
test("real official instructions, existing-applicant OR route, correction, document proof and offline persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find real programs", exact: true })
    .click();
  const search = page.getByRole("textbox", {
    name: "Search resources",
    exact: true,
  });
  await search.fill("HUD-VASH");
  await expect(page.getByTestId("official-program-county-vash")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No matching resources", exact: true }),
  ).toHaveCount(0);
  await search.fill("");
  const card = page.getByTestId("official-program-county-public");
  await expect(card).toContainText("Waiting list closed to new applicants");
  await card
    .getByText("Compare the published criteria", { exact: true })
    .click();
  await expect(card).toContainText("Published sources conflict");
  await noAxe(page);
  await card
    .getByRole("button", {
      name: "Review household and city answers",
      exact: true,
    })
    .click();
  await page.getByLabel("Household size", { exact: true }).fill("2");
  await page
    .getByLabel("Approximate annual household income ($)", { exact: true })
    .fill("70001");
  await page
    .getByRole("combobox", {
      name: "City or community for real programs",
      exact: true,
    })
    .selectOption("City of San Diego");
  await nav(page, "Find help");
  await card
    .getByText("Compare the published criteria", { exact: true })
    .click();
  await expect(card).toContainText(
    "above the 50% figure and at or below the 80% figure",
  );
  await expect(card).not.toContainText("Likely ineligible");
  await card
    .getByRole("button", {
      name: "Save County Public Housing follow-up plan",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Your real-program next steps",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Which situation fits you?", exact: true })
    .selectOption("existing");
  const read = page.getByRole("checkbox", {
    name: "Read the current access instructions",
    exact: false,
  });
  const assisted = page.getByRole("checkbox", {
    name: "Arrange County help without the online portal",
    exact: false,
  });
  const contact = page.getByRole("checkbox", {
    name: "Check your contact information with the County",
    exact: false,
  });
  await expect(contact).toBeDisabled();
  await read.check();
  await assisted.check();
  await expect(contact).toBeEnabled();
  await expect(
    page.locator('.official-plan-card [role="progressbar"]'),
  ).toHaveAttribute("aria-valuenow", "40");
  await expect(
    page.getByRole("checkbox", {
      name: "Use your existing agency account or its registration guide",
      exact: false,
    }),
  ).not.toBeChecked();
  await contact.check();
  await page
    .getByRole("checkbox", {
      name: "Check and respond to County letters",
      exact: false,
    })
    .check();
  await page
    .getByRole("checkbox", {
      name: "Keep your confirmation and decide whether to follow up",
      exact: false,
    })
    .check();
  await expect(
    page.locator('.official-plan-card [role="progressbar"]'),
  ).toHaveAttribute("aria-valuenow", "100");
  await assisted.uncheck();
  await expect(contact).not.toBeChecked();
  await expect(contact).toBeDisabled();
  await noAxe(page);
  await nav(page, "Documents");
  await page
    .getByLabel("Employer statement for the working preference", {
      exact: true,
    })
    .check();
  await expect(page.locator(".official-document-workspace")).toContainText(
    "You marked one listed evidence option as available",
  );
  await expect(
    page.getByLabel("Recent paystub(s) for the working preference", {
      exact: true,
    }),
  ).not.toBeChecked();
  await noAxe(page);
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export preparation packet", exact: true })
    .click();
  const downloaded = await downloading;
  const stream = await downloaded.createReadStream();
  let packet = "";
  for await (const chunk of stream!) packet += chunk.toString();
  expect(packet).toContain("REAL PROGRAM — PERSONAL FOLLOW-UP");
  expect(packet).toContain("Employer statement: marked available");
  expect(packet).toContain("page 7-23");
  expect(packet).not.toContain("Fresh Start");
  expect(packet).not.toContain("0/0 milestones");
  expect(packet).not.toContain("ROUTE RESCUE");
  await expect(page.locator(".sidebar-foot")).toContainText(
    "Saved on this device",
  );
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await page.context().setOffline(true);
  await page.reload();
  await nav(page, "Documents");
  await expect(
    page.getByLabel("Employer statement for the working preference", {
      exact: true,
    }),
  ).toBeChecked();
  await nav(page, "My checklist");
  await expect(
    page.locator('.official-plan-card [role="progressbar"]'),
  ).toHaveAttribute("aria-valuenow", "40");
  await expect(contact).toBeDisabled();
  await page.context().setOffline(false);
  await nav(page, "Overview");
  await expect(page.locator(".official-overview")).toContainText(
    "County Public Housing",
  );
  const demoMenu = page.getByRole("button", { name: "Open menu", exact: true });
  if (await demoMenu.isVisible()) await demoMenu.click();
  await page.getByRole("button", { name: "Explore Demo", exact: true }).click();
  await nav(page, "My checklist");
  await expect(
    page.getByRole("heading", { name: "Your next steps", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to my workspace", exact: true })
    .click();
  await nav(page, "Documents");
  await expect(
    page.getByLabel("Employer statement for the working preference", {
      exact: true,
    }),
  ).toBeChecked();
  expect(errors).toEqual([]);
});
test("page checks flag changed facts, label offline cache, preserve state on failure and transmit no profile", async ({
  page,
}) => {
  let changed = false,
    fail = false;
  const requests: string[] = [];
  await page.route("**/api/source-status", async (route) => {
    requests.push(route.request().url());
    expect(route.request().method()).toBe("GET");
    expect(route.request().postData()).toBeNull();
    await route.fulfill(
      fail
        ? { status: 503, body: "Unavailable" }
        : {
            contentType: "application/json",
            body: JSON.stringify(report(changed)),
          },
    );
  });
  await page.goto("/");
  await nav(page, "Find help");
  await page
    .getByRole("button", { name: "Check official pages", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Source check loaded" }),
  ).toBeVisible();
  await expect(page.getByTestId("official-program-county-hcv")).toContainText(
    "recent page check still found",
  );
  changed = true;
  await page
    .getByRole("button", { name: "Check official pages", exact: true })
    .click();
  const card = page.getByTestId("official-program-county-public");
  await expect(card).toContainText(
    "Published information needs another review",
  );
  await card
    .getByText("Compare the published criteria", { exact: true })
    .click();
  await expect(card).toContainText("A source changed");
  await card
    .getByRole("button", {
      name: "Save County Public Housing follow-up plan",
      exact: true,
    })
    .click();
  await nav(page, "Find help");
  fail = true;
  await page
    .getByRole("button", { name: "Check official pages", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "could not finish" }),
  ).toBeVisible();
  await expect(card).toContainText(
    "Published information needs another review",
  );
  await expect(page.locator(".sidebar-foot")).toContainText(
    "Saved on this device",
  );
  await page.context().setOffline(true);
  await expect(
    page.getByRole("button", { name: "Offline — saved guidance", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".official-check-control")).toContainText(
    "not live while offline",
  );
  await page.context().setOffline(false);
  await nav(page, "Settings");
  await page
    .getByRole("combobox", { name: "Appearance", exact: true })
    .selectOption("dark");
  await nav(page, "Find help");
  await noAxe(page);
  expect(requests.length).toBe(3);
  expect(requests.every((url) => new URL(url).search === "")).toBe(true);
  const response = await page.request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
});
