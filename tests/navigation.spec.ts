import { test, expect } from "@playwright/test";

test.describe("Cross-page navigation", () => {
  test("Admin link on participant page goes to admin", async ({ page }) => {
    await page.goto("/g/thursday-lunch");
    await expect(page.getByText("Loading...")).toBeHidden({ timeout: 15000 });

    const adminLink = page.getByRole("link", { name: /Admin/i });
    await expect(adminLink).toBeVisible();
    await adminLink.click();

    await page.waitForURL(/\/g\/thursday-lunch\/admin/);
    await expect(page).toHaveURL("/g/thursday-lunch/admin");
  });

  test("View group link on admin page goes to participant page", async ({
    page,
  }) => {
    await page.goto("/g/thursday-lunch/admin");

    // Authenticate
    await page.getByPlaceholder("0000").fill("1234");
    await page.getByRole("button", { name: "Go" }).click();
    await expect(page.getByText("Loading...")).toBeHidden({ timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: /Admin/i })
    ).toBeVisible();

    const viewGroupLink = page.getByRole("link", { name: /View group/i });
    await expect(viewGroupLink).toBeVisible();
    await viewGroupLink.click();

    await page.waitForURL("/g/thursday-lunch");
    await expect(page).toHaveURL("/g/thursday-lunch");
  });

  test("Landing page group list navigates to correct group", async ({
    page,
  }) => {
    await page.goto("/");

    const groupLink = page.getByRole("link", { name: /thursday/i });
    await expect(groupLink).toBeVisible({ timeout: 15000 });
    await groupLink.click();

    await page.waitForURL(/\/g\/thursday-lunch/);
    await expect(page).toHaveURL(/\/g\/thursday-lunch/);
  });
});
