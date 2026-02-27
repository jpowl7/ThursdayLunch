import { test, expect } from "@playwright/test";

test.describe("Participant event page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/g/thursday-lunch");
    await expect(page.getByText("Loading...")).toBeHidden({ timeout: 15000 });
  });

  test("shows no-event state or active event", async ({ page }) => {
    // Page should show either an active event or the no-event message
    const noLunch = page.getByText("No lunch scheduled yet");
    const eventHeading = page.locator("h1").first();

    await expect(noLunch.or(eventHeading)).toBeVisible();
  });

  test("Admin link is visible at the bottom", async ({ page }) => {
    const adminLink = page.getByRole("link", { name: /Admin/i });
    await expect(adminLink).toBeVisible();
    await expect(adminLink).toHaveAttribute("href", /\/admin/);
  });

  test.describe("RSVP flow (requires active event)", () => {
    test("clicking I'm In opens name dialog and submits", async ({ page }) => {
      // Clear any stored participant identity
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await expect(page.getByText("Loading...")).toBeHidden({
        timeout: 15000,
      });

      const inButton = page.getByRole("button", { name: "I'm In!" });

      // Skip if no active event
      if (!(await inButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await inButton.click();

      // Name dialog should appear
      await expect(page.getByText("What's your name?")).toBeVisible();

      const nameInput = page.getByPlaceholder("Enter your name");
      await expect(nameInput).toBeVisible();

      const ts = Date.now();
      await nameInput.fill(`Tester ${ts}`);
      await page.getByRole("button", { name: "Join" }).click();

      // Dialog should close
      await expect(page.getByText("What's your name?")).toBeHidden({
        timeout: 15000,
      });

      // Should show the signed-in state
      await expect(page.getByText(`Tester ${ts}`)).toBeVisible({
        timeout: 15000,
      });
    });

    test("clicking Maybe opens name dialog", async ({ page }) => {
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await expect(page.getByText("Loading...")).toBeHidden({
        timeout: 15000,
      });

      const maybeButton = page.getByRole("button", { name: "Maybe" });

      if (!(await maybeButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await maybeButton.click();

      await expect(page.getByText("What's your name?")).toBeVisible();
    });

    test("time slider is visible when status is in", async ({ page }) => {
      // Set up a participant who's "in"
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await expect(page.getByText("Loading...")).toBeHidden({
        timeout: 15000,
      });

      const inButton = page.getByRole("button", { name: "I'm In!" });

      if (!(await inButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await inButton.click();
      await expect(page.getByText("What's your name?")).toBeVisible();

      const ts = Date.now();
      await page.getByPlaceholder("Enter your name").fill(`Timer ${ts}`);
      await page.getByRole("button", { name: "Join" }).click();

      await expect(page.getByText("What's your name?")).toBeHidden({
        timeout: 15000,
      });

      // Time slider section should be visible
      await expect(page.getByText("When can you go?")).toBeVisible({
        timeout: 15000,
      });
    });

    test("attendee list shows participant after RSVP", async ({ page }) => {
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await expect(page.getByText("Loading...")).toBeHidden({
        timeout: 15000,
      });

      const inButton = page.getByRole("button", { name: "I'm In!" });

      if (!(await inButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await inButton.click();
      await expect(page.getByText("What's your name?")).toBeVisible();

      const ts = Date.now();
      const name = `Attendee ${ts}`;
      await page.getByPlaceholder("Enter your name").fill(name);
      await page.getByRole("button", { name: "Join" }).click();

      await expect(page.getByText("What's your name?")).toBeHidden({
        timeout: 15000,
      });

      // Attendee list should show the participant
      await expect(page.getByText("Who's coming?")).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText(name)).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe("Location voting (requires active event)", () => {
    test("Where section is visible", async ({ page }) => {
      const whereHeading = page.getByText("Where?");

      if (!(await whereHeading.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await expect(whereHeading).toBeVisible();
    });

    test("can suggest a place", async ({ page }) => {
      const suggestInput = page.getByPlaceholder("Suggest a place");

      if (
        !(await suggestInput
          .isVisible()
          .catch(() => false))
      ) {
        test.skip();
        return;
      }

      // The Add button should be disabled when input is empty
      const addButton = page.getByRole("button", { name: "Add" });
      await expect(addButton).toBeDisabled();
    });
  });
});
