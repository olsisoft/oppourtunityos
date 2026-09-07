import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end coverage of the critical flows. Requires:
 *   - a running PostgreSQL with migrations applied
 *   - `npm run db:seed` (demo user + Beauty Salons workspace)
 *   - AI_PROVIDER=mock (set by playwright.config.ts)
 */
const DEMO_EMAIL = "demo@opportunityos.dev";
const DEMO_PASSWORD = "demo1234";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/app/);
}

test("landing page states the product philosophy", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Stop asking AI for startup ideas." }),
  ).toBeVisible();
  await expect(page.getByText("Discover problems worth solving.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Find an opportunity/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Validate an idea" }).first()).toBeVisible();
});

test("register a new user and land on the dashboard", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/app/);
  await expect(page.getByText("Start your first discovery")).toBeVisible();
});

test("demo workspace shows scored opportunities, evidence and a report", async ({ page }) => {
  await login(page);
  await expect(
    page.getByRole("heading", { name: "What should I investigate next?" }),
  ).toBeVisible();
  await expect(page.getByText("Next recommended research action")).toBeVisible();

  await page
    .getByRole("link", { name: /Beauty Salons \(demo\)/ })
    .first()
    .click();
  await page.waitForURL(/\/app\/w\//);
  await expect(page.getByText("Discovery progress")).toBeVisible();

  // Radar shows deterministic verdicts.
  await page.getByRole("tab", { name: /Radar/ }).click();
  await expect(
    page.getByRole("link", { name: "Employee revenue leakage detection" }),
  ).toBeVisible();
  await expect(page.getByText("TEST", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("KILL", { exact: true }).first()).toBeVisible();

  // Evidence tab labels demo data.
  await page.getByRole("tab", { name: /Evidence/ }).click();
  await expect(page.getByText("DEMO DATA").first()).toBeVisible();

  // Report page explains the scores.
  await page.getByRole("tab", { name: /Radar/ }).click();
  await page.getByRole("link", { name: "Salon no-show prevention" }).click();
  await page.waitForURL(/\/opportunities\//);
  await expect(page.getByRole("heading", { name: "Salon no-show prevention" })).toBeVisible();
  await expect(page.getByText("Why this verdict")).toBeVisible();
  await expect(page.getByText("Why this Opportunity Potential")).toBeVisible();
  await expect(page.getByText("Why this Evidence Confidence")).toBeVisible();
  await expect(page.getByText("Next best action")).toBeVisible();
  await expect(page.getByText("Critical assumptions")).toBeVisible();
});

test("a new workspace runs the 'I already have an idea' flow and updates the map", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "New discovery" }).click();
  await page.getByLabel("Name").fill(`E2E dental ${Date.now()}`);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.waitForURL(/\/app\/w\//);

  await page.getByRole("button", { name: "I already have an idea" }).click();
  await page.getByPlaceholder(/Describe the idea/).fill("AI receptionist for dental clinics");
  await page.getByRole("button", { name: "Decompose the idea" }).click();

  await expect(page.getByText(/MOCK PROVIDER/).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Added to workspace/)).toBeVisible({ timeout: 30_000 });

  // Right panel reflects structured state.
  await expect(page.getByText("Dental clinics", { exact: true }).first()).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("tab", { name: "Variables" }).click();
  await expect(page.getByText("Missed calls").first()).toBeVisible();

  // Answer the question card; conversation advances.
  await page.getByRole("button", { name: "Missed calls" }).first().click();
  await expect(page.getByText(/Current state: UNKNOWN/).first()).toBeVisible({ timeout: 30_000 });

  // Add evidence manually through the panel.
  await page.getByRole("tab", { name: /Evidence/ }).click();
  await page.getByRole("button", { name: "Add evidence" }).click();
  await page.getByLabel("Source title").fill("Interview — clinic owner (e2e)");
  await page
    .getByLabel(/Excerpt/)
    .fill(
      "We miss about 15 calls a day during treatments; each missed new-patient call is worth roughly €300.",
    );
  await page.getByRole("button", { name: "Save evidence" }).click();
  await expect(page.getByText("Interview — clinic owner (e2e)")).toBeVisible({ timeout: 15_000 });
});
