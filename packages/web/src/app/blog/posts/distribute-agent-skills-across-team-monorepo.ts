import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Distributing Agent Skills Across a Team: Monorepos, Git, and Version Control',
  description: 'Learn how to share agent skills across a team monorepo with Git, ownership, validation, releases, and safe rollbacks for reliable QA automation.',
  date: '2026-07-15',
  category: 'Guide',
  content: `
# Distributing Agent Skills Across a Team: Monorepos, Git, and Version Control

An agent skill stops being a personal productivity trick the moment a second engineer depends on it. At that point, the team needs to answer the same questions it answers for test code: Where is the source of truth? Who reviews changes? How do consumers receive a compatible version? What happens when a new instruction causes a hundred Playwright tests to be rewritten incorrectly?

For QA and test-automation teams, distribution is especially sensitive. A skill may encode the approved locator policy, fixture architecture, failure-triage sequence, API contract checks, accessibility expectations, or rules for handling production-like data. An unclear update can change not only generated code, but also the evidence engineers trust when they approve a release.

This guide presents a practical way to share agent skills across a team monorepo using Git and ordinary software delivery controls. The goal is not to build a complicated internal platform. The goal is to make every skill reviewable, reproducible, discoverable, and reversible while keeping it convenient enough that engineers actually use it.

## Treat the skill as test infrastructure, not a shared prompt

A prompt pasted into chat has no durable identity. A managed skill has a path, an owner, a documented purpose, examples, validation checks, and a change history. That distinction matters when an agent is asked to generate a page object, diagnose a flaky test, or add contract assertions across several services.

Consider a team instruction that says, "Use stable selectors." One engineer may interpret that as role and accessible name, another may generate data attributes everywhere, and an agent may fall back to CSS structure. A distributed skill can define the order of preference, provide good and bad examples, explain exceptions, and point to the repository's fixture utilities. The instruction becomes an enforceable engineering artifact rather than folklore.

Use the following test-infrastructure test before adding any skill to the shared catalog:

| Question | Personal prompt | Team-managed skill | QA consequence |
|---|---|---|---|
| Can a reviewer see the exact change? | Often no | Yes, through a Git diff | Locator or assertion policy changes are auditable |
| Is the instruction tied to repository context? | Weakly | Yes, through scoped files and references | Generated tests use real fixtures and helpers |
| Can the team restore the previous behavior? | Rarely | Yes, by reverting or selecting a release | A harmful generation pattern can be stopped quickly |
| Is ownership explicit? | No | Yes, with CODEOWNERS or documented maintainers | Framework specialists approve framework guidance |
| Can CI check the package? | Usually no | Yes | Missing frontmatter and broken examples fail early |

The skill does not replace code review, test execution, or engineering judgment. It improves the agent's starting context. Generated code must still compile, run, and satisfy the same quality gates as human-written automation.

## Choose one canonical tree inside the monorepo

The cleanest model is one canonical skills tree committed near the repository root. Do not maintain independent copies for each package or agent unless their content truly differs. Duplication creates silent drift, particularly when one copy fixes a dangerous data-cleanup example and another does not.

A useful repository layout separates source skills, supporting references, examples, and validation tools:

\`\`\`markdown
repository-root/
  agent-skills/
    README.md
    playwright-test-authoring/
      SKILL.md
      references/
        locator-policy.md
        fixture-map.md
      examples/
        checkout.spec.ts
    api-contract-triage/
      SKILL.md
      references/
        service-owners.md
  tooling/
    skills/
      validate-skills.ts
      sync-skills.ts
  .claude/
    skills/
  .github/
    copilot-instructions.md
    instructions/
      tests.instructions.md
  .cursor/
    rules/
  AGENTS.md
  GEMINI.md
\`\`\`

In this model, \`agent-skills/\` is the maintained source. Agent-specific locations are generated views, symbolic links where the environment supports them, or small adapters that point back to the canonical material. The exact delivery technique can differ by operating system and agent, but ownership remains obvious.

Keep each skill cohesive. A Playwright authoring skill can include its own references and examples, while a separate triage skill describes log collection and failure classification. Combining every QA rule into one huge skill makes invocation imprecise and reviews risky. It also forces engineers working on API tests to consume irrelevant browser-testing context.

If your first shared asset is Claude-specific, the [complete guide to creating a Claude SKILL.md](/blog/how-to-create-a-claude-skill-skill-md-complete-guide) explains the file's anatomy. For distribution, remember the documented basics: \`SKILL.md\` uses frontmatter with \`name\` and \`description\`; the name is limited to 64 characters and the description to 1024 characters. Claude discovers project skills under \`.claude/skills/\` and personal skills under \`~/.claude/skills/\`.

## Separate portable testing knowledge from agent adapters

Teams often confuse shared knowledge with a shared file format. The knowledge may be portable even when activation rules differ. A locator policy, API polling strategy, or defect evidence checklist can serve several agents. The adapter tells a particular agent when and how to apply it.

Use three layers:

1. **Portable core:** Markdown references, examples, commands, and decision tables that describe the testing workflow without depending on one agent.
2. **Skill package:** A focused \`SKILL.md\` that tells a skill-capable agent when to use those resources and what workflow to follow.
3. **Agent instruction adapter:** A small, documented file for agents that use repository instructions or rule files rather than skill discovery.

The following matrix shows publicly documented instruction locations without pretending that all formats behave identically:

| Consumer | Documented project location | Scope mechanism | Distribution approach |
|---|---|---|---|
| Claude Code skills | \`.claude/skills/<skill>/SKILL.md\` | Skill name and description guide discovery | Materialize selected canonical packages here |
| GitHub Copilot | \`.github/copilot-instructions.md\` | Repository-wide instructions | Keep concise shared QA defaults in an adapter |
| GitHub Copilot path instructions | \`.github/instructions/*.instructions.md\` | \`applyTo\` frontmatter | Target test directories or file patterns |
| AGENTS.md consumers | \`AGENTS.md\` | Nearest file wins | Put general rules at root and special rules near packages |
| Cursor | \`.cursor/rules/*.mdc\` | \`alwaysApply\`, \`globs\`, and \`description\` | Generate focused rules from canonical references |
| Gemini CLI | \`GEMINI.md\` | Hierarchical context files | Reference the same QA conventions in concise form |

Do not force one file to masquerade as all six formats. For example, Copilot path-specific instructions use \`applyTo\` frontmatter, while Cursor rule files use their own metadata such as \`alwaysApply\`, \`globs\`, and \`description\`. An adapter generator should understand those differences and emit minimal, valid files.

The portable core also reduces migration risk. If the team changes its primary coding agent, the expensive part, the carefully reviewed testing knowledge, stays intact. Only the delivery layer changes.

## Model scope around test boundaries

Monorepos contain conflicting realities. A mobile package may use Appium, a web package Playwright, and a legacy service Jest with custom contract helpers. A root-level instruction that mandates one framework everywhere will create incorrect code.

Start with a scope map based on test boundaries:

| Scope | Typical content | Example QA rule | Owner |
|---|---|---|---|
| Repository | Security, secrets, evidence, naming | Never place credentials in fixtures or snapshots | QA platform and security |
| Test platform | Runner conventions and shared utilities | Import polling from the approved helper | Test infrastructure team |
| Product package | Domain fixtures and seeded data | Create orders through the package test factory | Package maintainers |
| Suite | Browser, API, mobile, performance | Prefer role locators in Playwright UI tests | Framework specialist |
| Task-specific skill | A repeatable workflow | Triage a failed checkout test before modifying it | Skill owner |

AGENTS.md is useful for hierarchical scope because the nearest applicable file wins under the agents.md convention. A root file can define shared security and verification expectations. A package-level file can explain that package's test command and fixture rules. This is more precise than an enormous root instruction that asks every agent to infer exceptions.

Path-scoped Copilot instructions and Cursor globs can follow the same conceptual boundaries. Keep the source policy human-readable, then generate or review the adapter patterns carefully. A bad glob is a distribution defect: it may omit an entire suite or apply browser-test rules to backend migration files.

Before approving scope, run scenario checks. Ask which instructions should load when an engineer edits each of these files:

\`\`\`markdown
packages/storefront/tests/checkout.spec.ts
packages/payments/contract/refund.contract.ts
packages/mobile/e2e/login.test.ts
tooling/test-data/src/customerFactory.ts
\`\`\`

The answer should be predictable for every path. If two scopes conflict, document precedence in the canonical skill or narrow the adapter. Never depend on contributors remembering an unwritten exception.

## Design a Git history reviewers can understand

Skill review is semantic review. A diff that mixes instruction changes, example rewrites, formatting, and generated adapters makes it hard to see whether agent behavior will change. Structure commits so reviewers can follow cause and effect.

A strong change usually contains:

- One stated testing problem, such as generated tests using fixed sleeps.
- A focused modification to the canonical skill or reference.
- An example showing the preferred polling or web-first assertion.
- Updated adapters produced from that source, if adapters are committed.
- Validation results and a short behavioral evaluation summary.

A weak change says "improve test skill" and rewrites several pages. Reviewers cannot distinguish editorial cleanup from policy changes. Split the work. The change description should explain the observed failure, the proposed instruction, expected agent behavior, and possible regressions.

Use pull request evidence that resembles a small test report:

\`\`\`markdown
## Skill change
Replace fixed-delay guidance with condition-based waiting in API examples.

## Observed failure
Agent generated a 10-second sleep for eventual consistency in 4 of 6 trials.

## Evaluation prompts
- Add a test for asynchronous refund completion.
- Repair the flaky order-status assertion.

## Result
- Before: fixed sleep in 7 of 12 generated patches.
- After: approved polling helper in 11 of 12 generated patches.
- Regression: one patch omitted the timeout message; follow-up issue recorded.

## Verification
- Skill validator passes.
- Example TypeScript compiles.
- Payments contract suite passes.
\`\`\`

Avoid committing machine-specific state, transcripts containing secrets, or copied production data as evaluation evidence. Store sanitized prompts and concise expected properties. The purpose is reproducibility, not surveillance of individual engineers.

## Assign ownership at the point of risk

The maintainer of a skill should understand the workflow it changes. A platform team can own packaging and validation, but it should not unilaterally define payment reconciliation assertions or accessibility acceptance criteria.

Map ownership to risk:

- QA platform owns the catalog schema, adapter generator, validation, and compatibility policy.
- Framework specialists own runner-specific guidance for Playwright, Cypress, Appium, or contract tooling.
- Product test owners approve domain fixtures, expected outcomes, and destructive operations.
- Security reviews skills that access credentials, execute shell commands, call remote services, or process untrusted content.
- Developer experience maintains installation and update ergonomics.

Use repository review controls, such as CODEOWNERS, where they fit your hosting workflow. A skill directory can require its domain owner plus the QA platform team. High-risk skills may also require security review. Keep the policy proportionate: changing a typo should not need five approvals, while adding a cleanup command that deletes test resources deserves scrutiny.

An ownership record belongs near the source, not only in a private spreadsheet. The catalog README can list maintainers, escalation contacts, and expected response times. If a skill becomes orphaned, mark it deprecated instead of allowing its instructions to decay unnoticed.

## Validate structure before debating behavior

Structural validation cannot prove that an instruction is good, but it removes predictable distribution failures. Run fast checks on every pull request before human reviewers spend time evaluating semantics.

At minimum, verify that every skill directory has a readable \`SKILL.md\`, valid frontmatter, a unique name, and a useful description. Check the documented length limits: names no longer than 64 characters and descriptions no longer than 1024 characters. Validate referenced local files, reject paths that escape the package, and scan for accidental secrets.

A TypeScript validator can express the repository's own catalog rules without inventing agent-specific keys:

\`\`\`typescript
type SkillRecord = {
  directory: string;
  name: string;
  description: string;
  referencedFiles: string[];
};

export function validateSkill(skill: SkillRecord): string[] {
  const errors: string[] = [];

  if (!skill.name.trim()) errors.push('name is required');
  if (skill.name.length > 64) errors.push('name exceeds 64 characters');
  if (!skill.description.trim()) errors.push('description is required');
  if (skill.description.length > 1024) {
    errors.push('description exceeds 1024 characters');
  }

  for (const file of skill.referencedFiles) {
    if (file.startsWith('/') || file.split('/').includes('..')) {
      errors.push('reference must remain inside the skill package: ' + file);
    }
  }

  return errors;
}
\`\`\`

Add repository-specific checks only when they reflect real policy. For example, you can require an evaluation file in your canonical catalog, but do not imply that it is a standard \`SKILL.md\` field. Keep the distinction between your monorepo convention and the agent's public format clear in documentation.

CI should also render or parse generated adapters and fail on drift. If a contributor edits a generated Cursor rule directly, the next build should report that it differs from canonical source. The fix is to update the source or generator, not preserve a mysterious manual edit.

## Test agent behavior with QA-shaped evaluations

Linting finds malformed packages. Behavioral evaluation finds harmful instructions. The evaluation set should exercise the decisions that matter in day-to-day test automation, not generic code generation.

Build a small, versioned suite of prompts and assertions. Prompts can use sanitized miniature repositories or fixtures. Assertions should usually evaluate properties rather than exact wording because agent output is variable.

Useful evaluation categories include:

| Evaluation | Prompt shape | Property to inspect | Failure signal |
|---|---|---|---|
| New test authoring | Add checkout coverage for declined cards | Reuses fixture and stable locator policy | Duplicates setup or selects by DOM position |
| Flake repair | Fix intermittent order status test | Diagnoses timing and uses condition-based wait | Adds retries or a fixed sleep without evidence |
| Failure triage | Investigate a CI-only screenshot mismatch | Collects artifact, environment, and diff evidence first | Changes assertion immediately |
| API coverage | Add contract test for missing field | Uses schema or typed assertion conventions | Asserts only status code |
| Data cleanup | Remove records created by the test | Limits deletion to owned identifiers | Suggests broad table or bucket deletion |
| Accessibility | Test the modal workflow | Uses semantic interactions and meaningful assertions | Checks only element visibility |

Each evaluation should record which skill version, agent environment, repository revision, and model context were used. Because model output can vary, repeat important prompts and compare rates, not a single cherry-picked response. Human reviewers can score nuanced behavior using a compact rubric.

Run a fast subset in pull requests and a broader scheduled suite for the catalog. If costs or runtime are constraints, prioritize changed skills and their dependents. The objective is not a perfect benchmark. It is early evidence that an instruction change improves the intended testing decision without breaking adjacent workflows.

## Generate adapters without creating a second source of truth

Many teams commit agent-facing files because contributors expect a clone to work immediately. Others generate them during setup. Both models can work if the source boundary is unmistakable.

If adapters are committed, place a generated notice in formats where comments are safe, validate drift in CI, and require all edits to begin in the canonical tree. If adapters are generated locally, make the setup command deterministic and fast. Do not make each engineer choose a different subset by memory.

A synchronization script should be boring. It selects approved packages, copies or transforms only necessary files, and reports what changed. The following shell sequence illustrates a repository-owned workflow, not a universal agent command:

\`\`\`bash
npm ci
npm run skills:validate
npm run skills:sync
git diff --exit-code -- .claude/skills .github/instructions .cursor/rules
\`\`\`

The implementation should use an allowlist of destination roots and refuse path traversal. It should never overwrite personal directories such as \`~/.claude/skills/\` during a normal repository build. Project skills belong in the project; personal installation should be an explicit user action.

For Claude Code, materializing selected packages under \`.claude/skills/\` aligns with the documented project location. For Copilot, a generator might distill repository-wide defaults into \`.github/copilot-instructions.md\` and create path-specific \`.instructions.md\` files with \`applyTo\` frontmatter. For Cursor, it can emit \`.mdc\` rules using documented metadata. For Gemini CLI, it can maintain concise context in \`GEMINI.md\`. Preserve the semantic differences instead of copying the same frontmatter everywhere.

## Pick a versioning contract consumers can follow

Inside a single monorepo, the repository commit is already a version. That may be sufficient when every consumer updates by pulling the same branch. Explicit skill versions become helpful when skills are published outside the repository, synchronized into several repositories, or released on a different cadence.

Choose a contract based on the real distribution topology:

| Topology | Sensible identity | Update trigger | Rollback method |
|---|---|---|---|
| One monorepo, project-scoped skills | Git commit | Normal branch merge and pull | Revert the skill commit |
| Several repositories, copied packages | Tagged catalog release plus commit digest | Dependency update pull request | Pin previous release or digest |
| Internal package/artifact | Package release and immutable checksum | Automated update proposal | Restore prior package version |
| Personal optional installation | Catalog release shown to user | Explicit install or update | Reinstall prior known-good version |

Do not add a made-up \`version\` field to \`SKILL.md\` frontmatter and assume every agent understands it. Keep release metadata in your catalog, package system, Git tags, or lock file. The public skill format's documented name and description remain focused on discovery.

Define what counts as a breaking change for your team. Examples include changing a skill's intended trigger, removing a referenced workflow, requiring a tool that was previously optional, or reversing a core assertion policy. Editorial clarification may be a patch-level change in an external catalog, while a locator-policy reversal may require a major release and migration note.

When you are ready to distribute beyond one repository, follow a documented [process for publishing an AI agent skill directory](/blog/how-to-publish-ai-agent-skill-directory). Treat publication as promotion of reviewed source, not a manual copy from a developer laptop.

## Roll out skill changes as controlled test-infrastructure changes

A merge does not have to mean immediate adoption by every suite. For high-impact skills, use a staged rollout.

Start with maintainers and one representative package. Ask them to use the updated skill on real backlog tasks, then inspect generated patches and review comments. Expand to a few suites with different architectures. Finally, make the new release the default. This sequence exposes assumptions that a synthetic evaluation may miss, such as a fixture helper that exists only in the storefront package.

Set explicit rollout gates:

1. Structural validation passes.
2. Changed behavioral evaluations meet their acceptance threshold.
3. Example code compiles or runs in its sample context.
4. A pilot package reports no critical regression.
5. Owners approve the migration note and rollback plan.

For low-risk wording corrections, this full sequence may be excessive. Classify changes by consequence. A spelling fix can merge normally. A new command execution workflow, secret-handling instruction, or destructive cleanup policy should receive deeper review and a limited pilot.

Communicate observable behavior, not merely "skill updated." A release note should say that the Playwright authoring skill now prefers existing web-first assertions over manual polling, names the affected suites, and explains what reviewers should watch for. That helps QA engineers detect drift during normal pull request review.

Ready-made QA skills can also be installed from qaskills.sh with the qaskills CLI. In a governed monorepo, import them through the same review and evaluation pipeline as internally authored packages. Convenience should not bypass provenance or ownership.

## Make rollback faster than diagnosis

When a shared skill causes bad patches, the team first needs to stop further propagation. Root-cause analysis can follow. A practical rollback plan identifies the last known-good source revision, adapter output, and affected consumers.

For repository-scoped skills, a Git revert is often the safest response because it creates an auditable inverse change. If a distributed catalog uses immutable releases, pin consumers to the previous release or digest. Regenerate adapters, run validation, and notify affected package owners about the behavior to reject in open pull requests.

Use an incident checklist tailored to agent guidance:

\`\`\`yaml
containment:
  - identify the changed skill and canonical commit
  - stop automated promotion to downstream repositories
  - restore the last known-good skill source
  - regenerate and validate agent adapters
inspection:
  - find open pull requests created with the affected guidance
  - inspect generated test data, commands, and assertions
  - rotate credentials if evidence suggests exposure
follow_up:
  - add a behavioral evaluation reproducing the failure
  - document the missing review or validation control
  - release the corrected skill through the normal pipeline
\`\`\`

Do not assume reverting the instruction reverts generated code. Search open and recently merged changes for the harmful pattern. A skill that suggested broad cleanup may have produced scripts that still exist. A locator-policy regression may already have created brittle tests. Treat the source rollback and downstream code audit as separate tasks.

## Keep local customization visible and bounded

Engineers will need exceptions. A test investigation may require temporary logging, or a legacy package may not support the current fixture pattern. Hidden local edits to shared skills are the worst way to express those differences because nobody can review or reproduce them.

Prefer one of four mechanisms:

- A committed package-level instruction that narrows the root policy.
- A documented skill option expressed in the task prompt, such as using the legacy harness for a named package.
- A branch change to the canonical skill, reviewed with the affected work.
- A personal skill for genuinely personal workflows that do not claim to represent team policy.

Personal Claude skills under \`~/.claude/skills/\` can be useful for an engineer's private note-taking or exploratory routine. They should not silently override security, evidence, or test-data rules expected by the team. During incident review, ask whether personal instructions influenced the output, but do not solve that concern by copying private home-directory content into source control.

Document the boundary in onboarding. Team skills define shared expectations for committed work. Personal instructions may help an individual operate, but the resulting code and commands remain subject to repository policy and review.

## Build a contributor path that encourages small improvements

Distribution succeeds when a QA engineer who spots a recurring agent mistake can fix the shared guidance without becoming a platform expert. Provide a contributor workflow with a template, local validator, evaluation examples, and named reviewers.

A contributor should be able to:

\`\`\`bash
git switch -c skill/fix-api-polling-guidance
npm run skills:validate
npm run skills:evaluate -- api-contract-triage
npm test --workspace packages/payments
git diff -- agent-skills/api-contract-triage
\`\`\`

These script names are examples of repository-owned commands, not public agent CLI flags. Define the actual scripts in your package configuration and document what they do.

Offer a short change template that asks for the observed QA failure, affected packages, expected agent behavior, evidence, and rollout risk. Include a sample sanitized evaluation. Good templates reduce vague requests such as "make the agent smarter" and turn them into reviewable changes such as "when a contract test fails with a missing optional field, inspect the schema before weakening the assertion."

Reward deletion too. If a skill repeats repository documentation that agents already receive, remove duplication and reference the canonical source. If two skills trigger for the same task, consolidate or sharpen their descriptions. A smaller catalog with clear boundaries is easier to distribute and safer to evolve.

## Measure whether sharing improves QA outcomes

Installation count is an adoption signal, not a quality outcome. Measure whether shared skills change the work in useful ways.

Combine three types of evidence:

| Signal group | Example measures | Interpretation caution |
|---|---|---|
| Adoption | Active repositories, skill invocations, update lag | Usage does not prove correctness |
| Generated change quality | Review revisions, rejected patterns, evaluation pass rate | Agent and task difficulty affect results |
| Test delivery | Flake introductions, time to triage, escaped defects, maintenance effort | Many factors beyond skills influence trends |

Start with a few questions. Are reviewers seeing fewer fixed sleeps? Do generated API tests use the approved fixtures more often? Has time to assemble CI failure evidence decreased? Sample pull requests and compare behavior before and after a release. Use qualitative reviewer notes alongside counts.

Avoid attributing every test metric movement to the skill. A runner upgrade, application change, or team reorganization can dominate results. The purpose of measurement is to find useful direction and regression signals, not manufacture certainty.

Publish a lightweight catalog health report: current owners, stale packages, pending security reviews, evaluation trends, and consumers behind the supported release. That gives the team an actionable maintenance queue and prevents the directory from turning into an archive of plausible but untrusted advice.

## A reference operating model for QA teams

The complete operating model is intentionally conventional:

1. Authors change a focused package under the canonical \`agent-skills/\` tree.
2. CI validates frontmatter, references, secrets, examples, and adapter drift.
3. Domain owners review testing semantics; platform owners review packaging; security joins for elevated-risk capabilities.
4. Behavioral evaluations exercise authoring, repair, triage, and data-safety scenarios.
5. The merge produces deterministic project adapters or an immutable catalog artifact.
6. High-impact updates move through a representative pilot before becoming default.
7. Consumers can identify the exact commit, release, or digest in use.
8. Rollback restores source and adapters, then audits already-generated code.

This model is strong because it uses controls QA engineers already understand. Source control preserves intent. Pull requests make policy reviewable. CI checks packaging. Evaluations test expected behavior. Staged releases contain uncertainty. Reverts recover quickly.

The most important design choice is the canonical boundary. Once the team agrees where testing knowledge is maintained, every adapter, installation, release, and metric can point back to it. Without that boundary, a monorepo merely stores multiple drifting copies more efficiently.

## Track dependencies between skills, helpers, and suites

A skill rarely stands alone. It may tell an agent to import a polling helper, read a fixture map, call a repository script, or follow a package-level instruction. Those are dependencies even when no package manager records them. If a helper is renamed while the skill still recommends the old import, the guidance becomes a reliable generator of broken code.

Maintain a small dependency inventory in the catalog tooling or README. Record which repository files and other skills a package expects, which suites consume it, and which agent adapters expose it. This is catalog metadata owned by your repository, not extra \`SKILL.md\` frontmatter that consumers are assumed to understand.

Classify dependencies by how they should be checked:

| Dependency type | QA example | Automated check | Change response |
|---|---|---|---|
| File reference | Fixture map linked from a skill | Confirm the relative path exists | Update skill and reference in one pull request |
| Code symbol | Approved \`pollUntil\` helper | Compile the example against current packages | Migrate examples before removing the symbol |
| Command | Repository test setup script | Run a safe help or validation path in CI | Announce replacement and update adapters |
| Policy | Root test-data handling rule | Review scoped instructions for contradiction | Resolve precedence before rollout |
| Skill relationship | Triage skill hands off to API authoring skill | Exercise the handoff in evaluation prompts | Release compatible changes together |

When a shared helper changes, search the canonical skills tree as part of the code pull request. Conversely, when a skill begins recommending a new helper, include the helper's owners in review. This two-way discipline prevents guidance and implementation from evolving on separate tracks.

Monorepo build systems can run checks only for affected skills if the dependency graph is explicit. A fixture utility change can trigger compilation of the examples that reference it plus behavioral evaluations for the exposed skills. A pure editorial change may run only structural validation. Start with conservative broad checks, then optimize after the team has evidence about stable dependency boundaries.

Compatibility also includes agent delivery formats. When an adapter generator changes, rebuild every managed adapter in a clean checkout and compare results. Test at least one scoped file for each consumer type so a metadata or matching change does not silently stop loading the QA rules. The goal is not to certify every model response. It is to prove that the intended instruction is present, correctly scoped, and connected to repository resources.

Finally, define a removal process. Mark a skill or referenced helper as deprecated, name its replacement, identify consumers, and allow a migration window. Remove it only after repository search and catalog telemetry show no supported consumer remains. Abrupt deletion encourages teams to pin stale copies, which defeats the shared distribution model.

## Frequently Asked Questions

### Should every package in a monorepo have its own agent skill?

No. Create a package-specific skill only when the workflow is distinct and repeatable, such as mobile device provisioning or payment contract triage. Put repository-wide security and evidence rules at the root, framework conventions in focused shared skills, and package exceptions near the affected package. Too many near-identical skills make discovery unreliable and multiply maintenance. Start from test boundaries, then add a skill when existing scopes cannot express an important difference without ambiguity.

### Should generated agent instruction files be committed to Git?

Commit them when clone-and-use convenience matters and CI can prove they match canonical source. Generate them during setup when the files are environment-dependent or would create noisy diffs. In either case, document one source of truth and make drift visible. For QA repositories, committed adapters often help reviewers see exactly which locator, fixture, and verification guidance reaches contributors, while deterministic generation prevents direct edits from becoming a hidden second policy.

### How often should a team release shared QA skills?

Release when a coherent, evaluated improvement is ready, not on an arbitrary daily schedule. A single monorepo can adopt changes through normal merges. A catalog serving multiple repositories benefits from immutable releases and automated update proposals. Batch related editorial fixes, but isolate risky behavior changes so they can be piloted and reverted independently. Urgent security corrections should move quickly with explicit downstream notification and an audit of code already generated from the affected skill.

### What is the safest way to handle personal skill overrides?

Keep personal skills for private productivity workflows and require committed output to satisfy repository policy. Do not automatically copy home-directory skills into a project or rely on them for team-critical behavior. If a personal instruction repeatedly improves test work, promote the relevant idea through the normal contribution, review, and evaluation process. When investigating surprising agent output, record which project and personal context was active, while avoiding collection of unrelated private content or credentials.
`,
};
