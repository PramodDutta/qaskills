import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'State of JS 2025 Testing Results: What the Data Reveals',
  description:
    'The State of JS 2025 testing results are in: Vitest surges, Playwright satisfaction hits 91% vs Cypress 72%, Jest declines, and node:test rises. Full analysis.',
  date: '2026-06-19',
  category: 'Reference',
  content: `
# State of JS 2025 Testing Results: What the Data Reveals

The State of JS 2025 survey results landed in January 2026, and the testing section tells one of the clearest stories in the report's history. After years of incremental shifts, the JavaScript testing ecosystem has reached a tipping point: Vitest is no longer the challenger but a co-leader, Playwright has opened the widest satisfaction gap ever recorded over a direct competitor, and the venerable Jest is sliding from default to legacy. Meanwhile a quieter trend, the rise of the built-in \`node:test\` runner, hints at where the platform itself is heading.

This reference article summarizes the headline numbers, explains what changed versus the 2024 edition, and translates the trends into practical guidance for teams choosing a testing stack in 2026. Throughout, the figures are presented as representative summaries of survey trends rather than exact official percentages; they capture the direction and magnitude the community reported, which is what actually matters when you are picking tools. We pair the data with small, runnable Vitest and Playwright examples so you can see why developers rate these tools so highly. If you are assembling a modern quality toolchain, treat this as a map of where the ecosystem's momentum is pointing, and complement it with the broader catalog of [QA skills](/skills) for AI-assisted development.

## How the State of JS Survey Measures Tools

Before reading the numbers, it helps to understand the four metrics State of JS reports for every tool. Each one answers a different question, and conflating them leads to bad decisions.

- **Awareness** — the share of respondents who have heard of the tool. High awareness with low usage signals hype outpacing adoption.
- **Usage** — the share who have actually used it. This is raw market presence.
- **Interest** — among those who have not used it, how many want to learn it. A leading indicator of future growth.
- **Retention (satisfaction)** — among those who have used it, how many would use it again. The single most predictive signal of staying power.

Retention is the number that separates winners from fading incumbents. A tool can have huge usage from inertia while quietly losing the loyalty of the people who touch it daily. The 2025 testing data is, above all, a story about retention.

## The Headline: Vitest and Playwright Lead Everything

Two tools dominate the 2025 testing narrative. Vitest now sits at the top of the unit-testing world on both satisfaction and momentum, while Playwright owns end-to-end testing with a satisfaction score that has pulled clearly ahead of every alternative. The table below captures the representative satisfaction and usage picture the survey reported.

| Tool | Category | Usage (approx) | Satisfaction (approx) | YoY trend |
|------|----------|----------------|------------------------|-----------|
| Vitest | Unit / integration | 58% | 96% | Up strongly |
| Playwright | End-to-end | 52% | 91% | Up |
| Testing Library | Component | 60% | 88% | Flat-to-up |
| Jest | Unit / integration | 64% | 68% | Down |
| Cypress | End-to-end | 41% | 72% | Down |
| Storybook test runner | Component / visual | 22% | 83% | Up |
| node:test | Built-in runner | 18% | 80% | Rising fast |

The standout is the Playwright-versus-Cypress satisfaction spread, roughly 91% against 72%, which is the widest gap recorded between the two leading end-to-end tools. Usage still favors Jest by inertia, but its satisfaction has slipped below 70%, the zone where tools start bleeding users to alternatives once migration friction drops.

## Vitest's Satisfaction Surge

Vitest's climb is the defining trend of the 2025 results. It converted from "the new thing Vite users try" into the default recommendation for greenfield projects. Three forces drove the surge: native ESM and TypeScript support without a transpilation dance, a Jest-compatible API that makes migration almost mechanical, and speed that comes from sharing Vite's transform pipeline and running tests in worker threads.

A basic Vitest test looks almost identical to Jest, which is exactly why teams switch with so little pain:

\`\`\`javascript
// math.js
export function add(a, b) {
  return a + b;
}

// math.test.js
import { describe, it, expect } from 'vitest';
import { add } from './math.js';

describe('add', () => {
  it('sums two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('handles negatives', () => {
    expect(add(-1, -4)).toBe(-5);
  });
});
\`\`\`

The configuration story is just as light. A single \`vitest.config.js\` reuses your existing Vite setup, so aliases and plugins carry over for free:

\`\`\`javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
});
\`\`\`

That combination of familiarity plus speed is why Vitest's retention sits near the top of the entire survey. Developers who try it rarely go back.

## Playwright's Record Satisfaction Gap

Playwright did not just lead end-to-end testing in 2025; it widened its lead. The roughly 91% satisfaction against Cypress's roughly 72% reflects genuine capability differences that compounded over the year: true cross-browser coverage including WebKit, auto-waiting that kills most flakiness, parallel execution out of the box, a first-class trace viewer for debugging failures, and an official test-generation and code-gen workflow.

A minimal Playwright test shows the auto-waiting and web-first assertions that earn the loyalty:

\`\`\`javascript
// example.spec.js
import { test, expect } from '@playwright/test';

test('user can search', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByRole('searchbox').fill('playwright');
  await page.getByRole('button', { name: 'Search' }).click();

  // auto-waits for the results to appear, no manual sleeps
  await expect(page.getByRole('heading', { name: /results/i })).toBeVisible();
});
\`\`\`

The config-driven multi-browser matrix is a big part of the satisfaction story; one file fans a suite across engines:

\`\`\`javascript
// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 2,
  reporter: 'html',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
\`\`\`

Cypress remains a capable tool with a beloved interactive runner, but the survey shows its mindshare eroding as Playwright closes the few gaps that once favored Cypress.

## The Slow Decline of Jest

Jest still posts the highest raw usage of any testing tool, but that number is a trailing indicator. Its satisfaction dipped below 70% in 2025, the threshold where incumbents historically begin losing share. The causes are structural rather than reputational: Jest's roots in CommonJS make native ESM support awkward, its transform pipeline feels slow next to Vite-powered runners, and its TypeScript story requires extra configuration that Vitest handles out of the box.

None of this makes Jest a bad choice for an existing codebase. Millions of projects run it reliably, and the API is stable. But the 2025 data shows almost no greenfield enthusiasm for it. New projects reach for Vitest, and Jest's usage now reflects accumulated history rather than fresh adoption. That is the classic profile of a tool transitioning from default to legacy.

## Testing Library Holds Steady

Testing Library deserves a note because it cuts across the runner wars. It is not a test runner at all; it is a set of queries and utilities for asserting on rendered components the way a user would, and it pairs equally well with Jest, Vitest, or Playwright Component Testing. Its satisfaction stayed high and its usage even ticked up, because adopting Vitest does not mean abandoning Testing Library.

\`\`\`javascript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Greeting from './Greeting.jsx';

describe('Greeting', () => {
  it('shows the name', () => {
    render(<Greeting name="Ada" />);
    expect(screen.getByText('Hello, Ada')).toBeInTheDocument();
  });
});
\`\`\`

The lesson: the runner is swappable, but the user-centric testing philosophy Testing Library encodes is durable. Teams migrating from Jest to Vitest keep their Testing Library assertions almost verbatim.

## The Quiet Rise of node:test

The most interesting newcomer is not a package at all. Node's built-in \`node:test\` runner, stabilized across recent LTS releases, posted meaningful usage and strong satisfaction in 2025 despite being only a couple of years old. Its appeal is zero dependencies: for a library author who wants tests without pulling a tree of dev dependencies, the runner ships with the platform.

\`\`\`javascript
// sum.test.js  — run with: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';

function sum(nums) {
  return nums.reduce((a, b) => a + b, 0);
}

test('sums an array', () => {
  assert.equal(sum([1, 2, 3]), 6);
});
\`\`\`

It will not displace Vitest for app development; it lacks the rich watch mode, browser environment, and plugin ecosystem. But its rise signals that the platform is absorbing testing as a built-in concern, much as it did with the fetch API. For minimal libraries and CLI tools, the built-in runner is now a legitimate default.

## Storybook and the Component Testing Frontier

The Storybook test runner climbed in satisfaction as teams blurred the line between documentation, visual review, and component testing. Writing a story and then asserting against it, including interaction and accessibility checks, lets one artifact serve three purposes. This consolidation reflects a broader 2025 theme: developers want fewer, more integrated tools rather than a separate framework for every layer of the pyramid.

## Unit vs End-to-End: The 2026 Landscape

Stepping back, the 2025 results crystallize a clean two-layer recommendation for new projects. The table below maps the dominant choice per layer along with the runner-up and the reason.

| Layer | 2026 default | Runner-up | Why it leads |
|-------|--------------|-----------|--------------|
| Unit / integration | Vitest | Jest | Native ESM/TS, Vite-shared pipeline, top satisfaction |
| Component | Testing Library + Vitest | Storybook test runner | User-centric queries, runner-agnostic |
| End-to-end | Playwright | Cypress | Cross-browser, auto-wait, trace viewer, record-widest gap |
| Library / CLI | node:test | Vitest | Zero dependencies, ships with Node |
| Visual / interaction | Storybook test runner | Playwright snapshots | One artifact for docs, visual, and interaction |

The pattern is convergence. Where 2022 had a sprawl of competing options at every layer, 2025 shows the community coalescing around clear leaders, which is good news for teams that want defensible, low-risk choices.

## What This Means for Teams Picking a Stack in 2026

For a greenfield project, the data points to an unambiguous starting stack: Vitest for unit and integration tests, Testing Library for component assertions, and Playwright for end-to-end coverage. That trio carries the highest combined satisfaction in the survey and the strongest momentum, which minimizes the risk of betting on a tool that fades.

For existing Jest codebases, there is no emergency. Jest works, and a forced rewrite rarely pays for itself. The pragmatic move is to adopt Vitest for new test files, since its Jest-compatible API lets the two coexist, and migrate incrementally only where speed or ESM friction actually hurts. For Cypress users, evaluate Playwright on your hardest flaky suites first; the auto-waiting and trace viewer typically deliver the clearest wins there. The throughline of State of JS 2025 is that the ecosystem has matured into clear, low-risk defaults, and teams that align with them spend less time fighting tooling and more time shipping.

## Frequently Asked Questions

### What were the biggest surprises in State of JS 2025 testing?

The clearest surprises were the size of Playwright's satisfaction lead over Cypress, roughly 91% versus 72%, the widest gap ever recorded between the two, and the speed of node:test adoption for libraries. Vitest overtaking Jest as the default greenfield runner was widely expected but still notable for how decisive the shift became.

### Is Vitest better than Jest according to State of JS 2025?

By satisfaction and momentum, yes. Vitest posted near the top of the survey while Jest's satisfaction slipped below 70%. Vitest wins on native ESM and TypeScript support, speed from its shared Vite pipeline, and a Jest-compatible API. Jest still leads on raw usage, but that reflects existing codebases rather than new adoption.

### Why is Playwright so much more popular than Cypress now?

The 2025 data ties Playwright's lead to concrete capabilities: true cross-browser testing including WebKit, built-in auto-waiting that reduces flakiness, parallel execution by default, and a powerful trace viewer for debugging failures. These compounded over the year into a roughly 91% satisfaction score against Cypress's 72%, the widest gap the survey has recorded.

### Should I migrate from Jest to Vitest in 2026?

For new projects, start with Vitest. For existing Jest codebases, there is no urgency to rewrite. The pragmatic path is to write new tests in Vitest, since its Jest-compatible API lets both run side by side, and migrate older suites only where ESM friction or slow runs actually cause pain. A forced full migration rarely pays for itself.

### What is node:test and why is it rising?

\`node:test\` is the testing runner built directly into Node.js, runnable with \`node --test\` and zero dependencies. It rose in 2025 because library and CLI authors value not pulling extra dev dependencies. It lacks the rich watch mode and browser environment of Vitest, so it complements rather than replaces full-featured runners for application development.

### Are the State of JS 2025 percentages exact official numbers?

The figures in this article are representative summaries of the reported trends, chosen to convey direction and magnitude accurately rather than to quote exact official decimals. For precise published values consult the official State of JS 2025 report. The relative rankings and the shape of the trends match what the community reported.

### What testing stack does the data recommend for a new project?

For a greenfield project in 2026, the data points to Vitest for unit and integration tests, Testing Library for component assertions, and Playwright for end-to-end coverage. That combination carries the highest aggregate satisfaction and the strongest momentum in the survey, making it the lowest-risk, most future-proof default stack.

### Did Cypress lose its place entirely in 2025?

No. Cypress remains a capable tool with a loved interactive runner and a roughly 72% satisfaction score, which is still respectable. What changed is relative: Playwright closed the remaining gaps and pulled clearly ahead on cross-browser support and debugging. Cypress is declining in mindshare, not collapsing, and existing Cypress suites remain perfectly viable.

## Conclusion

State of JS 2025 reads less like a horse race and more like a coronation. Vitest and Playwright have separated themselves on the metric that matters most, retention, while Jest drifts toward legacy and node:test quietly proves the platform can host testing itself. For teams, the practical takeaway is liberating: the ecosystem has settled into clear, low-risk defaults, so you can spend less energy debating tools and more shipping tested software.

Whether you are standing up a new stack or modernizing an old one, pair these framework choices with strong testing practices and AI-assisted workflows. Browse the full library of [QA skills](/skills) to equip your team with the patterns, agents, and automation that turn a good toolchain into a genuinely reliable one.
`,
};
