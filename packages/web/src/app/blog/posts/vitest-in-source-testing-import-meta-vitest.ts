import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "In-Source Testing with import.meta.vitest",
  description:
    "Use import.meta.vitest for focused in-source testing with correct Vitest configuration, TypeScript typing, production dead-code removal, and maintainable boundaries.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# In-Source Testing with import.meta.vitest

At the bottom of a tiny parser, a guarded \`describe\` block can test the private edge cases beside the code that defines them. Vitest calls this in-source testing. It is a focused technique for compact algorithms and utilities, not a mandate to move an entire test suite into production modules.

## How the import.meta.vitest guard works

When Vitest transforms a source file selected by \`includeSource\`, it supplies \`import.meta.vitest\`. Outside the test run that property is falsy or replaced during bundling. Test registration therefore occurs only inside the guard.

\`\`\`ts
// src/parse-duration.ts
export function parseDuration(value: string): number {
  const match = /^(\d+)(ms|s|m)$/.exec(value);
  if (!match) throw new TypeError(\`Invalid duration: \${value}\`);
  const amount = Number(match[1]);
  const multiplier = { ms: 1, s: 1_000, m: 60_000 }[match[2]];
  return amount * multiplier;
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe('parseDuration', () => {
    it.each([
      ['250ms', 250],
      ['3s', 3_000],
      ['2m', 120_000],
    ])('parses %s', (input, expected) => {
      expect(parseDuration(input)).toBe(expected);
    });

    it('rejects unsupported units', () => {
      expect(() => parseDuration('4h')).toThrow('Invalid duration: 4h');
    });
  });
}
\`\`\`

The test uses the module's actual exported function. It can also exercise non-exported helpers because the block shares lexical scope, which is both the technique's main advantage and its main architectural risk.

## Enable source discovery explicitly

In-source blocks are not discovered merely because the property appears in code. Add patterns to \`test.includeSource\` in Vitest configuration.

\`\`\`ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    includeSource: ['src/**/*.{ts,tsx}'],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.generated.ts'],
    },
  },
  define: {
    'import.meta.vitest': 'undefined',
  },
});
\`\`\`

The \`define\` entry lets the production build replace the guard with \`undefined\`, enabling dead-code elimination. Confirm the behavior in the actual bundler output rather than assuming every downstream consumer performs the same optimization. The [Vitest configuration guide](/blog/vitest-config-setup-guide-2026) provides the wider setup context.

## Add the Vitest type without polluting runtime imports

TypeScript needs the in-source testing types. Add \`vitest/importMeta\` to the relevant tsconfig types:

\`\`\`json
{
  "compilerOptions": {
    "types": ["vitest/importMeta"],
    "module": "ESNext",
    "moduleResolution": "Bundler"
  },
  "include": ["src", "tests", "vitest.config.ts"]
}
\`\`\`

This is type information, not a runtime import. Libraries should consider separate development and build tsconfigs so published declaration generation does not unexpectedly depend on Vitest types.

| Concern | Required action | Failure if omitted |
|---|---|---|
| Discovery | Configure \`includeSource\` | Guarded tests never run |
| Type checking | Include \`vitest/importMeta\` | TypeScript rejects \`import.meta.vitest\` |
| Production bundle | Define property as \`undefined\` | Test code may remain in output |
| Coverage | Include source paths intentionally | Reports may omit unimported modules |

## Select candidates by cohesion, not file size alone

Good candidates have dense behavior and few environment dependencies: parsers, codecs, reducers, numeric transformations, and validation helpers. Keeping vectors beside an algorithm can make maintenance easier because a changed branch and its boundary examples are reviewed together.

| Candidate | In-source fit | Reason |
|---|---:|---|
| Pure URL normalizer | Strong | Small input-output surface and many local edges |
| Binary decoder | Strong | Tests benefit from private offset helpers |
| React page with providers | Weak | Setup and user behavior overwhelm implementation |
| Database repository | Weak | Lifecycle and infrastructure belong in fixtures |
| Public package contract | Mixed | External tests better prove consumer-visible imports |
| Regression for a private algorithm branch | Strong | Test can name the exact invariant without exporting internals |

Do not use the technique to avoid designing a public interface. If a helper is important enough for multiple modules, extract and export it. If behavior crosses modules, an external test better represents the boundary.

## Test a non-exported state machine without exporting it

Consider a streaming line splitter. The public generator is simple, while a private function handles chunk boundaries. In-source placement allows precise edge coverage without adding a test-only export.

\`\`\`ts
// src/line-splitter.ts
function splitComplete(buffer: string): [string[], string] {
  const parts = buffer.split('\n');
  return [parts.slice(0, -1), parts.at(-1) ?? ''];
}

export async function* lines(chunks: AsyncIterable<string>) {
  let pending = '';
  for await (const chunk of chunks) {
    const [complete, rest] = splitComplete(pending + chunk);
    yield* complete;
    pending = rest;
  }
  if (pending) yield pending;
}

if (import.meta.vitest) {
  const { expect, it } = import.meta.vitest;

  it('retains a partial line for the next chunk', () => {
    expect(splitComplete('first\nsec')).toEqual([['first'], 'sec']);
  });

  it('recognizes a trailing newline as no pending text', () => {
    expect(splitComplete('first\nsecond\n')).toEqual([['first', 'second'], '']);
  });
}
\`\`\`

Keep at least one external test for the async generator. Private-helper assertions can couple tightly to implementation and might remain green when composition fails.

## Protect shipping artifacts with an executable check

Tree shaking is a build property, not a Vitest promise. Build the package and search the distributable for distinctive test descriptions or Vitest imports. Better still, run a consumer smoke test against the packed package.

\`\`\`ts
// tests/distribution.test.ts
import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

test('production output excludes in-source test registrations', async () => {
  const output = await readFile(new URL('../dist/parse-duration.js', import.meta.url), 'utf8');
  expect(output).not.toContain('rejects unsupported units');
  expect(output).not.toContain('import.meta.vitest');
  expect(output).not.toContain("from 'vitest'");
});
\`\`\`

This test must run after the build that creates \`dist\`. A source-only test command cannot validate an artifact that does not exist yet.

## Avoid importing Vitest at module top level

Top-level \`import { describe } from 'vitest'\` turns the testing framework into a runtime dependency and can break consumers. The guarded property exists to avoid that. Destructure APIs only inside the block.

Another trap is calling production initialization before the guard. If importing the module opens a socket or reads required environment variables, in-source discovery will trigger those side effects. Make modules import-safe regardless of test placement.

| Mistake | Observable result | Correction |
|---|---|---|
| File not in \`includeSource\` | Zero tests collected | Match its source path |
| Top-level Vitest import | Runtime bundle references Vitest | Use APIs from \`import.meta.vitest\` inside guard |
| Guard survives bundle | Larger output or exposed test strings | Define as undefined and verify artifact |
| Global test APIs assumed | Type errors or hidden coupling | Destructure explicit APIs |
| Every private line asserted | Refactors cause noisy failures | Test invariants and retain public-boundary coverage |

## Mocking inside the implementation file has sharp edges

Module mocks are hoisted and affect module evaluation. When tests live in the module being evaluated, self-mocking and dependency ordering become difficult to reason about. Prefer dependency injection for pure collaborators, or place mock-heavy tests in a separate \`.test.ts\` file.

Spies on local lexical functions usually do not intercept calls already bound inside the same module. That limitation is a useful design signal. Test the outcome, extract a dependency, or use an external module boundary instead of trying to force a spy into private wiring.

Timers are reasonable in source when the module is a small scheduler, but always restore them:

\`\`\`ts
if (import.meta.vitest) {
  const { afterEach, expect, it, vi } = import.meta.vitest;
  afterEach(() => vi.useRealTimers());

  it('releases a coalesced callback once', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const schedule = createCoalescer(callback, 50);
    schedule();
    schedule();
    vi.advanceTimersByTime(50);
    expect(callback).toHaveBeenCalledTimes(1);
  });
}
\`\`\`

The teardown remains close to the fake-timer activation, reducing the risk that later blocks inherit altered global time.

## Keep source readability as a hard constraint

A production reader should reach the implementation without wading through hundreds of test lines. Place the guard after exports, keep local examples concise, and move broad scenario matrices to external files. If the tests become larger than the behavior, proximity has stopped paying for itself.

Naming can differ from external specifications. In-source descriptions should explain algorithm invariants, such as “retains incomplete UTF-8 prefix,” because they sit beside the mechanism. External descriptions should explain consumer behavior.

Code review should treat changes inside the guard as test changes, even though the filename lacks \`.test\`. Ownership rules, coverage tooling, and diff filters may need adjustment so those lines are not overlooked.

## Configure monorepos package by package

In a workspace, not every package needs in-source testing. A low-level parser package may benefit, while a browser application may not. Put \`includeSource\`, types, and production replacement in the owning package's configuration.

The [Vitest workspace testing guide](/blog/vitest-workspace-monorepo-testing-guide) explains project separation. Check that source patterns do not accidentally select generated files, fixtures, or built output twice. If two workspace projects include the same source file, its tests can execute twice with different environments.

| Workspace question | Decision |
|---|---|
| Which project owns the module? | Only that project includes its source tests |
| Node or browser environment? | Match the module's actual runtime |
| Does the package publish JS? | Add artifact stripping verification |
| Does coverage merge across projects? | Normalize paths and prevent duplicate entries |

Library packages should test both source behavior and the exported package surface. In-source success does not prove package.json exports, declaration files, or CommonJS and ESM interoperability.

## Coverage and watch-mode expectations

Once matched by \`includeSource\`, guarded tests participate in normal runs and watch mode. A source edit can rerun its local tests naturally. Coverage still depends on provider settings and include patterns. Unexecuted code outside tested paths remains uncovered, and stripping the guard in production does not mean its lines should count as product logic.

Inspect the report once after adoption. If guard lines reduce branch coverage, configure an appropriate coverage exclusion supported by the team's provider, or accept the branch as test scaffolding. Do not add meaningless tests merely to execute the guard's false production path.

## A pragmatic adoption plan

Start with one stable pure utility whose external tests currently export a private helper. Move only the helper-level examples, remove the test-only export, configure discovery and types, then verify the built artifact. Measure whether reviews become clearer. Do not convert files mechanically.

Set a policy: in-source blocks are allowed for pure local invariants, production imports remain side-effect free, mocking-heavy scenarios stay external, and published output is checked. This keeps the technique narrow enough to retain its value.

## Review the technique against build and test boundaries

An in-source block changes three artifacts: the source module, the test graph, and potentially the distributable. Review all three. Source readers should still understand exports quickly. Vitest should collect the intended cases exactly once. The production bundle should omit descriptions, hooks, fixtures, and references to the runner.

For packages that publish source maps, inspect whether eliminated test strings remain in \`.map\` files. Some organizations ship source maps to a private error service, while others publish them to npm or a CDN. Decide whether test content in a source map is acceptable. The runtime bundle can be clean even when the map still contains original source.

Declaration output is another boundary. Tests inside the guard should not add exported test-only types. Run \`tsc --emitDeclarationOnly\` or the package's normal declaration build and inspect the public surface. A private helper accessed by the local block should remain absent from \`.d.ts\` files.

SSR and dual-build packages need both client and server verification. A Vite client build may replace \`import.meta.vitest\`, while a separate TypeScript or esbuild server pipeline may not read the same configuration. Add the replacement to every production pipeline or keep in-source tests out of modules shared with an uncontrolled consumer build.

Watch mode also deserves a behavioral check in a large repository. Edit an in-source case and confirm the owning project reruns without launching unrelated browser projects. Overbroad \`includeSource\` patterns can cause a source file to be transformed under multiple environments. Narrow patterns by package and runtime.

Snapshot tests are possible inside the guard, but external snapshot file placement can surprise maintainers because the source filename is not a conventional test filename. Inline snapshots keep proximity, though they expand production source and source maps. Prefer explicit expected structures for small algorithm outputs.

Property-based tests can be an excellent local companion to parsers and encoders. Keep generators and long-running fuzz configurations external if they obscure implementation. A small invariant such as decode(encode(value)) equals value fits the guard; a corpus manager and thousands of cases deserve a separate test module.

Coverage exclusions should be documented in configuration. The guard condition is scaffolding and may appear as an uncovered branch when running a production-oriented instrumentation pass. Excluding only the guard line or test region is more honest than lowering thresholds globally. Confirm the chosen provider recognizes the comments or configuration syntax in use.

When a bug crosses a public boundary, resist placing its regression only against a private helper. Reproduce it through the exported API first. A smaller in-source assertion may be added to localize the edge, but the external regression prevents a later refactor from preserving the helper result while breaking composition.

Finally, define an exit rule. Move tests out when they need elaborate mocks, shared setup, browser APIs, filesystem fixtures, or more lines than the implementation. In-source testing remains effective when proximity reduces cognitive distance; once setup dominates, a named test file restores clarity.

Lint configuration may need to recognize test dependencies inside guarded source. Because APIs are destructured explicitly, global-name problems are avoided, but rules banning development dependencies under \`src\` can still object. Use a targeted override for approved modules, not a blanket exclusion.

Mutation testing can assess local assertions. Mutate the implementation region and verify boundary changes are killed, while excluding guarded registration code itself. Changing a test description is not a meaningful product mutation.

Never import fixtures from a test directory into production source, even inside the guard. Resolvers and type checkers may follow the dependency before dead-code elimination. Keep tiny vectors literal or move the whole scenario to an external test.

Source maps can retain eliminated test strings. Decide whether maps are private debugging artifacts or publicly shipped package files, then inspect them along with JavaScript output. Runtime tree shaking alone does not answer that disclosure question.

For React components, browser setup, providers, accessibility queries, and cleanup usually outweigh proximity. Put those cases in dedicated files and reserve local guards for pure helpers. Benchmark suites and large generated corpora similarly belong outside production modules.

When package consumers compile source directly instead of using your dist output, they inherit responsibility for replacing the guard. Document supported consumption paths and test the published package rather than every hypothetical compiler. If raw-source consumption is a supported feature, consider external tests so the source carries no runner-specific branch.

Code-generation inputs should never include guarded tests. If a file is transformed into another language or embedded into firmware, the normal JavaScript dead-code pass may not run. Apply in-source testing only where the entire production toolchain is known and verified.

## Frequently Asked Questions

### Why does Vitest report no tests from my guarded source file?

The file is probably not matched by \`test.includeSource\`. Add the correct source glob and ensure the workspace project running the command owns that file.

### Is import.meta.vitest available in CommonJS modules?

\`import.meta\` is an ESM feature. Use in-source testing in modules processed through an ESM-aware Vite/Vitest pipeline, or keep tests external for CommonJS-only source.

### Will the guarded test code always disappear from production?

No automatic guarantee covers every build chain. Define \`import.meta.vitest\` as \`undefined\` for the production build, enable normal dead-code elimination, and inspect the produced artifact.

### Can in-source tests access unexported functions?

Yes, because the block is in the same lexical module. Use that access sparingly and assert stable invariants rather than every implementation step.

### Should all unit tests move beside implementation?

No. Integration scenarios, public package contracts, UI behavior, and mock-heavy cases are usually clearer in dedicated test files. In-source tests work best for compact, cohesive algorithms.
`,
};
