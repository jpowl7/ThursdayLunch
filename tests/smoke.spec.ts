import { test, expect } from "@playwright/test";

test("homepage loads and renders", async ({ page }) => {
  await page.goto("/");

  // Wait for loading spinner to disappear
  await expect(page.getByText("Loading...")).toBeHidden({ timeout: 15000 });

  // Page should show either an active event or the "no lunch scheduled" state
  const eventHeader = page.locator("header").first();
  const noLunch = page.getByText("No lunch scheduled yet");

  await expect(eventHeader.or(noLunch)).toBeVisible();
});
