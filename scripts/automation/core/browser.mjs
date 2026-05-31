/**
 * Browser automation core wrapper.
 * Handles headless browsing, login state, screenshots, and safe interactions.
 */
import { chromium } from "playwright";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STORAGE_DIR = join(ROOT, ".storage");
const STATE_FILE = join(STORAGE_DIR, "state.json");

mkdirSync(STORAGE_DIR, { recursive: true });

export class BrowserSession {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.slowMo = options.slowMo || 0;
    this.viewport = options.viewport || { width: 1440, height: 900 };
    this.userAgent =
      options.userAgent ||
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  /**
   * Launch browser. Reuses saved login state if available.
   */
  async launch() {
    const launchOptions = {
      headless: this.headless,
      slowMo: this.slowMo,
    };

    // Anti-detection tweaks for headless
    if (this.headless) {
      launchOptions.args = [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ];
    }

    this.browser = await chromium.launch(launchOptions);

    const contextOptions = {
      viewport: this.viewport,
      userAgent: this.userAgent,
    };

    // Load saved auth state
    if (existsSync(STATE_FILE)) {
      contextOptions.storageState = STATE_FILE;
      console.log("[Browser] Loaded saved login state");
    }

    this.context = await this.browser.newContext(contextOptions);

    // Mask automation
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      window.chrome = { runtime: {} };
    });

    this.page = await this.context.newPage();
    return this;
  }

  /**
   * Navigate to URL and wait for load.
   */
  async goto(url, options = {}) {
    const waitUntil = options.waitUntil || "networkidle";
    await this.page.goto(url, { waitUntil });
    console.log(`[Browser] Navigated to: ${url}`);
    return this;
  }

  /**
   * Get structured page info: title, URL, forms, links, buttons, inputs.
   */
  async analyzePage() {
    const info = await this.page.evaluate(() => {
      const toArray = (nodeList) =>
        Array.from(nodeList).map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().slice(0, 100) || "",
          id: el.id || "",
          class: el.className?.toString().slice(0, 80) || "",
          href: el.href || "",
          type: el.type || "",
          name: el.name || "",
          placeholder: el.placeholder || "",
          selector: el.id
            ? `#${el.id}`
            : el.className
              ? `.${el.className.toString().split(" ")[0]}`
              : el.tagName.toLowerCase(),
        }));

      return {
        title: document.title,
        url: window.location.href,
        headings: toArray(document.querySelectorAll("h1, h2, h3")),
        forms: toArray(document.querySelectorAll("form")),
        inputs: toArray(
          document.querySelectorAll(
            'input:not([type="hidden"]), textarea, select'
          )
        ),
        buttons: toArray(document.querySelectorAll("button, [role='button']")),
        links: toArray(document.querySelectorAll("a[href]")).slice(0, 20),
        textContent: document.body.innerText.slice(0, 3000),
      };
    });
    return info;
  }

  /**
   * Fill a form field by selector.
   */
  async fill(selector, value, options = {}) {
    await this.page.waitForSelector(selector, { timeout: options.timeout || 5000 });
    await this.page.fill(selector, value);
    console.log(`[Browser] Filled "${selector}" with "${value.slice(0, 50)}..."`);
    return this;
  }

  /**
   * Click an element by selector.
   */
  async click(selector, options = {}) {
    await this.page.waitForSelector(selector, { timeout: options.timeout || 5000 });
    await this.page.click(selector);
    console.log(`[Browser] Clicked "${selector}"`);
    return this;
  }

  /**
   * Select dropdown option.
   */
  async select(selector, value) {
    await this.page.selectOption(selector, value);
    console.log(`[Browser] Selected "${value}" in "${selector}"`);
    return this;
  }

  /**
   * Type text (simulates keystrokes, useful for search boxes with autocomplete).
   */
  async type(selector, text, options = {}) {
    await this.page.type(selector, text, { delay: options.delay || 50 });
    return this;
  }

  /**
   * Wait for element to appear.
   */
  async waitFor(selector, options = {}) {
    await this.page.waitForSelector(selector, { timeout: options.timeout || 10000 });
    return this;
  }

  /**
   * Wait for navigation after an action.
   */
  async waitForNavigation(options = {}) {
    await this.page.waitForLoadState(options.waitUntil || "networkidle");
    return this;
  }

  /**
   * Extract text content matching a selector.
   */
  async extractText(selector) {
    const el = await this.page.locator(selector).first();
    if (!el) return null;
    return await el.textContent();
  }

  /**
   * Extract multiple elements' text.
   */
  async extractAllTexts(selector) {
    return await this.page.locator(selector).allTextContents();
  }

  /**
   * Extract element attributes.
   */
  async extractAttr(selector, attr) {
    return await this.page.locator(selector).first().getAttribute(attr);
  }

  /**
   * Take screenshot.
   */
  async screenshot(name = "screenshot") {
    const path = join(STORAGE_DIR, `${name}-${Date.now()}.png`);
    await this.page.screenshot({ path, fullPage: true });
    console.log(`[Browser] Screenshot saved: ${path}`);
    return path;
  }

  /**
   * Save current login state for reuse.
   */
  async saveState() {
    await this.context.storageState({ path: STATE_FILE });
    console.log("[Browser] Login state saved");
  }

  /**
   * Execute custom evaluation on the page.
   */
  async evaluate(fn, ...args) {
    return await this.page.evaluate(fn, ...args);
  }

  /**
   * Close browser.
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log("[Browser] Closed");
    }
  }
}

/**
 * Convenience: create and launch a session in one call.
 */
export async function createSession(options) {
  const session = new BrowserSession(options);
  await session.launch();
  return session;
}
