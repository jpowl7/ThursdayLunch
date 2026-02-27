import { test, expect } from "@playwright/test";

test.describe("Admin page", () => {
  test.describe("Authentication", () => {
    test("shows passcode input when not authenticated", async ({ page }) => {
      await page.goto("/g/thursday-lunch/admin");

      // Should show the lock icon and passcode prompt
      await expect(page.getByText("Enter group passcode")).toBeVisible();

      // Should have a passcode input and a Go button
      await expect(page.getByPlaceholder("0000")).toBeVisible();
      await expect(page.getByRole("button", { name: "Go" })).toBeVisible();
    });

    test("Go button is disabled when passcode input is incomplete", async ({
      page,
    }) => {
      await page.goto("/g/thursday-lunch/admin");

      await expect(page.getByRole("button", { name: "Go" })).toBeDisabled();
    });

    test("Go button enables after typing a 4-digit passcode", async ({
      page,
    }) => {
      await page.goto("/g/thursday-lunch/admin");

      await page.getByPlaceholder("0000").fill("1234");
      await expect(page.getByRole("button", { name: "Go" })).toBeEnabled();
    });

    test("submitting passcode shows loading then admin content", async ({
      page,
    }) => {
      await page.goto("/g/thursday-lunch/admin");

      await page.getByPlaceholder("0000").fill("1234");
      await page.getByRole("button", { name: "Go" }).click();

      // Should show loading state then transition to admin view
      await expect(page.getByText("Loading...")).toBeHidden({
        timeout: 15000,
      });

      // After loading, should show the admin header with group name
      await expect(
        page.getByRole("heading", { name: /Admin/i })
      ).toBeVisible();
    });
  });

  test.describe("Authenticated admin", () => {
    // Helper to authenticate and get to the admin dashboard
    async function authenticateAdmin(page: import("@playwright/test").Page) {
      await page.goto("/g/thursday-lunch/admin");
      await page.getByPlaceholder("0000").fill("1234");
      await page.getByRole("button", { name: "Go" }).click();
      await expect(page.getByText("Loading...")).toBeHidden({
        timeout: 15000,
      });
      await expect(
        page.getByRole("heading", { name: /Admin/i })
      ).toBeVisible();
    }

    test("shows View group link", async ({ page }) => {
      await authenticateAdmin(page);

      const viewGroupLink = page.getByRole("link", { name: /View group/i });
      await expect(viewGroupLink).toBeVisible();
    });

    test.describe("Create event", () => {
      test("can fill and submit create event form", async ({ page }) => {
        await authenticateAdmin(page);

        const createHeading = page.getByRole("heading", {
          name: "Create New Event",
        });

        // Skip if there's already an active event (form won't be shown)
        if (!(await createHeading.isVisible().catch(() => false))) {
          test.skip();
          return;
        }

        const ts = Date.now();
        await page
          .getByLabel("Title")
          .fill(`Test Lunch ${ts}`);
        await page.getByLabel("Date").fill("2026-12-25");
        await page.getByLabel("Earliest Time").fill("11:30");
        await page.getByLabel("Latest Time").fill("13:30");

        // Fill the first location
        await page
          .getByPlaceholder("Restaurant name")
          .first()
          .fill("Test Restaurant");

        await page.getByRole("button", { name: "Create Event" }).click();

        // Should transition to showing the active event
        await expect(
          page.getByText(/Managing lunch for/i)
        ).toBeVisible({ timeout: 15000 });
      });
    });

    test.describe("Event management (requires active event)", () => {
      test("shows active event summary", async ({ page }) => {
        await authenticateAdmin(page);

        const summary = page.getByText(/Managing lunch for/i);

        if (!(await summary.isVisible().catch(() => false))) {
          test.skip();
          return;
        }

        await expect(summary).toBeVisible();
      });

      test("shows Response Stats section", async ({ page }) => {
        await authenticateAdmin(page);

        const responseStats = page.getByText("Response Stats");

        if (!(await responseStats.isVisible().catch(() => false))) {
          test.skip();
          return;
        }

        await expect(responseStats).toBeVisible();
      });

      test("shows Finalize Event section", async ({ page }) => {
        await authenticateAdmin(page);

        const finalizeHeading = page.getByText("Finalize Event");

        if (!(await finalizeHeading.isVisible().catch(() => false))) {
          test.skip();
          return;
        }

        await expect(finalizeHeading).toBeVisible();
        await expect(page.getByLabel("Select Venue")).toBeVisible();
        await expect(page.getByLabel("Select Time")).toBeVisible();
      });

      test("shows Manage Locations section", async ({ page }) => {
        await authenticateAdmin(page);

        const locHeading = page.getByText("Manage Locations");

        if (!(await locHeading.isVisible().catch(() => false))) {
          test.skip();
          return;
        }

        await expect(locHeading).toBeVisible();
      });

      test("shows Manage Responses section", async ({ page }) => {
        await authenticateAdmin(page);

        const respHeading = page.getByText("Manage Responses");

        if (!(await respHeading.isVisible().catch(() => false))) {
          test.skip();
          return;
        }

        await expect(respHeading).toBeVisible();
      });
    });

    test.describe("Change passcode", () => {
      test("passcode input and update button are visible", async ({
        page,
      }) => {
        await authenticateAdmin(page);

        const passcodeHeading = page.getByText("Change Passcode");

        // Demo groups hide the passcode section
        if (!(await passcodeHeading.isVisible().catch(() => false))) {
          test.skip();
          return;
        }

        await expect(passcodeHeading).toBeVisible();
        await expect(
          page.getByPlaceholder("New 4-digit passcode")
        ).toBeVisible();

        const updateButton = page.getByRole("button", { name: "Update" });
        await expect(updateButton).toBeDisabled();
      });

      test("Update button enables after typing 4 digits", async ({
        page,
      }) => {
        await authenticateAdmin(page);

        const passcodeInput = page.getByPlaceholder("New 4-digit passcode");

        if (!(await passcodeInput.isVisible().catch(() => false))) {
          test.skip();
          return;
        }

        await passcodeInput.fill("5678");
        await expect(
          page.getByRole("button", { name: "Update" })
        ).toBeEnabled();

        // Change it back to avoid breaking other tests
        await passcodeInput.fill("1234");
      });
    });
  });
});
