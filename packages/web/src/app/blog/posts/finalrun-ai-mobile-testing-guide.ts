import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'FinalRun: AI Mobile App Testing with Plain-English YAML',
  description:
    'FinalRun guide for QA teams: open-source AI-driven mobile testing CLI, YAML test syntax, Android and iOS setup, CI usage, and honest limits vs Appium and Maestro.',
  date: '2026-07-07',
  category: 'AI Testing',
  content: `
# FinalRun: AI Mobile App Testing with Plain-English YAML

Mobile test automation has always carried a heavier tax than web. Appium demands locator archaeology across two platforms; Espresso and XCUITest are first-class but platform-siloed; Maestro simplified the syntax but still binds tests to view hierarchies. FinalRun is a newer open-source entry that takes the AI-native route: an AI-driven CLI for mobile app testing where tests are plain-English steps in YAML, executed against Android and iOS apps by vision-capable models that look at the screen the way a human tester does.

The pitch is that intent survives UI change: "tap the checkout button" keeps working when the button moves, gets restyled, or its resource ID changes. This guide covers how FinalRun works, the test syntax, running it locally and in CI, and a grounded comparison against Appium and Maestro so you can decide where it fits. For the wider category context, see our overview of [AI mobile test automation](/blog/ai-mobile-test-automation-2026).

## How It Works

FinalRun sits on top of your existing device tooling: it drives Android via ADB (emulator or device) and iOS via the simulator toolchain on macOS. Each step in your YAML file goes through a perceive-decide-act loop:

1. Capture the current screen (screenshot plus available UI metadata)
2. Send the step's natural-language instruction and the screen state to a vision-capable model (you bring an API key; model choice is configurable)
3. The model returns a concrete action (tap coordinates or element, type text, swipe, wait)
4. The runner executes it and moves to the next step, recording evidence as it goes

Assertions run through the same channel: an "assert" step asks the model to verify a condition against the visible screen and fail with an explanation if it does not hold.

A representative flow file:

\`\`\`yaml
# flows/checkout.yaml
app: com.example.shop
steps:
  - launch app
  - tap "Sign in"
  - type "demo@example.com" into the email field
  - type "secret123" into the password field
  - tap the "Sign in" button
  - assert the home screen shows "Welcome back"
  - tap the first product in the featured list
  - tap "Add to cart"
  - open the cart
  - assert the cart total is "$29.00"
\`\`\`

\`\`\`bash
# run on the connected Android emulator
finalrun test flows/checkout.yaml --platform android

# run the whole folder on iOS simulator
finalrun test flows/ --platform ios --report html
\`\`\`

No page objects, no accessibility-id spelunking, no per-platform forks of the same journey: one flow file runs against both platforms as long as the UI language matches.

## What This Buys You (and What It Costs)

The wins are the ones the whole agentic-testing category promises, applied to mobile where selector pain is worst:

- **Authoring speed.** A QA engineer or PM writes a runnable smoke flow in minutes; the barrier is describing the journey, not learning a driver API.
- **Resilience to churn.** Vision plus intent tolerates redesigns that would break resource-id and XPath locators outright.
- **Cross-platform by default.** One file, both platforms, because the model adapts to each screen rather than binding to a hierarchy.

The costs are equally structural, and you should budget for them explicitly:

- **Latency and spend.** Every step is a model call with an image. A 12-step flow can take a couple of minutes and cents-per-run scale; a 300-flow regression suite priced this way needs a hard look. Mitigations: keep AI flows for smoke and journey breadth, cache stable steps where the tool supports it, and push bulk regression down the pyramid.
- **Determinism.** Same flow, same build, occasional different interpretation. Ambiguous instructions ("tap the button") invite drift; disciplined, specific phrasing ("tap the red 'Delete account' button at the bottom") keeps the pass rate honest. Treat flake tracking as a first-class metric before any AI flow gates a release.
- **Oracle risk.** A vision model asserting "the cart total is $29.00" is reading pixels; a rendering bug that shows $29.00 in the wrong currency position might still pass. For financial and data-critical assertions, back the UI check with an API-level verification.

| Dimension | FinalRun | Maestro | Appium |
|---|---|---|---|
| Test definition | Plain-English YAML | YAML with selectors | Code (any WebDriver language) |
| Element targeting | AI vision + intent | id/text/accessibility matchers | Locators (id, XPath, predicates) |
| UI-change resilience | High | Medium | Low without discipline |
| Determinism | Model-dependent | High | High |
| Per-run cost | LLM tokens per step | Free | Free |
| Ecosystem maturity | New, moving fast | Established, wide adoption | Deepest, 10+ years |
| Best at | Smoke breadth, fast authoring | Stable YAML journeys | Complex logic, device farms, grids |

## Fitting It Into a Real Pipeline

A pragmatic adoption path mirrors what worked for web agentic tools:

1. **Start with 5 to 10 smoke flows** on the money paths (login, purchase, core creation flow) against nightly builds, non-blocking.
2. **Measure the flake and cost curve for two weeks.** Promote only flows with a clean record to anything blocking.
3. **Pair with deterministic layers.** Keep unit and component tests native (JUnit/XCTest), keep your existing Maestro or Appium regression if you have one, and let FinalRun own the exploratory and breadth layer. The strategy chapter of our [mobile testing automation guide](/blog/mobile-testing-automation-guide) covers this pyramid split.
4. **CI wiring is plain CLI:** boot an emulator in the runner, install the APK or app bundle, execute \`finalrun test\`, archive the HTML report and screen recordings as artifacts. macOS runners are required for the iOS leg, same as every iOS toolchain.
5. **Control the blast radius:** dedicated test accounts, staging backends, and an env-injected API key with spend alerts on the model account.

## Verdict

FinalRun is what the first wave of AI mobile testing should look like: open source, CLI-first, CI-friendly, and honest about being a model-driven loop rather than magic. It will not replace Appium for teams with deep device-farm investments, and its per-step economics keep it out of the bulk-regression business for now. But for the chronically under-tested layer of mobile QA (the smoke journeys nobody had time to automate twice, once per platform) it converts weeks of harness work into an afternoon of YAML. Watch the determinism metrics, keep critical assertions double-checked at the API layer, and it earns a real place in the 2026 mobile stack.

## Frequently Asked Questions

### Do I need to write locators or page objects with FinalRun?

No. Steps describe intent in plain English and a vision-capable model resolves them against the live screen, so there are no resource IDs, XPaths, or page-object classes to maintain. The trade is per-step model latency and cost, plus a determinism ceiling below compiled locators.

### Does FinalRun replace Appium or Maestro?

Not wholesale. Appium keeps winning where complex logic, device farms, and grid infrastructure matter; Maestro remains excellent for stable, free, deterministic YAML journeys. FinalRun's lane is fast-authored, churn-resistant smoke and journey coverage, especially when one flow file must serve both platforms.

### Can FinalRun run in CI?

Yes, it is CLI-first: boot an emulator or simulator in the runner, install the build, execute the flow folder, archive the HTML report and recordings. Android legs run on Linux runners; iOS legs need macOS runners, exactly like the rest of the iOS toolchain.

### How do I keep AI-driven mobile tests deterministic?

Write specific steps (name the exact button text), pin a step budget, track pass rates per flow before letting anything block a release, and back money-path assertions with API-level checks so a pixel-reading model cannot wave through a data bug.
`,
};
