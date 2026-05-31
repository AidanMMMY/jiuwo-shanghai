/**
 * Page analysis utilities.
 * Helps extract structured data and identify interactive elements.
 */

/**
 * Format page analysis into a human-readable summary.
 */
export function summarizePage(info) {
  const lines = [
    `=== ${info.title} ===`,
    `URL: ${info.url}`,
    "",
    "--- Headings ---",
    ...info.headings.map((h) => `  [${h.tag}] ${h.text}`),
    "",
    "--- Inputs ---",
    ...info.inputs.map((i) => {
      const label = i.placeholder || i.name || i.id || i.class;
      return `  [${i.tag}${i.type ? "/" + i.type : ""}] ${label} (selector: ${i.selector})`;
    }),
    "",
    "--- Buttons ---",
    ...info.buttons.slice(0, 10).map((b) => `  [${b.tag}] ${b.text} (selector: ${b.selector})`),
    info.buttons.length > 10 ? `  ... and ${info.buttons.length - 10} more` : "",
    "",
    "--- Links (first 10) ---",
    ...info.links.slice(0, 10).map((l) => `  ${l.text.slice(0, 50)} → ${l.href.slice(0, 60)}`),
    "",
    "--- Page Text (first 500 chars) ---",
    info.textContent.slice(0, 500),
  ];
  return lines.filter(Boolean).join("\n");
}

/**
 * Find the best selector for an element by its text content.
 */
export function findSelectorByText(info, textPattern, type = "button") {
  const items = type === "button" ? info.buttons : info.inputs;
  const regex = new RegExp(textPattern, "i");
  const match = items.find((item) => regex.test(item.text) || regex.test(item.placeholder) || regex.test(item.name));
  return match ? match.selector : null;
}

/**
 * Extract all links matching a pattern.
 */
export function findLinksByPattern(info, pattern) {
  const regex = new RegExp(pattern, "i");
  return info.links.filter((l) => regex.test(l.href) || regex.test(l.text));
}

/**
 * Check if page contains specific text.
 */
export function pageContains(info, text) {
  return info.textContent.toLowerCase().includes(text.toLowerCase());
}
