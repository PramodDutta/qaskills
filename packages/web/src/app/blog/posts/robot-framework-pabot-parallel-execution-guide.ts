import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework Pabot Parallel Execution Complete Guide',
  description:
    'Speed up Robot Framework test suites with Pabot. Process and test-level parallelism, shared state, ordering, resource locks, and CI integration patterns.',
  date: '2026-05-09',
  category: 'Guide',
  content: `
# Robot Framework Pabot Parallel Execution Complete Guide

Test suite runtime is one of the most consequential metrics in test automation. A suite that takes thirty minutes will run on every PR; a suite that takes six hours will run only nightly, if at all. The single biggest lever for cutting Robot Framework runtime is parallelization, and the Pabot library is the standard tool to do it. Pabot splits a Robot suite into multiple parallel processes (or even parallel tests within a suite), executes them concurrently, and merges the results into a single report. With proper configuration, suites that took an hour serially can finish in five minutes on a sixteen-core CI runner.

This complete guide covers everything you need to know about Pabot in 2026: installation, command-line options, process-level versus test-level parallelism, sharing state between processes, ordering dependencies, resource locks for limited assets like devices or accounts, and integration with CI/CD pipelines. Real examples cover UI suites, API matrices, and mobile testing across multiple devices. By the end, you'll be ready to dramatically reduce your suite runtime without sacrificing reliability.

## Key Takeaways

- Pabot wraps Robot Framework to run suites in parallel processes
- Process-level parallelism is the default - one suite per process
- Test-level parallelism (--testlevelsplit) splits within a suite
- Shared state requires explicit handling - environment vars, files, or Pabotlib
- Resource locks prevent conflicts on shared assets
- Results are auto-merged into a single output.xml
- Best speedup is 4-16x depending on suite shape

---

## Installation

\`\`\`bash
pip install robotframework-pabot
\`\`\`

## Basic Usage

\`\`\`bash
pabot --processes 4 tests/
\`\`\`

Replace the robot command with pabot. The --processes flag sets concurrency.

\`\`\`bash
pabot --processes auto tests/
\`\`\`

auto sets to CPU count.

## Process Level Parallelism

By default, Pabot runs one suite (folder or file) per process:

\`\`\`
tests/
  auth/
    login.robot
  search/
    search.robot
  checkout/
    checkout.robot
\`\`\`

With --processes 3, each suite runs in parallel.

## Test Level Parallelism

For one big suite, use --testlevelsplit:

\`\`\`bash
pabot --processes 8 --testlevelsplit tests/data_driven.robot
\`\`\`

Each test case becomes its own job. Best for data-driven tests with many independent rows.

## Combined Strategy

\`\`\`bash
pabot --processes 8 --testlevelsplit --include smoke tests/
\`\`\`

Run only smoke tests, splitting at test level, across eight processes.

## Pabot Output

After running, Pabot creates:

\`\`\`
pabot_results/
  process-0/
  process-1/
  ...
output.xml
log.html
report.html
\`\`\`

The top-level output.xml merges all process outputs.

## Sharing State With Pabotlib

For suites that need to share state across processes, use the Pabotlib library:

\`\`\`robot
*** Settings ***
Library    pabot.PabotLib

*** Test Cases ***
Set And Get Shared Value
    Set Parallel Value For Key    counter    0
    \${val}=    Get Parallel Value For Key    counter
    Log    Counter: \${val}
\`\`\`

This works only when run under pabot. Standalone robot runs ignore PabotLib calls.

## Resource Locks

When multiple tests need exclusive access to a shared resource (a test account, a phone number, a Stripe sandbox), use a lock:

\`\`\`robot
*** Settings ***
Library    pabot.PabotLib

*** Test Cases ***
Use Shared Phone Number
    Acquire Lock    test_phone
    Send SMS    +15555550100
    Verify SMS Received
    Release Lock    test_phone

Use Shared Phone Number Again
    Acquire Lock    test_phone
    Send SMS    +15555550100
    Verify SMS Received
    Release Lock    test_phone
\`\`\`

Only one test holds the lock at a time.

## Acquire And Auto Release

Combine with Teardown for safety:

\`\`\`robot
*** Test Cases ***
Locked Workflow
    [Setup]    Acquire Lock    payment_sandbox
    [Teardown]    Release Lock    payment_sandbox
    Submit Payment    4242424242424242
    Verify Payment In Dashboard
\`\`\`

## Value Set Pool

For test accounts or other rotating resources:

\`\`\`robot
*** Test Cases ***
Use Pooled Account
    \${account}=    Get Value From Set    test_accounts
    Login With    \${account.email}    \${account.password}
    Run Tests
\`\`\`

The pool is defined as a YAML file:

\`\`\`yaml
# pabot_pools.yaml
test_accounts:
  - {email: user1@example.com, password: pass1}
  - {email: user2@example.com, password: pass2}
  - {email: user3@example.com, password: pass3}
\`\`\`

Run with:

\`\`\`bash
pabot --processes 3 --resourcefile pabot_pools.yaml tests/
\`\`\`

## Ordering Dependencies

When suite A must finish before suite B, use --ordering file:

\`\`\`
# ordering.txt
{
--test
Pre Test
}
{
Test One
Test Two
}
\`\`\`

\`\`\`bash
pabot --ordering ordering.txt tests/
\`\`\`

Tests inside {} run in parallel; the blocks run sequentially.

## Per Process Environment Vars

Differentiate processes via PABOT_PROCESS_ID:

\`\`\`robot
*** Test Cases ***
Test On Different Port
    \${id}=    Get Environment Variable    PABOT_PROCESS_ID    0
    \${port}=    Evaluate    8000 + \${id}
    Test API On Port    \${port}
\`\`\`

Each process gets a unique numeric ID starting from 0.

## Pabot Vs Robot Comparison

| Aspect | robot | pabot |
|--------|-------|-------|
| Execution | Sequential | Parallel |
| Output | single output.xml | Merged from processes |
| State sharing | Easy | Requires PabotLib |
| Resource conflicts | Impossible | Possible without locks |
| Speed | 1x | up to N x (N = processes) |

## Performance Patterns

\`\`\`bash
# CPU-bound (API tests)
pabot --processes auto tests/api/

# Memory-heavy (browser tests)
pabot --processes 4 tests/ui/

# IO-bound (file processing)
pabot --processes 8 tests/io/

# Mixed suite with test-level split
pabot --processes 8 --testlevelsplit --include smoke tests/
\`\`\`

## Reordering Slowest Tests First

Pabot can reorder tests by runtime if you supply --suitestatlevel:

\`\`\`bash
pabot --processes 4 --suitestatlevel 2 tests/
\`\`\`

Or provide --ordering with slow tests at the top.

## Debugging Pabot Runs

When a test fails only under Pabot:

\`\`\`bash
robot tests/failing_test.robot
\`\`\`

If it passes solo but fails under Pabot, you have a race condition. Common causes:
- Shared database rows
- Hardcoded ports
- Reused test accounts
- Browser cookies bleeding
- Files written to the same path

## CI Pipeline

\`\`\`yaml
name: Parallel Robot Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install robotframework robotframework-pabot robotframework-seleniumlibrary
      - run: pabot --processes 4 --outputdir results --testlevelsplit tests/
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: results
          path: results/
\`\`\`

## Mobile Test Sharding

For mobile testing across devices:

\`\`\`bash
pabot --processes 4 --argumentfile device_args.txt tests/mobile/
\`\`\`

device_args.txt:

\`\`\`
--variable DEVICE:emulator-5554
--variable DEVICE:emulator-5556
--variable DEVICE:emulator-5558
--variable DEVICE:emulator-5560
\`\`\`

Each process targets a different device.

## Real Suite Example

\`\`\`robot
*** Settings ***
Documentation    Parallel-safe checkout suite
Library          SeleniumLibrary
Library          pabot.PabotLib
Suite Setup      Acquire Test Account
Suite Teardown   Release Test Account

*** Test Cases ***
Logged In Order Flow
    [Tags]    e2e
    Open Browser    \${BASE_URL}    headlesschrome
    Login    \${ACCOUNT.email}    \${ACCOUNT.password}
    Add Item    SKU-12345
    Submit Order
    Close Browser

Guest Checkout Flow
    [Tags]    e2e
    Open Browser    \${BASE_URL}    headlesschrome
    Add Item As Guest    SKU-67890
    Submit Order As Guest
    Close Browser

*** Keywords ***
Acquire Test Account
    \${ACCOUNT}=    Get Value From Set    test_accounts
    Set Suite Variable    \${ACCOUNT}    \${ACCOUNT}

Release Test Account
    Log    Releasing account: \${ACCOUNT.email}
\`\`\`

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| Shared test accounts without locks | Race conditions | Value pool + locks |
| Hardcoded ports | Conflicts | Per-process ports |
| Same DB rows across tests | Bleed | Per-test fixtures |
| Massive single suite | No parallelism | Split into folders |
| Too many processes | Resource exhaustion | Tune to runner |

## Tuning The Process Count

Start with --processes 4 and measure. If CPU is < 50%, increase. If memory swaps or browser processes time out, decrease.

| Suite Type | Recommendation |
|-----------|----------------|
| Pure API | 8-16 processes |
| Headless browser | 4-8 |
| With real database | 4-6 |
| Mobile emulators | 1 per emulator |

## Combining With Cloud Runners

GitHub Actions runners have 4 vCPUs typically; --processes 4 is the sweet spot. For larger jobs, use self-hosted runners or matrix builds:

\`\`\`yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: pabot --processes 4 --variable SHARD:\${{ matrix.shard }} tests/
\`\`\`

This gives 16-way parallelism (4 jobs x 4 processes).

## Conclusion

Pabot transforms Robot Framework from a sequential runner into a parallel powerhouse. With careful attention to shared state and resource conflicts, you can cut suite runtime by 4-16x without sacrificing reliability. The combination of process-level splits, test-level splits, value pools, and resource locks gives you fine-grained control over how parallelism interacts with your application's constraints.

Start by running pabot --processes 4 on your existing suite. Fix any race conditions that appear. Add resource locks where needed. Add a value pool for test accounts. Within a sprint or two, you'll have a fast, parallel-safe suite that the team trusts to run on every PR. Visit our [skills directory](/skills) or read about [selenium grid parallel testing](/blog/selenium-grid-docker-parallel-testing) for related approaches.
`,
};
