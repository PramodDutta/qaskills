import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Subresource Integrity: Hashes, Fallbacks, and CDN Rotation',
  description: 'subresource integrity testing verifies SRI hashes, CDN fallback behavior, CORS, and asset rotation so third-party script changes fail safely.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing Subresource Integrity: Hashes, Fallbacks, and CDN Rotation

subresource integrity testing verifies that a browser refuses to execute or apply a fetched script or stylesheet when its bytes do not match the declared SRI hash. A useful SRI test also proves that your build creates the right hashes, your pages reference the current hashes, CDN rotation does not ship stale integrity attributes, and failure behavior is acceptable when the browser blocks an asset.

The short version: SRI is not a string you paste into HTML once. It is a release contract between asset bytes, markup, CDN cache, CORS policy, and user experience.

The browser feature is documented by MDN at https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity and standardized by W3C at https://www.w3.org/TR/SRI/. In practice, QA engineers need to test the pipeline around the feature because most production SRI failures come from stale manifests, transformed assets, or deployment order, not from misunderstanding the hash algorithm.

## Treat SRI As A Byte-Level Contract

SRI checks bytes. It does not check your source file before minification. It does not check the package version in package lock. It does not check what your build system intended to upload. The browser fetches a resource and compares the fetched bytes to the hash listed in the \`integrity\` attribute.

That contract has several moving parts:

| Contract piece | What must match | Test signal |
|---|---|---|
| Asset bytes | CDN response body equals the hashed bytes | Recomputed hash equals markup value |
| Markup | \`script\` or \`link\` includes the current \`integrity\` value | Rendered HTML references manifest hash |
| CORS | Cross-origin resource is fetchable in the required mode | Browser does not block before integrity can pass |
| Cache | CDN does not serve old bytes under new hash or new bytes under old hash | Cache purge or versioned URL test passes |
| Failure UX | Blocked asset does not create an unsafe or silent broken state | Browser test sees controlled degradation |

Here is a deliberately tiny stylesheet and a page that references its real SHA-384 hash. The stylesheet content is exactly one line ending after the semicolon.

\`\`\`css
body { color: #111; }
\`\`\`

\`\`\`html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>SRI sample</title>
    <link
      rel="stylesheet"
      href="/assets/app.css"
      integrity="sha384-1Q+DSPbT/CQxnwPyw9xkUbl1vZqZCEgVivNST1s7j8EgYYBMdM+q+ML3QIfhU652"
      crossorigin="anonymous">
  </head>
  <body>
    <h1>QA Skills</h1>
  </body>
</html>
\`\`\`

If the server returns even one different byte for \`/assets/app.css\`, the browser must reject the stylesheet. That includes changed whitespace, a different line ending, a CDN compression bug that changes bytes before hashing, or a post-build optimizer that edits files after the SRI manifest is generated.

What people get wrong: they hash the source asset before the final production transform. If your build minifies, fingerprints, rewrites URLs, or injects license banners after the hash step, your SRI value describes a file the browser never sees. The hash step should run after every byte-changing transform and before upload or manifest publication.

## Generate Hashes In The Same Pipeline That Publishes Assets

Manual SRI is fine for a demo and unsafe for a release process. Build the hash from the exact file that will be served. The example below uses Node built-in modules, so there is no package name or plugin behavior to trust.

\`\`\`ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function sriSha384ForFile(path: string) {
  const bytes = readFileSync(path);
  const digest = createHash("sha384").update(bytes).digest("base64");
  return "sha384-" + digest;
}

console.log(sriSha384ForFile("public/assets/app.css"));
\`\`\`

Run that after the file is in its final production form. If you use hashed filenames, produce a manifest that maps the final URL to the SRI value:

\`\`\`json
{
  "/assets/app.7fd1a8.css": {
    "integrity": "sha384-1Q+DSPbT/CQxnwPyw9xkUbl1vZqZCEgVivNST1s7j8EgYYBMdM+q+ML3QIfhU652",
    "contentType": "text/css"
  },
  "/assets/app.92db10.js": {
    "integrity": "sha384-2/mVk4XtdrvtE+wmoIozz/G6yRd9bT78Ol5T8XY06oPFexypyAYqpHMwFJgQwSPK",
    "contentType": "text/javascript"
  }
}
\`\`\`

The manifest is the bridge between build output and rendered HTML. QA can test the bridge without caring whether the app uses React, Vue, Astro, a server template, or static HTML.

\`\`\`ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

function sha384(bytes: Buffer) {
  return "sha384-" + createHash("sha384").update(bytes).digest("base64");
}

describe("SRI manifest", () => {
  test("matches the final CSS bytes", () => {
    const css = Buffer.from("body { color: #111; }\\n", "utf8");
    const manifest = {
      "/assets/app.css": {
        integrity: "sha384-1Q+DSPbT/CQxnwPyw9xkUbl1vZqZCEgVivNST1s7j8EgYYBMdM+q+ML3QIfhU652"
      }
    };

    expect(manifest["/assets/app.css"].integrity).toBe(sha384(css));
  });
});
\`\`\`

This is a small test, but it encodes the only fact SRI cares about: bytes to hash. In a real app, read from \`dist\` or \`public\` after the production build, not from \`src\`.

## Validate Rendered HTML, Not Only The Manifest

A correct manifest does nothing if the page renders a stale attribute. The HTML that reaches the browser must contain the integrity value for the asset URL it actually loads.

Use a rendered-output test when your app has server templates or static generation:

\`\`\`ts
import { describe, expect, test } from "vitest";

function extractIntegrity(html: string, href: string) {
  const escapedHref = href.replaceAll("/", "\\\\/");
  const pattern = new RegExp("<link[^>]+href=\\"" + escapedHref + "\\"[^>]+integrity=\\"([^\\"]+)\\"", "i");
  return html.match(pattern)?.[1];
}

describe("rendered SRI attributes", () => {
  test("uses the manifest hash for the CSS URL", () => {
    const html = '<link rel="stylesheet" href="/assets/app.css" integrity="sha384-1Q+DSPbT/CQxnwPyw9xkUbl1vZqZCEgVivNST1s7j8EgYYBMdM+q+ML3QIfhU652" crossorigin="anonymous">';
    const integrity = extractIntegrity(html, "/assets/app.css");

    expect(integrity).toBe("sha384-1Q+DSPbT/CQxnwPyw9xkUbl1vZqZCEgVivNST1s7j8EgYYBMdM+q+ML3QIfhU652");
  });
});
\`\`\`

This example uses a small regular expression because the fixture is tiny. In a production test, prefer an HTML parser if your test stack already includes one. The core assertion is URL plus integrity. Checking only that "some integrity attribute exists" can pass while the page binds the old hash to the new URL.

Rendered HTML tests are especially useful during CDN rotation. A release can upload \`app.new.js\`, publish HTML pointing to it, but keep the old hash from \`app.old.js\`. The browser will do exactly what you asked: block the script.

## Test CDN Rotation As A Deployment Sequence

CDN rotation has a timing problem. HTML, manifest, assets, and cache invalidation do not always become visible at the same instant. Users can receive new HTML with old assets or old HTML with new assets. SRI turns those mismatches into blocked resources.

Use versioned asset URLs whenever possible. They reduce the chance that a CDN serves different bytes under the same URL. When you cannot version URLs, your rotation tests must be stricter.

| Rotation pattern | SRI risk | Safer test |
|---|---|---|
| Fingerprinted URL per build | Low if HTML and asset upload are ordered | Fetch HTML, then fetch each referenced asset and recompute hash |
| Stable CDN URL with overwritten bytes | High | Prove purge completes before HTML update |
| Third-party CDN package URL | Medium | Pin exact version and hash fetched bytes |
| Multi-CDN failover | Medium to high | Compare bytes and headers from every CDN origin |

A release smoke test can crawl the built page, fetch referenced resources, and recompute integrity values. The code below avoids a browser and checks the byte contract directly.

\`\`\`ts
import { createHash } from "node:crypto";

type AssetReference = {
  url: string;
  integrity: string;
};

function sriForBytes(bytes: ArrayBuffer) {
  const buffer = Buffer.from(bytes);
  return "sha384-" + createHash("sha384").update(buffer).digest("base64");
}

export async function verifyAsset(reference: AssetReference) {
  const response = await fetch(reference.url);
  if (!response.ok) {
    throw new Error("Asset fetch failed: " + response.status);
  }
  const actual = sriForBytes(await response.arrayBuffer());
  if (actual !== reference.integrity) {
    throw new Error("SRI mismatch for " + reference.url);
  }
  return true;
}
\`\`\`

Run this against the same URL a browser would request, including CDN hostname. Do not only check the origin bucket. Many SRI incidents are cache-state incidents.

## Check Browser Behavior When Integrity Fails

Hash tests prove the contract should pass. Browser tests prove the app fails acceptably when the contract does not pass. This matters for security and availability.

For a non-critical stylesheet, a blocked resource might be acceptable if the page remains readable. For a security-sensitive script, the correct behavior might be to stop a workflow rather than continue with missing validation. QA should define that outcome.

| Asset type | If blocked | Acceptable response |
|---|---|---|
| Decorative stylesheet | Layout changes | Core content remains readable |
| App shell CSS | Page may look plain | Navigation and forms remain usable enough for recovery |
| Analytics script | Event loss | Product behavior remains unaffected |
| Payment or auth script | Workflow cannot continue | User sees a controlled error, not a partial unsafe flow |

With Playwright, you can fulfill a script request with altered bytes and assert that the page does not enter a false-ready state:

\`\`\`ts
import { expect, test } from "@playwright/test";

test("blocks a tampered SRI script and shows controlled state", async ({ page }) => {
  await page.route("**/assets/app.js", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: 'console.log("tampered");\\n'
    });
  });

  await page.goto("http://127.0.0.1:5173/sri-page.html");

  await expect(page.getByText("Application asset failed to load")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeHidden();
});
\`\`\`

The page under test needs to expose a controlled state for this assertion to work. If your app has no way to detect a blocked required script, test the visible consequence: the privileged action should not appear, the payment button should not enable, or the shell should show a supportable error.

Do not treat console noise as the only signal. Browsers report SRI failures in console messages, but user experience tests should assert UI state and workflow safety.

## Combine SRI With Header Testing

SRI does not replace security headers. It answers "did this fetched resource match the expected bytes?" It does not decide which origins are allowed, whether a page can be framed, whether browser features are disabled, or whether HTTPS is required.

Use SRI alongside Content Security Policy, HSTS, Permissions Policy, Referrer Policy, and frame protections. The companion article on [security headers testing for HSTS and Permissions Policy](/blog/security-headers-testing-hsts-permissions-policy) covers those checks in detail.

The interaction with CSP is important. CSP can restrict where scripts and styles load from. SRI can detect unexpected bytes from an allowed source. Both are useful because "allowed CDN" does not mean "correct asset."

| Control | Main job | SRI relationship |
|---|---|---|
| CSP \`script-src\` | Limit script origins and execution rules | Reduces where resources can come from |
| SRI | Verify fetched script or stylesheet bytes | Detects tampering or stale asset mismatch |
| HSTS | Force HTTPS after first trusted visit | Protects transport downgrade after policy is known |
| Permissions Policy | Disable browser features by origin | Limits impact of loaded code |

Header tests and SRI tests should run together in release smoke checks. A CDN rotation that changes asset hostnames can break both CSP and SRI at the same time.

## Watch Layout And Web Vitals When Stylesheets Are Blocked

SRI failures are often discussed as security events, but stylesheet integrity failures can also create layout instability. If a critical CSS file is blocked, text may reflow, controls can move, and layout shift can spike. That does not mean you should remove SRI from CSS. It means you should know the degradation mode.

The related guide on [web vitals CLS layout shift debugging](/blog/web-vitals-cls-layout-shift-debugging) is useful when blocked or delayed CSS changes page geometry. For SRI-specific QA, capture the before-and-after UI state with the stylesheet blocked:

| Page region | Blocked CSS risk | Assertion |
|---|---|---|
| Header navigation | Buttons wrap or disappear | Primary nav remains reachable |
| Checkout form | Labels and inputs separate | Labels remain associated and visible |
| Modal dialogs | Overlay positioning breaks | Destructive actions are not accidentally exposed |
| Login screen | Password manager icons overlap | Form can still be completed or recovery is shown |

You can also collect layout shift entries in a browser test, but keep the threshold illustrative unless your product has a measured budget.

\`\`\`ts
import { expect, test } from "@playwright/test";

test("critical page remains navigable when theme CSS is blocked", async ({ page }) => {
  await page.route("**/assets/theme.css", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/css",
      body: "body { transform: scale(1.02); }\\n"
    });
  });

  await page.goto("http://127.0.0.1:5173/account.html");

  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save settings" })).toBeVisible();
});
\`\`\`

This uses altered CSS to trigger an integrity mismatch when the page has an SRI attribute. If your local test page does not use SRI, the CSS will apply and the test is not testing SRI. Always verify the page under test contains the integrity attribute.

## A Failure Story: The CDN Was Blamed, The Manifest Was Guilty

The symptom was a white page for a slice of users after a Friday release. Browser consoles showed an integrity mismatch for \`app.js\`. The wrong theory was that the CDN served corrupted JavaScript from one region, so the first response was to purge everything repeatedly.

The actual cause was the build pipeline. A license-banner step ran after the SRI manifest was generated. Most pages referenced a fingerprinted URL and a hash for the pre-banner bytes. Some users got old HTML from cache and were fine. Others got new HTML and new bytes with the old hash. The CDN did not corrupt the file. It served exactly what had been uploaded.

The fix was to move SRI manifest generation after every byte-changing transform, then add a release smoke test that fetched the deployed HTML, extracted each script and stylesheet with \`integrity\`, fetched the deployed asset through the CDN hostname, and recomputed the hash. The team also changed deployment order so assets uploaded before HTML publication.

The lasting lesson was that SRI incidents often look like CDN incidents because the browser reports the final mismatch. You still have to trace backward through the build graph.

## Test Third-Party Scripts With Clear Ownership

Third-party resources are the emotional reason many teams adopt SRI. A vendor script changes without your deploy. SRI can block the unexpected change if you pinned a hash. That is useful, but it creates an operational responsibility: someone must update the hash when the vendor legitimately updates the file.

Use this ownership table:

| Third-party asset | Pinning decision | Owner action |
|---|---|---|
| Static library from versioned CDN URL | Pin with SRI | Update URL and hash together |
| Vendor loader that changes frequently | SRI may cause frequent blocks | Prefer vendor-recommended secure integration or self-host if allowed |
| Payment provider script | Follow provider documentation | Do not add SRI if provider explicitly requires dynamic script delivery |
| Self-hosted copy of dependency | Pin self-hosted bytes | Rebuild and review during dependency updates |

Be careful with payment, identity, and fraud vendors. Some official integrations intentionally serve dynamic scripts. Adding SRI without checking the vendor documentation can break production. Test what you own, and follow official provider guidance for what they own.

## Put SRI Checks In CI And Release Smoke

CI should catch local manifest mismatches. Release smoke should catch deployed CDN mismatches. Use both because they cover different failure modes.

\`\`\`yaml
name: sri-checks

on:
  pull_request:
  workflow_dispatch:

jobs:
  sri:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test -- -t "SRI"
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: sri-debug-output
          path: dist
\`\`\`

For release smoke, run the deployed-URL checker after the site is live. It should fetch HTML from production, not from the build folder. If your deployment uses multiple regions or CDNs, sample each public hostname your users can hit.

## A Pull Request Checklist For SRI Changes

Use this review checklist when SRI appears in a diff:

| Check | Pass condition |
|---|---|
| Hash timing | Hash is computed after final production transforms |
| URL pairing | Each integrity value is tied to the same URL the page renders |
| Cross-origin mode | Cross-origin scripts and styles include appropriate CORS behavior |
| CDN rotation | Deployment order cannot expose new HTML with stale asset bytes |
| Failure state | Critical blocked assets do not enable unsafe workflows |
| Header interaction | CSP and host allowlists match the asset hostnames |
| Third-party policy | Vendor docs do not forbid or undermine SRI pinning |

SRI is simple at the browser boundary and easy to break in the release machinery around it. The highest-signal tests recompute hashes from deployed bytes and force at least one integrity failure in a real browser.

## Make The Release Gate Prove The Public Page

A local build check is necessary, but the release gate should test the public page after routing, compression, cache policy, and CDN selection have all happened. That gate should start from a URL, not from a file path. Fetch the HTML exactly as a user would, collect every \`script[src][integrity]\` and stylesheet \`link[href][integrity]\`, fetch each asset, and recompute the hash from the response body.

Record enough context to diagnose the mismatch:

| Captured field | Why it helps |
|---|---|
| Page URL | Confirms which deployed page referenced the asset |
| Asset URL | Separates bad markup from bad CDN content |
| Expected integrity | Shows the rendered contract |
| Actual integrity | Shows the bytes the CDN served |
| Cache headers | Helps identify stale edge behavior |
| Deployment ID | Connects the failure to a release artifact |

Do not hide this behind a generic "site smoke failed" message. SRI failures need byte-level evidence. The person on call should be able to see whether the page had a stale hash, the asset had stale bytes, or a CDN node served an unexpected variant.

One useful release rule is strict: no page with an integrity mismatch becomes the promoted production version. That rule is easier to defend than a manual exception because a mismatch means the browser will block the resource for at least some users. If the asset is critical, the page may be unusable. If the asset is non-critical, the mismatch still proves the deployment graph is inconsistent.

## Frequently Asked Questions

### What should subresource integrity testing verify first?

Start by recomputing the SRI hash from the exact bytes the browser will fetch and comparing it with the rendered \`integrity\` attribute. That catches stale manifests, post-hash minification, and CDN cache mismatches. After the byte check passes, test browser behavior when the asset is tampered with or unavailable. For critical scripts, assert a controlled blocked state. For stylesheets, assert the page remains readable or shows a supportable recovery path.

### Should every third-party script use SRI?

No. Use SRI when the third-party URL is stable or version-pinned and the provider supports that integration style. Some payment, identity, fraud, and tag-management scripts are designed to change dynamically, and provider documentation may warn against pinning them with SRI. In those cases, use official integration guidance, CSP, vendor allowlists, monitoring, and isolation patterns. Blindly adding SRI can turn a normal vendor update into a production outage.

### Does SRI replace Content Security Policy?

No. SRI and CSP answer different questions. CSP limits where scripts and styles can load from and which execution patterns are allowed. SRI verifies that a fetched script or stylesheet matches expected bytes. An allowed CDN can still serve the wrong file, and SRI can catch that. A correct hash does not decide whether the origin should have been allowed. Test them together, especially when asset hostnames or CDN routing change.

### How do I test CDN rotation without flaky browser tests?

Use a two-layer approach. First, run a fast deployed-byte checker that fetches production HTML, extracts asset URLs and integrity attributes, fetches those assets through the public CDN hostname, and recomputes hashes. Second, keep one or two browser tests that force an integrity mismatch and assert safe UI behavior. The byte checker catches most rotation mistakes without UI flake. The browser test proves blocked assets do not create unsafe workflows.
`,
};
