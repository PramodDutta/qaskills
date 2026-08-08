import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Environment jsdom vs Happy Dom: Choose by Browser Contract',
  description: 'Compare Vitest environment jsdom vs Happy Dom with compatibility probes, dual-run migration, performance measurement, and rules for escalating to real browsers.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Vitest Environment jsdom vs Happy Dom: Choose by Browser Contract

The right choice in the Vitest environment jsdom vs Happy Dom decision depends on the browser contract your tests exercise. Choose jsdom when its broader web-platform compatibility matches the APIs your components use. Evaluate Happy DOM when faster simulated DOM execution could materially improve your suite and its supported behavior covers your needs. Neither environment is a real browser, so layout, styling, focus, native events, and critical integrations still require browser-level tests.

Do not decide from a generic benchmark or a feature checklist copied from an old comparison. Install both against the same lockfile, run a representative slice, add explicit compatibility probes for the APIs your application needs, and compare failures before measuring speed. Vitest’s own environment guide describes Happy DOM as generally faster but lacking some APIs. Your repository must determine whether those missing or different behaviors matter.

A sound outcome may be mixed: Node for pure logic, one DOM emulator for most component units, and Browser Mode or Playwright for interactions that depend on an actual rendering engine. This guide builds that decision from runnable tests instead of preference.

## Start with what a Vitest environment actually changes

Vitest runs in a Node environment by default. Selecting \`jsdom\` or \`happy-dom\` supplies browser-like globals such as \`window\` and \`document\` while tests still execute in a Node-based test environment. The package implementing the DOM becomes part of your test runtime and affects parsing, events, forms, URLs, timers, and the available Web APIs.

That environment choice does not turn the test into a native browser session. There is no complete browser rendering pipeline simply because \`document.createElement\` works. CSS layout, painting, real navigation, platform accessibility behavior, and some event details remain outside the simulator’s contract.

| Runtime | Best fit | Confidence it provides | Important boundary |
|---|---|---|---|
| \`node\` | Pure functions, services, parsers | JavaScript behavior without DOM globals | Browser assumptions can be hidden if DOM is enabled unnecessarily |
| \`jsdom\` | DOM-oriented unit and integration tests | Behavior implemented by jsdom in Node | No real layout or rendering engine |
| \`happy-dom\` | DOM-oriented tests after compatibility validation | Behavior implemented by Happy DOM in Node | Some browser APIs or semantics may differ or be absent |
| Real browser project | Critical components and user flows | Native engine, events, CSS, and platform APIs | Higher startup and orchestration cost |

Use the smallest environment that truthfully represents the unit. Running server utilities under a permissive DOM emulator can hide accidental reliance on \`window\`. Running a focus-heavy widget only under Node simulation can produce false confidence.

The official environment behavior and control comments are documented at https://vitest.dev/guide/environment.html. Browser Mode’s simulation caveat is explained at https://vitest.dev/guide/browser/why.

## Inventory the browser contract your suite relies on

Before switching, scan both production code and test setup for browser APIs. Include direct global usage, framework adapters, polyfills, and dependencies initialized during import. Group each dependency by confidence needed.

| Contract area | Example dependencies | Suitable first test layer | Escalate when |
|---|---|---|---|
| DOM structure | Elements, attributes, text, templates | jsdom or Happy DOM | Parsing behavior diverges from production |
| Basic events | Click, input, submit listeners | Emulator for unit behavior | Native propagation or default action matters |
| URL state | \`URL\`, \`location\`, base URL resolution | Emulator with explicit URL | Real navigation or history integration matters |
| Layout | Dimensions, overflow, stacking, visibility | Real browser | Any assertion depends on geometry or CSS |
| Focus and accessibility | Tab order, focus management, accessible names | Emulator for narrow logic | Keyboard and assistive behavior is user-critical |
| Network and storage | Fetch, cookies, storage events | Contract mocks plus emulator | Cross-origin or browser security semantics matter |

Turn the inventory into a repository-owned compatibility file. Avoid a hundred assertions about APIs the product never uses. A short test that checks exactly what setup and components require becomes an early warning when upgrading jsdom, Happy DOM, Vitest, Node, or framework packages.

\`\`\`ts
// test/environment-contract.ts
export type Capability = {
  name: string;
  supported: () => boolean;
};

export const requiredCapabilities: Capability[] = [
  {
    name: "document.createElement",
    supported: () => typeof document.createElement === "function",
  },
  {
    name: "window.CustomEvent",
    supported: () => typeof window.CustomEvent === "function",
  },
  {
    name: "URL resolution",
    supported: () => new URL("/orders", window.location.href).pathname === "/orders",
  },
];
\`\`\`

The assertions should express application requirements, not declare one emulator universally complete.

## Establish a neutral DOM unit before comparing engines

Use a framework-neutral component to verify the basic environment wiring. The component below creates a status region, updates text after a button click, and exposes a cleanup function. It relies only on standard DOM concepts.

\`\`\`ts
// src/status-panel.ts
export function mountStatusPanel(root: HTMLElement) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Load status";

  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.textContent = "Idle";

  const onClick = () => {
    status.textContent = "Ready";
  };

  button.addEventListener("click", onClick);
  root.append(button, status);

  return {
    button,
    status,
    unmount() {
      button.removeEventListener("click", onClick);
      root.replaceChildren();
    },
  };
}
\`\`\`

The test should own its DOM and clean it after every case:

\`\`\`ts
// src/status-panel.test.ts
import { afterEach, describe, expect, it } from "vitest";
import { mountStatusPanel } from "./status-panel";

afterEach(() => {
  document.body.replaceChildren();
});

describe("status panel", () => {
  it("announces readiness after activation", () => {
    const root = document.createElement("main");
    document.body.append(root);
    const panel = mountStatusPanel(root);

    panel.button.click();

    expect(panel.status.textContent).toBe("Ready");
    expect(panel.status.getAttribute("role")).toBe("status");
    panel.unmount();
  });
});
\`\`\`

This case should behave in either emulator. It does not claim that \`button.click()\` perfectly reproduces a human click in a browser. It proves the component’s listener updates the DOM contract under the selected simulated environment.

## Select one environment at the project or file boundary

Set the default environment in Vitest configuration when most tests in a project share it:

\`\`\`ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
  },
});
\`\`\`

Change the value to \`"happy-dom"\` to evaluate Happy DOM. Both environment packages must be installed in the project when you run tests under both:

\`\`\`sh
npm install --save-dev vitest jsdom happy-dom
npx vitest run
\`\`\`

For a small exception, place a control comment at the top of the test file, before imports:

\`\`\`ts
// @vitest-environment happy-dom

import { expect, it } from "vitest";

it("provides a DOM for this file", () => {
  const element = document.createElement("div");
  element.dataset.state = "ready";
  expect(element.dataset.state).toBe("ready");
});
\`\`\`

Vitest also accepts \`// @vitest-environment jsdom\`. File annotations are useful during a migration or for a genuine exception. If dozens of files carry them permanently, separate test projects usually communicate intent better.

## Run the same contract suite in both environments

A safe migration uses parallel projects with unique names and identical shared tests. Vitest’s current Test Projects feature can define inline projects. Do not use the removed \`environmentMatchGlobs\` option from older examples.

\`\`\`ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "dom-jsdom",
          environment: "jsdom",
          include: ["src/**/*.contract.test.ts"],
        },
      },
      {
        test: {
          name: "dom-happy",
          environment: "happy-dom",
          include: ["src/**/*.contract.test.ts"],
        },
      },
    ],
  },
});
\`\`\`

Add the capability assertions to a contract test:

\`\`\`ts
// src/environment.contract.test.ts
import { describe, expect, it } from "vitest";
import { requiredCapabilities } from "../test/environment-contract";

describe("DOM environment contract", () => {
  for (const capability of requiredCapabilities) {
    it("supports " + capability.name, () => {
      expect(capability.supported()).toBe(true);
    });
  }
});
\`\`\`

Run this matrix before changing the default. A difference is not automatically a bug in either library. It is evidence that your application’s current test contract is not portable between them. Decide whether to keep the present engine, adapt production code, add a standards-based polyfill, or move that behavior to a real browser test.

## Configure URLs and environment options explicitly

Relative URL behavior, cookies, and code that reads \`window.location\` need a deliberate origin. Vitest passes options under separate environment keys. The documented Happy DOM key is \`happyDOM\` with capital \`DOM\`, while the environment name is \`happy-dom\`.

\`\`\`ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "https://app.example.test/dashboard",
      },
      happyDOM: {
        url: "https://app.example.test/dashboard",
        width: 1280,
        height: 720,
      },
    },
  },
});
\`\`\`

Options are scoped to their respective environment. Do not copy a jsdom constructor option under \`happyDOM\` and assume it has the same meaning. Consult the selected environment’s official documentation for supported options.

An explicit URL makes tests deterministic:

\`\`\`ts
import { expect, it } from "vitest";

it("resolves an account link against the configured origin", () => {
  const url = new URL("/accounts/a-17", window.location.href);
  expect(url.href).toBe("https://app.example.test/accounts/a-17");
});
\`\`\`

Avoid real production domains in unit tests when code might accidentally issue network requests. The reserved \`.test\` domain communicates that the origin is synthetic.

## Compare compatibility before speed

Begin the comparison with correctness. Run all candidate tests under both environments and classify differences. Do not immediately patch every failure with a global stub, because that can erase precisely the incompatibility the evaluation was meant to expose.

| Difference category | Diagnostic question | Likely action |
|---|---|---|
| Missing global | Does production truly require this API? | Polyfill from a maintained source, inject an adapter, or use browser tests |
| Different event result | Does the application depend on native default behavior? | Verify in a real browser before choosing |
| Different HTML output | Is the assertion testing a public contract or serializer detail? | Narrow the assertion or retain the compatible engine |
| Timing difference | Is the test awaiting an observable condition? | Remove fixed sleeps and inspect task scheduling |
| Dependency import failure | Is CSS or an asset imported through an external chain? | Follow Vitest’s documented dependency inlining guidance |

Once both candidates pass the required contract, measure performance. Use the same machine, Node runtime, lockfile, worker settings, warmup policy, and test selection. Record several full runs rather than quoting a single best time. Separate startup time from test execution if startup dominates a small suite.

The official Vitest guide calls Happy DOM faster in general, but real repositories can show a different result depending on queries, DOM size, framework behavior, and dependencies. Treat speed claims as hypotheses. Publish your commands and raw timings, and mark all projected savings as illustrative until CI confirms them.

## Diagnose an environment-switch failure without papering it over

Assume a team switches from jsdom to Happy DOM. Most files pass, but a chart component test fails with \`ReferenceError: ResizeObserver is not defined\`. The wrong response is to paste an empty class into the global setup until the test turns green. An inert observer changes the contract: callbacks never run, so the chart’s resize behavior is no longer tested.

First determine whether the failing dependency actually needs observation in this unit. If the component accepts measured dimensions through an adapter, inject a deterministic fake and test the resize decision as pure logic. If the component itself owns observer registration, create a controlled fake that records observed elements and lets the test trigger callbacks. If native observation and layout are essential, move the case to a real browser.

A small injectable boundary is explicit:

\`\`\`ts
export type SizeSource = {
  widthOf(element: Element): number;
};

export function chartColumns(element: Element, sizes: SizeSource): number {
  return sizes.widthOf(element) >= 800 ? 4 : 2;
}
\`\`\`

\`\`\`ts
import { expect, it } from "vitest";
import { chartColumns, type SizeSource } from "./chart-columns";

it("uses four columns at the wide breakpoint", () => {
  const element = document.createElement("section");
  const sizes: SizeSource = { widthOf: () => 900 };
  expect(chartColumns(element, sizes)).toBe(4);
});

it("uses two columns below the breakpoint", () => {
  const element = document.createElement("section");
  const sizes: SizeSource = { widthOf: () => 640 };
  expect(chartColumns(element, sizes)).toBe(2);
});
\`\`\`

These unit tests cover the decision, not real layout. A browser test must still prove that the adapter reports dimensions and the rendered chart responds. The failure revealed a layer boundary, which is more valuable than a silent global stub.

## Know what emulators cannot prove

Neither jsdom nor Happy DOM should be the final oracle for geometry, CSS visibility, text clipping, stacking, responsive layout, actual navigation, drag behavior, or browser security policy. They can help unit-test code around those concerns when inputs are injected, but they do not replace the platform.

Focus is another caution area. A simulator can support \`element.focus()\` and \`document.activeElement\`, yet a keyboard path also depends on native tab order, disabled states, visibility, shadow DOM, and the browser’s event sequence. Test focus-management logic cheaply in the emulator, then cover critical keyboard flows in a real browser.

What people get wrong is treating the environment choice as a fidelity contest with one permanent winner. Happy DOM can be the better unit-test engine for one application and a poor fit for another. jsdom may support a needed semantic yet still be insufficient for the user journey. The correct architecture assigns each behavior to the cheapest layer that can truthfully prove it.

## Escalate critical component behavior to a browser

Vitest Browser Mode runs tests in a native browser environment through a configured provider. It is a separate mode, not an environment value alongside \`jsdom\` and \`happy-dom\`. Use it for component behavior that depends on actual CSS, browser APIs, native event handling, focus, and accessibility interaction.

Full end-to-end tests remain valuable for navigation across pages, backend integration, authentication, and deployment wiring. The [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) help keep those tests aligned with roles, labels, and user-visible contracts instead of DOM structure.

| Test question | Recommended layer |
|---|---|
| Does a pure formatter return the expected string? | Node |
| Does clicking invoke local state logic and update text? | DOM emulator |
| Does CSS hide the panel at the actual breakpoint? | Real browser component test |
| Can a keyboard user complete the critical dialog flow? | Real browser |
| Does login work against deployed services? | End-to-end browser test |

Keep some contract overlap across layers. A small component behavior can run quickly in the emulator, while one representative browser case validates that the simulated assumptions remain connected to reality.

## Migrate in slices with a reversible decision record

Do not flip the entire repository and then fix hundreds of failures without classification. Select representative slices: simple DOM utilities, framework components, form-heavy components, timer-heavy tests, dependency-rich files, and the slowest files. Run them in dual projects and record compatibility and timing.

Use this migration sequence:

1. Pin the current lockfile and record baseline commands.
2. Add the candidate environment as a second project.
3. Run environment-contract tests in both.
4. Classify every difference before changing setup.
5. Adapt only when the new abstraction improves the production boundary.
6. Benchmark identical passing slices in controlled runs.
7. Move high-fidelity behavior to browser tests.
8. Switch one directory or project, then monitor CI flake and duration.

The broader [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) is useful when the environment change is part of a larger runner or architecture decision. Keep environment migration separate from unrelated framework rewrites so regressions have a narrow cause.

Write an architecture decision record with the APIs inventoried, incompatible cases, browser escalation rules, measured CI results, selected environment, and rollback condition. Include a review date. Emulator support evolves, so an old decision can be revisited without pretending it was wrong at the time.

## Guard AI-generated tests against environment assumptions

AI coding agents often infer jsdom because they have seen it in examples, or emit a \`@vitest-environment\` comment without checking project configuration. Give the agent the repository’s chosen layers and environment contract. Require it to use existing setup, avoid new global polyfills without justification, and identify behavior that needs a real browser.

During review, reject generated tests that mock geometry and then claim to verify responsive layout. The mock can verify a branching function, but the test name and documentation must say so. Also reject environment changes bundled into a feature test unless the feature genuinely requires them.

Ask the agent to run the exact affected project, not merely \`vitest\` from an arbitrary directory. Confirm discovery output includes the new file. If it proposes an unfamiliar configuration key, check the current official Vitest documentation rather than accepting a plausible name. Environment configuration changed across major Vitest releases, and removed options still appear in old examples.

## Frequently Asked Questions

### Is Happy DOM always faster than jsdom in Vitest?

No. Vitest describes Happy DOM as generally faster, but repository performance depends on DOM size, query patterns, framework behavior, dependencies, workers, and startup cost. Compare identical passing tests on the same machine and lockfile across multiple runs. Measure the full CI job as well as focused files. Compatibility comes first: a faster run that removes meaningful behavior or requires unrealistic global stubs is not an improvement. Treat published or local microbenchmarks as hypotheses until your representative suite confirms them.

### Can jsdom or Happy DOM replace Playwright tests?

Neither simulator replaces browser tests for behavior that depends on layout, CSS, native focus, navigation, real event semantics, or browser security rules. They are excellent for fast unit and component logic when the required DOM contract is supported. Keep critical user journeys and platform-sensitive components in a real browser through Vitest Browser Mode or an end-to-end runner such as Playwright. Overlap a few behaviors across layers so emulator assumptions are periodically checked against the actual browser.

### How can one Vitest repository use both environments?

Use unique Test Projects when groups of files need distinct configurations, or put a documented \`@vitest-environment jsdom\` or \`@vitest-environment happy-dom\` comment at the top of an exceptional file. During migration, two inline projects can run the same contract tests under both engines. Keep include patterns explicit so ordinary tests are not duplicated accidentally. Environment-specific options belong under the appropriate \`jsdom\` or \`happyDOM\` key, and both packages must be installed when both projects execute.

### Which environment should a new frontend project choose first?

Begin by listing the browser APIs and confidence levels the project needs. Run a representative component slice and capability contract under both emulators, then choose the simpler compatible option with measured performance. Put pure logic in Node and platform-sensitive interactions in a real browser from the start. If the team has no evidence yet, jsdom is a common compatibility-oriented baseline, while Happy DOM is a candidate worth measuring. Record the decision and revisit it as the application and emulator support evolve.
`,
};
