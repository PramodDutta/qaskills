import type { SeoClusterArticle } from './seo-cluster-article';

const promptfooSiblingSlugs = [
  'promptfoo-complete-guide-2026',
  'openai-promptfoo-acquisition-explained-2026',
  'promptfoo-agent-skills-codex-claude-install-2026',
  'promptfoo-mcp-provider-security-testing-2026',
  'promptfoo-evaluate-codex-vs-claude-agents-2026',
] as const;

export const promptfooChildren2026: SeoClusterArticle[] = [
  {
    slug: 'openai-promptfoo-acquisition-explained-2026',
    clusterId: 'promptfoo',
    post: {
      title: "What OpenAI's Promptfoo Acquisition Means for Open-Source LLM Testing",
      description:
        'Separate verified OpenAI-Promptfoo acquisition facts from inference, then protect open-source LLM eval continuity with practical release controls.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'AI Testing',
      image: '/blog/pillars/promptfoo.png',
      imageAlt:
        'Open-source Promptfoo evaluation workflow passing through evidence, continuity, provider-neutrality, and release-control checkpoints after the OpenAI agreement',
      primaryKeyword: 'openai promptfoo acquisition',
      keywords: [
        'openai promptfoo acquisition',
        'Promptfoo OpenAI',
        'Promptfoo open source',
        'open-source LLM testing',
        'LLM evaluation continuity',
        'Promptfoo acquisition impact',
        'AI red teaming tools',
        'Promptfoo provider neutrality',
      ],
      contentKind: 'child',
      pillarSlug: 'promptfoo-complete-guide-2026',
      relatedSlugs: promptfooSiblingSlugs.filter(
        (slug) => slug !== 'openai-promptfoo-acquisition-explained-2026',
      ),
      sources: [
        'https://openai.com/index/openai-to-acquire-promptfoo/',
        'https://www.promptfoo.dev/blog/promptfoo-joining-openai/',
        'https://github.com/promptfoo/promptfoo',
        'https://raw.githubusercontent.com/promptfoo/promptfoo/main/LICENSE',
        'https://www.npmjs.com/package/promptfoo',
        'https://www.promptfoo.dev/docs/releases/',
      ],
      content: `**The openai promptfoo acquisition is an agreement announced on March 9, 2026, not evidence that open-source LLM testing has become OpenAI-only. OpenAI and Promptfoo explicitly said they would continue developing the open-source project, and Promptfoo said it would remain open source, keep serving users, and support a diverse range of providers and models. The same announcements also said Promptfoo technology would be integrated into OpenAI Frontier after closing. Those are the documented facts. Claims about future pricing, governance, provider favoritism, license changes, or product retirement are not established by either announcement.**

Use the [complete Promptfoo guide](/blog/promptfoo-complete-guide-2026) for the framework itself. The companion articles cover [installing Promptfoo agent skills](/blog/promptfoo-agent-skills-codex-claude-install-2026), [testing an MCP server with the MCP provider](/blog/promptfoo-mcp-provider-security-testing-2026), and [evaluating Codex against Claude coding agents](/blog/promptfoo-evaluate-codex-vs-claude-agents-2026). For an existing security workflow, read the [Promptfoo red-teaming guide](/blog/promptfoo-red-teaming-llm-applications). Reusable QA instructions are listed in the [skills directory](/skills), including the author-qualified [Playwright CLI skill](/skills/Pramod/playwright-cli).

This analysis uses the two March 9 announcements, the live Promptfoo repository, its MIT license file, and the npm registry state checked on July 14, 2026. The registry listed Promptfoo 0.121.18, and the repository remained active and publicly accessible. A package number and an active repository are a point-in-time baseline, not a promise about future releases. Recommendations below are marked as operational advice; they should not be attributed to OpenAI or Promptfoo.

## What the announcements actually establish

The [OpenAI announcement](https://openai.com/index/openai-to-acquire-promptfoo/) says OpenAI is acquiring Promptfoo and that, once the acquisition is finalized, Promptfoo technology will be integrated into OpenAI Frontier. It describes Promptfoo as an AI security platform, identifies Ian Webster and Michael D'Angelo as team leaders, and says the open-source CLI and library are used for evaluation and red teaming. It also states that the parties will continue building the open-source project while advancing enterprise capabilities inside Frontier.

The [Promptfoo announcement](https://www.promptfoo.dev/blog/promptfoo-joining-openai/) uses the more precise wording that Promptfoo had agreed to be acquired. It says the project will remain open source, users and customers will continue to be served, the open-source suite will continue to be maintained, and support for a diverse provider and model range will continue. Both announcements include the statement that closing was subject to customary closing conditions.

| Question | Explicitly stated on March 9 | Not established by the announcement |
| --- | --- | --- |
| Was there a transaction announcement? | Promptfoo agreed to be acquired by OpenAI | A public price or detailed transaction terms |
| Was closing unconditional on announcement day? | No; closing conditions were named | A closing date inferred from news coverage |
| Will OpenAI use the technology? | Integration into Frontier after closing was planned | That every open-source feature will move into Frontier |
| What happens to open source? | Both parties said development would continue | An unchangeable license or governance guarantee for all future code |
| Will non-OpenAI providers remain supported? | Promptfoo said the suite would continue supporting diverse providers and models | A permanent compatibility promise for every provider |
| What enterprise areas were named? | Security testing, development workflow integration, reporting, and traceability | Specific editions, prices, service levels, or release dates |

That table is deliberately conservative. An acquisition announcement is a source for stated intent, not a substitute for release notes, repository history, package metadata, documentation, or a signed commercial agreement. A team should use the announcement to understand direction, then use technical evidence to decide whether a dependency remains suitable.

## What changed for an open-source user on announcement day

The immediate technical contract did not become a press release. An existing repository still resolves a package version through its lockfile; its configuration still selects providers; its assertions still determine pass or fail; and its CI runner still controls credentials and network access. The acquisition matters because ownership, investment priorities, enterprise integration, and maintainer incentives can influence a project over time. It does not retroactively change a checked-in lockfile or prove that a provider adapter is biased.

As of the July 14 baseline, the [public repository](https://github.com/promptfoo/promptfoo) identifies Promptfoo as an MIT-licensed CLI and library, and its current README says the project remains open source. The [license file](https://raw.githubusercontent.com/promptfoo/promptfoo/main/LICENSE) is the direct source for the code currently covered by that license. The npm registry listed version 0.121.18. These are observable facts about current artifacts. They do not prevent a future maintainer from changing the license for future versions, introducing an enterprise-only capability, deprecating an adapter, or changing a support policy within legal limits.

For a team, the useful question is therefore not "Can we trust an acquisition?" It is "Can we detect a material change before it affects our release evidence?" That question has an engineering answer: pin versions, preserve representative provider tests, review dependency diffs, retain exports, and keep an exit path that does not depend on a proprietary result store.

## Separate facts, reasonable inferences, and unsupported claims

| Classification | Example | How to use it |
| --- | --- | --- |
| Sourced fact | OpenAI plans Frontier integration after closing | Track Frontier documentation if that product is relevant |
| Sourced fact | Promptfoo said open-source maintenance and diverse-provider support would continue | Test those properties at each approved upgrade |
| Reasonable inference | OpenAI may invest more in agent security workflows | Treat as a planning hypothesis, not a procurement promise |
| Reasonable inference | Some capabilities may be shared between open-source and enterprise work | Watch release notes and editions; do not assume direction |
| Unsupported claim | Promptfoo will stop supporting Anthropic or local models | Reject unless a first-party deprecation or code change establishes it |
| Unsupported claim | The acquisition guarantees faster fixes or stronger security | Require issue, release, and evaluation evidence |
| Unsupported claim | Open-source outputs will be sent to OpenAI | Check telemetry, sharing, network, and privacy configuration instead of guessing |

Inference is not forbidden; it is simply labeled and tested. A technical roadmap often needs hypotheses, but a release decision needs evidence. The acquisition can justify increasing monitoring without justifying a migration by itself.

## Build a continuity baseline before the next upgrade

Record the state that currently works. At minimum, capture the Promptfoo version, Node runtime, lockfile digest, configuration digest, provider identifiers, representative pass/fail cases, output format, and CI image. Store no secrets in that record. Include one test for each provider family the organization depends on and one custom or HTTP provider if portability matters.

The July package documentation requires Node.js \`^20.20.0\` or \`>=22.22.0\` and warns that Node 20 support ends on July 30, 2026. That is a near-term runtime fact independent of the acquisition. New pipelines should select a supported runtime deliberately rather than blaming ownership when an old Node image stops working.

\`\`\`bash
# Pin the currently reviewed package; do not use @latest in a release gate.
npm install --save-dev --save-exact promptfoo@0.121.18

# Capture reproducible, non-secret baseline facts.
node --version
npx promptfoo --version
npx promptfoo validate -c evals/promptfooconfig.yaml
npx promptfoo eval -c evals/promptfooconfig.yaml --no-cache --no-share -o artifacts/baseline.json
\`\`\`

The exact version is a July 14 example, not a timeless recommendation. Approve a newer version when its release, dependency, and regression evidence passes your policy. The \`--no-cache\` run is useful for a fresh baseline because cached provider responses can hide connectivity or behavior changes. Keep the output artifact access-controlled; eval exports can contain prompts, variables, raw outputs, errors, traces, and application data.

## Test provider neutrality instead of debating it

Provider neutrality has several meanings. Configuration neutrality means the tool can invoke multiple provider families. Evaluation neutrality means the same test data and oracles are applied without provider-specific advantages. Operational neutrality means results, configurations, and datasets can be retained or moved without depending on one hosted account. No announcement proves all three. A regression suite can observe them.

Create a small compatibility suite that does not ask which model is "best." It should establish that each required provider loads, receives the intended prompt variables, returns a gradeable result, respects timeout and retry policy, and exports results in the same controlled format. Use deterministic assertions for known properties such as JSON validity, required fields, forbidden secrets, and exact tool names. If a model grader is required, pin its provider and keep it independent from the target when correlated bias is a material risk.

Do not compare provider pass rates when test inputs, system prompts, sampling controls, tool permissions, or retry behavior differ accidentally. That is a harness defect, not evidence of favoritism. The [coding-agent evaluation guide](/blog/promptfoo-evaluate-codex-vs-claude-agents-2026) shows how to isolate those variables for Codex and Claude without inventing a winner.

## Add an acquisition-neutral dependency gate

The following workflow is an organizational recommendation. It reacts to any dependency change, regardless of owner. Run it on a protected branch with repository-scoped permissions and secret access limited to the eval job.

\`\`\`yaml
name: promptfoo-compatibility

on:
  pull_request:
    paths:
      - package.json
      - package-lock.json
      - evals/**

jobs:
  compatibility:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx promptfoo --version
      - run: npx promptfoo validate -c evals/promptfooconfig.yaml
      - run: npx promptfoo eval -c evals/promptfooconfig.yaml --no-cache --no-share -o artifacts/candidate.json
\`\`\`

Add artifact upload and secret environment variables according to the repository's existing CI controls. Do not copy an upload step blindly: result files may contain sensitive target responses. The release gate should compare the candidate against an approved baseline by stable test ID, not by terminal colors or a single aggregate percentage.

## Continuity risks and controls

| Risk to monitor | Evidence that matters | Preventive control | Exit signal |
| --- | --- | --- | --- |
| License change for future code | Repository license and release tag | Review license on upgrades; retain approved source/version | New terms conflict with policy |
| Provider adapter regression | Compatibility suite and release notes | Pin version; test all required providers | Required provider cannot pass controlled smoke cases |
| Hosted feature lock-in | Export format and local run behavior | Keep configs, tests, and results in portable files | Release evidence cannot be produced without an unwanted service |
| Telemetry or sharing change | Documentation, network observation, config diff | Run sensitive jobs with approved no-share/privacy settings | Undocumented outbound data or policy conflict |
| Maintainer or roadmap shift | Releases, issues, deprecations, repository activity | Quarterly dependency review | Security fixes or required runtime support stop meeting policy |
| Enterprise/open-source divergence | Edition documentation and code availability | Define required open-source capabilities explicitly | A required control moves outside approved licensing or budget |
| Supply-chain compromise | Package integrity, provenance, dependency diff | Lockfile, registry controls, malware scanning, isolated runners | Integrity mismatch or unexplained executable behavior |

These risks existed before March 9. The acquisition changes who owns the project and the announced enterprise destination; it does not eliminate ordinary open-source governance and supply-chain work. Avoid a special review that examines corporate news while ignoring transitive dependencies, install scripts, CI secrets, and untrusted configuration.

## Preserve an exit path without maintaining a premature fork

A fork is expensive. It creates security patch, release, documentation, and compatibility obligations. Do not fork merely because ownership changed. First preserve the assets that make a migration possible: test rows, prompts, target adapters, deterministic graders, expected outputs, result exports, and a neutral decision report. Keep application invocation behind a small adapter where practical.

Run a periodic restore exercise. Check out a clean runner, install the pinned package from the approved lockfile, inject test-only credentials, validate the configuration, execute a representative suite, and parse the resulting artifact without the UI. If that exercise works, continuity is demonstrable. If it depends on undocumented local state or an individual account, fix the dependency before an emergency.

A fork becomes rational when a concrete requirement cannot be met upstream and the organization accepts maintainer responsibility. Examples include a required security patch being rejected, an incompatible license for future versions, removal of a critical provider, or a deployment constraint that cannot use the supported distribution. "The acquirer also sells models" is not by itself a technical fork criterion.

## Diagnose change with evidence

When an upgrade fails, identify the boundary before attributing intent:

1. Validate configuration syntax with the pinned old and candidate versions.
2. Run one deterministic local or mock target to isolate the framework from a remote provider.
3. Run one provider connectivity test with least-privilege credentials.
4. Compare normalized inputs, outputs, errors, token metadata, retries, and timeouts.
5. Review release notes and the exact package diff.
6. Reproduce from a clean runner with caches disabled.
7. File a minimal upstream issue only after removing secrets and proprietary data.

An authentication error after a provider rotates credentials is not evidence of acquisition-driven lock-in. A Node runtime error after the published support window is not a hidden product decision. Conversely, a documented adapter removal should not be dismissed as random flakiness. Classification protects both rigor and credibility.

## Release controls for the next 90 days

### First 30 days: inventory and ownership

Name an owner for Promptfoo upgrades. Inventory every config, provider, custom assertion, red-team target, output consumer, hosted integration, and secret. Record the approved package and Node versions. Verify that every critical test has a stable ID and a source for its expected behavior.

### Days 31 to 60: compatibility and portability

Add provider smoke cases, a deterministic mock target, a clean-run restore job, and result parsing independent of the web view. Confirm that generated artifacts are access-controlled. Exercise an upgrade in a branch and document how a reviewer distinguishes product regression, grader failure, provider outage, and harness failure.

### Days 61 to 90: governance trigger review

Review the current license, repository release activity, security guidance, runtime support, provider matrix, and enterprise/open-source boundary. Decide which observable changes would trigger escalation, alternative-tool evaluation, or a fork assessment. Do not convert every roadmap change into an emergency; tie action to a named requirement.

## Common mistakes and limits

- Repeating an acquisition headline as if it were a technical migration notice.
- Claiming the project is guaranteed to remain unchanged because the announcement supports open source.
- Claiming provider bias without a controlled compatibility or evaluation test.
- Using \`@latest\` in CI, then treating an unreviewed update as evidence of instability.
- Treating an MIT license as a service-level agreement or maintenance guarantee.
- Uploading sensitive eval outputs to a shared artifact or hosted view without review.
- Forking before preserving tests, adapters, and release criteria.
- Measuring only aggregate pass rate and overlooking provider errors, missing rows, or grader failures.

This article cannot predict future governance, commercial packaging, staffing, release cadence, or model support. It can define what was said and show how to detect material technical change. Re-check the official announcements, repository, license, npm metadata, and release notes at each dependency decision.

## Frequently Asked Questions

### Did OpenAI complete the Promptfoo acquisition on March 9, 2026?

The March 9 pages announced an agreement and said closing was subject to customary conditions. This article does not infer a legal closing date beyond that published language.

### Is Promptfoo still open source?

Promptfoo's announcement said it would remain open source, the July 14 repository was public, and its current code identified an MIT license. Verify the license at the exact release you approve.

### Will Promptfoo continue supporting non-OpenAI models?

Promptfoo explicitly said the open-source suite would continue supporting a diverse range of providers and models. That is current stated intent, not a permanent compatibility guarantee for every adapter.

### Does OpenAI ownership make Promptfoo evaluation results biased?

Ownership alone does not establish result bias. Test the same datasets and independent deterministic oracles across providers, inspect grader configuration, and report any measured difference with its harness controls.

### Should a team fork Promptfoo now?

Not without a concrete unmet requirement and a maintenance plan. Pinning, compatibility tests, portable assets, and an alternative assessment usually provide lower-cost continuity first.

### What should be pinned in CI?

Pin the Promptfoo package, runtime image, lockfile, target and grader identifiers, configuration, datasets, and custom assertion code. Record the evaluated commit and artifact policy as well.

### Can the acquisition change old MIT-licensed code?

It does not retroactively remove rights already granted under the license for that code. Future versions and separately delivered services must be reviewed under their applicable terms.

### What is the most useful acquisition monitoring signal?

A controlled upgrade diff plus representative compatibility results is more actionable than commentary. It reveals whether a required provider, assertion, privacy setting, export, or runtime contract actually changed.

## Conclusion: monitor contracts, not rumors

The sourced position is straightforward: OpenAI and Promptfoo announced an acquisition agreement, planned Frontier integration, and committed in the announcement to continued open-source development; Promptfoo also stated continuity for users and diverse providers. Everything beyond those statements needs evidence or an inference label.

Protect the program with ordinary quality engineering: pin the dependency, preserve independent test oracles, verify provider compatibility, retain portable artifacts, review licenses and releases, restrict secrets, and rehearse recovery. Continue with the [Promptfoo pillar](/blog/promptfoo-complete-guide-2026) for implementation and the [agent-skill installation guide](/blog/promptfoo-agent-skills-codex-claude-install-2026) when you want coding agents to help maintain those controls.`,
    },
  },
  {
    slug: 'promptfoo-agent-skills-codex-claude-install-2026',
    clusterId: 'promptfoo',
    post: {
      title: 'Install Promptfoo Agent Skills in Codex and Claude Code',
      description:
        'Install Promptfoo agent skills in Codex and Claude Code, verify routing and config output, and govern permissions, upgrades, and repository policy.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Tutorial',
      image: '/blog/pillars/promptfoo.png',
      imageAlt:
        'Codex and Claude Code loading the reviewed Promptfoo four-skill bundle through separate project paths with validation and permission checkpoints',
      primaryKeyword: 'promptfoo agent skills',
      keywords: [
        'promptfoo agent skills',
        'Promptfoo Codex skill',
        'Promptfoo Claude Code plugin',
        'install Promptfoo skills',
        'Codex Agent Skills',
        'Claude Code skills',
        'Promptfoo eval automation',
        'Promptfoo red team skills',
      ],
      contentKind: 'child',
      pillarSlug: 'promptfoo-complete-guide-2026',
      relatedSlugs: promptfooSiblingSlugs.filter(
        (slug) => slug !== 'promptfoo-agent-skills-codex-claude-install-2026',
      ),
      sources: [
        'https://www.promptfoo.dev/docs/integrations/agent-skill/',
        'https://github.com/promptfoo/promptfoo/tree/main/plugins/promptfoo',
        'https://github.com/promptfoo/promptfoo/blob/main/.agents/plugins/marketplace.json',
        'https://github.com/promptfoo/promptfoo/blob/main/.claude-plugin/marketplace.json',
        'https://code.claude.com/docs/en/plugin-marketplaces',
        'https://code.claude.com/docs/en/slash-commands',
        'https://help.openai.com/en/articles/20001256-plugins-in-codex',
        'https://www.promptfoo.dev/docs/guides/test-agent-skills/',
        'https://www.promptfoo.dev/docs/usage/command-line/',
      ],
      content: `**Promptfoo agent skills can be installed as the official four-skill plugin bundle or copied into a project as Agent Skills. In Claude Code, the verified marketplace commands are \`/plugin marketplace add promptfoo/promptfoo\` followed by \`/plugin install promptfoo@promptfoo\`. In Codex, Promptfoo publishes the same bundle through \`.agents/plugins/marketplace.json\`; use the Codex plugin import available in your workspace, or copy the reviewed skill directories into the project's \`.agents/skills/\` directory. Do not invent a Codex slash command when your installed surface does not expose one. After either installation, inspect every \`SKILL.md\`, constrain agent permissions, generate one disposable config, run \`promptfoo validate\`, and review the diff before enabling broader work.**

The [Promptfoo complete guide](/blog/promptfoo-complete-guide-2026) explains the evaluation framework. Also read what the [OpenAI acquisition announcement means](/blog/openai-promptfoo-acquisition-explained-2026), how to [red-team an MCP server](/blog/promptfoo-mcp-provider-security-testing-2026), and how to [evaluate Codex and Claude agents](/blog/promptfoo-evaluate-codex-vs-claude-agents-2026). The [LLM evaluation CI gate guide](/blog/llm-evaluation-ci-cd-quality-gates) provides the release-policy layer. Browse [QA skills](/skills), including the [Playwright CLI skill](/skills/Pramod/playwright-cli), for related repository-owned instructions.

This tutorial reflects the official Promptfoo Agent Skills page updated July 10, 2026, the current Promptfoo source tree, Anthropic's Claude Code plugin documentation, and OpenAI's July 2026 Codex plugin guidance. Promptfoo 0.121.18 was the npm registry baseline checked July 14. The skill bundle is source content in the Promptfoo repository; the CLI package version and skill source commit should be recorded separately because they can change on different schedules.

## Know what the official bundle contains

Promptfoo currently publishes one plugin bundle with four focused skills. It intentionally does not include a meta-selector skill; the host routes from each skill's description. The bundle is represented under \`plugins/promptfoo\`, with Claude and Codex marketplace metadata in the repository.

| Skill | Documented purpose | Typical artifact to review |
| --- | --- | --- |
| \`promptfoo-evals\` | Author non-red-team suites, assertions, test cases, and result inspection | Config, prompts, test files, assertions, run command |
| \`promptfoo-provider-setup\` | Connect HTTP targets and JavaScript or Python custom providers | Target adapter, secret references, smoke call |
| \`promptfoo-redteam-setup\` | Build focused red-team configuration from endpoints, specs, or code | Purpose, inputs, plugins, strategies, exclusions |
| \`promptfoo-redteam-run\` | Execute generated probes, triage failures, and prepare narrow reruns | Result artifact, failure classification, rerun scope |

The official guidance says the bundle teaches deterministic assertions before model-graded ones, file-based tests, explicit grader providers, Nunjucks environment syntax such as \`'{{env.API_KEY}}'\`, and no-share handling for internal systems. Those instructions reduce common configuration mistakes; they do not certify the generated suite, grant credentials, or replace a domain reviewer.

## Prerequisites and version baseline

Before installation, choose the ownership and scope:

1. Decide whether the skills are project-level, personal, or distributed as a plugin.
2. Confirm the repository permits agent instruction files and name their code owners.
3. Select the Promptfoo CLI version the generated configs must target.
4. Prepare a disposable eval target with synthetic data and least-privilege credentials.
5. Ensure the host can read the skill path but cannot write or execute beyond the test's needs.
6. Establish the normal formatter, secret scanner, config validator, and CI commands.

Promptfoo's current package documentation requires Node.js \`^20.20.0\` or \`>=22.22.0\` and announces the end of Node 20 support on July 30, 2026. For a new runner, use a supported maintained Node line approved by your organization. The examples pin Promptfoo 0.121.18 because that is the verified July 14 version; update only after reviewing a later release.

Install the CLI dependency independently from the skills:

\`\`\`bash
npm install --save-dev --save-exact promptfoo@0.121.18
npx promptfoo --version
npx promptfoo validate -c evals/promptfooconfig.yaml
\`\`\`

The final command assumes a config already exists. On a new repository, use it after the agent creates the first draft. A successful schema validation does not prove that the target is reachable or that assertions encode the right requirement.

## Install the full bundle in Claude Code

Run the following commands inside Claude Code, not in a normal shell:

\`\`\`text
/plugin marketplace add promptfoo/promptfoo
/plugin install promptfoo@promptfoo
\`\`\`

Promptfoo says this installs all four current skills. The former marketplace package name \`promptfoo-evals\` represented only the eval skill; its current page instructs users of that older package to reinstall \`promptfoo@promptfoo\` for the complete bundle and future updates. Claude Code plugin skills are namespaced, so an explicit invocation can look like:

\`\`\`text
/promptfoo:promptfoo-evals Create a small eval suite for the JSON support endpoint.
Use deterministic schema and authorization assertions first. Write files only under
evals/support-json, use environment references for secrets, validate the config,
and stop before running any paid provider calls.
\`\`\`

Claude can also select a skill from the task context. Explicit invocation is useful for installation smoke testing because it removes routing ambiguity. After installation or enablement changes, follow the host's documented plugin reload flow if the current session does not see the namespace.

Anthropic's plugin documentation explains that installed marketplace plugins are copied into a local cache rather than executed in place. Review the plugin source before installation, then review the installed version or recorded source revision under your supply-chain policy. A trusted marketplace name is not a code review.

## Install in Codex through the published marketplace bundle

Promptfoo exposes the same plugin through [its Codex marketplace file](https://github.com/promptfoo/promptfoo/blob/main/.agents/plugins/marketplace.json). That file names the \`promptfoo\` plugin and points at \`./plugins/promptfoo\`. Current OpenAI guidance describes installing and managing plugins through the Codex plugin directory or workspace plugin controls; availability and installation can depend on plan, workspace, role, surface, and admin policy.

Use the marketplace import supported by your Codex workspace and select the Promptfoo plugin from that imported source. If an administrator manages plugins, ask for the skill-only bundle to be made available under the repository's normal installation policy. Review included skills before enabling them. The bundle itself does not grant app or repository permissions, but the Codex session can still have shell, filesystem, browser, MCP, or connected-app access from other configuration.

There is no portable Codex terminal command published on the Promptfoo Agent Skills page that is equivalent to Claude's two slash commands. That absence matters. Do not publish a guessed \`codex plugin install\` command. Use the installed Codex UI/workspace flow, or use the manual standards-based path below.

## Manual project installation for Codex

The official page says Codex and other Agent Skills tools discover project skills under \`.agents/skills/\`. It also says that copying only \`promptfoo-evals\` creates an eval-only setup, while copying the whole \`plugins/promptfoo/skills\` directory preserves sibling handoffs for provider and red-team work.

This shell sequence implements those documented paths from a reviewed source commit:

\`\`\`bash
git clone https://github.com/promptfoo/promptfoo.git vendor/promptfoo-source
git -C vendor/promptfoo-source checkout "$PROMPTFOO_SKILLS_COMMIT"

mkdir -p .agents/skills
cp -R vendor/promptfoo-source/plugins/promptfoo/skills/. .agents/skills/

find .agents/skills -mindepth 2 -maxdepth 2 -name SKILL.md -print
git diff -- .agents/skills
\`\`\`

Set \`PROMPTFOO_SKILLS_COMMIT\` to a commit the team reviewed; do not leave it empty in automation. The commands are an implementation recipe based on the official repository layout, not a Promptfoo installer command. If the organization vendors third-party source elsewhere, adjust only the staging location, not the Codex discovery path.

For an eval-only copy, select \`plugins/promptfoo/skills/promptfoo-evals\` and place that directory at \`.agents/skills/promptfoo-evals\`. Do not copy just \`SKILL.md\` if its references are needed. The current skill directories include reference material, and provider/red-team skills can include scripts. Preserve the complete reviewed directory.

## Manual project installation for Claude Code

Claude Code discovers project-level standalone skills under \`.claude/skills/\`. A manual full-bundle copy uses the same reviewed source but a different destination:

\`\`\`bash
mkdir -p .claude/skills
cp -R vendor/promptfoo-source/plugins/promptfoo/skills/. .claude/skills/

find .claude/skills -mindepth 2 -maxdepth 2 -name SKILL.md -print
git diff -- .claude/skills
\`\`\`

Project installation is normally preferable for a team because source control can record the exact instructions and reviewers can see changes. The Promptfoo page also documents \`~/.claude/skills/\` for personal installation, but a personal copy is harder for a repository owner to inventory and keep consistent. Do not depend on an unrecorded global skill for a release-critical workflow.

| Installation choice | Update mechanism | Team visibility | Best use |
| --- | --- | --- | --- |
| Claude marketplace plugin | Marketplace/plugin refresh | Plugin settings plus source review | Complete bundle with namespaced invocation |
| Codex marketplace plugin | Codex workspace/plugin refresh | Workspace policy and plugin details | Managed bundle where the surface supports import |
| Project \`.agents/skills/\` | Reviewed source-copy diff | High; committed with repository | Codex projects requiring explicit instruction ownership |
| Project \`.claude/skills/\` | Reviewed source-copy diff | High; committed with repository | Claude Code projects requiring explicit instruction ownership |
| Personal \`~/.claude/skills/\` | Individual manual update | Low | Private experimentation, not shared release policy |

## Review the skill as executable influence

A skill is Markdown plus references and sometimes scripts, but it can influence an agent that has powerful tools. Treat it like code. Review frontmatter descriptions, file references, suggested commands, provider examples, environment-variable handling, output-sharing behavior, generated paths, and any bundled scripts. Confirm that examples align with the CLI version pinned in the repository.

Apply four boundaries:

- The skill may propose files only in an approved eval directory.
- It may reference secrets only through approved environment-variable names.
- It may validate configs without making provider calls unless the task permits cost and data transfer.
- It may not weaken assertions, broaden red-team targets, enable sharing, or change CI release thresholds without review.

An agent can follow a good skill badly, and a good result can occur without skill use. Installation verification must cover discovery, routing, artifact quality, and normal repository checks separately.

## Run a zero-cost activation smoke test

Ask each host to create a config that uses a local fixture or an intentionally non-executed provider stub. Stop before a remote evaluation. The prompt should name scope, output, and prohibitions:

\`\`\`text
Use the promptfoo-evals skill. Inspect existing conventions first. Create an eval draft
under evals/skill-smoke for a JSON response with fields status and requestId. Use an
is-json assertion and a JavaScript assertion for the two required fields. Reference
secrets only as Nunjucks environment variables. Do not run a provider, do not share
results, and do not edit application code. Validate the config and summarize the diff.
\`\`\`

Then verify the files yourself:

\`\`\`bash
npx promptfoo validate -c evals/skill-smoke/promptfooconfig.yaml
git diff --check
git diff -- evals/skill-smoke .agents/skills .claude/skills
\`\`\`

The current Promptfoo command reference says \`promptfoo validate\` validates the configuration and test suite and exits with code 1 on validation failure. That makes it suitable for CI, but it remains structural validation. Review whether the assertion can fail for the intended defect and whether the target adapter sends the correct inputs.

## Test skill routing, not just skill presence

The official [Test Agent Skills guide](https://www.promptfoo.dev/docs/guides/test-agent-skills/) distinguishes two questions: whether the agent used the relevant skill and whether that skill produced better work. It also recommends testing routing boundaries in bundles. A request to connect an HTTP target should activate provider setup, not silently become a broad eval authoring task. A request to triage existing scan failures should not regenerate probes by default.

Create four positive prompts, one per skill, plus near-miss prompts that belong to siblings. Inspect host traces where available. Promptfoo documents a \`skill-used\` assertion for supported agent providers, but repository installation does not need to wait for a full meta-eval. A human can first inspect the selected \`SKILL.md\`, output path, and generated commands.

| Test request | Expected skill | Wrong-route signal |
| --- | --- | --- |
| Add deterministic assertions to an existing suite | \`promptfoo-evals\` | Rewrites provider transport |
| Connect a multi-field invoice HTTP endpoint | \`promptfoo-provider-setup\` | Flattens IDs and message into one prompt |
| Design RBAC and BOLA probes from an endpoint contract | \`promptfoo-redteam-setup\` | Launches a broad scan before boundary review |
| Triage existing red-team failures and prepare a narrow rerun | \`promptfoo-redteam-run\` | Regenerates all cases or edits target code |

Routing quality is part of safety. A provider setup task can expose credentials; a red-team run can incur cost and send adversarial content; an eval edit can change a release oracle. The skill description should narrow behavior, not grant blanket autonomy.

## Repository policy and ownership

Commit project skills only after third-party review. Add code ownership for \`.agents/skills/**\`, \`.claude/skills/**\`, \`evals/**\`, and CI files. Require a source URL, reviewed commit, import date, expected CLI range, and local modifications record. If your team customizes a skill, keep the patch small and explain why it exists.

A useful inventory file can be ordinary Markdown or JSON; it does not need a new tool. Record:

- Source repository and exact commit.
- Installed skill names and destination paths.
- Files changed locally after import.
- Promptfoo CLI version used by examples.
- Reviewer and review date.
- Permitted commands, directories, providers, and secret names.
- Upgrade and rollback procedure.

Do not allow an automatic dependency bot to overwrite agent instructions and merge based only on formatting. Skill changes can alter command choice, data handling, or assertion philosophy without changing executable package code.

## Upgrade without instruction drift

Marketplace installs should be refreshed through the host's documented plugin mechanism. Manual installs should be updated from a new reviewed commit into a temporary staging directory, then diffed against both upstream and local customizations. Never copy over the active directory before preserving the previous source identity.

Review these changes especially closely:

1. New scripts or executable references.
2. New provider, network, sharing, or telemetry instructions.
3. Changed secret names or inline credential examples.
4. Changed red-team plugins, strategies, test counts, or target assumptions.
5. Changed validation and run commands.
6. Changed handoff behavior among the four skills.
7. Any instruction that permits broader file edits or shell access.

After an update, repeat the activation and routing suite. Run a known config through both the old and new instruction versions in disposable workspaces if the change is material. The test should compare artifacts and verification outcomes, not style alone.

## Diagnose installation and activation failures

| Symptom | Likely boundary | Next check |
| --- | --- | --- |
| Claude cannot find \`/promptfoo:promptfoo-evals\` | Marketplace not added, plugin not installed/enabled, or session not reloaded | Inspect plugin manager and namespace, then reload through documented flow |
| Codex does not select a copied skill | Wrong discovery path, invalid frontmatter, or task does not match description | Confirm \`.agents/skills/<name>/SKILL.md\` and inspect the task wording |
| Only eval authoring appears | Old eval-only package or only one directory was copied | Install current \`promptfoo@promptfoo\` bundle or copy all four directories |
| References cannot be opened | Only \`SKILL.md\` was copied | Restore the complete skill directory including references/scripts |
| Agent writes invalid environment syntax | Skill not loaded or local edits are stale | Confirm loaded source; Promptfoo configs use \`{{env.NAME}}\` syntax |
| Validation passes but provider call fails | Schema is valid; target/auth/network is not | Run \`promptfoo validate target -c <config>\` only with approved credentials |
| Agent changes application code | Prompt scope or host permissions are too broad | Stop, inspect diff, narrow allowed paths, and rerun in a disposable branch |
| Upgrade removes local policy | Upstream copy overwrote customization | Restore from source control and adopt a staged three-way review |

Do not fix discovery by placing duplicate skills in every global and project directory. Duplicate names make source selection harder to explain. Choose one authoritative project path per host, or document precedence explicitly.

## CI and release controls

CI should validate artifacts created with the skill, not execute the skill itself on every merge. Pin the CLI, run \`promptfoo validate\`, execute an approved small suite, retain controlled output, and run the repository's normal tests. Agent generation belongs in a reviewed change; deterministic verification belongs in the gate.

\`\`\`yaml
name: eval-config-gate

on:
  pull_request:
    paths:
      - evals/**
      - .agents/skills/**
      - .claude/skills/**

jobs:
  validate:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx promptfoo validate -c evals/promptfooconfig.yaml
\`\`\`

Add live eval execution only when its data, cost, provider credentials, and output retention are approved. A skill update should not silently increase the number of calls or add model-graded assertions to a per-commit gate.

## Mistakes and limitations

- Confusing Agent Skills with the Promptfoo CLI; both must be installed and versioned appropriately.
- Publishing a guessed Codex installation command instead of using the current plugin UI or documented \`.agents/skills/\` path.
- Installing the former eval-only Claude package and expecting red-team handoffs.
- Copying only \`SKILL.md\` while omitting references or scripts.
- Giving the host unrestricted shell and write access because the skill text looks safe.
- Accepting generated \`llm-rubric\` assertions when deterministic checks can prove the requirement.
- Letting an agent run paid or sensitive targets during an installation smoke test.
- Updating skills from a moving branch without recording a commit and reviewing the diff.

Agent Skills improve context and workflow consistency; they do not make model output deterministic, prove test completeness, or authorize actions. Host behavior, plugin availability, discovery paths, and permission prompts can differ by Codex or Claude Code version and workspace policy. Re-check the official pages before distributing installation instructions.

## Frequently Asked Questions

### How many Promptfoo agent skills are in the current bundle?

Four: eval authoring, provider setup, red-team setup, and red-team execution/triage. The current bundle intentionally has no selector skill.

### What are the verified Claude Code install commands?

Use \`/plugin marketplace add promptfoo/promptfoo\`, then \`/plugin install promptfoo@promptfoo\` inside Claude Code.

### Where should Promptfoo skills live in a Codex project?

For a manual project install, place each complete skill directory under \`.agents/skills/<skill-name>/\` so its \`SKILL.md\` and references remain together.

### Is there an official Promptfoo Codex shell install command?

The July Promptfoo page documents the Codex marketplace bundle and manual \`.agents/skills/\` destination, but it does not publish a portable shell command equivalent to Claude's slash commands. Use the installed Codex plugin workflow or manual copy.

### Should the skills be committed to source control?

Promptfoo recommends committing project skills so teammates receive them. Do so only after source review, with the upstream commit, owner, and local changes recorded.

### How do I verify the skill was actually used?

Start with explicit invocation in Claude or a task that clearly matches the Codex skill description. For automated comparison, Promptfoo's supported agent providers expose skill-use evidence and a \`skill-used\` assertion.

### Can a skill safely receive API keys?

The generated config should reference approved environment variables, not contain keys. The host and CI still need least-privilege secret injection and output controls.

### How should I update a manual installation?

Fetch a reviewed upstream commit into staging, diff it against the installed source and local changes, rerun routing and validation checks, then merge through normal code review.

## Conclusion: install instructions and controls together

The reliable installation is not merely a copied folder. It is a reviewed source revision, the correct host discovery path, constrained permissions, an activation test, valid Promptfoo configuration, CI verification, and an upgrade owner. Use the full marketplace bundle when you need eval, provider, and red-team handoffs; use a manual project copy when repository-level visibility is more important.

Continue with the [Promptfoo MCP provider tutorial](/blog/promptfoo-mcp-provider-security-testing-2026) for a concrete security target, or use the [Codex versus Claude evaluation guide](/blog/promptfoo-evaluate-codex-vs-claude-agents-2026) to test whether the installed skill changes agent behavior under controlled conditions.`,
    },
  },
  {
    slug: 'promptfoo-mcp-provider-security-testing-2026',
    clusterId: 'promptfoo',
    post: {
      title: "Test and Red-Team an MCP Server with Promptfoo's MCP Provider",
      description:
        'Configure Promptfoo MCP provider tests for local and remote servers, add authorization and threat cases, and gate safe results in CI.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Tutorial',
      image: '/blog/pillars/promptfoo.png',
      imageAlt:
        'Promptfoo MCP provider security harness exercising local and remote tool calls through authentication, assertion, red-team, diagnostic, and CI stages',
      primaryKeyword: 'promptfoo mcp provider',
      keywords: [
        'promptfoo mcp provider',
        'MCP server testing',
        'MCP security testing',
        'MCP red teaming',
        'Promptfoo MCP configuration',
        'MCP tool assertions',
        'MCP authorization testing',
        'MCP CI testing',
      ],
      contentKind: 'child',
      pillarSlug: 'promptfoo-complete-guide-2026',
      relatedSlugs: promptfooSiblingSlugs.filter(
        (slug) => slug !== 'promptfoo-mcp-provider-security-testing-2026',
      ),
      sources: [
        'https://www.promptfoo.dev/docs/providers/mcp/',
        'https://www.promptfoo.dev/docs/red-team/configuration/',
        'https://www.promptfoo.dev/docs/configuration/expected-outputs/',
        'https://www.promptfoo.dev/docs/configuration/expected-outputs/javascript/',
        'https://www.promptfoo.dev/docs/integrations/ci-cd/',
        'https://www.promptfoo.dev/docs/configuration/outputs/',
        'https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization',
        'https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices',
      ],
      content: `**The promptfoo mcp provider treats an MCP server itself as the target under test. Configure \`id: mcp\`, point \`config.server\` at a local command or remote URL, and send each prompt as a JSON tool call containing \`tool\` and \`args\`. Start with deterministic contract, authorization, and error assertions. Then add a focused Promptfoo red-team configuration for risks supported by the server's actual tools and data. Keep credentials in environment references, filter destructive tools, run against an isolated tenant, and retain restricted result artifacts. The provider does not emulate a complete model-driven agent: it directly invokes MCP tools, and the official documentation lists JSON tool-call input and JSON-string responses among its current limits.**

Start with the [Promptfoo pillar](/blog/promptfoo-complete-guide-2026), then review the [OpenAI-Promptfoo acquisition facts](/blog/openai-promptfoo-acquisition-explained-2026), [Promptfoo Agent Skills installation](/blog/promptfoo-agent-skills-codex-claude-install-2026), and the [Codex versus Claude agent harness](/blog/promptfoo-evaluate-codex-vs-claude-agents-2026). The existing [Promptfoo red-team guide](/blog/promptfoo-red-teaming-llm-applications) covers broader application testing. Browse the [QA skills directory](/skills) and the [Playwright CLI skill](/skills/Pramod/playwright-cli) for adjacent automation workflows.

This tutorial follows the official MCP provider page updated July 7, 2026, Promptfoo 0.121.18 as the July 14 package baseline, the current Promptfoo CLI and CI documentation, and the November 25, 2025 MCP authorization specification. Configuration names below come from those sources. Threat selection, environment design, approval rules, and release thresholds are recommendations for your system; Promptfoo cannot infer them from the protocol alone.

## Understand the provider boundary

Promptfoo exposes two related MCP capabilities. The dedicated \`mcp\` provider makes a server the direct target and expects JSON tool-call prompts. A separate MCP integration can give another model provider access to MCP tools. Use the dedicated provider when you need repeatable server-level tests for tool discovery, argument handling, authorization, output, errors, and red-team probes. Use a model-plus-MCP integration when the decision-making behavior of the agent and its tool orchestration are part of the test object.

| Boundary | Dedicated \`mcp\` provider | Model provider with MCP integration |
| --- | --- | --- |
| Target under test | MCP server and its tools | Model or agent using MCP tools |
| Test input | JSON object with \`tool\` and \`args\` | Natural-language or provider-specific messages |
| Best evidence | Tool result, error, metadata, authorization behavior | Tool choice, sequence, model output, trace |
| Main use | Contract, negative, access-control, server red-team tests | Agent planning, tool selection, end-to-end behavior |
| Important limit | Does not prove an agent will choose the right tool | Adds model nondeterminism and a larger diagnostic surface |

Do not claim an agent is secure because direct tool calls pass. An agent may select a dangerous tool, construct different arguments, reveal data in its final response, or combine several individually permitted operations. Conversely, a model refusal does not prove the MCP server enforces authorization. Test both layers when both carry risk.

## Prerequisites and safe baseline

You need a running local or remote MCP server, Promptfoo, representative test identities and objects, and a disposable environment. The current Promptfoo package requires Node.js \`^20.20.0\` or \`>=22.22.0\`; its documentation also announces the end of Node 20 support on July 30, 2026. Pin the CLI and choose a supported CI runtime intentionally.

Before a first call, inventory:

1. Server transport and startup command or HTTPS URL.
2. Tool names, JSON schemas, side effects, and data classifications.
3. User roles, tenant identifiers, object ownership, and denied operations.
4. Authentication method, token audience, scopes, and expiry behavior.
5. Seed/reset procedure and proof that the target is non-production.
6. Result fields safe to retain, redact, or discard.
7. Timeout and concurrency limits that protect downstream systems.

Use synthetic object IDs that still preserve ownership relationships. A BOLA test needs an object belonging to a different test user; replacing every identifier with the same dummy value removes the boundary the test is meant to exercise.

## Configure a local MCP server

The smallest official shape sets \`id: mcp\`, enables the provider, and gives a command plus arguments. This example adds a narrow tool allowlist and deterministic cases. Replace the server file and tool schema with your implementation.

\`\`\`yaml
# yaml-language-server: $schema=https://promptfoo.dev/config-schema.json
description: Local invoice MCP contract tests

providers:
  - id: mcp
    label: invoice-mcp-local
    config:
      enabled: true
      server:
        command: node
        args: ['dist/mcp-server.js']
        name: invoice-test-server
      tools: ['get_invoice', 'list_invoices']
      exclude_tools: ['delete_invoice', 'refund_invoice']
      timeout: 60000

prompts:
  - '{{toolCall}}'

tests:
  - description: Owner can read a seeded invoice
    vars:
      toolCall: '{"tool":"get_invoice","args":{"user_id":"USER-A","invoice_id":"INV-A-100"}}'
    assert:
      - type: is-json
      - type: contains
        value: 'INV-A-100'

  - description: Unknown tool fails without invoking another tool
    vars:
      toolCall: '{"tool":"not_a_real_tool","args":{}}'
    assert:
      - type: contains
        value: 'not found'
\`\`\`

The unknown-tool message is based on the provider's documented error class, but exact error text can evolve. Prefer a structured error transform or a stable error field if your release gate must survive wording changes. A \`contains\` assertion against prose is acceptable for a smoke check, not a durable authorization oracle.

Tool filtering reduces what Promptfoo can call through this provider. It is not server-side authorization. Keep destructive tools disabled in the test credential and target environment even when \`exclude_tools\` is configured. Defense must survive a different client.

## Connect a remote server without embedding secrets

For a URL-based server, Promptfoo supports headers and an \`auth\` block. The current provider documentation covers bearer, basic, API-key, and OAuth configurations. Prefer the method the server officially implements. This example uses a short-lived bearer token injected through the environment:

\`\`\`yaml
providers:
  - id: mcp
    label: invoice-mcp-remote
    config:
      enabled: true
      server:
        url: https://mcp-test.example.internal/mcp
        name: invoice-test-remote
        auth:
          type: bearer
          token: '{{env.MCP_BEARER_TOKEN}}'
        headers:
          X-Test-Tenant: '{{env.MCP_TEST_TENANT}}'
      tools: ['get_invoice', 'list_invoices']
      timeout: 60000
      pingOnConnect: true
\`\`\`

Do not commit a token, API key, Basic password, OAuth client secret, or copied session cookie. Masking a value in console output does not remove it from a config, process environment, child process, debug log, result artifact, shell history, or crash report. Use a CI secret store, test-only account, minimal scopes, and a token lifetime bounded to the run.

The MCP authorization specification requires audience-bound tokens and forbids token passthrough to upstream APIs. A server must validate that an access token was issued for that server. Promptfoo can exercise valid, missing, expired, wrong-audience, and insufficient-scope cases, but the harness cannot prove server implementation merely by reading configuration. Seed credentials that represent each condition and assert the observed denial.

## Turn tool contracts into deterministic cases

Build a matrix from the tool schema and business policy. Every test should state actor, object, operation, input boundary, expected result class, and expected state change. Test success and failure separately.

| Case family | Example | Primary oracle |
| --- | --- | --- |
| Required arguments | Omit \`invoice_id\` | Structured invalid-arguments error; no side effect |
| Type and range | Negative refund amount | Schema or domain rejection |
| Unknown fields | Add unrecognized \`admin\` flag | Field rejected or ignored according to contract |
| Object ownership | User A requests User B invoice | Authorization denial and no sensitive fields |
| Function authorization | Read-only role calls refund tool | Function-level denial and no mutation |
| State transition | Refund already-refunded invoice | Idempotent/domain error; ledger unchanged |
| Injection boundary | SQL-like string in search field | Treated as data; no expanded result set |
| Output minimization | List invoices for a user | Only approved fields and owned objects returned |
| Timeout/cancellation | Controlled slow fixture | Bounded error with no duplicate side effect |
| Replay/idempotency | Repeat request with same key | Contract-defined result and single mutation |

Use \`is-json\`, schema assertions, exact field comparisons, and JavaScript assertions before a model grader. Authorization, ownership, amount, state, and tool name are deterministic facts. An LLM rubric can help judge a free-text explanation, but it should not decide whether User A was allowed to read User B's record.

When an MCP result contains nested content blocks or \`structuredContent\`, the provider supports \`transformResponse\`. A transform can promote a stable result field into \`output\` and retain selected metadata. Keep the transform in a reviewed file when it becomes more than a short expression, and unit-test it independently.

\`\`\`javascript
// evals/mcp/normalize-result.js
module.exports = (result, content, context) => ({
  output: JSON.stringify({
    tool: context.toolName,
    data: result.structuredContent || null,
    text: content,
  }),
  metadata: {
    toolName: context.toolName,
  },
});
\`\`\`

Reference it as \`transformResponse: 'file://evals/mcp/normalize-result.js'\`. The documented transform receives \`result\`, normalized \`content\`, and a context with tool name, arguments, and original payload. Avoid copying raw arguments into retained metadata when they may contain secrets or personal data.

## Add focused authorization assertions

For each protected tool, create at least four identities: authorized owner, authenticated non-owner, authenticated wrong role, and unauthenticated or invalid-token caller. If the transport cannot vary credentials per test in one provider instance, define separate provider configurations whose secrets map to distinct CI jobs or configs. Do not simulate authorization only by changing a \`user_id\` argument while reusing an administrator token; that tests input trust, not real identity enforcement.

Assert both response and state. A tool that returns "forbidden" after performing the mutation is still vulnerable. Read back the affected object through an independent test fixture or service API, or inspect an audit sink designed for testing. Keep this verifier outside the MCP tool under test when feasible, so one broken implementation does not validate itself.

Denied responses should not reveal whether a cross-tenant object exists unless policy permits it. Compare error shape and timing cautiously; exact timing equality is rarely realistic, but gross differences can identify an enumeration channel worth investigation. Do not invent a universal latency threshold. Establish a controlled baseline on your infrastructure.

## Red-team the real server boundary

Promptfoo's red-team configuration names targets, purpose, plugins, strategies, and test count. The MCP provider page currently recommends considering PII, broken function-level authorization, broken object-level authorization, and SQL injection for MCP systems where those risks apply. Select plugins from actual tools and data, not from a generic checklist.

\`\`\`yaml
# yaml-language-server: $schema=https://promptfoo.dev/config-schema.json
description: Invoice MCP focused red team

targets:
  - id: mcp
    label: invoice-mcp-redteam
    config:
      enabled: true
      server:
        url: https://mcp-test.example.internal/mcp
        auth:
          type: bearer
          token: '{{env.MCP_BEARER_TOKEN}}'
      tools: ['get_invoice', 'search_invoices']
      exclude_tools: ['delete_invoice', 'refund_invoice']

redteam:
  purpose: >-
    Test-only invoice tools for signed-in customers. A caller may read only invoices
    owned by the caller's test tenant. The server must not expose another customer's
    invoice, hidden fields, credentials, or administrative functions.
  plugins:
    - pii
    - bfla
    - bola
    - sql-injection
  strategies:
    - basic
  numTests: 25
\`\`\`

The plugin names and \`numTests\` example match the current provider documentation; they are not a claim that 25 probes provide comprehensive coverage. Review generated probes before execution. A red-team generator may produce irrelevant, malformed, duplicate, or unsafe inputs. Keep the target isolated and remove destructive tools rather than relying on generated text to stay harmless.

Run the current workflow with a pinned local dependency:

\`\`\`bash
npx promptfoo validate -c evals/mcp/redteam-config.yaml
npx promptfoo redteam generate -c evals/mcp/redteam-config.yaml
npx promptfoo redteam eval -c evals/mcp/redteam.yaml --no-cache --no-share -o artifacts/mcp-redteam.json
\`\`\`

Promptfoo documents \`redteam run\` as a shortcut that generates and evaluates. Splitting generation and evaluation is useful when policy requires probe review. Confirm command options against the pinned CLI help, because generated-file arguments and defaults can change. Never interpret an attack success rate without separating target failures, grader errors, connection errors, and excluded or malformed cases.

## Threat cases beyond generated probes

Generated red teaming complements, but does not replace, hand-authored protocol and domain tests. Add cases for:

- Tool-name confusion and near-collision.
- Oversized or deeply nested arguments.
- Unicode normalization in identifiers.
- Duplicate keys and ambiguous serialization at HTTP boundaries.
- Cross-tenant IDs, stale sessions, and revoked roles.
- Wrong-audience and expired access tokens.
- Concurrent mutations and replayed idempotency keys.
- Tool output containing instructions that could influence an upstream agent.
- Error responses that echo secrets, stack traces, filesystem paths, or SQL.
- Downstream timeout after the operation commits but before the response returns.

The direct provider can observe server response, but agent prompt-injection resistance requires a model-plus-MCP test. A malicious tool result may be harmless in a direct JSON assertion and dangerous when an agent treats it as instructions. Preserve that distinction in the threat model.

## Authentication and secret controls

For static test credentials, prefer a purpose-built account with no production access. For OAuth, use explicit token endpoints where possible, short-lived tokens, minimal scopes, and a resource/audience bound to the MCP server. Promptfoo's provider supports OAuth client-credentials and password-grant configuration, but protocol support does not make the password grant a recommended design. Follow the server's current authorization architecture and organizational security standard.

Avoid query-parameter API keys unless the server requires them; URLs can appear in logs and intermediaries. Keep \`debug\` and \`verbose\` off in normal CI. If diagnostics require them, run a minimal case with synthetic inputs and inspect logs before retention or sharing. Rotate a credential after any uncertain exposure.

## CI and release controls

Use two lanes. A small deterministic contract suite can run on every relevant change. Broader red-team scans should run on a schedule, before high-risk releases, and after tool, authorization, retrieval, or policy changes. Both lanes need explicit target identity and a reset step.

\`\`\`yaml
name: mcp-security-gate

on:
  pull_request:
    paths:
      - mcp-server/**
      - evals/mcp/**

jobs:
  contract:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run seed:mcp-test
      - run: npx promptfoo validate -c evals/mcp/promptfooconfig.yaml
      - run: npx promptfoo eval -c evals/mcp/promptfooconfig.yaml --no-cache --no-share -o artifacts/mcp-contract.json
        env:
          MCP_BEARER_TOKEN: \${{ secrets.MCP_BEARER_TOKEN }}
\`\`\`

\`npm run seed:mcp-test\` is a repository-owned illustrative script, not a Promptfoo command. Implement it to fail closed unless the target proves it is the intended disposable environment. The example uses GitHub's encrypted-secret expression for the bearer token; adapt secret injection to the selected CI platform. Add artifact retention only after reviewing content.

Release criteria should be case-based: no unauthorized state change, no cross-tenant disclosure, no unexpected tools, and no unclassified execution errors. Aggregate scores can supplement those invariants but should not average away a critical authorization failure.

## Diagnose failures by layer

| Symptom | Likely layer | Next action |
| --- | --- | --- |
| Connection refused | Server startup, URL, transport, or network | Run server health check and inspect command/URL from the same runner |
| Invalid JSON prompt | Harness input | Validate the exact \`tool\` and \`args\` serialization |
| Tool not found | Name mismatch, filter, or server discovery | Inspect available tools with safe debug logging; compare exact name |
| Every call is unauthorized | Missing/expired token, audience, scope, or test tenant | Decode only non-secret token metadata safely; inspect server auth logs |
| Cross-tenant call succeeds | Server authorization defect or admin credential misuse | Stop the run, preserve minimal evidence, verify credential role and state |
| Timeout after progress | Tool duration or timeout policy | Use documented timeout/reset controls and inspect whether side effect committed |
| Assertion cannot parse output | Response shape or transform defect | Save a redacted sample and unit-test \`transformResponse\` |
| Red-team score changes with no code change | Generated probes, grader, provider, data, or environment changed | Compare probe IDs, grader config, target revision, and errors before concluding regression |
| CI passes while local fails | Cached outputs, different config root, secrets, or server build | Use \`--no-cache\`, print versions, and compare normalized non-secret configuration |

Promptfoo documents \`MCP_DEBUG\`, \`MCP_VERBOSE\`, and provider \`debug\`/\`verbose\` controls. Enable them only for a narrow diagnostic run. Detailed tool arguments and results can be sensitive.

## Mistakes and limits

- Sending natural language to the dedicated provider instead of the required JSON tool-call shape.
- Treating client-side \`exclude_tools\` as server authorization.
- Testing User B's object with an administrator token and calling the result a BOLA test.
- Enabling destructive tools in a shared environment for generated red teaming.
- Using an LLM grader for exact ownership, amount, state, or schema facts.
- Committing bearer tokens or API keys in YAML.
- Running \`redteam run\` without reviewing generated probes and target scope.
- Comparing aggregate scores while ignoring connection and grader errors.
- Claiming direct MCP tests prove agent tool-selection or prompt-injection safety.

The current provider requires standard MCP servers, uses JSON tool-call prompts, depends on remote server implementation for URL support, and returns tool responses as JSON strings according to its documented limitations. Protocol and provider features can evolve; re-check the official page and pinned CLI help during upgrades.

## Frequently Asked Questions

### What input format does the Promptfoo MCP provider require?

Each prompt must be JSON with a \`tool\` name and an \`args\` object. Natural-language agent instructions belong in a model provider test, not this direct provider.

### Can it start a local MCP server?

Yes. Configure \`server.command\` and \`server.args\`. Promptfoo also supports a remote \`server.url\` configuration.

### How should remote credentials be supplied?

Use the documented \`auth\` or header configuration with environment references, least-privilege test credentials, and restricted logs. Never commit the value.

### Does \`exclude_tools\` secure the MCP server?

No. It limits tools exposed through that provider configuration. The server must independently authenticate, authorize, validate, and audit every call.

### Which red-team plugins should I use?

Choose from the actual threat model. PII, BFLA, BOLA, and SQL injection are current MCP documentation examples, not a mandatory universal set.

### Should I use \`redteam run\` in CI?

It combines generation and evaluation. Use separate generate/review/eval stages when probe approval matters, and keep broad scans outside the fastest pull-request lane.

### How do I test OAuth audience validation?

Prepare a token issued for the MCP server and a controlled wrong-audience token, then assert acceptance and rejection respectively. Do not pass production tokens through the test.

### Does a passing direct provider suite prove the whole MCP agent is safe?

No. It proves observed server behavior for those tool calls. Test the model or agent layer separately for tool selection, sequencing, prompt injection, and final-response handling.

## Conclusion: test the server and the agent as different systems

The dedicated MCP provider is strongest when used as a precise server harness: explicit tool, explicit arguments, explicit identity, deterministic result and state assertions, and controlled negative cases. Red-team generation adds adversarial breadth after the boundary is defined. Neither layer excuses weak server authorization or unrestricted test credentials.

Build the small contract suite first, add focused threats, preserve generated-probe provenance, and gate critical invariants rather than averages. Then use the [coding-agent evaluation guide](/blog/promptfoo-evaluate-codex-vs-claude-agents-2026) if a model's choice and handling of MCP tools also need evidence.`,
    },
  },
  {
    slug: 'promptfoo-evaluate-codex-vs-claude-agents-2026',
    clusterId: 'promptfoo',
    post: {
      title: 'Evaluate Codex vs Claude Coding Agents with Promptfoo',
      description:
        'Build a fair Promptfoo coding-agent evaluation for Codex and Claude using controlled tasks, sandboxes, graders, repeated trials, and review.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/promptfoo.png',
      imageAlt:
        'Promptfoo comparison harness sending matched repository tasks to isolated Codex and Claude agents with deterministic graders and repeated-trial review',
      primaryKeyword: 'promptfoo coding agent evaluation',
      keywords: [
        'promptfoo coding agent evaluation',
        'Codex vs Claude evaluation',
        'AI coding agent benchmark',
        'Promptfoo Codex SDK',
        'Promptfoo Claude Agent SDK',
        'coding agent test harness',
        'agent evaluation metrics',
        'coding agent reproducibility',
      ],
      contentKind: 'child',
      pillarSlug: 'promptfoo-complete-guide-2026',
      relatedSlugs: promptfooSiblingSlugs.filter(
        (slug) => slug !== 'promptfoo-evaluate-codex-vs-claude-agents-2026',
      ),
      sources: [
        'https://www.promptfoo.dev/docs/guides/evaluate-coding-agents/',
        'https://www.promptfoo.dev/docs/providers/openai-codex-sdk/',
        'https://www.promptfoo.dev/docs/providers/claude-agent-sdk/',
        'https://www.promptfoo.dev/docs/guides/test-agent-skills/',
        'https://www.promptfoo.dev/docs/configuration/expected-outputs/',
        'https://www.promptfoo.dev/docs/configuration/outputs/',
        'https://www.promptfoo.dev/docs/integrations/ci-cd/',
        'https://developers.openai.com/codex/sdk/',
        'https://platform.claude.com/docs/en/agent-sdk/overview',
      ],
      content: `**A promptfoo coding agent evaluation should compare complete agent systems, not brand names or isolated chat answers. Promptfoo currently supports \`openai:codex-sdk\` and \`anthropic:claude-agent-sdk\` providers, so the same task set can exercise repository reading, structured output, and controlled tool use. Fairness requires matched repository snapshots, task instructions, allowed capabilities, verification, time and budget policy, and repeated fresh trials. Grade final repository behavior with deterministic tests and hidden checks before using a model judge. Report distributions, errors, cost coverage, and review notes; do not publish a winner from one run or from unsupported head-to-head claims.**

Read the [Promptfoo complete guide](/blog/promptfoo-complete-guide-2026), the [OpenAI-Promptfoo acquisition analysis](/blog/openai-promptfoo-acquisition-explained-2026), the [Agent Skills installation guide](/blog/promptfoo-agent-skills-codex-claude-install-2026), and the [MCP provider security tutorial](/blog/promptfoo-mcp-provider-security-testing-2026) for the rest of this cluster. The existing [non-deterministic AI-agent testing guide](/blog/ai-agent-testing-non-deterministic-guide) explains why one pass is weak evidence. Explore the [skills directory](/skills) and [Playwright CLI skill](/skills/Pramod/playwright-cli) for reusable QA workflows.

The provider and configuration facts below were verified against Promptfoo documentation updated July 14, 2026, with Promptfoo 0.121.18 as the registry baseline. The current coding-agent guide covers the OpenAI Codex SDK, Codex app-server, Claude Agent SDK, OpenCode SDK, and plain-model baselines. This article narrows the experiment to the Codex SDK and Claude Agent SDK because they are the closest CI-oriented coding-agent surfaces. Model IDs, prices, and capabilities can change; pin and record what you actually run.

## Define the comparison claim before choosing tasks

"Codex versus Claude" is not one measurable question. A coding agent includes model, SDK, system instructions, tools, permissions, working directory, authentication, network policy, session state, retries, and host behavior. Change several at once and the result cannot explain why one output differed.

Choose one bounded claim, for example:

- Which configured agent finds more seeded authorization defects in a read-only TypeScript repository?
- Which agent produces a patch that passes the same hidden unit and integration tests?
- Which agent follows a repository policy without editing forbidden paths?
- Which agent invokes a required local skill for the correct tasks and avoids it for near-miss tasks?
- Which agent reaches an acceptable result with lower measured latency or known cost under matched controls?

Do not claim a universal "best coding agent" from these experiments. Results apply to the named models, provider versions, harness, tasks, permissions, and date. A model update, SDK release, different reasoning setting, or changed repository can reverse a narrow result without invalidating the earlier observation.

## Current provider boundaries

Promptfoo's official guide says agent evaluations differ from ordinary model calls because nondeterminism compounds across tool decisions, intermediate steps matter, and the harness controls capability. A plain model cannot be prompted into filesystem access. The SDK provider is therefore part of the test object.

| Dimension | OpenAI Codex SDK provider | Claude Agent SDK provider | Fairness action |
| --- | --- | --- | --- |
| Provider ID | \`openai:codex-sdk\` | \`anthropic:claude-agent-sdk\` | Record exact Promptfoo and SDK versions |
| Working directory | Explicit; relative to config directory | Explicit; relative to config directory | Start from byte-identical snapshots |
| Default write posture | Filesystem sandbox policy; use read-only for inspection | Working directories are read-only until write tools are enabled | Match effective capabilities, not option names |
| Structured output | \`output_schema\`; returned to assertions as a string | \`output_format\`; may reach assertions as parsed data | Normalize before grading |
| Tool evidence | Streaming/tracing can capture shell, MCP, search, and file events | Tool calls and metadata can be surfaced | Require traces only when path matters |
| Authentication | Codex login state or API credentials according to provider setup | API key or existing Claude Code session with precheck disabled | Use separate least-privilege test identities |
| Session state | Can persist threads under documented controls | Sessions can persist unless disabled | Disable persistence for independent trials |
| Cost field | Estimate depends on known pricing metadata; some models may be undefined | Depends on SDK/provider usage metadata | Report missing cost, never convert it to zero |

Equivalent capability is more important than identical syntax. A Codex read-only sandbox and a Claude working directory with no write/Bash tools can both support a repository review, even though their configuration fields differ. For patch tasks, create disposable copies and explicitly permit only the necessary edit and test commands on each side.

## Prerequisites and version record

Create a manifest before the first run:

1. Promptfoo version and package integrity from the lockfile.
2. \`@openai/codex-sdk\` and \`@anthropic-ai/claude-agent-sdk\` versions.
3. Agent model identifiers and relevant reasoning/effort settings.
4. Base repository commit and fixture archive digest.
5. Task dataset version, hidden verifier version, and exclusion rules.
6. Effective filesystem, shell, network, search, MCP, and secret permissions.
7. Runner image, CPU architecture, operating system, and time limit.
8. Authentication route and billing account class without recording credentials.
9. Cache, retry, session-persistence, and repeated-trial settings.
10. Result and trace retention policy.

Promptfoo currently requires Node.js \`^20.20.0\` or \`>=22.22.0\` and warns that Node 20 support ends July 30, 2026. Its Codex provider page says the SDK package is optional and must be installed when omitted; the current page also gives a minimum SDK for its newest documented model. The Claude provider similarly requires \`@anthropic-ai/claude-agent-sdk\`. Pin reviewed versions rather than relying on transitive optional dependencies.

\`\`\`bash
npm install --save-dev --save-exact \\
  promptfoo@0.121.18 \\
  @openai/codex-sdk@0.144.0 \\
  @anthropic-ai/claude-agent-sdk@0.3.161

npx promptfoo --version
npm ls promptfoo @openai/codex-sdk @anthropic-ai/claude-agent-sdk
\`\`\`

Those SDK versions are compatibility baselines documented by the current provider pages for specific capabilities, not recommendations that they remain latest. Resolve and review the lockfile on the evaluation date. If the selected model requires a newer SDK, update the manifest and rerun all agents rather than changing one side mid-study.

## Design tasks that have objective evidence

A useful task includes a starting repository, a user request, allowed operations, forbidden operations, expected externally observable behavior, and a verifier. It must be solvable without hidden context that one agent happens to receive.

Use several task families:

| Family | Example task | Strong verifier | Leakage risk |
| --- | --- | --- | --- |
| Defect discovery | Find seeded tenant-isolation bugs | Exact issue IDs mapped to seeded defects | Filenames or comments reveal seeds |
| Small repair | Fix parser handling of duplicate keys | Hidden unit tests plus unchanged public tests | Hidden cases accidentally committed |
| Feature work | Add bounded retry with cancellation | Contract tests, type checks, integration test | Prompt mirrors hidden assertions too closely |
| Policy adherence | Modify only \`src/parser/**\` | Diff allowlist and normal tests | Repository instructions differ by agent |
| Skill routing | Use review skill only for security review | Skill-use trace plus output quality | Skill exists in one host path only |
| Diagnosis | Explain a failing deterministic test | Root-cause label and cited evidence | Agent can read answer in fixture history |

Avoid trivia, generic code generation, and tasks where a human cannot define success. "Improve this repository" invites incomparable scope. "Fix the seeded duplicate-key acceptance without changing public API; pass hidden parser tests; do not edit fixtures" is measurable.

Do not expose hidden tests to the agent's working directory if they are intended to verify generalization. Run them after the agent stops. Public tests can remain visible as normal developer feedback. Use multiple repositories or task shapes so one framework convention does not dominate the study.

## Start with a read-only harness

Read-only defect discovery is the easiest fair baseline because both providers can inspect the same immutable snapshot without coordinating writes. The config below uses provider-specific structured-output fields and one shared schema repeated explicitly. It uses current model examples from Promptfoo's provider documentation; replace them only with model IDs supported and approved at run time.

\`\`\`yaml
# yaml-language-server: $schema=https://promptfoo.dev/config-schema.json
description: Read-only coding-agent defect discovery

prompts:
  - |
    Review the repository for the security defects described in {{task}}.
    Do not modify files, run network calls, or claim a defect without file evidence.
    Return only the required structured result.

providers:
  - id: openai:codex-sdk
    label: codex-readonly
    config:
      model: gpt-5.6-sol
      working_dir: ./fixtures/review-repo
      sandbox_mode: read-only
      network_access_enabled: false
      web_search_enabled: false
      enable_streaming: true
      output_schema:
        type: object
        required: [issues, summary]
        additionalProperties: false
        properties:
          issues:
            type: array
            items:
              type: object
              required: [id, file, explanation]
              properties:
                id: { type: string }
                file: { type: string }
                explanation: { type: string }
          summary: { type: string }

  - id: anthropic:claude-agent-sdk
    label: claude-readonly
    config:
      model: claude-sonnet-4-6
      working_dir: ./fixtures/review-repo
      disallowed_tools: ['Bash', 'Write', 'Edit', 'MultiEdit']
      persist_session: false
      output_format:
        type: json_schema
        schema:
          type: object
          required: [issues, summary]
          additionalProperties: false
          properties:
            issues:
              type: array
              items:
                type: object
                required: [id, file, explanation]
                properties:
                  id: { type: string }
                  file: { type: string }
                  explanation: { type: string }
            summary: { type: string }

tests:
  - description: Detects seeded authorization defects
    vars:
      task: Check object ownership and function-level authorization in the invoice service.
      expectedIssueIds: ['cross-tenant-read', 'admin-action-without-role-check']
    assert:
      - type: is-json
      - type: javascript
        value: |
          const value = typeof output === 'string' ? JSON.parse(output) : output;
          const found = new Set((value.issues || []).map((item) => item.id));
          const expected = context.vars.expectedIssueIds;
          const hits = expected.filter((id) => found.has(id));
          return {
            pass: hits.length === expected.length,
            score: hits.length / expected.length,
            reason: 'Matched ' + hits.length + ' of ' + expected.length + ' seeded issues',
          };
\`\`\`

The issue IDs in this example are fixture-owned labels, not product claims or benchmark results. Put the actual seeded defects and mapping under review. The JavaScript assertion handles the documented difference between Codex string output and Claude parsed structured output.

Do not assume configuration keys alone create identical security. Inspect effective tool events. If one provider reads symlinks outside the fixture, inherits extra instructions, or receives different environment variables, the run is not matched.

## Evaluate write-capable tasks in disposable workspaces

Never let both providers mutate the same directory. Create one clean copy per provider and trial from an immutable fixture archive. The orchestrator should verify the archive digest, create a new directory, run one provider, execute hidden verification outside the agent session, collect a diff, and destroy or quarantine the workspace according to policy.

\`\`\`bash
set -eu

provider="$1"
trial="$2"
workspace="workspaces/\${provider}/\${trial}"

mkdir -p "$workspace"
tar -xzf fixtures/task-repo.tar.gz -C "$workspace"

npx promptfoo eval \\
  -c "configs/\${provider}.yaml" \\
  --no-cache \\
  --no-share \\
  -o "artifacts/\${provider}-\${trial}.json"

npm --prefix "$workspace" test
git -C "$workspace" diff --check
\`\`\`

This is a repository-owned orchestration pattern, not a Promptfoo built-in benchmark command. Add archive hash verification, timeouts, cleanup, and hidden test execution appropriate to your runner. If the task permits shell access, isolate the workspace in a container or equivalent sandbox with no production credentials and constrained network.

For Claude, the current provider docs require explicit write/edit tools and a permission mode such as \`acceptEdits\` for unattended modification. For Codex, configure a workspace-write sandbox and approval policy appropriate to the runner. Do not make both unrestricted merely to claim symmetry. Match the minimum operations required by the task and record the resulting capability difference.

## Grade behavior, not self-report

The official coding-agent guide warns that final output describes what an agent says it did, not necessarily the files. For patch tasks, grade repository state after execution. A strong grader stack has layers:

1. **Harness validity:** Did the provider start, finish, and return a result rather than an infrastructure error?
2. **Scope:** Did the diff stay within allowed files and avoid secrets, generated artifacts, or disabled tests?
3. **Build quality:** Do formatting, types, lint, and compilation pass?
4. **Public regression:** Do existing repository tests still pass?
5. **Hidden correctness:** Do independent tests prove the requested behavior and negative cases?
6. **Security and policy:** Did the change preserve authorization, validation, and repository rules?
7. **Process evidence:** If relevant, did traces show required test execution or skill use?
8. **Qualitative review:** Is the implementation maintainable and aligned with local design?

Use deterministic graders for the first six. Trace assertions can verify a required command or skill path, but avoid rewarding unnecessary tool volume. A model judge may assess explanation clarity or maintainability after calibration against human labels. Never let a model judge overrule a failed hidden security test.

| Signal | Report form | Interpretation limit |
| --- | --- | --- |
| Hidden test pass | Per task and failure class | Only covers encoded cases |
| Allowed-path compliance | Boolean plus offending paths | Does not prove semantic correctness |
| Seeded defect recall | Hits / known defects | Depends on seed representativeness |
| False-positive count | Unsupported issue IDs after review | Human adjudication may disagree |
| Runtime | Median and spread across fresh trials | Includes runner and provider variance |
| Token usage | Provider-reported fields | Accounting shapes may differ |
| Estimated cost | Value plus coverage flag | Missing estimate is unknown, not zero |
| Tool events | Counts and required/forbidden events | More actions are not automatically better |
| Reviewer rating | Rubric dimensions and disagreement | Subjective and reviewer-dependent |

## Treat cost and latency as secondary constraints

Measure quality first. A fast agent that fails the task is not a bargain, and a correct agent with unacceptable cost may not fit the workflow. Report cost and latency only for trials that reached a comparable terminal state, while still listing failures separately.

Promptfoo documents cost and latency assertions, but thresholds must come from your workflow. Establish a pilot distribution, choose an operational budget, and document whether warm caches, authentication, model queueing, dependency installation, and test execution are included. Use fresh runs for model behavior and a consistent runner for both providers.

The current Codex provider page states that cost estimation is available only when Promptfoo knows the model's pricing metadata, and that GPT-5.6 cost remains undefined because Codex does not report cache-write tokens. Do not turn that undefined value into zero or compare it with a complete Claude estimate. Report token usage and externally reconciled billing where permitted, or mark the cost comparison incomplete.

Latency should be reported as a distribution, not a single fastest value. Include timeout and error rates. If one provider retries transparently, its longer successful run may be more useful than another provider's early failure; keep outcome classes visible.

## Repeat trials without manufacturing certainty

Promptfoo's current guide recommends \`--repeat 3\` for prompts expected to be stable and \`--no-cache\` while developing. Three trials are a smoke sample, not a statistically decisive benchmark. Use more trials when the decision cost, variance, and task diversity justify them.

\`\`\`bash
npx promptfoo validate -c evals/coding-agents/promptfooconfig.yaml
npx promptfoo eval \\
  -c evals/coding-agents/promptfooconfig.yaml \\
  --repeat 3 \\
  --no-cache \\
  --no-share \\
  -o artifacts/coding-agent-results.json
\`\`\`

Randomize provider execution order when shared infrastructure could create time bias. Keep task order stable or randomized under a recorded seed. Do not retry only the losing provider's failures or discard timeouts. If an infrastructure outage invalidates a trial, apply the same documented exclusion rule to both.

For each task-provider pair, report successes, deterministic failures, policy violations, provider errors, timeouts, and excluded trials. Show task-level results before averages. A 90 percent aggregate can hide complete failure on authorization work.

## Include a plain-model baseline when it answers a question

The Promptfoo guide recommends a plain LLM baseline for tasks requiring file or tool access. That baseline can show whether the agent harness contributes beyond model text generation. It is not a fair competitor on a task that requires repository reads; failure is expected. Label it as a capability control.

Likewise, compare the same model through different harness tiers only when the question concerns the harness. Codex app-server exposes richer protocol events and approval behavior than the SDK, but it is a different surface and is currently described as experimental by Promptfoo. Do not substitute it into one side of a Codex-versus-Claude SDK comparison without changing the claim.

## Skills create another controlled variable

If the agents can load local skills, decide whether the study compares default agents or repository-configured agents. For a default comparison, remove both hosts' custom skills and record instruction files. For a workflow comparison, install semantically matched instructions and verify discovery.

Promptfoo's Test Agent Skills guide uses \`.agents/skills/\` for Codex and \`.claude/skills/\` for Claude, with provider-specific skill-use evidence. A skill may improve routing or code conventions, but it also adds information. Do not give one agent a detailed testing skill and call the result a model comparison.

Test positive and negative routing. The agent should use a review skill for a security review and avoid it for an unrelated formatting task. Grade output quality independently from skill invocation, because a skill can be invoked and followed incorrectly.

## Diagnose unequal or surprising results

| Symptom | Likely confounder | Investigation |
| --- | --- | --- |
| One agent cannot read files | Wrong working directory or tool/sandbox config | Print resolved config root and inspect tool events |
| One edits while the other only plans | Permissions are not equivalent | Compare effective write and shell capabilities |
| JSON assertion fails on Codex only | Structured output remains a string | Parse Codex output before field assertions |
| Claude reuses earlier context | Session persistence was not disabled | Set \`persist_session: false\` and use a fresh workspace |
| Results improve on second run | Cache, warm dependency, or retained state | Use \`--no-cache\`, clean directories, and randomized order |
| Cost shows zero for one side | Missing estimate was coerced | Preserve null/undefined and report coverage |
| Agent says tests passed but hidden tests fail | Self-report was graded | Grade repository state and test process directly |
| One model finds seeded IDs exactly | Fixture leakage or memorized labels | Remove answer-bearing comments and inspect repository history |
| Large pass-rate change after upgrade | Model, SDK, Promptfoo, task, or grader changed together | Change one layer at a time and rerun baseline |

Retain enough redacted evidence to reproduce a failure: task ID, fixture digest, provider config hash, model and SDK versions, result class, relevant trace, diff, verifier output, and timestamps. Do not retain reasoning or source snapshots beyond policy merely because a tool can export them.

## CI and release design

Use coding-agent evals like integration tests, not per-line unit tests. A pull request gate should contain a small, stable, low-cost task set that detects major harness or policy regressions. A scheduled suite can include more repositories, repeated trials, write-capable tasks, and human review. A pre-adoption study can be broader still.

Block a release on hard invariants such as forbidden file edits, secret exposure, disabled tests, hidden security failures, or harness errors above policy. Treat quality score, latency, and cost as decision metrics with explicit thresholds and uncertainty. Keep provider outages separate from product-quality failures, but do not silently pass the gate when evidence is missing.

Version every moving layer and require review when any changes. If a model alias points to a moving target, record the resolved identifier where the provider exposes it. Re-baseline intentionally rather than comparing a new model to old trials and calling drift a winner.

## Mistakes and limitations

- Comparing one Codex run with one Claude run.
- Giving different repositories, hidden instructions, network access, or tool permissions.
- Grading the final explanation instead of the resulting files and tests.
- Reporting undefined cost as zero.
- Choosing only tasks that resemble one agent's documented examples.
- Using an LLM judge for exact behavior that hidden tests can prove.
- Allowing sessions, caches, or workspaces to leak across trials.
- Publishing a universal ranking from a narrow internal task set.
- Changing model, SDK, Promptfoo, grader, and fixtures simultaneously.

Promptfoo provides provider adapters and evaluation machinery, not a vendor-independent guarantee of perfect equivalence. Codex and Claude expose different system instructions, models, tools, authentication, output semantics, and usage accounting. A fair study controls what can be controlled and discloses what cannot.

## Frequently Asked Questions

### Can Promptfoo evaluate both Codex and Claude coding agents?

Yes. The current provider catalog and coding-agent guide document \`openai:codex-sdk\` and \`anthropic:claude-agent-sdk\` for agent evaluations.

### Is one trial enough to choose an agent?

No. Agent decisions are nondeterministic and tool paths compound variation. Run fresh repeated trials across representative tasks and report the distribution.

### Should both agents receive the same exact configuration fields?

No. Their SDKs use different fields. Match effective capabilities, task inputs, workspaces, verification, and budgets, then document unavoidable differences.

### How should code changes be graded?

Run independent formatting, type, lint, public, hidden, security, and scope checks against the resulting workspace. Do not trust the agent's final summary alone.

### Can I compare cost directly?

Only when both sides provide comparable complete usage and pricing data. The current Codex provider documentation notes cases where cost is undefined; report missing coverage instead of zero.

### Why disable caches and persistent sessions?

They can reuse prior responses or context, making trials dependent. Fresh runs and clean workspaces better isolate current behavior.

### Should agents be allowed to use the network?

Only when the task requires it and both sides receive a matched, constrained policy. Repository repair tasks are usually safer and more reproducible with network disabled.

### Does a higher aggregate score prove a universally better agent?

No. It supports a conclusion only for the evaluated models, harness, tasks, permissions, graders, runner, and date. Publish that scope with the result.

## Conclusion: compare evidence, not reputations

A defensible Codex-versus-Claude study begins with a narrow claim and ends with reproducible task-level evidence. Pin every layer, duplicate clean workspaces, match effective capabilities, grade externally, repeat fresh trials, preserve missing-data semantics, and inspect failures. The output may support a workflow decision; it should not be inflated into an invented benchmark.

Use the [Agent Skills guide](/blog/promptfoo-agent-skills-codex-claude-install-2026) when the experiment includes repository instructions, and return to the [Promptfoo pillar](/blog/promptfoo-complete-guide-2026) for configuration, assertions, datasets, and operational patterns.`,
    },
  },
];
