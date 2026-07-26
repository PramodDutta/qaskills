import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Tokenizer version drift testing',
  description:
    'Tokenizer version drift testing: use repo evidence, focused fixtures, code examples, and CI checks to expose contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Tokenizer version drift testing',
  keywords: [
    'Tokenizer version drift testing',
    'how to tokenizer version drift testing',
    'tokenizer version drift testing example',
    'LLM token count regression',
    'tiktoken version drift test',
    'prompt truncation tokenizer change',
  ],
  relatedSlugs: [
    'golden-dataset-llm-evaluation-guide',
    'eval-dataset-versioning-guide-2026',
    'testing-llm-applications-guide',
    'llm-cost-budget-ci-guide',
  ],
  sources: [
    'https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken',
    'https://platform.openai.com/docs/models',
    'https://www.nist.gov/itl/ai-risk-management-framework',
  ],
  repoEvidence: [
    'seed-skills/prompt-testing/SKILL.md',
    'seed-skills/ai-system-quality-engineer/SKILL.md',
  ],
  content: `Tokenizer version drift testing runs a fixed prompt set through a named package and encoding, then compares token IDs, counts, and cut points with reviewed facts. A pass keeps the same results for the same setup. Any planned upgrade must show its count, budget, truncation, and cost changes before the new facts replace the baseline.

## What must Tokenizer version drift testing prove?

Tokenizer version drift testing must prove that local prompt math uses a known token rule. The report needs the package version, encoding name, model key, and count for every case.

Visible text can stay byte-for-byte equal while token splits change. That change can move a prompt across a budget line or cut it at a different place.

The test therefore owns the work done before an API call. Provider usage checks belong elsewhere because they also include message framing and service-side rules.

Use a fixed set with plain prose, code, JSON, spaces, emoji escapes, and more than one language. These forms split in different ways and reveal more than a single English sentence.

Each case needs a stable ID, exact UTF-8 input, expected count, and expected cut result. Store a digest so a hidden fixture edit cannot look like package drift.

The [OpenAI token counting guide](https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken) shows that encodings can split the same text differently. It also warns that message count rules may change by model.

The gate should first compare identity, then raw token IDs, then counts and app choices. This order tells a package change apart from a local budget bug.

The [LLM cost gate guide](/blog/llm-cost-budget-ci-guide) covers wider spend limits. This page checks the local count that feeds those limits before a request leaves the app.

A pass means the fixed prompt set matches reviewed facts under the resolved package and encoding. An upgrade branch may fail safely while its diff is being checked.

Browse the [AI testing skills](/skills) for full prompt checks, but keep this gate free from model output. No model call is needed to prove a local token split.

## Which repository behavior defines the test contract?

The repo treats token use and cost as values that can fail a test. The missing piece is proof of which local tokenizer produced the estimate.

Lines 591 through 639 of \`seed-skills/prompt-testing/SKILL.md\` check completion tokens, total tokens, and an estimated cost. Those checks depend on sound token facts from the response or local code.

Lines 65 through 70 of \`seed-skills/ai-system-quality-engineer/SKILL.md\` place token budgets in the fast deterministic gate. Tokenizer version drift testing fits that layer because it needs no judge.

The input contract includes prompt bytes, tokenizer package version, encoding name, model mapping, and budget limit. The output includes token IDs, count, cut index, kept text, and budget state.

Record both a direct encoding name and any model key used to select it. A model alias may resolve to a new encoding even when the package version stays fixed.

The current [OpenAI models page](https://platform.openai.com/docs/models) is the approved source for model information. Save the resolved model and encoding in the artifact rather than assuming a name will always map the same way.

Token IDs give stronger proof than counts alone. Two encodings could return the same count while splitting bytes at different points, which may change a later truncation result.

The [golden dataset guide](/blog/golden-dataset-llm-evaluation-guide) explains review of fixed cases. Here, each expected value is deterministic and should appear as a plain code diff.

Do not copy provider-reported use back into this baseline. That value can include wrappers and tool schemas that the local prompt fixture does not contain.

The final report should list old and new facts side by side. Reviewers need changed case IDs, count deltas, cut deltas, and budget flips without reading a raw token dump first.

## How to tokenizer version drift testing?

For how to tokenizer version drift testing, wrap the tokenizer behind a tiny adapter. Tests can then use the real pinned package and a changed fake without network work.

Build cases near key budget edges as well as well below them. An exact-limit case and a one-token-over case make off-by-one rules easy to see.

Keep one case with leading spaces, one with line breaks, and one with compact JSON. Add escaped non-ASCII text in source so the article and fixture files can remain ASCII.

Count the full prompt first, then apply the same cut rule used by the app. Save the kept token IDs and decode result when the library supports safe decode.

The first example follows the deterministic budget checks in \`seed-skills/ai-system-quality-engineer/SKILL.md\`. It uses a small adapter and exact Vitest checks.

\`\`\`typescript
import { describe, expect, it } from 'vitest';

type Tokenizer = {
  packageVersion: string;
  encoding: string;
  encode(text: string): number[];
};

type PromptFact = {
  caseId: string;
  packageVersion: string;
  encoding: string;
  tokenIds: number[];
  count: number;
  withinBudget: boolean;
};

function measurePrompt(
  caseId: string,
  text: string,
  budget: number,
  tokenizer: Tokenizer,
): PromptFact {
  const tokenIds = tokenizer.encode(text);
  return {
    caseId,
    packageVersion: tokenizer.packageVersion,
    encoding: tokenizer.encoding,
    tokenIds,
    count: tokenIds.length,
    withinBudget: tokenIds.length <= budget,
  };
}

describe('pinned prompt facts', () => {
  it('keeps identity, ids, count, and budget state', () => {
    const tokenizer: Tokenizer = {
      packageVersion: '1.0.0',
      encoding: 'fixture_base',
      encode: () => [101, 205, 309, 401],
    };

    expect(measurePrompt('json-short', '{"ok":true}', 4, tokenizer)).toEqual({
      caseId: 'json-short',
      packageVersion: '1.0.0',
      encoding: 'fixture_base',
      tokenIds: [101, 205, 309, 401],
      count: 4,
      withinBudget: true,
    });
  });
});
\`\`\`

Use the real library in one integration spec and save its resolved identity. Keep most policy tests on fixed adapters so an install fault does not blur app logic.

Never approve a changed snapshot without a short cause note. The diff should say whether package code, model mapping, fixture text, or truncation policy changed.

The [LLM app testing guide](/blog/testing-llm-applications-guide) adds model-level checks. This local suite should finish first and stop costly work when prompt math has moved.

## Tokenizer version drift testing example: scenario and assertion matrix

A tokenizer version drift testing example needs stable text, exact edge cases, a forced count change, repeat runs, and a load fault. The matrix ties each input to one clear result.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Baseline | Fixed JSON and prose with pinned encoder | Identity, IDs, counts, and budget states match | Any unreviewed fact changes | \`seed-skills/prompt-testing/SKILL.md\` |
| Exact boundary | Four tokens with a budget of four | Case remains within budget | Equality is treated as over budget | \`seed-skills/ai-system-quality-engineer/SKILL.md\` |
| Version change | Fake encoder adds one token to an edge case | Count delta and budget flip are named | Change is blamed on model output | [Token counting guide](https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken) |
| Repeated run | Same bytes and setup run three times | Token IDs and report order match | Cache or state changes a result | [OpenAI models](https://platform.openai.com/docs/models) |
| Load fault | Named encoding cannot be loaded | Run fails before any baseline write | Fallback encoding is used without a mark | [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) |

The exact boundary row proves the app uses \`<=\` where the contract allows all budget tokens. Add a one-token-over row to prove the opposite branch.

A load failure should not fall back to another encoding unless that path is explicit policy. Any fallback must appear in the result identity and baseline review.

Run each case from fresh text bytes and a fresh adapter instance. Hidden mutable caches should not alter IDs, counts, or the order of changed cases.

The [eval data versioning guide](/blog/eval-dataset-versioning-guide-2026) helps manage fixture changes. Keep tokenizer facts in a small file so a package upgrade yields a readable review.

## What failures expose LLM token count regression?

An LLM token count regression appears when fixed prompt bytes gain or lose tokens under a changed setup. The key proof is a local old-to-new diff, not a shift in model prose.

First, replace the adapter with one that splits a prior token into two. The edge case should move from four tokens to five and flip its budget state.

Next, keep the count equal but change token IDs. This mutation proves the suite can catch a new cut boundary that count-only tests miss.

Then change the model-to-encoding map while keeping the package version. The report should name the new encoding before it compares any case facts.

Remove the package version from the adapter and require an identity error. Unknown setup cannot be compared safely with a reviewed baseline.

The second example tests count drift and a cut change without calling an API. It keeps the failure local to the same contract used by \`seed-skills/prompt-testing/SKILL.md\`.

\`\`\`typescript
import { expect, it } from 'vitest';

function keepWithinBudget(tokenIds: number[], budget: number): number[] {
  return tokenIds.slice(0, budget);
}

it('reports a version change that moves the cut point', () => {
  const pinned: Tokenizer = {
    packageVersion: '1.0.0',
    encoding: 'fixture_base',
    encode: () => [10, 20, 30, 40],
  };
  const changed: Tokenizer = {
    packageVersion: '1.1.0',
    encoding: 'fixture_base',
    encode: () => [10, 20, 25, 30, 40],
  };

  const oldFact = measurePrompt('edge', 'fixed bytes', 4, pinned);
  const newFact = measurePrompt('edge', 'fixed bytes', 4, changed);

  expect(newFact.count - oldFact.count).toBe(1);
  expect(oldFact.withinBudget).toBe(true);
  expect(newFact.withinBudget).toBe(false);
  expect(keepWithinBudget(newFact.tokenIds, 4)).toEqual([10, 20, 25, 30]);
  expect(newFact.packageVersion).not.toBe(oldFact.packageVersion);
});
\`\`\`

Add a stale-baseline case where the fixture digest changes but expected facts do not. The gate should ask for a fixture review instead of calling the package wrong.

Add an empty prompt, a long prompt, and text ending in whitespace. These cases catch wrappers that trim input before token work.

The [LLM cost guide](/blog/llm-cost-budget-ci-guide) can use the new count after review. Until then, the package change should fail safely and keep both fact sets.

## How should tiktoken version drift test run in CI?

A tiktoken version drift test should run after dependency install and before any model eval. CI must expose the exact lockfile state and resolved tokenizer version.

Use the package manager to read the installed version rather than copying a desired range from a manifest. The resolved build is what produced the token IDs.

Load the encoding by its chosen name and record that name. If model lookup selects it, save both the model key and resolved encoding.

Keep the golden prompts in version control with byte digests. Read them without line-ending or whitespace cleanup, since those bytes can affect the split.

Run one small real-tokenizer spec and a larger set of adapter policy tests. The real check catches package drift, while fakes cover rare errors and exact boundaries.

Write results to a new run folder, then sort changed cases by ID. A package upgrade should produce one stable JSON diff across local and CI runs.

Fail on unknown identity, changed token IDs, changed counts, changed cuts, budget flips, missing cases, or duplicate cases. Permit changes only through a reviewed baseline update.

Set a short job time limit because local token work should be fast. A hang or encoding download attempt is a setup fault that should not trigger model tests.

The [blog index](/blog) links wider CI patterns. This job should publish both the old baseline and current facts when it fails, with prompt text redacted if needed.

Clean temporary output after the final artifact is saved. Do not update the committed baseline from CI or from an untrusted branch.

## Which assertions verify prompt truncation tokenizer change?

A prompt truncation tokenizer change needs checks on source bytes, token IDs, cut index, kept tokens, and final budget state. A count alone cannot prove the same text was kept.

Assert the source digest before encoding. This stops a line-ending edit or trim step from being mistaken for package drift.

Assert package version, encoding name, and model mapping as separate fields. Reviewers can then see whether code or lookup changed.

Assert the full token ID list for small golden cases. For large cases, keep a digest plus the first and last changed index to avoid huge reports.

Assert count and delta for every case. A total count across the set can hide one gain and one loss that cancel each other.

Assert the exact budget comparison at below, equal, and above boundaries. These three rows expose both tokenizer drift and an app off-by-one defect.

Assert the kept token IDs after truncation, then decode with the same safe method used by the app. Do not decode single tokens through a path the library warns may lose byte detail.

Assert no baseline file changes during a normal run. Only a named update command should write reviewed facts, and its diff must stay in the pull request.

Assert every planned case reaches passed or changed state. Missing, duplicate, errored, or skipped cases make the run incomplete.

The [golden dataset guide](/blog/golden-dataset-llm-evaluation-guide) offers wider review rules. This report should still lead with exact local facts, not an average token delta.

A useful failure names the case, old and new identity, count delta, first changed token, and budget effect. That message makes ownership clear before anyone calls a model.

## Step-by-step test implementation

Implement Tokenizer version drift testing in six steps from repo facts to an owned CI diff. Each step should be deterministic and free from provider calls.

Choose golden prompts from real builder output before any provider wrapper is applied, and keep one separate case for each app-added system message, tool schema, retrieval excerpt, chat history shape, and whitespace mode; this split lets the report show whether drift came from the tokenizer or from a prompt composer that quietly changed its byte stream, field order, separators, escaping, or trim policy while the human-readable content looked the same. For each long case, save the source digest, total count, exact budget, first changed token, cut index, kept-token digest, dropped-token digest, and decoded prefix, because matching totals can still hide a different split near the cut and send different instructions, examples, citations, or tool fields to the model.

Review an upgrade in two stages: first run the candidate package against current facts with no write access, then use a separate update command to create a proposed facts file that records old and new packages, encodings, model maps, changed case IDs, count deltas, cut deltas, budget flips, and one owner-approved reason for each change; this design stops the normal check from blessing its own output and gives reviewers a narrow file beside the lock change. Before merge, run both setups on one clean build, verify unchanged cases stay byte-identical, inspect every changed prefix with prompt and cost owners, test the fallback and rollback paths, and reject any cut that removes required context, tool JSON, safety rules, citations, or user content unless the product policy and its tests change in the same reviewed work.

1. Read \`seed-skills/prompt-testing/SKILL.md\` and \`seed-skills/ai-system-quality-engineer/SKILL.md\`, then record the token, cost, and fast-gate contracts used by the app.
2. Commit fixed prompt bytes for prose, code, JSON, whitespace, escaped Unicode, and budget edges, with stable case IDs and source digests.
3. Build an adapter that returns package version, encoding name, token IDs, counts, cut facts, and budget state without changing source text.
4. Run the pinned path and assert exact identity and facts, including below, equal, and above budget cases plus a full case count.
5. Inject split, mapping, identity, stale-data, and load faults, then require named changes, no fallback, and an unchanged baseline file.
6. Run the focused suite in CI, publish sorted old-to-new facts, clear temporary data, and assign each fault to dependency, fixture, adapter, policy, or build owners.

Start with a dozen prompts chosen for distinct byte shapes. Add cases when a real package update or prompt bug reveals a missing form.

Keep the update command apart from the check command. The [AI testing skills](/skills) can support related work, but no tool should approve its own drift.

Test the upgrade path in a pull request that changes only the lock and reviewed facts. Product code changes in the same diff make cause and effect harder to judge.

After merge, keep the prior facts in version history rather than in each report. The current artifact needs only the baseline ID and exact changed values.

## Failure triage and regression ownership

Start triage by comparing source digests. If they differ, the fixture or text builder changed before the tokenizer ran.

If source bytes match but package versions differ, inspect the lockfile and install log. The dependency owner decides whether the new split is planned.

If package versions match but encoding names differ, inspect model lookup and local setup. A model alias or map change owns that drift.

If identity matches but token IDs change, verify that the native data files are the same build. Cache damage or a bad package install may be the cause.

If token IDs match but budget state changes, the app's comparison or limit changed. Route that defect to prompt budget policy rather than the tokenizer owner.

If count matches but cut output changes, inspect slice and decode code. Equal totals do not rule out a changed prefix or byte boundary.

If only CI fails, compare runtime, lockfile, CPU package build, and cached assets. Do not approve CI facts merely because a laptop result looks sound.

If a case is missing, check data load and report merge before reading any delta. Complete case IDs are the first gate for all later findings.

The [eval dataset versioning guide](/blog/eval-dataset-versioning-guide-2026) can guide fixture ownership. Keep tokenizer, app policy, and data causes separate in each issue.

Close the fault with a reviewed identity and fact diff or a code fix that restores baseline behavior. Never erase the failing case to make counts agree.

## Frequently Asked Questions

### How do you detect tokenizer-version changes that alter prompt budgets, truncation points, usage estimates, and cost without changing visible text?

Run fixed prompt bytes through the pinned and candidate tokenizer, then compare package identity, encoding, token IDs, counts, and kept prefixes. Report every budget or cost input that flips. A reviewed upgrade can replace facts, but unchanged visible text alone is not proof of equal token behavior.

### What fixture best tests how to tokenizer version drift testing?

Use committed prompts covering prose, code, compact JSON, spaces, line breaks, escaped Unicode, and exact budget edges. Give each case a source digest and expected token facts. Run real-package checks for drift and fake adapters for split, lookup, load, and off-by-one faults.

### Which failure signal proves tokenizer version drift testing example?

The strongest signal is a source with the same digest producing changed identity, token IDs, count, or cut output. Name the first changed token and any budget flip. Also fail unknown package versions, changed model mappings, missing cases, duplicate cases, and silent fallback encodings.

### How should CI report LLM token count regression?

CI should show old and new package versions, encodings, model keys, counts, deltas, first changed token indexes, and budget effects by case ID. Sort changes and include fixture digests. Keep the baseline read-only so a failed dependency upgrade cannot rewrite the expected facts.

### When should tiktoken version drift test block a release?

Block any unreviewed identity, token, count, cut, or budget change for fixed bytes. Also block an encoding load fault, unknown fallback, stale fixture digest, and incomplete case set. A planned package update passes only after reviewers accept its full prompt and cost impact.

### How can teams keep prompt truncation tokenizer change repeatable?

Pin the package, save the encoding name, hash exact prompt bytes, and run before model calls. Compare token IDs as well as counts, and test three budget edges. Build fresh output, sort by case ID, avoid silent fallback, and keep baseline updates in reviewed source control.

## Conclusion

Tokenizer version drift testing gives a clear release signal when fixed bytes retain reviewed token IDs, counts, cut points, and budget states under a named setup. Any planned change should fail first, show its full local impact, and pass only after the baseline diff is approved.

Open the [AI testing skills directory](/skills) to choose a prompt test workflow. Then read the [golden dataset guide](/blog/golden-dataset-llm-evaluation-guide) before adding this fast dependency gate to CI.`,
};
