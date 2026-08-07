import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Inline Snapshot Migration Guide for Reviewable Test Diffs',
  description: 'A vitest inline snapshot migration guide for moving small snapshots into tests, reducing review friction, and avoiding brittle CI updates safely.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Vitest Inline Snapshot Migration Guide for Reviewable Test Diffs

This vitest inline snapshot migration guide shows how to move the snapshots that belong in the test file, while leaving large artifacts in external files. Inline snapshots use \`toMatchInlineSnapshot()\`, and Vitest rewrites the test file when snapshots are updated. The payoff is better code review: the assertion, input, and expected output sit in one diff, so reviewers do not have to jump between a spec file and a \`.snap\` artifact for small values.

The migration should be selective. Inline snapshots are excellent for compact objects, error messages, rendered text fragments, and small serialized domain values. They are a poor fit for long HTML documents, generated JSON payloads, screenshots, binary data, or snapshots that churn because the test has not controlled time, IDs, order, or environment paths. Moving noisy snapshots inline does not make them less noisy. It only moves the noise into a more visible place.

The workflow below is built for QA and test-automation engineers maintaining Vitest suites, often with AI coding agents proposing snapshot updates. You will audit existing snapshots, classify what should be inline, convert one test at a time, preserve update behavior in CI, add serializers where representation is the real problem, and diagnose the common migration failures. For runner-level tradeoffs, read the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). If the snapshots cover Playwright-rendered UI, locator quality from [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) still matters before any snapshot change.

## Decide What Belongs Inline Before Touching Code

Start by listing snapshot size, owner, and purpose. The fastest bad migration is a global replace that turns every \`toMatchSnapshot()\` into \`toMatchInlineSnapshot()\`. Vitest can update inline snapshots by rewriting source files, but that does not mean every expected value should live in a source file. The review surface is the deciding factor.

Inline snapshots work best when the expected value is short enough to understand next to the assertion. A stack-safe error message, a normalized DTO, a generated validation summary, or a compact component text tree can be ideal. A 900-line HTML tree is not ideal. A long payload hides the test's intent and makes future edits painful because the source file becomes dominated by fixture data.

Create a decision table before migrating:

| Snapshot kind | Inline fit | Reason | Better alternative when not inline |
| --- | --- | --- | --- |
| Error message with cause chain | Strong | Reviewers see input and expected wording together | None, if stable and short |
| Small object from a pure function | Strong | Captures structure without fixture navigation | Explicit assertions for critical fields |
| Medium API response fixture | Mixed | Useful if normalized and under reviewable size | External fixture plus schema assertions |
| Full rendered HTML page | Weak | Too large and brittle inside source | File snapshot or targeted DOM assertions |
| Generated SQL query text | Strong if formatted | Expected query is the contract | Dedicated file when many lines |
| Screenshot or visual baseline | Wrong boundary | Not a text snapshot problem | Visual snapshot tooling |

This table prevents a migration from becoming a formatting exercise. The real goal is improving the test's review interface. If inline placement makes the test harder to scan, keep the snapshot external and improve its naming or serializer.

## Audit Snapshot Calls with a Small Script

Before converting anything, find the current snapshot calls and estimate their footprint. The script below scans TypeScript and JavaScript files for common snapshot matcher names. It is intentionally an audit script, not a codemod. It gives you a worklist without pretending that regular expressions can safely rewrite arbitrary tests.

\`\`\`ts
// scripts/audit-snapshots.ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['src', 'test', 'tests'];
const extensions = ['.ts', '.tsx', '.js', '.jsx'];
const matchers = ['toMatchSnapshot', 'toMatchInlineSnapshot', 'toMatchFileSnapshot'];

type Finding = {
  file: string;
  line: number;
  matcher: string;
  text: string;
};

function walk(dir: string): string[] {
  try {
    return readdirSync(dir).flatMap(name => {
      const path = join(dir, name);
      const stat = statSync(path);
      return stat.isDirectory() ? walk(path) : [path];
    });
  } catch {
    return [];
  }
}

const findings: Finding[] = [];

for (const file of roots.flatMap(walk)) {
  if (!extensions.some(extension => file.endsWith(extension))) {
    continue;
  }

  const lines = readFileSync(file, 'utf8').split(String.fromCharCode(10));
  lines.forEach((text, index) => {
    const matcher = matchers.find(name => text.includes(name + '('));
    if (matcher) {
      findings.push({
        file,
        line: index + 1,
        matcher,
        text: text.trim(),
      });
    }
  });
}

console.table(findings);
\`\`\`

Run it with your normal TypeScript execution path, or compile it first if your repo does not run TypeScript scripts directly. The output gives you a list to review with owners. Add rough snapshot size by inspecting \`__snapshots__\` files or by opening the corresponding diff after one local update.

The point of this audit is sequencing. Migrate a few high-value snapshots first: small, frequently reviewed, and stable. Leave the large or flaky snapshots until you have fixed the reasons they churn.

## Convert One Small Snapshot by Hand

Here is a typical starting point. The test checks a formatter, and the expected value lives in a separate snapshot file.

\`\`\`ts
// test/format-validation-error.test.ts
import { describe, expect, it } from 'vitest';
import { formatValidationError } from '../src/format-validation-error';

describe('formatValidationError', () => {
  it('formats missing address fields', () => {
    const result = formatValidationError({
      path: ['shippingAddress', 'postalCode'],
      code: 'required',
      message: 'Postal code is required',
    });

    expect(result).toMatchSnapshot();
  });
});
\`\`\`

After migration, call \`toMatchInlineSnapshot()\` and let Vitest write the expected value. The first edit can leave the matcher empty. Run the test with the snapshot update flag, review the rewritten file, then commit the source change and remove any obsolete external snapshot entry.

\`\`\`ts
// test/format-validation-error.test.ts
import { describe, expect, it } from 'vitest';
import { formatValidationError } from '../src/format-validation-error';

describe('formatValidationError', () => {
  it('formats missing address fields', () => {
    const result = formatValidationError({
      path: ['shippingAddress', 'postalCode'],
      code: 'required',
      message: 'Postal code is required',
    });

    expect(result).toMatchInlineSnapshot();
  });
});
\`\`\`

Update only that file while you are migrating it. A focused command keeps unrelated snapshot churn out of the pull request.

\`\`\`bash
npx vitest run test/format-validation-error.test.ts -u
\`\`\`

Vitest documents \`--update\` and \`-u\` for updating snapshots. In watch mode, the terminal also supports updating failed snapshots interactively. In CI, do not rely on rewriting files. CI should fail on mismatches, missing snapshots, and obsolete snapshots so a human has to review the new expected output.

After the update, the test becomes self-contained:

\`\`\`ts
expect(result).toMatchInlineSnapshot(\`
  {
    "code": "required",
    "message": "Postal code is required",
    "path": [
      "shippingAddress",
      "postalCode",
    ],
  }
\`);
\`\`\`



## Keep External Snapshots for Large Artifacts

Inline snapshots are not a moral upgrade. They are a location choice. If the expected output is long enough that it dominates the test file, keep it external. For some artifacts, \`toMatchFileSnapshot()\` is more readable because the expected value can use a natural file extension and syntax highlighting.

\`\`\`ts
import { expect, it } from 'vitest';
import { renderInvoiceEmail } from '../src/render-invoice-email';

it('renders the invoice email template', async () => {
  const html = await renderInvoiceEmail({
    customerName: 'Riley Chen',
    invoiceNumber: 'INV-2026-0142',
    amountDue: '$1,240.00',
  });

  await expect(html).toMatchFileSnapshot('./snapshots/invoice-email.html');
});
\`\`\`

This is often better than an inline string because reviewers can open the HTML file, use editor highlighting, and compare changes without scrolling past a huge literal. A migration guide should explicitly protect these cases, otherwise the repository slowly fills with massive source files that nobody wants to edit.

Use this decision matrix during review:

| Expected output size | Suggested matcher | Review pattern | Migration note |
| --- | --- | --- | --- |
| 1 to 25 lines | \`toMatchInlineSnapshot\` | Review beside assertion | Strong migration candidate |
| 26 to 120 lines | Depends on readability | Review with owner judgment | Inline only if the test remains clear |
| More than 120 lines | \`toMatchFileSnapshot\` or fixture | Review as artifact | Do not inline by default |
| Binary or visual output | Visual or binary tool | Review in specialized viewer | Not a Vitest text snapshot migration |
| Highly dynamic output | Explicit assertions first | Stabilize before snapshotting | Do not migrate until churn is controlled |

These line counts are not Vitest rules. They are review ergonomics. Adjust them for your team, but keep a threshold written down so AI-generated pull requests do not inline everything blindly.

## Normalize Values Before Migrating

If a snapshot contains timestamps, random IDs, absolute paths, generated ports, or unordered arrays, migrate after stabilization. Inline snapshots make noisy values more visible, but visibility is not the same as correctness. First decide whether the noisy value is behaviorally important.

For a receipt formatter, an order ID might need a format assertion while the exact value can be normalized in the snapshot. A timestamp might need a fake clock. A path might need to be converted to a project-relative path. An unordered list might need a sort if the business contract does not promise order.

\`\`\`ts
import { expect, it, vi } from 'vitest';
import { buildReceiptSummary } from '../src/build-receipt-summary';

it('builds a stable receipt summary', () => {
  vi.setSystemTime(new Date('2026-08-07T10:30:00Z'));

  const result = buildReceiptSummary({
    orderId: 'ord_123456',
    totalMinor: 2599,
    currency: 'USD',
  });

  expect(result.orderId).toMatch(/^ord_/);
  expect({
    ...result,
    orderId: '<verified-order-id>',
  }).toMatchInlineSnapshot();
});
\`\`\`

The regular expression in this example belongs in the real test file. The important testing idea is separate: assert the invariant first, then replace the exact generated value in the snapshot.

What people get wrong: they use snapshot updates as approval. A snapshot mismatch is a prompt to investigate. It can be an intended change, but it can also be a clock leak, a locale change, a missing sort, or a product regression. Migration is a good time to make that distinction explicit.

## Use Serializers When Representation Is the Problem

Sometimes the snapshot is noisy because the raw object contains irrelevant internals. Vitest supports custom snapshot serializers through \`expect.addSnapshotSerializer\` or the \`test.snapshotSerializers\` config option. Use a serializer when the domain value has a clear public representation and raw inspection produces unstable or unreadable output.

\`\`\`ts
// test/serializers/http-exchange.serializer.ts
type HttpExchange = {
  kind: 'HttpExchange';
  method: string;
  url: string;
  status: number;
  durationMs: number;
};

export default {
  test(value: unknown) {
    return Boolean(
      value &&
      typeof value === 'object' &&
      (value as { kind?: string }).kind === 'HttpExchange',
    );
  },
  serialize(value: unknown) {
    const exchange = value as HttpExchange;
    return [
      'HttpExchange {',
      '  method: ' + exchange.method,
      '  url: ' + exchange.url,
      '  status: ' + exchange.status,
      '  durationMs: <redacted>',
      '}',
    ].join(String.fromCharCode(10));
  },
};
\`\`\`

Register it in Vitest config:

\`\`\`ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    snapshotSerializers: ['./test/serializers/http-exchange.serializer.ts'],
  },
});
\`\`\`

Now a compact inline snapshot can describe the behavior without storing machine-specific timing:

\`\`\`ts
expect(exchange).toMatchInlineSnapshot(\`
  HttpExchange {
    method: POST
    url: https://api.example.test/orders
    status: 201
    durationMs: <redacted>
  }
\`);
\`\`\`

Do not use serializers to hide failures. If latency is the behavior under test, redacting \`durationMs\` is wrong. If latency is incidental to a contract snapshot, redaction is useful. The serializer should encode testing intent, not aesthetic preference.

## Protect Concurrent Tests and Local Expect

Vitest documents an important warning for snapshots in async concurrent tests: use the \`expect\` from the local test context so Vitest can associate the snapshot with the correct test. Migration work is a good time to search for concurrent snapshot tests and make this explicit.

\`\`\`ts
import { test } from 'vitest';
import { summarizeUser } from '../src/summarize-user';

test.concurrent('summarizes active users', async ({ expect }) => {
  const summary = await summarizeUser({ name: 'Asha', active: true });

  expect(summary).toMatchInlineSnapshot();
});
\`\`\`

This is not a style preference. Inline snapshot update logic has to know which call site to rewrite. Concurrent execution makes global state assumptions more dangerous, so use the test context where Vitest asks you to.

If your current suite has many \`test.concurrent\` cases using imported \`expect\`, migrate those carefully. Convert one file, run it several times, and inspect that the correct inline snapshot is updated. If you see Vitest rewriting the wrong location or failing to update, simplify concurrency around snapshot tests. Snapshot review value is not worth nondeterministic rewrite behavior.

## Handle Obsolete Snapshot Files Deliberately

After moving a snapshot inline, external \`.snap\` entries may become obsolete. Do not delete snapshot files blindly if a file contains entries for multiple tests. Run the focused test with update mode, inspect the resulting obsolete warnings, and remove only entries that no longer have matching tests.

The safe workflow:

| Step | Command or action | Review focus |
| --- | --- | --- |
| Convert one matcher | Change \`toMatchSnapshot\` to \`toMatchInlineSnapshot\` | Does the test still read clearly? |
| Update focused test | \`npx vitest run path/to/test -u\` | Did Vitest rewrite only expected files? |
| Inspect old snapshot file | Open the matching \`.snap\` file | Are other test entries still present? |
| Run full suite | \`npx vitest run\` | No obsolete, missing, or mismatched snapshots |
| Commit together | Source file plus snapshot deletion or edit | Diff tells one migration story |

This avoids a common failure mode: a developer deletes an entire \`.snap\` file after migrating one test, but the file also held snapshots for neighboring tests. CI then fails with missing snapshots, or worse, a later update recreates a large artifact and obscures the migration diff.

## Review Inline Snapshots Differently from External Fixtures

An inline snapshot should make the assertion stronger and easier to review. During code review, read the setup, then the expected value, then ask what failure the test would catch. If the snapshot is mostly incidental object fields, the test is probably too broad. If the snapshot is a compact contract, the migration did its job.

Use this reviewer checklist:

| Check | Good sign | Needs rework |
| --- | --- | --- |
| Snapshot length | Fits in the test without hiding logic | Source file becomes fixture storage |
| Stable inputs | Time, IDs, order, and locale controlled | Snapshot updates on unrelated machines |
| Critical fields | Important invariants asserted or visible | Important behavior buried in a blob |
| Serializer use | Domain representation is clearer | Serializer hides contract data |
| CI behavior | Updates happen locally and fail in CI | CI rewrites or accepts changed snapshots |

AI coding agents often produce snapshot migrations that are syntactically correct but semantically lazy. Ask the agent to explain why each converted snapshot belongs inline and what makes it stable. If it cannot answer, leave the snapshot external or replace it with focused assertions.

## Diagnose a Failed Inline Update

A realistic failure mode: after converting a matcher, \`vitest -u\` does not rewrite the expected source file. The cause is usually one of four things. The test did not reach the matcher, the file is generated or transformed in a way Vitest cannot safely rewrite, a concurrent test is not using local \`expect\`, or the snapshot call is wrapped inside an abstraction that hides the call site.

Start by making the test single and focused. Run only that test file. Confirm the assertion is executed by temporarily adding a normal assertion immediately before it. If the test is concurrent, switch to the test-context \`expect\`. If the snapshot assertion lives inside a helper, move the snapshot call back to the test file. Helpers can prepare the received value, but the snapshot matcher should be visible where reviewers can see it.

\`\`\`ts
// Prefer this shape for migration.
const view = normalizeSummary(buildSummary(input));
expect(view).toMatchInlineSnapshot();

// Avoid hiding the call site during migration.
expectSummaryToMatchStoredSnapshot(input);
\`\`\`

The second shape might be acceptable for a mature custom matcher, but it is harder to migrate and review. Inline snapshots shine when the assertion is physically close to the scenario.

## Keep the Migration Pull Request Boring

Snapshot migration diffs can become noisy fast. Keep each pull request scoped by package, feature area, or snapshot type. Do not combine inline conversion with product changes unless the snapshot update is caused by that product change. If the suite is large, migrate in batches and record the decision rules in a short README.

The cleanest PR description answers:

| Question | Example answer |
| --- | --- |
| Which snapshots moved inline? | Small validation formatter and summary snapshots under \`test/formatters\` |
| Which snapshots stayed external? | Email HTML and generated OpenAPI examples |
| What stabilization happened first? | Fake system time for receipt summaries |
| How was the update produced? | Focused \`npx vitest run test/formatters -u\`, then full \`npx vitest run\` |
| What should reviewers inspect? | Inline expected values and deletion of obsolete \`.snap\` entries |

This makes the migration easy to trust. Reviewers should not have to reverse-engineer whether a snapshot changed because of a behavior change, a location change, or an accidental update.

## Add a Guardrail for Accidental Bulk Updates

One practical migration guardrail is a CI check that fails when a pull request changes too many snapshot-bearing files at once. This is not a Vitest feature. It is a repository policy that protects review quality. Snapshot updates are sometimes legitimate, but a bulk rewrite should be intentional and clearly labeled.

\`\`\`bash
changed_snapshot_files=$(git diff --name-only origin/main...HEAD | grep -E '(__snapshots__|test|spec)' | wc -l)

if [ "$changed_snapshot_files" -gt 20 ]; then
  echo "Too many snapshot-related files changed in one PR: $changed_snapshot_files"
  echo "Split the migration or document why this bulk update is intentional."
  exit 1
fi
\`\`\`

Adjust the threshold to your repository size. The point is to stop accidental \`vitest -u\` runs across the whole workspace from landing with unrelated product diffs. During a planned migration, the author can split by package or include a clear exception in the CI workflow. This kind of guardrail is especially useful when AI agents are allowed to run tests and update snapshots, because it forces the change set to stay reviewable.

## Frequently Asked Questions

### Should every Vitest snapshot become an inline snapshot?

No. Inline snapshots are best for short, readable expected values that help reviewers understand the assertion without opening another file. Keep large HTML, generated documents, long API fixtures, and visual baselines outside the test. The migration goal is better reviewability, not eliminating \`.snap\` files from the repository. If inline placement makes the spec harder to scan, the migration has failed its purpose.

### How do I update inline snapshots in Vitest?

Use Vitest's documented snapshot update flow. In a focused migration, run the specific test file with \`-u\` or \`--update\`, then inspect the rewritten source file. In watch mode, Vitest can update failed snapshots from the terminal. CI should not silently rewrite snapshots. It should fail when snapshots are missing, obsolete, or mismatched, so every expected-value change receives human review before merge.

### What should I do with dynamic values before migrating?

Stabilize them first. Fake the clock, seed or verify generated IDs, sort unordered data only when order is not part of the contract, and normalize machine-specific paths. If the exact dynamic value matters, assert it directly instead of redacting it. Moving a noisy snapshot inline only makes the noise more visible and increases review fatigue during future updates for everyone.

### Can AI coding agents safely migrate snapshots?

They can help with auditing and repetitive edits, but review the result like test logic. Ask the agent to classify each snapshot as inline, file, or explicit assertion. Require focused update commands and a full test run. Reject broad rewrites that inline huge artifacts, update unrelated snapshots, or hide snapshot matchers inside helper abstractions. The agent should explain stability, not just produce passing diffs.
`,
};
