import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Healenium Guide: Self-Healing Selenium Tests Explained',
  description:
    'How Healenium adds self-healing to Selenium: architecture, setup with Docker, healing algorithm, limits, and when to migrate instead of heal.',
  date: '2026-07-07',
  category: 'Guide',
  content: `
# Healenium Guide: Self-Healing Selenium Tests Explained

Selenium suites die by a thousand selector changes. A developer renames a CSS class, the nightly run turns red across forty tests, and a QA engineer spends the morning updating locators that have nothing to do with actual product risk. Healenium exists to absorb exactly that failure class: it is an open-source library (originally from EPAM) that sits between your tests and WebDriver, catches NoSuchElementException at runtime, finds the element the test most likely meant using the previous DOM state, and continues the run with the healed locator while reporting what it did.

This guide covers how the healing actually works, a practical setup, configuration that matters, honest limits, and the strategic question every Selenium team eventually faces: heal the suite or migrate it. If you are weighing that second option, our [Selenium vs Playwright comparison](/blog/selenium-vs-playwright-2026) covers the migration side.

## How Healenium Works

Healenium wraps your WebDriver instance in a proxy (SelfHealingDriver). From then on:

1. **On every successful findElement**, it stores the locator plus a fingerprint of the matched node and its DOM neighborhood (tag, attributes, ancestors, position) in a backend database (Postgres, run via Docker).
2. **On NoSuchElementException**, it retrieves the last known good fingerprint and runs a tree-comparing algorithm (an LCS-based similarity over the saved subtree vs the current DOM) to score candidate nodes on the live page.
3. **The best-scoring candidate** above a similarity threshold becomes the healed locator; the action proceeds, and the healing is recorded with a score and screenshot in a report dashboard.
4. **You review healings** and either accept them (update the code or let a plugin raise a PR) or reject them as false matches.

The key property: healing decisions are grounded in what the element used to be, not in an AI's guess about intent. That makes Healenium deterministic and cheap (no LLM calls), and also explains its limits: it can only heal elements it has successfully seen before.

## Setup in Ten Minutes

Backend first (Docker Compose ships in the healenium/healenium-backend repo):

\`\`\`bash
git clone https://github.com/healenium/healenium.git
cd healenium && docker compose up -d   # starts postgres + backend + report UI
\`\`\`

Then the test side (Java example, Maven):

\`\`\`xml
<dependency>
  <groupId>com.epam.healenium</groupId>
  <artifactId>healenium-web</artifactId>
  <version>3.5.2</version>
</dependency>
\`\`\`

\`\`\`java
WebDriver delegate = new ChromeDriver();
SelfHealingDriver driver = SelfHealingDriver.create(delegate);
// use driver exactly as before; healing is transparent
driver.findElement(By.id("buy-now")).click();
\`\`\`

And healenium.properties:

\`\`\`properties
recovery-tries = 1
score-cap = 0.6          # minimum similarity to accept a healing
heal-enabled = true
serverHost = localhost
serverPort = 7878
\`\`\`

Python, JavaScript, and C# bindings exist (healenium-appium covers mobile), and a hlm-idea plugin plus GitHub integration can turn accepted healings into code updates instead of permanent runtime patches.

## Configuration That Actually Matters

| Setting | Recommendation | Why |
|---|---|---|
| score-cap | Start at 0.6, raise after a false heal | Too low silently clicks wrong elements |
| heal-enabled in CI | On for nightly, OFF for release gates | A healed pass is a warning, not a green light |
| Locator strategy | Keep stable IDs where you have them | Healing is a fallback, not a license for bad selectors |
| Report review | Weekly triage of the healing dashboard | Unreviewed healings become invisible tech debt |
| Baseline runs | Run the suite green once after install | No stored fingerprints means nothing to heal from |

The release-gate point deserves emphasis. A healed test proves the user flow still works AND that your locator is stale. Treat every healing as a lightweight defect against the test code. Teams that skip the review step end up with suites where half the locators in the repo are fiction and the real selectors live only in Healenium's database; at that point the tests are unmaintainable without the backend, which is a dependency you do not want on release day. Our [flaky test guide](/blog/fix-flaky-tests-guide) covers the broader discipline of keeping failure signal trustworthy.

## Honest Limits

- **First-seen elements cannot heal.** New features fail normally until the locator has one green run behind it.
- **Structural redesigns defeat similarity scoring.** If the whole page changed, the best-scoring node may be the wrong one; this is where the score-cap saves you.
- **It heals lookups, not logic.** Changed flows, renamed routes, new confirmation dialogs: out of scope. Healing addresses roughly the selector-shaped fraction of maintenance, which is large but not total.
- **Infrastructure tax.** A Postgres backend and report service now live beside your suite; small teams sometimes find the ops cost rivals the maintenance it saves.
- **Selenium-shaped.** The design targets WebDriver's find-then-act model. Playwright users get retrying locators and (in 2026) AI healing agents natively, which is one reason new projects rarely add Healenium.

## Heal or Migrate?

Healenium's sweet spot is a large, business-critical Selenium estate that cannot justify a rewrite this year: thousands of tests, Java or Python, CI that must stay green while the product evolves. For that profile it reliably converts selector churn from a daily fire into a weekly review, and practitioner reports consistently cite maintenance time dropping by a meaningful fraction (commonly quoted in the 30 to 50 percent range for locator-related work, though this is vendor and case-study data, so treat it as directional).

If instead your suite is small, or you are already unhappy with Selenium's speed and flake profile, healing is a way to make a suite you dislike last longer. The modern alternatives are self-healing platforms and agent-repaired Playwright suites (compared in our [self-healing test automation tools roundup](/blog/self-healing-test-automation-tools-2026)), where resilience comes from role-based locators and AI-native tooling rather than a fingerprint database.

A defensible 2026 policy: adopt Healenium to stabilize the estate you have, enforce healing review so locators keep converging back into code, and route all NEW test development to a framework and locator strategy that need less healing in the first place. Self-healing is a bridge. Build it toward somewhere.

## Frequently Asked Questions

### Does Healenium use AI or LLMs to heal locators?

No. Healing is a deterministic tree-comparison algorithm (LCS-based similarity over the previously recorded DOM neighborhood versus the current page). That makes it free per run, fast, and explainable, and it is also why it cannot heal elements it has never successfully located before.

### Does Healenium work with Playwright or Cypress?

No, it targets the Selenium WebDriver ecosystem (Java first, with Python, JavaScript, C# bindings and an Appium variant for mobile). Playwright's retrying role-based locators plus AI healer agents cover the equivalent ground natively, which is why Healenium adoption is concentrated in existing Selenium estates.

### Can healed locators update my source code automatically?

Healing happens at runtime by default, with every healing logged in the report dashboard. IDE and CI integrations can turn accepted healings into code changes (including PR-style suggestions), and you should use them: a suite whose real locators live only in the healing database is unmaintainable without the backend.

### What is a sensible score-cap value?

Start at 0.6 and tune with evidence. Raise it after any false heal (wrong element clicked); lower it only for pages with genuinely volatile structure. Below roughly 0.5 you are asking the algorithm to guess, and a wrong confident click is worse than a clean failure.
`,
};
