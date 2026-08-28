import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing CSV Exports: Formula Injection, Encodings, and Excel Quirks',
  description: 'csv export testing guide for formula injection, UTF-8 encoding, Excel behavior, browser downloads, re-import drift, and data safety checks QA teams can run.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing CSV Exports: Formula Injection, Encodings, and Excel Quirks

CSV export testing verifies that exported files preserve data correctly, open predictably in spreadsheet tools, and do not turn user-controlled values into executable formulas. The core workflow is to test dangerous cell prefixes, quoting rules, line endings, UTF-8 bytes, large files, browser download headers, and re-import behavior. A CSV export is not safe just because Excel opens it.

For QA engineers, the job is to test the file as data and as something a spreadsheet app will interpret. Those are different risks. Plain text can become a formula, a date, a broken name, or a corrupted identifier once Excel, Numbers, LibreOffice, or Google Sheets touches it.

## The Export Contract

A good CSV export contract describes bytes, not vibes. It says which columns appear, in what order, how nulls are represented, which delimiter is used, which line ending is emitted, whether the file includes a UTF-8 byte order mark, how formulas are neutralized, and what the browser download headers should be.

| Contract item | Decision to record | Test example |
|---|---|---|
| Delimiter | Comma, semicolon, or locale-specific | Parse and count fields per row |
| Header row | Present or absent, exact labels | Compare to approved header list |
| Encoding | UTF-8 with or without BOM | Inspect first bytes and decode |
| Line endings | CRLF or LF | Assert byte sequence between rows |
| Null handling | Empty cell, \`NULL\`, or omitted | Round-trip null and empty string separately |
| Formula policy | Prefix, reject, or encode dangerous cells | Seed \`=1+1\`, \`+1\`, \`-1\`, \`@SUM(1,2)\` |
| Download headers | Content type and filename | Playwright download and response checks |

The formula policy deserves an explicit product decision. Prefixing dangerous cells with an apostrophe is common because spreadsheet tools treat the value as text. Some teams prefix with a tab. Some reject exports containing dangerous values in sensitive contexts. The important part is consistency and a test that proves the chosen policy applies to every user-controlled text column.

If the export accepts uploaded data earlier in the flow, connect this work with [file upload polyglot testing](/blog/security-testing-file-upload-polyglot). A malicious spreadsheet can enter as an uploaded file, move through your system as plain text, and leave as a CSV that runs a formula when an analyst opens it.

## Formula Injection Payloads That Belong in Fixtures

CSV formula injection, sometimes called CSV injection, happens when a spreadsheet application interprets a cell as a formula instead of plain text. The usual dangerous prefixes are \`=\`, \`+\`, \`-\`, and \`@\`. Leading whitespace, tabs, carriage returns, and newlines can complicate detection because the visible first character may not be the first character Excel evaluates.

Do not test only \`=cmd()\` style payloads copied from security posts. Many products are not vulnerable to command execution but are still vulnerable to data exfiltration formulas, misleading totals, external links, or analyst confusion. Treat formula execution as a data integrity and security risk.

\`\`\`csv
id,name,note
1,Ada,"=2+3"
2,Grace,"+441234567890"
3,Linus,"-10"
4,Katherine,"@SUM(1,2)"
5,Ken,"	=HYPERLINK(""https://example.test"",""open"")"
6,Margaret,"
=1+1"
\`\`\`

That fixture is intentionally unpleasant. It includes values that a naive sanitizer misses: phone numbers beginning with plus, negative-looking values that may be legitimate, tab-prefixed formulas, and a formula after a newline. Your product may allow negative numbers in numeric columns, but user-controlled text columns should not execute as formulas.

| Payload | Why it is dangerous | Expected exported cell |
|---|---|---|
| \`=2+3\` | Direct formula | Text, not formula |
| \`+441234567890\` | Can be interpreted as formula or number | Text if column is phone-like |
| \`-10\` | Ambiguous negative number | Numeric only in numeric columns |
| \`@SUM(1,2)\` | Formula prefix in modern Excel contexts | Text, not formula |
| Tab then formula | Bypasses simple first-character checks | Text after trimming dangerous leading controls |
| Newline then formula | Formula begins on a later visible line | Text after scanning cell content |

The what people get wrong insight: they sanitize only the first character of the raw string. Spreadsheet tools and humans do not experience the raw string that way. A payload can hide after a tab, line break, or copied rich-text artifact. Your sanitizer should handle leading control characters and should be tested against every text column, not just the note field that a security tester happened to pick.

## A Reference Exporter You Can Test

The exporter below is small enough to reason about. It quotes fields according to CSV rules, emits CRLF line endings, includes a UTF-8 BOM for Excel compatibility, and neutralizes formula-like text cells by prefixing an apostrophe after checking trimmed leading control characters.

\`\`\`ts
type CsvValue = string | number | boolean | null;

interface CsvColumn<T> {
  header: string;
  textLike: boolean;
  read(row: T): CsvValue;
}

function isDangerousForSpreadsheet(value: string): boolean {
  const trimmed = value.replace(/^[\\t\\r\\n ]+/, '');
  return /^[=+\\-@]/.test(trimmed);
}

function encodeCell(value: CsvValue, textLike: boolean): string {
  if (value === null) {
    return '';
  }

  const raw = String(value);
  const safe = textLike && isDangerousForSpreadsheet(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [
    columns.map(column => encodeCell(column.header, true)).join(','),
    ...rows.map(row =>
      columns.map(column => encodeCell(column.read(row), column.textLike)).join(',')
    ),
  ];

  return '\\uFEFF' + lines.join('\\r\\n') + '\\r\\n';
}
\`\`\`

This is not the only valid policy. It is a testable policy. The sanitizer does not decide that every negative number is bad. It receives \`textLike\` from the column definition. A negative balance column can remain numeric, while a free-text note beginning with \`-10 refund\` becomes text.

Unit tests should exercise the policy at the exporter boundary because that is where column type, quoting, and line ending decisions meet.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { toCsv } from './toCsv';

interface AccountRow {
  id: number;
  phone: string;
  balance: number;
  note: string | null;
}

const columns = [
  { header: 'id', textLike: false, read: (row: AccountRow) => row.id },
  { header: 'phone', textLike: true, read: (row: AccountRow) => row.phone },
  { header: 'balance', textLike: false, read: (row: AccountRow) => row.balance },
  { header: 'note', textLike: true, read: (row: AccountRow) => row.note },
];

describe('toCsv', () => {
  it('neutralizes formulas only in text-like columns', () => {
    const csv = toCsv(
      [{ id: 1, phone: '+441234567890', balance: -10, note: '=2+3' }],
      columns
    );

    expect(csv).toContain('"\\'+441234567890"');
    expect(csv).toContain('"-10"');
    expect(csv).toContain('"\\'=2+3"');
  });

  it('emits UTF-8 BOM and CRLF row endings', () => {
    const csv = toCsv([{ id: 2, phone: '555', balance: 0, note: null }], columns);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('\\r\\n');
    expect(csv.endsWith('\\r\\n')).toBe(true);
  });
});
\`\`\`

The test is deliberately opinionated about phone numbers. If your product wants exported phone numbers as plain visible text, a leading plus must survive without becoming a formula. The balance remains a numeric-looking value because the column says it is not text-like.

## Parse the File Back, Then Inspect the Bytes

Testing CSV by string contains checks alone misses structural errors. Testing by parser alone misses byte-level choices that affect Excel. Do both.

Python's standard \`csv\` module is useful for structure checks because it handles quotes and embedded newlines correctly. The byte checks confirm BOM and line endings.

\`\`\`python
from pathlib import Path
import csv

path = Path("exports/accounts.csv")
data = path.read_bytes()

if not data.startswith(b"\\xef\\xbb\\xbf"):
    raise AssertionError("Expected UTF-8 BOM for the Excel export profile")

if b"\\r\\n" not in data:
    raise AssertionError("Expected CRLF row endings")

text = data.decode("utf-8-sig")
rows = list(csv.DictReader(text.splitlines()))

if rows[0]["phone"] != "'+441234567890":
    raise AssertionError("Phone formula prefix was not neutralized")

if rows[0]["balance"] != "-10":
    raise AssertionError("Numeric balance did not round-trip")
\`\`\`

This script is small but catches a surprising amount: wrong encoding, missing BOM, LF-only output, broken quotes, and formula policy drift. It also creates a reviewable contract for the "Excel export profile." You may choose UTF-8 without BOM for API consumers and UTF-8 with BOM for analyst downloads. That is fine, but make it a named profile.

| Consumer | Encoding choice | Line ending | Formula policy |
|---|---|---|---|
| Browser download for analysts | UTF-8 with BOM | CRLF | Neutralize text cells |
| API export for systems | UTF-8 without BOM | LF or CRLF by contract | Usually neutralize user text |
| Internal warehouse load | UTF-8 without BOM | LF | Preserve raw values in protected pipeline |
| Support-team export | UTF-8 with BOM | CRLF | Neutralize and mask sensitive fields |

The table is not a universal rule. It is a way to force the product discussion. Analysts need files that open cleanly in Excel. Data pipelines usually want no BOM and strict raw values. Support teams often need masking in addition to formula protection.

## Browser Download Checks with Playwright

CSV bugs often live at the HTTP layer. The data may be correct while the browser receives the wrong filename, wrong content type, compressed empty response, cached stale file, or a partial download after the user filters a report.

Use Playwright to test the real button. Keep the fixture small, but assert the downloaded bytes.

\`\`\`ts
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('exports filtered accounts as safe CSV', async ({ page }) => {
  await page.goto('/accounts');
  await page.getByLabel('Status').selectOption('Active');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('accounts-active.csv');

  const path = await download.path();
  if (!path) {
    throw new Error('Download path was not available');
  }

  const bytes = await readFile(path);
  expect(bytes.subarray(0, 3).toString('hex')).toBe('efbbbf');

  const text = bytes.toString('utf8');
  expect(text).toContain('"\\'=2+3"');
  expect(text).toContain('\\r\\n');
});
\`\`\`

This test assumes the fixture data contains a dangerous note. Seed that data through an API or database fixture before visiting the page. Do not create it by clicking through a long UI setup flow unless the export itself depends on that UI. The export test should fail because export behavior changed, not because account creation had a separate validation issue.

## Excel Quirks Worth Turning Into Tests

Excel is not only a CSV viewer. It guesses. It guesses dates, long numbers, scientific notation, delimiters, encodings, and formulas. You cannot make every spreadsheet app preserve every type without friction, but you can identify columns where guessing causes harm.

High-risk columns include IDs with leading zeros, credit-card-like identifiers, long numeric IDs, phone numbers, postal codes, SKU values, and dates that must keep timezone meaning. A value like \`00123\` can become \`123\`. A long order ID can become scientific notation. A value like \`03/04/2026\` can become March 4 or April 3 depending on locale.

| Column type | Spreadsheet risk | Test data |
|---|---|---|
| Leading-zero ID | Zero stripped | \`"001234"\` |
| Long numeric ID | Scientific notation | \`"123456789012345678"\` |
| Ambiguous date | Locale flip | \`"03/04/2026"\` |
| Postal code | Zero stripped or number conversion | \`"02110"\` |
| Phone number | Plus sign treated oddly | \`"+14155550100"\` |
| Free text | Formula execution | \`"=HYPERLINK(...)"\` |

One practical tactic is to export risky identifiers as text with clear quoting and formula protection, then document that CSV is a transport format, not a typed spreadsheet workbook. If the product needs exact spreadsheet typing, generate \`.xlsx\` with explicit cell types. CSV cannot carry those types.

## Re-import Testing Finds Silent Drift

If users export CSV and later import it back, add a round-trip test. Export a fixture, parse it through the import path, and compare the resulting records. This catches column order changes, header renames, null versus empty confusion, and date formatting drift.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { toCsv } from './toCsv';

interface UserRecord {
  id: string;
  email: string;
  nickname: string | null;
}

function parseSimpleCsv(csv: string): UserRecord[] {
  const lines = csv.replace(/^\\uFEFF/, '').trimEnd().split('\\r\\n');
  const headers = lines[0].split(',').map(value => value.replace(/^"|"$/g, ''));

  return lines.slice(1).map(line => {
    const values = line.split(',').map(value => value.replace(/^"|"$/g, '').replace(/""/g, '"'));
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    return {
      id: record.id,
      email: record.email,
      nickname: record.nickname === '' ? null : record.nickname,
    };
  });
}

it('round-trips null nickname and leading-zero id', () => {
  const rows: UserRecord[] = [{ id: '00123', email: 'ada@example.test', nickname: null }];
  const csv = toCsv(rows, [
    { header: 'id', textLike: true, read: row => row.id },
    { header: 'email', textLike: true, read: row => row.email },
    { header: 'nickname', textLike: true, read: row => row.nickname },
  ]);

  expect(parseSimpleCsv(csv)).toEqual(rows);
});
\`\`\`

This parser is intentionally simple and suitable only for the quoted output produced by the exporter above. For general CSV import, use a real parser that handles embedded commas and line breaks. The test still demonstrates the point: exports should be checked against the consuming path, not only against a snapshot string.

When exported data comes from production clones, combine CSV checks with [test data anonymization for GDPR production clones](/blog/test-data-anonymization-gdpr-production-clones). Masking can introduce its own export bugs, such as invalid emails, duplicated identifiers, or names that trigger spreadsheet formulas after replacement.

## A Failure Story: The File Was Valid and Still Dangerous

Symptom: a customer-success analyst opened a "contacts" CSV and saw a security warning in Excel. The exported file passed backend unit tests. The rows parsed correctly. The first theory was that Excel disliked the UTF-8 BOM or the download content type.

Wrong theory: the team changed \`Content-Type\` from \`text/csv\` to \`application/csv\` and removed the BOM. The warning stayed, and non-English names started opening incorrectly on some machines.

Actual cause: a customer had entered a company name beginning with \`=HYPERLINK\`. The exporter quoted the field correctly, so parsers treated it as one CSV cell. Excel still interpreted the quoted cell content as a formula. The tests asserted CSV syntax but never opened or inspected formula-like values as spreadsheet inputs.

Fix: the exporter added a text-column formula neutralizer, the fixture included dangerous prefixes in every user-controlled text column, and the Playwright download test checked bytes plus cell content. The team also kept the BOM because their analyst workflow depended on Excel opening UTF-8 names correctly.

## CI Gates That Catch Export Drift

CSV tests can run cheaply. Put unit tests around the exporter, parser tests around sample files, and one browser download test around the main user flow. For large exports, add a scheduled job that checks streaming and memory behavior with representative volume.

\`\`\`yaml
name: csv-export-checks

on:
  pull_request:
    paths:
      - 'src/export/**'
      - 'tests/export/**'
      - '.github/workflows/csv-export-checks.yml'

jobs:
  csv:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run test:csv
      - run: npx playwright test --grep "@csv-export"
\`\`\`

Add one artifact on failure if the files are safe to store. Do not upload exports containing personal data. If a failure artifact is useful, create a synthetic fixture file with no real customer values.

## QA Checklist for CSV Exports

Use this checklist before approving a CSV export change.

1. Dangerous formula prefixes are tested in every text-like user-controlled column.
2. Leading tabs, spaces, carriage returns, and newlines are included in formula fixtures.
3. UTF-8 decoding is tested with names from multiple scripts and symbols used by customers.
4. BOM policy is explicit and checked for the analyst export profile.
5. CRLF or LF line ending policy is explicit and checked.
6. Null and empty strings are distinct where the product needs them distinct.
7. Browser download filename, content type, and bytes are verified.
8. Large exports are tested for streaming behavior and row count completeness.
9. Re-import workflows compare business records, not only raw text.
10. Failure artifacts never contain unmasked production data.

The hardest CSV bugs are rarely parser crashes. They are silent transformations. A support person sorts a sheet and loses leading zeros. A finance analyst opens a file and formulas recalculate. An import treats empty as null and erases a nickname. Good csv export testing catches those small changes before a customer builds a workflow on them.

## Headers, Filenames, and Filters Are Data Too

Export defects often hide outside the cell encoder. A user clicks "active customers in France," downloads a file named \`customers.csv\`, sends it to finance, and nobody can tell which filter produced it. Another user downloads an export after changing the table column order, but the CSV still uses an old header order. These are not cosmetic details. They control auditability and import compatibility.

Treat headers as an API. If a downstream import expects \`customer_id\`, a rename to \`id\` is a breaking change even when every row value is correct. If the product is localized, decide whether headers use the user's language or a stable machine name. Analyst exports often use friendly labels. System feeds should usually use stable names.

| Surface | Failure mode | Test assertion |
|---|---|---|
| Header order | Import maps values to wrong fields | Exact header array comparison |
| Localized labels | Automation receives translated names | Separate analyst and API profiles |
| Filename | User cannot trace filter or date | Assert filename includes report and scope |
| Filter summary | Export does not match visible table | Compare row count and filter label |
| Empty result | File missing headers | Export contains header row and zero data rows |

Add one test for the empty result. Empty exports break more often than teams expect because the code path skips streaming rows and accidentally skips headers too. A valid empty CSV for most analyst workflows still has headers, line endings, and the same encoding policy as a populated file.

\`\`\`ts
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('exports an empty filtered result with headers @csv-export', async ({ page }) => {
  await page.goto('/accounts');
  await page.getByLabel('Status').selectOption('Closed with no matches');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  const path = await download.path();

  if (!path) {
    throw new Error('Download path was not available');
  }

  const text = (await readFile(path)).toString('utf8');

  expect(download.suggestedFilename()).toBe('accounts-closed-with-no-matches.csv');
  expect(text).toBe('\\uFEFF"id","email","status"\\r\\n');
});
\`\`\`

That test is narrow, but it guards a real customer workflow: downloading proof that a filter returned no records. It also stops a future optimization from treating "zero rows" as "nothing to export" when users still need a file.

## Excel Locale Quirks That Break Round Trips

Locale behavior is where CSV export testing quietly fails. Excel does not treat a comma-separated file the same way on every machine. In many European and South American locales, the list separator is a semicolon, the decimal separator is a comma, and the date order flips between day-first and month-first. The same byte stream can open as five columns in the United States and as one mangled column in Germany if the analyst double-clicks the file instead of using the import wizard.

Concrete fixtures help more than theory. Seed \`1,234.56\` as a money string and \`1.234,56\` as the European form. Seed \`03/04/2026\` and \`2026-04-03\` in adjacent columns. Seed a formula argument separator case such as \`=SUM(1;2)\` for locales that use semicolon inside formulas, alongside \`=SUM(1,2)\` for comma locales. When an analyst opens the file, one of those values may become a date, a number, or a broken formula depending on regional settings.

| Locale cue | Example cell | What Excel may do | Test tactic |
|---|---|---|---|
| US list separator | \`a,b,c\` | Three columns on double-click | Open with US and DE regional settings |
| DE list separator | \`a;b;c\` | Three columns in DE, one in US | Assert delimiter profile by consumer region |
| Decimal comma | \`1.234,56\` | Number or text depending on wizard | Compare parsed numeric value after import |
| Ambiguous date | \`03/04/2026\` | March 4 or April 3 | Prefer ISO \`YYYY-MM-DD\` for date exports |
| Formula args | \`=SUM(1;2)\` | Valid formula only in some locales | Neutralize before locale guessing matters |

Document whether your product emits a true comma CSV, a semicolon "CSV" for European analysts, or an Excel workbook. Calling every download a CSV while emitting semicolons creates support tickets that look like encoding bugs. Add one contract test that asserts the delimiter byte between the first two fields for each named export profile. If you support both profiles, give them distinct filenames such as \`accounts-comma.csv\` and \`accounts-semicolon.csv\` so humans and automation can tell them apart.

Also test thousands separators and currency symbols left in free-text money fields. A value like \`€1.234,56\` may survive as text in one locale and lose the currency glyph or split on the period in another. Prefer raw numeric columns plus a separate currency code column when finance accuracy matters. CSV is a bad place to hide presentation formatting that Excel will reinterpret.

## Formula Injection Variants Beyond the Usual Prefixes

The classic \`=\`, \`+\`, \`-\`, and \`@\` prefixes are the baseline, not the whole threat model. Spreadsheet formula dialects and older compatibility features add more shapes. Teams that only greylist those four characters miss payloads that still execute or still confuse analysts.

Include fixtures for \`=HYPERLINK("https://example.test","Click")\`, \`=WEBSERVICE("https://example.test/x")\`, \`=IMPORTXML("https://example.test","//a")\`, and locale-flavored \`=SUM(1;2)\`. Add DDE-style strings such as \`=cmd|'/C calc'!A0\` and pipe-leading variants that older Excel security advisories documented. Add a leading fullwidth equals sign (\`＝2+3\`) and a leading zero-width or BOM-like control before \`=\`. Add \`%0A=1+1\` style values that arrive URL-decoded into a notes field. These are not theoretical museum pieces. They show whether your sanitizer walks Unicode and decoded input, or only ASCII first bytes.

\`\`\`csv
id,company,memo
1,Acme,"=HYPERLINK(""https://example.test"",""x"")"
2,Beta,"=WEBSERVICE(""https://example.test/x"")"
3,Gamma,"=cmd|'/C calc'!A0"
4,Delta,"＝2+3"
5,Epsilon,"=SUM(1;2)"
6,Zeta,"'+1-555-0100"
\`\`\`

Expected policy should be explicit per column. Phone-like \`+1-555-0100\` may need to stay dialable text with a leading apostrophe. A balance column of \`-42.50\` should stay numeric. A memo beginning with \`=WEBSERVICE\` should never remain an executable formula after export. Write one assertion per class of payload instead of one giant snapshot that reviewers cannot reason about.

When upload paths feed exports, remember that polyglot files and renamed sheets can introduce these strings after your UI validation. Keep export safety in the same QA plan as upload content checks, even when the export encoder looks isolated.

## Streaming Large Exports Without Blowing Memory

Large CSV exports fail differently from small ones. A unit test with twenty rows will not reveal an exporter that builds one giant string, buffers every database row, or holds the full response in memory before the first byte reaches the browser. Streaming tests belong in the same suite as formula checks when reports can grow to hundreds of thousands of rows.

Define success with measurable limits. For example: exporting 250,000 synthetic rows must keep Node heap below an agreed ceiling, must emit the header before the first data row is fully buffered, and must finish with a row count matching the SQL count for the same filter. Fail the test if the process approaches the limit or if the download truncates mid-row.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { exportAccountsCsvStream } from './exportAccountsCsvStream';

describe('exportAccountsCsvStream', () => {
  it('streams a large export under a memory ceiling', async () => {
    const start = process.memoryUsage().heapUsed;
    let rows = 0;
    let sawHeader = false;

    // Chunks break mid-row, so carry the partial line across iterations;
    // counting per-chunk splits over- or under-counts at every boundary.
    let carry = '';
    for await (const chunk of exportAccountsCsvStream({ status: 'active', limit: 250_000 })) {
      const text = carry + chunk.toString('utf8');
      if (!sawHeader) {
        expect(text.startsWith('\\uFEFF') || text.includes('"id"')).toBe(true);
        sawHeader = true;
      }
      const parts = text.split('\\r\\n');
      carry = parts.pop() ?? '';
      rows += parts.filter(line => line.length > 0).length;
      const used = process.memoryUsage().heapUsed - start;
      expect(used).toBeLessThan(256 * 1024 * 1024);
    }
    if (carry.length > 0) rows += 1;

    expect(sawHeader).toBe(true);
    expect(rows).toBeGreaterThan(250_000);
  });
});
\`\`\`

Tune the threshold to your runtime. The point is not a magic 256 MiB number. The point is a regression gate that fails when someone "simplifies" streaming into \`rows.map(...).join\`. Also assert that cancellation works: if the client aborts the download, the database cursor or async iterator should stop within a short deadline instead of continuing to materialize the full report on the server.

Pair streaming tests with completeness checks. Count CRLF-terminated rows, compare against the filtered record count, and hash a stable subset of columns. Incomplete last lines are a classic symptom of buffer flush bugs at the end of a stream.

## Delimiter Confusion Across Semicolon Locales

Delimiter bugs present as "Excel merged my columns" or "every line is one cell." In locale terms, Windows regional settings often define a list separator used when users double-click a \`.csv\` file. If your server always emits commas, German Excel may not split fields on open. If your server emits semicolons for European tenants, US Excel may not split them either.

Do not fix this with silent heuristics that sniff Accept-Language and change delimiters without telling anyone. That creates non-reproducible files. Prefer named profiles, explicit UI choices ("Comma CSV" versus "Excel semicolon CSV"), or generate \`.xlsx\` when locale-safe typing matters more than plain text.

Test both profiles with the same fixture rows, including embedded commas, embedded semicolons, quotes, and formula-like text. A semicolon profile still needs quoting rules. A field that contains a semicolon must be quoted. A field that contains a quote must double the quote. Formula neutralization still applies after delimiter choice, because Excel evaluates cell content after splitting.

| Profile | Delimiter | Risky fixture field | Assertion |
|---|---|---|---|
| Analyst US | comma | \`Smith, Jr.\` | Remains one column |
| Analyst DE | semicolon | \`Smith; Jr.\` | Remains one column |
| API feed | comma | \`notes with; both\` | Machine consumers parse commas only |
| Finance EU | semicolon | \`=2+3\` in memo | Neutralized and quoted |

Add a negative test that feeds a comma file into a semicolon parser and expects a deliberate failure or a single-column detection warning. Silent mis-parse is worse than a loud error when money or identity columns shift left by one.

## Round-Trip Checksum Strategies

Snapshotting entire CSV files in git works for tiny fixtures and then becomes noisy. Prefer checksum strategies that compare business meaning. One effective pattern is to canonicalize each exported row into a stable JSON object, sort keys, normalize nulls, and compute a SHA-256 over the newline-joined canonical rows. Compare that digest to the digest of the source query results after the same canonicalization.

Exclude volatile columns from the checksum when needed: export timestamps, signed download URLs, or request IDs. Keep identity, money, status, and user-entered text in the digest. If masking is applied for GDPR clones, checksum the masked values against the anonymization contract rather than against production raw values, and keep masking rules in the same review as the export profile.

\`\`\`ts
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

function canonicalRow(row: Record<string, string | null>): string {
  const keys = Object.keys(row).sort();
  const normalized = Object.fromEntries(
    keys.map(key => [key, row[key] === null ? null : String(row[key])])
  );
  return JSON.stringify(normalized);
}

function checksumRows(rows: Record<string, string | null>[]): string {
  const hash = createHash('sha256');
  for (const row of rows) {
    hash.update(canonicalRow(row));
    hash.update('\\n');
  }
  return hash.digest('hex');
}

it('matches source checksum after export parse', () => {
  const source = [{ id: '001', memo: "'=2+3", city: null }];
  const parsed = [{ id: '001', memo: "'=2+3", city: null }];
  expect(checksumRows(parsed)).toBe(checksumRows(source));
});
\`\`\`

Use two digests when diagnosing failures: one over headers plus row count, and one over cell payloads. Header drift then fails fast without forcing you to diff thousands of data rows. For very large exports, checksum in streaming windows of N rows and store per-window digests so CI can localize the first mismatched window instead of only reporting a single end-of-file mismatch.

Checksum tests also catch delimiter and locale damage. If a semicolon profile accidentally splits \`Smith; Jr.\` into two columns, the canonical row shape changes and the digest diverges even when humans might miss the shift in a huge spreadsheet. That is the point of round-trip checksum strategies: make silent shape changes loud.

## Frequently Asked Questions


### What is the minimum csv export testing suite?

At minimum, test the exporter function with formula payloads, quotes, commas, newlines, nulls, and non-English text. Add byte checks for encoding and line endings. Then add one Playwright test that downloads the real file and checks filename, first bytes, and representative cell content. That suite is small, fast, and catches the most common safety and compatibility regressions without turning every export into a slow browser test.

### Should CSV exports include a UTF-8 BOM?

For analyst downloads opened in Excel, a UTF-8 BOM is often the practical choice because it helps Excel detect encoding correctly. For API or warehouse feeds, many teams prefer UTF-8 without BOM because downstream systems expect raw UTF-8. The right answer is profile-specific. Name the profile, document the choice, and test the first bytes so a refactor does not silently change customer behavior.

### Is quoting enough to prevent CSV formula injection?

No. Quoting makes CSV syntax valid, but spreadsheet tools can still interpret the cell content as a formula after parsing. A quoted value like \`"=2+3"\` is one cell, and Excel may treat that cell as a formula. Text-like user-controlled cells need a formula policy such as prefixing, rejecting, or otherwise neutralizing dangerous values. Numeric columns need separate handling so legitimate negative values still work.

### How do I test Excel behavior in CI?

Start with deterministic byte and parser checks in CI because they are portable. Add fixtures for values Excel commonly changes: leading-zero IDs, long numbers, plus-prefixed phone numbers, ambiguous dates, and formulas. If exact Excel rendering is a contractual requirement, use a dedicated Windows job or manual release check with Microsoft Excel. Keep that separate from the fast CI lane so routine export safety remains quick.
`,
};
