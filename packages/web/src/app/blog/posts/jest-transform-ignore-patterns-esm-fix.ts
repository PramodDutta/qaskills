import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest Transform Ignore Patterns ESM Fix for Dependencies in node_modules',
  description: 'This Jest transform ignore patterns ESM fix shows how to allowlist exact dependencies, handle pnpm paths, verify transforms, and avoid fragile regex rules.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Jest Transform Ignore Patterns ESM Fix for Dependencies in node_modules

The usual Jest transform ignore patterns ESM fix is to keep ignoring most of \`node_modules\` while excluding the specific ESM-published dependency from that ignore rule. In other words, the package must be allowlisted for transformation, and the configured transformer must emit code that matches the module mode in which Jest executes the test.

That answer has two important conditions. First, \`transformIgnorePatterns\` contains regular expressions matched against full source file paths, and a matching path is skipped by transformation. Second, changing the ignore rule does nothing useful if the transformer does not cover the dependency’s file extension or emits the wrong module format. Diagnose the resolved file, matched pattern, and transformer as one pipeline.

This guide builds a minimal fix for npm and Yarn-style layouts, handles pnpm’s nested store paths, distinguishes true ESM mode from transforming ESM syntax for a CommonJS test runtime, and provides checks that expose overbroad or overlapping patterns.

## Confirm That the Failure Is at the Transform Boundary

The characteristic failure occurs when Jest loads a dependency file containing syntax that the active runtime path did not accept. Messages often point at \`export\`, \`import\`, or another untransformed construct inside \`node_modules\`. Do not assume every “unexpected token” is this problem. The same symptom can come from an unsupported asset import, missing JSX transform, TypeScript syntax, or Jest running in a different module mode than expected.

Capture four facts from the first stack frame in the dependency:

1. The exact resolved file path.
2. The file extension and package name.
3. Whether that path matches any \`transformIgnorePatterns\` entry.
4. Which \`transform\` rule, if any, would process the file after it is allowlisted.

| Evidence | Transform-ignore diagnosis | Different likely diagnosis |
| --- | --- | --- |
| Stack points inside \`node_modules/package-a/index.js\` at \`export\` | Package may be skipped by default ignore | Continue pipeline checks |
| Stack points at application \`.tsx\` syntax | Application transform may be missing | Configure project source transform |
| Error is “cannot find module” | Resolution or export map issue | Inspect resolver and package exports |
| CSS or image token fails | Non-JavaScript asset needs mapping or transformer | Do not allowlist an unrelated package |
| Same file runs under Node but not Jest | Jest module mode or transform differs | Compare runtime configuration |

Jest’s code transformation guide states that \`node_modules\` is not transpiled by the default configuration and that \`transformIgnorePatterns\` must be changed when such code needs transpilation: https://jestjs.io/docs/code-transformation. The configuration reference defines the patterns as full-path regular expressions: https://jestjs.io/docs/configuration#transformignorepatterns-arraystring.

## Understand the Negative Lookahead Allowlist

The default ignore concept is simple: paths containing \`node_modules\` are not transformed. To transform selected packages, use a negative lookahead inside that rule. The rule still matches and ignores every package except the named alternatives.

\`\`\`ts
import type { Config } from 'jest';

const config: Config = {
  transform: {
    '^.+\\\\.[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(package-a|@scope/package-b)/)',
  ],
};

export default config;
\`\`\`

Read the pattern from left to right. It finds a \`node_modules/\` segment only when the following characters are not \`package-a/\` or \`@scope/package-b/\`. A regular dependency matches the ignore expression and skips transformation. An allowlisted dependency does not match this ignore expression and remains eligible for the \`transform\` rule.

“Eligible” is deliberate language. \`transformIgnorePatterns\` does not itself transform a file. It only decides which source paths bypass transformation. The \`transform\` configuration still needs a matching expression and a transformer capable of processing the source.

| Resolved path after \`node_modules/\` | Ignore pattern matches? | Transformation outcome |
| --- | --- | --- |
| \`package-a/dist/index.js\` | No | Eligible for configured JS transform |
| \`@scope/package-b/index.js\` | No | Eligible for configured JS transform |
| \`package-c/index.js\` | Yes | Skipped |
| \`package-a-extra/index.js\` | Yes | Skipped because slash anchors package name |

Keep the trailing slash after the allowlist group. Without a boundary, a prefix can accidentally allow unrelated packages. Add only packages visible in the failing import chain, not every dependency owned by the same vendor.

## Prove the Pattern Against the Real Resolved Path

Regexes that look right against a short example can fail against absolute paths, scoped names, symlinks, or pnpm’s store. Use Node resolution from the same workspace package that runs Jest, then test the pattern exactly as Jest will.

\`\`\`js
// scripts/check-jest-transform-path.cjs
const target = require.resolve('package-a');
const ignorePatterns = [
  '/node_modules/(?!(package-a|@scope/package-b)/)',
];

console.log({ target });
for (const source of ignorePatterns) {
  const expression = new RegExp(source);
  console.log({ source, ignored: expression.test(target) });
}
\`\`\`

Run it from the package whose Jest config is in question:

\`\`\`bash
node scripts/check-jest-transform-path.cjs
npx jest --showConfig
\`\`\`

The target dependency should report \`ignored: false\`. A normal dependency should still report \`true\` if checked with the same expression. \`--showConfig\` helps verify the resolved Jest configuration rather than the file you assume was loaded.

If \`require.resolve\` selects a CommonJS entry while the test’s \`import\` condition selects an ESM entry, inspect the path printed in the actual Jest stack trace. Conditional exports can expose different files under different conditions. Test the path Jest really attempted to execute, not a convenient neighbor.

## Configure a Transformer That Covers the Dependency

Once allowlisted, the file passes through the first matching transform rule. Jest ships with \`babel-jest\`, which reads the project’s Babel configuration and, by default, handles JavaScript and TypeScript-shaped extensions described in the official guide. An explicit transform rule is clearer when the project also defines other transformers.

\`\`\`js
// babel.config.cjs
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-typescript', { allExtensions: true, isTSX: true }],
  ],
};
\`\`\`

\`\`\`ts
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\\\.[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!(package-a|@scope/package-b)/)',
  ],
};

export default config;
\`\`\`

The Babel presets shown are packages your project must deliberately install and configure. Do not add TypeScript transformation merely because one JavaScript dependency uses ESM. Babel transformation also does not type-check TypeScript. Keep the project’s normal type-checking command as a separate CI responsibility.

If the repository already uses another supported Jest transformer, configure that transformer according to its official documentation rather than stacking Babel casually. Multiple transform entries can overlap, and the output module format needs to agree with Jest’s execution mode.

## Choose Between Transpiling ESM and Running Jest in ESM Mode

There are two different architectures commonly called an “ESM fix.” A CommonJS-oriented Jest runtime can transform an ESM-published dependency into compatible output. Alternatively, the test suite itself can run with Jest’s ESM support and use transformers that emit ESM or disable transforms when Node accepts all syntax.

| Architecture | Application and tests | Dependency handling | Key consequence |
| --- | --- | --- | --- |
| Transform dependency for CJS execution | Tests execute through CommonJS-oriented pipeline | Allowlist package, transformer emits compatible output | Familiar mocking behavior, added transform cost |
| Native-style Jest ESM execution | Project activates ESM mode | Transformer must emit ESM or be disabled | ESM-specific mocking and Jest API imports apply |
| Mixed workspace projects | Different packages use different modes | Separate Jest projects/configs | More config, clearer boundaries |

Jest’s official ESM page currently labels ESM support experimental and documents its activation requirements at https://jestjs.io/docs/ecmascript-modules. Among those requirements, transforms must either be disabled or emit ESM, and the Node VM modules execution path is used. Do not copy a CommonJS allowlist fix into native ESM mode without checking transformer output.

Pick the architecture based on the repository, not the one dependency. If hundreds of existing tests and mocks assume CommonJS behavior, transforming one package is often the smaller change. If the application is already ESM-first, forcing dependencies back through a CommonJS transform can create interop edge cases and may be the wrong direction.

## Handle pnpm’s Store Path Instead of Its Symlink Facade

pnpm installations require special attention. A package visible at \`node_modules/package-a\` can resolve through \`node_modules/.pnpm/package-a@version/node_modules/package-a\`. A negative lookahead immediately after the first \`node_modules/\` sees \`.pnpm\`, not \`package-a\`, so the npm-style pattern still ignores it.

Jest’s configuration documentation includes pnpm-specific examples. One pattern can allow entries in the \`.pnpm\` folder, where a scoped package name uses \`+\` in the folder name. Another pattern can match the second \`node_modules/\` segment.

\`\`\`ts
import type { Config } from 'jest';

const config: Config = {
  transform: {
    '^.+\\\\.[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/.pnpm/(?!(package-a|@scope\\\\+package-b)@)',
    'node_modules/(?!.pnpm|package-a|@scope/package-b)',
  ],
};

export default config;
\`\`\`

In an actual \`jest.config.ts\` string, the regular expression also needs the appropriate string escaping. Test the resolved absolute path rather than counting slashes by eye.

For a monorepo, \`<rootDir>\` is the root of the current Jest project. A config stored in a workspace package may need a pattern based on the monorepo’s physical dependency location, or it may use the second-segment strategy shown above. There is no substitute for printing the actual resolved path in that package.

| Installation layout | Path segment to inspect | Frequent mistake |
| --- | --- | --- |
| npm hoisted | \`node_modules/package-a\` | Missing scoped-name alternative |
| Yarn classic-style tree | Usually package segment after \`node_modules\` | Assuming every import resolves from repo root |
| pnpm store | \`node_modules/.pnpm/package@version/node_modules/package\` | Testing only facade symlink path |
| Monorepo nested project | Project-specific \`<rootDir>\` and physical store | Copying root config without resolving paths |

## Combine Allowlisted Packages in One Ignore Expression

An easy mistake is splitting negative lookaheads into separate ignore patterns:

\`\`\`ts
const wrong = {
  transformIgnorePatterns: [
    '/node_modules/(?!package-a/)',
    '/node_modules/(?!package-b/)',
  ],
};

const correct = {
  transformIgnorePatterns: [
    '/node_modules/(?!(package-a|package-b)/)',
  ],
};
\`\`\`

Jest skips transformation if a source path matches any ignore pattern. For \`package-a\`, the first pattern does not match, but the second pattern does, so the file is ignored anyway. Combining alternatives in one negative lookahead expresses the real policy: ignore \`node_modules\` unless the next package is A or B.

Audit the entire array, including values contributed by presets. An additional broad pattern such as \`/node_modules/\` cancels a carefully written allowlist because it matches the path independently. The effective config from \`--showConfig\` is more trustworthy than reading one partial config file.

What people get wrong is thinking each pattern adds another allowed exception. The array is an ignore union, not an allowlist union. Any match wins the decision to skip transformation.

## Keep the Allowlist Narrow and Measurable

Transforming all of \`node_modules\` may appear to fix the syntax error, but it expands startup cost, cache work, and exposure to code that was never meant for the project’s transformer. It also turns a dependency publishing change into a suite-wide performance surprise.

Allowlist the smallest package set required by the failing import graph. A top-level package may import another ESM-only package, in which case the stack trace moves to the next dependency after the first fix. Add that transitive package based on evidence. Record why each name exists beside the configuration.

\`\`\`ts
const esmDependencies = [
  'package-a',
  '@scope/package-b',
];

const escaped = esmDependencies
  .map((name) => name.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'))
  .join('|');

export const transformIgnorePatterns = [
  \`/node_modules/(?!(\${escaped})/)\`,
];
\`\`\`

Generating regex dynamically can reduce duplicated package lists, but the escaping helper itself deserves a unit test. A static expression is often easier for two or three dependencies. Favor inspectability over cleverness.

Measure cold Jest startup and representative suite duration before and after widening the allowlist. The goal is correctness first, then a bounded transform cost. Jest caches transformed output, so compare cold and warm behavior separately.

## Test the Configuration as a Regression Contract

A configuration regex can have unit tests like application code. Use representative absolute-looking paths for supported layouts and assert which ones are ignored. This catches accidental grouping edits before they surface as an opaque parser failure.

\`\`\`ts
import { describe, expect, it } from '@jest/globals';

const ignore = new RegExp(
  '/node_modules/(?!(package-a|@scope/package-b)/)',
);

describe('Jest dependency transform policy', () => {
  it.each([
    '/repo/node_modules/package-a/dist/index.js',
    '/repo/node_modules/@scope/package-b/index.js',
  ])('allows transformation for %s', (file) => {
    expect(ignore.test(file)).toBe(false);
  });

  it('continues to ignore ordinary dependencies', () => {
    expect(ignore.test('/repo/node_modules/package-c/index.js')).toBe(true);
  });
});
\`\`\`

Notice that a RegExp literal and a string passed through Jest config have different JavaScript escaping surfaces. The policy is the same, but copying characters between them without testing is risky. The final check should use the real string from the config against \`require.resolve\` output.

If a team uses AI coding agents to update configuration, provide the failing resolved path, package manager, active Jest project, and effective transform rules. Otherwise an agent may produce a plausible npm regex for a pnpm store or modify a config file that the failing project never loads. The [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) helps establish whether Jest is the intended runner before investing in interop configuration.

## Diagnose the Fix When the Error Moves or Persists

A good transform change often moves the stack trace. That is information. If the error moves from \`package-a\` to its dependency \`package-b\`, the first package is now being processed and the transitive package may need its own policy. If the error remains on the identical file and token, the path is still ignored, the transform regex misses its extension, or stale cache obscures the experiment.

| After config change | Interpretation | Next diagnostic |
| --- | --- | --- |
| Same file and token | Pattern or active config likely unchanged | Print effective config and test resolved path |
| New dependency fails | Import chain advanced | Inspect and narrowly allowlist new package |
| Application tests now fail on mocks | Output module mode changed | Review transformer module output and ESM mocking rules |
| Suite becomes much slower | Too many dependencies transform | Profile and narrow allowlist |
| Only CI fails | Path layout, case, cache, or Node environment differs | Print CI resolved path and effective config |

During configuration development, Jest’s transformation guide documents \`--no-cache\` as useful for avoiding cached output while iterating. Use it for a targeted diagnostic run, not as a permanent performance workaround.

\`\`\`bash
npx jest path/to/failing.test.ts --runInBand --no-cache
\`\`\`

The documented \`--runInBand\` execution can make diagnostic logs easier to follow, but it does not repair the transform. Remove diagnostic serialization once the cause is understood. Attach the resolved file path, effective patterns, and first syntax stack frame to the issue so the eventual config change has evidence.

Keep browser end-to-end selectors and Jest dependency transforms as separate concerns. If the affected package supports a Playwright test layer too, use the [Playwright locator best practices guide](/blog/playwright-best-practices-locators-2026) for that layer rather than importing browser-specific assumptions into Jest config.

## Isolate the Rule to the Jest Project That Imports the Package

Large repositories often expose multiple Jest projects through one root configuration. A frontend package may need to transform an ESM dependency while a backend package never imports it. Putting the allowlist at the root can make every project pay the transformation and maintenance cost, and different projects may use different transformers or environments.

Place the rule in the smallest project configuration that owns the failing import. Then run that project directly and inspect its effective config. If several projects genuinely consume the same dependency through the same module mode, extract a small shared function or preset with a focused name.

\`\`\`ts
// packages/ui/jest.config.ts
import type { Config } from 'jest';

const uiConfig: Config = {
  displayName: 'ui-unit',
  rootDir: __dirname,
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\\\.[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!(package-a)/)',
  ],
};

export default uiConfig;
\`\`\`

Be careful with \`<rootDir>\` in this example. If dependencies are hoisted to the monorepo root, a pattern beginning at the package directory’s \`node_modules\` may not match the physical path at all. Resolve the package from \`packages/ui\`, observe the absolute path, and adjust the project-specific expression to that layout. The point of isolation is policy ownership, not assuming a nested dependency tree.

Presets add another source of confusion. A preset can contribute \`transform\` or \`transformIgnorePatterns\`, and a local value may replace rather than conceptually merge the way a reader expects. Inspect \`--showConfig\` after composition. Confirm that the final transform retains required handlers for application source as well as the dependency exception.

When upgrading the allowlisted package, make the transform rule part of the upgrade review. The package may add a CommonJS export, change its distribution extension, add an ESM-only transitive dependency, or stop needing a transform under the project’s current Node and Jest architecture. Remove obsolete names instead of letting the allowlist become a permanent catalog. A narrow configuration is easier to understand precisely because every exception has a current failing path or compatibility reason behind it.

## Frequently Asked Questions

### Why does a negative lookahead allow a package to be transformed?

The surrounding expression is an ignore rule. It matches paths under \`node_modules\` unless the next path segment is one of the alternatives inside the negative lookahead. When the dependency is named there, the ignore expression does not match, so Jest does not skip it on account of that rule. The file is only eligible at that point. A matching \`transform\` entry and a compatible transformer are still required to produce executable output.

### Should transformIgnorePatterns be set to an empty array for ESM packages?

Usually not. An empty array can make every dependency eligible for transformation, increasing work and sending third-party code through project-specific transforms unnecessarily. Keep the normal \`node_modules\` ignore behavior and allowlist only packages proven to require transformation. If the project intentionally runs Jest in ESM mode, follow the ESM configuration path instead of assuming that transforming everything is correct. Measure the impact and test the resolved paths for the package manager used in CI.

### Why does the npm pattern fail after moving the repository to pnpm?

pnpm’s physical resolved path commonly passes through a \`.pnpm\` directory before reaching a second \`node_modules\` segment. A lookahead immediately after the first segment sees \`.pnpm\`, not the dependency name, and therefore ignores the file. Use the pnpm-aware patterns documented by Jest or target the second segment, accounting for scoped package folder encoding. Print the real resolved path from the failing workspace because hoisting and monorepo layout can change where the expression must match.

### Does babel-jest type-check TypeScript dependencies and tests?

No. Babel can remove TypeScript syntax when the appropriate preset is configured, but it does not perform TypeScript’s semantic type checking. Keep a separate \`tsc\` or project-specific type-check command in CI if type safety is required. Also remember that allowlisting a dependency only permits transformation. The Babel configuration must cover its extension and emit the module format expected by the chosen Jest execution mode. Treat syntax transformation, module interoperability, and type checking as three separate concerns.
`,
};
