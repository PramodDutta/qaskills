import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Accessibility Testing Autocomplete Attributes That Actually Work',
  description: 'Master accessibility testing autocomplete attributes with token audits, Playwright checks, realistic forms, and CI rules that prevent costly input regressions.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Accessibility Testing Autocomplete Attributes That Actually Work

Accessibility testing autocomplete attributes means verifying that fields collecting personal information expose the correct standardized purpose to browsers and assistive technology. The decisive evidence is not whether one tester saw an autofill popup. It is whether each applicable rendered control has a valid \`autocomplete\` value, in the correct token order, that matches the field's real meaning. Labels, input types, names, and placeholders remain important, but none replaces purpose metadata.

The payoff is less typing, fewer transcription errors, and more predictable forms for people with cognitive, memory, motor, and vision-related barriers. For WCAG 2.2 Success Criterion 1.3.5 at Level AA, the relevant question is whether the purpose of an input collecting information about the user can be programmatically determined when that purpose is part of the supported taxonomy.

A reliable workflow combines a product-purpose inventory, exact DOM assertions, a bounded grammar audit, browser interaction tests, and manual sessions with synthetic saved profiles. This approach catches missing attributes, valid-but-wrong tokens, broken repeated sections, and framework state bugs without pretending autofill behavior is identical across browsers.

## Inventory the information purpose before testing markup

Begin with requirements, not a DOM scan. For every input, select, and textarea, record whose information it captures, the business meaning, whether it represents current or newly created data, whether it repeats on the page, and the expected token sequence. “Email field” is insufficient when one control is an account identifier, another is a receipt destination, and a third collects a colleague's address.

| Product field | Expected value | Important distinction |
|---|---|---|
| Given name | \`given-name\` | more precise than a full-name purpose |
| Family name | \`family-name\` | independent from given name order |
| Sign-in secret | \`current-password\` | an existing credential |
| Registration secret | \`new-password\` | a credential being created |
| Verification value | \`one-time-code\` | not a reusable password |
| Cardholder name | \`cc-name\` | payment identity, not generic name |
| Shipping postal code | \`shipping postal-code\` | separate from billing address |
| Work telephone | \`work tel\` | contact qualifier before field purpose |

This inventory supplies the semantic oracle that generic tools lack. A scanner can notice an unknown token, but it cannot know that a syntactically valid billing token was placed on a shipping field. Product, design, accessibility, and QA should agree on ambiguous purposes before implementation.

The HTML autocomplete reference at https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete documents the vocabulary and ordering. WCAG's understanding document is at https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html. When a component library's shorthand conflicts with the rendered HTML or standard, test the actual form-associated element.

Not every control needs a personal-data purpose. Search terms, coupon codes, arbitrary messages, and application-specific identifiers may have no matching taxonomy entry. Record those as reviewed non-applicable controls rather than forcing inaccurate values. Accurate omission is better than misleading semantics.

## Treat token sequences as structured data

An autocomplete detail can be one field token such as \`email\` or a sequence that adds context. An optional named section begins with \`section-\`. A grouping token can distinguish \`shipping\` from \`billing\`. A contact qualifier such as \`home\` or \`work\` can precede a compatible contact purpose. The purpose token carries the central meaning. When \`webauthn\` is used, it appears last.

Order is meaningful. Alphabetically sorting \`section-delivery shipping postal-code\` corrupts the sequence. Removing the grouping token can cause repeated address fields to compete for the same stored value. Test the full string, not merely whether it contains one familiar word.

| Token role | Example | Test concern |
|---|---|---|
| named section | \`section-recipient\` | stable separation for repeated groups |
| grouping | \`shipping\` | placed before the purpose token |
| contact qualifier | \`work\` | used only with compatible contact data |
| field purpose | \`street-address\` | matches the requested information |
| terminal hint | \`webauthn\` | appears at the end when applicable |

What people get wrong is treating \`id="firstName"\` or \`name="first_name"\` as an equivalent. Those identifiers help application code and may feed browser heuristics, but they are not the standardized declaration under test. Likewise, \`type="email"\` provides input behavior and validation, while \`autocomplete="email"\` exposes the completion purpose. Test both without allowing one to conceal the absence of the other.

The keywords \`on\` and \`off\` also do not identify a specific purpose. A page-wide rule requiring “some autocomplete attribute” can therefore pass while providing no usable personal-information meaning. Preserve null, empty, on, off, and detailed token values as separate audit results.

## Build a known-good reference form

A small complete fixture helps validate test code before running it against a complex application. Save this page as \`reference-form.html\`. It includes visible labels, suitable input types, a grouped shipping address, password creation, and a one-time code.

\`\`\`html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Accessible account form</title>
  </head>
  <body>
    <main>
      <h1>Create an account</h1>
      <form action="/register" method="post">
        <label for="given">Given name</label>
        <input id="given" name="given" autocomplete="given-name">

        <label for="family">Family name</label>
        <input id="family" name="family" autocomplete="family-name">

        <label for="email">Email address</label>
        <input id="email" name="email" type="email" autocomplete="email">

        <label for="password">Create password</label>
        <input id="password" name="password" type="password" autocomplete="new-password">

        <label for="address">Shipping address</label>
        <textarea id="address" name="address" autocomplete="shipping street-address"></textarea>

        <label for="postal">Shipping postal code</label>
        <input id="postal" name="postal" autocomplete="shipping postal-code">

        <label for="code">Verification code</label>
        <input id="code" name="code" inputmode="numeric" autocomplete="one-time-code">

        <button type="submit">Create account</button>
      </form>
    </main>
  </body>
</html>
\`\`\`

The numeric input mode is a keyboard hint, not a semantic replacement for \`one-time-code\`. The page also uses a textarea for the full street address because autocomplete applies beyond ordinary text inputs. Hidden controls require special review because the on and off keywords are not used the same way as detailed token lists.

Use this fixture to prove that an audit finds no issues, then create one mutation at a time: remove the email attribute, misspell given-name, swap shipping for billing, change new-password to current-password, and reverse token order. Each mutation should produce one understandable failure.

## Inventory the rendered controls

Searching source templates misses wrappers, conditional branches, server rendering differences, and props that never reach the DOM. This browser-console script inventories actual controls, labels, and authored attribute values. It is complete and does not declare non-applicable fields to be failures.

\`\`\`js
const controls = Array.from(document.querySelectorAll('input, select, textarea'));
const rows = controls.map((element) => {
  const labels = element.labels ? Array.from(element.labels) : [];
  return {
    element: element.tagName.toLowerCase(),
    type: element.getAttribute('type') || '',
    name: element.getAttribute('name') || '',
    label: labels.map((label) => label.textContent.trim()).join(' | '),
    autocomplete: element.getAttribute('autocomplete'),
  };
});
console.table(rows);
\`\`\`

Use \`getAttribute\` because the test is inspecting what the page authored. Export the inventory for review on complex flows, but do not collect real entered values. Run it after the initial render and after toggling every state that adds or replaces fields.

Inventory is evidence, not a conformance verdict. Compare each row with the requirements map. A missing value on a coupon input may be fine; the same result on a user's family name is not. This distinction prevents noisy blanket rules that teams eventually ignore.

## Assert exact field contracts with Playwright

Known critical fields deserve exact assertions. These tests fail when a component refactor drops an attribute or applies a valid but wrong purpose. Accessible label locators also make missing naming relationships visible, although a passing locator does not replace a full accessible-name review.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('registration fields expose the intended purposes', async ({ page }) => {
  const registrationUrl = process.env.REGISTRATION_URL;
  if (!registrationUrl) throw new Error('Set REGISTRATION_URL');

  await page.goto(registrationUrl);
  const expectations = [
    ['Given name', 'given-name'],
    ['Family name', 'family-name'],
    ['Email address', 'email'],
    ['Create password', 'new-password'],
    ['Shipping address', 'shipping street-address'],
    ['Shipping postal code', 'shipping postal-code'],
    ['Verification code', 'one-time-code'],
  ];

  for (const [name, autocomplete] of expectations) {
    await expect(page.getByLabel(name, { exact: true })).toHaveAttribute(
      'autocomplete',
      autocomplete,
    );
  }
});
\`\`\`

Do not weaken a shipping assertion to “contains postal-code.” The grouping difference is precisely what the test protects. If design intentionally adds named sections, update the requirement and expected complete sequence together.

Autocomplete does not establish keyboard navigation. A form can expose perfect purposes while focus jumps unpredictably after an error. Use the [accessibility testing focus order guide](/blog/accessibility-testing-focus-order-guide) for sequential navigation, dialogs, error summaries, and inserted controls.

## Add a bounded token-policy audit

Exact page contracts cover known fields. A smaller generic audit catches typos on newly added controls. Do not claim to reimplement the entire HTML algorithm. Maintain a reviewed application subset, allow supported prefixes, and send unknown values to human review.

\`\`\`js
function auditAutocomplete(root = document) {
  const fields = new Set([
    'name', 'given-name', 'family-name', 'email', 'tel',
    'street-address', 'address-line1', 'address-line2',
    'address-level1', 'address-level2', 'postal-code',
    'country', 'country-name', 'current-password',
    'new-password', 'one-time-code', 'cc-name', 'cc-number',
    'cc-exp', 'cc-csc', 'organization', 'username',
    'impp', 'tel-country-code', 'tel-national', 'tel-area-code',
    'tel-local', 'tel-extension',
  ]);
  const contacts = new Set(['home', 'work', 'mobile', 'fax', 'pager']);
  const problems = [];

  for (const control of root.querySelectorAll('input, select, textarea')) {
    const raw = control.getAttribute('autocomplete');
    if (raw === null || raw === '' || raw === 'on' || raw === 'off') continue;
    const tokens = raw.trim().toLowerCase().split(/\\s+/);
    let index = 0;
    if (tokens[index]?.startsWith('section-')) index += 1;
    if (tokens[index] === 'shipping' || tokens[index] === 'billing') index += 1;
    let contact = null;
    if (contacts.has(tokens[index])) {
      contact = tokens[index];
      index += 1;
    }
    const field = tokens[index];
    index += 1;
    if (tokens[index] === 'webauthn') index += 1;
    // A contact qualifier is only legal in front of email, impp, tel, or tel-*.
    const contactAllowed =
      field === 'email' || field === 'impp' || field === 'tel' || field?.startsWith('tel-');
    if (!fields.has(field) || index !== tokens.length || (contact && !contactAllowed)) {
      problems.push({ name: control.getAttribute('name'), value: raw });
    }
  }
  return problems;
}

console.table(auditAutocomplete());
\`\`\`

An empty result means only that non-empty detailed values match this policy subset. It does not decide which controls need purposes or whether a valid value is contextually right. Pair it with exact field expectations and the reviewed applicability inventory.

If a new standardized purpose enters the product, the allowlist should trigger a review before expansion. Silent acceptance of every whitespace-separated string defeats the purpose. Silent rejection of a valid new requirement is also wrong, so diagnostics should name the control and unexpected value.

## Separate billing, shipping, and repeated people

Checkout and travel forms expose the hardest grouping problems. The same purpose may occur several times. Test with different values for shipping and billing, and with cardholder details that differ from the account holder. Identical synthetic data can make swapped groups look correct.

| Scenario | Regression to detect | Primary assertion |
|---|---|---|
| shipping equals billing | stale hidden billing controls submit | active controls and request body |
| separate addresses | both postal fields share one purpose | exact grouping sequences |
| saved card plus new card | hidden new-card form remains active | visibility, focus, and submission |
| two travelers | deleting first overwrites second | stable named sections and values |
| country change | stale address controls remain in DOM | locale-specific inventory |

Named sections are valuable when repeated groups would otherwise share purpose sequences. Keep section identifiers stable across rerenders. Random values generated on every render can break associations and produce noisy tests. They identify groups; they are not visible labels.

This test toggles a second address and proves both contracts remain distinct:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('checkout keeps shipping and billing purposes distinct', async ({ page }) => {
  const checkoutUrl = process.env.CHECKOUT_URL;
  if (!checkoutUrl) throw new Error('Set CHECKOUT_URL');

  await page.goto(checkoutUrl);
  const shipping = page.getByLabel('Shipping postal code', { exact: true });
  await expect(shipping).toHaveAttribute(
    'autocomplete',
    'section-delivery shipping postal-code',
  );

  await page.getByRole('checkbox', { name: 'Billing address is different' }).check();
  const billing = page.getByLabel('Billing postal code', { exact: true });
  await expect(billing).toHaveAttribute(
    'autocomplete',
    'section-invoice billing postal-code',
  );
  await expect(shipping).toHaveAttribute(
    'autocomplete',
    'section-delivery shipping postal-code',
  );
});
\`\`\`

Add removal and re-addition for repeatable groups. Frameworks using array indexes as component keys may show the second person's visible values in controls that still carry the first person's internal association. Verify serialized submission as well as DOM attributes.

## Test localized and dynamically rebuilt forms

Purpose tokens are language-independent, while labels and address structures change. A translated postal label still uses \`postal-code\`, but the form may replace a region selector with a text field, reorder names, or omit inapplicable components. Build a locale matrix from genuinely different form shapes rather than testing translations that render the same controls.

For each representative locale, record rendered fields, accessible names, expected purpose sequences, required status, and serialized keys. Change the country after entering data, then verify which values migrate, which clear by policy, and which controls disappear. A correct initial form can fail after dynamic replacement because a wrapper reuses stale props.

Inspect server-rendered markup before hydration and the DOM after hydration. If autocomplete disappears only after hydration, investigate client prop forwarding. If absent in both, inspect the shared schema. Repeat the inventory after validation errors because server responses may rebuild a form and accidentally drop semantics.

Error handling must preserve more than attributes. Entered values, labels, descriptions, error association, focus handling, and exact purposes should remain coherent. Users should not lose accessible completion after one invalid submission.

## Distinguish real autofill from programmatic filling

Automation can deterministically test markup and ordinary value handling. Saved-profile autofill is controlled partly by the browser, operating system, user settings, history, and consent prompts. Use synthetic profiles in planned manual sessions on the supported browser set.

Observe which group fills, whether unrelated groups remain unchanged, whether framework state receives the values, whether floating labels obscure text, and whether submission contains the visible data. Cover keyboard-only completion, zoom, mobile viewport, and browser password management. Record browser build, OS, profile setup, locale, and exact steps.

| Manual check | Expected result | Likely defect when it fails |
|---|---|---|
| choose stored address | only intended group fills | missing section or grouping token |
| choose saved sign-in | username and current password pair | wrong password purpose |
| create a credential | generator offered where supported | field marked current password |
| autofill then submit | visible values reach application state | event or serialization bug |
| zoom and reflow | values remain visible and editable | label overlay or fixed height |

Do not use a Playwright \`fill()\` call as proof of saved-profile behavior. It remains excellent for verifying state and submission after values enter controls. Keep the manual browser step small and evidence-driven.

## Diagnose the markup-passes, submission-fails defect

A realistic failure looks like this: the exact token tests pass, a browser fills address values, the user sees city and postal code, but submission says both are missing. The defect is now beyond purpose identification.

Inspect the DOM values immediately after fill, then the framework state through supported development diagnostics, followed by the redacted request body. If the DOM has values but the request omits them, state synchronization or serialization is broken. If values disappear on blur, a formatter or validator may overwrite them. If only conditionally mounted fields fail, rerendering may replace controls after completion.

Do not “fix” the problem with \`autocomplete="off"\`. That removes a user benefit and conceals the application defect. Add an integration regression for value handling and retain a manual saved-profile check because synthetic programmatic events do not perfectly reproduce browser behavior.

The [complete 2026 guide to JavaScript testing frameworks](/blog/javascript-testing-frameworks-complete-guide-2026) helps decide which field-schema logic belongs in fast tests and which completion flows require a browser.

## Review privacy and secure the evidence

Autocomplete discussions often raise privacy concerns on shared devices. Resolve them through threat modeling rather than a blanket ban. Identify reusable secrets, temporary codes, payment information, identity data, and application-specific answers. Use an accurate supported purpose, keep secrets out of logs and analytics, and rely on authentication, authorization, transport, and session design for security.

Browser traces can capture synthetic names, addresses, credentials, DOM snapshots, and request bodies. Use unmistakably fake profiles, restrict artifact access, set retention, and verify redaction with an intentionally failing test. Never seed real customer information into a shared browser profile.

When someone requests \`off\`, ask which threat it mitigates. The hint cannot stop page scripts from reading a value, secure a compromised device, or replace password purpose semantics. Narrower controls such as telemetry exclusion, suitable response caching policy, short sessions, and protected artifact storage address actual risks without needlessly increasing manual entry.

## Keep focused checks in CI

Place exact purpose assertions close to specialized email, password, address, and payment components, then run page-level tests for composition and dynamic behavior. Test rendered HTML, not only component props. A wrapper may accept \`autoComplete\` and never forward it.

Use focused assertions instead of whole-page snapshots. Broad snapshots invite approval without noticing one attribute. If a generated form requires an inventory snapshot, normalize ordering, exclude volatile values, and require accessibility review for changes.

\`\`\`bash
set -eu
: "\${REGISTRATION_URL:?REGISTRATION_URL is required}"
: "\${CHECKOUT_URL:?CHECKOUT_URL is required}"

npx playwright test tests/autocomplete-registration.spec.ts tests/autocomplete-checkout.spec.ts
\`\`\`

A pull-request checklist should ask four separate questions: Does the control collect information about the user? Does a standardized purpose apply? Is the exact sequence correct in every rendered state? Has the supported saved-profile experience been smoke-tested when this flow changed? Those questions prevent both noisy over-reporting and meaningful omissions.

## Exercise credential and verification journeys separately

Credential forms need journey-specific expectations because visually similar password controls represent different purposes. On sign-in, an existing account identifier typically pairs with \`current-password\`. Registration and a change-password form's replacement secret use \`new-password\`. A change form may contain both current and new controls, so a page-wide default is guaranteed to be wrong for at least one field. Password confirmation normally uses the same new-password purpose because it repeats the new credential rather than representing a third kind of secret.

Build a matrix for sign-in, registration, password change, password reset, account recovery, and step-up authentication. Record the exact username or email purpose, password purpose, one-time-code purpose, field order, and expected password-manager interaction. Test navigation between journeys, because single-page applications may reuse a component and retain an old prop when the route changes. A reset page copied from sign-in often ships with current-password on the new secret.

Verification codes deserve their own state tests. Confirm that \`one-time-code\` is on the code entry field, not on the destination phone number or an unrelated recovery code. Paste and manual typing should both work. If the interface renders six separate one-character boxes, inspect whether there is one meaningful form control or six controls with confusing duplicate purposes. Verify accessible naming, focus movement, correction, expiration, resend, and submission in addition to completion semantics.

Do not infer security from whether the browser offers a credential. A password manager can decline to fill correct markup because of profile state or user choice, and it can heuristically fill imperfect markup. The deterministic assertion remains the authored purpose. Manual behavior checks answer a separate compatibility question.

Capture network and trace evidence carefully in these journeys. Test passwords and verification codes should be synthetic, short-lived, and scoped to a dedicated tenant. Redact request bodies and screenshots according to policy. An accessibility regression test should never turn a temporary credential into a durable CI artifact.

When a credential test fails, locate the boundary. If the attribute is wrong in server HTML, inspect the template or field schema. If hydration changes it, inspect component props. If markup remains right but the password manager behaves unexpectedly, reproduce with a clean synthetic profile and supported browser before changing semantics. If visible values submit incorrectly, investigate application state and serialization.

## Make the design system carry purpose safely

A design system can prevent many regressions, but only if its API makes semantic decisions visible. Generic text controls should forward the native autocomplete value unchanged. Specialized components for email, existing password, new password, address, telephone, and payment fields can provide reviewed defaults while allowing documented grouping and section context.

Avoid a Boolean prop such as \`allowAutofill\`. It reduces a rich semantic vocabulary to on or off and encourages developers to skip the actual purpose. Prefer a typed or validated purpose property whose rendered result remains ordinary HTML. For address components, accept section and grouping context separately only if the component assembles tokens in the standard order and tests every combination it permits.

Component tests should render the actual control and inspect its attribute. Testing that a wrapper received \`autoComplete\` does not prove it forwarded the value. Cover disabled, read-only, error, loading, mobile, and server-rendered variants. A refactor may spread props onto one branch while a password-visibility branch creates a new input without them.

Add negative design-system tests for mistakes the API promises to prevent. Reject or report misspelled field purposes, incompatible grouping, empty section identifiers, and ordering errors. Keep native escape hatches for future standardized tokens, but route their use through review instead of coercing them to an older allowlist.

Document each specialized field with the business meaning, rendered markup, and a working form example. Developers need to know that “password” is not one reusable component mode and that billing versus shipping is not cosmetic. Short examples attached to the component are more likely to be followed than a distant compliance checklist.

When migrating a large product, inventory rendered controls before and after adopting the design system. Compare exact accessible names, autocomplete values, types, required states, and submission keys. A migration can improve tokens while breaking label association or value serialization. Treat the change as a form contract migration, not a styling replacement.

Finally, assign ownership for the semantic defaults. Browser behavior and standards evolve, product forms gain new purposes, and teams add locales. A reviewed design-system release should list autocomplete changes prominently because one default can affect hundreds of fields. Page-level exact assertions remain necessary to catch context errors that no component can infer by itself.

## Frequently Asked Questions

### Does a visible label remove the need for autocomplete?

No. A label identifies a control for users, while the autocomplete value exposes a standardized purpose to software. Both matter and solve different problems. An email input can have an excellent label and still lack the completion purpose. Conversely, adding \`autocomplete="email"\` does not repair an unlabeled control. Test accessible naming, field instructions, validation, and exact purpose metadata as separate requirements instead of allowing one passing feature to stand in for the others.

### Should every form control have an autocomplete attribute?

No. The WCAG criterion applies when a control collects information about the user and its purpose belongs to the supported input-purpose taxonomy. Search queries, coupon codes, free-form comments, and domain-specific identifiers may not have a matching value. Begin with a requirements inventory rather than enforcing a blanket rule. Where an appropriate token exists, apply it accurately. Where none exists, retain clear labels, instructions, input types, validation, and all other applicable semantics.

### Is autocomplete off a reliable security control?

No. It is a user-agent hint, not an authorization, secrecy, or transport boundary. Browsers and password managers may choose behavior that protects user needs. Applying it broadly can create an accessibility barrier without fixing the threat. Secure sensitive workflows through correct input purposes, session controls, application security, telemetry exclusion, and protected test artifacts. If off is proposed, document the precise risk and verify whether it actually changes that risk in supported browsers.

### Can automated tests prove browser autofill works?

They can prove the rendered purpose contract and application value handling very well, but saved-profile completion also depends on browser settings, operating system integration, stored history, and consent. Keep exact DOM assertions in CI, add integration tests for submission, and perform planned manual checks using synthetic profiles on supported browsers. When behavior fails, record the environment and distinguish incorrect markup from framework state synchronization. That separation produces an actionable defect instead of a vague “autofill broken” report.
`,
};
