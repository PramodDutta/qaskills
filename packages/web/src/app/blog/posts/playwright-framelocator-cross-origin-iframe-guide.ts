import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright frameLocator + Cross-Origin iframes Complete Guide',
  description:
    'Master Playwright frameLocator and cross-origin iframes: contentFrame, nested frames, Stripe and reCAPTCHA patterns, switchToFrame alternatives, postMessage testing in 2026.',
  date: '2026-06-06',
  category: 'Reference',
  content: `
# Playwright frameLocator + Cross-Origin iframes Complete Guide

Cross-origin iframes are the single hardest part of modern browser automation. Stripe Elements, reCAPTCHA, embedded YouTube players, third-party chat widgets, OAuth login pop-ups - all of them load from a different origin than your application, and historically every test framework has struggled to interact with them. Playwright's \`frameLocator\` solves this completely. With one method call, you cross the origin boundary, get a locator scoped inside the iframe, and use the same \`getByRole\` / \`getByLabel\` API you use for the main page. No iframe handle juggling, no \`switchTo\`, no losing context after a navigation.

This guide is the complete reference for \`frameLocator\` in 2026. We cover same-origin and cross-origin iframes, nested iframes, dynamic iframes that load after page interaction, the \`contentFrame\` accessor for cases where you have an iframe element handle, and the patterns for testing Stripe Elements, reCAPTCHA, and other common third-party widgets. Every example is runnable Playwright TypeScript.

For locator fundamentals see [Playwright Best Practices for Locators](/blog/playwright-best-practices-locators-2026). For browser context isolation, which affects iframe behavior, see [Playwright BrowserContext + Incognito Sessions](/blog/playwright-browser-contexts-incognito-guide). The [playwright-e2e skill](/skills/playwright-e2e) installs these iframe patterns directly into Claude Code, Cursor, or Aider.

## The minimal frameLocator pattern

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('interact with same-origin iframe', async ({ page }) => {
  await page.goto('/page-with-iframe');

  const iframe = page.frameLocator('iframe[name="content"]');
  await iframe.getByRole('button', { name: 'Open editor' }).click();
  await iframe.getByLabel('Title').fill('Hello');
  await expect(iframe.getByRole('heading', { name: 'Hello' })).toBeVisible();
});
\`\`\`

\`page.frameLocator(selector)\` returns a \`FrameLocator\`. You chain locator methods on it as if it were a \`page\` itself. The locator inside the iframe re-resolves on every action, which means the iframe can reload independently without breaking your test.

## Selecting the iframe element

\`frameLocator\` accepts the same selectors as \`locator\`. The most common forms:

| Selector | Targets |
|---|---|
| \`'iframe[name="content"]'\` | iframe with attribute \`name="content"\` |
| \`'iframe[title="Stripe"]'\` | iframe with title attribute |
| \`'iframe[src*="stripe.com"]'\` | iframe whose src contains "stripe.com" |
| \`'iframe.embedded-form'\` | iframe with CSS class |
| \`'#payment-iframe'\` | iframe with id |
| \`'iframe >> nth=0'\` | first iframe on the page |

Prefer attribute-based selectors over CSS classes or position. The \`name\`, \`title\`, and \`src\` attributes are usually stable across redesigns.

\`\`\`typescript
// Stripe Elements
const stripeFrame = page.frameLocator('iframe[title*="Secure card"]');

// reCAPTCHA
const recaptcha = page.frameLocator('iframe[src*="recaptcha"]');

// Embedded YouTube
const youtube = page.frameLocator('iframe[src*="youtube.com"]');
\`\`\`

## Cross-origin iframes work the same way

Playwright handles cross-origin iframes transparently. The same \`frameLocator\` call works whether the iframe is from your origin or a different one. Browser-imposed cross-origin restrictions (no \`document.contentDocument\` access from the parent) do not apply because Playwright drives both frames through the same DevTools protocol session.

\`\`\`typescript
test('fill in Stripe card element', async ({ page }) => {
  await page.goto('/checkout');

  const stripe = page.frameLocator('iframe[title*="Secure card number"]');
  await stripe.getByPlaceholder('1234 1234 1234 1234').fill('4242 4242 4242 4242');

  const expiry = page.frameLocator('iframe[title*="Secure expiration"]');
  await expiry.getByPlaceholder('MM / YY').fill('12 / 30');

  const cvc = page.frameLocator('iframe[title*="Secure CVC"]');
  await cvc.getByPlaceholder('CVC').fill('123');

  await page.getByRole('button', { name: 'Pay' }).click();
});
\`\`\`

Stripe loads each Element in its own iframe. The pattern is one \`frameLocator\` per iframe, and you use \`getByPlaceholder\` (or \`getByRole\`) inside.

## Nested iframes

If an iframe contains another iframe, chain \`frameLocator\` calls:

\`\`\`typescript
const outerFrame = page.frameLocator('iframe[name="outer"]');
const innerFrame = outerFrame.frameLocator('iframe[name="inner"]');
await innerFrame.getByRole('button', { name: 'Click me' }).click();
\`\`\`

There is no limit on nesting depth. Each \`frameLocator\` call scopes deeper into the document tree.

## frameLocator vs frame() vs contentFrame()

Playwright has three APIs for iframes. They differ in when they resolve and how they interact:

| API | Type | When it resolves | Survives reload |
|---|---|---|---|
| \`page.frameLocator(sel)\` | Lazy locator | At action time | Yes |
| \`page.frame({ name })\` | Frame handle | Immediately | No |
| \`elementHandle.contentFrame()\` | Frame handle | Immediately | No |

\`frameLocator\` is the modern, recommended API. Use it for almost everything. \`frame()\` and \`contentFrame()\` are older patterns useful only in specific cases like waiting for a specific frame to load before interacting.

\`\`\`typescript
// Old pattern (still works)
const frame = page.frame({ name: 'content' });
await frame.getByRole('button').click();

// Modern pattern (preferred)
const frame = page.frameLocator('iframe[name="content"]');
await frame.getByRole('button').click();
\`\`\`

The modern pattern handles iframe reloads, dynamic iframes, and changes to the iframe element without re-querying. The old pattern requires manual re-querying when the iframe changes.

## Dynamic iframes that load after interaction

Often an iframe is created in response to a user action: clicking "Pay now" opens a Stripe modal iframe; clicking "Verify" opens a reCAPTCHA iframe. With \`frameLocator\`, you treat this exactly like a normal locator: declare the locator, then click the button that creates the iframe. Playwright waits.

\`\`\`typescript
test('iframe appears after click', async ({ page }) => {
  await page.goto('/checkout');

  // Declare locator before the iframe exists
  const paymentFrame = page.frameLocator('iframe[title="Stripe Checkout"]');

  // Click triggers the iframe to load
  await page.getByRole('button', { name: 'Pay with card' }).click();

  // Auto-wait: this resolves when the iframe is loaded and the button is visible
  await paymentFrame.getByRole('button', { name: 'Pay' }).click();
});
\`\`\`

This works because \`frameLocator\` is lazy. The iframe selector resolves at action time, not at locator declaration time.

## Working with reCAPTCHA

You cannot actually solve a reCAPTCHA from automation - that is the entire point of reCAPTCHA. But you can:

1. **Interact with the visible reCAPTCHA checkbox** for "I am not a robot" challenges in test mode.
2. **Set the reCAPTCHA test key** (\`6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI\` for v2) which always passes.
3. **Mock the reCAPTCHA verification endpoint** with \`page.route\` for tests of your application's reCAPTCHA-aware code paths.

\`\`\`typescript
test('reCAPTCHA test key passes automatically', async ({ page }) => {
  await page.goto('/contact-form'); // Uses Google's test reCAPTCHA key

  const recaptcha = page.frameLocator('iframe[src*="recaptcha"][title="reCAPTCHA"]');
  await recaptcha.getByRole('checkbox', { name: 'I am not a robot' }).click();

  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Thanks for your message')).toBeVisible();
});
\`\`\`

Mocking the verification endpoint:

\`\`\`typescript
test('with mocked reCAPTCHA', async ({ page }) => {
  await page.route('https://www.google.com/recaptcha/api/siteverify', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, score: 0.9 }),
    });
  });

  await page.goto('/contact-form');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Thanks')).toBeVisible();
});
\`\`\`

For more on \`page.route\`, see [Playwright page.route + route.fulfill Reference](/blog/playwright-route-fulfill-network-mocking-reference).

## Testing OAuth iframes

OAuth providers often render their consent screen in a pop-up window rather than an iframe. For true iframe-based OAuth (rare in 2026), the \`frameLocator\` pattern applies. For pop-up OAuth, use Playwright's \`page.context().waitForEvent('page')\` to capture the new window.

\`\`\`typescript
test('OAuth in popup window', async ({ page, context }) => {
  await page.goto('/login');

  const popupPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Sign in with Google' }).click();

  const popup = await popupPromise;
  await popup.waitForLoadState();

  await popup.getByLabel('Email').fill('user@example.com');
  await popup.getByRole('button', { name: 'Next' }).click();
  await popup.getByLabel('Password').fill('secret');
  await popup.getByRole('button', { name: 'Sign in' }).click();

  // Wait for OAuth callback in original page
  await expect(page).toHaveURL('/dashboard');
});
\`\`\`

## Same-origin iframes

For iframes from your own origin (admin embeds, plugin sandboxes), \`frameLocator\` works identically:

\`\`\`typescript
test('admin embedded reports', async ({ page }) => {
  await page.goto('/admin/dashboard');

  const reports = page.frameLocator('iframe[name="report-embed"]');
  await expect(reports.getByRole('heading', { name: 'Revenue Report' })).toBeVisible();

  await reports.getByLabel('Date range').selectOption('Last 30 days');
  await expect(reports.getByText('Total: $')).toBeVisible();
});
\`\`\`

Same-origin iframes appear in the parent's accessibility tree, so \`getByRole\` and \`getByText\` work without any special handling.

## Waiting for an iframe to appear

When an iframe is created dynamically, your test should wait for it. \`frameLocator\` does not have an explicit wait method, but any action on it auto-waits.

\`\`\`typescript
// Explicit wait via the iframe element
await page.waitForSelector('iframe[title="Stripe Checkout"]');
const stripe = page.frameLocator('iframe[title="Stripe Checkout"]');
await stripe.getByRole('button', { name: 'Pay' }).click();

// Or skip the explicit wait - the next action auto-waits
const stripe = page.frameLocator('iframe[title="Stripe Checkout"]');
await stripe.getByRole('button', { name: 'Pay' }).click(); // waits for iframe and button
\`\`\`

The second pattern is preferred. Explicit waits are a code smell; auto-wait is correct.

## Iframe lifecycle: when re-resolves happen

\`frameLocator\` re-resolves on every action. This means:

- The iframe can reload (\`src\` changes) and your locator still works.
- The iframe can be removed and re-added; the next action waits for it.
- The iframe element can move in the DOM; the locator finds it by selector.

The only failure mode is when the iframe never appears (in which case the action times out) or when the iframe selector becomes ambiguous (strict mode violation).

| Event | frameLocator behavior |
|---|---|
| Iframe loads later | Action waits |
| Iframe \`src\` changes | Next action re-resolves |
| Iframe is removed | Next action waits for re-appearance |
| Iframe is removed forever | Action times out |
| Two iframes match | Strict mode violation |

## switchToFrame: alternatives

Selenium's \`driver.switchTo().frame(name)\` has no direct Playwright equivalent because Playwright does not have a "current frame" concept. Every locator is explicitly scoped. The closest equivalent is to assign the \`frameLocator\` to a variable:

\`\`\`typescript
// Selenium style:
// driver.switchTo().frame("content");
// driver.findElement(By.cssSelector("button")).click();

// Playwright equivalent:
const content = page.frameLocator('iframe[name="content"]');
await content.locator('button').click();
\`\`\`

The Playwright pattern is cleaner because there is no ambiguity about which frame is "current". Multiple frames can be in scope at once in the same test.

## Working with dynamic iframe attributes

Some iframes load with a placeholder attribute and update it after JavaScript runs. Examples include lazy-loaded ads, deferred analytics iframes, and chat widgets that swap their \`src\` after auth.

\`\`\`typescript
test('dynamic iframe src', async ({ page }) => {
  await page.goto('/');

  // Initially the iframe is a placeholder
  const ad = page.frameLocator('iframe[id="ad-slot"]');

  // After scroll, the iframe loads real content
  await page.mouse.wheel(0, 500);

  // The frameLocator auto-waits for the iframe to be ready
  await expect(ad.getByText('Sponsored')).toBeVisible({ timeout: 10000 });
});
\`\`\`

The frameLocator selector \`iframe[id="ad-slot"]\` matches the iframe element regardless of \`src\` changes. The iframe's content updates as the iframe loads.

## Inspecting iframe origins

Sometimes a test needs to confirm which origin an iframe loaded from. Use \`page.frames()\` to enumerate all frames:

\`\`\`typescript
test('verify Stripe origin', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Pay' }).click();

  const stripeFrames = page.frames().filter((f) => f.url().includes('js.stripe.com'));
  expect(stripeFrames.length).toBeGreaterThan(0);
});
\`\`\`

\`page.frames()\` returns an array of \`Frame\` objects with URLs, names, and titles. Useful for asserting that third-party iframes are loading from the expected domains, which catches CSP misconfigurations.

## Multiple iframes with the same selector

If the page has several iframes matching your selector, you have two options:

\`\`\`typescript
// Option 1: target by index
const firstAd = page.frameLocator('iframe.ad-banner').first();
const secondAd = page.frameLocator('iframe.ad-banner').nth(1);

// Option 2: scope by parent
const sidebarAd = page.locator('.sidebar').frameLocator('iframe.ad-banner');
const mainAd = page.locator('main').frameLocator('iframe.ad-banner');
\`\`\`

Both patterns work. The second is more robust because it does not depend on iframe order.

## postMessage testing

Cross-origin iframes communicate with the parent via \`window.postMessage\`. To test this, you can:

1. Listen for messages from the iframe in the parent.
2. Inject messages from the parent to the iframe.

\`\`\`typescript
test('listens for postMessage from iframe', async ({ page }) => {
  await page.goto('/with-embed');

  const messages: string[] = [];
  await page.exposeFunction('captureMessage', (data: string) => {
    messages.push(data);
  });

  await page.evaluate(() => {
    window.addEventListener('message', (event) => {
      // @ts-ignore
      window.captureMessage(JSON.stringify(event.data));
    });
  });

  // Trigger the iframe to post a message
  const iframe = page.frameLocator('iframe[name="widget"]');
  await iframe.getByRole('button', { name: 'Send' }).click();

  await expect.poll(() => messages).toContain('{"type":"sent","ok":true}');
});
\`\`\`

## Performance: iframe overhead

Iframes have measurable overhead in Playwright. Each iframe is a separate document with its own resource queue. A page with 20 iframes typically takes 2-3x longer to interact with than the same content rendered inline. If your test is slow, check how many iframes the page loads.

For pages with many ad iframes, consider blocking them with \`page.route\`:

\`\`\`typescript
await page.route('**/*.{doubleclick.net,googleadservices.com}/**', (route) => route.abort());
\`\`\`

This kills the iframe loads before they start, dramatically speeding up the test. The rest of the page renders normally.

## Iframes in Page Object Models

In a POM, iframes belong to the page or component that contains them. Example:

\`\`\`typescript
export class CheckoutPage {
  constructor(private page: Page) {}

  private stripeCardFrame() {
    return this.page.frameLocator('iframe[title*="Secure card number"]');
  }

  private stripeExpiryFrame() {
    return this.page.frameLocator('iframe[title*="Secure expiration"]');
  }

  async fillCard(number: string, exp: string) {
    await this.stripeCardFrame().getByPlaceholder('1234 1234 1234 1234').fill(number);
    await this.stripeExpiryFrame().getByPlaceholder('MM / YY').fill(exp);
  }
}
\`\`\`

The POM hides the iframe complexity from the test. Tests call \`checkout.fillCard('4242...', '12/30')\` without knowing Stripe uses iframes.

## Iframe security implications for tests

Cross-origin iframes are sandboxed by the browser - the parent cannot read their contents via JavaScript, and the iframe cannot read the parent. Playwright bypasses this from the test runtime by driving both frames through DevTools, but the application code still sees the same restrictions.

This means:

- You can test that the parent communicates with the iframe via \`postMessage\` (the only legal channel).
- You cannot test scenarios that depend on the parent reading the iframe's DOM directly - that does not work in production either.
- You can verify the iframe loads from the expected origin (security check).

\`\`\`typescript
test('Stripe iframe origin is js.stripe.com', async ({ page }) => {
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');

  const stripeFrames = page.frames().filter((f) => f.url().includes('stripe.com'));
  expect(stripeFrames.length).toBeGreaterThan(0);
});
\`\`\`

This catches CSP misconfigurations or supply chain attacks where an iframe loads from an unexpected domain.

## Frequently Asked Questions

### How do I interact with a cross-origin iframe in Playwright?

Use \`page.frameLocator('iframe[selector]')\` and chain locator methods on it: \`page.frameLocator('iframe[title="Stripe"]').getByPlaceholder('Card').fill('4242...')\`. Playwright handles cross-origin boundaries transparently - the same API works whether the iframe is same-origin or cross-origin.

### What is the difference between frameLocator and frame()?

\`frameLocator\` is a lazy locator that resolves at action time and survives iframe reloads. \`frame()\` returns a frame handle that resolves immediately and breaks if the iframe is destroyed and recreated. Use \`frameLocator\` for all new code; \`frame()\` is an older pattern.

### Can I solve reCAPTCHA with Playwright?

No - that defeats the purpose of reCAPTCHA. But you can use Google's test reCAPTCHA key (\`6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI\`) which always passes, mock the \`/siteverify\` endpoint with \`page.route\`, or interact with the visible "I am not a robot" checkbox in test environments.

### How do I handle nested iframes?

Chain \`frameLocator\` calls: \`page.frameLocator('iframe[name="outer"]').frameLocator('iframe[name="inner"]').getByRole('button').click()\`. Each call scopes one level deeper. There is no nesting limit.

### Why does my locator fail with "iframe not found" even though it is visible?

The most common cause is selector ambiguity. If two iframes match, \`frameLocator\` throws a strict mode violation. Use a more specific selector (\`title\`, \`src*=...\`) or \`nth=0\`. The second cause is timing - if the iframe loads after your assertion, increase the action timeout or wait for the iframe element first.

### Can I fill in Stripe Elements with Playwright?

Yes. Each Stripe Element renders in its own iframe (card number, expiry, CVC are usually separate iframes). Target each with \`page.frameLocator('iframe[title*="Secure card number"]')\` etc., then use \`getByPlaceholder\` to fill. Stripe accepts test card \`4242 4242 4242 4242\`.

### How do I test OAuth flows that open in a popup?

Use \`context.waitForEvent('page')\` to capture the popup before clicking the OAuth button. The returned \`Page\` object lets you interact with the popup like the main page. After OAuth completes, the popup closes automatically and your main page navigates to the callback URL.

### Does frameLocator work for closed Shadow DOM in iframes?

The iframe boundary is independent of Shadow DOM. \`frameLocator\` crosses iframe boundaries; if the iframe contains open Shadow DOM, Playwright pierces it automatically. Closed Shadow DOM inside an iframe is not piercable by any framework - fix the application to use open shadows.

## Common iframe scenarios catalog

The following table maps real-world third-party iframe widgets to their typical \`frameLocator\` patterns. This is a reference for the most common cases:

| Widget | Iframe selector | Common interaction |
|---|---|---|
| Stripe card number | \`iframe[title*="Secure card number"]\` | \`getByPlaceholder('1234 ...').fill(num)\` |
| Stripe expiry | \`iframe[title*="Secure expiration"]\` | \`getByPlaceholder('MM / YY').fill(exp)\` |
| Stripe CVC | \`iframe[title*="Secure CVC"]\` | \`getByPlaceholder('CVC').fill(cvc)\` |
| Stripe Checkout | \`iframe[title="Stripe Checkout"]\` | navigate full payment flow |
| reCAPTCHA v2 | \`iframe[src*="recaptcha"][title="reCAPTCHA"]\` | \`getByRole('checkbox').click()\` |
| reCAPTCHA challenge | \`iframe[title="recaptcha challenge"]\` | only with test keys |
| Intercom messenger | \`iframe[name="intercom-messenger-frame"]\` | open chat, type message |
| Drift chat | \`iframe#drift-frame-chat\` | open, type, send |
| Zendesk widget | \`iframe[title="Messaging window"]\` | message flow |
| YouTube embed | \`iframe[src*="youtube.com/embed"]\` | usually only assert load |
| Vimeo embed | \`iframe[src*="player.vimeo.com"]\` | same |
| Google Maps | \`iframe[src*="google.com/maps"]\` | assert load |
| Twitter embed | \`iframe[title*="Twitter Tweet"]\` | usually only assert load |
| Spotify embed | \`iframe[src*="open.spotify.com/embed"]\` | assert load |

For widgets not listed, the pattern is the same: inspect the iframe element, find the most stable attribute (\`title\`, \`name\`, \`id\`, or \`src*=...\`), and use it as the selector.

## Detection of iframe presence

Sometimes you want to assert that an iframe loaded (or did not load) without interacting with it. The standard \`expect\` on the iframe element works:

\`\`\`typescript
test('embed iframe loaded', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('iframe[title*="Stripe"]')).toBeVisible();
});

test('analytics iframe blocked', async ({ page }) => {
  await page.route('**/google-analytics.com/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('iframe[src*="google-analytics"]')).toHaveCount(0);
});
\`\`\`

These assertions do not require \`frameLocator\` because you are not interacting with the iframe contents - only its presence in the parent DOM.

## Iframe screen recording

When you record video of a test via \`video: 'on'\`, the recording captures the entire page including iframe contents. Cross-origin iframes appear in the video just like the rest of the page. This is unlike browser screenshots that may show iframe placeholder content; Playwright's video does include the rendered iframe.

## Iframe testing pyramid

For a typical e-commerce checkout with multiple third-party iframes, structure your test pyramid as:

| Test level | Coverage |
|---|---|
| Unit | Application logic that talks to Stripe SDK (mock the SDK) |
| Integration | UI + Stripe Elements in their test mode |
| End-to-end | Full checkout including real Stripe test environment |

The integration layer is where \`frameLocator\` shines. It is fast (no real Stripe API calls), deterministic (test-mode iframe always behaves the same), and catches UI bugs that unit tests miss.

For real payment processor validation, the end-to-end tests are slower but catch any breakage in the Stripe integration. Most teams run E2E once per release; integration runs on every PR.

## Browser engine differences

Cross-origin iframe handling is consistent across Chromium, Firefox, and WebKit thanks to Playwright's protocol layer. You can write one test using \`frameLocator\` and have it run identically on all three engines without engine-specific code.

The one exception is iframe-related Privacy Sandbox features (Chrome's gradual cookie deprecation). Tests for those features need to run specifically against Chromium.

## Conclusion

\`page.frameLocator\` is the canonical Playwright API for working with iframes in 2026. It handles same-origin and cross-origin iframes identically, survives reloads, supports nesting, and uses the same locator methods (\`getByRole\`, \`getByLabel\`, \`getByPlaceholder\`) as the main page. The patterns above cover Stripe Elements, reCAPTCHA, embedded video, OAuth, and custom widgets.

For the locator fundamentals \`frameLocator\` builds on, see [Playwright Best Practices for Locators](/blog/playwright-best-practices-locators-2026). For network mocking that pairs well with iframe testing (especially for reCAPTCHA \`/siteverify\` endpoints), see [Playwright route.fulfill Network Mocking](/blog/playwright-route-fulfill-network-mocking-reference).

Install the [playwright-e2e skill](/skills/playwright-e2e) to ensure your AI agent (Claude Code, Cursor, Aider) emits the \`frameLocator\` pattern by default. Compare iframe handling across frameworks in [Cypress vs Playwright 2026](/compare/cypress-vs-playwright-2026).
`,
};
