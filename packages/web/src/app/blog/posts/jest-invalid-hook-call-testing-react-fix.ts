import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest “Invalid Hook Call” in React Tests Fix',
  description:
    'Fix Jest invalid hook call errors by finding duplicate React instances, correcting resetModules usage, and isolating mocks without splitting the renderer.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Jest “Invalid Hook Call” in React Tests Fix

The component renders normally in the browser, yet Jest stops at \`useState\` with “Invalid hook call.” When that discrepancy follows a call to \`jest.resetModules()\`, the most likely problem is not the hook's location. The component and the renderer are holding different React module objects.

Hooks rely on shared internal dispatcher state. The \`react\` instance imported by a component must be the same instance used by \`react-dom\` or the test renderer. A reset module registry, a linked package, an incorrectly declared library dependency, or mismatched renderer versions can break that identity inside the test process.

The fix is to prove which cause you have, then restore a single React ownership boundary. Suppressing the warning or mocking hooks treats the symptom and can make the test less representative.

## Read the warning as an identity failure first

React documents three main causes for this warning:

1. A hook is called outside a function component or custom hook, or in a forbidden control-flow position.
2. React and its renderer have incompatible versions.
3. More than one React copy participates in the same render tree.

Tests add a fourth-looking scenario that is really a version of the third: Jest can evaluate the same installed React file into separate module instances after registry manipulation. There may be only one \`node_modules/react\` directory on disk, while two React export objects exist in memory.

Classify the failure before changing configuration.

| Observation | Most likely direction | First check |
|---|---|---|
| Fails in browser and test | Rules of Hooks or package graph | Lint hook calls, inspect React versions |
| Fails only after \`resetModules\` | Split in-memory module identity | Remove reset and compare module references |
| Fails only when testing a linked library | Library resolves its own React | Inspect peer dependencies and real paths |
| Began after renderer upgrade | Version mismatch | List \`react\` and \`react-dom\` versions |
| Only one component fails consistently | Illegal hook flow remains plausible | Reduce component and run hook lint rules |

Do not assume every invalid hook call in Jest is duplicate React. A custom hook invoked inside a plain helper is still invalid. The key clue for module duplication is sensitivity to import order, registry reset, mocks, symlinks, or package workspace boundaries.

## Prove whether React identity has split

A minimal diagnostic captures React before and after the operation suspected of resetting or isolating modules.

\`\`\`js
test('diagnoses React identity across a registry reset', () => {
  const reactBeforeReset = require('react');

  jest.resetModules();

  const reactAfterReset = require('react');
  expect(reactAfterReset).not.toBe(reactBeforeReset);
});
\`\`\`

That test demonstrates what \`resetModules\` promises: it resets Jest's module registry, so a subsequent \`require\` can produce a new module instance. This behavior is useful for modules with local state. It is dangerous when a renderer imported before the reset retains the old React while a component imported after the reset receives the new one.

For the actual suite, compare the imports that participate in rendering rather than leaving a diagnostic assertion as a permanent behavior test. Add temporary logging around the load boundary or create a small reproduction with one component, one renderer import, and the reset. Remove the instrumentation after finding the split.

Disk-level checks are complementary:

\`\`\`bash
npm ls react react-dom
npm explain react
node -p "require.resolve('react')"
node -p "require.resolve('react-dom')"
\`\`\`

Use the corresponding package-manager inspection commands if the repository does not use npm. A single path does not disprove an in-memory split after \`resetModules\`; multiple installed React versions do strongly support a dependency-graph problem.

## How \`resetModules\` creates the test-only failure

Suppose a setup file imports Testing Library, which imports the React DOM renderer and React instance A. A test then calls \`jest.resetModules()\`. The next dynamic \`require('./Widget')\` evaluates the component against React instance B. When React DOM A renders Widget B, its hook call reads dispatcher state from B while the renderer writes dispatcher state through A. React reports an invalid hook call.

The sequence is the bug:

| Time | Registry action | Renderer holds | Component holds |
|---|---|---|---|
| Setup | Testing utilities import | React A | Not loaded |
| Test reset | Registry cache cleared | React A reference survives | Not loaded |
| Dynamic import | Component evaluated | React A | React B |
| Render | Renderer invokes component | Dispatcher on A | Hook reads B |

This explains why reinstalling packages sometimes appears to help but does not address the test design. A clean install can alter module order or flattening, yet resetting after the renderer is loaded can reproduce the split again.

The simplest repair is usually to stop globally resetting the registry. Clear mocks when the goal is only call-history isolation:

\`\`\`js
afterEach(() => {
  jest.clearAllMocks();
});
\`\`\`

\`jest.clearAllMocks()\` clears usage data for Jest mock functions. It does not throw away every evaluated module. If you need to restore spy implementations, \`jest.restoreAllMocks()\` may be appropriate. Neither is semantically equivalent to resetting the module cache, which is precisely why they preserve React identity.

## Prefer dependency injection over registry-wide configuration tests

Many suites call \`resetModules\` to re-import a module under a different environment variable or feature flag. That works for simple stateful modules, but it makes the test's correctness depend on import timing. A small design change can expose configuration as a parameter and remove the registry operation.

Before:

\`\`\`js
// banner.js
import React from 'react';

const mode = process.env.APP_MODE;

export function Banner() {
  return <p>{mode === 'maintenance' ? 'Temporarily unavailable' : 'Welcome'}</p>;
}
\`\`\`

After, separate environment reading from rendering:

\`\`\`jsx
// banner.js
import React from 'react';

export function Banner({ mode = process.env.APP_MODE }) {
  return <p>{mode === 'maintenance' ? 'Temporarily unavailable' : 'Welcome'}</p>;
}

// banner.test.js
import { render, screen } from '@testing-library/react';
import { Banner } from './banner';

test('shows maintenance copy in maintenance mode', () => {
  render(<Banner mode="maintenance" />);
  expect(screen.getByText('Temporarily unavailable')).toBeInTheDocument();
});
\`\`\`

The component and renderer now use the normal static module graph. A smaller unit can test configuration parsing without React. This is not merely a workaround. Import-time environment reads are difficult to change at runtime and difficult to test safely in any module system.

Dependency injection is not mandatory for every configuration value. It is especially useful when tests repeatedly rebuild a module graph solely to alter one dependency.

## Use \`isolateModules\` with a coherent import boundary

\`jest.isolateModules(fn)\` creates a sandbox module registry for modules loaded inside its callback. It offers narrower isolation than resetting the global registry. It does not automatically guarantee a single React instance if the renderer is outside and the component is inside.

The safe principle is coherence: modules that must share singleton identity should load within the same registry boundary. For CommonJS tests that genuinely need a fresh module, load React, renderer-facing testing code, and the component consistently, or mock React inside the sandbox to the already-owned instance.

One practical pattern preserves the outer React object while isolating the target module:

\`\`\`js
test('loads a configured component without creating another React object', () => {
  const sharedReact = require('react');
  process.env.APP_MODE = 'maintenance';

  jest.isolateModules(() => {
    jest.doMock('react', () => sharedReact);
    const { getBannerText } = require('./banner-model');
    expect(getBannerText()).toBe('Temporarily unavailable');
  });

  delete process.env.APP_MODE;
});
\`\`\`

This example isolates a non-rendering model, where registry isolation is meaningful and React is only shown as a singleton-preservation technique. For rendered components, favor ordinary imports and explicit dependencies. If \`doMock\` is used, remember that it registers a mock for later module loading; cleanup and import order must be intentional.

Do not copy a persistent React mock into a broad setup file without understanding its effect on the entire suite. It can conceal duplicate installation problems and interact with ESM differently. Treat it as a narrow bridge when legacy import-time design cannot yet be refactored.

For a deeper treatment of registry behavior, see the [Jest module isolation and resetModules guide](/blog/jest-module-isolation-resetmodules-guide). When the real goal is changing behavior on a mock rather than reloading modules, the [Jest mock and mockImplementation guide](/blog/jest-mock-vs-mockimplementation-guide) is the relevant path.

## Fix duplicate packages at the dependency boundary

If the warning occurs without registry resets, inspect the installed graph. A reusable React library should normally declare \`react\` and usually its renderer-facing requirements as peer dependencies, with development copies for building and testing the library. Declaring React as an ordinary production dependency can install a private copy beneath the library.

A simplified library manifest looks like this:

\`\`\`json
{
  "name": "@example/design-system",
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "devDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
\`\`\`

The exact supported ranges belong to the library's compatibility policy; do not copy this example blindly. The important point is that the consuming application supplies the runtime singleton.

Package-manager overrides or resolutions can temporarily converge versions, but they are not substitutes for correct peer dependency declarations. An override can force a library onto a React version it does not support. Validate the library's peer range and run its integration tests.

With local linking, symlinks can make Node resolve dependencies relative to the linked package. Workspaces generally provide more predictable dependency ownership than ad hoc links. Check the real resolved paths from both the application and library contexts. Configure the library build to externalize React so it is not bundled into the published artifact.

## Confirm renderer compatibility, not just package count

One physical React install can still fail if React and the renderer are incompatible. \`react-dom\`, \`react-test-renderer\`, and React Native renderers have their own compatibility expectations. Inspect actual installed versions, including transitive renderer copies used by testing adapters.

| Dependency condition | Typical correction | Verification |
|---|---|---|
| Two React majors installed | Align peer ranges and lockfile resolution | Package tree shows one compatible runtime copy |
| Library bundles React | Mark React external in the library build | Inspect published bundle and consumer render |
| Old renderer with new React | Upgrade compatible renderer and test utilities | Minimal render succeeds without warnings |
| Linked package owns React | Resolve React from host or use workspace peer setup | Component and renderer import identity agrees |
| Reset splits evaluation | Remove broad reset or preserve shared singleton | Reproduction passes with stable load order |

Avoid deleting the lockfile as the first or only response. A fresh resolution can hide the graph that caused the defect and introduce unrelated upgrades. First capture \`npm ls\` or the equivalent output, identify the edge requesting the extra version, then change the manifest deliberately.

## ESM tests need an ESM-aware strategy

CommonJS examples use \`require\`, \`jest.doMock\`, and synchronous \`isolateModules\` because their evaluation order is explicit. Native ESM has static imports and different Jest mocking mechanics. Moving CommonJS snippets unchanged into an ESM suite can result in mocks being registered after the module is already evaluated.

Jest provides asynchronous isolation and ESM mocking APIs in supported configurations, but the same identity rule remains: renderer and component must share React. Prefer static imports for React test utilities, avoid resetting their registry, and isolate only the stateful module that truly needs a fresh evaluation.

If an ESM test must vary import-time configuration, consider exporting a pure factory:

\`\`\`js
export function createBannerModel({ mode }) {
  return {
    text: mode === 'maintenance' ? 'Temporarily unavailable' : 'Welcome',
  };
}
\`\`\`

Testing the factory needs no module mocking. The React component can consume the factory result through props or context. This keeps singleton-sensitive framework imports outside the experiment.

## A controlled repair sequence

When the suite is large, change one dimension at a time:

1. Reproduce with one failing test run serially, without watch mode.
2. Confirm the component follows the Rules of Hooks.
3. Capture installed React and renderer versions.
4. Search test setup and the failing file for \`resetModules\`, \`isolateModules\`, dynamic imports, and React mocks.
5. Remove or narrow the registry reset in the reproduction.
6. If duplication remains, inspect linked packages, peer dependencies, aliases, and bundle externals.
7. Add a regression test that renders user-visible behavior, not a permanent test of package-manager output.
8. Run the broader suite to detect mocks or state that the old global reset had been masking.

That last step matters. Teams sometimes use \`resetModules\` to compensate for modules with mutable global state. Removing it fixes React but reveals pollution elsewhere. Repair those modules with explicit reset functions, dependency injection, or more targeted isolation rather than restoring a registry-wide hammer.

## Guard the fix with a realistic library-consumer test

If the defect originated in a component library, its own unit tests may never reveal duplicate React because they run against the library's development dependency graph. Add a small consumer fixture that installs or packs the library as an application would, then renders one hook-using component with the consumer's renderer. The valuable assertion is successful behavior, such as a counter changing after a click, not a snapshot of dependency paths.

This consumer check should exercise the published artifact rather than source aliases. Source tests can bypass bundling mistakes, including accidentally embedding React in an output chunk. Inspecting the bundle is useful evidence, but a rendered interaction confirms that imports resolve coherently at runtime.

Keep the fixture deliberately small. One application manifest, one component import, and one render are enough to catch a packaged singleton. A full example application increases install time and accumulates unrelated build failures. Cache package-manager downloads in CI while rebuilding the local package artifact for each relevant change.

For monorepos, run the consumer from a location whose resolution matches external users. Workspace hoisting can make an incorrect dependency declaration appear healthy because every package happens to see the root React. A packed-tarball test in an isolated temporary project exposes the actual manifest and bundled files. It also verifies that React remains a peer expectation rather than an accidental nested runtime.

Do not freeze an entire dependency tree as the regression assertion. Package managers legitimately change layout. The enduring contract is that the renderer and component share a compatible React object and that the component behaves correctly. Supporting diagnostics, such as package-tree output, belong in failure logs.

## Frequently Asked Questions

### Why can one installed React package still produce two React instances?

\`jest.resetModules()\` clears the evaluation cache. A renderer can retain the React export object it imported earlier, while a component loaded after the reset receives a newly evaluated export object from the same path. Physical package count and runtime object identity are related but not identical.

### Is \`jest.isolateModules\` always safe for React components?

No. It creates another registry boundary. If the component loads React inside that boundary while the renderer was loaded outside, identity can still split. Keep singleton-dependent modules in one coherent boundary or avoid module isolation for the rendered component.

### Will adding a moduleNameMapper entry for React solve the warning?

An alias can converge different paths, but it cannot repair an in-memory split caused by resetting evaluation, and it can conceal an incorrectly packaged library. Use mapping only when path resolution is genuinely the cause, then verify renderer and component receive the same object.

### Should I mock \`useState\` or \`useEffect\` to get the test passing?

No. Hook mocks replace React behavior and usually invalidate the component test. Fix hook placement, package compatibility, or singleton identity. Test user-visible results through a real renderer unless the unit under test is a pure helper with no React rendering.

### What is the quickest confirmation that \`resetModules\` is involved?

Create a minimal failing test, remove the reset, and load the component through the same normal import graph as the renderer. If the render succeeds, compare React references across the former reset boundary and then replace the broad reset with targeted mock cleanup or injected configuration.
`,
};
