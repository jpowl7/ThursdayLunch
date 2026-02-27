import { test, expect } from "@playwright/test";

test("landing page loads and renders", async ({ page }) => {
  await page.goto("/");

  // Landing page should show the app title and action buttons
  await expect(page.getByRole("heading", { name: "I LIKE LUNCH!" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Join a Group/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Create a Group/i })).toBeVisible();
});

test("group page loads for existing group", async ({ page }) => {
  await page.goto("/g/thursday-lunch");

  // Wait for loading spinner to disappear
  await expect(page.getByText("Loading...")).toBeHidden({ timeout: 15000 });

  // Page should show either an active event or the "no lunch scheduled" state
  const eventHeader = page.locator("header").first();
  const noLunch = page.getByText("No lunch scheduled yet");

  await expect(eventHeader.or(noLunch)).toBeVisible();
});
