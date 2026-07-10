import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Approval Testing and Golden Master Testing Guide',
  description:
    'Approval testing and golden master testing guide for protecting legacy behavior with reviewable diffs, stable fixtures, and disciplined update workflows.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Approval Testing and Golden Master Testing Guide

The legacy formatter already has customers depending on its quirks. It trims one field, preserves another, emits blank lines after section headers, and sorts warnings in an order nobody remembers choosing. A rewrite that makes the output cleaner may still be a production bug if downstream tools parse the old shape.

Approval testing gives you a practical way to preserve that behavior while you refactor. Instead of asserting every tiny detail by hand, the test renders output and compares it to an approved artifact. When behavior changes, the reviewer sees a diff and decides whether to approve the new result. Golden master testing is the same family of technique, often used when the existing behavior is the master you need to characterize before making changes.

This guide is for teams using approval tests on text, JSON, reports, generated code, CLIs, and legacy transformations. It pairs well with [the Jest snapshot testing guide](/blog/jest-snapshot-testing-guide-2026), but approval testing has a different review culture and file workflow. For broader change-detection strategy, keep [the regression testing strategies guide](/blog/regression-testing-strategies-guide) nearby.

## Approval tests protect rendered behavior

Approval testing is strongest when the output is meaningful as a whole. A generated invoice, an email body, a command line report, a serialized rules file, or a Markdown migration result all benefit from a reviewer seeing the complete diff. It is weaker for tiny scalar rules where a normal assertion is clearer.

The approval file is not a magic truth. It is a reviewed example of expected behavior. That distinction matters. If nobody reviews the diff, approval testing degenerates into accepting whatever the program printed most recently.

| Output type | Approval fit | Review focus |
|---|---|---|
| Plain text report | Excellent | Line order, labels, totals, missing sections |
| JSON API body | Good with stable formatting | Field presence, nullability, arrays, redaction |
| HTML email | Good with normalization | Copy, links, fallback text, dynamic tokens |
| Binary image | Possible but specialized | Visual diff threshold, rendering environment |
| Single boolean rule | Poor | Use ordinary assertions instead |

The practical rule is simple: if a human would understand the behavior faster by reading a diff than by reading many assertions, approval testing is a candidate.

## A complete approval test in Jest

The approval workflow can be implemented with dedicated libraries, but it is useful to understand the mechanics. The test writes a received file when the output differs, compares it with the approved file, and fails with a message telling the developer what to inspect. The approval step is an intentional file update, not an automatic pass.

Here is a small approval helper for text output. It uses Node's filesystem APIs and Jest. The update command is deliberately controlled by an environment variable so a normal test run cannot silently bless new behavior.

\`\`\`ts
// test/approval.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect } from '@jest/globals';

type ApprovalOptions = {
  approvedPath: string;
  receivedPath: string;
};

export function approveText(actual: string, options: ApprovalOptions) {
  mkdirSync(dirname(options.approvedPath), { recursive: true });
  mkdirSync(dirname(options.receivedPath), { recursive: true });

  const normalized = actual.replace(/\\r\\n/g, '\\n');

  if (process.env.UPDATE_APPROVALS === 'true') {
    writeFileSync(options.approvedPath, normalized);
    return;
  }

  if (!existsSync(options.approvedPath)) {
    writeFileSync(options.receivedPath, normalized);
    throw new Error(
      'Missing approved file. Review ' +
        options.receivedPath +
        ' and rerun with UPDATE_APPROVALS=true if correct.',
    );
  }

  const approved = readFileSync(options.approvedPath, 'utf8').replace(/\\r\\n/g, '\\n');
  writeFileSync(options.receivedPath, normalized);

  expect(normalized).toBe(approved);
}
\`\`\`

Now apply it to a legacy report renderer. The test names the approved artifact directly, which makes review and cleanup straightforward.

\`\`\`ts
// test/monthly-report.approval.test.ts
import { approveText } from './approval';
import { renderMonthlyReport } from '../src/render-monthly-report';

it('renders the legacy monthly finance report', () => {
  const output = renderMonthlyReport({
    month: '2026-06',
    accounts: [
      { name: 'Subscriptions', gross: 12750, refunds: 320 },
      { name: 'Services', gross: 5400, refunds: 0 },
    ],
    generatedAt: new Date('2026-07-01T09:00:00Z'),
  });

  approveText(output, {
    approvedPath: 'test/approvals/monthly-report.approved.txt',
    receivedPath: 'test/approvals/monthly-report.received.txt',
  });
});
\`\`\`

This is intentionally plain. Mature teams may use libraries with reporter integration and diff tools, but the core workflow remains the same: produce deterministic output, compare to approved output, inspect differences, then approve only intentional changes.

## Making golden masters deterministic

Golden master tests fail for the wrong reasons when output contains uncontrolled values. Dates, UUIDs, random ordering, locale formatting, absolute paths, machine-specific line endings, and network data all create noise. Before approving anything, stabilize the input or normalize the output.

Prefer dependency injection over regex scrubbing. Passing a fixed clock to the renderer is better than replacing every timestamp after rendering. Sorting records before output is better than normalizing an arbitrary order in the test. Redaction is still useful for values that are incidental, such as generated IDs, but it should be explicit and reviewed.

| Noise source | Better control | Last-resort normalization |
|---|---|---|
| Current time | Inject clock or pass generatedAt | Replace ISO timestamps with <timestamp> |
| Random IDs | Inject deterministic ID generator | Replace UUID pattern with <uuid> |
| Object key order | Use stable serializer | Parse and stringify with sorted keys |
| Absolute paths | Pass project-relative paths | Replace root directory prefix |
| External service data | Use fixtures | Record and scrub responses |

If normalization becomes larger than the test, the approval target is probably too broad. Split the output or move volatile details behind ordinary assertions.

## Review workflow for approved files

The difference between approval testing and careless snapshotting is review discipline. A changed approved file should be reviewed as product behavior. The reviewer should ask: did the behavior intentionally change, is the new output stable, and does the diff hide anything suspicious?

Good approval pull requests show the received diff and the reason for approval. Do not approve a thousand-line change described as update snapshots. Say what changed: totals now include refunds, deprecated warnings are removed, CLI help groups flags by scope. If the diff is huge because of formatting churn, separate formatting from behavior or the approval suite will lose credibility.

Many teams use a two-step workflow:

1. Developer runs tests, receives failure, inspects received file.
2. Developer reruns with approval update flag, commits approved file, and explains the behavior change.

CI should run without update flags. It should fail if received output differs from approved output. Some teams also configure CI to fail when received files are present, which prevents accidental commits of unapproved artifacts.

## Approval tests for JSON without brittle whitespace

JSON approval tests should be stable and readable. Do not approve minified JSON. Parse and stringify with a fixed indentation, and sort keys if the producing code does not guarantee order. Be careful with arrays: sorting arrays can hide real behavior if order matters to consumers.

\`\`\`ts
// test/json-approval.ts
import { approveText } from './approval';

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return value;
}

export function approveJson(value: unknown, paths: {
  approvedPath: string;
  receivedPath: string;
}) {
  const stable = JSON.stringify(sortObjectKeys(value), null, 2) + '\\n';
  approveText(stable, paths);
}
\`\`\`

Use JSON approval for payloads where the whole shape matters: export files, generated manifests, rule evaluation traces, and problem detail responses. For a small API response with three fields, direct assertions are clearer.

## Characterization before refactoring

Golden master testing shines during legacy refactoring. Before changing internals, create a fixture set that represents real inputs. Run the old code to approve outputs. Then refactor behind the same tests. When outputs change, decide whether the old behavior was required or merely accidental.

Fixture selection is the hard part. Do not approve only happy paths. Include malformed records, boundary dates, empty sections, high values, old customer configurations, and known production incidents. The goal is not perfect proof. The goal is a behavior net wide enough to catch accidental rewrites of important quirks.

For legacy code, it is acceptable to approve ugly output. Approval does not mean the behavior is beautiful. It means the behavior is known. You can later change it intentionally with a reviewed diff.

## Combining approvals with focused assertions

Approval tests should not replace every assertion. Pair them with focused checks for invariants that must be obvious in a failure. For a report, approve the full text and assert the total separately. For generated policy JSON, approve the file and assert that required deny rules exist. For an email, approve the rendered HTML and assert that unsubscribe links are present.

This mixed approach improves diagnosis. If the total calculation breaks, a focused assertion fails before the reviewer studies a long text diff. If copy changes, the approval diff carries the review.

## Avoiding approval sprawl

Approval suites can become slow and noisy if every tiny function gets an approved file. Keep approvals at meaningful boundaries. A renderer, generator, exporter, serializer, or CLI command is a boundary. A private helper that formats a label is usually not.

Clean up approved files when scenarios are removed. Name files by behavior, not ticket numbers. Group fixtures and approvals so a reviewer can navigate them. If approved files exceed what a human can reasonably review, split the scenario or add a summary approval that captures the important output.

## Tooling choices

Several ecosystems have approval testing libraries. In JavaScript, teams often use Jest snapshots for inline approval-like flows, or purpose-built approval packages for separate approved and received files. The right choice depends on review style. Inline snapshots are convenient for small values. External approval files are better for long outputs and non-code reviewers.

| Approach | Best for | Tradeoff |
|---|---|---|
| Jest inline snapshots | Small objects near the test | Code files churn when output changes |
| Jest external snapshots | Moderate structured values | Snapshot naming can be opaque |
| Custom approved and received files | Large text, reports, generated artifacts | You maintain helper workflow |
| Visual approval tools | Images and PDFs | Rendering environment must be controlled |

Choose the tool that makes diffs easy to review. Approval testing is a review technique before it is a library choice.

## Approval testing generated code

Generated code is an excellent approval target because tiny formatting and ordering decisions can matter to consumers. OpenAPI clients, GraphQL types, SDK wrappers, database migration previews, and rules generated from configuration all benefit from whole-file diffs. A normal assertion that checks one exported function will not catch a missing import, unstable ordering, or a changed comment that downstream documentation depends on.

For generated code, approve the exact output file text after formatting. Run the same formatter in the test that production generation uses. Do not approve raw generator output if developers never see it in that form. The approved artifact should represent the file that would be committed or published.

Keep one fixture per meaningful generation mode. For example, a TypeScript API client might have fixtures for authentication enabled, pagination enabled, error union types enabled, and deprecated endpoints hidden. Avoid one giant fixture with every option turned on. Giant generated approvals are difficult to review and tend to hide narrow regressions.

When the generator intentionally changes formatting, separate that pull request from semantic generator changes. Reviewers can then approve a broad formatting churn once, and future behavioral diffs become readable again.

## Diff ergonomics for reviewers

Approval testing lives or dies by diff quality. If the diff tool makes the change hard to understand, reviewers will approve blindly. Configure text approvals so line endings, trailing spaces, and stable formatting are handled before comparison. For JSON, use indentation and stable key order. For Markdown, avoid wrapping paragraphs at unpredictable widths if the generator can control it.

Received files should be easy to open. Put them next to approved files or under a predictable received directory. Name them with the test scenario. A failure message that says expected output to match snapshot is much less useful than one that points to test/approvals/invoice-vat.received.txt and the approved file beside it.

Some teams add a local script that launches a visual diff tool for every received file. That can be worthwhile for large reports. In CI, keep output concise: list the approval names that differ and preserve artifacts for download. Do not dump thousands of changed lines into a CI log unless the log is the only review surface.

## Security and privacy in approved artifacts

Approved files are committed to source control, so they must not contain secrets or personal data. This is easy to forget when golden masters are created from production examples. Scrub emails, tokens, names, addresses, account numbers, and internal hostnames before approval. Better, build fixtures from synthetic data that has the same shape as production without production content.

Redaction should happen before the output reaches the approval helper. That keeps the approved file representative of what the product should emit under test conditions. If the production code must redact secrets, assert that behavior directly. Do not let the test-only approval layer hide a production leak.

For regulated domains, decide who can approve artifact changes. A copy update in an account statement, policy notice, or compliance export may need product or legal review. Approval tests make that review easier because the diff is concrete, but the engineering workflow still needs the right people in the loop.

## When golden masters become temporary scaffolding

Not every golden master should live forever. During a risky refactor, you may create a broad characterization suite to hold behavior steady. After the refactor, some tests should be replaced by smaller, intention-revealing assertions. Keeping every characterization file permanently can slow the suite and preserve behavior nobody wants.

Mark temporary golden masters clearly. Once the new design is stable, review which approvals protect real contracts and which merely captured old implementation details. Retire the latter. Approval testing is most valuable when the approved artifact is something the team would willingly review in a future change.

That retirement step keeps approvals focused on behavior people still care about, not accidental fossils from an old rescue effort.

## Frequently Asked Questions

### Are approval tests the same as Jest snapshots?

They overlap, but the workflow emphasis is different. Jest snapshots are commonly used for serialized values inside the Jest ecosystem. Approval testing usually emphasizes separate approved and received artifacts, explicit review, and broader outputs such as reports, generated files, or legacy behavior captures.

### When should I update an approved file?

Only after reviewing the received output and confirming the behavior change is intended. The approval update is not a fix for a failing test by itself. The pull request should explain what changed in the approved artifact.

### How do I keep dates and IDs from breaking golden masters?

Inject fixed clocks and deterministic ID generators where possible. If you cannot, normalize the output with clear placeholders. Avoid broad regex scrubbing that could hide real content changes.

### Should approved files be committed?

Yes. The approved artifact is the expected behavior for the test. Received files are temporary review artifacts and usually should not be committed. CI should compare generated output against committed approved files.

### Can approval testing handle binary files?

Yes, but binary approval needs specialized diffing and stable rendering. Text, JSON, Markdown, and generated source are easier starting points. For images or PDFs, control fonts, viewport, operating system differences, and comparison thresholds carefully.
`,
};
