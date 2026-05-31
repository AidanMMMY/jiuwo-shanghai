/**
 * Automation configuration.
 * Add your target websites and credentials here.
 */

export const CONFIG = {
  // Example target website
  example: {
    baseUrl: "https://example.com",
    loginUrl: "https://example.com/login",
    credentials: {
      username: process.env.AUTO_USERNAME || "",
      password: process.env.AUTO_PASSWORD || "",
    },
    selectors: {
      usernameInput: 'input[name="username"], input[name="email"], input[type="email"]',
      passwordInput: 'input[name="password"], input[type="password"]',
      submitButton: 'button[type="submit"], input[type="submit"]',
    },
  },

  // Add more sites here...
  // mysite: {
  //   baseUrl: "https://mysite.com",
  //   ...
  // },
};

/**
 * Browser behavior settings.
 */
export const BROWSER_DEFAULTS = {
  headless: true,
  viewport: { width: 1440, height: 900 },
  slowMo: 0, // ms delay between actions (set > 0 to slow down for debugging)
};
