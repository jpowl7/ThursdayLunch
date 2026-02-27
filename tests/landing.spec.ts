import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders heading and action buttons", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "I LIKE LUNCH!" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Join a Group/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Create a Group/i })
    ).toBeVisible();
  });

  test.describe("Join flow", () => {
    test("type slug and navigate to group page", async ({ page }) => {
      await page.goto("/");

      await page.getByRole("button", { name: /Join a Group/i }).click();

      const slugInput = page.getByPlaceholder("e.g. thursday-lunch");
      await expect(slugInput).toBeVisible();

      await slugInput.fill("thursday-lunch");
      await page.getByRole("button", { name: "Go" }).click();

      await page.waitForURL("/g/thursday-lunch");
      await expect(page).toHaveURL("/g/thursday-lunch");
    });

    test("shows error for invalid slug", async ({ page }) => {
      await page.goto("/");

      await page.getByRole("button", { name: /Join a Group/i }).click();

      const slugInput = page.getByPlaceholder("e.g. thursday-lunch");
      await slugInput.fill("nonexistent-group-xyz");
      await page.getByRole("button", { name: "Go" }).click();

      await expect(page.getByText("Group not found")).toBeVisible({
        timeout: 15000,
      });
    });

    test("Back button returns to home mode", async ({ page }) => {
      await page.goto("/");

      await page.getByRole("button", { name: /Join a Group/i }).click();
      await expect(
        page.getByPlaceholder("e.g. thursday-lunch")
      ).toBeVisible();

      await page.getByRole("button", { name: /Back/i }).click();

      await expect(
        page.getByRole("button", { name: /Join a Group/i })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Create a Group/i })
      ).toBeVisible();
    });
  });

  test.describe("Create flow", () => {
    test("fill form and create group", async ({ page }) => {
      await page.goto("/");

      await page.getByRole("button", { name: /Create a Group/i }).click();

      const ts = Date.now();
      const groupName = `Test Group ${ts}`;

      await page.getByPlaceholder("Thursday Lunch Crew").fill(groupName);
      await page.getByPlaceholder("0000").fill("5678");

      await page.getByRole("button", { name: "Create Group" }).click();

      // Should redirect to the new group's admin page
      await page.waitForURL(/\/g\/.*\/admin/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/g\/test-group-.*\/admin/);
    });
  });

  test.describe("Groups directory", () => {
    test("shows existing groups and navigates on click", async ({ page }) => {
      await page.goto("/");

      // The groups list should contain at least the seeded group
      const groupLink = page.getByRole("link", { name: /thursday/i });
      await expect(groupLink).toBeVisible({ timeout: 15000 });

      await groupLink.click();
      await page.waitForURL(/\/g\//);
      await expect(page).toHaveURL(/\/g\//);
    });
  });
});
