import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Claude Skill Descriptions: Writing Frontmatter That Triggers Reliably',
  description: 'Fix a Claude skill description not triggering by writing precise frontmatter, mapping QA intent, testing prompt coverage, and diagnosing routing conflicts.',
  date: '2026-07-15',
  category: 'Guide',
  content: `
# Claude Skill Descriptions: Writing Frontmatter That Triggers Reliably

Your accessibility-audit skill may contain a flawless procedure, yet Claude cannot benefit from instructions it never chooses to load. When an engineer asks, “Check this form against WCAG and turn the findings into reproducible tests,” the routing decision happens before the detailed checklist can help. A vague description makes a capable skill functionally invisible.

That is the core of a Claude skill description not triggering: the failure usually sits in the small metadata surface that represents the capability, not in the long Markdown procedure below it. Improving the body will not fix a discovery mismatch.

This guide treats frontmatter as a QA problem. You will derive trigger language from real work, construct a description with deliberate coverage and boundaries, create positive and negative prompt cases, diagnose collisions, and measure whether revisions improve selection without making the skill claim unrelated tasks.

The goal is not to stuff keywords into YAML. It is to write a compact routing contract that lets Claude recognize the testing outcome, relevant artifacts, and situations in which the skill adds a specialized workflow.

## See the routing decision before the procedure begins

A \`SKILL.md\` has two audiences at two different times. Its frontmatter represents the skill while Claude is deciding what capability applies. Its Markdown body supplies instructions after the skill is selected. Selection guidance placed only in the body arrives too late to influence discovery.

For QA teams, picture an internal skill named \`review-accessibility-results\`. Its body explains how to inspect automated scanner output, verify issues manually, avoid unsupported severity claims, and create regression tests. If its description says “Helps improve quality,” nothing distinguishes it from test review, defect triage, or release analysis.

The metadata contract is deliberately small:

\`\`\`yaml
---
name: review-accessibility-results
description: Review automated and manual web accessibility findings, reproduce violations, distinguish tool findings from confirmed user impact, and propose regression checks. Use when asked to analyze accessibility scan output, investigate WCAG failures, verify keyboard or screen-reader behavior, or turn confirmed accessibility defects into maintainable tests.
---
\`\`\`

Only \`name\` and \`description\` belong in the skill frontmatter covered here. Keep the name at no more than 64 characters and the description at no more than 1024 characters. Do not invent metadata fields to compensate for unclear prose.

The body can still be rich. It can define evidence thresholds, tool-specific steps, output templates, and references. Frontmatter has a narrower job: make the correct workflow a credible match for the request.

## Separate discovery bugs from execution bugs

Before editing a description, establish what failed. “The skill did not work” can describe several different behaviors, and each points to a different repair.

| Observed behavior | Likely layer | Useful diagnostic | Appropriate change |
|---|---|---|---|
| Skill never appears relevant to an obvious request | Discovery | Try a fresh session with direct and symptom-based prompts | Improve description coverage and confirm installation scope |
| Skill activates for almost every testing request | Discovery | Run unrelated and neighboring prompt cases | Narrow capability and context language |
| Skill activates, then skips evidence review | Execution | Inspect the loaded procedure and result | Reorder or strengthen body instructions |
| Skill follows procedure but lacks project facts | Resource or repository context | Check whether the referenced material exists and is current | Repair resource routing or documentation |
| Skill succeeds only after the user explicitly names it | Usually discovery | Compare named invocation with an unassisted natural request | Add the missing intent, artifact, or situation to metadata |

Use a new conversation when testing selection. Prior discussion can supply context that masks a weak description. Record whether the skill was selected separately from whether the final QA work was correct.

Also check scope before rewriting. A project skill belongs under \`.claude/skills/\` in the relevant repository. A personal cross-project skill belongs under \`~/.claude/skills/\`. A perfectly written description cannot route from a location the current project is not using, and a misplaced folder can imitate a wording defect.

Once you know discovery is the failing layer, frontmatter revision becomes a controlled experiment rather than a hopeful rewrite.

## Collect the phrases QA engineers actually use

Reliable descriptions begin with a prompt corpus. Gather requests from issue comments, failed pipeline discussions, test review conversations, and the language engineers use when asking an agent for help. Remove secrets and customer data, but preserve how the work is described.

For an API compatibility skill, people may not say “perform contract governance.” They may say:

- “Compare this OpenAPI change with the last version.”
- “Will removing this response field break our consumer tests?”
- “Explain why the schema diff job failed.”
- “Check whether this endpoint change is backward compatible.”
- “Turn the approved contract change into a regression case.”

Those requests reveal several dimensions: actions such as compare and explain, artifacts such as an OpenAPI document or schema diff, symptoms such as a failed compatibility job, and outcomes such as a backward-compatibility decision.

Build a vocabulary map before drafting:

| Dimension | Questions to ask | API QA examples |
|---|---|---|
| Desired action | What does the engineer want Claude to do? | compare, classify, verify, explain, create regression coverage |
| Work object | What artifact or system is being handled? | OpenAPI document, response schema, consumer contract, compatibility report |
| Trigger situation | What prompted the request now? | pipeline failure, proposed endpoint change, removed field, changed status code |
| QA payoff | What decision should become safer? | accept change, block change, update consumer, add a test |
| Boundary | What nearby job uses a different workflow? | general API implementation, load testing, authentication design |

Do not paste the whole map into the description. Use it to select the smallest set of terms that represents the breadth of legitimate requests. Prefer stable user intent over temporary repository jargon. A job label such as “spec guard v2” may disappear, while “backward-compatible API change” remains meaningful.

## Build descriptions from capability, action, object, and context

A practical description answers four questions in natural prose:

1. What specialized capability does the skill provide?
2. What actions does it perform?
3. What QA artifacts or systems does it operate on?
4. In which user situations should it be selected?

This is a composition aid, not a required syntax. Frontmatter still contains a normal \`description\` string.

Compare two versions:

\`\`\`yaml
---
name: analyze-api-contract-changes
description: Helps with API quality and schema testing.
---
\`\`\`

The weak version names a broad area but does not reveal whether the skill generates tests, reviews specifications, investigates runtime failures, or configures a tool.

\`\`\`yaml
---
name: analyze-api-contract-changes
description: Analyze proposed API contract changes for backward compatibility, explain schema-diff failures, identify affected consumers, and design focused regression checks. Use when asked to compare OpenAPI versions, review changed request or response fields, investigate a contract-test pipeline failure, or decide whether an endpoint change is breaking.
---
\`\`\`

The improved version gives Claude multiple legitimate routes to the same specialized procedure. “Analyze,” “explain,” and “design” cover actions. “OpenAPI versions,” “fields,” “consumers,” and “contract-test pipeline” ground the object and context. The final outcome is still coherent: assess contract change risk and produce evidence.

The description does not list the entire body workflow. It does not explain how to determine compatibility for every schema construct. That logic belongs after selection.

## Make the name reinforce the job without carrying it alone

The \`name\` is an identity, not a substitute for the description. Choose a short, hyphenated phrase that communicates the central action. A reviewer should be able to distinguish neighboring skills in a directory listing.

| Name | Signal quality | Problem or strength |
|---|---|---|
| \`qa-tools\` | Low | Names a department-sized category |
| \`api-helper\` | Low | Omits both the action and QA decision |
| \`analyze-api-contract-changes\` | High | Ties an action to a specific artifact and event |
| \`generate-api-tests\` | High for a different job | Clearly describes creation, not compatibility review |
| \`triage-contract-pipeline-failures\` | High but narrower | Appropriate if diagnosis is the only supported outcome |

Keep the name under 64 characters, using lowercase letters, digits, and hyphens. Make the folder match. Stability matters because teammates may refer to the capability in reviews or documentation.

Do not add every synonym to the name. \`analyze-review-compare-check-api-openapi-contract-changes\` is harder to read and still cannot express context. Let the description carry varied user language.

When two names appear interchangeable, the skills may overlap at the design level. Clarify whether one creates contract tests from requirements while another assesses a proposed schema change. If the execution paths and outputs are identical, merging may be better than competing descriptions.

## Cover symptoms as well as tool names

Engineers often arrive with a symptom, not a taxonomy. A description that contains only a framework name may match “Run an axe scan” but miss “Keyboard focus disappears when the dialog closes.” A description containing only symptoms may miss a direct request to process a known report.

Use both when the skill genuinely handles both. For accessibility result review, useful routes include:

- Tool or artifact: accessibility scan, audit report, browser evidence.
- User-observed symptom: missing focus, inaccessible name, keyboard trap, contrast failure.
- Requested action: reproduce, verify, classify, create regression coverage.
- Decision context: suspected false positive, release finding, repeated defect.

The resulting metadata might be:

\`\`\`yaml
---
name: verify-accessibility-findings
description: Verify web accessibility findings with reproducible browser evidence, classify confirmed impact and likely false positives, and define durable regression checks. Use when asked to review accessibility audit output, investigate keyboard navigation or focus behavior, validate accessible names or contrast findings, or convert a confirmed accessibility defect into an automated test.
---
\`\`\`

Only include symptom families the body is equipped to investigate. Adding “screen reader” because it attracts requests is harmful if the procedure has no way to gather or interpret that evidence. Coverage must correspond to capability.

Think of each phrase as a claim. If a trigger phrase selects the skill, the loaded instructions should materially improve the response compared with general reasoning.

## Describe artifacts that anchor ambiguous verbs

Words such as “review,” “check,” “fix,” and “validate” appear throughout QA. Alone, they provide almost no routing precision. Pair them with the thing being handled and the outcome being protected.

“Review test results” could mean unit coverage, a visual diff, a performance report, or a mobile crash log. “Review visual-regression diffs to separate intended UI changes from rendering instability” is much more selective.

Use an artifact-action matrix:

| Generic request fragment | Anchored description language | Specialized workflow implied |
|---|---|---|
| Review the results | Review visual snapshot diffs and baseline changes | Image comparison and approval evidence |
| Fix the tests | Repair generated test data that violates fixture contracts | Data-builder diagnosis and focused correction |
| Check the build | Investigate mutation-testing survivors and missing assertions | Test adequacy analysis |
| Validate this change | Validate database migration rollback behavior in integration tests | Migration-specific setup and recovery checks |
| Analyze the report | Analyze load-test latency distributions and error groups | Performance evidence interpretation |

Artifacts reduce collision because they locate the action in a domain. Outcomes narrow it further. A performance report skill might calculate nothing itself, but it may provide a disciplined way to interpret percentile changes, correlate error groups, and avoid conclusions based on average latency.

Do not fabricate file extensions, report paths, or command flags to look specific. Name well-established artifact concepts. Let the body discover the project’s actual tooling and files from repository context.

## Replace adjective-heavy claims with observable work

Descriptions often fail because they market the skill instead of describing it. “Powerful,” “comprehensive,” “intelligent,” and “best-in-class” consume space without improving selection. Claude needs observable actions and contexts.

Weak:

\`\`\`yaml
description: A comprehensive and powerful solution for all advanced test automation needs.
\`\`\`

Specific:

\`\`\`yaml
description: Review test-data builders and fixtures for isolation, deterministic setup, cleanup ownership, and parallel-run safety. Use when asked to diagnose cross-test data leakage, duplicate-record failures, order-dependent integration tests, or unreliable cleanup in CI.
\`\`\`

The second version identifies exactly what the procedure inspects and when it applies. It also creates a natural exclusion: general browser locator failures do not belong.

Audit every clause with two questions. Could an engineer observe the action in the final response? Does the body contain specialized guidance for that action? If either answer is no, delete or replace the claim.

Precision does not mean technical density. A description should remain readable to the engineer who reports the problem. Internal acronyms are useful only when the intended users commonly include them and the spelled-out concept is also clear enough for other prompts.

## Control breadth with a single coherent outcome

There is tension between recall and precision. More trigger language can help a skill match varied requests, but excessive breadth makes it activate for work its body cannot handle. Use one coherent outcome as the constraint.

Consider a skill intended to examine test-data isolation. Adding “fixtures,” “seed data,” “cleanup,” “parallel tests,” and “order-dependent failures” expands routes toward the same diagnostic outcome. Adding “write E2E tests,” “review API security,” and “optimize CI” introduces unrelated workflows.

Classify proposed phrases:

| Phrase relationship | Include? | Example | Reason |
|---|---:|---|---|
| Direct action | Yes | diagnose test-data leakage | Defines the main job |
| Common artifact | Yes | fixture, data builder, seeded record | Helps recognize the work object |
| Symptom caused by the domain | Yes | duplicate record, order dependence | Captures how users encounter the problem |
| Verification outcome | Often | confirm isolation under parallel execution | Completes the diagnostic job |
| Neighboring but distinct activity | No | design an entire E2E strategy | Requires another process and inputs |
| Generic quality term | Usually no | improve reliability | Collides with many testing capabilities |

Negative wording can help clarify documentation for humans, but a long list of exclusions is not a substitute for a positive identity. Spend the limited description space explaining the supported capability. Resolve close boundaries through specific nouns and outcomes.

If a description needs many “except” clauses, revisit the skill design. The body may combine jobs that deserve separate packages.

## Keep trigger guidance out of the hidden body

A common anti-pattern is terse frontmatter followed by a detailed section titled “When to use this skill.” Human readers can see it, but selection cannot reliably benefit from body text that is loaded only after the decision.

Move essential situations into \`description\`. Keep the body focused on execution after activation. It may still clarify prerequisites or stop conditions, but those are operating rules, not the primary discovery mechanism.

For example, this division is sound:

\`\`\`markdown
---
name: inspect-visual-regressions
description: Inspect visual-regression failures, distinguish intended interface changes from unstable rendering or baseline drift, and recommend evidence-backed baseline decisions. Use when asked to review screenshot diffs, investigate visual snapshot failures, or approve, reject, or regenerate a UI baseline.
---

# Inspect visual regressions

1. Identify the changed view, browser, viewport, and comparison artifact.
2. Confirm whether the product change is expected from requirements or implementation context.
3. Separate content variance, animation, fonts, layout, and environment effects.
4. Approve a baseline change only when the new rendering is intended and reviewed.
5. Report evidence, affected coverage, action, and residual risk.
\`\`\`

The description explains selection. The body explains the safety-critical sequence. Repeating the same trigger list under the heading adds context cost without improving routing.

For syntax details beyond the two required fields, consult the [SKILL.md syntax and structure guide](/blog/skill-md-format-guide). Keep the source of truth compact so later edits do not leave contradictory trigger language in two places.

## Design a prompt suite before changing the wording

Treat metadata revision like a regression-tested change. Create a small suite of prompts with expected selection behavior. Include direct requests, symptom-led requests, artifact-led requests, ambiguous neighbors, and clear negatives.

For a visual-regression skill:

\`\`\`markdown
Positive cases

1. Review these screenshot diffs and tell me which baseline changes are justified.
2. Our visual snapshots fail only in the Linux CI browser image. Investigate the variance.
3. Is this changed account-page rendering an intended UI update or a regression?
4. The baseline was regenerated in this pull request. Check whether the evidence supports it.

Neighbor cases

5. Implement the new account settings layout from this mockup.
6. Write functional tests for the account settings form.
7. Diagnose why the form submission API returns a server error.

Ambiguous case

8. Fix the snapshot test.
\`\`\`

For the ambiguous prompt, define acceptable behavior. The skill may select and then gather the missing artifact and intent, or Claude may ask for context before selection. The unacceptable behavior is silently regenerating a baseline.

Use at least two phrasings for each important route. One should name the domain directly; another should describe the symptom as a practitioner would. Add prompts from developers, QA engineers, and build engineers because their vocabulary differs.

Preserve this suite during revision. Otherwise a phrase added to fix one miss may create three new false positives that nobody notices.

## Score routing quality with a small confusion matrix

You do not need a large benchmark to reason clearly. Record expected and observed selection for the prompt suite. Four counts expose the tradeoff:

| Outcome | Meaning | QA interpretation |
|---|---|---|
| True positive | Relevant prompt selects the skill | Desired accessibility or visual workflow becomes available |
| False negative | Relevant prompt misses the skill | Claude responds without specialized evidence gates |
| False positive | Unrelated prompt selects the skill | Wrong workflow adds friction or unsafe assumptions |
| True negative | Unrelated prompt does not select it | Neighboring work remains correctly routed |

An illustrative TypeScript model can keep test records consistent:

\`\`\`typescript
type RouteCase = {
  prompt: string;
  expected: 'select' | 'skip';
  observed: 'select' | 'skip';
  route: 'direct' | 'symptom' | 'artifact' | 'neighbor';
};

function isRegression(test: RouteCase): boolean {
  return test.expected !== test.observed;
}
\`\`\`

This is an evaluation helper, not a documented Claude configuration format. The labels help you spot patterns. If all symptom cases miss, the description may over-rely on tool names. If neighbors select, the capability language is too generic. If one exact phrase behaves inconsistently, add varied cases before concluding that a single word is magical.

Selection is not the only acceptance criterion. For true positives, also inspect whether the body produces the intended QA behavior. Metadata can deliver the right procedure, but it cannot rescue a procedure that lacks evidence thresholds.

## Repair a missed trigger one dimension at a time

Suppose \`analyze-api-contract-changes\` selects for “Compare these OpenAPI files” but misses “The compatibility job broke after we made a response field optional.” Do not rewrite every noun. Identify the uncovered dimension: the second request is symptom-led and refers to a pipeline context.

Add language such as “investigate a contract-test pipeline failure” if the body truly handles it. Retest the full suite. This one-dimension method preserves the signal from previous passing cases.

Use the failure pattern to choose the edit:

| Miss pattern | Likely gap | Candidate repair |
|---|---|---|
| Direct skill name works, natural request misses | Description lacks user vocabulary | Add a representative action, artifact, or symptom |
| Tool-specific prompt works, tool-neutral symptom misses | Metadata overfits a product name | Add stable domain language |
| Artifact prompt works, desired outcome misses | Description lists objects but not jobs | Add compare, classify, verify, or another supported action |
| Only long detailed prompts work | Context requirements are implicit | Name the core situation more directly |
| All prompts miss | May not be wording | Recheck file name, frontmatter parsing, and installation scope |

Avoid changing the \`name\`, description scope, and body simultaneously. A smaller edit makes the result diagnosable. Keep notes on which cases changed, especially when the skill is shared across repositories.

If the prompt is genuinely outside the capability, mark it negative rather than forcing coverage. High recall is not success when it routes the wrong testing procedure.

## Reduce collisions between neighboring QA skills

A mature catalog might contain skills for generating browser tests, reviewing test code, diagnosing visual failures, analyzing accessibility findings, and evaluating test data. Their descriptions share words such as “test,” “failure,” and “review.” Distinct outcomes must carry the routing burden.

Review neighboring frontmatter side by side:

\`\`\`yaml
generate-browser-tests: Create browser end-to-end tests from acceptance criteria and existing product behavior, with risk-based scenarios, maintainable locators, and focused execution. Use for new or expanded functional browser coverage.

inspect-visual-regressions: Inspect screenshot comparison failures and baseline changes, separate intended UI updates from unstable rendering, and document evidence for approval or rejection. Use for visual snapshot diffs and baseline review.

verify-accessibility-findings: Reproduce web accessibility findings, classify confirmed user impact and likely false positives, and design regression checks. Use for accessibility audit output, keyboard or focus defects, accessible-name findings, and confirmed WCAG issues.
\`\`\`

The snippet is a comparison worksheet, not one valid \`SKILL.md\` frontmatter block. Each real skill should have its own delimiters, \`name\`, and \`description\`.

Look for verbs that imply different work: generate, inspect, reproduce. Look for distinct primary evidence: acceptance criteria, screenshot diffs, accessibility findings. Look for different completion states: executable coverage, baseline decision, confirmed impact.

If descriptions remain indistinguishable after this exercise, the bodies probably overlap. Either narrow them around different outcomes or combine them. Two skills competing for the same request create unpredictable routing and duplicate maintenance.

## Use length for coverage, not for a miniature manual

The description can be up to 1024 characters, but the maximum is not a target. Every phrase should improve identification. A 300-character description can outperform a 900-character list of frameworks, file types, and aspirational claims.

Start with one sentence for capability and one for trigger contexts. Read it aloud. The first sentence should tell a QA lead what the skill accomplishes. The second should resemble situations that appear in real requests.

Cut these first:

- Repeated restatements of the skill name.
- Praise such as “robust,” “advanced,” or “high quality.”
- Workflow detail that matters only after selection.
- Tools the skill merely happens to support but does not specialize in.
- Rare synonyms added without a prompt case.

Protect these:

- The central testing action.
- The evidence or artifact that makes the workflow distinct.
- Common symptom-led entry points.
- The decision or output the procedure delivers.

Use a character count in your editor or a simple local text check before committing. Avoid relying on visual line length, especially when YAML wraps on screen. Stay under the documented limit and keep the value valid YAML.

## Avoid YAML mistakes that look like routing failures

Before tuning semantics, confirm that metadata parses. The file must be named \`SKILL.md\`, and the YAML frontmatter must be bounded by delimiter lines at the beginning. Provide the required \`name\` and \`description\` fields.

Keep a plain, single-line description when practical. YAML punctuation and multiline styles can be valid, but simplicity reduces accidental formatting errors during manual edits. If the description contains punctuation that makes a plain scalar hard to review, quote the value correctly rather than improvising extra fields.

A mechanical review checklist is short:

\`\`\`markdown
- File is named SKILL.md.
- Frontmatter begins on the first line and has closing delimiters.
- name is present, hyphenated, and no longer than 64 characters.
- Folder name matches the skill name.
- description is present and no longer than 1024 characters.
- No unsupported metadata fields were added as a routing workaround.
- A fresh session can exercise direct and indirect prompt cases.
\`\`\`

Separate parse validation from semantic evaluation. If no prompt can see the skill, inspect installation and syntax. If direct prompts succeed but indirect ones miss, work on coverage. If unrelated prompts also select it, work on precision.

This ordering saves time because it avoids polishing wording in a file that is misplaced or malformed.

## Review portability without assuming identical schemas

Teams frequently want the same QA rule available in Claude Code, Cursor, GitHub Copilot, and other agents. Share the intent, but do not assume frontmatter fields or precedence rules transfer unchanged.

Claude skills use the \`name\` and \`description\` frontmatter discussed here and can live in \`.claude/skills/\` or \`~/.claude/skills/\`. Cursor rule files are \`.mdc\` files under \`.cursor/rules\` and use documented fields such as \`alwaysApply\`, \`globs\`, and \`description\`. GitHub Copilot supports \`.github/copilot-instructions.md\` plus path-specific \`.github/instructions/*.instructions.md\` files with \`applyTo\` frontmatter. The AGENTS.md convention uses the nearest applicable \`AGENTS.md\`. Gemini CLI uses \`GEMINI.md\` as its context file.

For Cursor-specific metadata and selection patterns, read the [Cursor frontmatter schema guide](/blog/cursor-skill-md-frontmatter-schema-guide). Translate the invariant, such as “never accept a visual baseline without evidence that the change is intended,” into the host’s actual instruction mechanism.

Do not create imaginary compatibility fields in Claude frontmatter. Maintain explicit host variants if your team needs them, and review their scopes together whenever the QA policy changes.

## Establish a frontmatter review gate for the team

Description quality improves when review is based on examples rather than taste. Require a short routing packet with each new or materially changed skill:

1. The intended outcome in one sentence.
2. Five or more positive prompt cases from real QA language.
3. Three or more neighboring or negative cases.
4. The previous and proposed frontmatter for revisions.
5. Observed selection results from a fresh context.
6. One execution result showing the loaded body adds the intended safeguards.

Reviewers can then ask concrete questions. Does every claimed context have a body path? Are symptom phrases representative? Does the description collide with an existing skill? Is a false negative caused by wording, or does it expose unclear scope?

Use this decision matrix before approval:

| Review question | Approve signal | Revise signal |
|---|---|---|
| Is the outcome singular and recognizable? | One testing decision or deliverable | Several unrelated QA jobs |
| Does metadata reflect real requests? | Prompt corpus supports the vocabulary | Keywords came from brainstorming alone |
| Are artifacts and situations specific? | They distinguish this workflow | Only “quality,” “testing,” and “automation” appear |
| Are neighbors protected? | Negative cases remain unselected | Skill captures adjacent implementation work |
| Is execution aligned? | Every metadata claim has instructions | Description promises unsupported analysis |
| Is the evaluation reproducible? | Cases and observations are recorded | Success depends on one remembered chat |

Ready-made QA skills from qaskills.sh can be installed with the qaskills CLI, which can accelerate catalog setup. Apply the same frontmatter and prompt-suite review to installed skills, especially where your engineers use domain-specific language.

## Iterate from misses without chasing every phrase

Once deployed, collect genuine selection misses and false positives. Do not automatically append every missed phrase. First decide whether the request belongs to the skill, whether it represents a recurring wording pattern, and whether the body can serve it safely.

Group observations by dimension. Several misses mentioning “pipeline schema check” may show a missing CI context. One request to performance-test the endpoint is probably a boundary case, not a reason to broaden a compatibility skill.

Re-run the preserved suite after each material revision. Add the new real-world case so the same regression does not return. Periodically remove stale product codenames while retaining stable testing concepts.

Descriptions should evolve more slowly than implementation details. A test runner may change while the capability remains “verify accessibility findings.” Keep commands and tool procedures in the body or references. Keep the frontmatter centered on user intent, evidence type, and desired QA decision.

The most reliable description is not the one with the largest vocabulary. It is the one whose claims align with a focused procedure and whose selection behavior has been challenged by positive, negative, and ambiguous examples.

## Frequently Asked Questions

### Why does my Claude skill work only when I mention its name?

That pattern usually indicates that the natural request is not represented clearly in the description. Compare the named prompt with how engineers normally state the action, artifact, symptom, and desired outcome. Add the missing recurring dimension, then retest in a fresh context. Also confirm the skill is installed at the intended project or personal location. Do not fill the description with every possible synonym. A few representative phrases tied to a coherent workflow are more useful than a broad keyword list.

### Should the description list every testing framework the skill supports?

No. Include a framework when it is central to the specialized procedure or commonly appears in requests that should route there. Otherwise prefer stable task language, evidence types, and symptoms. A visual-regression review skill can describe screenshot diffs, baseline changes, and rendering instability without naming every browser runner. Long tool catalogs consume the character budget, become stale, and may attract requests the body cannot handle. Verify coverage with prompts from your actual repositories rather than assuming more product names improve selection.

### Can I put trigger examples in the SKILL.md body instead of frontmatter?

Examples in the body can clarify execution after selection, but they cannot replace trigger contexts in the description. The routing decision needs the frontmatter representation before the full procedure is loaded. Put the supported capability and important “use when” situations in \`description\`. Keep body examples focused on how to gather evidence, make decisions, and verify outcomes. If maintaining both creates repetition, retain the discovery language in metadata and remove the duplicate body section.

### How often should a team retest skill descriptions?

Retest when frontmatter changes, when a neighboring skill is added, when engineers report a consistent miss or false activation, and during periodic catalog maintenance. Preserve a compact prompt suite so testing does not rely on memory. Run cases in a fresh context and record selection separately from execution quality. Routine framework upgrades do not always require metadata changes if user intent stays constant. Revisit wording when the way engineers describe the work or the capability boundary genuinely changes.
`,
};
