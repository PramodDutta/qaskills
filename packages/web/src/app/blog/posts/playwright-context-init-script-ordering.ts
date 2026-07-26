import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Context Init Script Ordering',
  description:
    'playwright context init script ordering: make multiple context init scripts deterministic. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright context init script ordering',
  keywords: [
    'playwright context init script ordering',
    'browsercontext addinitscript order',
    'playwright init script race',
    'combine browser setup scripts',
    'mock browser api before load',
    'playwright deterministic init script',
    'context versus page init script',
  ],
  relatedSlugs: [
    'playwright-page-evaluate-complete-guide',
    'playwright-closed-shadow-root-testing-workarounds',
    'playwright-browser-context-guide-2026',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/api/class-browsercontext#browser-context-add-init-script',
    'https://playwright.dev/docs/mock-browser-apis',
    'https://playwright.dev/docs/api/class-page#page-add-init-script',
  ],
  repoEvidence: [
    'seed-skills/playwright-page-evaluate/SKILL.md',
    'packages/web/src/app/blog/posts/playwright-closed-shadow-root-testing-workarounds.ts',
  ],
  content: `Playwright context init script ordering is stable only when linked setup lives inside one init block or separate init blocks are safe in any order and safe to rerun. Playwright runs them before page scripts, but it does not define relative order among multiple context and page scripts. Test both script orders and assert one browser-visible result.

## What Does Playwright Context Init Script Ordering Control?

Playwright context init script ordering concerns setup registered before app JavaScript runs. A context init block applies when pages or child frames are created or navigated inside that browser context.

The timing boundary is useful for seeding random values, adding browser API mocks, or setting safe test globals. App code should see the prepared surface from its first script.

The official [BrowserContext addInitScript reference](https://playwright.dev/docs/api/class-browsercontext#browser-context-add-init-script) says evaluation occurs after document creation but before page scripts. It also states that order among multiple context and page init scripts is not defined.

That warning means setup sequence is not a run contract. Code cannot assume the first awaited \`addInitScript\` callback always runs before the second callback in each new document.

One joined callback can define an inner sequence because plain statements inside that function run in code order. Separate callbacks must work with either run order.

Context scope does not mean one run for the whole test. The init block runs in each new document, including page loads and newly attached or moved child frames.

Playwright context init script ordering does not replace app flags, server data, network mocks, or checks after load. Use setup only for browser state that must exist before app scripts.

A clear result records the script set, planned links, context or page scope, page target, run marks, final globals, frame name, repeat count, and browser project. Avoid saving secret setup in test globals.

## How Does BrowserContext Addinitscript Order Work?

BrowserContext addinitscript order starts when Node-side test code adds one or more callbacks to a context. Playwright stores those scripts and runs them in new documents before page-owned scripts.

Awaiting setup confirms Playwright took the script. It does not set a supported order with another init block added before or after it.

The same warning covers mixing \`browserContext.addInitScript\` with \`page.addInitScript\`. A page-specific callback cannot safely depend on a context callback having already initialized a global.

Safe reruns matter because a page can load more than once. Running the init block again should make the same state instead of adding hooks, wrapping methods twice, or copying marks.

One run can show which callbacks seem to run first in one browser session. A check proves that each supported order makes the same required app state.

Playwright context init script ordering should be planned, not guessed. Join real links and make all other scripts safe in any order.

## Playwright Init Script Race: Repository Evidence

The Playwright init script race boundary appears in \`seed-skills/playwright-page-evaluate/SKILL.md\`. Its addInitScript example replaces \`Math.random\` before navigation so page code receives a controlled value.

That skill also says installation must happen before \`page.goto\`. Registering after navigation cannot retroactively change scripts that the loaded document already executed.

The skill warns that addInitScript performs setup, not assertions. Tests should read final state through \`page.evaluate\` or a user-visible locator after the page loads.

The repository article \`packages/web/src/app/blog/posts/playwright-closed-shadow-root-testing-workarounds.ts\` uses a page init block to patch \`Element.prototype.attachShadow\` before a web part makes a closed root. That patch stands on its own and saves the old method inside one callback. The article states that the order of many init blocks is not a contract and calls for stand-alone setup.

Both evidence files use setup for a before-load need. Neither asks one callback to read a global made by another callback.

Use the [page evaluate guide](/blog/playwright-page-evaluate-complete-guide) to read final browser state with care. Keep handles, copied values, and page-versus-test run bounds clear.

Playwright context init script ordering should preserve those repository patterns. A new mock may share the same context, but it must not introduce hidden callback dependencies.

## When Should QA Teams Use Combine Browser Setup Scripts?

Combine browser setup scripts when one step truly depends on another, such as creating configuration before installing a function that reads it. One callback makes that sequence explicit.

Composition is also appropriate when several changes form one atomic mock contract. A reviewer can inspect initialization, patching, and marker creation together.

Do not combine unrelated mocks merely to reduce call count. Large initializer functions become difficult to own, remove, and test across independent feature suites.

Separate scripts are safe when each initializes its own namespace, tolerates missing shared objects, and reaches the same state after repeated execution. Their effects should commute when order changes.

The official [browser API mocking guide](https://playwright.dev/docs/mock-browser-apis) demonstrates installing a controlled API before navigation. Follow the consumed application surface rather than building a larger fake browser.

Use network routing when the contract is an HTTP response, context options when Playwright supports the capability directly, and server fixtures when state belongs on the backend. Init scripts are not a universal mocking layer.

The [BrowserContext guide](/blog/playwright-browser-context-guide-2026) helps choose scope and isolation. Context initialization suits setup needed by every page in one isolated test identity.

Use page initialization for one page whose setup should not affect sibling pages. Even then, do not rely on page setup executing after or before a separate context initializer.

Playwright context init script ordering favors composition for dependencies and separation for independent ownership. The decision should be documented in a small dependency graph before implementation.

## Mock Browser API Before Load: Failure Modes and Diagnostics

Mock browser API before load failures often begin when one callback reads a global another callback may not have created. The result can vary by engine, frame, navigation, or runner version.

Another race starts when registration occurs after \`goto\`. The application captures the native API during startup, while the later mock changes only subsequent reads.

Async work inside an initializer can finish after application code. Avoid timers, network requests, and detached promises when the required state must exist at first script execution.

Repeated wrapping is a common idempotence defect. A navigation runs the patch again, producing nested wrappers, duplicated events, or altered \`this\` behavior.

Frames reveal scope errors. A context initializer reaches child-frame documents, while a page initializer applies to child frames attached or navigated within that page; assertions should identify the frame they inspect.

The [closed Shadow DOM workaround](/blog/playwright-closed-shadow-root-testing-workarounds) shows why early patching can be necessary. Treat that workaround as a narrow test-build technique, not a reason to change production encapsulation.

Environment variance may expose a race more often without causing it. The test defect is the undocumented dependency, while a product defect exists only when normal unmodified browser behavior violates requirements.

Playwright context init script ordering diagnostics should record callback markers and final state across fresh contexts. One passing order in one reused page is weak evidence.

## Playwright Deterministic Init Script: Evidence and CI Assertions

A Playwright deterministic init script test should create fresh contexts repeatedly and vary registration order deliberately. Each run then navigates to the same controlled fixture and reads the same final contract.

For composed dependencies, assert the configuration and dependent function agree. The function should return the configured seed from the first application script onward.

For independent scripts, register A then B on one run and B then A on the next. Compare a normalized final object rather than the incidental order of marker insertion.

Add a second navigation in each context. The same final object after reload proves the scripts are idempotent and do not accumulate wrappers or handlers.

Include a child-frame fixture when context-wide scope matters. Record top-frame and child-frame markers separately so coverage is not inferred from one document.

Run under Chromium, Firefox, and WebKit if all are supported release targets. Do not assert that their incidental execution sequences match each other.

CI evidence should contain script IDs, registration order, dependency graph, page and context scope, navigation count, execution markers, normalized globals, browser project, and repeat results. Redact any injected environment values.

Use the [Playwright testing practices guide](/blog/playwright-testing-best-practices-2026) to keep fixtures and outcomes focused. A tiny local HTML page is better than a remote site for ordering controls.

Playwright context init script ordering passes when every tested permutation and navigation reaches one contract. It fails when final state depends on registration order, frame timing, or previous documents.

## Context Versus Page Init Script Comparison Table

Context versus page init script selection should follow required scope and ownership. Neither choice provides ordering guarantees relative to other registered initializers.

| Option or signal | Use when | Expected evidence | Main risk |
| --- | --- | --- | --- |
| Single composed script | Setup steps have a real dependency and one owner | Internal sequence, inputs, markers, final state, and reload result | The callback grows beyond one test concern |
| Independent scripts | Effects can run in any order and repeat safely | All permutations, normalized state, frames, and repeat results | A hidden shared global creates a race |
| Context init script | Every page and frame in one context needs the setup | Context identity, pages, frames, navigations, and final state | Unrelated pages receive the mock |
| Page init script | Only one page and its child frames need the setup | Page identity, frame coverage, navigation, and final state | Sibling pages use a different browser surface |

Composition provides ordering only inside its callback. Registering two composed callbacks still leaves their relative order undefined.

Independent scripts need separate namespaces or safe merge logic. Their final state should be equal after A-B, B-A, and repeated execution.

Context scope is convenient for multi-page flows, but broad patches can affect authentication popups or unrelated helper pages. Keep the context dedicated to the test concern.

Page scope reduces reach while preserving before-load timing for that page. Register before its first navigation, not after the product has already read the native API.

The [QASkills directory](/skills) offers browser and evaluation workflows. Review any injected code for scope, secrets, cleanup, and alignment with the application contract.

Playwright context init script ordering should choose the narrowest scope that covers every required document. Scope and sequence are separate design decisions.

## How Do You Implement Playwright Context Init Script Ordering?

Implement Playwright context init script ordering by drawing dependencies first, composing dependent work, and permutation-testing independent work. Use fresh contexts and a controlled fixture page.

1. Read \`seed-skills/playwright-page-evaluate/SKILL.md\` and \`packages/web/src/app/blog/posts/playwright-closed-shadow-root-testing-workarounds.ts\`, then list every initializer and consumed global.
2. Draw directed dependencies, combine each dependent chain inside one callback, and give unrelated scripts separate namespaces with idempotent merge rules.
3. Register context setup before creating or navigating pages, and register page-only setup before that page's first navigation.
4. Create fresh contexts for A-B, B-A, reload, and child-frame controls, then compare normalized browser-visible state across every run.
5. Reproduce a broken callback that assumes another global exists, and require the permutation test to expose its order-sensitive result.
6. Run all supported browser projects in CI, retaining registration set, dependency graph, markers, globals, frame scope, navigation count, and repeat outcomes.

The first example keeps a true dependency inside one function. Configuration is created before the controlled function reads it, regardless of other initializers.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('composes dependent browser setup', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(({ seed }) => {
    const target = globalThis as typeof globalThis & {
      qaConfig?: { seed: number };
      qaRandom?: () => number;
    };

    target.qaConfig = { seed };
    target.qaRandom = () => target.qaConfig!.seed;
  }, { seed: 7 });

  const page = await context.newPage();
  await page.setContent('<script>globalThis.observedSeed = globalThis.qaRandom()</script>');
  await expect.poll(() => page.evaluate(() => globalThis.observedSeed)).toBe(7);
  await context.close({ reason: 'completed init script ordering control' });
});
\`\`\`

In project code, declare test-only globals in a TypeScript ambient type rather than relying on inferred properties. Keep the fixture isolated so production pages never receive a diagnostic global by mistake.

The second example registers independent scripts in both orders. Each callback initializes the shared container defensively and owns a different key.

\`\`\`typescript
import { expect, test } from '@playwright/test';

for (const order of [['feature', 'clock'], ['clock', 'feature']] as const) {
  test(\`independent scripts survive \${order.join('-')}\`, async ({ browser }) => {
    const context = await browser.newContext();

    for (const script of order) {
      if (script === 'feature') {
        await context.addInitScript(() => {
          globalThis.qaState = { ...globalThis.qaState, feature: 'treatment' };
        });
      } else {
        await context.addInitScript(() => {
          globalThis.qaState = { ...globalThis.qaState, clock: 1_750_000_000 };
        });
      }
    }

    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/init-script-fixture.html');
    await expect.poll(() => page.evaluate(() => globalThis.qaState)).toEqual({
      clock: 1_750_000_000,
      feature: 'treatment',
    });

    await page.reload();
    await expect.poll(() => page.evaluate(() => globalThis.qaState)).toEqual({
      clock: 1_750_000_000,
      feature: 'treatment',
    });
    await context.close({ reason: 'completed permutation control' });
  });
}
\`\`\`

Add a test-only global declaration and serve the fixture from the repository's local test server. The object spread works when \`qaState\` is undefined and remains stable across repeated document initialization.

The controlled failure removes that defensive merge and reads a required property from another script. At least one permutation must fail, proving the test detects a hidden dependency.

Use the official [Page addInitScript reference](https://playwright.dev/docs/api/class-page#page-add-init-script) when narrowing scope to one page. Keep its registration out of any ordering assumption with context scripts.

Open the [Playwright CLI skill](/skills/Pramod/playwright-cli) for interactive pre-load exploration when needed. Move stable setup into committed tests once the required mock and assertion are understood.

Playwright context init script ordering should fail review when callbacks share undocumented globals, start background work, register after navigation, or lack permutation and reload controls. That strict review rule keeps hidden order from reaching the main suite.

### A before-load setup card

Start the card with the one page rule that needs code before load, for one known and owned test case. Name the user view or app task that proves the rule in the same small page run.

List each init block with a short ID and one clear owner, plus the file where its test code lives. Do not use file order or line order as its ID, since both can change in a safe edit.

For each block, write what it reads and what it will set in a two-column map for the review. A read of another test global is a link that needs care and a clear plan for its order.

Draw an arrow when one block must run after work from another block, with the read and set names on each end. Put both sides in one block when that arrow is real and the same test owner can keep them close.

Keep code with no arrows in small blocks that can run in any order, on each page where they are in scope. Each block should reach the same state if it runs twice in a new document or after a page reload.

Mark whether the block sits on the context or just one page, with a short cause for that scope choice. This shows which new tabs and child frames should get the change and which sibling pages must stay plain.

Register all needed blocks before the first page visit in the case, while no app script has had a chance to run. A late block cannot change app code that has run or fix the first value that the app saved.

Write the page URL and frame name for each final check on one row of the kept result card. This keeps proof from the top frame apart from proof in a child when both pages show much the same text.

Use one local page with a short script as the main test bed, so its first read and shown result stay clear. A live site can add load noise that hides the test race and can change for a cause outside the test.

Make the page save what it saw in its first app script, before later hooks or page work can change the view. Reading much later may miss a bad value that was fixed by chance and leave a false green end state.

Run A then B in a new context and keep the shown end state, first-read mark, and source IDs on one row. Close that context before the next order begins so no page, hook, or global can cross into the next case.

Run B then A in a second new context with the same page, data, browser, and first-read test rule. The two end states must match after safe sort and shape rules that do not hide a missing key or bad value.

Visit the page once more in each context to test a new document, while the same set of blocks stays in force. A sound block should not wrap a method twice after reload or add one more hook for the same app event.

Add one child frame when the rule claims all frames get the setup, and give that frame its own safe name. Save its marks on a new row and check them on their own rather than inferring frame state from the top page.

Open a second page when context scope is the point of the test, then run the same first-read check on both pages. Both pages should see the same mock with no shared app state leak or need for one page to load first.

For page scope, open a sibling page with no page block and run the plain first-read check on that page. Its plain state proves the mock did not reach too far or change work that belongs to another test concern.

Keep all input values small, fake, and safe for a test log, with each unit and use named near its value. Do not place an API key or live user fact in the page world, source, trace, or saved result card.

Use one fixed seed when a random call is under test, then give that seed a short safe name in the report. Save the seed and the first shown result, not a long stream of values that adds noise but no new proof.

When time is mocked, keep the unit and zone next to the value, along with the one app rule it should drive. A raw large number with no unit can hide a bad clock and send a peer down the wrong path.

When a method is wrapped, save the old method once in that same block before the new function is put in place. Call it with the right \`this\` and pass all args through, unless the test rule names one planned and checked change.

Do not start a fetch, timer, or loose promise in the init block when the app needs the result on its first read. The app may run before that work ends and see half-made state that comes and goes with host speed.

Keep event hooks safe to add more than once or guard them by a mark that is owned by the same block. A reload must not cause two calls for one app event or leave two rows where the rule expects one.

Use the [page evaluate guide](/blog/playwright-page-evaluate-complete-guide) to read the small end state after the first app script has saved it. Keep test values in plain JSON when that is enough, and avoid a live handle when no later page work needs one.

Use the [closed root guide](/blog/playwright-closed-shadow-root-testing-workarounds) when a patch must run before a web part is made on the test page. Keep that patch in its own narrow test build with a clear owner, end state, and no claim about a normal prod root.

Use the [context guide](/blog/playwright-browser-context-guide-2026) to pick the right scope for new tabs, frames, and role-based page flows. A broad mock can change a login pop-up by mistake and make a pass depend on test code the real user will not have.

Use the [test practices guide](/blog/playwright-testing-best-practices-2026) to keep the final check tied to what users see in the owned app flow. A global mark alone is just a setup clue, so pair it with one plain view or app result.

Break the A block so it reads B state with no safe base value, then run both orders in fresh contexts as before. At least one order must turn red in this planned bad case and point to the first wrong read on its row.

Move one block after the page visit in a second bad case, while the fixture saves the value seen at first load. The first app script should keep the old value and make the check fail even if a much later read sees the mock.

Remove the guard from a hook and reload twice in a third bad case, with one app event sent after each new page load. A call count should show the extra hook at once and make the repeat fault clear without a large trace.

Save pass or fail for each order, page, frame, and reload row, plus one short first-wrong fact on each red row. Do not merge all rows into one broad green mark that could hide a bad frame or only one weak order.

Name the browser project on every row, but do not compare its raw run order or treat that path as a public promise. The contract is the same end state, not the same hidden path, callback list, or set of low-level run marks.

If one browser fails, read the first wrong row before opening a full trace, then rerun that one small order once. The row should point to scope, order, reload, or frame work and give the next owner a sound place to start.

Close each test-owned context after its rows are done and await the close before a new order starts on that worker. A clean next run must not share any mocked page state, open hook, pending task, or file that the old context owned.

Keep the source hash for each block with the card when code can change between runs or build jobs. This shows which exact setup made the kept result and stops a new source file from being paired with an old green card.

Ask a peer to list every arrow in the setup map from memory after a short read of the card and test. Any missed arrow is a good sign that two blocks should become one or that the map needs a much clearer name.

Approve the setup only when all safe orders reach one clear app result in each page and frame that the scope claims. A pass in the first order alone does not meet the rule, even when that order has passed many times before.

## Frequently Asked Questions

### What is the safest way to use browsercontext addinitscript order?

Assume no relative order among separate context or page initializers. Put dependent statements inside one callback, and make remaining scripts independent, idempotent, and safe under repetition. Register before navigation, test both registration permutations in fresh contexts, and compare normalized final browser state rather than incidental execution markers.

### How do you verify playwright init script race?

Create controlled fixture pages, register scripts as A-B and B-A in fresh contexts, then repeat navigation and include a child frame. Record execution markers and final globals for each browser project. A real race exists when any supported order, frame, or reload produces a different application-visible result.

### When should a QA team choose combine browser setup scripts?

Combine scripts when configuration, patching, and dependent functions form one ordered contract with one owner. Keep unrelated mocks separate if they can run in either order. Avoid one large initializer that mixes features, network behavior, authentication, and diagnostics, because its scope and cleanup become difficult to review.

### What causes failures in mock browser api before load?

Frequent causes include registration after navigation, unresolved asynchronous work, hidden global dependencies, repeated prototype wrapping, lost property descriptors, wrong receivers, context-wide mocks affecting unrelated pages, and incomplete frame assertions. Separate normal application defects from test-only patch defects by rerunning without the initializer and preserving both outcomes.

### Which evidence should playwright deterministic init script retain?

Retain script IDs, source digest, registration order, dependency graph, serialized inputs, context or page scope, page and frame identities, navigation count, execution markers, normalized final globals, browser project, Playwright version, and repeat results. Remove tokens, private hosts, user identifiers, and other sensitive injected configuration from artifacts.

### How should CI handle context versus page init script?

CI should test the narrowest selected scope with fresh contexts, alternate registration orders, reloads, frames, and supported browsers. It should reject hidden dependencies and order-sensitive results without asserting one incidental sequence. Context setup must cover all owned pages, while page setup must prove sibling pages remain intentionally unaffected.

## Conclusion

Playwright context init script ordering becomes reliable when dependencies are composed and separate effects tolerate every order and repetition. Require a dependency graph, pre-navigation registration, fresh-context permutations, reload and frame controls, normalized final state, and redacted CI evidence before accepting the mock.

Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused verification workflow. Then browse [verified QA skills](/skills) while keeping browser initialization small, scoped, and independent of unsupported ordering assumptions.`,
};
