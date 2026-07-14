import type { SeoClusterArticle } from './seo-cluster-article';

export const playwrightAgentsChildren2026: SeoClusterArticle[] = [
  {
    slug: 'playwright-init-agents-guide',
    clusterId: 'playwright-agents',
    post: {
      title: 'npx playwright init-agents Setup Guide for Agentic Test Loops',
      description:
        'Set up Playwright test-agent definitions for VS Code, Claude Code, Codex, or OpenCode, verify the generated files, and diagnose setup failures.',
      date: '2026-07-06',
      updated: '2026-07-14',
      category: 'Tutorial',
      image: '/blog/pillars/playwright-agents.png',
      imageAlt:
        'Terminal setup flow generating reviewed Playwright Planner, Generator, and Healer definitions for four supported agent hosts',
      primaryKeyword: 'playwright init agents',
      keywords: [
        'playwright init agents',
        'npx playwright init-agents',
        'playwright agent setup',
        'playwright agents codex',
        'playwright agents claude code',
        'playwright agents vscode',
        'playwright agents opencode',
        'playwright agentic loop',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-test-agents-planner-generator-healer',
      relatedSlugs: [
        'playwright-test-agents-planner-generator-healer',
        'playwright-planner-agent-test-plan-guide-2026',
        'playwright-generator-agent-test-code-guide-2026',
        'playwright-healer-agent-self-healing-tests',
      ],
      sources: [
        'https://playwright.dev/docs/test-agents',
        'https://playwright.dev/docs/release-notes#version-156',
      ],
      content: `**The Playwright init agents command installs Playwright's official Planner, Generator, and Healer definitions for a supported coding-agent loop. Run \`npx playwright init-agents --loop=<client>\` from the repository root, replacing \`<client>\` with \`vscode\`, \`claude\`, \`codex\`, or \`opencode\`. Review the generated diff, provide a runnable seed test, and regenerate the definitions whenever Playwright is upgraded. The initializer adds agent instructions and MCP tools; it does not generate application coverage, approve a plan, or make test repairs safe to merge without review.**

Start with the [complete Playwright test-agents pillar](/blog/playwright-test-agents-planner-generator-healer), then follow the role guides for [Planner plans](/blog/playwright-planner-agent-test-plan-guide-2026), [Generator code](/blog/playwright-generator-agent-test-code-guide-2026), and [Healer repairs](/blog/playwright-healer-agent-self-healing-tests). The [Playwright E2E guide](/blog/playwright-e2e-complete-guide) covers the runner that executes generated tests. Reusable instructions are available in the [QA skills directory](/skills) and the author-qualified [Playwright CLI skill](/skills/Pramod/playwright-cli).

This setup guide follows the [current official Playwright test-agent page](https://playwright.dev/docs/test-agents), checked July 14, 2026, and the [official 1.56 release notes](https://playwright.dev/docs/release-notes#version-156) that introduced the three definitions. It uses Playwright 1.61 as the current documentation baseline. Team controls in this article, such as branch review and environment restrictions, are recommendations. They are not extra \`init-agents\` flags.

## What init-agents actually creates

Playwright describes its agent definitions as collections of instructions and MCP tools. The generated roles divide test creation into three jobs: Planner explores a running application and writes a Markdown plan, Generator turns a plan into Playwright Test files, and Healer investigates a named failing test. The command selects the file format and integration expected by the chosen host. The \`--loop\` value does not select just one of the three roles.

The distinction prevents several setup mistakes. \`init-agents\` is not the Playwright project initializer, not the test generator UI, and not the dedicated \`playwright-cli\` skills installer. It does not replace \`playwright.config.ts\`, install a missing application, create test accounts, or guarantee that a host grants browser and file permissions. It writes definitions that a compatible coding-agent environment can consume.

| Setup question | Documented answer | What you still own |
| --- | --- | --- |
| Which roles are added? | Planner, Generator, and Healer | Decide who may invoke and review each role |
| Which loop values are current? | \`vscode\`, \`claude\`, \`codex\`, \`opencode\` | Choose only hosts the repository supports |
| What powers a definition? | Instructions plus MCP tools | Review tool scope and host permissions |
| When should files be refreshed? | Whenever Playwright is updated | Include regeneration in the dependency upgrade review |
| What begins planning? | A clear request and a seed test, with an optional PRD | Supply safe data and a reachable test environment |
| Does initialization run the suite? | The setup page only says it adds definitions | Run normal repository checks yourself |

## Prerequisites before running the command

Run the initializer inside an existing Node.js Playwright Test project or a branch where creating that project is intentional. The test-agent documentation shows \`npx playwright\`, \`tests/\`, \`specs/\`, and \`playwright.config.ts\`; it does not document equivalent \`init-agents\` commands for Playwright's Python, Java, or .NET packages. This article therefore covers the Node.js command exactly as published.

Confirm four practical prerequisites:

1. The repository resolves the intended Playwright Test version through its package manager.
2. At least one supported host will open the same workspace where definitions are generated.
3. The application can run in a controlled environment that the seed test can reach.
4. You can review generated files before they enter a protected branch.

For VS Code, the official page adds one explicit host requirement: version 1.105 or newer is needed for the agentic experience. That is the editor version, not the Playwright package version. A current \`npx playwright --version\` cannot compensate for an older VS Code installation.

The docs do not say that every host has identical permission prompts, subagent semantics, or generated paths. Treat host behavior as a separate compatibility layer. The Playwright command can succeed while the selected host later blocks the browser, refuses file writes, or cannot reach the test URL.

## Run one supported setup path

Use the loop that matches the agent host. These are the complete values shown on the current official page:

\`\`\`bash
# Visual Studio Code agentic experience
npx playwright init-agents --loop=vscode

# Claude Code
npx playwright init-agents --loop=claude

# Codex
npx playwright init-agents --loop=codex

# OpenCode
npx playwright init-agents --loop=opencode
\`\`\`

Run one command first, then inspect its result. Do not append a role name such as \`--agent=planner\`; no such option appears in the current test-agent setup. Do not guess \`--loop=cursor\`, \`--loop=github-copilot\`, or another vendor value. If Playwright adds a client later, it should first appear in the official page or your installed command help.

The command should run from the repository whose tests and configuration the agents will use. Executing it from a parent directory can place definitions in the wrong workspace or give a host the wrong project context. The official documentation illustrates a repository with generated definitions, a \`specs/\` directory, tests, a seed, and configuration. The exact changed paths are an output to inspect, not a filename list to assume in advance.

## Use a clean, reviewable initialization sequence

A generator should be handled like a dependency migration. Capture the before state, run it once, and understand every addition. The following includes normal shell and Git review commands around the one Playwright initializer:

\`\`\`bash
npx playwright --version
npx playwright init-agents --loop=codex
git status --short
git diff -- .
npx playwright test --list
\`\`\`

Only the second line creates the test-agent definitions. \`git status\` and \`git diff\` are review aids, while \`npx playwright test --list\` checks that ordinary test discovery still works. A listed suite is not proof that browser execution succeeds, but it catches syntax, configuration, and discovery failures without launching every scenario.

Review generated content for role names, referenced tools, expected directories, and instructions that interact with your repository. If the workspace already contains agent files, do not accept an overwrite blindly. Compare the old and new semantics. A small generated diff can still add a tool or change the role's allowed workflow.

Keep the host selection explicit in repository documentation. Future maintainers should know whether the committed files serve Codex, Claude Code, VS Code, OpenCode, or several deliberately supported clients. The mere presence of an agent definition does not prove that its host is part of CI or the team's supported toolchain.

## Add a seed that proves the environment

Initialization installs definitions, but Planner needs a seed test before useful exploration. The [official Planner section](https://playwright.dev/docs/test-agents#planner) says the seed runs initialization, including global setup, project dependencies, fixtures, and hooks, and acts as an example for generated tests. A seed therefore deserves the same review as a shared fixture.

This example reaches a test environment, uses a repository fixture, and verifies readiness without performing the checkout flow that Planner will investigate:

\`\`\`ts
// tests/seed.spec.ts
import { test, expect } from '../fixtures';

test('seed a disposable guest cart', async ({ page, resetGuestCart }) => {
  await resetGuestCart();
  await page.goto('/shop');

  await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();
  await expect(page.getByText('Test environment')).toBeVisible();
});
\`\`\`

Here \`resetGuestCart\` is an illustrative project fixture, not a built-in Playwright fixture. Replace it with the repository's real setup contract. The important properties are a known state, a bounded target, and a visible readiness assertion. Do not place production credentials, session tokens, or irreversible setup actions in a seed merely because an agent can run it.

A weak seed opens a URL and assumes success. A dangerous seed logs into an administrator account and leaves broad mutation rights available. A useful seed creates the minimum state for the requested journey, proves that the browser reached the intended tenant, and leaves scenario actions to Planner.

## Verify each role without asking for autonomy

After setup, use a small, non-destructive request. A host prompt is natural language, not another terminal command. Name the role, seed, target artifact, boundary, and stopping condition:

\`\`\`text
Use the Planner agent with tests/seed.spec.ts. Explore only the guest-cart
quantity controls in the local test environment. Write a Markdown plan at
specs/cart-quantity.md with steps and expected outcomes. Do not check out,
do not access account administration, and mark any unverified assumption.
Stop after writing the plan so it can be reviewed.
\`\`\`

Success means the host invokes the generated Planner definition, runs the seed in the intended project context, observes the allowed flow, and produces a reviewable Markdown file. It does not mean that Generator should immediately write code. Review the plan first. Then invoke Generator with the approved plan, and reserve Healer for a specifically named failing test.

This staged smoke test isolates setup failures. If Planner cannot run the seed, fix environment and fixture access before evaluating plan quality. If Planner succeeds but Generator cannot read \`specs/cart-quantity.md\`, investigate path or host context. If Generator creates a failing test, review its code and evidence before asking Healer to investigate.

## Understand the artifact contract

The official page presents a simple, auditable shape: definitions, human-readable plans under \`specs/\`, generated tests under \`tests/\`, a \`seed.spec.ts\`, and \`playwright.config.ts\`. It also says generated tests should align one-to-one with specs wherever feasible. That convention creates traceability from intent to executable behavior.

\`\`\`text
repository/
  <generated host definitions>
  specs/
    cart-quantity.md
  tests/
    seed.spec.ts
    cart-quantity.spec.ts
  fixtures.ts
  playwright.config.ts
\`\`\`

The placeholder is deliberate. Use the files produced by your selected loop rather than copying a path from a different host. The \`fixtures.ts\` entry is optional project code in this example. Playwright's published tree focuses on the seed, generated tests, plans, definitions, and configuration.

Protect the relationships during review. A generated test should identify the plan and seed that informed it, as the official Generator example does with source comments. If one plan becomes several test files, document the split. If several tiny scenarios share a fixture, keep scenario intent visible rather than collapsing everything into an opaque serial workflow.

## Regenerate definitions on Playwright upgrades

The strongest lifecycle instruction on the setup page is unambiguous: regenerate definitions whenever Playwright is updated so they receive new tools and instructions. Treat package update and definition update as one change set. Do not keep an old generated definition indefinitely because it still parses.

An upgrade review can use this sequence:

\`\`\`bash
# Install the version approved by your repository policy first.
npm install --save-dev @playwright/test@1.61.0
npx playwright install

# Recreate definitions for the host this repository supports.
npx playwright init-agents --loop=claude
git diff -- .
npx playwright test --list
\`\`\`

The pinned package is an example matching this article's 1.61 baseline, not a claim that every repository must use npm or exactly that patch. Use the project's lockfile and package manager. The two Playwright commands shown are standard package-era setup and definition regeneration; the Git command remains an external review step.

The [release notes](https://playwright.dev/docs/release-notes) are the version record. Test agents arrived in 1.56, while the current page now lists Codex in addition to the original clients. That evolution is why copied setup snippets age. An old article may omit a supported loop, and a future release may alter generated instructions. Verify against the installed release and current official documentation instead of assuming definitions are stable data.

## Multi-host repositories need an ownership decision

Some teams use more than one coding agent. That does not require running all loop commands on every checkout. Decide whether generated files for multiple hosts will be committed, locally generated, or owned in separate branches. Then test each chosen path.

Use these questions during the decision:

- Do the hosts read different definition locations or formats?
- Will two initializers overwrite or duplicate shared instructions?
- Who reviews changes after a Playwright upgrade?
- Do all hosts receive the same browser, shell, and file permissions?
- Can a plan produced in one host be reviewed before another host generates code?
- Are test artifacts and credentials governed consistently across host sessions?

Playwright documents that the three roles can be used independently, sequentially, or as chained calls in an agentic loop. It does not state that every host chains them identically. Preserve explicit artifacts and human decisions even when the client offers a convenient chain. A host feature should not erase the boundary between observed plan, generated code, and accepted repair.

## Failure paths and exact next checks

Setup problems are easier to solve when command generation, host discovery, browser execution, and application readiness are kept separate.

| Symptom | Likely boundary | Next check |
| --- | --- | --- |
| \`init-agents\` is unknown | Project resolved an older or wrong Playwright executable | Print the project version and inspect installed command help |
| \`--loop\` value is rejected | Value is misspelled or unsupported by that version | Use one of the four values in current docs, then compare package version |
| Files appear outside the project | Command ran from the wrong working directory | Stop and inspect paths before rerunning in the repository root |
| VS Code definitions exist but the role does not start | Editor is older than 1.105 or agentic features are unavailable | Check the VS Code build and host configuration |
| Host sees definitions but cannot launch a test | Shell, browser, network, or workspace permission is blocked | Run the seed normally and inspect host approvals separately |
| Planner opens the wrong tenant | Seed, base URL, account, or environment is wrong | Correct and assert environment identity in the seed |
| Generator cannot find the plan | Prompt or workspace points to a different \`specs/\` path | Name the reviewed file explicitly and verify host root |
| Regeneration changes unexpected tools | Definitions evolved with the package | Review the semantic diff; do not auto-accept generated output |

Do not solve an unknown command by inventing an npm package named after the role. The current setup is part of the \`npx playwright\` command family. Do not solve a blocked browser by granting unrestricted machine access. First identify whether the missing capability is read access, file writes, browser launch, network reachability, or a test account.

If normal \`npx playwright test tests/seed.spec.ts\` fails, agent setup is not the first problem. Fix configuration, fixtures, application readiness, or browser installation in the ordinary runner. Agents depend on that foundation; they do not bypass it.

## Security and review boundaries

The docs explain role inputs and outputs, not your organization's authorization policy. Apply least privilege to the host account, test user, target environment, and repository token. Plans, screenshots, traces, generated tests, and prompts can retain sensitive application information. Use synthetic data and short-lived credentials where possible.

Keep three approval points:

1. Approve the Markdown plan before code generation.
2. Review generated tests before running broad or destructive scenarios.
3. Review every Healer patch or skip before accepting the suite result.

These are governance recommendations, not Playwright requirements. They exist because the official outputs remain artifacts that can be wrong. Planner can misunderstand business intent, Generator can encode an incomplete assertion, and Healer can skip a test when it believes the functionality is broken. A green or skipped output is not authorization to merge.

Never describe \`init-agents\` as enabling autonomous QA. The command installs role definitions. The host, environment, prompt, seed, tool permissions, reviewer, and normal CI determine what happens next. A setup that makes those dependencies visible is more useful than one that hides them behind an unrestricted chain.

## Version scope and limitations

This guide reflects the official Node.js documentation visible on July 14, 2026, with Playwright 1.61 current. Test agents were introduced in 1.56. The setup page names four loop values and requires VS Code 1.105 or newer for that host. It does not promise support for arbitrary editors, Python/Java/.NET initializer parity, identical file paths across clients, unattended pull requests, or automatic acceptance of repairs.

Definitions are versioned generated material. Regenerate after an update and use the installed command's help when a pinned repository differs from current online docs. Canary behavior can move ahead of stable documentation; do not base a production workflow on an undocumented option merely because it appeared in a preview or third-party screenshot.

The initializer is also not a migration engine for existing custom agents. If a repository already has Planner-like instructions, compare responsibilities and tool access rather than merging two systems by name. Prefer one clear source of role behavior per host.

## Setup acceptance checklist

Before calling initialization complete, verify the following:

- The resolved Playwright version is the repository's intended version.
- Exactly the supported host definitions you need were generated.
- Every generated file was reviewed in a clean diff.
- VS Code is at least 1.105 when \`--loop=vscode\` is used.
- \`tests/seed.spec.ts\` reaches and identifies a safe test environment.
- Planner can produce one bounded Markdown plan under \`specs/\`.
- The plan stops for human review before Generator runs.
- Generator output remains ordinary Playwright Test code under \`tests/\`.
- Healer is invoked with a named failure, not permission to rewrite the suite.
- Regeneration is part of the Playwright dependency update procedure.

This checklist tests the seams where most failures occur. It does not certify plan coverage or test correctness; those are the subjects of the role-specific guides.

## Frequently Asked Questions

### What is the exact Playwright init agents command?

Use \`npx playwright init-agents --loop=<client>\`, replacing \`<client>\` with \`vscode\`, \`claude\`, \`codex\`, or \`opencode\`. Run it from the target repository and inspect the generated diff.

### Does init-agents install only Planner or all three roles?

The setup adds the official Planner, Generator, and Healer definitions for the selected loop. The loop value chooses the host integration, not one role.

### Can I use a Cursor loop value?

Cursor is not among the four values on the current official test-agent page. Do not invent a value. Check current Playwright documentation and your installed command help if support changes later.

### Is VS Code supported on every version?

No. The official page says VS Code 1.105, released October 9, 2025, or newer is needed for the agentic experience to function properly.

### Must I regenerate definitions after upgrading Playwright?

Yes. Playwright explicitly instructs users to regenerate whenever Playwright is updated so definitions pick up new tools and instructions. Review the resulting changes before committing them.

### Does initialization create a seed test automatically?

Do not rely on that assumption. The documented artifact model requires a seed test for Planner and explains what it does. Verify the generated files, then create or adapt a reviewed \`seed.spec.ts\` if the repository does not already have one.

### Can the three agents run independently?

Yes. Playwright says they can be used independently, sequentially, or as chained calls. Independent availability does not remove input requirements: Planner needs a request and seed, Generator needs a Markdown plan, and Healer needs a failing test name.

### Does init-agents make the suite self-healing?

No. It installs a Healer definition. The documented Healer can suggest a patch and rerun a failure, but its output can also be a skipped test. Review the diagnosis and change before treating the result as valid.

### Why does the command work while the agent still fails?

Generation and execution are different boundaries. The host may lack workspace trust, terminal approval, browser launch rights, network access, or the correct environment. Run the seed with the normal test runner and diagnose host permissions separately.

## Continue through the three-role workflow

Once definitions and seed are verified, design intent with the [Planner agent guide](/blog/playwright-planner-agent-test-plan-guide-2026), translate the approved artifact with the [Generator guide](/blog/playwright-generator-agent-test-code-guide-2026), and repair only evidence-backed failures with the [Healer guide](/blog/playwright-healer-agent-self-healing-tests). Return to the [test-agents pillar](/blog/playwright-test-agents-planner-generator-healer) for the complete lifecycle and ownership model.

The authoritative setup syntax and role contracts remain the official [Playwright Test Agents documentation](https://playwright.dev/docs/test-agents) and [Playwright release notes](https://playwright.dev/docs/release-notes#version-156). For ordinary runner behavior, use the [Playwright E2E testing guide](/blog/playwright-e2e-complete-guide); for reusable agent-side browser instructions, browse [QA skills](/skills) and the [Playwright CLI skill](/skills/Pramod/playwright-cli).`,
    },
  },
  {
    slug: 'playwright-planner-agent-test-plan-guide-2026',
    clusterId: 'playwright-agents',
    post: {
      title: 'Playwright Planner Agent Guide for High-Coverage Markdown Test Plans',
      description:
        'Use the Playwright Planner agent to explore bounded user flows, design risk-based scenarios, and produce precise Markdown plans ready for human review.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/playwright-agents.png',
      imageAlt:
        'Playwright Planner agent mapping a seeded application journey into reviewed high-coverage Markdown scenarios and expected outcomes',
      primaryKeyword: 'playwright planner agent',
      keywords: [
        'playwright planner agent',
        'playwright test plan generator',
        'playwright markdown test plan',
        'playwright seed test',
        'agentic test planning',
        'playwright test coverage',
        'playwright planner prompt',
        'ai test planning playwright',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-test-agents-planner-generator-healer',
      relatedSlugs: [
        'playwright-test-agents-planner-generator-healer',
        'playwright-init-agents-guide',
        'playwright-generator-agent-test-code-guide-2026',
        'playwright-healer-agent-self-healing-tests',
      ],
      sources: [
        'https://playwright.dev/docs/test-agents#planner',
        'https://playwright.dev/docs/test-agents#artifacts-and-conventions',
        'https://playwright.dev/docs/release-notes#version-156',
      ],
      content: `**The Playwright Planner agent explores a running application from a seed test and writes a human-readable Markdown test plan under \`specs/\`. Give it a clear, bounded request, a runnable seed, and optional product requirements; then review the plan before Generator writes code. High coverage comes from explicit risks, user states, branches, data boundaries, and expected outcomes, not from asking Planner to "test everything." Planner can observe the environment it receives, but it cannot prove requirement correctness, exhaustive coverage, safe production access, or that an unobserved state behaves as assumed.**

Place this workflow inside the [Planner, Generator, and Healer pillar](/blog/playwright-test-agents-planner-generator-healer). If definitions are missing, complete the [init-agents setup](/blog/playwright-init-agents-guide); after plan approval, use the [Generator agent guide](/blog/playwright-generator-agent-test-code-guide-2026), and route genuine failures to the [Healer agent guide](/blog/playwright-healer-agent-self-healing-tests). The canonical [test-planning strategy guide](/blog/test-planning-strategy-guide) supplies broader planning context. Browse the [QA skills directory](/skills) and [Playwright CLI skill](/skills/Pramod/playwright-cli) for reusable testing instructions.

The role contract comes from Playwright's current [official Planner documentation](https://playwright.dev/docs/test-agents#planner). Planner's documented inputs are a clear request, a seed test, and an optional PRD. It runs the seed to execute global setup, project dependencies, fixtures, and hooks, and it uses that seed as an example for generated tests. Its output is a precise Markdown plan, illustrated as \`specs/basic-operations.md\`. The risk model and review gates below are recommended planning practice, not undocumented agent features.

## Define the planning job before opening a browser

Planner works best when the request establishes a decision boundary. "Plan checkout" leaves the account state, market, payment mode, inventory, data ownership, and stopping point unspecified. "Plan guest checkout for one in-stock item in the local test environment, using the fake payment option and stopping after confirmation" gives exploration a controlled shape.

Write a one-paragraph charter with six fields:

1. **Target:** the application URL, tenant, and feature area.
2. **Actor:** guest, member, administrator, or another named role.
3. **Starting state:** data and authentication created by the seed.
4. **In scope:** journeys and branches Planner may inspect.
5. **Out of scope:** destructive, privileged, external, or unrelated areas.
6. **Deliverable:** exact \`specs/\` path plus assumptions to report.

These fields do not force a particular selector or implementation. They tell Planner what evidence it may collect and give reviewers a way to recognize scope drift. A bounded charter is also a security control: an agent should not discover whether account deletion works by trying it against a shared account.

## Build a coverage model from risk, not page count

High coverage does not mean clicking every visible control. It means representing materially different outcomes that matter to the product. A useful plan separates state, action, branch, and evidence.

| Coverage dimension | Question for Planner | Example checkout scenario | Common planning defect |
| --- | --- | --- | --- |
| User state | Who can perform the action? | Guest with an empty cart | Role remains implicit |
| Data state | Which data changes the outcome? | In-stock item versus unavailable item | Only happy-path fixture is named |
| Decision branch | Where can behavior diverge? | Accepted versus rejected coupon | Many inputs repeat one outcome |
| Boundary | Which threshold is meaningful? | Quantity changes from maximum allowed to rejected | Arbitrary values replace business limits |
| Recovery | How does the user correct an error? | Invalid address is edited and resubmitted | Plan checks error but not recovery |
| Persistence | What should survive navigation? | Cart remains after returning from delivery step | Session behavior is assumed |
| Observable result | What proves success or refusal? | Confirmation heading and stable order reference appear | "Checkout works" is not measurable |
| Cleanup | What state must be removed? | Disposable order and cart are reset | Parallel reruns collide |

Use the table as a review lens, not a demand for eight scenarios per feature. One scenario may cover several dimensions. Conversely, two inputs that produce the same validated behavior may not deserve separate end-to-end cases when a lower-level test can cover the data matrix more cheaply.

Before Planner explores, identify the consequences that justify browser coverage: money movement, permission changes, irreversible publication, cross-tenant access, accessibility-critical controls, legal consent, or workflows whose integration is difficult to prove below the UI. Then ask for representative success, refusal, and recovery paths.

## Engineer the seed as a planning fixture

The seed is Planner's executable starting contract. Because the official docs say Planner runs its initialization and uses it as an example, the seed influences both what the agent can observe and the style Generator may later copy. Keep it narrow, deterministic, and visibly tied to the intended environment.

This seed provisions a synthetic cart through a project fixture and verifies the tenant and actor before planning begins:

\`\`\`ts
// tests/seed.spec.ts
import { test, expect } from '../fixtures';

test('seed guest checkout planning state', async ({ page, createGuestCart }) => {
  const cart = await createGuestCart({ sku: 'TEST-SHOE-42', quantity: 1 });

  await page.goto('/checkout?cart=' + cart.id);
  await expect(page.getByRole('heading', { name: 'Guest checkout' })).toBeVisible();
  await expect(page.getByText('QA Sandbox')).toBeVisible();
  await expect(page.getByText('TEST-SHOE-42')).toBeVisible();
});
\`\`\`

\`createGuestCart\` is an illustrative repository fixture, not built into Playwright. A real project should import its approved fixture layer. The seed deliberately stops before entering an address or placing an order; those actions belong to the flow being planned.

Review the seed against these questions:

- Does it create unique data when tests may run concurrently?
- Does it prove the expected tenant, locale, role, and feature state?
- Does it avoid plaintext secrets and production endpoints?
- Is cleanup owned by a fixture, teardown, or disposable environment?
- Does it expose repository conventions that Generator should preserve?
- Can it run by itself with the normal Playwright Test runner?

If the seed fails, stop planning. Planner cannot turn an unavailable service or broken fixture into trustworthy coverage. A browser that happens to show a login screen is not equivalent to the intended authenticated state.

## Write a Planner request that exposes assumptions

The following is a prompt for the coding-agent host, not a Playwright command:

\`\`\`text
Use the Playwright Planner agent with tests/seed.spec.ts. Explore guest checkout
for the synthetic item already in the cart. Plan the successful fake-payment flow,
required-field validation, a rejected postal code, recovery after correction, and
cart persistence when navigating back from delivery.

Use only the QA Sandbox tenant and the fake payment method. Create at most one
disposable order. Do not open account administration, contact a real payment
provider, or infer behavior that cannot be observed. Save the plan to
specs/guest-checkout.md. For every scenario, record the seed, preconditions,
test data, numbered steps, expected results, cleanup, and any unverified assumption.
Stop after writing the Markdown file for review.
\`\`\`

The request names outcomes without prescribing locators. It permits one final submission but blocks real payment and unrelated administration. It also asks Planner to distinguish observation from inference. That distinction improves the artifact: "postal code X displayed an unsupported-region message" is evidence; "all unsupported regions behave the same" is an assumption unless tested or supplied by a requirement.

Avoid prompts that reward volume, such as "generate 100 cases." They encourage superficial permutations. Ask instead for a scenario set that covers specified risks and explain what can be delegated to API, component, or unit tests. Planner's role is to produce a plan, not to maximize a count.

## Shape the Markdown as an executable contract

The [artifact conventions](https://playwright.dev/docs/test-agents#specs-in-specs) describe specs as structured, human-readable plans containing scenarios, steps, expected outcomes, and data. A publication-ready internal template should preserve those documented elements and add ownership details needed by the team.

\`\`\`md
# Guest checkout test plan

## Scope
Guest checkout in QA Sandbox for one synthetic in-stock item and fake payment.

## Assumptions requiring review
- The rejected postal code supplied below is stable test data.
- Order confirmation may create one disposable order.

## Scenario 1: Correct an unsupported postal code
**Seed:** tests/seed.spec.ts
**Preconditions:** Cart contains TEST-SHOE-42; shopper is a guest.
**Data:** Rejected postal code 00000; accepted postal code 10001.

### Steps
1. Enter the otherwise valid delivery address with postal code 00000.
2. Continue to delivery.
3. Replace 00000 with 10001 after the refusal appears.
4. Continue again.

### Expected results
- The first submission stays on the address step.
- An error identifies the postal-code field and explains the region is unsupported.
- Previously valid address fields keep their values.
- After correction, the error clears and the delivery step becomes visible.

### Cleanup
The cart fixture deletes its synthetic cart after the test.
\`\`\`

This example gives Generator observable outcomes. It avoids implementation-specific selectors and does not assert an exact error sentence unless exact copy is a requirement. It also says which valid values must persist, preventing a test that only checks for any red message.

Plans should use stable scenario identifiers or descriptive headings. One-to-one alignment with generated tests is preferred where feasible according to the official page. A reviewer should be able to map a test title back to a scenario without searching model logs.

## Separate observations, requirements, and recommendations

Planner may receive both a PRD and a running app. Those sources can disagree. A plan should not silently combine them. Record each important statement as one of three classes:

- **Observed:** Planner performed the action and saw the result in the seeded environment.
- **Required:** approved product material says the result must occur.
- **Assumed:** the result was not verified and needs a decision or safer data.

If the PRD says a guest cart expires after thirty days but the planning session cannot wait thirty days, that is a requirement, not an observed browser result. The plan can propose a time-controlled test or lower-level coverage; it should not claim the expiration was explored live.

Similarly, a visible success message does not prove a backend side effect unless the plan has an approved observable for it. A scenario can assert the confirmation UI and, if the repository provides a safe API fixture, verify server state in generated code. Planner should name the required evidence rather than invent how a nonexistent fixture works.

## Design expected results that can fail meaningfully

"The page works" and "the user is successful" do not tell Generator what to assert. Strong expected results name the user-visible state, state transition, persisted value, or denied effect.

For each action, ask:

1. What becomes visible, enabled, selected, focused, or navigable?
2. What must remain unchanged?
3. What data is created, updated, or rejected?
4. What proves the user reached the next state?
5. What evidence distinguishes the expected branch from a nearby false positive?

An order scenario should not pass merely because any "Thank you" text exists. It may need a confirmation heading, an order reference, a summary containing the purchased item, and evidence that duplicate submission is unavailable. The exact combination depends on product risk and approved requirements.

Do not overfit to transient presentation. If color or pixel position is not the contract, keep it out of the plan. If accessibility semantics are part of acceptance, say which role, name, focus movement, or announcement is expected. The plan should describe behavior at the level the test is meant to protect.

## Reduce combinatorial plans deliberately

A form with five fields and ten invalid values can produce thousands of combinations. Browser coverage should select interactions whose integrated outcome differs. Use pairwise or boundary reasoning as a team method, but do not present it as a hidden Planner algorithm.

A practical reduction sequence is:

1. List business rules and distinct outcomes.
2. Identify one representative input for each outcome.
3. Add boundaries where behavior changes.
4. Cover one recovery path for consequential errors.
5. Move pure validation permutations to a lower layer.
6. Retain end-to-end combinations only when integration creates unique risk.

For example, empty first name and empty city may share the same required-field mechanism. The plan can test the form-level summary plus one field association in the browser while component tests cover every label. A rejected shipping region has a different business outcome and deserves its own end-to-end scenario.

High coverage is defensible selection, not raw scenario quantity. Record what is intentionally omitted and where it should be tested.

## Review the plan before generation

Planner's Markdown output is a proposed artifact. Review it with product, QA, and engineering perspectives before Generator consumes it.

Use this acceptance rubric:

- Every scenario names its seed and preconditions.
- Data is synthetic, specific, and safe to create or mutate.
- Steps describe user behavior in a reproducible order.
- Expected results are observable and map to approved intent.
- Material success, refusal, boundary, and recovery paths are represented.
- Duplicate scenarios do not differ only by cosmetic input values.
- Assumptions and unverified branches are visible.
- Cleanup and parallel-isolation needs are identified.
- Privileged or irreversible actions have explicit controls.
- Scenario headings can become clear test titles.

Reject or edit a plan that wanders outside scope, treats observations as requirements, or names selectors copied from a temporary DOM. Planner explores the app to understand flows; Generator is the role that verifies selectors and assertions live while implementing the approved plan.

## Failure paths during planning

| Planning symptom | What it usually means | Correct response |
| --- | --- | --- |
| Seed ends on a login page | Auth state, dependency, or base URL did not initialize | Fix the seed and rerun it normally before planning |
| Planner cannot reach a branch | Data, role, flag, or environment lacks the state | Supply safe setup or mark the branch unverified |
| Plan contains invented expected results | Prompt or source material left behavior ambiguous | Separate requirement, observation, and assumption |
| Dozens of nearly identical cases appear | Request rewarded quantity instead of distinct risk | Collapse by outcome and move permutations down the pyramid |
| Plan submits destructive actions repeatedly | Scope lacks a mutation budget or disposable resource | Stop exploration and redesign test data boundaries |
| Steps depend on current element IDs | Artifact captured implementation rather than behavior | Rewrite in user and outcome language |
| No cleanup is described | State ownership was omitted | Add fixture or teardown responsibility before generation |
| PRD and app disagree | Requirement or implementation may be wrong | Record the discrepancy and obtain a product decision |

When Planner cannot verify a state safely, a truthful gap is the correct output. Do not ask it to fill missing evidence with likely behavior. A reviewer can provide a fixture, approve a mock, change the environment, or decide that another test layer is appropriate.

## Hand off a stable plan to Generator

After approval, freeze the relevant plan revision in the same change set as generated tests. Tell Generator the exact \`specs/\` file, and preserve the seed reference. The official Generator example comments both source paths in the test file, which makes future review and healing easier.

If reviewers modify the plan after code generation, decide whether to regenerate or manually update the tests. Do not let intent and implementation drift silently. A material requirement change should alter both artifacts or explicitly retire the obsolete scenario.

A concise handoff prompt can say:

\`\`\`text
Use the Generator agent to implement the approved plan at
specs/guest-checkout.md. Preserve the fixtures and import style demonstrated by
tests/seed.spec.ts. Generate tests under tests/checkout/. Do not add scenarios
that are absent from the plan. Report any step or expected result that cannot be
verified live, and stop for code review after writing the tests.
\`\`\`

This request does not guarantee maintainable output; it constrains the task and surfaces gaps. The next guide supplies the code-review standard.

## Version scope and practical limitations

Playwright introduced Planner with the other test agents in version 1.56. This guide follows the stable 1.61-era documentation available July 14, 2026. Regenerate definitions after Playwright updates because the official setup page says new tools and instructions are delivered that way.

The documented Planner contract is intentionally narrow. It does not claim exhaustive state-space coverage, production-safe exploration, formal requirements validation, automatic prioritization, or guaranteed one-to-one generated output. It observes the application state reachable from the seed and writes a plan. Coverage quality still depends on the request, data, environment, source requirements, and review.

The current page documents the Node.js agent setup. Do not assume an identical initializer or artifact contract for other Playwright language bindings without their official documentation. Host-specific orchestration may differ even when all clients expose a Planner role.

## Frequently Asked Questions

### What input does the Playwright Planner agent require?

The official docs list a clear request and a seed test. A PRD is optional. The seed establishes the environment and demonstrates fixtures, hooks, dependencies, and repository conventions.

### Where does Planner save the test plan?

Playwright illustrates a Markdown output such as \`specs/basic-operations.md\`. Name the desired file in the request and review that artifact before generation.

### Does Planner write Playwright test code?

Planner's documented output is a Markdown plan. Generator is the separate role that transforms the plan into Playwright Test files.

### Can Planner guarantee complete test coverage?

No. It can explore reachable flows and propose scenarios, but completeness depends on requirements, state, data, permissions, risks, and review. Ask for explicit dimensions and record omissions.

### Why is the seed test so important?

Planner runs it to execute initialization and uses it as an example for later generated tests. A wrong tenant, broad account, or flaky setup corrupts both observation and downstream style.

### Should Planner explore production?

The official docs do not instruct teams to use production. Prefer a controlled test environment with synthetic, disposable data. If production observation is ever considered, organizational authorization and strict read-only controls are separate requirements.

### How many scenarios should a plan contain?

There is no official target count. Include scenarios that represent materially different risks and outcomes. Remove cosmetic permutations and allocate them to lower test layers when appropriate.

### What should I do when Planner cannot verify a branch?

Keep the limitation visible. Add safe data or a fixture, obtain approved requirements, move the check to another layer, or leave the scenario marked unverified. Do not manufacture an expected result.

### Can I send the plan directly to Generator?

Technically the roles can run sequentially, but a review gate is the safer team policy. Confirm scope, data, expected outcomes, assumptions, and cleanup before converting the plan into code.

## From reviewed intent to executable coverage

Use the [Generator agent guide](/blog/playwright-generator-agent-test-code-guide-2026) to preserve the plan's intent in maintainable code and the [Healer guide](/blog/playwright-healer-agent-self-healing-tests) when a named test later fails. The [init-agents tutorial](/blog/playwright-init-agents-guide) covers definition lifecycle, while the [complete agent pillar](/blog/playwright-test-agents-planner-generator-healer) explains ownership across all three roles.

The role behavior and artifact shape are defined by the official [Playwright Planner page](https://playwright.dev/docs/test-agents#planner) and [test-agent conventions](https://playwright.dev/docs/test-agents#artifacts-and-conventions). For broader human planning techniques, continue with the [test-planning strategy guide](/blog/test-planning-strategy-guide). The [QA skills catalog](/skills) and [Playwright CLI skill](/skills/Pramod/playwright-cli) provide reusable context without changing Planner's documented limits.`,
    },
  },
  {
    slug: 'playwright-generator-agent-test-code-guide-2026',
    clusterId: 'playwright-agents',
    post: {
      title: 'Playwright Generator Agent Guide for Maintainable Test Code',
      description:
        'Turn reviewed Markdown plans into maintainable Playwright tests with the Generator agent, live verification, fixture reuse, and disciplined code review.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/playwright-agents.png',
      imageAlt:
        'Playwright Generator agent converting an approved Markdown scenario into fixture-aware tests with reviewed locators and assertions',
      primaryKeyword: 'playwright generator agent',
      keywords: [
        'playwright generator agent',
        'playwright ai test generation',
        'playwright generate tests from plan',
        'playwright agent test code',
        'maintainable playwright tests',
        'playwright generator prompt',
        'playwright specs to tests',
        'agentic test generation',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-test-agents-planner-generator-healer',
      relatedSlugs: [
        'playwright-test-agents-planner-generator-healer',
        'playwright-init-agents-guide',
        'playwright-planner-agent-test-plan-guide-2026',
        'playwright-healer-agent-self-healing-tests',
      ],
      sources: [
        'https://playwright.dev/docs/test-agents#generator',
        'https://playwright.dev/docs/test-agents#tests-in-tests',
        'https://playwright.dev/docs/release-notes#version-156',
      ],
      content: `**The Playwright Generator agent converts a reviewed Markdown plan from specs/ into executable Playwright Test files under tests/. It performs the scenarios against the live application while verifying selectors and assertions, then writes ordinary test code for your repository. Give Generator one approved plan, the seed and fixture conventions it must preserve, and a bounded output path. Review and run every generated test: live verification confirms an observed path worked during generation, but it does not prove the requirement is correct, the test is isolated, all projects pass, or the code is safe to merge.**

Use Generator within the [complete Playwright test-agents workflow](/blog/playwright-test-agents-planner-generator-healer). Install current definitions through the [init-agents guide](/blog/playwright-init-agents-guide), create the input artifact with the [Planner guide](/blog/playwright-planner-agent-test-plan-guide-2026), and investigate later failures through the [Healer guide](/blog/playwright-healer-agent-self-healing-tests). The canonical [Playwright best-practices guide](/blog/playwright-best-practices-2026) covers maintainability beyond agent generation. The [QA skills catalog](/skills) and [Playwright CLI skill](/skills/Pramod/playwright-cli) provide reusable repository context.

Playwright's [official Generator documentation](https://playwright.dev/docs/test-agents#generator) defines the narrow contract: a Markdown plan from \`specs/\` is the input; Generator performs scenarios and checks selectors and assertions live; the output is a suite under \`tests/\`; generated tests can contain initial errors. The code-quality gates in this guide are team recommendations layered around that contract, not claims that Generator performs an independent design review.

## Establish a generation contract

Do not begin with "generate tests for checkout." By generation time, the design work should already exist in an approved plan. The request should identify the exact plan, seed, fixture import, output area, and stopping condition. That prevents Generator from silently changing scope while it translates intent into code.

A generation contract has five artifacts or decisions:

1. **Approved plan:** a reviewed file such as \`specs/guest-checkout.md\`.
2. **Seed example:** the runnable test that demonstrates initialization and project style.
3. **Fixture boundary:** the import that owns data, authentication, and cleanup.
4. **Output mapping:** one test file per scenario where feasible, or a documented alternative.
5. **Review gate:** generated files stop for inspection before broad execution or merge.

The official artifact convention prefers generated tests aligned one-to-one with specs wherever feasible. "Where feasible" allows a team to split a long scenario group or share fixtures. It does not justify hiding five independent cases in one serial test merely because that was easier to write.

## Reject an unready plan before code exists

Generator can implement ambiguity very efficiently. Run a readiness check before invoking it.

| Plan property | Ready for Generator | Send back to planning |
| --- | --- | --- |
| Scope | One bounded feature journey with explicit exclusions | "Cover the whole application" |
| Seed | Named, runnable, and reaches the required state | Missing, flaky, or lands on a different role |
| Data | Concrete synthetic values and cleanup owner | "Use any account" or production records |
| Steps | Ordered user actions with a clear stop | Implementation guesses or omitted transitions |
| Results | Observable outcomes for each meaningful branch | "Works correctly" or "should succeed" |
| Assumptions | Marked and approved or resolved | Hidden conflicts between PRD and observed UI |
| Structure | Scenario headings can map to test titles | Duplicate permutations without distinct risk |
| Safety | Mutation budget and forbidden areas are stated | Unbounded payment, publishing, or deletion |

If an expected result cannot be asserted without inventing a backend fixture or privileged endpoint, revise the plan. Generator should report an implementation gap, not fabricate infrastructure. A plan can intentionally require only a user-visible outcome when that is the contract.

## Give Generator a precise host prompt

The following is natural language for the agent host. It is not a \`npx playwright\` subcommand:

\`\`\`text
Use the Playwright Generator agent to implement only the approved scenarios in
specs/guest-checkout.md. Use tests/seed.spec.ts as the initialization and style
example. Import test and expect from the fixture module demonstrated by that seed,
preserving its cart cleanup.

Write one file per scenario under tests/checkout/ where feasible. Keep the plan
and seed source comments in each file. Verify locators and assertions against the
QA Sandbox while performing the scenarios. Do not introduce new product flows,
real payment data, fixed sleeps, or production URLs. If a planned outcome cannot
be verified, report the gap instead of weakening the assertion. Stop after writing
the files and running the focused generated tests so the diff can be reviewed.
\`\`\`

The prompt gives Generator freedom to discover current selectors while preserving intent and repository boundaries. It does not tell the agent that a passing local run authorizes a merge. The phrase "where feasible" mirrors the documented artifact convention rather than forcing an unnatural file split.

Avoid asking Generator to "fix whatever fails" in the same request. Generation and healing are different review stages. First inspect whether the code accurately represents the plan. If a specific generated test still fails after that review, provide its name to Healer or repair it manually with evidence.

## Preserve source traceability in each test

The official generated example begins with comments naming its source spec and seed. Keep that relationship. It lets a reviewer compare code with intent and later decide whether a failure comes from the product, plan, or implementation.

Here is a small approved input:

\`\`\`md
## Scenario: Correct an unsupported postal code
**Seed:** tests/seed.spec.ts

1. Enter a valid address with postal code 00000 and continue.
2. Confirm the address step remains visible and the postal-code error appears.
3. Replace the code with 10001 and continue.
4. Confirm the delivery step appears and the error is gone.
\`\`\`

A maintainable translation can look like this:

\`\`\`ts
// spec: specs/guest-checkout.md
// seed: tests/seed.spec.ts
import { test, expect } from '../../fixtures';

test('guest corrects an unsupported postal code', async ({
  page,
  guestCheckout,
}) => {
  await guestCheckout.openSeededCart();

  const postalCode = page.getByRole('textbox', { name: 'Postal code' });
  await postalCode.fill('00000');
  await page.getByRole('button', { name: 'Continue to delivery' }).click();

  await expect(page.getByRole('heading', { name: 'Delivery address' })).toBeVisible();
  await expect(page.getByText('We do not deliver to this postal code')).toBeVisible();

  await postalCode.fill('10001');
  await page.getByRole('button', { name: 'Continue to delivery' }).click();

  await expect(page.getByRole('heading', { name: 'Delivery options' })).toBeVisible();
  await expect(page.getByText('We do not deliver to this postal code')).toBeHidden();
});
\`\`\`

\`guestCheckout\` is an illustrative project fixture. The test imports the repository's fixture layer, uses user-facing locators, asserts the refusal before recovery, and checks that the final state differs from the original one. Replace exact copy with the real approved contract; do not copy this fictional application text into another product.

The generated code should not reproduce every Markdown sentence as comments. Preserve source pointers and comments that clarify business intent, but let expressive test titles, fixture names, locators, and assertions carry most of the meaning.

## Evaluate live verification correctly

The official page says Generator verifies selectors and assertions live as it performs scenarios. That is useful evidence: the role is not merely guessing a selector from source text. It can interact with the rendered UI and confirm that its chosen assertions match the observed scenario.

Live verification still has a limited scope. It establishes that:

- The tested environment was reachable during generation.
- The selected locator resolved in that observed state.
- The performed action sequence reached the asserted outcome at least in that run.
- The generated syntax was executable enough for the role's attempt.

It does not establish that:

- The plan reflects the correct product requirement.
- The locator remains appropriate across locale, browser, viewport, or role variants.
- Data setup and cleanup are safe under parallel workers.
- Every configured Playwright project passes.
- The assertion is strong enough to reject a nearby incorrect outcome.
- A passing test is independent of state left by the generation session.

Call the result "live-verified during generation," not "self-validating." Normal review and test execution remain necessary.

## Preserve the repository fixture model

Because Planner uses the seed as an example, Generator should already see the expected import and setup style. Reinforce it in the prompt. A generated test that bypasses shared fixtures can create duplicate login code, leaked records, and inconsistent cleanup.

Check that generated code:

- Imports \`test\` and \`expect\` from the repository's intended module.
- Uses approved fixtures for authentication and data creation.
- Does not hard-code a base URL already owned by configuration.
- Does not read secrets into logs or source comments.
- Creates unique mutable records when workers can overlap.
- Leaves cleanup with a fixture or an explicit, reliable teardown path.
- Avoids dependence on test execution order.

Do not reject every helper extraction. A small flow fixture or page object can be appropriate when the repository already uses that pattern. Reject abstractions that hide assertions, combine unrelated journeys, or make a reader open five files to understand one scenario. The [page-object model guide](/blog/page-object-model-complete-guide) explains the broader trade-off.

## Review locators as product contracts

The official Generator example uses role-based locators, and Generator verifies its choices live. During review, ask why each locator identifies the intended user-facing element.

Prefer a locator that expresses semantics and uniqueness. A button's role and accessible name often explain intent better than a generated CSS chain. A dedicated test ID may be appropriate when a stable semantic handle does not exist. Raw DOM position, transient class names, and copied element IDs usually bind the test to implementation details without improving behavior coverage.

A live-resolving locator can still be wrong. Two "Continue" buttons may exist in different regions. A broad text match can resolve to hidden or unrelated content. Scope locators to meaningful regions or records when the page contains repeated controls. Then assert the state transition caused by the action, not only that clicking did not throw.

Do not "improve reliability" with forced clicks or arbitrary sleeps unless the product contract genuinely requires a timing interval and the evidence supports it. A generated wait can hide a missing readiness assertion. Prefer a web-facing condition that proves the next state is available.

## Review assertions for false-green behavior

Generator can verify an assertion live and still choose a weak assertion. Compare every expected result in the plan with at least one code assertion. Then test whether the assertion would fail for a plausible incorrect product state.

Weak examples include:

- Checking that the page URL contains \`/checkout\` when every checkout step shares that path.
- Looking for generic text such as "Success" that already exists in a banner.
- Asserting only that an error is visible without checking which field or outcome failed.
- Confirming a row exists without restricting it to the synthetic record.
- Treating the absence of an exception as proof of a backend side effect.

Stronger assertions distinguish branches. A rejected postal code keeps the user on the address step, identifies the field, and prevents delivery options from appearing. A successful correction removes the refusal and presents the delivery state. Assert enough to separate these outcomes without encoding incidental layout.

Review negative space carefully. \`not.toBeVisible()\` and \`toBeHidden()\` are meaningful only when the locator identifies the expected element. A typo that matches nothing can make a negative assertion pass. Pair important absence checks with a preceding positive observation or a stable locator contract.

## Keep scenarios isolated and debuggable

One plan scenario should usually become one independently runnable test. Isolation improves parallel execution, retries, failure ownership, and Healer input. A mega-test that creates a cart, checks validation, completes checkout, edits an order, and cancels it can fail late and obscure which approved behavior regressed.

Use \`test.describe\` to organize related scenarios, not to create hidden order dependencies. Shared setup belongs in fixtures or hooks when it is safe and clear. Each test should be able to run alone from its seed contract.

Name tests with actor, action, and outcome. "Checkout test 2" gives Healer and reviewers little context. "Guest corrects an unsupported postal code" maps directly to the plan and creates a precise failing test name, which is the documented input Healer expects.

If a scenario has several business phases that deserve separate trace steps, keep those phases visible in code. Do not add abstraction solely to reduce line count. Maintenance cost is driven by hidden coupling and unclear intent more than by a few repeated readable actions.

## Run focused verification from a clean state

After reviewing the diff, execute ordinary Playwright Test commands rather than relying on the agent's generation session:

\`\`\`bash
npx playwright test --list
npx playwright test tests/checkout/unsupported-postal-code.spec.ts
npx playwright test tests/checkout/unsupported-postal-code.spec.ts --project=chromium
\`\`\`

The first command checks discovery. The second runs the generated file through configured projects; the third is a focused project diagnosis, not a substitute for the full configured set. Use the repository's package scripts if they wrap environment setup, reporters, or service startup.

Start from a clean data state. If the test passes only after Generator has manually navigated the app, the code is not self-contained. Restart the application or recreate the fixture state as the team normally does, then rerun. Execute relevant neighboring tests to detect fixture interference before broad CI.

Compilation, linting, formatting, and type checks remain repository responsibilities. Generator's live browser verification does not guarantee the output satisfies local static rules.

## Failure paths in generated code

| Generated symptom | Likely defect | Review action |
| --- | --- | --- |
| Locator matches multiple controls | Semantic scope is incomplete | Restrict to the intended region or record |
| Test passes when the feature is wrong | Assertion does not distinguish the required outcome | Map assertions back to every expected result |
| Test passes only after generation | Hidden state from the live session | Rebuild setup through fixtures and clean execution |
| File imports \`@playwright/test\` directly | Repository fixture contract was ignored | Restore the approved fixture import unless intentionally changed |
| Several scenarios depend on order | Generated structure coupled state | Split tests and provision independent data |
| Fixed timeout was added | Readiness or product delay was not modeled | Replace with an observable condition supported by evidence |
| Plan step was omitted | Generator could not perform it or silently narrowed scope | Report the gap and revise plan or code explicitly |
| Exact text is brittle across locales | Assertion exceeds the product contract | Assert approved semantics or run the intended locale |
| Generated test is skipped | Failure signal was suppressed | Require an owner, reason, and explicit review; do not count as passing |

The test-agent docs acknowledge that generated tests may include initial errors that Healer can address. That statement does not mean every initial error should be handed off automatically. First determine whether the plan, seed, environment, or generated code is wrong. Healing a test built from an unapproved assumption only makes the wrong intent more durable.

## Use Healer only after code review

Healer's documented input is a failing test name. A well-structured Generator output makes that input specific. Before invoking Healer, preserve the failure, confirm the named test maps to an approved scenario, and decide whether the product may actually be broken.

Do not ask Healer to sweep every generated file until CI turns green. The official workflow says it replays steps, inspects the current UI, suggests a patch, and reruns until pass or guardrails stop. Its possible output includes a skipped test. Every patch or skip needs the same code review as a manual change.

If Generator reports that an outcome cannot be verified live, return to the plan or environment instead of weakening assertions. Healer is not a substitute for missing requirements or inaccessible data.

## Pull-request acceptance checklist

A generated suite is ready for a normal pull request only when reviewers can answer yes to the relevant checks:

- Source plan and seed comments point to real reviewed files.
- Every test title maps to one approved scenario.
- Fixture imports, authentication, data creation, and cleanup follow project policy.
- Locators identify the intended user-facing controls without fragile DOM chains.
- Assertions distinguish the required state from plausible incorrect states.
- Tests run independently and do not require Generator's residual browser state.
- No production URL, real customer data, token, or broad privileged account was added.
- No unexplained fixed sleep, forced action, retry increase, or skip masks uncertainty.
- Focused tests pass from a clean state under relevant projects.
- Static checks and neighboring tests pass through the repository's standard commands.

This is a human review standard. Playwright does not claim Generator certifies these properties automatically.

## Version scope and limitations

Generator was introduced with Playwright Test Agents in version 1.56. This article reflects the current 1.61 documentation available July 14, 2026. Regenerate definitions on upgrades, as the official setup instructs, because tools and role instructions can change.

The official page documents a Node.js workflow with plans under \`specs/\` and tests under \`tests/\`. It does not promise identical generation support for every language binding or coding-agent host. It also does not claim that generated code is exhaustive, deterministic across model runs, compliant with every repository architecture, or automatically approved.

Live verification is bounded by the reachable app, current data, selected browser context, and supplied plan. Cross-browser behavior, parallel safety, localization, responsive states, and external integrations require explicit scope and normal execution. Generator is a code-production role, not an oracle for product intent.

## Frequently Asked Questions

### What does the Playwright Generator agent take as input?

Its documented input is a Markdown plan from \`specs/\`. Name the exact approved file in the prompt and preserve the seed and fixture conventions it references.

### Where does Generator write tests?

The official artifact model places generated Playwright tests under \`tests/\`, aligned one-to-one with specs wherever feasible. Choose a clear domain subdirectory when the repository uses one.

### Does Generator verify selectors?

Yes. Playwright says it verifies selectors and assertions live while performing scenarios. Review the resulting locator semantics and rerun from clean state because a single observed resolution is not a durability guarantee.

### Are generated tests guaranteed to pass?

No. The official page explicitly notes that generated tests may include initial errors. Diagnose the plan, seed, code, data, and product before deciding whether Healer is appropriate.

### Should Generator create page objects?

Only when that matches the repository's architecture and improves clarity. The official agent contract does not require a page-object model. Avoid speculative abstractions that hide scenario intent.

### Can I skip human review if live verification passed?

No. Live verification does not validate requirements, isolation, project coverage, security, or maintainability. Treat generated code like any other code contribution.

### Should I ask Generator to add extra scenarios it discovers?

Prefer sending new behavior back to Planner so intent is reviewed in Markdown first. If scope changes during generation, update the plan and preserve traceability instead of silently adding code.

### When should a generated test go to Healer?

After a reviewer confirms the plan and generated structure are legitimate, the environment is available, and one specifically named test still fails. Give Healer that test name and preserve evidence.

### What if the test passes only in the generation browser?

Assume hidden state or incomplete setup until disproved. Close or reset the session, rebuild data through approved fixtures, and run the file with the normal Playwright Test command.

## Keep the artifact chain reviewable

Return to the [Planner guide](/blog/playwright-planner-agent-test-plan-guide-2026) when intent is ambiguous, use the [Healer guide](/blog/playwright-healer-agent-self-healing-tests) for a reviewed named failure, and maintain definitions through the [init-agents tutorial](/blog/playwright-init-agents-guide). The [test-agent pillar](/blog/playwright-test-agents-planner-generator-healer) joins those ownership decisions into one lifecycle.

The primary behavior is documented on Playwright's official [Generator section](https://playwright.dev/docs/test-agents#generator) and [artifact conventions](https://playwright.dev/docs/test-agents#tests-in-tests). For broader code principles, read the canonical [Playwright best-practices guide](/blog/playwright-best-practices-2026) and [page-object model guide](/blog/page-object-model-complete-guide). Browse [QA skills](/skills) or the [Playwright CLI skill](/skills/Pramod/playwright-cli) when the repository needs reusable agent instructions beyond Generator's role definition.`,
    },
  },
  {
    slug: 'playwright-healer-agent-self-healing-tests',
    clusterId: 'playwright-agents',
    post: {
      title: 'Playwright Healer Agent Guide for Repairing Failed Browser Tests',
      description:
        'Use the Playwright Healer agent to replay a named failure, inspect current UI behavior, review a minimal patch, and reject repairs that hide regressions.',
      date: '2026-07-07',
      updated: '2026-07-14',
      category: 'Troubleshooting',
      image: '/blog/pillars/playwright-agents.png',
      imageAlt:
        'Playwright Healer agent tracing one failed browser scenario through diagnosis, a minimal reviewed patch, and focused rerun evidence',
      primaryKeyword: 'playwright healer agent',
      keywords: [
        'playwright healer agent',
        'playwright self healing tests',
        'playwright repair failed tests',
        'playwright healer prompt',
        'playwright locator repair',
        'agentic test healing',
        'playwright failed test diagnosis',
        'ai test maintenance playwright',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-test-agents-planner-generator-healer',
      relatedSlugs: [
        'playwright-test-agents-planner-generator-healer',
        'playwright-init-agents-guide',
        'playwright-planner-agent-test-plan-guide-2026',
        'playwright-generator-agent-test-code-guide-2026',
      ],
      sources: [
        'https://playwright.dev/docs/test-agents#healer',
        'https://playwright.dev/docs/test-agents#artifacts-and-conventions',
        'https://playwright.dev/docs/release-notes#version-156',
      ],
      content: `**The Playwright Healer agent takes a failing test name, replays its failing steps, inspects the current UI for an equivalent element or flow, suggests a patch, and reruns the test until it passes or guardrails stop the loop. Use it on one reviewed failure at a time, preserve the original evidence, and inspect every change. A passing rerun can support a repair; it cannot prove the product is correct. A skipped output means Healer believes functionality is broken, not that the test has been fixed, and it must remain a visible failure decision for the team.**

See the [Playwright test-agents pillar](/blog/playwright-test-agents-planner-generator-healer) for role boundaries. Generate definitions with the [init-agents tutorial](/blog/playwright-init-agents-guide), retain intent through the [Planner guide](/blog/playwright-planner-agent-test-plan-guide-2026), and produce reviewable code with the [Generator guide](/blog/playwright-generator-agent-test-code-guide-2026). Use the canonical [flaky-test repair guide](/blog/fix-flaky-tests-guide) and [Playwright Trace Viewer guide](/blog/playwright-trace-viewer-complete-guide-2026) for broader diagnosis. Browse [QA skills](/skills) and the [Playwright CLI skill](/skills/Pramod/playwright-cli) for reusable workflows.

This guide is grounded in Playwright's current [official Healer documentation](https://playwright.dev/docs/test-agents#healer), checked July 14, 2026. The page documents four actions: replay failing steps, inspect the current UI, suggest a patch such as a locator, wait, or data adjustment, and rerun until passing or stopped by guardrails. Its documented output is either a passing test or a skipped test when functionality appears broken. The diagnosis gates below are team safeguards, not a claim that Healer autonomously proves root cause or approves its own patch.

## Start from a named, legitimate failure

Healer's documented input is a failing test name. That boundary is important. A precise title ties the repair to one approved scenario and prevents an open-ended rewrite of a suite. "Guest corrects an unsupported postal code" is actionable; "fix checkout" is not the documented input and gives no stable intent to protect.

Before invoking Healer, establish that the test belongs in the suite:

1. Find the Markdown scenario or requirement the test protects.
2. Confirm the test passed previously or was reviewed after generation.
3. Preserve the original error, project, retry, and available artifacts.
4. Verify the target application revision and test environment.
5. Reproduce only when rerunning will not destroy rare failure evidence.
6. Name the exact test and prohibit unrelated edits.

Do not send a newly generated, unreviewed batch straight into a healing loop. If Generator misunderstood the plan, making the code green can entrench the wrong behavior. Review intent and structure first.

## Classify the failure before accepting a repair

The same failed assertion can result from different causes. Healer may inspect the current UI, but the reviewer still decides which class the evidence supports.

| Failure class | Evidence pattern | Valid next move | Dangerous "repair" |
| --- | --- | --- | --- |
| Locator drift | Intended control still exists with changed stable semantics | Update the locator and preserve the same action | Click a different control that merely advances the page |
| Expected product change | Approved requirement and UI changed together | Update plan and test in one reviewed change | Alter only the assertion without recording new intent |
| Product regression | Required control, result, or transition is absent | File/fix product defect; keep signal visible | Skip, weaken, or redirect the test to another flow |
| Synchronization defect | Evidence shows assertion runs before a meaningful readiness state | Wait on that state through a web-facing condition | Add arbitrary time or inflate all timeouts |
| Test-data defect | Account, cart, role, or record is invalid or shared | Repair fixture provisioning and isolation | Hard-code one mutable shared record |
| Environment failure | Service, flag, dependency, or network is unavailable | Restore environment and rerun unchanged test | Rewrite expectations around an outage |
| Plan defect | Original expected result was ambiguous or wrong | Return to Planner/product review | Let Healer invent the business rule |
| Flake without cause | Failure disappears and no divergence is found | Keep investigating or quarantine by policy | Call the rerun a confirmed fix |

"It passed after the patch" is validation evidence, not root-cause proof. A locator update can pass while targeting the wrong button. A longer wait can pass while hiding a backend slowdown. A data change can pass while removing the boundary the scenario was supposed to test.

## Preserve the original failure specimen

Before replay, copy or retain what the failing attempt already produced: error text, stack location, browser project, retry number, screenshot, trace, video, console or network evidence, and application revision where available. Normal Playwright debugging artifacts are separate from Healer's narrow input contract, but they help a human compare the suggested explanation with the original failure.

Do not assume Healer automatically consumed a trace merely because the repository recorded one. The current test-agent page says it replays steps and inspects the current UI; it does not specify trace ingestion as a required Healer input. Use trace analysis as an explicit reviewer or debugging workflow and label evidence from a later replay separately.

A rerun can change timing, data, or server state. If the first attempt failed during a one-time race and replay passes immediately, report that the cause is unconfirmed. Do not edit code simply to produce a diff.

Record a compact failure envelope before invocation:

\`\`\`text
Test: guest corrects an unsupported postal code
File: tests/checkout/unsupported-postal-code.spec.ts
Project: chromium
Observed: after correcting 00000 to 10001, address step remained visible
Expected: delivery options heading becomes visible
First failing action: second Continue to delivery click
Artifacts: original trace and screenshot retained by CI
Protected intent: rejected code must recover without losing valid address fields
Allowed edits: this test or its checkout fixture only
Forbidden: skip, fixed sleep, broad timeout increase, unrelated suite changes
\`\`\`

This envelope is a team artifact, not a Playwright file format. It keeps the investigation anchored to observable behavior and makes an unrelated patch easy to reject.

## Inspect the failing test for false intent

Consider this reviewed test:

\`\`\`ts
// spec: specs/guest-checkout.md
// seed: tests/seed.spec.ts
import { test, expect } from '../../fixtures';

test('guest corrects an unsupported postal code', async ({ page, guestCheckout }) => {
  await guestCheckout.openSeededCart();

  const postalCode = page.getByRole('textbox', { name: 'Postal code' });
  await postalCode.fill('00000');
  await page.getByRole('button', { name: 'Continue to delivery' }).click();
  await expect(page.getByText('We do not deliver to this postal code')).toBeVisible();

  await postalCode.fill('10001');
  await page.getByRole('button', { name: 'Continue to delivery' }).click();
  await expect(page.getByRole('heading', { name: 'Delivery options' })).toBeVisible();
});
\`\`\`

Before Healer changes it, compare the plan and current product. The first assertion proves rejection. The final heading proves recovery reached a distinct step. If the product now labels that step "Shipping method" and the requirement approved the rename, a semantic locator update may preserve intent. If the delivery step never appears because the API returns an error, changing the test to assert the address heading would invert the requirement.

Check whether both button locators identify the same intended control at each state. Repeated accessible names are not inherently wrong, but a layout may contain multiple "Continue" buttons. A suggested scope change should point to the same address form, not whichever button happens to navigate.

## Give Healer a bounded request

Invoke the generated Healer role through the selected coding-agent host. The prompt below is natural language, not a Playwright CLI command:

\`\`\`text
Use the Playwright Healer agent on the failing test named
"guest corrects an unsupported postal code" in
tests/checkout/unsupported-postal-code.spec.ts.

Preserve the scenario in specs/guest-checkout.md: a rejected code must show the
field error, and a valid correction must reach delivery options without losing
the other address values. Replay the failing steps in QA Sandbox, inspect the
current UI, and identify the earliest divergence. Suggest the smallest supported
patch and rerun only this test. Do not skip it, add fixed sleeps, weaken the final
outcome, change production code, or edit unrelated tests. If the required product
behavior appears broken, stop and report that evidence instead of masking it.
\`\`\`

The official docs allow a skipped output when Healer believes functionality is broken. This prompt asks it to stop and report instead because the team's review policy does not permit an unapproved skip. That is a governance choice, not a different Healer feature.

The prompt restates protected intent so "equivalent flow" cannot be interpreted as any route to a green assertion. It also confines file scope. If the evidence points to a shared fixture, Healer can suggest that fact; a reviewer can then expand the allowed change deliberately.

## Require an evidence chain with the patch

A useful repair explanation has six parts:

1. The earliest step where expected and actual behavior diverged.
2. The relevant UI state before that step.
3. The observed result after the action.
4. The classified cause and supporting evidence.
5. The smallest patch that preserves the scenario.
6. The focused rerun result and remaining uncertainty.

Reject "updated selector and test passes" as incomplete. Ask what the old selector matched, what the new one means, and why the product change is approved. For wait changes, ask which readiness event was absent and how the new condition proves it. For data changes, ask whether the scenario's boundary still exists.

An acceptable locator-only repair after an approved accessible-name change might be:

\`\`\`ts
// Requirement-approved copy changed from "Delivery options" to "Shipping method".
await expect(page.getByRole('heading', { name: 'Shipping method' })).toBeVisible();
\`\`\`

This one line is not acceptable merely because it resolves. Evidence must show that "Shipping method" is the renamed delivery step and the plan or requirement was updated. If both headings coexist and one is an unrelated sidebar, the patch is wrong.

A synchronization repair should wait on product meaning, not elapsed time. For example, if the delivery transition legitimately exposes a loading status and then the heading:

\`\`\`ts
await page.getByRole('button', { name: 'Continue to delivery' }).click();
await expect(page.getByRole('status', { name: 'Saving address' })).toBeHidden();
await expect(page.getByRole('heading', { name: 'Delivery options' })).toBeVisible();
\`\`\`

Use this pattern only if that status is real and part of the observed application. Do not invent an accessible name to make a generic example fit. Often the final web-first heading assertion already waits sufficiently; adding another wait without evidence only increases code.

## Treat "equivalent element or flow" narrowly

The Healer docs say it inspects the current UI to locate equivalent elements or flows. Equivalent should mean the same user intent and outcome, not a shortcut that makes the test proceed.

For a checkout continuation, these are not automatically equivalent:

- A primary "Continue to delivery" button and a breadcrumb link that jumps ahead.
- A guest checkout control and an authenticated express-checkout control.
- A visible address form and a hidden mobile duplicate.
- A successful server transition and a client-side URL edit.
- A confirmation page for the seeded item and one left from a previous order.

Review identity, context, preconditions, side effects, and outcome. A replacement locator must operate on the intended record and actor. A replacement flow must still exercise the risk named in the plan. If the UI redesign intentionally removed a step, update the plan before accepting a different flow.

This is where unsupported autonomy claims become dangerous. Healer can inspect and suggest; the team owns equivalence. No model observation replaces an approved product decision.

## Evaluate locator patches

Approve a locator patch only when all of these are true:

- The original control still exists or has an approved replacement.
- The new locator expresses stable user-facing identity or an approved test contract.
- It is unique in the intended region and state.
- It does not bypass a required intermediate action.
- The assertions after the action still prove the same outcome.
- The change works from clean setup, not only the replay session.

Reject patches that switch to \`locator('button').nth(2)\` without a stable rationale, use a broad text substring, force an action through an overlay, or target a hidden duplicate. These may turn red into green without repairing the test's meaning.

If the accessible name changed because accessibility regressed, restoring the product semantics may be the right fix. A test locator failure can be valuable product evidence. Do not automatically adapt the test to a less accessible implementation.

## Evaluate wait and timeout patches

The docs list a wait adjustment as one example of a suggested patch. A wait change is justified when evidence shows the test observes too early relative to a legitimate application state. It is not justified simply because a larger timeout eventually passes.

Ask three questions:

1. Which observable readiness condition was missing from the test?
2. Is the condition tied to user-visible or domain state rather than wall-clock delay?
3. Does the change preserve a useful performance or timeout signal?

An arbitrary \`waitForTimeout\` usually answers none of them. Increasing a global timeout can also slow every failure and hide a regression. Prefer the existing web-first assertion when it already waits for the required condition. If the app has no observable readiness state, consider whether the product needs one or whether a fixture/API contract can establish it.

Run the repaired test repeatedly only as supporting stability evidence, not proof of absence of flakiness. A small sample cannot guarantee reliability under all CI conditions.

## Evaluate data and fixture patches

A data repair can be legitimate when the fixture created an expired account, duplicate identifier, wrong role, unavailable item, or shared state. Preserve the scenario's intended boundary while fixing provisioning.

For example, replacing hard-coded order \`123\` with a fixture-created unique order can improve isolation. Replacing an out-of-stock scenario with an in-stock item merely to pass changes intent. The patch explanation must name the old invalid assumption and show why the new data still exercises the approved behavior.

Inspect cleanup and parallelism. Healer may get one focused test to pass with a shared account that will still collide in a full worker pool. Run neighboring tests and relevant projects after focused validation. Data fixes belong in the narrowest shared fixture that actually owns the state; avoid copying setup into one test when every scenario needs the corrected contract.

## Handle product regressions and skipped output

The official page explicitly permits a skipped test when Healer believes functionality is broken. A skip is not a passing repair. It suppresses execution and changes the suite's signal. Treat it as an escalation artifact requiring an owner, defect reference, rationale, expiry or revisit condition, and explicit approval under team policy.

If current UI inspection shows a required button is gone, an API error prevents transition, or persisted data is wrong, preserve the failed assertion and report the product evidence. Fixing the application may make the unchanged test pass. That is a successful testing outcome even though Healer did not edit the test.

Do not allow a loop to alternate among locators until any path turns green. The documented guardrail stop exists because repair is bounded. Your host and repository should add practical limits on files, retries, time, environment, and forbidden actions. The official page does not publish one universal guardrail configuration, so do not invent a Playwright option for it.

When a skip is unavoidable under an established quarantine policy, make it visible in code review and reporting. Never count skipped as healed in reliability metrics.

## Validate the smallest patch

After reviewing the diff, run the named test through the normal runner from a clean state:

\`\`\`bash
npx playwright test tests/checkout/unsupported-postal-code.spec.ts --grep "guest corrects an unsupported postal code"
npx playwright test tests/checkout/unsupported-postal-code.spec.ts
\`\`\`

The first command isolates the named behavior; the second catches interactions with other scenarios in the file. Then run relevant projects and neighboring coverage through repository scripts. A passing Chromium rerun does not establish WebKit, Firefox, mobile, locale, or parallel behavior unless those configurations are actually exercised.

Compare the new run with original evidence. Confirm the repaired action reaches the same state, assertions remain discriminating, no skip appeared, and no unrelated file changed. If the root cause was data or a fixture, add a regression check at the appropriate layer when useful.

Do not merge a patch solely because Healer stopped. Guardrails can stop on unresolved failure, and the documented output can be skipped. Read the final state and test report.

## Failure paths inside the healing loop

| Loop symptom | Interpretation | Response |
| --- | --- | --- |
| Replay passes without edits | Failure may be intermittent or environment-specific | Preserve uncertainty and compare original attempt |
| Suggested locator points elsewhere | "Equivalent" was judged too broadly | Reject and restate protected intent and region |
| Timeout keeps increasing | Root cause remains unproven | Restore useful limit and find an observable condition |
| Test data changes remove the boundary | Patch changes the scenario | Reject and repair fixture without changing risk |
| Healer edits several unrelated files | Input or permissions are too broad | Stop, revert only its proposed scope through review, and retry narrowly |
| Product behavior is visibly absent | Likely regression or intentional change | Obtain product decision; do not force a green test |
| Test becomes skipped | Functionality was judged broken or signal was suppressed | Escalate; a skip is not a passing repair |
| Focused test passes but suite fails | Shared fixture, project, or parallel interaction remains | Run relevant scope and repair ownership boundary |

The right outcome can be "no test patch." A clear diagnosis that identifies a product regression is more valuable than a misleading green suite.

## Version and capability limits

Healer was introduced with Planner and Generator in Playwright 1.56. This article reflects the stable 1.61-era documentation available on July 14, 2026. Regenerate definitions whenever Playwright is updated so the role receives current tools and instructions.

The documentation does not claim perfect repair, root-cause certainty, unlimited looping, automatic merge, production authorization, or immunity from false-green patches. It names patch examples, reruns, guardrails, and two possible outputs. Host implementation and permissions can differ across VS Code, Claude Code, Codex, and OpenCode.

The current agent page documents the Node.js Playwright Test workflow. Do not assume the same initializer and Healer behavior exist for every language binding. Do not infer that a release-note debugging feature is automatically used by Healer unless the current definition or documentation says so.

## Frequently Asked Questions

### What input does the Playwright Healer agent need?

The official docs list a failing test name. Give a precise title that maps to a reviewed scenario, plus boundaries and preserved intent in the host request.

### What does Healer do after a test fails?

It replays the failing steps, inspects current UI for equivalent elements or flows, suggests a patch, and reruns until the test passes or guardrails stop the loop.

### Can Healer skip a broken test?

The documented output can be a skipped test if Healer believes functionality is broken. Treat that as unresolved and subject to explicit team review, not as a successful repair.

### Does a passing rerun prove the patch is correct?

No. It proves one run passed in that context. Review the preserved intent, root-cause evidence, locator identity, assertion strength, clean setup, projects, and neighboring tests.

### Should Healer add a fixed sleep for timing failures?

Only evidence can justify a timing change, and a fixed sleep rarely represents readiness. Prefer an observable application condition or existing web-first assertion. Reject timeout inflation without a causal explanation.

### Can Healer fix product code?

The official test-agent page describes patches such as locator, wait, or data fixes in the failing-test workflow; it does not grant unrestricted product-code authority. Set file boundaries and route confirmed product defects through normal ownership.

### What if the test passes during replay?

Keep the original failure and report that the cause is unconfirmed. Compare project, data, timing, environment, and artifacts. A clean replay does not erase a flaky or environment-specific failure.

### When is a locator update safe?

When evidence shows the intended control has an approved new identity, the locator is stable and unique in context, and all downstream assertions still prove the same scenario.

### Is Healer the same as unattended self-healing automation?

No. Playwright documents a bounded agent workflow with a named failure, suggested patch, reruns, guardrails, and a possible skipped output. Human review and merge policy remain outside that claim.

## Repair signal, not just syntax

Return to the [Planner guide](/blog/playwright-planner-agent-test-plan-guide-2026) if expected behavior is wrong, the [Generator guide](/blog/playwright-generator-agent-test-code-guide-2026) if implementation structure is weak, and the [init-agents guide](/blog/playwright-init-agents-guide) when definitions are stale. The [agent pillar](/blog/playwright-test-agents-planner-generator-healer) explains the complete handoff and approval model.

The authoritative role contract is the official [Playwright Healer section](https://playwright.dev/docs/test-agents#healer), supported by the [test-agent artifact conventions](https://playwright.dev/docs/test-agents#artifacts-and-conventions) and [1.56 release record](https://playwright.dev/docs/release-notes#version-156). For wider failure analysis, continue with the [flaky-test guide](/blog/fix-flaky-tests-guide) and [Trace Viewer guide](/blog/playwright-trace-viewer-complete-guide-2026). Browse [QA skills](/skills) and the [Playwright CLI skill](/skills/Pramod/playwright-cli) without treating those resources as additional Healer autonomy.`,
    },
  },
];
