import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright MCP Accessibility Snapshots Official 2026 Reference',
  description:
    'Full 2026 reference for Playwright MCP accessibility-snapshot: structured ARIA tree output, ref-based interaction, comparing snapshots, and integrating with Claude/Cursor.',
  date: '2026-06-06',
  category: 'Reference',
  content: `
# Playwright MCP Accessibility Snapshots Official 2026 Reference

Playwright MCP's accessibility snapshot is the feature that elevates the server from "browser remote control" to "model-friendly DOM interface". Instead of asking an AI agent to parse raw HTML, dig through tag soup, or guess at CSS selectors, the snapshot tool serializes the page as a structured accessibility tree: a YAML-like hierarchy of roles, names, levels, and stable refs. Every interactive element gets a unique \\\`ref\\\` that the agent can pass back to \\\`browser_click\\\`, \\\`browser_type\\\`, or \\\`browser_select_option\\\`. The result is dramatically more reliable agent driving, even on dynamic single-page apps where CSS selectors break after every deploy.

This reference walks through the official 2026 snapshot format, how the ref system works, when to prefer snapshots over screenshots, and how to integrate the tool into Claude Desktop, Cursor, and custom MCP clients. Real bash invocations and TypeScript code accompany every section. We will also cover the two anti-patterns we see most often (relying on screenshots when a snapshot would do, and treating refs as long-lived identifiers) so you avoid them on your first install. For prerequisite context, start with [Playwright MCP install in Cursor](/blog/playwright-mcp-server-install-cursor-2026-step-by-step). For the broader flag catalog, see [Playwright MCP setup + configuration reference](/blog/playwright-mcp-server-setup-configuration-2026-reference).

## Key Takeaways

- **Snapshots return a structured ARIA tree**, not raw HTML.
- **Every interactive element gets a stable ref** for that snapshot.
- **Refs are session-scoped**, not persistent across navigations.
- **Snapshots cost about 1/10 the tokens** of a screenshot-based loop.
- **Combine snapshots with screenshots** only when visual layout matters.

---

## 1. The browser_snapshot Tool

The MCP server exposes one snapshot tool by default:

\\\`\\\`\\\`json
{
  "name": "browser_snapshot",
  "description": "Returns an accessibility-tree snapshot of the current page",
  "inputSchema": {
    "type": "object",
    "properties": {}
  }
}
\\\`\\\`\\\`

No input parameters. The server captures the live accessibility tree from the open browser tab and returns it as YAML-structured text.

## 2. Snapshot Output Shape

A snapshot looks like this (trimmed):

\\\`\\\`\\\`yaml
- generic [ref=e0]:
  - banner [ref=e1]:
    - link "Playwright" [ref=e2]:
      - /url: https://playwright.dev
    - navigation [ref=e3]:
      - link "Docs" [ref=e4]
      - link "API" [ref=e5]
      - link "Community" [ref=e6]
  - main [ref=e7]:
    - heading "Reliable end-to-end testing" [level=1] [ref=e8]
    - paragraph [ref=e9]:
      - text: Playwright enables reliable end-to-end testing for modern web apps.
    - link "Get started" [ref=e10]:
      - /url: /docs/intro
    - button "Star on GitHub" [ref=e11]
\\\`\\\`\\\`

Each line carries:

- An ARIA role (banner, navigation, heading, link, button, etc.)
- An accessible name in quotes (when present)
- Optional attributes (level for headings, /url for links)
- A unique \\\`ref\\\` that you reuse for clicks and types

## 3. Why Snapshots Beat Raw HTML for Agents

| Aspect | Raw HTML | Snapshot |
|---|---|---|
| Token cost (typical landing page) | 50k-200k | 2k-8k |
| Tag soup noise | high | none |
| Implicit ARIA roles | hidden | explicit |
| Hidden elements | mixed in | filtered out |
| Stable identifiers | brittle CSS | session-scoped refs |
| Form labels | scattered | inline |

Agents that try to parse raw HTML spend most of their token budget on \\\`<div>\\\` and \\\`<svg>\\\` noise. A snapshot keeps only the semantic content, dramatically increasing the useful information per prompt.

## 4. The Ref Lifecycle

A ref is a session-scoped, snapshot-local identifier. The rules:

- Refs are issued by the server on each \\\`browser_snapshot\\\` call.
- Refs are valid only until the next navigation or major DOM mutation.
- After a click that triggers a page change, refs from the previous snapshot are stale.
- The agent should always re-snapshot after any non-idempotent action.

Stale ref symptoms:

\\\`\\\`\\\`
Error: Element with ref=e42 is no longer attached to the DOM
\\\`\\\`\\\`

The fix is always the same: take a new snapshot and use refs from it.

## 5. Click By Ref

A typical agent loop:

\\\`\\\`\\\`typescript
// pseudo-code mirroring the agent's tool calls
await navigate({ url: 'https://staging.example.com' });
const snap = await snapshot();
// snap contains: link "Sign in" [ref=e14]
await click({ ref: 'e14' });
const snap2 = await snapshot();
// snap2 contains: textbox "Email" [ref=e3], textbox "Password" [ref=e4]
await type({ ref: 'e3', text: 'qa@example.com' });
await type({ ref: 'e4', text: 'pw' });
await click({ ref: 'e5' }); // submit button
\\\`\\\`\\\`

Each block ends with a new snapshot because the previous click could have changed the DOM. The agent does not need to know CSS selectors; it reasons about roles and names.

## 6. Filtering the Snapshot

Large pages produce large snapshots. The MCP server exposes an optional filtering tool:

\\\`\\\`\\\`json
{
  "name": "browser_snapshot",
  "arguments": {
    "filter": "navigation OR form"
  }
}
\\\`\\\`\\\`

When supported (Playwright MCP 0.0.30+), the filter narrows to the requested role families:

| Filter | Roles included |
|---|---|
| \\\`navigation\\\` | nav, banner, contentinfo, link |
| \\\`form\\\` | form, textbox, checkbox, button, combobox |
| \\\`main\\\` | main, region, article |
| \\\`headings\\\` | heading (all levels) |
| \\\`landmarks\\\` | banner, navigation, main, contentinfo |

Filtering reduces token cost further and focuses the agent on the right region.

## 7. Comparing Two Snapshots

A second snapshot of the same page after an action lets the agent confirm that the action took effect. A naive diff in TypeScript:

\\\`\\\`\\\`typescript
function diffSnapshots(before: string, after: string): string[] {
  const beforeLines = new Set(before.split('\\\\n').map((l) => l.trim()));
  const afterLines = after.split('\\\\n').map((l) => l.trim());
  return afterLines.filter((l) => !beforeLines.has(l));
}

const before = await snapshot();
await click({ ref: 'e10' });
const after = await snapshot();
const newContent = diffSnapshots(before, after);
console.log(newContent);
\\\`\\\`\\\`

This pattern is the foundation for assertion-style behavior: "click submit, confirm a success toast appeared".

## 8. Snapshot vs Screenshot: When To Use Each

| Need | Tool |
|---|---|
| "What elements are on this page?" | snapshot |
| "Is the button enabled?" | snapshot |
| "What does the headline say?" | snapshot |
| "Why does the layout look broken?" | screenshot |
| "Is the color contrast sufficient?" | screenshot |
| "Did the modal animate in?" | screenshot |
| "Confirm the form submitted" | snapshot (diff) |

A common mistake is to drive agents with screenshots when a snapshot would suffice. Screenshots cost 10-20x the tokens of a snapshot of the same page, and the agent must do visual parsing on top.

## 9. Integrating with Claude Desktop

Add the Playwright MCP server to Claude Desktop's config:

\\\`\\\`\\\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--headless"]
    }
  }
}
\\\`\\\`\\\`

After restart, prompt Claude:

\\\`\\\`\\\`
Navigate to https://example.com and give me an accessibility
snapshot of the page. Then list every link and its href.
\\\`\\\`\\\`

Claude will call \\\`browser_navigate\\\`, then \\\`browser_snapshot\\\`, then parse and list links. The full setup walkthrough is in [Playwright MCP for Claude Desktop setup 2026](/blog/playwright-mcp-claude-desktop-setup-2026).

## 10. Integrating with Cursor

Identical entry, different file path (\\\`.cursor/mcp.json\\\`):

\\\`\\\`\\\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
\\\`\\\`\\\`

In Cursor chat:

\\\`\\\`\\\`
Open https://playwright.dev, take an accessibility snapshot,
and extract the H1 and H2 text into a structured list.
\\\`\\\`\\\`

Cursor's agent will reach for snapshot by default because it is the cheapest source of structured data.

## 11. Generating Playwright Tests from Snapshots

The biggest unlock: agents can convert snapshot exploration into a passing Playwright test:

\\\`\\\`\\\`typescript
// Prompt: "explore the signup flow and write a Playwright test for it"
// Agent output (after snapshot-driven exploration):

import { test, expect } from '@playwright/test';

test('user can sign up with email', async ({ page }) => {
  await page.goto('https://staging.example.com');
  await page.getByRole('link', { name: 'Sign up' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('qa@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('S3curePass!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(
    page.getByRole('heading', { name: 'Welcome to Example' })
  ).toBeVisible();
});
\\\`\\\`\\\`

Note the test uses \\\`getByRole\\\` selectors derived from the snapshot's role + name pairs. These are far more resilient than CSS selectors because they match Playwright's recommended locator strategy.

## 12. Snapshot-Driven Locator Generation

The TypeScript pattern for converting a snapshot into a locator catalog:

\\\`\\\`\\\`typescript
interface SnapNode {
  role: string;
  name?: string;
  ref: string;
  children: SnapNode[];
}

function snapshotToLocators(node: SnapNode, depth = 0): string[] {
  const out: string[] = [];
  if (
    ['button', 'link', 'textbox', 'checkbox', 'combobox'].includes(node.role) &&
    node.name
  ) {
    out.push(
      \\\`page.getByRole('\\\${node.role}', { name: '\\\${node.name}' })\\\`
    );
  }
  for (const child of node.children) {
    out.push(...snapshotToLocators(child, depth + 1));
  }
  return out;
}
\\\`\\\`\\\`

Run this over a parsed snapshot to produce a catalog of resilient locators ready to paste into a Page Object Model. The pattern composes well with [Page Object Model best practices](/skills) covered in the skills directory.

## 13. Edge Cases and Gotchas

### Hidden by display:none

Snapshots omit elements with \\\`display:none\\\`. If your modal is hidden behind a transition, take the snapshot after the modal animates in.

### Aria-hidden parents

An element with \\\`aria-hidden=true\\\` excludes itself and all descendants from the tree. This is correct for accessibility but surprising when an agent reports a button is missing.

### Duplicate names

Two buttons with the same accessible name produce two refs but appear identical in the snapshot. The agent must disambiguate by parent or position; the Playwright MCP exposes a \\\`browser_snapshot\\\` mode that adds positional hints (\\\`first\\\`, \\\`second\\\`) when names collide.

### Iframes

By default, iframe contents are not included. Use \\\`browser_snapshot --include-iframes\\\` (when supported) or navigate into the frame.

## 14. Performance Characteristics

| Page size | Snapshot tokens | Snapshot time |
|---|---|---|
| Small (landing) | 500-2000 | 100-300ms |
| Medium (dashboard) | 2000-8000 | 300-700ms |
| Large (long table) | 8000-25000 | 700ms-2s |
| Very large (infinite scroll) | 25000+ | 2-5s |

For very large pages, scope with the \\\`filter\\\` argument or scroll to a region first.

## 15. Combining Snapshots with screenshot

The agent can interleave both tools when full context is needed:

\\\`\\\`\\\`
1. browser_navigate -> staging URL
2. browser_snapshot -> structure
3. browser_take_screenshot -> visual layout
4. (agent reasons about both)
5. browser_click ref=eN
\\\`\\\`\\\`

This is the right pattern for visual regression follow-ups or when the structure is ambiguous (e.g., a custom design system without standard roles). For a structured visual diff workflow, see [Percy + Playwright visual testing guide](/blog).

## 16. Reference: Tools Related to Snapshot

| Tool | Purpose |
|---|---|
| \\\`browser_snapshot\\\` | Structured ARIA tree |
| \\\`browser_take_screenshot\\\` | PNG of viewport or full page |
| \\\`browser_console_messages\\\` | Captured console.log output |
| \\\`browser_network_requests\\\` | List of network calls |
| \\\`browser_evaluate\\\` | Run JS in page context (last resort) |

## Frequently Asked Questions

### Are refs stable across page reloads?

No. A reload invalidates every ref. Take a new snapshot after navigation, reload, or any action that changes the page structure.

### Can I serialize a snapshot to disk?

Yes. The text format is valid YAML. Tools like \\\`js-yaml\\\` parse it cleanly. Save snapshots alongside trace files for post-hoc analysis.

### How does snapshot handle shadow DOM?

Playwright pierces shadow DOM by default, so shadow tree elements appear in the snapshot with their normal roles and names. Custom elements with no ARIA mapping appear under \\\`generic\\\`.

### What is the difference from page.accessibility.snapshot()?

The MCP \\\`browser_snapshot\\\` tool wraps and enhances Playwright's \\\`accessibility.snapshot()\\\`. The MCP version adds the ref system, filtering, and the YAML serialization optimized for LLM consumption.

### Why does my snapshot show generic everywhere?

The page is using \\\`<div>\\\` elements without ARIA roles. Add semantic HTML (use \\\`<button>\\\` not \\\`<div onclick>\\\`, use \\\`<nav>\\\` for navigation, etc.) or add explicit \\\`role\\\` attributes. This is also a real accessibility issue worth fixing.

### Should I include screenshots in every prompt?

No. Default to snapshot-only. Add a screenshot only when the agent is confused or when visual layout is part of the task. Each screenshot costs roughly the tokens of ten snapshots.

### Can I use snapshots for accessibility audits?

Yes, partially. The structure exposed by the snapshot is exactly what assistive technologies see, so reviewing the snapshot is a fast first-pass a11y audit. For full WCAG checks, follow up with [accessibility testing automation](/blog/accessibility-testing-automation-guide).

## Conclusion + CTA

Accessibility snapshots are the single most leveraged feature of the Playwright MCP server. They reduce token costs by an order of magnitude, give the agent stable references for interaction, and produce a representation of the page that is closer to what users with assistive tech actually experience. Start every agent task with \\\`browser_snapshot\\\` and only reach for screenshots when visual context is genuinely required. For end-to-end setup, see [Playwright MCP install in Cursor](/blog/playwright-mcp-server-install-cursor-2026-step-by-step). To explore agent workflows built on top of snapshots, browse the [Playwright skills](/skills) and the [test automation tool comparison](/compare).
`,
};
