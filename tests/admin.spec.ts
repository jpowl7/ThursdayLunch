import { test, expect } from "@playwright/test";

test.describe("Admin page", () => {
  test("shows passcode input when not authenticated", async ({ page }) => {
    await page.goto("/g/thursday-lunch/admin");

    // Should show the lock icon and passcode prompt
    await expect(page.getByText("Enter group passcode")).toBeVisible();

    // Should have a passcode input and a Go button
    await expect(page.getByPlaceholder("0000")).toBeVisible();
    await expect(page.getByRole("button", { name: "Go" })).toBeVisible();
  });

  test("Go button is disabled when passcode input is incomplete", async ({ page }) => {
    await page.goto("/g/thursday-lunch/admin");

    await expect(page.getByRole("button", { name: "Go" })).toBeDisabled();
  });

  test("Go button enables after typing a 4-digit passcode", async ({ page }) => {
    await page.goto("/g/thursday-lunch/admin");

    await page.getByPlaceholder("0000").fill("1234");
    await expect(page.getByRole("button", { name: "Go" })).toBeEnabled();
  });

  test("submitting passcode shows loading then admin content", async ({ page }) => {
    await page.goto("/g/thursday-lunch/admin");

    await page.getByPlaceholder("0000").fill("1234");
    await page.getByRole("button", { name: "Go" }).click();

    // Should show loading state then transition to admin view
    await expect(page.getByText("Loading...")).toBeHidden({ timeout: 15000 });

    // After loading, should show the admin header with group name
    await expect(
      page.getByRole("heading", { name: /Admin/i })
    ).toBeVisible();
  });
});
