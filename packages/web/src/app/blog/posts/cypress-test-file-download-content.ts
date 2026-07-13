import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Test Downloaded File Contents in Cypress",
  description:
    "Test Cypress file downloads by verifying the response headers, saved filename, MIME type, and parsed CSV or PDF content with deterministic cleanup.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# Test Downloaded File Contents in Cypress

Clicking “Export orders” is the least interesting part of a download test. The costly defects arrive afterward: yesterday's file is mistaken for today's, UTF-8 names become corrupted, the server returns an HTML error with a \`.csv\` suffix, or the spreadsheet contains the wrong tenant's rows. A serious Cypress check treats the download as an artifact with transport, naming, format, and business-content contracts.

Cypress can verify this without polling the browser's downloads UI. A browser click exercises the user path, \`cy.readFile()\` waits for the expected artifact on disk, and \`cy.request()\` can inspect HTTP headers when response metadata matters. Those paths answer different questions, so this tutorial keeps them separate instead of presenting one oversized assertion as proof of everything.

Examples assume Cypress running in Node with its normal downloads directory and a test-only export whose contents are deterministic. The same principles work with other file types, but parsers and binary assertions must match the actual media format.

## Decide what the download contract includes

A filename alone is weak evidence. Build the check from the risks attached to the feature. A regulatory report may require an exact naming convention and column order. A user-generated image export may care about MIME type, dimensions, and nonzero bytes. A bulk archive may require a specific entry manifest while compression timestamps remain irrelevant.

Separate the contract into observable layers:

| Layer | Example requirement | Best observation point | Typical false confidence |
|---|---|---|---|
| Trigger | Export button requests the selected date range | Browser interaction plus intercepted request | Button becomes disabled |
| HTTP metadata | Server sends CSV and an attachment filename | \`cy.request()\` response headers | File extension looks like CSV |
| Filesystem result | Expected file is created in this run | \`cy.readFile()\` under downloads folder | A stale artifact already exists |
| Format integrity | CSV parses with required headings | Task or browser-side parser | Searching raw text for commas |
| Business payload | Rows match the selected account and filter | Parsed records | File is merely nonempty |

Not every test must cover all five. A fast API-level test can own headers and schema, while one end-to-end path proves the browser trigger. What matters is that the suite, not a single screenshot, covers the risks.

## Make the downloads directory deterministic

Cypress uses a downloads folder configured by \`downloadsFolder\`. Its default is \`cypress/downloads\`. Cypress clears the downloads folder before each run by default when \`trashAssetsBeforeRuns\` is enabled, but files can still collide between tests within a run if names repeat or parallel specs share external storage.

Use a predictable filename in the test environment when possible. If production appends a timestamp, inject a fixed clock into the application or derive the name from a known exported date rather than scanning for “the newest” arbitrary file. Scanning introduces ordering and cleanup races.

A direct CSV test can look like this:

\`\`\`ts
describe('orders export', () => {
  const filename = 'orders-2026-07-13.csv';
  const path = \`cypress/downloads/\${filename}\`;

  beforeEach(() => {
    cy.task('deleteFile', path);
    cy.clock(new Date('2026-07-13T10:00:00Z').getTime(), ['Date']);
  });

  it('downloads the filtered order rows', () => {
    cy.intercept('GET', '/api/orders/export?status=failed*').as('exportOrders');
    cy.visit('/orders?status=failed');

    cy.contains('button', 'Export orders').click();
    cy.wait('@exportOrders').its('response.statusCode').should('eq', 200);

    cy.readFile(path, 'utf8').then((csv) => {
      const lines = csv.trim().split(/\\r?\\n/);
      expect(lines[0]).to.eq('order_id,status,total_currency,total_amount');
      expect(lines.slice(1)).to.deep.eq([
        'ord_104,failed,USD,19.50',
        'ord_108,failed,EUR,42.00',
      ]);
    });
  });
});
\`\`\`

The test deletes its exact target before clicking. \`cy.readFile()\` retries until the file exists and its chained assertions pass, subject to timeout. That retry behavior is useful when the browser writes asynchronously. It does not justify accepting partially written data forever, so keep the export small and deterministic.

The example uses a simple split because its fixture values contain no commas, quotes, or embedded newlines. That is not a general CSV parser. Real CSV data requires a compliant parser.

## Register a Node task for artifact cleanup

Cypress commands run through its command queue, while filesystem cleanup is naturally handled by Node in \`setupNodeEvents\`. Register a narrow task rather than exposing a general shell command to tests.

\`\`\`ts
import { defineConfig } from 'cypress';
import { rm } from 'node:fs/promises';
import path from 'node:path';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        async deleteFile(relativePath: string) {
          const workspace = path.resolve(config.projectRoot);
          const target = path.resolve(workspace, relativePath);

          if (!target.startsWith(\`\${workspace}\${path.sep}\`)) {
            throw new Error('Refusing to delete outside the Cypress project');
          }

          await rm(target, { force: true });
          return null;
        },
      });
    },
  },
});
\`\`\`

Returning \`null\` is important because Cypress tasks must not resolve to \`undefined\`. The containment check prevents a spec-supplied path from deleting outside the project. For a fixed test suite, an even narrower task that accepts only a basename can reduce risk further.

Do not use a broad \`rm -rf cypress/downloads\` inside each test. It can erase another spec's artifacts under parallel execution and destroys useful evidence after failure. Delete the known target before the test, then preserve failed-run artifacts according to CI retention policy.

## Verify Content-Disposition and MIME type at the HTTP boundary

The saved browser file does not reliably preserve its response headers for later inspection. If the contract includes \`Content-Type\` or \`Content-Disposition\`, make a direct authenticated request to the export endpoint. This complements, rather than replaces, the browser test.

\`\`\`ts
it('serves the export as a named CSV attachment', () => {
  cy.request({
    method: 'GET',
    url: '/api/orders/export',
    qs: { status: 'failed', date: '2026-07-13' },
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.headers['content-type']).to.match(
      /^text\\/csv(?:;\\s*charset=utf-8)?$/i,
    );
    expect(response.headers['content-disposition']).to.eq(
      'attachment; filename="orders-2026-07-13.csv"',
    );
    expect(response.body).to.include('order_id,status');
  });
});
\`\`\`

Header names in the Cypress response object are lowercase. Media types may legally include parameters, so an exact \`text/csv\` comparison can reject a valid \`text/csv; charset=utf-8\` response. Write the assertion to match your published API contract, not an accidental local server default.

\`Content-Disposition\` has more forms than the basic quoted filename shown here. International names may use \`filename*\` with RFC 5987-style encoding. If the application supports Unicode filenames, parse the header with a maintained library or assert the exact encoding policy your server implements. Do not split blindly on semicolons when quoted values are possible.

Also verify authorization. A direct request should prove that another tenant cannot download the artifact by changing an identifier. That is an API security test, not merely a filename assertion, and it should use isolated synthetic accounts.

## Parse CSV instead of grepping it

CSV permits quoted delimiters, escaped quotes, and records containing line breaks. A string split test can pass on a trivial fixture and break when a customer name contains a comma. Put parsing in a Node task using a library already approved by the project. The following example uses \`csv-parse/sync\`, whose \`parse\` function accepts a string and can return objects keyed by the header row.

\`\`\`ts
import { defineConfig } from 'cypress';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        async readCsv(relativePath: string) {
          const target = path.resolve(config.projectRoot, relativePath);
          const source = await readFile(target, 'utf8');

          return parse(source, {
            bom: true,
            columns: true,
            skip_empty_lines: true,
          });
        },
      });
    },
  },
});
\`\`\`

The test can assert records as data:

\`\`\`ts
it('preserves commas and Unicode in customer fields', () => {
  const path = 'cypress/downloads/orders-2026-07-13.csv';

  cy.visit('/orders?date=2026-07-13');
  cy.contains('button', 'Export orders').click();

  cy.readFile(path, 'utf8').should('not.be.empty');
  cy.task('readCsv', path).then((rows) => {
    expect(rows).to.deep.include({
      order_id: 'ord_221',
      customer_name: 'García, Ana',
      status: 'paid',
    });
  });
});
\`\`\`

The initial \`cy.readFile()\` supplies retryable waiting before the task reads the file. A Node task invoked too early does not automatically retry just because the file is still being written. Alternatively, implement bounded polling inside the task with a clear timeout, but keep the logic explicit.

Column order can be important to people importing the file even when object parsing ignores it. Assert the raw header separately if order is part of compatibility. For amounts and identifiers, avoid coercion unless the format contract defines numeric interpretation. ZIP codes, account numbers, and large identifiers can lose leading zeroes or precision when treated as JavaScript numbers.

For reusable test records and boundary fixtures, the [Cypress fixtures and data management guide](/blog/cypress-fixtures-data-management-guide) explains when to seed through APIs versus static files. It is particularly relevant when export rows must be deterministic.

## Inspect binary downloads without corrupting bytes

PDF, ZIP, XLSX, and image files are binary. Reading them as UTF-8 changes the representation and makes magic-byte checks unreliable. Cypress \`cy.readFile(path, null)\` yields a buffer, which is enough for size and signature checks. Rich content extraction is usually better in a Node task with a format-specific library.

For a PDF report, a layered assertion might be:

\`\`\`ts
it('downloads a real PDF report', () => {
  const report = 'cypress/downloads/audit-report-2026-07.pdf';

  cy.visit('/audit/reports');
  cy.contains('a', 'Download July report').click();

  cy.readFile(report, null).then((bytes) => {
    expect(bytes.length).to.be.greaterThan(1000);
    expect(bytes.subarray(0, 5).toString('ascii')).to.eq('%PDF-');
  });
});
\`\`\`

The minimum length here is a product-specific sanity threshold and should be justified by a controlled fixture, not copied as a universal PDF rule. A valid-looking signature does not prove the document opens or contains the correct report. Use a PDF parser in Node to extract page text or metadata when those are requirements. For visual fidelity, render representative pages and use an image comparison pipeline with intentional masking for variable fields.

XLSX files are ZIP containers with workbook parts, so checking \`PK\` bytes proves little. Parse sheet names, cells, types, and formulas with a suitable library. ZIP exports should be checked for safe, expected entry paths, especially when downstream consumers extract them automatically.

| File type | Basic integrity signal | Content-level assertion | Avoid |
|---|---|---|---|
| CSV | Decodes with expected charset | Parse rows, headers, quoting, and values | Splitting arbitrary records on commas |
| PDF | Starts with PDF signature and parser opens it | Extract text, page count, or render pages | Treating signature alone as business proof |
| XLSX | Workbook library loads without error | Sheet names, cell values, types, formulas | Comparing raw archive bytes |
| ZIP | Archive opens and entries match manifest | Inspect entry names and selected contents | Extracting untrusted paths without validation |
| PNG | Correct signature and decoder succeeds | Dimensions or pixel comparison | Assuming a \`.png\` suffix establishes format |

## Downloads triggered without a normal request

Not every download is a server attachment. Applications can construct a \`Blob\`, create an object URL, and click a temporary anchor. In that design, \`cy.request()\` cannot reproduce the browser-generated artifact because no equivalent download endpoint exists.

Test the browser path and read the resulting file, or test the pure serialization function below the UI with a unit test. If the filename is assigned through the anchor's \`download\` attribute, a component test can assert that integration while the end-to-end test validates actual saved content.

Browser and OS behavior can vary around unsafe filenames, duplicate names, and automatic renaming such as \`report (1).csv\`. CI should start from a clean, isolated downloads directory. Do not make the expected output depend on a developer's existing files.

When the application opens a generated document in a new tab rather than downloading it, that is a different interaction. Assert the target URL or response and test the viewer as needed. Trying to force every document flow into a filesystem check obscures what users actually experience.

## Keep the test stable in CI

Parallel Cypress machines normally have separate workspaces, but multiple specs in one process can still reuse a filename. Give each scenario a product-meaningful unique export key or serialize tests that truly share an artifact. Random filenames prevent collisions but make failures harder to locate unless the chosen name is logged and retained.

Set timeouts according to the export contract. Very large report generation may be asynchronous: the UI submits a job, polls status, and later exposes a download link. Test those states explicitly. A ten-minute \`readFile\` timeout hides whether job creation, processing, notification, or download failed.

Retain useful artifacts on CI failures, but consider their sensitivity. Exports can contain personal or financial data. Use synthetic records, restrict artifact access, and configure expiration. Passing files between CI jobs should be a deliberate security choice.

Avoid checking a full golden file when fields such as generated timestamps or IDs legitimately change. Parse the artifact and assert stable semantics. If byte-for-byte reproducibility is a real requirement, control metadata, line endings, archive timestamps, and record ordering, then make the exact comparison explicit.

The [Cypress best practices guide](/blog/cypress-best-practices-2026-guide) covers selector strategy, state control, and command retryability that support this workflow. For downloads specifically, remember that Cypress retries commands and assertions, not arbitrary synchronous work hidden inside callbacks.

## Assert filenames without accepting unsafe names

Downloaded names are security-relevant when they originate from report titles or user uploads. Test path separators, control characters, reserved operating-system names, leading dots, and extremely long input. The server should normalize or reject unsafe values before placing them in \`Content-Disposition\`. The expected policy must be explicit because browsers and operating systems sanitize differently.

Keep this test at the HTTP layer when the requirement is the emitted header, then add one representative browser download for the CI platform. A filename that is valid in a header can still be rewritten by the browser. Do not assert platform-specific rewriting as an application guarantee unless the product officially supports that platform behavior.

For international filenames, cover an ASCII fallback and the encoded \`filename*\` value if both are part of the server contract. Decode the parameter before comparing the user-visible name. A raw percent-encoded comparison proves wire syntax but not correct Unicode recovery.

## Verify large asynchronous exports by manifest

Large exports are often job-based. The initial POST returns a job identifier, a status endpoint transitions from queued to complete, and a final signed URL serves the artifact. The test should preserve that sequence instead of waiting for a file immediately after the first click.

Seed a bounded dataset, intercept the job creation response, poll status through the application's documented API, and then download the provided URL. Assert that the manifest reports the same row count, filters, and generation version as the parsed artifact. If the URL expires, test expiration with a controlled server clock rather than delaying the suite.

Job failure deserves its own case. Force the exporter to reject a known synthetic row and verify that the UI presents a stable failure state without creating a zero-byte “successful” file. A retry action should create or resume work according to the backend contract, not silently download the previous artifact.

For million-row exports, parsing the full file in every pull request may be unnecessary. A scheduled test can validate complete counts and boundary records, while pull requests use a small fixture through the identical serialization path. Sampling random lines is weak unless the seed and selection rule are reproducible.

## Separate content correctness from spreadsheet presentation

CSV has data but no visual formatting. XLSX reports can carry number formats, frozen panes, formulas, hidden sheets, and column widths. Decide whether those features are product requirements. A workbook parser can assert a currency cell contains a numeric value with the intended number format, while a screenshot-based office application test may be needed for rendering fidelity.

Never open an untrusted workbook with macros enabled during CI. Prefer generated synthetic files and parsers that do not execute embedded content. If the feature creates formulas from user-supplied strings, test spreadsheet formula injection: values beginning with formula markers may need escaping according to the export's threat model.

## Frequently Asked Questions

### Does cy.readFile wait until the browser finishes downloading?

It retries reading and its chained assertions until they pass or time out. Use an exact path, remove stale artifacts first, and assert content that cannot be satisfied by a partially written file. A task that calls Node's \`readFile\` once does not gain the same retry behavior.

### How can I verify the downloaded MIME type?

Inspect the export HTTP response's \`Content-Type\` header using \`cy.request()\` or an intercept. The filesystem artifact does not retain HTTP headers, and a filename extension is not proof of media type.

### Why should CSV assertions use a parser?

Quoted fields can contain commas, quotes, and newlines. A line or comma split misinterprets valid CSV. Parse the document, then assert headers, record values, ordering, and encoding according to the export contract.

### What encoding should I pass for a PDF download?

Pass \`null\` to \`cy.readFile()\` to receive binary bytes rather than UTF-8 text. Use a PDF-capable Node library when the test must inspect pages, text, or metadata.

### How do I prevent an old download from making the test pass?

Delete the exact expected path before triggering the export, use an isolated downloads directory, and choose a deterministic filename for the scenario. Avoid globbing for whichever matching file happens to be newest.
`,
};
