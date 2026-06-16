import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Stagehand AI Browser Automation: The Complete 2026 Guide',
  description:
    'Learn Stagehand by Browserbase: AI browser automation with act, extract, and observe. Natural-language Playwright backed by an LLM, with runnable TypeScript.',
  date: '2026-06-16',
  category: 'Tutorial',
  content: `
# Stagehand AI Browser Automation: The Complete 2026 Guide

Browser automation has spent two decades chained to CSS selectors and XPath. You told the machine exactly which node to click, exactly which input to fill, and the moment a developer renamed a class or reshuffled the DOM, your test shattered. Stagehand, the open-source TypeScript framework from Browserbase, takes a different path. It sits directly on top of Playwright and adds three natural-language methods, \`act()\`, \`extract()\`, and \`observe()\`, that are backed by a large language model. Instead of \`page.click('.btn-primary[data-testid="checkout"]')\`, you write \`page.act('click the checkout button')\` and an LLM resolves the intent against the live page.

This guide is a complete 2026 reference to **Stagehand AI browser automation**. We cover what Stagehand is and the problem it solves, how to install and configure it, the full \`act\`/\`extract\`/\`observe\` API with runnable TypeScript and Zod schemas, how it blends deterministic Playwright with AI steps, caching and cost control, how it compares to raw Playwright and to other AI tools, and the QA workflows where it shines. Whether you searched for "stagehand ai browser automation," "browserbase stagehand," or "natural language playwright," this is the reference you want. If you are coming from classic end-to-end testing, our [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) pairs well with this article, and the [skills directory](/skills) has installable agent skills you can drop into Claude Code and Cursor.

The headline idea is durability through abstraction. Traditional automation couples your test to the implementation details of the page. Stagehand lets you couple it to user intent, which changes far less often than the DOM. A button labeled "Checkout" survives a dozen CSS refactors, so an intent-driven instruction outlives selector churn, the single biggest source of flaky tests in any large suite.

## What Is Stagehand

Stagehand is an open-source TypeScript framework built and maintained by Browserbase, the company behind a managed headless-browser cloud. At its core, Stagehand is a thin, opinionated layer on top of Playwright. Everything Playwright can do, Stagehand can do, because a Stagehand \`page\` object extends the Playwright \`Page\`. You keep \`page.goto()\`, \`page.locator()\`, \`page.waitForURL()\`, and every other deterministic primitive you already know. On top of that familiar surface, Stagehand adds AI-powered methods that translate plain English into concrete browser actions.

The three signature methods are \`act\`, \`extract\`, and \`observe\`. \`act\` performs an action described in natural language, like clicking, typing, or selecting. \`extract\` pulls structured data off the page into a shape you define with a Zod schema. \`observe\` asks the page what actions are available, returning a list of candidate actions you can cache and replay deterministically. Behind all three, an LLM looks at a compact, accessibility-tree representation of the DOM, reasons about what the instruction means, and produces a precise action or a typed result.

Stagehand solves three problems at once. First, it removes brittle selectors from the hot path, so your automation survives UI redesigns. Second, it gives you typed, schema-validated extraction instead of scraping raw HTML and parsing it by hand. Third, it keeps an escape hatch to full Playwright, so when you need a deterministic, fast, zero-token step, you simply drop down to the underlying API. That combination, AI where the DOM is volatile and plain Playwright where it is stable, is what makes Stagehand practical for production test suites rather than a demo toy.

## Installing and Configuring Stagehand

Stagehand ships as an npm package and runs anywhere Node.js 20+ runs. Install it alongside Playwright and Zod, which Stagehand uses for schema-validated extraction.

\`\`\`bash
npm install @browserbasehq/stagehand zod
npx playwright install chromium
\`\`\`

You configure Stagehand by constructing it with an options object. The most important choice is \`env\`: \`LOCAL\` runs a Chromium browser on your machine, while \`BROWSERBASE\` runs in the Browserbase cloud, which is handy for CI and for scaling parallel sessions. You also pick the model that powers the AI methods.

\`\`\`ts
import { Stagehand } from '@browserbasehq/stagehand';

const stagehand = new Stagehand({
  env: 'LOCAL',
  modelName: 'gpt-4o',
  modelClientOptions: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  verbose: 1,
});

await stagehand.init();
const page = stagehand.page;

await page.goto('https://news.ycombinator.com');
await stagehand.close();
\`\`\`

Stagehand is model-agnostic. You can point it at OpenAI, Anthropic Claude, Google Gemini, or any model exposed through a compatible client. The relevant environment variables are read from your shell, so keep keys out of source control. A minimal \`.env\` for local development looks like this:

\`\`\`bash
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
# only needed for env: 'BROWSERBASE'
BROWSERBASE_API_KEY=bb-...
BROWSERBASE_PROJECT_ID=...
\`\`\`

The \`verbose\` flag (0, 1, or 2) controls how much the framework logs about its reasoning and the actions it takes, which is invaluable when you are debugging why an AI step did something unexpected.

## The act() Method: Natural-Language Actions

\`act()\` is the workhorse. You hand it an instruction in plain English and Stagehand drives the browser to fulfill it. Under the hood, the LLM inspects the accessibility tree, chooses the right element, and dispatches a Playwright action against it.

\`\`\`ts
await page.goto('https://www.google.com');

// Type into a field and submit, no selector required
await page.act('type "stagehand browser automation" into the search box');
await page.act('press Enter to search');

// Click a result by its visible meaning, not its markup
await page.act('click the first organic search result');
\`\`\`

Keep \`act\` instructions atomic. One instruction should map to roughly one user action. "Click the login button" is a good instruction; "log in, navigate to settings, and change my email" is three actions and should be three \`act\` calls (or better, a higher-level agent loop). Atomic actions are more reliable, easier to cache, and far easier to debug when something goes wrong.

\`act\` also supports variables so you never feed secrets into the model. You template a placeholder in the instruction and pass the real value separately, which keeps passwords and tokens out of the LLM prompt.

\`\`\`ts
await page.act({
  action: 'type %username% into the email field',
  variables: {
    username: process.env.TEST_USER_EMAIL ?? '',
  },
});

await page.act({
  action: 'type %password% into the password field',
  variables: {
    password: process.env.TEST_USER_PASSWORD ?? '',
  },
});

await page.act('click the sign in button');
\`\`\`

Because \`act\` resolves intent at runtime, it tolerates A/B tests, copy changes, and DOM restructuring that would break a hard-coded selector. That resilience is the same principle behind [self-healing test automation](/blog/self-healing-test-automation-2026): describe what the user wants, not where the pixels are.

## The extract() Method: Typed Structured Data

\`extract()\` reads data off the page and returns it in a shape you define with a Zod schema. Instead of querying nodes and string-parsing \`innerText\`, you declare the structure you want and Stagehand fills it in, validated.

\`\`\`ts
import { z } from 'zod';

await page.goto('https://news.ycombinator.com');

const result = await page.extract({
  instruction: 'extract the top five stories on the page',
  schema: z.object({
    stories: z.array(
      z.object({
        title: z.string(),
        points: z.number(),
        author: z.string(),
        commentCount: z.number(),
      }),
    ),
  }),
});

console.log(result.stories[0].title);
\`\`\`

The Zod schema does double duty. It tells the LLM what to look for, and it validates the output, so if the model returns something malformed you get a typed error instead of a silent bad scrape. For a single value, keep the schema flat.

\`\`\`ts
const price = await page.extract({
  instruction: 'extract the current product price as a number',
  schema: z.object({
    price: z.number(),
    currency: z.string(),
  }),
});
\`\`\`

A powerful pattern is extracting links and URLs. Stagehand supports a URL-aware string type so it returns absolute, resolved hrefs rather than relative fragments.

\`\`\`ts
const links = await page.extract({
  instruction: 'extract all navigation links in the header',
  schema: z.object({
    navigation: z.array(
      z.object({
        label: z.string(),
        url: z.string().url(),
      }),
    ),
  }),
});
\`\`\`

Typed extraction is where Stagehand pays for itself in test assertions. You extract a clean object and assert against it with your normal test runner, no fragile DOM-walking required.

## The observe() Method: Plan, Cache, Replay

\`observe()\` is the method that makes Stagehand fast and cheap at scale. Instead of acting immediately, \`observe\` asks the page what actions are possible for a given instruction and returns a list of candidate actions, each with the selector, method, and arguments Stagehand would use. You can inspect them, cache them, and replay them deterministically without paying for another LLM round-trip.

\`\`\`ts
// Ask the page what it can do, without acting
const candidates = await page.observe('find the add to cart button');
console.log(candidates);
// [{ selector: "xpath=...", method: "click", arguments: [], description: "Add to Cart button" }]

// Replay the observed action deterministically (no LLM call)
await page.act(candidates[0]);
\`\`\`

This observe-then-act split is the recommended pattern for production suites. The first run uses the LLM to discover the action; subsequent runs replay the cached action object for free. You can persist the candidates to disk and only re-observe when a replay fails.

\`\`\`ts
import fs from 'node:fs';

async function cachedAct(page: any, instruction: string, cacheFile: string) {
  if (fs.existsSync(cacheFile)) {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    try {
      return await page.act(cached);
    } catch {
      // fall through and re-observe if the page changed
    }
  }
  const [action] = await page.observe(instruction);
  fs.writeFileSync(cacheFile, JSON.stringify(action));
  return await page.act(action);
}

await cachedAct(page, 'click the checkout button', '.cache/checkout.json');
\`\`\`

With caching, a suite that uses an LLM on its first run can execute almost entirely deterministically afterward, which slashes cost and runtime while keeping the resilience of intent-based discovery for the day the DOM finally changes.

## Mixing Stagehand With Plain Playwright

The most important thing to internalize is that you do not have to use AI for every step. A Stagehand \`page\` is a Playwright \`Page\`, so you mix deterministic and AI steps freely. Use plain Playwright for stable, well-known elements and for speed; use \`act\`/\`extract\`/\`observe\` only where the DOM is volatile or where natural language is genuinely clearer.

\`\`\`ts
// Deterministic Playwright for the stable parts
await page.goto('https://example.com/login');
await page.locator('#email').fill(process.env.TEST_USER_EMAIL ?? '');
await page.locator('#password').fill(process.env.TEST_USER_PASSWORD ?? '');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/dashboard');

// AI for the volatile, frequently-redesigned dashboard widget
await page.act('open the notifications panel');
const unread = await page.extract({
  instruction: 'count unread notifications',
  schema: z.object({ unread: z.number() }),
});

expect(unread.unread).toBeGreaterThanOrEqual(0);
\`\`\`

This hybrid model is what separates a usable suite from an expensive one. Every AI call costs tokens and latency, so reserve them for the parts of the page where their resilience earns its keep. The rest stays plain, fast, free Playwright.

## Agent Mode: Multi-Step Autonomy

Beyond single actions, Stagehand exposes an agent abstraction that runs a goal-directed loop. You give it a high-level objective and it plans, acts, observes the result, and repeats until the goal is met or a step budget is exhausted. This is closer to the computer-use style of automation and is useful for exploratory flows where you cannot enumerate every step in advance.

\`\`\`ts
const agent = stagehand.agent({
  provider: 'openai',
  model: 'computer-use-preview',
  instructions: 'You are a careful QA agent. Verify every step before continuing.',
});

const result = await agent.execute({
  instruction: 'search for a wireless keyboard, add the cheapest one to the cart, and stop before paying',
  maxSteps: 12,
});

console.log(result.completed, result.actions);
\`\`\`

Agent mode trades determinism for flexibility. It is excellent for smoke-testing unfamiliar flows and for generating a first draft of a test you then harden with cached \`observe\` actions, but you generally would not ship a critical regression test as a free-running agent. Use it to discover the path, then pin the path down.

## Stagehand vs Raw Playwright

The question every team asks is when to reach for Stagehand instead of writing plain Playwright. The honest answer is: use both, in the same file. The table below frames the trade-offs.

| Dimension | Raw Playwright | Stagehand |
|---|---|---|
| Element targeting | CSS, XPath, role selectors | Natural language, resolved by LLM |
| Resilience to UI change | Low, breaks on DOM edits | High, survives copy and layout changes |
| Speed per step | Milliseconds, deterministic | Slower on first run, fast when cached |
| Cost per step | Free | Token cost on uncached AI steps |
| Data extraction | Manual DOM parsing | Typed, Zod-validated extraction |
| Determinism | Fully deterministic | Deterministic via observe caching |
| Learning curve | Selector knowledge required | Plain English plus Playwright basics |
| Best for | Stable, hot-path flows | Volatile UI, scraping, exploratory flows |

The takeaway: Playwright is the floor, Stagehand is the ceiling. Stable elements stay in Playwright, volatile elements move to Stagehand, and \`observe\` caching brings the AI steps back toward Playwright-level speed and determinism for repeat runs.

## Stagehand vs Other AI Browser Tools

Stagehand is one of several AI-driven browser tools that emerged around 2025-2026. They differ in how they perceive the page and how tightly they couple to existing frameworks.

| Tool | Built on | Perception | Primary API | Best fit |
|---|---|---|---|---|
| Stagehand | Playwright | Accessibility tree / DOM | act / extract / observe | TypeScript teams extending Playwright |
| Midscene.js | Playwright / Puppeteer | Vision LLM (screenshots) | aiAction / aiQuery / aiAssert | Vision-first UI and visual assertions |
| Playwright MCP | Playwright | Accessibility snapshot | MCP tools for agents | Driving a browser from an LLM agent |
| Classic Playwright | Native | DOM selectors | locator / click / fill | Deterministic, selector-based suites |

If your stack is TypeScript and you already lean on Playwright, Stagehand is the most natural upgrade because it extends rather than replaces what you have. If your application is canvas-heavy or you need pixel-level visual assertions, a vision-first tool like Midscene may fit better. And if you are wiring a browser into an autonomous agent over a protocol, the Model Context Protocol path is worth a look; see our [MCP server testing guide](/blog/mcp-server-testing-guide-2026) for how to test those integrations.

## Cost, Caching, and Reliability in CI

Running AI steps in continuous integration raises three concerns: cost, flakiness, and speed. Stagehand has a concrete answer for each. For cost, the \`observe\`-then-\`act\` caching pattern means most CI runs execute cached, deterministic actions and only call the model when the cache misses. For speed, cached actions run at Playwright velocity. For flakiness, you combine caching with Playwright's built-in auto-waiting and explicit \`waitForURL\`/\`waitForLoadState\` between steps.

\`\`\`ts
// Recommended CI hardening around AI steps
await page.act('submit the order');
await page.waitForLoadState('networkidle');

const confirmation = await page.extract({
  instruction: 'extract the order confirmation number',
  schema: z.object({ orderId: z.string() }),
});

expect(confirmation.orderId).toMatch(/^ORD-/);
\`\`\`

A practical CI policy: pin a specific model version so behavior does not drift between runs, commit your \`observe\` cache so the first CI run is already deterministic, set a sensible \`maxSteps\` budget on any agent calls, and fail loudly when an extraction schema does not validate rather than swallowing the error. With those guardrails, Stagehand suites are as stable in CI as well-written Playwright, with far less selector maintenance.

## Real-World QA Use Cases

Stagehand shines wherever the DOM is hostile to selectors. Onboarding and checkout flows that marketing constantly re-skins are a perfect fit, because the visible labels stay stable while the markup churns. Data extraction from third-party dashboards, where you have no control over the HTML, becomes a one-line typed \`extract\` instead of a brittle scraper. Cross-browser smoke tests benefit from intent-based actions that do not depend on per-browser quirks.

It is also a strong tool for test generation. Run an agent loop once to discover a flow, capture the \`observe\` actions, and you have a deterministic test scaffold you can harden by hand. Combined with the resilience philosophy from our [self-healing test automation guide](/blog/self-healing-test-automation-2026), Stagehand becomes part of a suite that maintains itself far better than a pure selector-based one. Browse the [QA skills directory](/skills) for installable patterns that pair with this workflow in Claude Code and Cursor.

## Frequently Asked Questions

### Is Stagehand a replacement for Playwright?

No. Stagehand is built on top of Playwright and extends it. A Stagehand \`page\` is a Playwright \`Page\`, so you keep every deterministic primitive like \`goto\`, \`locator\`, and \`waitForURL\`, and you add \`act\`, \`extract\`, and \`observe\` for the parts of the page where natural language and AI resilience help. The recommended approach mixes both in the same test.

### How much does Stagehand cost to run?

Stagehand itself is open source and free. The cost comes from the LLM calls made by \`act\`, \`extract\`, and \`observe\`. You control that cost with the observe-then-act caching pattern, which discovers an action once with the model and replays it deterministically afterward for free. Most CI runs end up calling the model only on cache misses.

### Which LLMs does Stagehand support?

Stagehand is model-agnostic. You can drive it with OpenAI models like GPT-4o, Anthropic Claude, Google Gemini, or any model exposed through a compatible client. You set the model through \`modelName\` and \`modelClientOptions\` when constructing Stagehand, and you can switch providers without changing your test logic.

### What is the difference between act and observe?

\`act\` performs an action immediately based on a natural-language instruction. \`observe\` does not act; it returns a list of candidate actions Stagehand could take, each with a selector and method. The standard pattern is to \`observe\` once, cache the returned action, and replay it with \`act\` so repeat runs skip the LLM call and stay deterministic.

### Can Stagehand run in CI like a normal Playwright suite?

Yes. Run it with \`env: 'LOCAL'\` on a CI runner with Chromium installed, or with \`env: 'BROWSERBASE'\` to use the Browserbase cloud for parallelism. Commit your observe cache so the first run is deterministic, pin a model version to avoid drift, and add Playwright waits between AI steps. With those guardrails it is as stable as a hand-written Playwright suite.

### How does Stagehand keep my passwords out of the LLM prompt?

The \`act\` method supports variables. You template a placeholder like \`%password%\` in the instruction and pass the real value in a separate \`variables\` object. Stagehand substitutes the value at execution time without sending the secret to the model, so credentials and tokens never appear in the LLM prompt.

### Is Stagehand good for web scraping?

Yes, the \`extract\` method is excellent for scraping because it returns typed, Zod-validated data instead of raw HTML you have to parse. You describe the data shape with a schema, including URL-typed fields that resolve to absolute links, and Stagehand fills it in. That makes extraction from third-party dashboards far more robust than a selector-based scraper.

### Do I need a Browserbase account to use Stagehand?

No. You only need Browserbase if you set \`env: 'BROWSERBASE'\` to run in their cloud. With \`env: 'LOCAL'\` Stagehand runs a Chromium browser on your own machine using a Playwright install, and the only external dependency is the LLM provider key you choose. Many teams develop locally and switch to Browserbase only for scaled CI.

## Conclusion

Stagehand represents a pragmatic middle path in AI browser automation. It does not throw away the deterministic, battle-tested foundation of Playwright; it layers natural-language \`act\`, typed \`extract\`, and cacheable \`observe\` on top of it, so you apply AI exactly where the DOM is volatile and keep plain Playwright everywhere else. With observe caching, your suites stay fast and cheap in CI while shedding the selector maintenance that makes large suites so brittle. For TypeScript teams already invested in Playwright, it is the most natural way to make automation resilient to the constant churn of modern front ends.

Ready to make your automation self-maintaining? Explore the [QA skills directory](/skills) for installable Stagehand and Playwright patterns you can drop straight into Claude Code, Cursor, and your other AI agents, and pair this guide with our [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) to build a suite that survives the next redesign.
`,
};
