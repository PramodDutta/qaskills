import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'BDD Living Documentation Reports That Teams Can Trust',
  description: 'Build BDD living documentation reports that stay accurate, trace failures to evidence, and turn Cucumber scenarios into a reliable shared product reference.',
  date: '2026-08-08',
  category: 'BDD',
  content: `
# BDD Living Documentation Reports That Teams Can Trust

BDD living documentation reports are generated views of executable examples that explain current product behavior, show which examples passed, and connect failures to useful evidence. They become trustworthy only when scenarios describe business rules, automation runs against controlled environments, report generation is reproducible, and stale results are visibly rejected. A colorful HTML page by itself is a test report, not living documentation.

The shortest dependable workflow is to write examples around decisions, attach stable rule identifiers and ownership metadata, execute them through Cucumber in CI, publish a versioned report with build context, and review both failures and obsolete scenarios. Teams choosing a tool can compare the tradeoffs in the [BDD frameworks comparison](/blog/bdd-frameworks-comparison-2026). Engineers new to executable specifications can first work through the [Cucumber BDD tutorial](/blog/cucumber-bdd-tutorial-beginners), then return here for reporting architecture.

## Define What the Report Promises

A living report should answer four questions without opening the automation repository: What behavior is specified? Which product version was exercised? Did each example pass in a known environment? Where is the evidence when it did not? Those promises are stronger than a list of test names.

Write a small report contract before choosing a formatter. The contract prevents tooling output from dictating what stakeholders see.

| Report concern | Required answer | Bad substitute |
|---|---|---|
| Behavior | Rule and concrete examples | Step-definition method names |
| Freshness | Commit, build, and execution time | Browser cache timestamp |
| Scope | Included and excluded tags | A raw scenario count |
| Result | Passed, failed, skipped, undefined | Green percentage without context |
| Evidence | Error, screenshot, request correlation | “See CI logs” |
| Ownership | Product area or responsible team | Repository author history |

The word “living” means the page is regenerated from the same examples that were executed. It does not mean the page is automatically correct. A scenario can pass while describing a rule the business no longer wants. Fresh execution and semantic review are separate obligations.

State the audience too. Product managers need readable rules and examples. Test engineers need step, hook, duration, and attachment details. Delivery leads need freshness and release scope. One report can serve all three if its summary starts with behavior and progressively reveals technical evidence.

## Shape Gherkin Around Decisions, Not Clicks

Reports inherit the quality of the feature files. A scenario that says “click login, fill field, click submit” documents an interface procedure. A scenario that says “a locked customer cannot create a new session” documents a business decision. UI mechanics belong in step definitions or lower-level helpers.

\`\`\`gherkin
@authentication @owner_identity @rule_AUTH_014
Feature: Protect accounts after repeated failed sign-ins
  Customers should regain access through recovery without weakening lockout policy.

  Rule: A temporary lock starts after the configured failed-attempt limit

    Background:
      Given the failed-attempt limit is 5

    Scenario: The fifth incorrect password locks the account
      Given Maya has made 4 consecutive failed sign-in attempts
      When Maya signs in with an incorrect password
      Then Maya's account is temporarily locked
      And the sign-in response offers account recovery

    Scenario: A successful recovery clears the failed-attempt count
      Given Maya's account is temporarily locked
      When Maya completes account recovery
      Then Maya can sign in with her new password
      And Maya has 0 consecutive failed sign-in attempts
\`\`\`

This feature yields useful documentation because its numbers and outcomes belong to the rule. The fifth attempt is not an arbitrary test datum. The recovery example describes a connected policy. The tags provide machine-readable classification without making the title unreadable.

Avoid writing every example through the UI. If the rule is observable through an API and the UI contributes no behavior, execute at the API boundary. BDD is not synonymous with browser automation. Reports become faster and more reliable when examples use the narrowest interface that proves the rule.

## Choose Metadata That Survives Renaming

Titles are for people and will change. Stable identifiers are for history, requirements mapping, and analytics. A practical tagging vocabulary uses a small number of prefixes rather than free-form labels.

| Tag family | Example | Purpose | Governance |
|---|---|---|---|
| Rule | \`@rule_AUTH_014\` | Stable behavior identity | Product and QA agree |
| Owner | \`@owner_identity\` | Routing and review | Team directory controls values |
| Capability | \`@authentication\` | Reader navigation | Product taxonomy |
| Execution | \`@browser\` | Runtime selection | Automation team |
| Lifecycle | \`@draft\` | Exclude incomplete examples | Time-limited and reviewed |

Do not encode rapidly changing details such as sprint number, engineer name, or current browser version into feature tags. CI already knows those. Tags should describe durable behavior or intentional execution policy.

A validator can keep vocabulary clean. The following script reads feature files and rejects unknown structured prefixes while allowing common unstructured tags. It uses only Node.js APIs and can run before Cucumber.

\`\`\`js
import { readFileSync } from 'node:fs';

const allowedPrefixes = ['@rule_', '@owner_'];
const knownPlainTags = new Set([
  '@authentication',
  '@browser',
  '@api',
  '@draft',
]);

const files = process.argv.slice(2);
if (files.length === 0) {
  throw new Error('Pass at least one .feature file');
}

const unknown = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const tags = source.match(/@[A-Za-z0-9_]+/g) ?? [];
  for (const tag of tags) {
    const structured = allowedPrefixes.some((prefix) => tag.startsWith(prefix));
    if (!structured && !knownPlainTags.has(tag)) {
      unknown.push(\`\${file}: \${tag}\`);
    }
  }
}

if (unknown.length > 0) {
  throw new Error(\`Unknown tags:\\n\${unknown.join('\\n')}\`);
}
\`\`\`

The validator deliberately checks syntax and vocabulary, not whether an owner or rule exists in an external system. That lookup can be added through a documented API, but keep the local check deterministic and fast.

## Configure Cucumber Output as a Build Artifact

Cucumber-JS formatters can emit a human-readable console view and files for later consumption. Keep configuration in version control so local and CI runs use the same formatter set. A CommonJS configuration can define a default profile:

\`\`\`js
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['features/step-definitions/**/*.js', 'features/support/**/*.js'],
    format: [
      'progress',
      ['html', 'reports/cucumber.html'],
      ['message', 'reports/cucumber-messages.ndjson'],
      ['junit', 'reports/cucumber.xml'],
    ],
  },
};
\`\`\`

Confirm configuration keys and formatter availability against the installed Cucumber-JS documentation. Avoid pinning an article or agent prompt to an assumed version. The official project documentation at https://github.com/cucumber/cucumber-js explains current configuration and formatter behavior.

Create the output directory before execution and fail the job when Cucumber fails. Do not append \`|| true\` just to ensure report upload, because that converts product failures into green builds. CI systems usually support an artifact-upload step that runs even after an earlier command fails.

\`\`\`json
{
  "scripts": {
    "bdd": "mkdir -p reports && cucumber-js",
    "bdd:smoke": "mkdir -p reports && cucumber-js --tags '@smoke and not @draft'"
  }
}
\`\`\`

Install \`@cucumber/cucumber\` as a reviewed development dependency before using these scripts. Commit the resolved lockfile and let dependency automation propose upgrades with a testable diff.

The HTML output is a convenient immediate artifact. Cucumber Messages provide the preferred structured event stream, while JUnit supports CI test views. Preserve a machine-oriented output even if stakeholders prefer HTML, because a later documentation portal may need structured results.

## Add Context Without Polluting Scenarios

Build metadata belongs beside the report, not inside every Scenario title. Generate a manifest that captures the exact subject and environment. Use explicit CI variable boundaries so identifiers do not disappear through greedy shell expansion.

\`\`\`bash
set -euo pipefail

REPORT_DIR="reports"
mkdir -p "\${REPORT_DIR}"

node -e '
const fs = require("node:fs");
const manifest = {
  commit: process.env.GIT_COMMIT || "local",
  build: process.env.CI_PIPELINE_ID || "local",
  environment: process.env.TEST_ENVIRONMENT || "developer",
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(
  "reports/manifest.json",
  JSON.stringify(manifest, null, 2) + "\\n",
);
'

npx cucumber-js
\`\`\`

For release evidence, record an immutable application version, not only a branch name. A branch can move after the report is generated. If tests target a deployed service, include its deployment or image digest when the platform exposes one. Never include passwords, tokens, customer payloads, or unrestricted environment dumps in the manifest.

Attach the manifest and formatter outputs as a single artifact set. If a portal copies the HTML elsewhere, it should copy or display the same metadata. A report detached from its tested version quickly becomes misleading.

## Attach Evidence at the Point of Failure

A failure message such as “expected 200 but got 403” is incomplete if nobody can identify the request or user state. Attach concise, sanitized evidence from the step or an \`After\` hook. Cucumber's World provides an \`attach\` function, and a hook can capture a browser screenshot when the scenario fails.

\`\`\`js
const { After, Status } = require('@cucumber/cucumber');

After(async function ({ result, pickle }) {
  if (result?.status !== Status.FAILED) {
    return;
  }

  if (this.page) {
    const screenshot = await this.page.screenshot({ fullPage: true });
    await this.attach(screenshot, 'image/png');
  }

  const context = {
    scenario: pickle.name,
    correlationId: this.correlationId ?? null,
    testUser: this.testUserId ?? null,
  };
  await this.attach(JSON.stringify(context, null, 2), 'application/json');
});
\`\`\`

The hook checks that a page exists because API-only scenarios may not create one. The context uses synthetic identifiers rather than session cookies or raw customer data. Attachment calls are awaited so formatter output is complete before the process exits.

Evidence should answer a diagnostic question. Useful attachments include a screenshot, selected request and response metadata, a trace identifier, relevant domain state, and application logs scoped by correlation ID. Dumping an entire database or browser storage creates privacy risk and buries the cause.

Put routine values in logs, not attachments. If every passing step adds a screenshot, report size and rendering time grow until people stop opening it. Attach richly on failure and sparingly on important business milestones.

## Make Parallel Results Deterministic

Parallel execution introduces two reporting hazards: workers can overwrite the same output file, and merged results can look current even when one shard never completed. Give every shard a unique artifact directory, then perform an explicit merge or portal import only after all expected shards arrive.

| Hazard | Symptom | Detection | Prevention |
|---|---|---|---|
| Filename collision | Missing or truncated scenarios | Compare shard logs with report | Unique output per worker |
| Missing shard | Suspiciously small green report | Validate expected shard manifest | Require all shard IDs |
| Duplicate execution | Scenario appears twice | Match stable scenario IDs | Deterministic tag split |
| Mixed commits | Incoherent behavior set | Compare commit in manifests | Reject inconsistent batch |
| Late upload | Portal shows older run | Compare immutable build IDs | Atomic publication |

A shell wrapper can create an unambiguous worker directory:

\`\`\`bash
set -euo pipefail

PIPELINE_ID="\${CI_PIPELINE_ID:-local}"
WORKER_INDEX="\${CI_NODE_INDEX:-0}"
SHARD_DIR="reports/\${PIPELINE_ID}_\${WORKER_INDEX}"
mkdir -p "\${SHARD_DIR}"

npx cucumber-js \\
  --format progress \\
  --format "message:\${SHARD_DIR}/cucumber-messages.ndjson" \\
  --format "junit:\${SHARD_DIR}/cucumber.xml"
\`\`\`

If the suite uses Cucumber's own parallel option, verify how the selected formatter coordinates worker output before inventing a custom merge. If CI splits feature files externally, each process should write its own complete structured output. Use an official or well-reviewed merger compatible with the selected format, or import shards separately into a reporting system that understands them.

Publication should be atomic from the reader's perspective. Build the next report under a unique version path, verify completeness, then update a small pointer or index. Readers should never see a half-uploaded page where the summary belongs to one build and attachments to another.

## Detect Stale Documentation Explicitly

Passing results from last month are not current documentation. Every rendered report should display generation time, tested version, and freshness status. Define an organizational threshold based on release cadence. For example, a daily deployment team might mark results stale after 24 hours, while a monthly embedded release may use a different policy. Those numbers are policy choices, not universal benchmarks.

Freshness has two dimensions:

1. Execution freshness: how recently the examples ran against the stated version.
2. Specification freshness: whether examples still reflect intended behavior.

Automation can enforce the first. Humans must review the second during rule changes. Add a pull-request checklist item that asks whether affected Gherkin examples were added, changed, or deliberately left alone. Link stable rule tags to product decisions where a suitable requirements system exists.

Treat undefined and pending steps as incomplete documentation, not neutral results. A report that paints them gray without explanation can appear healthier than it is. Count and display them prominently, and fail the appropriate CI job when executable scope contains undefined steps.

Archived reports are historical evidence and should remain immutable. A “latest” view should never silently serve an archive after current execution fails. Show the failed or missing current run and keep the previous successful run labeled as previous.

## Diagnose a Green Report with Missing Scenarios

A realistic failure mode occurs after a CI refactor. The HTML report is green, but it contains 42 scenarios instead of the expected 126. No test failed. Investigation shows that three shards wrote to \`reports/cucumber.json\`; the last upload overwrote the earlier two. The formatter worked exactly as configured, but the artifact design lost data.

Diagnosis should start with counts at each boundary: scenarios selected per shard, scenarios executed, formatter output files created, files uploaded, and scenarios imported. Compare manifests and stable scenario identifiers. Do not rely only on a final pass percentage, because 42 of 42 passing can hide 84 missing examples.

Another version of the defect is tag filtering. A changed expression excludes scenarios because parentheses or \`not\` semantics were misunderstood. Print the effective command and selected scope in CI. Review tag expressions as code, with small fixture feature files that prove inclusions and exclusions.

The corrective action is not to hard-code the current expected count forever. Counts legitimately change. Instead, require all declared shard manifests, reject mixed commits, and show a diff against the previous specification set. A large unexplained drop should block publication pending review.

## Separate Behavioral Failure from Automation Failure

Readers need to know whether a scenario exposed a product behavior mismatch or the test could not establish a valid observation. Cucumber statuses alone cannot always make that distinction. Introduce failure categories in your support code and attach them as structured context.

Examples include \`behavior_mismatch\`, \`test_data_setup\`, \`environment_unavailable\`, and \`automation_defect\`. Keep the vocabulary small. The scenario must still fail; categorization guides triage and reporting, not result suppression.

An assertion that the account remained unlocked after five failures is a behavioral mismatch. A 503 from the synthetic-user setup API before the scenario begins is an environment or setup failure. A locator that no longer exists may be either a product change or automation defect and needs evidence before classification.

Never automatically rerun every failure until green and publish only the final attempt. That erases instability and makes living documentation claim confidence it did not earn. If retries are used for classified infrastructure events, display attempt history and the classification. A passed retry can be useful, but it is not identical to a first-attempt pass.

## Curate the Reader Experience

A raw formatter report is optimized for test execution details. A living-documentation portal should lead with capability, feature, rule, and example. Technical steps, hooks, stack traces, and attachments can remain expandable. Preserve the original output as evidence even if a separate view improves navigation.

Use business ordering where possible. Alphabetical file order may separate related rules. Folder structure can express capabilities, but avoid duplicating the entire organizational chart. Organizations change faster than core product concepts.

Search should include rule identifiers, scenario text, tags, and owner. Filters should make excluded scope visible. If a reader selects “release candidate,” show the expression and version behind that view so screenshots of the report remain interpretable.

Accessibility applies to reports too. Do not communicate pass and fail by color alone. Use text labels, semantic headings, keyboard-operable disclosure controls, and meaningful attachment names. Large screenshots need context. Stack traces should wrap or scroll without breaking the page.

What people get wrong is treating report beautification as the main investment. A polished dashboard cannot repair imperative Gherkin, shared-state flakes, missing shards, or stale execution. First make the evidence complete and semantically useful. Then improve presentation.

## Establish a Review and Retirement Loop

Living documentation accumulates debt when nobody retires obsolete examples. Assign each capability an owner and schedule review around product changes, not an arbitrary annual cleanup. When a rule is removed, delete or archive its executable examples in the same change. Do not tag them ignored forever.

During review, ask:

1. Does each scenario describe a decision or meaningful outcome?
2. Are examples distinct, or do several prove the same partition?
3. Are stable rule tags unique and still mapped to active behavior?
4. Can every scenario establish independent data?
5. Does a failure produce enough sanitized evidence for triage?
6. Is the published report tied to an immutable tested version?

Track trends carefully. Scenario count is not productivity. Duration can identify slow capabilities, undefined-step count can expose incomplete implementation, and failure-category frequency can reveal lab problems. Use metrics to ask questions, not to reward teams for adding examples.

Ready-made QA skills install from qaskills.sh with the qaskills CLI if you want an AI coding agent to follow a repeatable reporting checklist. Provide the agent with your tag vocabulary, Cucumber version, CI artifact rules, privacy constraints, and report audience. Those local contracts determine whether generated configuration is useful.

## Frequently Asked Questions

### Is a Cucumber HTML report automatically living documentation?

No. It becomes living documentation when its scenarios describe current business rules, the output is regenerated from actual execution, the tested version and environment are visible, and incomplete scope cannot masquerade as success. HTML is only a presentation format. A trustworthy system also controls metadata, parallel completeness, evidence, ownership, freshness, and semantic review. Without those controls, an attractive page may simply be a stale or partial test report.

### Should living documentation include technical Given and When steps?

Include technical detail only when it is part of the behavior stakeholders need to understand. Most scenarios should use domain language, while step definitions hide browser actions, API calls, and fixture mechanics. A protocol-specific rule may legitimately mention an HTTP status or event name. The test is whether the wording helps explain a product contract. If it merely narrates automation, move that detail into support code and retain it in failure evidence.

### How do we publish reports from parallel Cucumber jobs safely?

Give each worker an isolated output path, record its shard ID and commit in a manifest, and require every expected manifest before publishing a combined view. Reject mixed commits and duplicate scenario identities. Use formatter-supported coordination, a compatible reviewed merger, or separate imports into a reporting system. Publish atomically under a unique build path, then update the latest pointer only after completeness checks pass. Never let workers overwrite a shared filename.

### How often should BDD scenarios be reviewed for accuracy?

Review affected scenarios whenever a business rule, interface contract, or supported journey changes. Also review unexpected coverage drops, permanently skipped examples, and areas with repeated automation failures. A calendar review can catch neglected capabilities, but it should supplement change-driven review rather than replace it. Fresh execution proves that automation still passes. It does not prove that the examples describe the policy the organization currently intends, so product and engineering ownership remains essential.
`,
};
