import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Midscene AI Testing: Visual UI Automation Guide for 2026',
  description:
    'Master Midscene.js AI testing: vision-LLM UI automation with aiAction, aiTap, aiQuery, and aiAssert. Natural-language Playwright and Puppeteer testing.',
  date: '2026-06-16',
  category: 'Tutorial',
  content: `
# Midscene AI Testing: Visual UI Automation Guide for 2026

Most automation frameworks read the page the way a parser does: through the DOM, hunting for selectors and accessibility roles. Midscene.js reads the page the way a human does, by looking at it. Midscene is an open-source tool for AI-driven UI automation and testing that uses a vision-language model to perceive the rendered screen, then acts and asserts on what it sees. You describe what you want in plain English, "click the blue Subscribe button," "tell me the cart total," "confirm the success toast appeared," and a multimodal model grounds those instructions against an actual screenshot of the page.

This guide is a complete 2026 reference to **Midscene AI testing**. We cover what Midscene is and why a vision-first approach matters, how to install and wire it into Playwright and Puppeteer, the full \`aiAction\`/\`aiTap\`/\`aiQuery\`/\`aiAssert\` API with runnable code, the YAML automation format for no-code flows, model configuration, the visual report and debugging playground, and how Midscene compares to DOM-based tools. Whether you searched for "midscene ai testing," "midscene js," or "vision LLM UI testing," this is the reference you want. If you are coming from traditional end-to-end testing, our [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) is the natural companion, and the [skills directory](/skills) collects installable agent skills for Claude Code and Cursor.

The core promise is that vision understands what the DOM cannot. Canvas-rendered charts, WebGL scenes, custom-drawn components, icon-only buttons, and pixel-perfect layout bugs are invisible to a selector but obvious to a model that looks at the screen. Midscene meets the UI where the user actually meets it, at the rendered pixel, which makes it uniquely good at the kinds of visual and cross-platform testing that selector-based tools struggle with.

## What Is Midscene.js

Midscene.js is an open-source framework for AI-driven UI automation and testing. Its defining characteristic is perception: rather than inspecting the DOM tree, Midscene sends a screenshot of the current page to a vision-language model and lets the model reason about what is on screen, where things are, and what the instruction means. The model returns coordinates to tap, text to read, or a true/false judgment, and Midscene executes accordingly against the real browser.

Midscene exposes a small, memorable API. \`aiAction\` (also written \`ai\`) performs a high-level, possibly multi-step instruction. \`aiTap\`, \`aiInput\`, \`aiScroll\`, and friends are atomic, instant actions for when you want tight control. \`aiQuery\` extracts structured data from the screen into a shape you describe. \`aiAssert\` checks a natural-language condition and throws when it is false, which is exactly what you want in a test. Together they let you write a full UI test in sentences a product manager could read.

Midscene is not tied to one driver. It integrates with Playwright and Puppeteer for web testing, ships an Android automation path for native mobile via adb, and offers a Chrome extension and a YAML runner for people who do not want to write code at all. It solves three problems: it tests UIs that have no useful DOM, it removes selector maintenance entirely, and it makes assertions human-readable and self-documenting. The cost is the same as any AI approach, latency and tokens per step, which Midscene mitigates with caching and a choice of faster grounding models.

## Installing Midscene and Choosing a Model

Midscene is distributed on npm and integrates with whichever browser driver you prefer. For a Playwright-based setup, install Midscene's Playwright integration alongside Playwright itself.

\`\`\`bash
npm install @midscene/web playwright --save-dev
npx playwright install chromium
\`\`\`

Midscene needs a vision-language model to perceive the screen. You configure it through environment variables. A general multimodal model like GPT-4o works, but Midscene strongly favors a dedicated visual-grounding model such as Qwen2.5-VL or a UI-TARS variant, which are faster and more accurate at returning element coordinates.

\`\`\`bash
# General multimodal model
export OPENAI_API_KEY="sk-..."
export MIDSCENE_MODEL_NAME="gpt-4o"

# Or a dedicated visual grounding model (recommended for UI work)
export OPENAI_BASE_URL="https://your-vl-endpoint/v1"
export OPENAI_API_KEY="..."
export MIDSCENE_MODEL_NAME="qwen2.5-vl-72b-instruct"
export MIDSCENE_USE_QWEN_VL=1
\`\`\`

The model choice matters more in Midscene than in DOM-based tools, because everything flows through visual perception. A purpose-built grounding model returns tighter coordinates with lower latency, which directly translates into faster, more reliable tests. You can start with a general model to prototype and switch the endpoint later without touching your test code.

## Your First Midscene Test With Playwright

Midscene plugs into Playwright as a fixture, exposing an \`agentForPage\` helper or a custom \`test\` fixture that gives you an \`ai\`-prefixed agent on top of the normal Playwright \`page\`. Here is a complete, runnable test that drives a search flow entirely in natural language.

\`\`\`ts
import { test, expect } from '@playwright/test';
import { PlaywrightAiFixture } from '@midscene/web/playwright';

export const aiTest = test.extend(PlaywrightAiFixture());

aiTest('search returns relevant results', async ({ page, ai, aiQuery, aiAssert }) => {
  await page.goto('https://www.ebay.com');

  // High-level, multi-step instruction
  await ai('type "noise cancelling headphones" in the search box and press Enter');

  // Extract structured data straight off the rendered screen
  const items = await aiQuery(
    '{ title: string, price: number }[], the product cards on the results page',
  );

  expect(items.length).toBeGreaterThan(0);

  // Natural-language assertion, throws if false
  await aiAssert('the page shows search results for headphones');
});
\`\`\`

Notice there is not a single CSS selector in that test. The instructions describe intent, the queries describe the data shape in a compact inline type, and the assertion reads like an acceptance criterion. That is the Midscene authoring experience: tests that double as living documentation.

## The aiAction and Atomic Action Methods

\`aiAction\` (aliased as \`ai\`) is the high-level entry point. You give it a goal and it plans and executes the steps to reach it, looking at the screen between steps. It is the most flexible method and the right choice for compound flows.

\`\`\`ts
await ai('open the account menu and click Order History');
await ai('apply the "Last 30 days" filter');
\`\`\`

When you want precise, single-step control with the lowest latency, use the atomic action methods. \`aiTap\` clicks an element described in words, \`aiInput\` types into a field, \`aiScroll\` scrolls toward a target, \`aiHover\` moves over an element, and \`aiKeyboardPress\` sends a key. Atomic methods skip the planning step, so they are faster and more deterministic than a broad \`aiAction\`.

\`\`\`ts
await aiTap('the hamburger menu icon in the top left');
await aiInput('jane@example.com', 'the email address field');
await aiInput('correct horse battery', 'the password field');
await aiTap('the Sign in button');
await aiScroll({ direction: 'down', scrollType: 'once' }, 'the footer area');
await aiKeyboardPress('Enter');
\`\`\`

A good rule of thumb: reach for atomic methods (\`aiTap\`, \`aiInput\`) for known, single interactions where you want speed and predictability, and reach for \`aiAction\` only when a step genuinely requires the model to plan across several screens. Mixing them keeps tests both fast and readable, the same hybrid discipline we recommend in our [self-healing test automation guide](/blog/self-healing-test-automation-guide).

## Extracting Data With aiQuery

\`aiQuery\` is Midscene's structured-extraction method. You pass a description of the shape you want, expressed as an inline TypeScript-like type plus a natural-language hint, and the model reads it off the screen. Because perception is visual, \`aiQuery\` can read values that live in canvas charts, images, or custom-rendered components where no DOM text exists.

\`\`\`ts
// Array of objects
const rows = await aiQuery(
  '{ name: string, status: string, lastSeen: string }[], the users table rows',
);

// A single summary object
const summary = await aiQuery(
  '{ total: number, currency: string, itemCount: number }, the order summary panel',
);

console.log(summary.total, summary.currency);
\`\`\`

Midscene also offers narrower helpers built on the same engine. \`aiBoolean\` returns a yes/no judgment, \`aiNumber\` returns a single number, and \`aiString\` returns a single string, each useful when you want a typed scalar rather than an object.

\`\`\`ts
const isLoggedIn = await aiBoolean('is there a user avatar in the top right');
const cartCount = await aiNumber('how many items are in the cart badge');
const headline = await aiString('the main headline text on the hero section');
\`\`\`

This visual extraction is Midscene's superpower for analytics dashboards, data-visualization apps, and any UI that draws its content rather than emitting it as DOM text. A selector cannot read a number painted on a canvas chart; a vision model just reads it.

## Assertions With aiAssert

\`aiAssert\` turns a natural-language condition into a test assertion. The model evaluates the statement against the current screen and Midscene throws a descriptive error if it is false, including the model's explanation of why. This is what makes Midscene tests feel like executable acceptance criteria.

\`\`\`ts
await ai('add the first product to the cart');

await aiAssert('a confirmation toast saying the item was added is visible');
await aiAssert('the cart icon badge shows a count of at least 1');
await aiAssert('no error or warning banner is displayed anywhere on the page');
\`\`\`

The last assertion is the kind of thing that is painful with selectors and trivial with vision. "No error banner anywhere" does not map to a single element; it is a holistic visual judgment, exactly what a vision-language model is good at. \`aiAssert\` can catch layout regressions, overlapping elements, broken images, and missing states that a DOM assertion would sail right past.

For data-shaped checks, you can also combine \`aiQuery\` with your normal test runner's expectations, getting structured values out and asserting on them with full control over the comparison.

\`\`\`ts
const price = await aiNumber('the displayed total price');
expect(price).toBeLessThan(100);
\`\`\`

## YAML Automation: Tests Without Code

Not everyone wants to write TypeScript. Midscene ships a YAML runner so you can author whole flows declaratively and run them with a CLI. This is excellent for QA engineers who think in steps rather than code, and for keeping simple regression flows in version control without a build step.

\`\`\`yaml
# search.yaml
web:
  url: https://www.bing.com

tasks:
  - name: search headphones
    flow:
      - ai: type "wireless headphones" in the search box and press Enter
      - sleep: 2000
      - aiAssert: the results page shows headphone listings

  - name: extract first result
    flow:
      - aiQuery: >
          { title: string, url: string }, the first organic search result
        name: firstResult
\`\`\`

You run it with the Midscene CLI, which executes every task and produces a visual report.

\`\`\`bash
npx midscene ./search.yaml
\`\`\`

The YAML format supports the same \`ai\`, \`aiTap\`, \`aiInput\`, \`aiQuery\`, and \`aiAssert\` verbs as the code API, plus control such as \`sleep\` and named outputs. It lowers the barrier to entry dramatically, a non-programmer can write and maintain a meaningful UI test in minutes.

## The Visual Report and Debugging Playground

Every Midscene run produces an HTML report that visualizes what the model saw and did at each step. For each action it shows the screenshot, the bounding box the model targeted, the instruction, and the model's reasoning. When a step misfires, the report tells you exactly what the model perceived, which is far more useful than a stack trace pointing at a failed selector.

Midscene also includes a visual playground and a Chrome extension where you can type natural-language instructions and watch them execute on a live page in real time, with no test file at all. This is the fastest way to prototype an instruction, confirm the model grounds it correctly, then copy the working phrasing into your test. The debugging loop, see what the model saw, adjust the wording, re-run, is central to writing reliable vision-based tests.

A practical tip: phrase instructions the way you would describe an element to a colleague who is looking at the screen with you. "The green Checkout button at the bottom of the cart" grounds more reliably than a terse "checkout," because the extra visual detail helps the model disambiguate when several similar elements exist.

## Midscene vs DOM-Based Automation

The fundamental difference between Midscene and tools like raw Playwright or Stagehand is perception. Midscene looks at pixels; DOM tools read the document tree. That single distinction drives every trade-off in the table below.

| Dimension | DOM-based (Playwright, Stagehand) | Midscene (vision) |
|---|---|---|
| Perception | Accessibility tree / DOM | Screenshot, vision-language model |
| Reads canvas / WebGL / images | No | Yes |
| Selector maintenance | Some (Stagehand reduces it) | None |
| Layout / visual bug detection | Weak | Strong |
| Speed per step | Fast | Slower, model-dependent |
| Cross-platform (web + native mobile) | Web focused | Web, Android, plus extension |
| Authoring style | Code, some natural language | Natural language, code or YAML |
| Best fit | Standard web apps with rich DOM | Visual, canvas, and cross-platform UIs |

Vision is not strictly better, it is different. For a conventional web form with clean semantic HTML, a DOM tool will be faster and cheaper. For a charting dashboard, a game UI, a map, or any pixel-perfect visual check, Midscene sees things the DOM tools are blind to.

## Midscene vs Stagehand vs Playwright MCP

Three AI browser tools come up constantly in 2026 evaluations. They differ chiefly in how they perceive and where they slot into your stack.

| Tool | Perception | Primary API | Drivers | Best fit |
|---|---|---|---|---|
| Midscene.js | Vision LLM (screenshots) | aiAction / aiTap / aiQuery / aiAssert | Playwright, Puppeteer, Android, YAML | Visual, canvas, cross-platform UI testing |
| Stagehand | Accessibility tree / DOM | act / extract / observe | Playwright | TypeScript teams extending Playwright |
| Playwright MCP | Accessibility snapshot | MCP tools for agents | Playwright | Driving a browser from an autonomous agent |

Choose Midscene when the UI is visual or spans web and native mobile, and when human-readable assertions matter. Choose Stagehand when you live in TypeScript and want to extend an existing Playwright suite with cacheable, deterministic AI steps. Choose the MCP route when you are wiring a browser into an autonomous agent over a protocol; our [MCP server testing guide](/blog/mcp-server-testing-guide-2026) covers how to test those integrations end to end. Many teams use more than one, vision for the visual surfaces, DOM tools for the rest.

## Real-World QA Use Cases and Best Practices

Midscene earns its keep on UIs that defeat selectors. Analytics and BI dashboards rendered to canvas, mapping and geospatial apps, design tools, games, and embedded third-party widgets are all natural fits, because their content is visual rather than DOM-addressable. Visual regression and layout-bug detection is another sweet spot, since \`aiAssert\` can judge holistic conditions like "nothing overlaps" or "no broken images." And because Midscene also automates Android via adb, a single mental model covers web and native mobile.

A few best practices make Midscene tests reliable. Prefer atomic methods (\`aiTap\`, \`aiInput\`) over broad \`aiAction\` where you can, for speed and determinism. Use a dedicated visual-grounding model for production runs. Add explicit waits after navigation so the model perceives a settled screen. Phrase instructions with disambiguating visual detail. And lean on the HTML report to debug grounding instead of guessing. Pair these with the installable patterns in the [QA skills directory](/skills) to bring Midscene into your Claude Code and Cursor workflows.

## Frequently Asked Questions

### How is Midscene different from Playwright?

Playwright reads the DOM and targets elements by selector. Midscene reads a screenshot with a vision-language model and targets elements by how they look. That lets Midscene interact with canvas, WebGL, images, and icon-only buttons that have no useful DOM, and to make holistic visual assertions. Midscene actually integrates with Playwright as a driver, so you can use both together.

### Does Midscene require writing code?

No. Midscene offers a code API for Playwright and Puppeteer, but it also ships a YAML runner where you declare flows declaratively and execute them with the Midscene CLI, plus a Chrome extension and visual playground for running natural-language instructions with no file at all. The same \`ai\`, \`aiTap\`, \`aiQuery\`, and \`aiAssert\` verbs work across code and YAML.

### Which AI models does Midscene support?

Midscene works with general multimodal models like GPT-4o and, preferably, dedicated visual-grounding models such as Qwen2.5-VL or UI-TARS variants, which return tighter coordinates with lower latency. You configure the model through environment variables like \`MIDSCENE_MODEL_NAME\` and an OpenAI-compatible base URL, so switching models does not require changing your test code.

### What is the difference between aiAction and aiTap?

\`aiAction\` (aliased \`ai\`) is a high-level instruction that the model plans and executes across one or more steps, looking at the screen between them. \`aiTap\` is an atomic, single click on an element described in words, with no planning step. Use \`aiTap\` and other atomic methods for known, single interactions where you want speed and determinism, and \`aiAction\` for compound flows.

### Can Midscene test mobile apps?

Yes. Beyond web testing through Playwright and Puppeteer, Midscene supports native Android automation via adb, using the same vision-driven model and the same \`aiAction\`, \`aiTap\`, \`aiQuery\`, and \`aiAssert\` API. Because perception is visual rather than platform-specific, one mental model covers both web and Android, which is unusual among UI automation tools.

### Is Midscene good for visual regression testing?

It is one of its strongest use cases. Because \`aiAssert\` evaluates natural-language conditions against the rendered screen, you can assert holistic visual states like "no element overlaps the header," "no broken images," or "the success toast is visible." Those checks are awkward with DOM selectors but natural for a vision model that perceives the whole layout at once.

### How does Midscene handle test reliability and debugging?

Every run produces an HTML report showing, per step, the screenshot, the bounding box the model targeted, the instruction, and the model's reasoning. When a step fails you can see exactly what the model perceived. The Chrome extension and playground let you prototype and tune instruction wording live. Better phrasing and a dedicated grounding model are the two biggest reliability levers.

### Does Midscene replace Stagehand or Playwright entirely?

Not necessarily. Midscene is vision-first and excels on canvas, visual, and cross-platform UIs, while DOM-based tools like Stagehand and raw Playwright are faster and cheaper on conventional web apps with clean HTML. Many teams use Midscene for the visual surfaces and a DOM tool for everything else, picking the perception model that fits each part of the application.

## Conclusion

Midscene.js reframes UI testing around how the user actually experiences software: visually. By driving a vision-language model with the \`aiAction\`, \`aiTap\`, \`aiQuery\`, and \`aiAssert\` API, it tests interfaces that the DOM cannot see, eliminates selector maintenance, and turns assertions into human-readable acceptance criteria. Its Playwright and Puppeteer integrations, Android support, YAML runner, and visual debugging report make it approachable for coders and non-coders alike. For canvas-heavy dashboards, visual regression, and cross-platform flows, it is the tool that finally meets the UI at the pixel.

Ready to test what your selectors cannot see? Explore the [QA skills directory](/skills) for installable Midscene and Playwright patterns you can drop into Claude Code, Cursor, and your other AI agents, and pair this guide with our [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) to build a suite that covers both the DOM and the pixels.
`,
};
