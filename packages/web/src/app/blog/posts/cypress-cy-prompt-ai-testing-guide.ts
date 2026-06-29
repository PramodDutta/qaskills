import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress cy.prompt: AI Test Authoring Guide (2026)',
  description:
    'Master Cypress 15 cy.prompt in 2026: write plain-English steps that compile to real Cypress commands. Worked login/checkout example, determinism, CI, and limits.',
  date: '2026-06-29',
  category: 'Guide',
  content: `
# Cypress cy.prompt: AI Test Authoring Guide (2026)

Cypress 15 introduced \`cy.prompt\`, a natural-language command that lets you describe a test flow in plain English and have the Cypress AI engine translate those instructions into real, executable Cypress commands at runtime. Instead of hand-writing every \`cy.get\`, \`cy.type\`, and \`cy.click\`, you write a short list of human-readable steps -- "type the email into the email field", "click the login button", "assert the dashboard heading is visible" -- and \`cy.prompt\` resolves them against the live DOM, generates the underlying commands, and runs them inside the same deterministic Cypress event loop you already trust.

This is not a screenshot-based vision agent bolted onto the side of your suite. \`cy.prompt\` runs in-browser, has direct access to the application's DOM and accessibility tree, and emits standard Cypress commands that show up in the Command Log exactly like the ones you would have typed yourself. That means retries, automatic waiting, time-travel debugging, and the Test Runner all work unchanged. The promise is faster authoring for the boring 80 percent of flows, with a clean escape hatch to hand-written commands for the precise 20 percent.

In this guide you will learn what \`cy.prompt\` actually does under the hood, how to enable it, how to write plain-English steps that compile reliably, a complete worked login-and-checkout example, how to handle determinism and review, how it compares to Playwright's AI agent approach, where it breaks down, and how to run it safely in CI. If you are building an AI-assisted QA workflow, you may also want our [AI test generation and LLM prompting guide](/blog/ai-test-generation-llm-prompting-guide) and the curated [QA skills directory](/skills).

## What cy.prompt Actually Does

\`cy.prompt\` accepts an array of natural-language instructions and, at execution time, sends them along with a snapshot of the current DOM to the Cypress AI service. The service returns a sequence of concrete Cypress commands -- locators, actions, and assertions -- which Cypress then executes in order. Crucially, the translation happens once per run (or once and caches, depending on configuration), and the resulting commands are real Cypress commands subject to the normal retry-ability and built-in waiting rules.

Think of it as a compiler from intent to commands. You supply the intent ("log in as a standard user"), and the engine supplies the implementation (\`cy.get('[data-cy=email]').type(...)\`). Because the output is ordinary Cypress, nothing about your reporting, screenshots, videos, or CI plumbing needs to change.

\`\`\`js
// cypress/e2e/login.cy.js
describe('Login with cy.prompt', () => {
  it('logs in a standard user', () => {
    cy.visit('/login');

    cy.prompt([
      'Type "standard_user@example.com" into the email field',
      'Type "Secret123!" into the password field',
      'Click the "Log in" button',
      'Assert that the page heading "Dashboard" is visible',
    ]);
  });
});
\`\`\`

Each string is one step. The engine reads them top to bottom, resolves the relevant element from the live DOM, and produces the matching command. You can mix \`cy.prompt\` blocks with hand-written Cypress freely in the same test.

## Enabling cy.prompt in Cypress 15

\`cy.prompt\` ships in Cypress 15 but is gated behind an experimental flag plus a Cypress Cloud connection (the AI translation runs as a service). Enable it in \`cypress.config.js\` and provide your project key.

\`\`\`js
// cypress.config.js
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  projectId: 'your-cloud-project-id',
  e2e: {
    experimentalPromptCommand: true,
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
\`\`\`

Then authenticate the record key as an environment variable so CI and local runs can reach the AI service:

\`\`\`bash
export CYPRESS_RECORD_KEY="your-record-key"
npx cypress run --record
\`\`\`

A few enabling notes worth committing to memory:

- \`cy.prompt\` requires network access to the Cypress AI endpoint. Fully air-gapped CI will not work without a self-hosted relay.
- The command is experimental, so the API surface and config key names can change between minor releases. Pin your Cypress version in \`package.json\`.
- You can scope which environments use it. Many teams enable it only in a dedicated authoring environment and compile prompts to static commands before merging (more on that below).

## Writing Plain-English Steps That Compile Reliably

The quality of generated commands is a direct function of the quality of your steps. Vague steps produce ambiguous locators; precise steps produce stable ones. Treat each step like a sentence you would say to a careful new hire who can see the screen but does not know your codebase.

| Weak step | Stronger step | Why it is better |
|---|---|---|
| "Log in" | "Type the email, type the password, then click the Log in button" | Decomposes one fuzzy action into discrete, resolvable steps |
| "Click submit" | "Click the button labeled 'Place order'" | Names the visible label so the engine binds to the right element |
| "Check it worked" | "Assert the text 'Order confirmed' is visible" | Turns a vague check into a concrete, retry-able assertion |
| "Fill the form" | "Type 'Jane' into First name, 'Doe' into Last name" | Removes guessing about which fields and what values |
| "Go to cart" | "Click the cart icon in the top navigation" | Disambiguates location when multiple cart links exist |

Practical rules for reliable steps:

1. **One intent per step.** Combine related typing into a single step only when fields are unambiguous; otherwise split.
2. **Quote literal values and visible labels.** \`'Place order'\` is a strong anchor; "the button" is not.
3. **Prefer accessible names.** Steps referencing visible text, ARIA labels, or roles bind to more stable locators than steps referencing layout ("the third box").
4. **Assert observable outcomes.** "Assert the URL contains /dashboard" or "Assert 'Welcome back' is visible" gives the engine a concrete predicate.
5. **Keep prompts short.** Five to eight steps per block is the sweet spot. Long blocks increase the chance one ambiguous step poisons the rest.

If your app exposes \`data-cy\` or \`data-testid\` attributes, the engine will happily use them, and your steps become even more robust. Good test IDs and good prompts are complementary, not competing, strategies.

## Worked Example: Login and Checkout

Here is an end-to-end flow that logs in, adds a product, and completes checkout -- expressed almost entirely in natural language, with a couple of hand-written guard rails.

\`\`\`js
// cypress/e2e/checkout.cy.js
describe('Storefront checkout', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('completes a purchase end to end', () => {
    // Authenticate using natural language
    cy.prompt([
      'Type "shopper@example.com" into the email field',
      'Type "Sup3rSecret!" into the password field',
      'Click the "Sign in" button',
      'Assert the heading "Shop" is visible',
    ]);

    // Add a product and open the cart
    cy.prompt([
      'Search for "Wireless Headphones" in the search box',
      'Click the first product card in the results',
      'Click the "Add to cart" button',
      'Click the cart icon in the top navigation',
      'Assert the cart contains "Wireless Headphones"',
    ]);

    // Hand-written assertion for a precise business rule
    cy.get('[data-cy=cart-total]')
      .invoke('text')
      .then((text) => {
        const total = Number(text.replace(/[^0-9.]/g, ''));
        expect(total).to.be.greaterThan(0);
      });

    // Finish checkout with natural language again
    cy.prompt([
      'Click the "Checkout" button',
      'Type "123 Test Street" into the shipping address field',
      'Select "Standard shipping" from the shipping method options',
      'Click the "Place order" button',
      'Assert the text "Order confirmed" is visible',
    ]);

    // Hard, explicit verification of the success state
    cy.location('pathname').should('include', '/order/confirmation');
    cy.contains('[data-cy=order-id]', /ORD-\\d+/).should('be.visible');
  });
});
\`\`\`

Notice the pattern: \`cy.prompt\` handles navigation and form filling (high churn, low risk), while hand-written commands lock down the things that must never silently pass -- the numeric cart total and the order-ID format. This hybrid style is the recommended default. Let the AI do the typing-and-clicking grind; keep deterministic, business-critical assertions in code you fully control.

## Determinism and Review Concerns

The single biggest objection to natural-language test authoring is determinism. If the AI re-interprets your steps on every run, could the same test do different things on Tuesday than it did on Monday? You have to design around this.

Cypress mitigates non-determinism in a few ways, and you should reinforce all of them:

- **Command caching.** The translation can be cached so a given prompt resolves to the same command sequence across runs until the prompt or DOM materially changes. Enable and version this cache so CI is reproducible.
- **Compile-to-static.** Many teams use \`cy.prompt\` purely as an authoring accelerator: run it once interactively, capture the generated commands, and commit those static commands to the repo. The AI becomes a code generator, not a runtime dependency.
- **Review the generated commands.** The Command Log shows exactly which commands the prompt produced. Treat a prompt's first run like a draft PR -- read what it generated before trusting it.

| Strategy | Runtime AI call? | Determinism | Best for |
|---|---|---|---|
| Live prompt every run | Yes | Lower | Exploratory authoring, smoke checks |
| Cached prompt | Once, then reused | Medium-high | Stable suites that tolerate occasional re-resolution |
| Compile-to-static | No (after authoring) | Highest | Critical regression suites, regulated environments |

For any suite that gates a deploy, lean toward compile-to-static or cached prompts. Reserve live-every-run prompts for low-stakes smoke tests or local exploration. The golden rule: the more important the test, the less you want a network round-trip and a model re-interpreting intent at runtime. For broader resilience patterns, see our companion piece on [self-healing test maintenance strategies](/blog/ai-test-maintenance-self-healing-strategies).

## How cy.prompt Compares to Playwright's AI Approach

Both ecosystems are racing toward AI-assisted authoring, but they made different architectural bets. Cypress put a natural-language compiler inside a single command that emits ordinary Cypress commands. Playwright leaned into a multi-agent model -- planner, generator, and healer subagents that operate over the Model Context Protocol, often driven from an external tool like Claude Code.

| Dimension | Cypress cy.prompt | Playwright AI agents |
|---|---|---|
| Unit of AI work | A single command with NL steps | Separate planner / generator / healer agents |
| Where it runs | In-browser, in the Cypress event loop | Often external (MCP server + agent host) |
| Output | Real Cypress commands, inline | Standalone test files on disk |
| Self-healing | Manual re-run / re-resolve | Dedicated healer agent repairs locators |
| Determinism control | Cache or compile-to-static | Generate once, commit, then run normally |
| Best fit | Teams already on Cypress wanting faster authoring | Teams wanting full agentic generation + repair |

Neither is strictly better. \`cy.prompt\` is the lowest-friction path if you are already a Cypress shop -- one new command, no new infrastructure. Playwright's agents are more powerful for fully autonomous generation and repair but require more orchestration. If you are weighing the two paradigms, our [AI agent testing workflows comparison](/blog/ai-agent-testing-workflows-comparison) breaks down the trade-offs in depth, and the [Cypress vs Playwright 2026](/blog/cypress-vs-playwright-2026) article covers the non-AI fundamentals.

## Limitations and When to Fall Back to Hand-Written Commands

\`cy.prompt\` is a power tool, not a silver bullet. Fall back to explicit Cypress commands whenever any of the following apply:

- **Complex assertions.** Numeric math, regex matching, sorted-order checks, and multi-element comparisons are clearer and safer hand-written.
- **Canvas, WebGL, and pixel work.** The engine reasons about the DOM and accessibility tree; it cannot reliably target pixels inside a canvas.
- **Tight timing and races.** Steps that depend on a specific intermediate state (a toast that appears for 500ms) are better controlled with explicit \`cy.intercept\` and aliases.
- **Security-sensitive flows.** Anything touching real payments, auth tokens, or PII deserves deterministic, reviewed code -- not runtime AI interpretation.
- **Cross-origin and iframe juggling.** Use \`cy.origin\` and frame-aware commands directly.
- **Highly dynamic copy.** If button labels are localized or A/B tested, label-based steps get flaky; switch to \`data-cy\` anchors.

A good heuristic: use \`cy.prompt\` to get from page A to page B, and use hand-written assertions to prove you arrived in the right state. The AI is great at navigation, mediocre at judgment.

\`\`\`js
// Prefer hand-written for precise, business-critical checks
cy.intercept('POST', '/api/orders').as('createOrder');
cy.prompt(['Click the "Place order" button']);
cy.wait('@createOrder').its('response.statusCode').should('eq', 201);
\`\`\`

## CI Considerations

Running \`cy.prompt\` in continuous integration introduces a network dependency and a cost dimension you must plan for.

\`\`\`yaml
# .github/workflows/e2e.yml
name: E2E
on: [push, pull_request]
jobs:
  cypress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build && npm run start &
      - name: Wait for app
        run: npx wait-on http://localhost:3000
      - name: Run Cypress
        run: npx cypress run --record
        env:
          CYPRESS_RECORD_KEY: \${{ secrets.CYPRESS_RECORD_KEY }}
\`\`\`

CI checklist for prompt-driven suites:

1. **Treat the AI endpoint as a dependency.** Network blips will fail prompt resolution. Add retries at the job level and consider compile-to-static for the gating suite so CI does not call the service at all.
2. **Budget the calls.** Each live prompt resolution may incur a service cost. Cache aggressively and prefer static-compiled tests on the critical path.
3. **Pin Cypress.** Because the command is experimental, an unpinned minor bump can change behavior mid-sprint.
4. **Separate authoring from gating.** Run live prompts in a nightly "drift detection" job; run committed static commands on every PR.
5. **Capture artifacts.** Keep videos and the Command Log so you can see exactly which commands a prompt produced when a run fails.

For deeper CI patterns that apply to any framework, our [CI/CD testing pipeline with GitHub Actions](/blog/cicd-testing-pipeline-github-actions) guide is a solid companion.

## Frequently Asked Questions

### What is cy.prompt in Cypress?

\`cy.prompt\` is a Cypress 15 command that accepts an array of plain-English instructions and uses the Cypress AI engine to translate them into real, executable Cypress commands at runtime. It resolves each step against the live DOM, emits standard commands into the Command Log, and runs inside the normal Cypress event loop with full retry-ability and automatic waiting.

### Is cy.prompt deterministic enough for CI?

It can be. By default a live prompt re-resolves per run, which lowers determinism. Enable command caching so a prompt maps to the same command sequence until the prompt or DOM changes, or use the compile-to-static approach -- run the prompt once, capture the generated commands, and commit them. For deploy-gating suites, static-compiled tests are the safest choice.

### How do I enable cy.prompt in Cypress 15?

Set \`experimentalPromptCommand: true\` under the \`e2e\` key in \`cypress.config.js\`, add your Cypress Cloud \`projectId\`, and provide a \`CYPRESS_RECORD_KEY\` environment variable. The command needs network access to the Cypress AI service, so confirm your CI runners can reach it or use a self-hosted relay.

### Can I mix cy.prompt with regular Cypress commands?

Yes, and you should. The recommended pattern is to use \`cy.prompt\` for navigation and form filling while keeping precise, business-critical assertions -- numeric totals, regex checks, intercepted API responses -- in hand-written commands. Both styles share the same Command Log, retries, and time-travel debugging, so they interleave cleanly in one test.

### How does cy.prompt compare to Playwright AI agents?

\`cy.prompt\` is a single in-browser command that emits Cypress commands inline, making it the lowest-friction option for existing Cypress teams. Playwright uses separate planner, generator, and healer agents over MCP, often driven externally, which is more powerful for fully autonomous generation and locator repair but requires more orchestration and infrastructure.

### When should I avoid cy.prompt and write commands by hand?

Avoid it for complex assertions (math, regex, sorted order), canvas and WebGL work, tight timing races, security-sensitive payment or auth flows, cross-origin and iframe juggling, and highly dynamic or localized copy. A good rule is to use \`cy.prompt\` to move between pages and hand-written commands to prove you reached the correct state.

### Does cy.prompt work offline or in air-gapped CI?

Not by default. \`cy.prompt\` calls the Cypress AI service to translate steps, so fully air-gapped CI will fail unless you route through a self-hosted relay. The common workaround is compile-to-static: resolve prompts once in a connected environment, commit the generated commands, and run those committed tests in the isolated pipeline with no runtime AI calls.

## Conclusion

\`cy.prompt\` lowers the cost of writing the boring, high-churn parts of an end-to-end suite without giving up Cypress's deterministic core. Used well, it is a compiler from human intent to real commands: write five crisp steps, review what they generate, and either cache or compile them to static for anything that gates a deploy. Used carelessly -- vague steps, runtime AI on the critical path, no review -- it becomes one more source of flakiness. The winning pattern is hybrid: AI for navigation and form filling, hand-written code for the assertions that must never silently pass.

If you want a curated set of expert testing patterns -- Cypress, Playwright, API, and self-healing strategies -- to layer on top of AI authoring, explore the [QASkills.sh skills directory](/skills) and pull the ones your AI coding agent needs straight into your project.
`,
};
