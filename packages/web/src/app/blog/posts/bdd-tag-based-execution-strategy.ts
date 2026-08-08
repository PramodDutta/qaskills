import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'BDD Tag Based Execution Strategy for Fast, Trustworthy Pipelines',
  description: 'Build a BDD tag based execution strategy with a clear taxonomy, Cucumber expressions, CI lanes, governance checks, and failure diagnosis that scales.',
  date: '2026-08-08',
  category: 'BDD',
  content: `
# BDD Tag Based Execution Strategy for Fast, Trustworthy Pipelines

A BDD tag based execution strategy is a documented contract that maps scenario metadata to execution lanes, environments, setup hooks, ownership, and release decisions. The strategy should let a developer run a small, trustworthy signal after a change while guaranteeing that broader risk coverage still runs at the right point. Tags are not decorative folders and should not become an uncontrolled list of synonyms.

The practical model uses a few independent tag dimensions: business capability, test scope or interface, execution cost, risk or release role, environment constraint, and temporary workflow state. Cucumber tag expressions then select scenarios with \`and\`, \`or\`, \`not\`, and parentheses. The hard part is governance: preventing contradictory labels, accidental omissions, inherited surprises, and lanes that slowly stop representing the release policy.

This guide develops a taxonomy, applies it to Gherkin and hooks, maps it into CI, measures the resulting suites, and diagnoses a realistic missing-coverage failure. Examples use Cucumber for JavaScript because the commands are concrete, while the design applies to Cucumber implementations on other supported platforms with their documented runner syntax.

## Begin with pipeline decisions, not a tag brainstorm

Write down the decisions the pipeline must make. Typical questions are: What runs before a pull request can merge? What runs against a deployed test environment? What blocks release? Which scenarios need a browser, a mobile device, a payment sandbox, or serialized access? Who owns a failure? Tags should provide only the metadata necessary to answer those questions.

Start with an execution-lane table. The times below are illustrative targets, not claims about Cucumber or a universal recommendation.

| Lane | Trigger | Purpose | Illustrative budget | Selection idea |
|---|---|---|---:|---|
| change check | local and pull request | fast feedback on critical paths | 8 minutes | smoke, no quarantine |
| integration | pull request after build | service boundaries and contracts | 15 minutes | API scope, no external dependency |
| browser regression | merge to main | supported user journeys | 35 minutes | browser regression set |
| external sandbox | scheduled | provider-dependent behavior | 45 minutes | explicit external constraint |
| release acceptance | candidate deployment | agreed business release evidence | 25 minutes | release tag, no quarantine |

Then define what happens if a lane fails. A merge gate should be deterministic enough to block. A provider sandbox lane may notify an owner without blocking unrelated work if the provider is unstable, but that decision must be explicit. Tag selection cannot compensate for a vague failure policy.

Avoid starting with existing feature filenames. Directory layout is a source organization choice; tags describe scenario properties. A feature file can contain both fast API scenarios and slower browser examples, and a scenario outline can give different tags to different \`Examples\` blocks.

## Design a small orthogonal taxonomy

Orthogonal dimensions combine cleanly. A scenario might be \`@checkout @api @smoke\`: capability, interface, and release role. It should not need composite tags such as \`@fast-checkout-api-smoke\`, which duplicate every possible combination and make changes expensive.

| Dimension | Example tags | Question answered |
|---|---|---|
| capability | \`@checkout\`, \`@identity\`, \`@catalog\` | which business area owns this behavior? |
| interface or scope | \`@api\`, \`@browser\`, \`@mobile\` | what execution stack is required? |
| release role | \`@smoke\`, \`@release\` | which decision does this scenario support? |
| dependency | \`@payment-sandbox\`, \`@email-sandbox\` | which constrained system is needed? |
| resource | \`@serial\`, \`@camera\` | what scheduling rule applies? |
| temporary workflow | \`@quarantine\`, \`@wip\` | why is normal execution altered? |

Keep the vocabulary narrow. If \`@critical\`, \`@smoke\`, \`@sanity\`, \`@build-verification\`, and \`@p0\` all select the same lane, people will use them inconsistently. Choose one concept and document its admission criteria.

Admission criteria matter more than tag definitions. A smoke scenario should cover a business-critical journey, be independent, have a deterministic oracle, and complete within the lane budget. “Short scenario” is not enough. A one-step provider call can be unstable; a longer API journey can be a better smoke signal.

What people get wrong is using tags as failure history. Labels such as \`@flaky\`, \`@sometimes-fails\`, and \`@ignore-ci\` accumulate without resolution. Use one governed quarantine tag, require an issue reference in adjacent metadata or the scenario description, set an owner and review date, and keep quarantined scenarios visible in a non-blocking lane. Exclusion without visibility is deletion by neglect.

## Apply tags where inheritance is intentional

Cucumber allows tags on \`Feature\`, \`Rule\`, \`Scenario\`, \`Scenario Outline\`, and \`Examples\`. Tags on a parent are inherited by child elements. Tags do not go on \`Background\` or individual steps. Put a capability tag on the feature only when every scenario belongs to that capability. Put an environment constraint at scenario level if only one behavior needs it.

This feature shows deliberate inheritance and separately tagged example groups:

\`\`\`gherkin
@checkout
Feature: Select a delivery option
  A shopper can choose an available delivery service before placing an order.

  @api @smoke @release
  Scenario: Standard delivery is available for a serviceable address
    Given a cart with one in-stock item
    And a serviceable delivery address
    When delivery options are requested
    Then standard delivery is offered
    And the quoted total includes the delivery charge

  @browser @regression
  Scenario Outline: Delivery choice remains selected during checkout review
    Given the shopper is on the delivery step
    When the shopper selects <delivery option>
    And continues to the review step
    Then <delivery option> remains selected

    @desktop
    Examples: Desktop checkout
      | delivery option |
      | Standard        |
      | Express         |

    @mobile
    Examples: Mobile checkout
      | delivery option |
      | Standard        |
\`\`\`

The first scenario inherits \`@checkout\` and adds three tags. Rows in the desktop examples inherit tags from the feature, scenario outline, and examples block. The mobile row receives \`@mobile\` instead of \`@desktop\`. This is useful when data groups require different device projects without duplicating the scenario language.

Do not put \`@browser\` at feature level if a later API scenario will live in the same file. Inherited tags are additive. A child cannot remove a parent tag. If the parent choice creates contradictions, move the tag down or split the feature around business meaning.

The official Cucumber tag reference, including supported tag-expression examples and inheritance rules, is at https://cucumber.io/docs/cucumber/api/.

## Compose selections as readable Boolean policies

Tag expressions are code. Review them for precedence, test them with known scenarios, and keep a human-readable policy next to each expression. Parentheses make intent clearer even when operator precedence would produce the same result.

| Policy statement | Tag expression |
|---|---|
| smoke scenarios that are not quarantined | \`@smoke and not @quarantine\` |
| API or browser regression, excluding external sandbox | \`(@api or @browser) and @regression and not @payment-sandbox\` |
| checkout release evidence | \`@checkout and @release and not @quarantine\` |
| either mobile examples or desktop smoke | \`@mobile or (@desktop and @smoke)\` |

With Cucumber for JavaScript, run a selection using the documented \`--tags\` option:

\`\`\`bash
set -eu
npx cucumber-js --tags "@smoke and not @quarantine"
\`\`\`

Quote expressions so the shell does not interpret spaces or parentheses. Keep runner-specific flags accurate. A Vitest name filter is unrelated to Cucumber tag selection, and Mocha’s grep conventions should not be copied into this command.

You can supply \`--tags\` more than once in Cucumber-JS, but a single explicit expression is usually easier to audit in CI. Generate it from a reviewed lane definition only if the generated command is printed and tested. Hidden string concatenation makes a missing \`not @quarantine\` hard to notice.

Use truth tables for complex policies. For \`(@api or @browser) and @regression\`, a mobile-native scenario does not match unless it also has one of the selected interface tags. That may be correct, or it may reveal that the lane’s name “all regression” is misleading.

## Keep setup hooks narrower than execution lanes

Tags can restrict hooks, which is useful for provisioning a browser, API client, sandbox account, or mobile device only when needed. Hook expressions should express technical prerequisites, not duplicate every CI lane. A scenario selected locally must receive the same required setup as it does in CI.

This Cucumber-JS support file creates and closes a Playwright browser only for scenarios tagged \`@browser\`. It imports documented APIs and defines the world fields it uses.

\`\`\`ts
import { After, Before, setWorldConstructor, World } from '@cucumber/cucumber';
import { chromium, type Browser, type Page } from 'playwright';

class TestWorld extends World {
  browser?: Browser;
  page?: Page;
}

setWorldConstructor(TestWorld);

Before({ tags: '@browser' }, async function (this: TestWorld) {
  this.browser = await chromium.launch();
  const context = await this.browser.newContext();
  this.page = await context.newPage();
});

After({ tags: '@browser' }, async function (this: TestWorld) {
  await this.browser?.close();
});
\`\`\`

If browser scenarios run in parallel, each scenario needs isolated context and data. If launching a browser per scenario is too expensive, optimize with supported lifecycle and isolation patterns after measuring. Do not broaden the hook to every scenario just to share a global object, because API scenarios then inherit browser cost and failure modes.

Order and cleanup deserve explicit tests. A failed \`Before\` hook must not leave a leased account or device locked. Use an \`After\` hook that tolerates partially initialized state, as optional chaining does for the browser above. For external resources, include a unique scenario correlation ID and idempotent release operation.

## Map tags to CI jobs without hiding the policy

Each job should show its selection in reviewable text. Environment variables are useful for reuse, but the job log must print the effective expression. The following GitHub Actions excerpt runs two lanes and uploads reports through the platform’s normal artifact action. Replace setup commands with the repository’s real ones.

\`\`\`yaml
name: BDD checks

on:
  pull_request:

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - run: npm ci
      - name: Run smoke scenarios
        run: npx cucumber-js --tags "@smoke and not @quarantine" --format json:reports/smoke.json
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: smoke-cucumber-report
          path: reports/smoke.json

  api-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - run: npm ci
      - name: Run API regression scenarios
        run: npx cucumber-js --tags "@api and @regression and not @quarantine" --format json:reports/api.json
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: api-cucumber-report
          path: reports/api.json
\`\`\`

The two jobs intentionally install independently because they run on separate machines. Cache configuration may improve speed, but it does not change the tag design. Report paths differ to prevent accidental overwrite if the jobs are later combined.

Avoid an environment variable like \`TAGS=@smoke\` that silently changes in organization-level settings. If a variable is needed, validate it and echo it. Shell variable boundaries must be explicit when constructing labels:

\`\`\`bash
set -eu
: "\${CI_PIPELINE_ID:?CI_PIPELINE_ID is required}"
: "\${CI_NODE_INDEX:?CI_NODE_INDEX is required}"

LANE=browser_regression
RUN_LABEL="\${LANE}_\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}"
TAG_EXPRESSION="@browser and @regression and not @quarantine"
export RUN_LABEL
printf '%s\n' "Cucumber selection: \${TAG_EXPRESSION}"
npx cucumber-js --tags "\${TAG_EXPRESSION}"
\`\`\`

This produces a non-empty run label even when variable names touch underscores. The required-variable checks fail early with a useful message.

## Guard against empty and drifting lanes

A command that exits successfully after selecting zero scenarios can create dangerous false confidence, depending on runner behavior and configuration. Every required lane needs a minimum expected inventory or an explicit assertion that at least one scenario was selected. Exact counts are brittle during normal development, so use reviewed lower bounds or compare against a generated manifest with an allowed change process.

Create a dry-run report for the effective expression and count scenarios using a supported formatter, or run a small repository linter that parses Gherkin with the official Cucumber parser packages already used by your project. Do not parse feature files with a few regular expressions. Tags can appear on several elements, comments complicate text, and scenario outlines expand example rows.

At the governance level, require these invariants:

| Invariant | Reason | Failure action |
|---|---|---|
| each release capability has at least one release scenario | prevents silent coverage holes | block release-policy change |
| no scenario has both \`@api\` and \`@browser\` unless documented | prevents ambiguous setup | review or split scenario |
| every \`@quarantine\` has owner and issue | stops permanent exclusion | fail metadata check |
| \`@smoke\` scenarios avoid external sandbox tags | keeps merge signal deterministic | redesign or remove smoke role |
| tag vocabulary is allowlisted | catches spelling variants | fail lint with suggested token |
| every CI lane selects scenarios | prevents green empty job | fail job before execution |

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when a team wants reusable governance checks, but keep the organization’s tag policy in version control beside the features. A tool should enforce the contract, not become the only place where the contract exists.

## Diagnose the missing payment coverage failure

Consider a release where the \`release-acceptance\` job is green, but no card-payment scenario ran. The feature has \`@checkout\` at the top. The card scenario has \`@payment-sandbox @release\`. The job expression is \`@checkout and @release and not @external\`. A recent cleanup renamed the provider constraint from \`@external\` to \`@payment-sandbox\` on scenarios, but a CI script still appends \`and not @payment-sandbox\` for pull requests and unexpectedly shares that expression with the release job.

Diagnose selection rather than step execution:

1. Print the exact final tag expression from the release job.
2. Generate or inspect the selected-scenario manifest before execution.
3. List effective inherited tags for the missing scenario.
4. Compare job policy with the reviewed lane table.
5. Check configuration layers, reusable workflows, and environment variables for appended filters.
6. Add a release invariant requiring at least one selected \`@payment-sandbox @release\` scenario if payment is in scope.

The defect is a policy-composition error, not a failed payment test. Rerunning cannot fix it. A screenshot of a green Cucumber summary is insufficient because it shows only executed scenarios. The useful artifact is the expected-versus-selected manifest.

This failure also demonstrates why \`@release\` should mean agreed release evidence, while a dependency tag should control scheduling. The release lane might intentionally split internal and provider-dependent scenarios into separate jobs, then require both job conclusions for the final decision.

## Measure tag strategy quality with operational signals

Measure whether lanes serve decisions. Useful signals include selected scenario count, duration distribution, retry rate, quarantine age, failure ownership time, and overlap between lanes. Treat counts and timing thresholds as repository-specific. Do not publish fabricated industry benchmarks.

High overlap is not automatically bad. Smoke scenarios commonly run again in regression so late environment problems are visible. Unexplained overlap is waste. If the same expensive scenario runs in four lanes without serving four decisions, simplify. If a critical scenario runs only nightly, verify that the delay matches release risk.

A small report table per build is enough:

| Metric | Current value | Review question |
|---|---:|---|
| selected smoke scenarios | repository result | did the lane unexpectedly shrink? |
| smoke wall time | measured result | does it still meet feedback needs? |
| quarantined scenarios | measured result | which are past review date? |
| scenarios with unknown tags | measured result | typo or proposed vocabulary? |
| release capabilities represented | measured result | is business scope complete? |

Trend these values rather than reacting to one run. A sudden duration increase can mean new coverage, a slow hook, an overloaded environment, or reduced parallelism. Correlate tag groups with hook timing and infrastructure allocation before moving scenarios out of a gate.

## Use ownership tags sparingly

Capability tags often map naturally to teams and are more durable than \`@team-blue\`. Organizational names change faster than business capabilities. Keep ownership in a separate metadata map keyed by capability when possible. Then \`@checkout\` can route failures to the current checkout owner without editing every scenario after a reorganization.

If multiple teams truly own scenarios within one capability, an ownership tag may be justified. Document whether it affects selection or only notification. Tags that have no known consumer should be removed. Every tag creates cognitive and governance cost.

The [BDD frameworks comparison for 2026](/blog/bdd-frameworks-comparison-2026) helps evaluate runner and ecosystem differences before standardizing cross-language policy. If a team is new to examples, step definitions, hooks, and feature organization, the [Cucumber BDD tutorial for beginners](/blog/cucumber-bdd-tutorial-beginners) provides the foundation that this execution strategy assumes.

## Evolve the policy through reviewed changes

Treat tag vocabulary and lane expressions like test infrastructure code. A change should state the motivation, scenarios gained or lost, timing effect, and release impact. Require review from QA architecture and the affected product capability when release selection changes.

Run the old and new expressions in dry-run or non-blocking comparison mode before switching a critical gate. Produce a diff of scenario identifiers. This exposes accidental losses caused by inheritance or Boolean logic. After adoption, remove aliases by a deadline rather than supporting \`@smoke\` and \`@sanity\` forever.

Use a versioned policy file or clear documentation containing:

1. Allowed tags and dimension.
2. Admission and removal criteria.
3. Inheritance guidance.
4. CI lane expressions and failure policy.
5. Quarantine metadata and expiry rules.
6. Examples of valid and invalid combinations.
7. Owners of the policy itself.

Review it quarterly or when pipeline architecture changes. The goal is not a pristine taxonomy. The goal is predictable evidence: engineers know what ran, why it ran, what did not run, and what a green result allows them to decide.

## Shard within a lane without changing its meaning

Parallelization should divide a selected lane, not redefine it. First evaluate the complete reviewed tag expression, then distribute the resulting scenarios across workers using the runner or CI system’s supported mechanism. If each worker constructs a different tag expression, the union can develop gaps and overlaps that are hard to see.

Balance shards using measured duration history where infrastructure supports it. Scenario count alone is a poor proxy because a two-minute provider scenario and a two-second API scenario both count as one. Keep a deterministic fallback for new scenarios with no timing history, and publish the final worker manifests. A failure report should identify the lane, shard, scenario, and effective tags, not only a machine index.

Serialized scenarios need deliberate handling. A \`@serial\` tag can route them to one worker or resource pool, but it should not become an excuse for shared mutable data. Document the constraint, such as one physical device or one sandbox account, and remove the tag when the underlying resource is virtualized. Never run the same serial scenario in multiple shards while assuming the tag itself provides a lock.

The lane-level gate should combine all shards and fail if one never started, selected zero scenarios unexpectedly, or failed to upload its result. A green worker is not a green lane. Produce an aggregate manifest and compare its unique scenario identifiers with the pre-shard selection. That equality check proves distribution preserved the intended set.

## Give developers stable local commands

The CI policy should be easy to reproduce. Add named package scripts for common lanes, keep their expressions identical to reviewed CI expressions, and let developers add narrower filters explicitly for investigation. This valid package fragment assumes Cucumber-JS is installed in the project:

\`\`\`json
{
  "scripts": {
    "bdd:smoke": "cucumber-js --tags \\\"@smoke and not @quarantine\\\"",
    "bdd:api": "cucumber-js --tags \\\"@api and @regression and not @quarantine\\\"",
    "bdd:quarantine": "cucumber-js --tags \\\"@quarantine\\\""
  }
}
\`\`\`

A developer can now run \`npm run bdd:smoke\` and see the same semantic selection as the merge lane. Avoid scripts named “fast” when no policy defines fast. Names should correspond to decisions or scopes in the lane table.

Local workflows also need access to required dependencies. A tag-selected hook can start an ephemeral browser, but a payment sandbox or mobile device may require credentials and allocation. Fail early with a clear prerequisite message. Do not silently skip the scenario when a credential is absent, because a local green result would mean something different from CI.

Document how to run one scenario for diagnosis without changing committed tags. Cucumber supports location-based execution and name filtering in its documented CLI, but the team should prefer the scenario’s file location for a one-off reproduction and retain the normal tag expression in shared scripts. Adding \`@only\` or \`@debug\` to source is easy to forget and can contaminate CI policy.

Finally, test the scripts themselves during policy changes. A renamed tag may be updated in workflow YAML but missed in package scripts or scheduled jobs. Search all configuration consumers, compare selected manifests, and remove obsolete aliases in one reviewed migration.

## Frequently Asked Questions

### How many BDD tags should a scenario have?

There is no universal ideal count. A scenario needs enough independent metadata to support real consumers such as lane selection, setup, scheduling, and ownership. Three well-defined tags can be clearer than one composite label, while eight overlapping synonyms signal taxonomy trouble. Audit every tag by asking which tool or decision consumes it. Remove decorative labels, prefer inherited capability tags where accurate, and avoid adding a tag merely because a neighboring scenario has it. Consistency of meaning matters more than count.

### Should smoke scenarios also run in regression?

Usually yes, if they remain valuable evidence in the deployed regression environment. Smoke and regression serve different decisions, so intentional overlap is reasonable. The smoke lane gives fast change feedback, while regression may verify the same critical behavior with a different build, environment, or surrounding suite. Measure cost and make the overlap explicit. Do not exclude critical smoke paths from later runs solely to achieve unique counts, and do not rerun expensive scenarios repeatedly when no additional decision benefits.

### What is the safest way to quarantine a flaky scenario?

Apply one governed quarantine tag, link the defect, assign an owner, record a review or expiry date, and run the scenario in a visible non-blocking lane. Exclude it only from gates where nondeterminism destroys trust. Preserve reports and track quarantine age. Do not replace assertions, add unlimited retries, or scatter aliases such as \`@ignore\` and \`@skip-ci\`. The exit criterion should be a demonstrated deterministic fix followed by removal of the tag through review.

### How can I prove a tag expression selected the intended scenarios?

Print the final expression, produce a selected-scenario manifest before execution, and compare it with lane invariants. Include effective inherited tags and expanded scenario-outline examples. For a policy change, diff manifests from the old and new expressions in a non-blocking run. Assert that required capabilities and dependency groups are represented and that the lane is not empty. This is stronger than inspecting a green summary, which only describes scenarios that already passed selection and cannot reveal important behaviors that never ran.
`,
};
