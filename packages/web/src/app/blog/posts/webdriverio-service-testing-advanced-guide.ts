import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Advanced WebdriverIO Service Testing Guide',
  description:
    'Advanced WebdriverIO service testing guide for owning hooks, lifecycle control, and resilient plugin-level architecture in serious CI suites.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Advanced WebdriverIO Service Testing Guide

A flaky Selenium Grid session rarely fails at the assertion line. It fails while a worker is starting, while a service is rewriting capabilities, while the app server is still warming caches, or while a reporter quietly discards the only trace that would explain the failure. WebdriverIO services sit in that uncomfortable space between test code and runner infrastructure, which is exactly why advanced teams eventually need to test them deliberately.

Service testing is not the same as writing another spec. A service can mutate config, allocate ports, start processes, patch browser commands, upload artifacts, or coordinate workers. A mistake in that layer can poison every spec file. The useful question is not whether the service works on your laptop. The useful question is whether it behaves predictably when the runner calls hooks in the order WebdriverIO actually uses, with the capabilities and worker boundaries your CI environment actually has.

This guide focuses on custom service architecture for WebdriverIO suites where the service is a product in its own right: an internal grid adapter, a device cloud connector, a trace collector, a local tunnel manager, or a policy layer that enforces browser options. For foundational runner configuration, pair this with [the complete WebdriverIO testing guide](/blog/webdriverio-testing-complete-guide). If your team is deciding whether this amount of plugin-level control is worth it, [the Playwright vs WebdriverIO comparison](/blog/playwright-vs-webdriverio-2026) gives the broader tradeoff.

## Treating services as runner components, not helper files

A WebdriverIO service is loaded by the runner, receives lifecycle hooks, and can act before any browser session exists. That makes it more like a mini integration layer than a test utility. The service has to be safe under parallelism, readable during failure, and boring during retries.

The important design shift is to separate runner-facing behavior from effectful operations. The hook methods should be thin adapters. They receive WebdriverIO data structures, validate assumptions, and delegate to a small domain object that is easy to test without launching a browser. When the hook starts a server, create a server manager. When it writes artifacts, create an artifact writer. When it changes capabilities, isolate the capability policy. The service class can still be simple, but it should not hide all logic behind private hook methods that can only be exercised by a full e2e run.

That separation also prevents the common anti-pattern where a service stores mutable global state in module scope. A service may be constructed once in the launcher process and separately in worker processes, depending on hook type. If state is expected to survive across those boundaries, it needs an explicit channel such as a file, environment variable, port registry, or external service. If state is only worker-local, keep it instance-local and do not pretend it is global.

## Hook ownership map for custom services

Advanced service testing starts with a hook inventory. Some hooks execute in the launcher process, some in workers, and some have access to the browser object. Mixing those responsibilities leads to services that seem fine in serial runs and fail in CI.

| Hook | Typical process | Good responsibility | Risk to test |
|---|---:|---|---|
| onPrepare | launcher | Start shared services, reserve ports, validate environment | Leaking processes when startup fails |
| onWorkerStart | launcher | Adjust worker args or capabilities before worker boot | Cross-worker capability contamination |
| beforeSession | worker | Final capability normalization before session creation | Mutating nested objects inconsistently |
| before | worker | Add custom commands after browser exists | Command registration that depends on wrong globals |
| beforeTest | worker | Start per-test timing, attach metadata | State not reset between retries |
| afterTest | worker | Collect artifacts for failed tests | Missing artifacts when error shape differs |
| after | worker | Tear down worker-local resources | Cleanup throwing and masking test failures |
| onComplete | launcher | Stop shared services, summarize results | Exit handling when teardown fails |

Use that map to decide where tests belong. Capability transformation can be unit tested with plain objects. Browser command registration can be tested with a small fake browser. Process startup needs an integration test around a manager, not a full browser session. Only the final smoke check needs the real WebdriverIO runner.

## Designing a capability policy service

Capability mutation is one of the most common reasons teams write services. A grid provider might require build names, tunnel identifiers, project tags, or browser-specific options. The mistake is to scatter that logic across specs and CI scripts. A custom service can centralize the policy, but only if its mutations are deterministic and easy to inspect.

Here is a deliberately small service that adds a build name and validates that Chrome sessions include a required option. The service uses real WebdriverIO service hook names, but the policy logic is kept in exported functions so it can be tested directly.

\`\`\`ts
// packages/wdio-services/src/build-policy-service.ts
import type { Capabilities, Options } from '@wdio/types';

type ServiceOptions = {
  buildName: string;
  requireHeadlessChrome?: boolean;
};

export function applyBuildName(
  capabilities: Capabilities.RequestedStandaloneCapabilities,
  buildName: string,
) {
  const vendorOptions = capabilities['bstack:options'] ?? {};

  capabilities['bstack:options'] = {
    ...vendorOptions,
    buildName,
  };
}

export function enforceChromePolicy(
  capabilities: Capabilities.RequestedStandaloneCapabilities,
  requireHeadlessChrome: boolean,
) {
  if (!requireHeadlessChrome) {
    return;
  }

  if (capabilities.browserName !== 'chrome') {
    return;
  }

  const chromeOptions = capabilities['goog:chromeOptions'];
  const args = Array.isArray(chromeOptions?.args) ? chromeOptions.args : [];

  if (!args.includes('--headless=new')) {
    throw new Error('Chrome sessions must include --headless=new in CI');
  }
}

export default class BuildPolicyService {
  private readonly options: ServiceOptions;

  constructor(options: ServiceOptions) {
    this.options = options;
  }

  beforeSession(
    _config: Options.Testrunner,
    capabilities: Capabilities.RequestedStandaloneCapabilities,
  ) {
    applyBuildName(capabilities, this.options.buildName);
    enforceChromePolicy(capabilities, Boolean(this.options.requireHeadlessChrome));
  }
}
\`\`\`

That code intentionally mutates the capability object because WebdriverIO hooks receive mutable configuration. The tests should verify that behavior directly. A cloned return value might look cleaner in ordinary application code, but a service hook must match runner semantics.

\`\`\`ts
// packages/wdio-services/test/build-policy-service.test.ts
import { describe, expect, it } from 'vitest';
import {
  applyBuildName,
  enforceChromePolicy,
} from '../src/build-policy-service';

describe('build policy service capability rules', () => {
  it('adds the build name under the BrowserStack vendor namespace', () => {
    const capabilities = {
      browserName: 'firefox',
      'bstack:options': {
        projectName: 'checkout',
      },
    };

    applyBuildName(capabilities, 'checkout-pr-481');

    expect(capabilities['bstack:options']).toEqual({
      projectName: 'checkout',
      buildName: 'checkout-pr-481',
    });
  });

  it('rejects CI Chrome sessions that are not headless', () => {
    const capabilities = {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: ['--disable-dev-shm-usage'],
      },
    };

    expect(() => enforceChromePolicy(capabilities, true)).toThrow(
      'Chrome sessions must include --headless=new in CI',
    );
  });
});
\`\`\`

Those tests do not prove that WebdriverIO can start Chrome. They prove the service will make the same capability decision every time. That is the right unit boundary.

## Testing hook order without launching browsers

When the interesting behavior is lifecycle ordering, create a harness that calls the service in the same sequence the runner would. This is especially useful for services that start a local dependency in onPrepare and stop it in onComplete, or that allocate per-test metadata in beforeTest and flush it in afterTest.

The harness does not need to mimic every WebdriverIO parameter. It needs to pass the fields your service reads, and it needs to fail loudly when a hook receives unexpected state. A good harness makes assumptions visible. If a future service begins reading specs, capabilities, or result objects, the test should show that new dependency.

| Service behavior | Minimal harness input | Assertion that catches real regressions |
|---|---|---|
| Starts one shared server | Fake config and temp directory | start called once even with multiple workers |
| Rewrites capabilities | Plain capability object | object contains exact vendor namespace changes |
| Adds browser commands | Browser double with addCommand | command name and function are registered |
| Captures failed-test screenshots | Fake browser with saveScreenshot | screenshot path includes suite and test title |
| Publishes summary in onComplete | Exit code and result object | failed counts are represented accurately |

For browser command registration, a fake browser object is usually enough. You do not need a remote session to prove that addCommand was called with the right name. Save the real session test for one integration check.

## Artifact capture that survives retries

Screenshot and trace services are deceptively hard because failure data is messy. Mocha, Jasmine, and Cucumber expose different shapes. Retries can create multiple failures with the same title. Workers can write at the same time. Windows path rules can break artifact names that passed on macOS.

A robust artifact service should derive file names from stable parts, sanitize aggressively, include retry information when available, and avoid throwing from the artifact path on the same failure it is trying to explain. If screenshot capture fails, log it and preserve the original test error.

The testable part is the path builder and the decision about whether an artifact is required. The hook can then be thin: if afterTest receives passed false, call the artifact writer with a sanitized name and the current browser.

## Service configuration in wdio.conf.ts

Custom services are configured in the services array. For class-based services, the practical pattern is to import the class into wdio.conf.ts and pass it with options. Keep those options explicit and environment-driven, not hidden inside the service constructor.

\`\`\`ts
// wdio.conf.ts
import BuildPolicyService from './packages/wdio-services/src/build-policy-service';

export const config = {
  runner: 'local',
  specs: ['./test/specs/**/*.ts'],
  maxInstances: 4,
  framework: 'mocha',
  services: [
    [
      BuildPolicyService,
      {
        buildName: process.env.CI_BUILD_NAME ?? 'local-dev',
        requireHeadlessChrome: process.env.CI === 'true',
      },
    ],
  ],
  capabilities: [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: ['--headless=new', '--disable-dev-shm-usage'],
      },
    },
  ],
};
\`\`\`

Do not put secrets, provider credentials, or large computed objects in the service options if they can be read at runtime from a secret manager or environment. The config file is often logged during debugging. Also avoid letting the service silently infer too much from process.env. If a flag changes test behavior, make it visible in the config.

## Integration testing a service with the runner

Unit tests are not enough for services that depend on runner behavior. The next layer is a small fixture project that uses the service in a real WebdriverIO run. Keep that fixture tiny: one spec, one browser, one obvious assertion. The purpose is to verify registration and hook wiring, not to retest your application.

A useful fixture for the build policy service would run a spec with valid Chrome options and expect exit code 0, then run a config missing --headless=new under CI mode and expect a non-zero exit with the policy error in stderr. That catches mistakes such as exporting the wrong class, using an incompatible service constructor, or relying on a hook signature that changed between WebdriverIO versions.

Integration tests are also where you discover version drift. WebdriverIO has evolved service typing and runner internals across major releases. If your service is published internally for many teams, test it against the exact WebdriverIO major versions you support. A compile-only test is not enough, because hook execution is the contract users depend on.

## Logging, observability, and failure shape

Service logs should tell an operator what the service did, not narrate every hook call. Log the build name applied to capabilities, the endpoint of a local server, the artifact directory, the worker id, and the final cleanup result. Avoid dumping full capabilities if they may contain credentials.

The failure shape matters as much as the message. If a policy violation happens before a browser session starts, throw a direct Error with a precise message. If cleanup fails after tests complete, consider preserving the original exit code and logging cleanup failure separately unless the cleanup failure indicates corruption. If artifact capture fails after a test already failed, do not replace the test failure with a screenshot failure.

This is where service testing becomes operational. Write tests that assert the error message for policy failures. Write tests that force the artifact writer to throw and verify that the afterTest hook does not hide the original result. These are not pedantic checks. They protect your CI debugging experience.

## Parallelism and shared resources

Parallel workers are the fastest way to expose weak service design. A service that uses a fixed port, a fixed filename, or a mutable singleton may work for months in a serial pipeline and then fail the day the suite is split across four workers.

Prefer allocation over assumption. Ask the OS for an available port, write worker-specific files under a temp root, and include cid or worker id where WebdriverIO provides it. If a shared dependency truly must be started once, start it in onPrepare and communicate its address to workers explicitly. Do not rely on module-level variables crossing process boundaries.

| Resource | Fragile pattern | More reliable service pattern |
|---|---|---|
| Local HTTP server | Always bind to 3000 | Bind to an available port and publish the URL |
| Screenshot directory | One filename per test title | Include worker id, retry count, and sanitized title |
| Provider tunnel | Start in every worker | Start once in launcher, stop in onComplete |
| Browser command setup | Patch global browser in module scope | Register commands in before after browser exists |
| Capability tags | Append mutable arrays repeatedly | Normalize tags once in beforeSession |

The test strategy follows the resource. For path generation, unit test many titles and retry combinations. For port allocation, use an integration test around the server manager. For provider tunnels, mock the provider client at the service boundary and run one real tunnel check manually or in a protected nightly job.

## Versioning internal services

Once several repositories depend on a service, treat it like an internal package. Version it, document supported WebdriverIO versions, and publish a migration note when hook behavior changes. A service that silently changes capability names can invalidate provider dashboards, billing labels, or test filtering.

The tests should encode compatibility. Keep fixture configs for the supported runner versions. Add regression tests for every provider-specific field you set. If a provider deprecates a namespace or option, write tests for the old and new behavior during the migration window, then remove the old behavior deliberately.

## Frequently Asked Questions

### Should I test a WebdriverIO service with WebdriverIO itself?

Use WebdriverIO for a small integration fixture, but do not make every service test launch a browser. Most service behavior is policy, pathing, process management, or hook wiring. Unit test those pieces directly, then keep one or two runner-level checks to prove the service is registered correctly.

### Which hook should mutate capabilities?

beforeSession is the usual place for final per-session capability changes because it runs before the session is created in the worker. Use onWorkerStart only when you need launcher-side worker preparation. Avoid mutating capabilities after the browser session exists because the remote provider has already received them.

### How do I keep artifact capture from making failures noisier?

Make artifact capture best-effort after a test failure. If saveScreenshot or a trace upload fails, log the artifact error and preserve the original test failure. The artifact service exists to improve diagnosis, not to replace useful assertion errors with secondary filesystem problems.

### Can a service share state between onPrepare and beforeTest?

Not by ordinary in-memory variables. Launcher hooks and worker hooks can run in different processes. Share only explicit data, such as a URL written to config, a temp file, an environment variable, or an external store. Test that channel directly.

### When should a custom service become a package?

Package it once more than one suite depends on it, once it talks to an external provider, or once a mistake would affect many teams. At that point, add versioned fixtures, a changelog, and compatibility tests against the WebdriverIO versions you support.
`,
};
