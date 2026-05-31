/**
 * Example automation task.
 * Demonstrates: login → analyze page → perform actions.
 *
 * Usage:
 *   cd scripts/automation && node tasks/example.mjs
 */
import { createSession } from "../core/browser.mjs";
import { summarizePage, findSelectorByText } from "../utils/page-analyzer.mjs";
import { CONFIG, BROWSER_DEFAULTS } from "../config.mjs";

async function run() {
  const site = CONFIG.example;
  const session = await createSession(BROWSER_DEFAULTS);

  try {
    // 1. Navigate to login page
    await session.goto(site.loginUrl);

    // 2. Analyze the page structure
    const pageInfo = await session.analyzePage();
    console.log(summarizePage(pageInfo));

    // 3. Check if already logged in
    if (pageInfo.textContent.includes("Welcome") || !pageInfo.textContent.includes("login")) {
      console.log("\nAlready logged in or no login required.");
    } else {
      // 4. Fill login form
      await session.fill(site.selectors.usernameInput, site.credentials.username);
      await session.fill(site.selectors.passwordInput, site.credentials.password);
      await session.click(site.selectors.submitButton);
      await session.waitForNavigation();

      // 5. Save login state for next time
      await session.saveState();
      console.log("\nLogin completed and state saved.");
    }

    // 6. Post-login: analyze the dashboard
    const dashboardInfo = await session.analyzePage();
    console.log("\n--- Dashboard Analysis ---");
    console.log(summarizePage(dashboardInfo));

    // 7. Example: find and click a button by text
    const targetSelector = findSelectorByText(dashboardInfo, "profile|settings|account");
    if (targetSelector) {
      console.log(`\nFound target: ${targetSelector}`);
      // await session.click(targetSelector);
    }

    // 8. Take a screenshot
    await session.screenshot("dashboard");

    console.log("\nTask completed successfully.");
  } catch (err) {
    console.error("\nTask failed:", err.message);
    await session.screenshot("error");
    throw err;
  } finally {
    await session.close();
  }
}

run();
