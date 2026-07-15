import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Progressive Disclosure in Agent Skill Design: Small Context, Full Power',
  description: 'Master progressive disclosure agent skills that keep QA agents focused, load test knowledge on demand, and deliver reliable automation with less context.',
  date: '2026-07-15',
  category: 'Guide',
  content: `
# Progressive Disclosure in Agent Skill Design: Small Context, Full Power

A test-automation skill can know how your team triages flaky Playwright tests, reads contract schemas, queries test data, and formats defect reports without forcing an AI coding agent to read all of that material on every task. The design technique that makes this possible is progressive disclosure: expose a small discovery surface first, load operational instructions only when the skill matches, and retrieve detailed resources only when the current test problem needs them.

For QA engineers, this is more than prompt tidiness. A crowded context makes it harder for an agent to distinguish a selector policy from a release-gate rule, or a mobile-testing convention from an API-testing convention. A progressively disclosed skill spends context on the branch of the testing workflow that is actually active. The agent stays focused while the skill can still contain deep, repository-specific knowledge.

This guide turns progressive disclosure agent skills into a practical architecture. It covers routing, file boundaries, scripts, reference material, cross-agent portability, test scenarios, and measurable evaluation. The running example is a flaky-test investigator that starts small but can handle UI, API, and CI evidence when required.

## Progressive disclosure is a test-engineering architecture

Progressive disclosure separates discovery from execution. An agent initially sees only enough metadata to decide whether a skill applies. If the skill triggers, it reads the main instructions. Those instructions can then direct it to a specific reference, script, or asset. Each stage earns the right to consume more context by becoming relevant to the current request.

That structure resembles a well-designed test framework. A test runner discovers lightweight test definitions before it initializes every fixture. A page object exposes an intent-oriented method without duplicating every DOM detail in the test. A CI pipeline starts a specialized job only when its path or condition matches. In each case, the system delays detail until detail has a job to do.

The opposite is a monolithic instruction file containing the full test strategy, every browser quirk, the complete API catalog, sample reports, and troubleshooting notes. It feels comprehensive, but every invocation makes the agent sort through unrelated material. If the request is simply “add an assertion for the checkout total,” a six-page mobile-device matrix is interference, not assistance.

Progressive disclosure is not the same as deleting information. It changes where knowledge lives and when it becomes visible. A small entry point can route to a large body of expertise. The goal is not the shortest possible skill. The goal is the smallest sufficient context at each decision point.

| Design | What loads first | QA consequence | Suitable use |
|---|---|---|---|
| One large instruction file | Every policy and example | High recall cost, competing rules | Small, single-purpose skill only |
| Metadata plus focused body | Trigger summary, then procedure | Good for one bounded workflow | Test naming or review checklist |
| Metadata, body, and routed resources | Trigger, core process, selected detail | Deep capability with controlled context | Flake triage, API validation, release testing |
| Always-on repository instructions | Conventions on every request | Stable facts are available, procedures add noise | Test command names and non-negotiable policies |

The last row is important. Progressive disclosure does not mean everything belongs in a skill. A fact that must govern every edit, such as “never run destructive tests against production,” belongs in the repository’s always-on agent instructions. A multi-step procedure such as classifying a timeout belongs in a skill because it is useful only during a particular activity.

## The three loading layers and their context costs

A portable agent skill normally has three conceptual layers. Specific products vary in discovery mechanics, but the architecture remains useful across tools.

### Layer 1: metadata for discovery

The skill name and description are the index entry. They tell the agent what capability exists and when it should be selected. This layer must distinguish nearby QA intentions. “Helps with testing” is too broad. “Investigates intermittent browser-test failures using CI artifacts, traces, and retry history” gives the agent a meaningful routing boundary.

The Agent Skills format uses a \`SKILL.md\` entry point with YAML frontmatter. Keep the \`name\` under 64 characters and the \`description\` under 1,024 characters for portable skills. The description should state the action and recognizable triggers, not advertise quality with phrases such as “powerful” or “best in class.”

### Layer 2: the operational body

The body of \`SKILL.md\` loads when the skill is used. It should contain the invariant workflow: what to inspect first, how to classify evidence, what not to change, and how to report the result. If every branch needs a rule, keep it here. If only API failures need it, route to an API reference.

This layer is the control plane. It should be explicit enough that an agent does not improvise a risky workflow, yet concise enough that the selected skill does not dominate the conversation. Imperative instructions work well: “Read the failing test and its nearest fixtures,” “separate product defects from test defects,” and “preserve the original assertion until the failure mechanism is demonstrated.”

### Layer 3: resources loaded or executed on demand

References, scripts, and assets carry depth. A reference might document how to read a Playwright trace or map service error codes. A script might summarize JUnit XML deterministically. An asset might provide the approved defect template. The main file names these resources and says exactly when each one is relevant.

| Layer | Typical size | Agent decision | QA example | Failure if overloaded |
|---|---:|---|---|---|
| Metadata | Tens of words | Should this skill trigger? | “Use for flaky CI test investigation” | False triggers or missed triggers |
| Main body | Hundreds of words | What workflow should run? | Evidence order and classification rules | Core process gets buried |
| Resource | As large as needed | Which detail is needed now? | Browser-specific trace guide | Unrelated domain detail enters context |

A useful budget question is: “Would the agent perform the next correct step without this paragraph?” If yes, and the paragraph is only relevant later, move it behind a route. If no, keep it in the operational body.

## Build a trigger inventory from real QA requests

Progressive disclosure starts before file organization. First inventory the requests that should and should not activate the skill. This creates an observable contract for the metadata and prevents a generic description from swallowing adjacent testing tasks.

For a flaky-test skill, positive examples could include:

- “Why does this Playwright test fail only in CI?”
- “Classify these three intermittent API test failures.”
- “Use the trace and retry output to find the nondeterminism.”
- “Is this quarantine candidate a product bug or test bug?”

Negative examples could include:

- “Write a new happy-path checkout test.”
- “Review our entire automation architecture.”
- “Upgrade Playwright.”
- “Explain what a flaky test is.”

Borderline requests deserve special attention. “Fix the timeout in checkout.spec.ts” could be a direct debugging request or a request to hide the symptom by raising a timeout. The skill should trigger, but its body should require evidence before modifying timing. “Generate a flake report” may need a deterministic reporting script without the full investigation procedure. That observation can justify a second, narrower skill or a script routed from the main one.

Write the inventory as a small test matrix before drafting the skill:

\`\`\`markdown
# Trigger acceptance cases

Should select flake-investigator:
- Investigate a test that passes locally and fails in CI.
- Compare retry attempts and identify shared failure evidence.
- Decide whether an intermittent failure can be quarantined.

Should not select flake-investigator:
- Create a new page object.
- Explain an assertion library.
- Run the complete regression suite with no failure to inspect.

Ambiguous, select but constrain:
- "Fix this timeout" -> diagnose first, edit only after evidence.
\`\`\`

Treat these examples like behavioral tests for routing. After installation, present them to the agent in fresh sessions and record whether the skill was selected. A skill that performs brilliantly after manual invocation can still be badly designed if normal user language never triggers it.

## Make SKILL.md a control plane, not a knowledge warehouse

The main file should define the route through the workflow. It is not the place to archive everything the QA team knows. Start with the smallest frontmatter that identifies the skill, then organize the body around decisions that every investigation must make.

\`\`\`yaml
---
name: flake-investigator
description: Investigate intermittent UI and API test failures using test code, retry history, CI logs, and available artifacts. Use when a test passes inconsistently, fails only in CI, or needs evidence-based quarantine review.
---

# Flake investigation

1. Read the failing test, its fixtures, and the production path it exercises.
2. Collect the first failure and retry evidence before changing code.
3. Classify the likely source: product, test, environment, or unresolved.
4. Form one falsifiable hypothesis and run the smallest confirming check.
5. Apply a fix only when evidence identifies the mechanism.
6. Report evidence, classification, change, and remaining uncertainty.

## Routes

- For browser traces and selector timing, read references/ui-evidence.md.
- For status codes and polling behavior, read references/api-evidence.md.
- For quarantine decisions, read references/quarantine-policy.md.
- For JUnit history, run scripts/summarize-junit.ts against the supplied reports.
\`\`\`

Notice what is absent: an exhaustive catalog of locator strategies, HTTP semantics, CI provider syntax, and examples for every product area. Those details are available, but they do not compete with the six-step invariant process.

Each route has two parts: a condition and a destination. “See references” is weak because it makes the agent open files speculatively. “For status codes and polling behavior, read references/api-evidence.md” lets the agent defer the file until an API failure makes it relevant.

The frontmatter description also avoids implementation-only terms that a user may never say. A user is more likely to mention “passes locally” than “temporal nondeterminism.” Include the technical category in the body, but make the discovery text resemble actual requests.

For a deeper treatment of entry-point structure and portable metadata, use the [SKILL.md format guide](/blog/skill-md-format-guide). The progressive-disclosure decision begins after that syntax is correct: it determines which knowledge earns a place in the entry point.

## Split references by testing decision, not document size

Teams often split a long file into arbitrary chunks named \`part-1.md\`, \`part-2.md\`, and \`misc.md\`. That reduces file size but does not create progressive disclosure. An agent cannot infer which chunk answers a browser-timing question, so it may load all of them.

Reference boundaries should correspond to decisions in the test workflow. A UI evidence guide answers “what does the trace prove?” An API evidence guide answers “is the response or the assertion wrong?” A quarantine policy answers “is temporarily suppressing this test permitted?” These boundaries allow the main file to route with intent.

| Candidate content | Keep in SKILL.md | Move to reference | Turn into script | Reason |
|---|:---:|:---:|:---:|---|
| Four-way failure classification | Yes | No | No | Every investigation needs it |
| Complete product error-code catalog | No | Yes | Maybe | Needed only for matching services |
| Parse 200 JUnit result files | No | No | Yes | Deterministic, repetitive data work |
| “Do not delete assertions to pass CI” | Yes | No | No | Universal safety constraint |
| Approved defect-report wording | No | No | Asset | Reusable output shape |
| Browser-specific trace interpretation | No | Yes | No | Relevant only to UI evidence |
| Calculate pass rate by commit | No | No | Yes | Computation should be reproducible |

Prefer one level of references from the main file. Deep chains such as \`SKILL.md -> ui.md -> browsers.md -> chromium.md\` increase navigation overhead and make required knowledge easy to miss. If a reference is long, give it a table of contents and headings that match the vocabulary used in logs and test reports.

A practical layout looks like this:

\`\`\`markdown
flake-investigator/
├── SKILL.md
├── references/
│   ├── ui-evidence.md
│   ├── api-evidence.md
│   └── quarantine-policy.md
├── scripts/
│   └── summarize-junit.ts
└── assets/
    └── defect-report.md
\`\`\`

Avoid copying the same rule into multiple references. Duplication creates drift, and an agent may encounter conflicting versions depending on the selected route. Put shared invariants in \`SKILL.md\`; keep branch-specific facts in one authoritative resource.

## Use scripts where QA needs deterministic answers

Language models are good at forming hypotheses from mixed evidence. They are not the best place to repeatedly parse XML, count outcomes, normalize durations, or compare hundreds of retries. Put deterministic operations in scripts and let the skill explain when to run them and how to interpret their output.

Suppose the investigator receives several JUnit reports. A small TypeScript tool can return consistent counts instead of asking the agent to tally test cases by eye. The exact parser depends on your repository dependencies, but its interface should be boring and explicit:

\`\`\`typescript
type Outcome = {
  testId: string;
  attempts: number;
  passed: number;
  failed: number;
  firstFailure?: string;
};

export function classifyHistory(results: Array<{ id: string; status: string }>): Outcome[] {
  const grouped = new Map<string, string[]>();

  for (const result of results) {
    const statuses = grouped.get(result.id) ?? [];
    statuses.push(result.status);
    grouped.set(result.id, statuses);
  }

  return [...grouped].map(([testId, statuses]) => ({
    testId,
    attempts: statuses.length,
    passed: statuses.filter((status) => status === 'passed').length,
    failed: statuses.filter((status) => status === 'failed').length,
  }));
}
\`\`\`

The skill should not say merely “use the helper.” Define its input and expected output:

\`\`\`markdown
When two or more machine-readable result files are available, run
scripts/summarize-junit.ts with those report paths. Use its grouped outcome
table to identify mixed pass/fail histories. Do not treat a mixed history as
proof of test-code fault; correlate it with logs and artifacts.
\`\`\`

That final sentence preserves the reasoning boundary. The script establishes facts, while the agent interprets them in context. A parser can show that 7 of 20 attempts failed. It cannot, by itself, prove whether the environment, product, or assertion caused the pattern.

Scripts also reduce context use because the agent can execute a stable program rather than load its source on every invocation. Keep outputs compact and machine-readable when possible. Include actionable error messages for missing reports, malformed input, and zero matching tests. Test the script with representative passing, failing, mixed, and invalid fixtures before relying on it in a skill.

## Treat assets as output contracts

Assets are files intended to be copied, filled, or included in the result. In QA work, they often encode a shape that reviewers expect: a defect report, a release sign-off, an exploratory testing charter, or a test-plan skeleton. They differ from references because the agent does not need to absorb them as knowledge before every decision.

For the flake investigator, an asset can require evidence without expanding the main instructions:

\`\`\`markdown
# Intermittent failure report

## Test identity
- Test:
- Suite:
- Commit and environment:

## Observed pattern
- First failing attempt:
- Retry behavior:
- Reproduction rate:

## Evidence
- Logs:
- Trace or screenshot:
- Relevant code path:

## Classification
- Product, test, environment, or unresolved:
- Confidence and reason:

## Action
- Change made or proposed:
- Verification performed:
- Follow-up owner:
\`\`\`

The route in \`SKILL.md\` can say, “Use assets/defect-report.md when the investigation finds a product defect or remains unresolved after the permitted checks.” The asset stays unloaded during a simple test-code fix, but it becomes an exact output contract when escalation is necessary.

Do not use an asset to hide a safety rule. If every investigation must preserve raw evidence, that belongs in the main workflow. The template may include an evidence field, but the invariant should still appear in the operational instructions.

## Write routing language an agent can execute

Progressive disclosure succeeds or fails at the routing sentences. Each sentence should answer three questions: when is the resource relevant, what does it contain, and what should the agent do with it?

Weak route: “Additional documentation is in the references folder.”

Strong route: “If the failure occurs before the first network response, read \`references/ui-evidence.md\` and follow its trace-order checklist before editing selectors.”

The strong version has an observable condition, a named resource, and a required action. It also prevents a common QA failure mode: changing a selector before establishing whether the page ever reached the expected state.

Useful routing conditions include artifact presence, test layer, failure phase, risk level, and requested output. Avoid conditions based only on vague complexity, such as “for advanced cases.” Two agents may judge the same case differently. “When the response is 202 and the test polls for completion” is concrete.

| Routing signal | Example condition | Resource selected | QA value |
|---|---|---|---|
| Artifact | Trace archive is attached | UI evidence guide | Uses rich evidence before speculation |
| Protocol | Test waits on asynchronous API status | API polling reference | Applies service-specific timing model |
| Governance | Quarantine is requested | Quarantine policy | Prevents silent coverage loss |
| Volume | More than one result report exists | Summary script | Makes trend calculation reproducible |
| Deliverable | Product defect is demonstrated | Defect-report asset | Produces reviewable escalation |

Routes can also say when not to load something. “Do not read the full error-code catalog unless the failing service returns an application code” protects context just as effectively as a positive route.

## Match the disclosure boundary to risk

Not every testing instruction deserves the same degree of freedom. Progressive disclosure should tighten around risky, irreversible, or compliance-sensitive operations.

A brainstorming skill for exploratory test ideas can use high-level heuristics. Multiple outputs may be valid, and the cost of a weak suggestion is low. A production synthetic-test skill needs explicit environment checks, permitted accounts, and stop conditions. A database cleanup used by test setup may need a deterministic script with guarded inputs rather than prose that invites improvisation.

Use three practical levels:

1. **Guidance:** Give principles and examples when many approaches are acceptable. Exploratory charters and risk brainstorming fit here.
2. **Procedure:** Give ordered steps and decision gates when consistency matters but evidence varies. Failure triage and test review fit here.
3. **Automation:** Provide a tested script or tool when the operation must be reproducible. Report parsing and controlled fixture generation fit here.

Progressive disclosure does not mean dangerous details should be merely hidden deeper. The main body must state safety boundaries before routing to an operational script. For example, “Use only the configured test environment; stop if the target cannot be verified” belongs before any resource that creates data.

The appropriate boundary also depends on how often a fact changes. Stable HTTP semantics can live in a reference. A frequently changing list of test accounts may belong in a source system queried by a tool, not copied into Markdown. Keep secrets out of skills and assets. The skill should describe how to obtain authorized data without embedding credentials.

## Map the pattern across agent ecosystems

QA teams rarely use one agent forever. The same progressive-disclosure thinking can inform several instruction systems, even though their native formats and loading behavior differ.

| Ecosystem | Project location | Primary role | Disclosure behavior |
|---|---|---|---|
| Claude Code skills | \`.claude/skills/<name>/SKILL.md\` | Reusable procedure or reference | Description is discovered, body loads when invoked or relevant |
| Claude personal skills | \`~/.claude/skills/<name>/SKILL.md\` | Cross-project personal workflow | Same skill model across the user’s projects |
| GitHub Copilot | \`.github/copilot-instructions.md\` | Repository-wide instructions | Broad instructions are available for the repository |
| GitHub path instructions | \`.github/instructions/*.instructions.md\` | File-scoped guidance using \`applyTo\` | Detail is associated with matching paths |
| AGENTS.md | Nearest applicable \`AGENTS.md\` | Directory-scoped agent guidance | More specific nearby files govern nested work |
| Cursor rules | \`.cursor/rules/*.mdc\` | Always, glob, described, or manual rules | \`alwaysApply\`, \`globs\`, and \`description\` control inclusion |
| Gemini CLI | \`GEMINI.md\` | Hierarchical project context | Supplies instructions according to its context discovery |

These are not interchangeable file formats. Do not paste skill frontmatter into \`AGENTS.md\` and expect skill discovery, or invent \`applyTo\` behavior for a Claude skill. Instead, preserve the information architecture: stable repository facts go into the tool’s persistent instruction mechanism; task procedures go into invocable or relevance-selected units; domain detail sits behind a clear route where the ecosystem supports it.

Cursor’s metadata deserves special care because \`.mdc\` rule selection can approximate a disclosure layer. A rule can be always applied, associated with globs, available based on its description, or manually selected. The [Cursor SKILL.md frontmatter schema guide](/blog/cursor-skill-md-frontmatter-schema-guide) explains the distinction between portable skills and Cursor-native rule metadata so QA teams do not merge two schemas by accident.

Ready-made QA skills from qaskills.sh can be installed with the qaskills CLI when an existing workflow fits. Review the installed entry point and resources just as you would review test framework code, especially before allowing scripts to run in a repository.

## A complete flaky-test skill, disclosed one branch at a time

Consider a CI failure in \`checkout.spec.ts\`. The first attempt times out waiting for the confirmation heading; the retry passes. The repository includes a trace, console log, and two JUnit reports. Here is how the layered design behaves.

First, metadata matches “fails only in CI” and selects the skill. The agent reads the invariant workflow, collects evidence before editing, and classifies the failure. Because a browser trace exists, it loads only \`ui-evidence.md\`. Because multiple reports exist, it runs the summary script. It does not read the API guide because the trace shows the request completed successfully. It does not load the quarantine policy because nobody requested quarantine and a mechanism can still be investigated.

The UI reference could contain a compact evidence order:

\`\`\`markdown
# UI evidence order

1. Confirm the expected navigation and final URL.
2. Find the first action whose resulting state differs from the passing retry.
3. Compare network completion with DOM readiness.
4. Check whether the locator identifies zero, one, or multiple elements.
5. Inspect overlays, animation, and disabled state before changing waits.

Record the earliest divergence. Later timeouts are consequences until proven otherwise.
\`\`\`

The summary tool reports one failure and one pass for the same test identity. The trace shows the confirmation response completed, but a loading overlay remained attached for 400 milliseconds longer than on the retry. The button click happened while the overlay intercepted pointer events. This evidence supports a synchronization defect in the test or application contract, not a random timeout.

The agent now forms a falsifiable hypothesis: waiting for the overlay to become hidden after the final request will remove the race without increasing a global timeout. It implements the narrow synchronization at the page-object boundary and repeats the targeted test under the CI-equivalent configuration. It preserves the assertion on the confirmation heading.

The final report is short because the skill supplied structure:

\`\`\`markdown
Classification: test synchronization defect.

Evidence: the failing trace shows the confirmation response completed, but the
loading overlay still intercepted the submit action. The passing retry performs
the same action after the overlay detaches.

Change: wait for the checkout overlay to become hidden at the page-object action
boundary. No timeout or assertion was weakened.

Verification: targeted repetitions passed under the CI-equivalent project.
Remaining uncertainty: monitor the next scheduled run for environment variance.
\`\`\`

This is full capability from small context. The agent used metadata, one operational body, one reference, and one script output. It left two references, a policy, and an asset untouched.

## Evaluate both routing efficiency and testing quality

A progressive skill needs two kinds of evaluation. Task evaluation asks whether the agent solved the QA problem correctly. Disclosure evaluation asks whether it loaded only the material needed to solve it. Optimizing only one can produce a dangerous result: a tiny skill that misses required policy, or a correct skill that floods every request with the entire library.

Build a scenario set covering happy paths, adjacent requests, ambiguity, missing artifacts, and high-risk actions. Run each scenario in a fresh context so previous skill content does not contaminate selection.

| Scenario | Expected selection | Expected resources | Quality assertion |
|---|---|---|---|
| UI retry passes after timeout | Select | UI guide, history script if reports exist | Earliest divergence is identified |
| API contract fails consistently | Do not select flake skill | None | Route to deterministic failure workflow |
| Intermittent 202 polling failure | Select | API guide | Polling contract is checked before timeout change |
| User asks to quarantine immediately | Select | Quarantine policy | Evidence and approval conditions are reported |
| New test generation request | Do not select | None | A generation workflow handles it |
| Malformed result file | Select | Summary script | Script error is surfaced, not guessed around |

Track at least these measures:

- **Trigger precision:** selected scenarios divided by all selected scenarios.
- **Trigger recall:** correctly selected positive scenarios divided by all positive scenarios.
- **Resource precision:** resources actually needed divided by resources loaded.
- **Procedure adherence:** required invariant steps completed.
- **Diagnosis quality:** classification supported by specific evidence.
- **Fix integrity:** assertions and coverage remain meaningful.

Context tokens can be measured where the tool exposes usage, but resource count and loaded line count are useful proxies. Do not reward minimum context if it lowers procedure adherence. The winning design is the smallest context that maintains or improves reliable testing outcomes.

Review failures as architecture signals. A missed trigger suggests weak metadata. Loading both UI and API references suggests vague routing. Skipping an evidence-preservation rule suggests it was buried in a resource instead of placed in the main body. Repeated manual calculations suggest a missing script.

## Diagnose progressive-disclosure failure modes

Several designs look modular but still waste context or reduce reliability.

### The description promises everything

A description that mentions test generation, debugging, performance, security, accessibility, release management, and reporting will trigger too broadly. Split capabilities around user intent. A flake investigator and an accessibility audit are separate procedures even if both read browser tests.

### The body is a table of contents with no invariant process

If \`SKILL.md\` contains only links, the agent must guess the workflow before choosing a reference. Keep the universal sequence and safety constraints in the body. Resources add branch detail, not the definition of success.

### Every route says “when needed”

This phrase transfers the design decision to the runtime agent. Replace it with observable conditions: artifact type, protocol state, requested deliverable, matching directory, or risk threshold.

### References repeat the same introduction

Repeated explanations consume context and create maintenance drift. Start each reference with its scope and the decision it supports. Assume the main workflow is already loaded.

### Scripts hide reasoning

A script that emits “flaky” without counts, inputs, or criteria is an oracle. Prefer output that exposes evidence. Let the skill define how that evidence influences classification.

### Critical constraints are disclosed too late

An instruction not to use production credentials cannot wait inside a data-setup reference. Put safety and authorization boundaries in the earliest layer that can prevent harm.

### Resource names describe formats, not purposes

\`notes2.md\` and \`large-reference.md\` are not routable. Names such as \`quarantine-policy.md\` and \`api-polling.md\` communicate the decision they support.

## Refactor a monolithic QA prompt without losing knowledge

Migration is safer when you classify content before moving it. Do not begin by deleting paragraphs to hit an arbitrary line target.

First, annotate each block in the current prompt as metadata, invariant procedure, branch knowledge, deterministic operation, output template, or always-on repository fact. If a block serves multiple roles, rewrite it into separate statements. For example, a paragraph may combine the universal rule “do not weaken assertions” with a Playwright-specific locator example. Keep the rule in the skill body and move the example to the UI reference.

Second, extract stable repository facts. Test commands, protected environments, and mandatory review policies may belong in \`AGENTS.md\`, \`GEMINI.md\`, Copilot instructions, or the relevant persistent mechanism. Do not duplicate them in every skill unless the skill needs to restate a critical safety boundary.

Third, write the invariant workflow from scratch using the annotations. This is often clearer than cutting a long document into fragments. Add routes only after each resource has a single purpose.

Fourth, convert repeated transformations into scripts. Begin with operations that are easy to assert: parsing reports, validating a generated file, checking required report headings, or selecting changed test files. Keep investigative judgment in the agent workflow.

Fifth, run the old and new designs against the same QA scenarios. Compare diagnosis, edits, evidence, loaded resources, and report usefulness. If the new design misses a rule, decide whether it is universal or branch-specific, then place it at the correct layer. Do not automatically put every missed detail back into \`SKILL.md\`.

Finally, remove the monolith only after the routed version passes the scenario suite. Progressive disclosure is an information architecture change, so validate it with the same care as a test-framework refactor.

## Keep the skill healthy as the test system changes

A skill decays when repository behavior changes but its routes and resources do not. Assign ownership and review it alongside related automation changes.

When a new test layer appears, resist adding its entire guide to the main file. Add a route only if the existing skill genuinely owns that workflow. If component-test flakes use the same evidence sequence, a focused component reference may fit. If the work has a different goal, create another skill.

Review the description when users adopt new language. Teams may stop saying “flaky” and start saying “non-deterministic CI failure.” Add representative phrases without turning the description into a keyword list. Keep within the portable metadata limits.

Review scripts when result formats or dependencies change. Test them independently and keep their command interface stable where possible. Review assets when issue-tracker requirements change. Review references when frameworks introduce new evidence types.

The operational checklist is compact:

1. Confirm the description still selects the intended QA requests.
2. Confirm every main-body instruction is universal to the workflow.
3. Confirm every resource route has an observable condition.
4. Confirm scripts fail clearly on invalid input.
5. Confirm safety boundaries appear before side-effecting actions.
6. Confirm scenario tests cover adjacent workflows and non-selection.
7. Confirm no resource duplicates an authoritative policy elsewhere.

Progressive disclosure gives agent skills a rare combination: a small footprint during ordinary work and deep competence when evidence demands it. For QA teams, that means less irrelevant prompt material, more consistent investigations, and an architecture that can grow with the automation estate without turning every request into a documentation-loading exercise.

## Frequently Asked Questions

### How small should the main SKILL.md file be?

There is no useful universal word target. Keep the invariant QA workflow, decision gates, safety boundaries, and resource routes in the main file. Move browser-specific evidence, API catalogs, long examples, and policy detail into named references. A good test is whether removing a paragraph would make the next correct step unclear for every invocation. If not, the paragraph probably belongs behind a route. Many platforms also recommend keeping the entry point concise, but task performance matters more than winning an arbitrary line-count contest.

### Can progressive disclosure cause an agent to miss an important testing rule?

Yes, if a universal rule is placed too deep or the route is vague. Prevent this by keeping non-negotiable constraints in the earliest applicable layer. “Do not weaken assertions to make CI pass” belongs in the main workflow, while a service-specific retry schedule belongs in an API reference. Evaluate missing-artifact and ambiguous scenarios, not just ideal cases. When a rule is skipped, treat the failure as a placement problem: decide whether the rule is universal, branch-specific, or repository-wide, then move it accordingly.

### Should every long QA reference become its own skill?

No. Create a separate skill when the user intent, trigger language, or invariant workflow differs. Keep a reference inside an existing skill when it supplies optional detail for the same outcome. Browser trace interpretation and API polling can be references within one intermittent-failure investigation because both support the same classification process. Accessibility auditing should usually be separate because it has different triggers, evidence, and success criteria. Splitting solely by file size produces overlapping skills and unreliable selection.

### How do I prove that progressive disclosure improved my agent workflow?

Run the monolithic and layered versions against the same fresh-session scenario set. Compare trigger precision, required-step adherence, diagnosis evidence, fix integrity, loaded resource count, and context usage where available. Include negative requests that should not select the skill and risky requests that must surface policy. Improvement means the layered version preserves or raises QA outcome quality while loading less irrelevant material. A lower token count alone is not success if the agent skips a release rule or misclassifies a product defect.
`,
};
