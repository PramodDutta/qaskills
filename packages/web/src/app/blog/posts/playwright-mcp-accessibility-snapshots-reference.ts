import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright MCP Accessibility Snapshots: Complete Reference 2026',
  description: 'Reference for Playwright MCP accessibility snapshots: structure, ref attributes, AI-friendly tree, tool integration patterns, and how Claude Code and Cursor use them.',
  date: '2026-05-03',
  category: 'Reference',
  content: `
# Playwright MCP Accessibility Snapshots: Complete Reference 2026

The Model Context Protocol (MCP) gave AI assistants a standard way to talk to tools. Playwright MCP gave AI assistants a standard way to talk to web pages. The crown jewel of Playwright MCP is the accessibility snapshot: a textual representation of the rendered DOM that AI agents can parse, search, and act on without needing screenshots or HTML. In 2026 it is the dominant mechanism by which Claude Code, Cursor, Codex, and other agents drive browsers for test generation, web scraping, and automated QA.

This reference documents the structure of an accessibility snapshot, the \`ref\` attribute that uniquely identifies every element, how snapshots compose with MCP tool calls, and the patterns that make them work well for AI-driven testing. We will look at the full grammar, the way Playwright produces snapshots, and how to debug when snapshots diverge from your expectations. Examples are TypeScript with the Playwright MCP server (npm package \`@playwright/mcp\`).

For an introduction to the wider MCP ecosystem, read [MCP for QA Engineers](/blog/mcp-for-qa-engineers-guide). For server configuration, see the [Playwright MCP Server Configuration 2026](/blog/playwright-mcp-server-configuration-2026) reference.

## What a snapshot looks like

When the \`browser_snapshot\` MCP tool runs, it returns a YAML-like tree. The top of the tree is the page; each line is an accessible element with role, name, and an opaque \`ref\` identifier.

\`\`\`yaml
- generic [ref=e1]:
  - banner [ref=e2]:
    - link "QASkills" [ref=e3]
    - navigation "Main" [ref=e4]:
      - link "Skills" [ref=e5]
      - link "Blog" [ref=e6]
      - link "Pricing" [ref=e7]
  - main [ref=e8]:
    - heading "Find the right QA skill for any AI agent" [level=1, ref=e9]
    - textbox "Search skills" [ref=e10]
    - button "Search" [ref=e11]
    - region "Featured" [ref=e12]:
      - article "Playwright E2E Skill" [ref=e13]:
        - heading "Playwright E2E" [level=3, ref=e14]
        - paragraph [ref=e15]: End-to-end browser testing with Playwright
        - link "View skill" [ref=e16]
  - contentinfo [ref=e17]:
    - link "Privacy" [ref=e18]
\`\`\`

Each entry encodes:

| Field | Example | Meaning |
|---|---|---|
| Role | \`button\` | ARIA role or implicit HTML role |
| Accessible name | \`"Search"\` | The label exposed to assistive tech |
| Properties | \`[level=1, ref=e9]\` | Role-specific properties plus \`ref\` |
| Children | Indented bullets | Nested elements in DOM order |

Roles follow ARIA: \`button\`, \`link\`, \`heading\`, \`textbox\`, \`combobox\`, \`listbox\`, \`option\`, \`checkbox\`, \`radio\`, \`switch\`, \`tab\`, \`tabpanel\`, \`dialog\`, \`menu\`, \`menuitem\`, \`region\`, \`article\`, \`navigation\`, \`banner\`, \`contentinfo\`, \`main\`, \`form\`, \`alert\`, \`status\`, \`progressbar\`, \`tooltip\`, \`tree\`, \`treeitem\`, \`grid\`, \`gridcell\`, \`row\`, \`columnheader\`, \`rowheader\`, \`paragraph\`, \`group\`, \`list\`, \`listitem\`, \`img\`, \`generic\`.

## The \`ref\` attribute

\`ref\` is the magic. Every element in the snapshot has a unique, opaque identifier that the same MCP session can pass back to tools like \`browser_click\` or \`browser_fill\`.

\`\`\`json
{
  "tool": "browser_click",
  "arguments": {
    "ref": "e11",
    "element": "Search button in main header"
  }
}
\`\`\`

The \`ref\` makes the round trip deterministic. The model picks an element from a textual representation, names it for the human to verify, and tells the browser exactly which DOM node to act on. No CSS selectors, no XPath, no fragility. Refs are valid only within the snapshot they were created from, so a stale ref returns an error rather than acting on the wrong element.

## Including invisible elements

By default the snapshot omits aria-hidden elements, elements with \`display: none\`, and elements outside the viewport but still in the tree. For tests that need to see the entire DOM, request a full snapshot.

\`\`\`typescript
import { test } from '@playwright/test';

test('full snapshot includes hidden tabs', async ({ page }) => {
  await page.goto('https://qaskills.sh');
  const snapshot = await page.accessibility.snapshot({
    interestingOnly: false,
  });
  console.log(JSON.stringify(snapshot, null, 2));
});
\`\`\`

\`interestingOnly: false\` returns every node, including those with no role or accessible name. The cost is a much larger snapshot, so reserve it for debugging.

## Properties carried by role

Different roles carry different properties. The full list:

| Role | Properties |
|---|---|
| \`heading\` | \`level\` (1-6) |
| \`textbox\` | \`value\`, \`required\`, \`invalid\`, \`disabled\`, \`readonly\` |
| \`checkbox\` | \`checked\` (true/false/mixed), \`disabled\` |
| \`radio\` | \`checked\` (true/false), \`disabled\` |
| \`switch\` | \`checked\` (true/false), \`disabled\` |
| \`combobox\` | \`expanded\`, \`autocomplete\`, \`required\` |
| \`listbox\` | \`multiselectable\` |
| \`option\` | \`selected\` |
| \`button\` | \`disabled\`, \`pressed\` (for toggle buttons) |
| \`link\` | \`disabled\` (rare) |
| \`progressbar\` | \`valuenow\`, \`valuemin\`, \`valuemax\`, \`valuetext\` |
| \`slider\` | \`valuenow\`, \`valuemin\`, \`valuemax\` |
| \`tab\` | \`selected\` |
| \`tree\` / \`treeitem\` | \`expanded\`, \`selected\`, \`level\` |
| \`menuitemcheckbox\` | \`checked\` |
| \`menuitemradio\` | \`checked\` |
| \`alert\` / \`status\` / \`tooltip\` | (text content only) |

Properties surface as bracket-suffix annotations: \`checkbox "I accept" [checked=true]\`.

## How AI agents use snapshots

A typical Claude Code or Cursor session that interacts with a page follows a four-step loop:

1. Call \`browser_snapshot\` to get the current state.
2. Identify the element by role and accessible name.
3. Issue a \`browser_click\`, \`browser_fill\`, or \`browser_select_option\` with the \`ref\`.
4. Call \`browser_snapshot\` again to verify the transition.

\`\`\`typescript
// Pseudocode for an agent loop
async function agentStep(page: Page, instruction: string) {
  const snapshot = await mcp.call('browser_snapshot');
  const plan = await llm.plan(instruction, snapshot);
  for (const action of plan.actions) {
    await mcp.call(action.tool, action.arguments);
  }
  const newSnapshot = await mcp.call('browser_snapshot');
  return llm.verify(instruction, newSnapshot);
}
\`\`\`

The agent never sees DOM nodes or CSS selectors. The snapshot is the only window into the page, which is why the snapshot must be high-fidelity and the refs must be stable enough to act on.

## Combining snapshots with screenshots

For visual tasks (verifying styling, layout, or images), agents combine snapshots with screenshots.

\`\`\`json
{
  "tool": "browser_take_screenshot",
  "arguments": {
    "ref": "e13",
    "element": "Featured Playwright skill article"
  }
}
\`\`\`

The screenshot tool accepts an optional \`ref\` to scope to a single element, which produces a cropped image. Pair the cropped image with the snapshot subtree and the agent has both the textual and visual representation.

## Snapshot churn and stability

Snapshots are deterministic given a static page, but real pages animate, hydrate, and refetch. A snapshot taken mid-animation can miss elements that exist at rest. Patterns to stabilize:

1. Wait for known accessible elements to appear before snapshotting. \`browser_wait_for\` accepts a role and name.
2. Disable animations via init script: \`*, *::before, *::after { animation: none !important; transition: none !important; }\`.
3. Drain network with \`browser_wait_for { networkIdle: true }\`.
4. For SPAs, wait for a known final state like a heading.

\`\`\`typescript
// In playwright.config.ts when used outside MCP
use: {
  reducedMotion: 'reduce',
},
\`\`\`

Reduced motion disables CSS animations, which produces stable snapshots at the cost of not testing animation timing.

## Iframes and shadow DOM

Snapshots include same-origin iframes inline and tag shadow roots explicitly. For cross-origin iframes, the snapshot includes only the iframe element itself; the agent must call \`browser_switch_to_frame\` to interact with content inside.

\`\`\`yaml
- iframe [ref=e30]:
  - generic [ref=e31]:  # only present if same-origin
    - heading "Embedded content" [ref=e32]
\`\`\`

For shadow DOM:

\`\`\`yaml
- generic [ref=e40]:
  - shadowRoot [ref=e41]:
    - button "Custom widget" [ref=e42]
\`\`\`

Read [Playwright Iframe Shadow DOM Guide](/blog/playwright-iframe-shadow-dom-guide) for the underlying browser model.

## Token efficiency

Snapshots are usually much smaller than raw HTML, often by 10x to 100x. A homepage with 50 KB of HTML produces a snapshot of 2 to 5 KB, well within the context window of any modern LLM. Three rules keep snapshots lean:

1. Prefer \`interestingOnly: true\` (the default).
2. Scope to a region with \`page.locator('main').accessibilitySnapshot()\` when supported.
3. Use \`browser_take_screenshot\` cropped to a ref instead of dumping the full page snapshot when only visual context is needed.

For long sessions, summarize older snapshots and only keep the most recent two or three in context.

## Common pitfalls

**Pitfall 1: Acting on stale refs.** Refs are scoped to the snapshot in which they were created. After any action, take a new snapshot before issuing the next interaction.

**Pitfall 2: Missing accessible names.** Elements without a label show up as \`button [ref=e10]\` with no name, making them hard for the model to identify. Fix the underlying accessibility issue with \`aria-label\` or visible text.

**Pitfall 3: Generic spam.** Excessive \`<div>\` wrappers produce snapshots cluttered with \`generic\` nodes. Refactor markup to use semantic landmarks.

**Pitfall 4: Hidden tabs not snapshotted.** Tab panels with \`hidden\` or \`aria-hidden\` are omitted by default. Switch tabs before snapshotting or request \`interestingOnly: false\`.

**Pitfall 5: Dynamic refs.** Some test harnesses regenerate refs on every snapshot. Treat refs as ephemeral; never persist them across calls.

## Anti-patterns

- Using snapshots as a substitute for traces. Snapshots show structure, not history. Use Playwright's trace viewer for time-travel debugging.
- Persisting refs to a database. They are tied to a session and have no meaning between runs.
- Asserting on the exact snapshot text. Whitespace, ordering, and node counts can drift across minor releases. Test behavior, not the snapshot itself.
- Skipping snapshots entirely and relying only on screenshots. Models are much better at parsing structured text than vision.

## Snapshot diffing

To detect changes between page states, diff two snapshots. Most agents do this implicitly when verifying actions.

\`\`\`typescript
function diffSnapshots(before: string, after: string) {
  const beforeLines = before.split('\\n');
  const afterLines = after.split('\\n');
  const added = afterLines.filter((l) => !beforeLines.includes(l));
  const removed = beforeLines.filter((l) => !afterLines.includes(l));
  return { added, removed };
}
\`\`\`

In MCP-driven tests, the diff is what the model uses to decide whether an action succeeded. A new \`heading "Order confirmed"\` in the after-snapshot is evidence the checkout completed.

## Conclusion and next steps

The accessibility snapshot is the canonical interface between AI agents and the browser. Master its grammar and your agent-driven tests become deterministic, debuggable, and resilient to UI churn that breaks CSS selectors.

Install the [playwright-e2e skill](/skills/playwright-e2e) so Claude Code and Cursor know how to read and act on snapshots. Configure your MCP server with [Playwright MCP Server Configuration 2026](/blog/playwright-mcp-server-configuration-2026). For end-to-end agent workflows, read [Playwright Test Agents Planner Generator Healer Guide](/blog/playwright-test-agents-planner-generator-healer-guide).
`,
};
