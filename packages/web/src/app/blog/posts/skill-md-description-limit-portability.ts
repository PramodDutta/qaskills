import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md description limit portability Guide',
  description:
    'SKILL.md description limit portability: compare the 500 and 1,024 character contracts. See verified code, focused fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md description limit portability',
  keywords: [
    'SKILL.md description limit portability',
    'Agent Skills description limit',
    'QASkills metadata portability',
    '500 versus 1024 characters',
    'cross-agent frontmatter compatibility',
    'description truncation policy',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'malformed-skill-md-frontmatter-parser-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: ['https://agentskills.io/specification', 'https://zod.dev/api'],
  repoEvidence: [
    'packages/shared/src/schemas/skill-schema.ts',
    'packages/web/src/app/api/skills/route.ts',
  ],
  content: `SKILL.md description limit portability requires publishers targeting QASkills and the Agent Skills standard to stay within the stricter 500-character QASkills limit. A description from 501 through 1,024 characters may satisfy the broad specification, but current shared and web publish schemas reject it rather than truncating it.

The portable rule is the intersection of both contracts. Tests should preserve each boundary and keep any future shortening policy explicit.

## What does SKILL.md description limit portability need to prove?

SKILL.md description limit portability must prove what happens at 499, 500, 501, 1,024, and 1,025 characters across both documented contracts. It should also show that QASkills has two separate 500-character checks and no cited automatic truncation branch.

The shared boundary is \`packages/shared/src/schemas/skill-schema.ts\`. Its \`skillFrontmatterSchema\` requires a description string with at least ten and at most 500 JavaScript characters.

That file also defines \`skillCreateSchema\` with the same minimum and maximum. Parser output and programmatic creation therefore use matching description bounds inside the shared package.

The web publishing boundary is \`packages/web/src/app/api/skills/route.ts\`. Its local \`publishSkillSchema\` independently requires descriptions from ten through 500 characters before database work begins.

The [Agent Skills specification](https://agentskills.io/specification) allows a non-empty description up to 1,024 characters. That wider standard does not override a registry's narrower accepted profile.

For content intended to work in both places, use a description between ten and 500 characters. This intersection satisfies the repository schemas and remains below the broad maximum.

Keep this topic distinct from the general [SKILL.md format guide](/blog/skill-md-format-guide). Format guidance explains fields broadly, while this suite tests exact portability limits and failure stages.

Start with plain ASCII descriptions. ASCII makes JavaScript string length and the intended fixture count agree without introducing code-unit or grapheme questions.

At 499 and 500 characters, the shared frontmatter schema should accept an otherwise valid object. At 501, 1,024, and 1,025, it should return a description issue.

The API should reject 501 before slug lookup or insertion. A route test should authenticate the request, submit valid fields aside from length, and assert a 400 check response.

Do not claim that 1,025 has special meaning to current QASkills code. It is useful because it crosses the broad 1,024-character boundary and completes the comparison matrix.

The [Zod API documentation](https://zod.dev/api) describes string minimum and maximum validators. Repository tests should still assert local issue paths and status codes instead of depending on a complete library message.

No evidence path here shows truncation. If a future user interface shortens descriptions before submission, that behavior needs a separate visible policy, preview, and test.

Run the focused checks with the [CI test guide](/blog/validate-skill-md-in-ci-pipeline). Local schema, SDK, and API paths should fail the same over-limit fixture at their earliest owned boundary.

## Agent Skills description limit: current repository behavior

The Agent Skills description limit is wider than the current QASkills profile. A description can be valid under the broad 1,024-character maximum and still fail QASkills at 501.

This is a compatibility difference, not proof that either contract is wrong. Registries can apply narrower constraints when they document and enforce them consistently.

The shared schema's maximum is a direct numeric rule. It does not inspect words, bytes, rendered lines, or search snippets before deciding whether the string is too long.

The web route repeats that same numeric maximum in a private request schema. Since it does not import the shared creation schema, tests should guard both locations against drift.

At exactly 500 ASCII characters, both current QASkills checks accept the length. At 501, both reject it with a schema issue tied to description.

At exactly 1,024, the broad specification permits the length, while QASkills still rejects it. That row shows a valid standard skill that is not publishable unchanged here.

At 1,025, both policies reject the value. Keep that row to prove the broad edge, but do not treat its QASkills result as a separate branch.

The lower bound also matters for real fixtures. A repeated one-character description would fail the ten-character QASkills minimum, so every boundary helper must generate the requested full length.

Avoid adding a prefix after generating repeated text. If a helper creates 500 letters and then prepends a label, the actual fixture crosses the edge before check.

Assert the description's length before calling Zod. This catches fixture mistakes before a failing schema result is misread as policy evidence.

Use stable issue paths rather than full text. Zod wording may change with a dependency update, while \`description\` remains the contract field.

At the API layer, assert HTTP 400 and the response's check shape. Do not expect database calls, alert dispatch, or slug collision checks for an over-limit request.

Use [published skills](/skills) as examples of accepted descriptions, not as proof of a 500-character enforcement history. The cited schemas and focused requests are the direct evidence.

If public documentation currently says only "up to 1,024," add the QASkills profile limit near [publishing instructions](/how-to-publish). Authors need the narrower number before submission.

## Why does QASkills metadata portability change the contract?

QASkills metadata portability changes the contract because a portable artifact must satisfy every target's accepted subset. The broadest standard alone cannot guarantee acceptance by a registry with a smaller field limit.

For two targets, the safe maximum is the smaller maximum. Here, 500 is the shared upper bound even though the broad standard permits another 524 characters.

This rule should be visible in check output. An author needs to know that the file may be valid Agent Skills metadata but exceeds the QASkills publishing profile.

A generic "invalid description" message loses useful context. A better stable product error can name the 500-character maximum and actual measured length without claiming the broad file is universally invalid.

Do not silently truncate to achieve portability. Cutting text can remove scope, trigger conditions, exclusions, or the final clause that makes a skill description accurate.

If shortening is offered, show the proposed text and require author confirmation. Revalidate the result through both shared and route schemas before publication.

Byte truncation is especially unsafe. It can split a multibyte character and create invalid encoded text before the schema even evaluates string length.

Word truncation is safer for encoding but can still change meaning. A product policy should define how it preserves sentence boundaries and whether the author can edit the result.

The current repository evidence supports rejection, not transformation. Tests should characterize that behavior and label any shortening helper as proposed until code ships.

Metadata adapters may retain a longer source description for other targets while emitting a shorter QASkills variant. Such adapters need explicit target names and must not overwrite the canonical source without consent.

Keep one artifact per approved target variant if exact source history matters. Record which limit and revision produced each version, then test both against their target validators.

Use [seed catalog checks](/blog/seed-skill-catalog-parser-regression-tests) to scan accepted local skills after a limit change. Report measured over-limit counts instead of assuming all existing descriptions are short.

Portability passes when every target receives text that meets its own documented bounds and preserves intended meaning. It does not require every registry to adopt the widest available maximum.

## 500 versus 1024 characters test matrix

The 500 versus 1024 characters matrix should show QASkills shared check, QASkills API check, and the broad specification side by side. This layout makes the compatible intersection visible without merging distinct authorities.

| Case | Description length | QASkills shared and API result | Agent Skills specification result |
|---|---:|---|---|
| Below QASkills edge | 499 | Accept length when other fields are valid. | Accept length |
| At QASkills edge | 500 | Accept length when other fields are valid. | Accept length |
| Above QASkills edge | 501 | Reject description at check. | Accept length |
| At broad edge | 1,024 | Reject description at QASkills check. | Accept length |
| Above broad edge | 1,025 | Reject description at QASkills check. | Reject length |

Generate each value from one ASCII character and assert exact length. Keep all other frontmatter fields fixed and valid across the table.

The shared result should use \`safeParse\` and inspect issue paths. This avoids throwing and lets the test state accepted and rejected rows in one compact matrix.

The API result should use representative edges rather than duplicating every shared row. Test 500 as an accepted check handoff and 501 as a check response before persistence.

Mock authentication to return a valid user. Otherwise, a 401 response would occur before request parsing and would not prove the description boundary.

For the accepted API row, mock the database chain and nonessential side effects narrowly. The purpose is to prove 500 crosses check, not to retest every publish branch.

For the rejected row, assert that insertion is not called. This confirms the local route schema owns the failure before state changes.

Keep broad-standard expectations as documented comparison data, not executable calls to a remote service. The authoritative specification URL should be reviewed when its version changes.

If the broad specification revises its maximum, update only that column after verification. QASkills expectations should remain tied to repository code until an approved local change ships.

Pair this matrix with [frontmatter parser tests](/blog/malformed-skill-md-frontmatter-parser-tests) only for syntax coverage. A well-formed 501-character string is a schema boundary, not a YAML parsing failure.

Take a 640-char field as a worked case; it can fit the broad spec, but the QASkills checks must turn it down with no cut or write. Show the author the full count and the 500-char cap; keep the source text in place, since the first goal is to ask for a safe edit.

Read the text once and mark its key facts; a good field says what the skill does, when to use it, and what sort of task it can help test. Mark words that say the same thing twice; cut that waste first, since it saves space with less risk than loss of a key fact.

Swap long stock phrases for short, plain terms where the sense stays the same; do not change a product name, test kind, or key limit just to save room. Keep each "not for" clause that sets a true bound on use; such a clause may stop an agent from using the skill for the wrong job.

Write the first draft as a new value next to the source; this lets the author compare both forms and roll back if the short one has lost scope. Count the draft with the same string rule as the server; a word count or screen width does not prove that the field fits the 500-char check.

If the draft is 503 chars, ask for one more small edit; do not shave three bytes from the end, since bytes and the server's text count are not the same rule. If the draft is 498 chars, run the full field check; a good count alone does not prove the name, version, and list fields all pass.

Send that same draft to the web path in a test; the body must hold the exact text that passed the shared check, with no second trim or cut. The route should move past request checks at 500 or less; at 501, it should send a 400 result and make no call that writes a skill.

Keep the two texts in the test only when the edit flow is in scope. A pure cap test needs just one fixed string for each edge row.

If one skill must serve two tools, the source may hold both approved forms. Name the QASkills form so no build step can pick the long one by chance.

Do not call the short form a full copy when its words differ. Treat it as a target form with the same aim, then have the author sign off on its sense.

The release check should print target, count, cap, and pass state. That small set tells the team why one form works and one does not.

Do not place the whole field in a shared CI log. A hash and a local case name are enough when the source may have text that should stay in the repo.

At 1,024 chars, the same split still holds. The broad rule may pass that row, while both cited QASkills checks fail it at their own 500 cap.

At 1,025 chars, the broad rule fails too. Keep that row as proof of the far edge, not as a new path in QASkills code.

If a new local cap is planned, change no guide first. Add the new edge tests, scan stored rows, and check each place that shows the field in full or in part.

Cards and mail may need a short view even when the stored field is valid. That view rule is not the same as the write cap and needs its own test.

Search text may also use only part of the field. A search cut must not flow back to source data or change what the author chose to save.

The worked case ends only when the author-approved draft passes both local checks. The old 640-char text may still serve a tool that accepts the broad form.

This flow keeps each claim small and true. QASkills rejects above 500 now, the broad spec has its own cap, and no cited code makes a short form for the user.

## How should cross-agent frontmatter compatibility be verified?

Cross-agent frontmatter compatibility should be verified with the same generated descriptions against each local target schema. The first example protects QASkills shared boundaries and records stable issue paths.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { skillFrontmatterSchema } from '@qaskills/shared';

const validFrontmatter = {
  name: 'Portable Description Probe',
  version: '1.0.0',
  author: 'qa-team',
  license: 'MIT',
  tags: [],
  testingTypes: ['unit'],
  frameworks: [],
  languages: ['typescript'],
  domains: [],
  agents: [],
};

describe('QASkills description boundaries', () => {
  it.each([
    [499, true],
    [500, true],
    [501, false],
    [1024, false],
    [1025, false],
  ])('validates %i ASCII characters', (length, accepted) => {
    const description = 'd'.repeat(length);
    expect(description).toHaveLength(length);

    const result = skillFrontmatterSchema.safeParse({
      ...validFrontmatter,
      description,
    });

    expect(result.success).toBe(accepted);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'description')).toBe(true);
    }
  });
});
\`\`\`

This example does not encode the broad standard as another QASkills schema. Keep documented broad expectations in a policy test or generated compatibility report, since repository code does not own that standard.

The second example checks the web request boundary at 501. It authenticates first, then proves check responds before insertion.

\`\`\`typescript
import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/skills/route';
import { db } from '@/db';
import { getAuthUser } from '@/lib/api-auth';

vi.mock('@/lib/api-auth');
vi.mock('@/db');

beforeEach(() => {
  vi.mocked(getAuthUser).mockResolvedValue({ id: 'user-1', username: 'qa-team' } as never);
});

it('rejects 501 characters before database insertion', async () => {
  const request = new NextRequest('http://localhost/api/skills', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Portable Description Probe',
      description: 'd'.repeat(501),
      testingTypes: ['unit'],
      languages: ['typescript'],
    }),
    headers: { 'content-type': 'application/json' },
  });

  const response = await POST(request);
  const payload = await response.json();

  expect(response.status).toBe(400);
  expect(payload.error).toContain('Validation failed');
  expect(vi.mocked(db.insert)).not.toHaveBeenCalled();
});
\`\`\`

Adapt the user mock to the actual return type used by the route test harness. Keep its identity constant so only request data determines the result.

Add a 500-character accepted test if the route harness already has stable database mocks. Assert that check reaches the lookup branch, but avoid turning this boundary case into a full publication workflow test.

The shared and route tests should use the same ASCII generator. A shared helper can return text, but each test must still assert the resulting length.

Use exact numbers in test names. Labels such as "long description" become unclear when a limit changes or another target is added.

Run the final accepted variant through [how to publish](/how-to-publish). The request should retain the author's confirmed text and should not silently replace it between local check and API submission.

## description truncation policy acceptance criteria

Description truncation policy acceptance starts with the current fact that QASkills rejects over 500 characters. No cited repository branch shortens the description before shared or API check.

A no-truncation policy passes when 500 is accepted, 501 is rejected, and the original text remains available for the author to edit. The error should state the local limit and actual length.

An assisted-shortening proposal needs more tests. It must show the candidate text, require confirmation, preserve source text, and revalidate the confirmed result.

Never cut a string by bytes. That approach can break encoding and does not match Zod's string-length contract.

Avoid cutting at exactly 500 code units without checking meaning. The resulting text may end mid-sentence, lose a qualifier, or describe broader behavior than the skill actually supports.

If an adapter creates target variants, name them explicitly. A QASkills variant can stay within 500 while another target retains a longer standard-compliant description.

Both variants should share stable identity and version context without pretending their descriptions are byte-identical. Tests should compare intended meaning through review, not weak substring checks.

The publishing interface should show a live count based on the same string semantics as server check. Client feedback helps authors, but server schemas remain authoritative.

API errors must remain useful without exposing unrelated request data. Field, limit, and actual count are sufficient for this check case.

Run shared and route checks after every Zod upgrade or schema refactor. Duplicate numeric rules can drift even if each individual test remains internally consistent.

Use the [format guide](/blog/skill-md-format-guide) to publish the selected local maximum. Keep the broad 1,024 value in a comparison note so authors understand why a portable file may use less.

SKILL.md description limit portability passes when no accepted QASkills path exceeds 500 and no over-limit path silently alters author text. Any future transformation must be visible, confirmed, and tested as a new contract.

## How do you test SKILL.md description limit portability step by step?

Test SKILL.md description limit portability by building exact ASCII lengths and sending them through both current QASkills boundaries. Compare those results with the approved broad specification without implying that QASkills implements its wider maximum.

1. Read \`packages/shared/src/schemas/skill-schema.ts\` and record description minimums and maximums in both shared schemas, then note the stable issue path that proves an over-cap field failed without tying the test to all Zod message text, and keep the same base object for each case in the table
2. Read \`packages/web/src/app/api/skills/route.ts\` and confirm its local publish schema applies the same 500-character maximum before slug checks or writes, with a valid user mock so auth cannot hide the field result, then spy on the insert path to prove rejected text makes no write
3. Verify the current Agent Skills description maximum from its authoritative specification and record the reviewed version, while keeping that source-owned cap apart from the narrower result enforced by QASkills code, and cite that reviewed source next to the matrix in the test plan
4. Generate exact 499, 500, 501, 1,024, and 1,025 character ASCII descriptions from one helper, asserting each length before use and keeping all other fields fixed and valid, while using one plain char so code-unit count stays easy to inspect
5. Assert every generated length, then run the full matrix through \`skillFrontmatterSchema.safeParse\`, checking pass state and description issue paths without a broad snapshot that could hide an edge shift, and print only length plus issue path when an edge row fails
6. Send 500 and 501 through authenticated route tests, checking accepted handoff and rejected pre-insert behavior while proving the over-cap request makes no database insert or mail call, with the same request builder and all non-length fields held fixed
7. Test any shortening interface separately, including preview, author confirmation, source retention, and server revalidation, with the old and new text held apart so no helper can overwrite the source by chance, and fail if any step swaps the draft into source before clear consent
8. Run shared, route, and seed compatibility checks before publishing a local limit change, then report exact moved rows, stored data impact, and each client version that must adopt the new cap, with one owner named for shared, route, and client rollout work in the same release plan

Keep the broad column sourced from documentation. Do not create a fake remote validator that could suggest stronger evidence than the repository contains.

At each QASkills layer, assert the first owned response. Shared tests inspect Zod issues, while route tests inspect status, response shape, and absence of insertion.

Do not use random descriptions for exact edges. Deterministic repeated ASCII gives stable counts and makes a failure easy to reproduce.

Add prose-rich samples only for shortening review. Numeric check should remain independent from editorial quality or sentence structure.

Publish the resulting compatibility rule with [CI tests](/blog/validate-skill-md-in-ci-pipeline). Authors and maintainers should see the same 500-character QASkills maximum in code, tests, and guidance.

## SKILL.md description limit portability rollout and regression checks

SKILL.md description limit portability rollout should treat any maximum change as an API and publishing-policy change. Shared consumers, the web route, existing records, and author guidance can all move differently.

Schema owners should review both shared schemas. Web owners should review the private route schema, client counters, error display, and request tests.

Before raising the limit, inspect database columns, search indexing, cards, email templates, and metadata snippets. Acceptance at Zod alone does not prove every downstream surface handles longer text well.

Before lowering the limit, scan current records and seed files. Report exact over-limit counts and decide whether existing content is grandfathered, edited, or rejected on update.

Keep 499, 500, and 501 as permanent local regression rows. Keep 1,024 and 1,025 as portability rows while the broad specification uses that boundary.

Run an authenticated API rejection test on every route refactor. A shared schema can stay correct while the duplicated web schema drifts.

If shared and web limits are intentionally different later, document which entry point owns each profile. Do not leave contradictory errors to reveal the policy by accident.

If assisted shortening ships, monitor confirmed use without storing discarded private text in logs. Product metrics should not become a second unreviewed content store.

Update [seed regression checks](/blog/seed-skill-catalog-parser-regression-tests) after the focused suite passes. Broad data can reveal display and score effects, but exact fixtures remain the enforcement proof.

Coordinate effective dates for SDK and web changes. A client that accepts 1,024 while the server still rejects 501 creates avoidable failed submissions.

The minimum lasting suite has five shared rows, two route rows, a no-insert rejection assertion, and a documented broad comparison. Add transformation tests only if transformation code actually exists.

## Frequently Asked Questions

### What should Agent Skills description limit tests assert?

Assert the documented broad results at 1,024 and 1,025 characters, then keep those expectations separate from QASkills code. For QASkills, assert 500 succeeds and 501 fails in both shared and web boundaries. Do not present the wider standard as local acceptance.

### How does QASkills metadata portability affect the SKILL.md contract?

A skill targeting both contracts must satisfy their intersection, so its description should remain between ten and 500 characters. A 501-character description may meet the broad standard but cannot publish unchanged through current QASkills schemas. That difference should produce a clear local error.

### Which fixture best exposes 500 versus 1024 characters?

Use deterministic ASCII strings at 500, 501, 1,024, and 1,025 characters with identical valid metadata. The four rows show the shared edge, the portable gap, the broad edge, and rejection by both policies without Unicode length ambiguity in one table.

### When should teams check cross-agent frontmatter compatibility?

Run compatibility checks whenever either specification, shared schema, web route, SDK check, publishing UI, or metadata adapter changes. Also scan accepted skills before lowering a limit. Duplicated constraints can drift even when individual unit tests still pass before each release.

### What is the pass criterion for description truncation policy?

Current behavior passes when over-limit text is rejected unchanged with a clear 500-character error. Any future shortening flow must preserve source text, preview the candidate, require author confirmation, and revalidate the result. Silent or byte-based truncation should fail policy tests.

## Conclusion

SKILL.md description limit portability uses 500 characters as the safe maximum for QASkills and Agent Skills targets today. Protect 500 and 501 in both repository schemas, compare 1,024 and 1,025 against the broad standard, and reject rather than silently cut text.

Open the [skills directory](/skills), inspect a published SKILL.md, then use [how to publish](/how-to-publish) to apply this portability contract before publication. Confirm that both local checks receive the same text.`,
};
