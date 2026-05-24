import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework Listeners Complete Reference',
  description:
    'Build Robot Framework listeners for event-driven test extensions. Listener API v2 and v3, hooks, custom reporters, integration with Slack, Jira, and CI tools.',
  date: '2026-05-11',
  category: 'Reference',
  content: `
# Robot Framework Listeners Complete Reference

Robot Framework listeners are the framework's plugin mechanism - they let you respond to test execution events in real time without modifying tests themselves. Whether you want to post failure notifications to Slack, create Jira tickets for flaky tests, stream metrics to Datadog, or build custom reporters, listeners are the right tool. They observe events like start_test, end_test, log_message, start_keyword, end_keyword, and so on, and execute your Python code in response. Combined with the rich attribute dictionaries Robot provides, listeners can build sophisticated integrations with very little code.

This complete reference covers the listener API in depth - both the older v2 API and the modern v3 API, the event lifecycle, custom logging patterns, integration with monitoring and ticketing systems, and packaging listeners for distribution. Examples cover a Slack notifier, a flaky test detector, a TestRail uploader, and a Datadog metrics emitter. By the end you'll be ready to extend Robot Framework execution with your own listeners that fit your team's workflow.

## Key Takeaways

- Listeners are Python classes registered via --listener flag
- v2 API uses dict attributes; v3 API uses ExecutionResult model objects
- Events fire at every level: suite, test, keyword, log message
- Listeners can modify behavior, not just observe (v3 only)
- Multiple listeners can run together
- Library listeners attach to specific libraries
- Common use: notifications, reporting, metrics

---

## Basic Listener

\`\`\`python
# listeners/SimpleListener.py

class SimpleListener:
    ROBOT_LISTENER_API_VERSION = 2

    def start_suite(self, name, attributes):
        print(f'Suite started: {name}')

    def end_suite(self, name, attributes):
        print(f'Suite ended: {name} - {attributes["status"]}')

    def start_test(self, name, attributes):
        print(f'Test started: {name}')

    def end_test(self, name, attributes):
        status = attributes['status']
        print(f'Test ended: {name} - {status}')
\`\`\`

Use it:

\`\`\`bash
robot --listener listeners/SimpleListener.py tests/
\`\`\`

## Listener API Versions

| Version | Status | API Style |
|---------|--------|-----------|
| v2 | Stable | Dict attributes |
| v3 | Stable | Model objects with mutation |

For most use cases v2 is enough. Use v3 when you need to modify test results.

## Available Events

\`\`\`python
class FullListener:
    ROBOT_LISTENER_API_VERSION = 2

    def start_suite(self, name, attrs): pass
    def end_suite(self, name, attrs): pass
    def start_test(self, name, attrs): pass
    def end_test(self, name, attrs): pass
    def start_keyword(self, name, attrs): pass
    def end_keyword(self, name, attrs): pass
    def log_message(self, message): pass
    def message(self, message): pass
    def library_import(self, name, attrs): pass
    def resource_import(self, name, attrs): pass
    def variables_import(self, name, attrs): pass
    def output_file(self, path): pass
    def log_file(self, path): pass
    def report_file(self, path): pass
    def xunit_file(self, path): pass
    def debug_file(self, path): pass
    def close(self): pass
\`\`\`

## Attributes Available

The attrs dict for end_test contains:

\`\`\`python
{
    'id': 's1-t1',
    'longname': 'Suite.Test',
    'doc': 'Test documentation',
    'tags': ['smoke', 'auth'],
    'starttime': '20260512 10:00:00.000',
    'endtime': '20260512 10:00:05.500',
    'elapsedtime': 5500,
    'status': 'PASS',  # or FAIL or SKIP
    'message': '',  # error message if FAIL
    'template': '',
    'critical': 'yes',
}
\`\`\`

## Slack Notifier

\`\`\`python
# listeners/SlackNotifier.py
import requests
import os

class SlackNotifier:
    ROBOT_LISTENER_API_VERSION = 2

    def __init__(self):
        self.webhook = os.environ['SLACK_WEBHOOK']
        self.failed_tests = []

    def end_test(self, name, attrs):
        if attrs['status'] == 'FAIL':
            self.failed_tests.append({
                'name': name,
                'message': attrs['message'],
                'tags': attrs['tags'],
            })

    def close(self):
        if not self.failed_tests:
            return
        text = f'Robot run had {len(self.failed_tests)} failures:\\n'
        for t in self.failed_tests:
            text += f'- *{t["name"]}*: {t["message"]}\\n'
        requests.post(self.webhook, json={'text': text})
\`\`\`

\`\`\`bash
SLACK_WEBHOOK=https://hooks.slack.com/... robot --listener listeners/SlackNotifier.py tests/
\`\`\`

## Flaky Test Detector

\`\`\`python
# listeners/FlakyDetector.py
import json
import os
from collections import defaultdict

class FlakyDetector:
    ROBOT_LISTENER_API_VERSION = 2
    STATE_FILE = 'flaky_state.json'

    def __init__(self):
        self.results = {}

    def end_test(self, name, attrs):
        self.results[name] = attrs['status']

    def close(self):
        # Load previous run
        prev = {}
        if os.path.exists(self.STATE_FILE):
            with open(self.STATE_FILE) as f:
                prev = json.load(f)

        # Find tests that flipped state
        flips = []
        for name, status in self.results.items():
            if name in prev and prev[name] != status:
                flips.append((name, prev[name], status))

        # Update state
        with open(self.STATE_FILE, 'w') as f:
            json.dump(self.results, f, indent=2)

        # Report
        if flips:
            print('FLAKY TESTS DETECTED:')
            for name, old, new in flips:
                print(f'  {name}: {old} -> {new}')
\`\`\`

## TestRail Uploader

\`\`\`python
# listeners/TestRailUploader.py
import requests
import os

class TestRailUploader:
    ROBOT_LISTENER_API_VERSION = 2

    def __init__(self):
        self.url = os.environ['TESTRAIL_URL']
        self.auth = (os.environ['TESTRAIL_USER'], os.environ['TESTRAIL_KEY'])
        self.run_id = os.environ['TESTRAIL_RUN_ID']
        self.results = []

    def end_test(self, name, attrs):
        case_id = self._extract_case_id(attrs['tags'])
        if not case_id:
            return
        status_id = 1 if attrs['status'] == 'PASS' else 5
        self.results.append({
            'case_id': case_id,
            'status_id': status_id,
            'comment': attrs['message'],
        })

    def _extract_case_id(self, tags):
        for t in tags:
            if t.startswith('TC-'):
                return int(t[3:])
        return None

    def close(self):
        if not self.results:
            return
        requests.post(
            f'{self.url}/index.php?/api/v2/add_results_for_cases/{self.run_id}',
            auth=self.auth,
            json={'results': self.results},
        )
\`\`\`

## Datadog Metrics

\`\`\`python
# listeners/DatadogMetrics.py
from datadog import statsd
import os

class DatadogMetrics:
    ROBOT_LISTENER_API_VERSION = 2

    def __init__(self):
        os.environ.setdefault('STATSD_HOST', 'localhost')

    def end_test(self, name, attrs):
        tags = [f'tag:{t}' for t in attrs['tags']] + [
            f'status:{attrs["status"].lower()}',
        ]
        statsd.increment('robot.test.executions', tags=tags)
        statsd.histogram('robot.test.duration', attrs['elapsedtime'], tags=tags)

    def end_suite(self, name, attrs):
        statsd.gauge('robot.suite.duration', attrs['elapsedtime'], tags=[f'suite:{name}'])
\`\`\`

## Library Listener

Attach a listener to a library so it activates only when the library is imported:

\`\`\`python
class MyLibrary:
    ROBOT_LIBRARY_SCOPE = 'GLOBAL'
    ROBOT_LIBRARY_LISTENER = None

    def __init__(self):
        self.ROBOT_LIBRARY_LISTENER = self

    def start_test(self, name, attrs):
        # Auto-setup before each test
        self._connect()

    def end_test(self, name, attrs):
        # Auto-teardown
        self._disconnect()
\`\`\`

## Listener v3 - Modifying Results

\`\`\`python
# listeners/v3_modifier.py

class TestModifier:
    ROBOT_LISTENER_API_VERSION = 3

    def end_test(self, data, result):
        # Modify test result
        if 'retry' in result.tags and result.failed:
            result.message += '\\n[Marked for retry]'
            result.status = 'SKIP'
\`\`\`

This can be useful for soft-failing certain tests in CI.

## CI Integration

\`\`\`yaml
name: Robot With Listeners
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install robotframework requests datadog
      - run: robot --listener listeners/SlackNotifier.py --listener listeners/DatadogMetrics.py tests/
        env:
          SLACK_WEBHOOK: \${{ secrets.SLACK_WEBHOOK }}
          DATADOG_API_KEY: \${{ secrets.DATADOG_API_KEY }}
\`\`\`

## Multiple Listeners

You can use --listener multiple times:

\`\`\`bash
robot --listener Slack --listener TestRail --listener Datadog tests/
\`\`\`

Each runs independently.

## Listener Comparison

| Listener | Purpose | Performance |
|---------|---------|-------------|
| Slack notifier | Failure alerts | Low overhead |
| TestRail uploader | Sync with TestRail | Network calls at end |
| Flaky detector | Track state changes | Disk write at end |
| Datadog metrics | Real-time monitoring | StatsD UDP |
| HTML beautifier | Custom reports | Disk write at end |

## Listener Best Practices

| Practice | Why |
|----------|-----|
| Use close() for batch operations | Avoid per-test network calls |
| Catch exceptions silently | Don't break test runs |
| Make listeners idempotent | Reruns shouldn't break |
| Log to stderr separately | Don't pollute Robot logs |
| Version your listeners | Track behavior changes |

## Real Suite Example

\`\`\`bash
robot \\
  --listener listeners/SlackNotifier.py \\
  --listener listeners/TestRailUploader.py \\
  --listener listeners/DatadogMetrics.py \\
  --listener listeners/FlakyDetector.py \\
  --outputdir results \\
  tests/
\`\`\`

\`\`\`python
# listeners/CompoundListener.py
class CompoundListener:
    """Combines multiple listener behaviors into one file."""
    ROBOT_LISTENER_API_VERSION = 2

    def __init__(self):
        self.start_time = None
        self.results = []

    def start_suite(self, name, attrs):
        print(f'Starting: {name}')

    def end_test(self, name, attrs):
        self.results.append((name, attrs['status'], attrs['elapsedtime']))

    def close(self):
        passed = sum(1 for r in self.results if r[1] == 'PASS')
        failed = sum(1 for r in self.results if r[1] == 'FAIL')
        avg_duration = sum(r[2] for r in self.results) / max(len(self.results), 1)
        print(f'Summary: {passed} passed, {failed} failed, avg {avg_duration}ms per test')
\`\`\`

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| Network call per test | Buffer in close() |
| Listener raises uncaught exception | Try/except around handler |
| Mutating attrs dict in v2 | Use v3 model objects |
| Long blocking operations | Spawn background thread |
| Hardcoded credentials | Env vars |

## Packaging As PyPI Package

\`\`\`
robotframework_company_listeners/
  pyproject.toml
  src/
    company_listeners/
      __init__.py
      slack.py
      testrail.py
\`\`\`

\`\`\`toml
[project]
name = "robotframework-company-listeners"
version = "1.0.0"
\`\`\`

Then teams install with pip and reference by name:

\`\`\`bash
pip install robotframework-company-listeners
robot --listener company_listeners.slack tests/
\`\`\`

## Debugging Listeners

When a listener doesn't appear to be running:

1. Verify the path: \`robot --listener /full/path/Listener.py tests/\`
2. Check ROBOT_LISTENER_API_VERSION is set
3. Add print statements to confirm methods are called
4. Run with --loglevel DEBUG to see listener registration

## Conclusion

Robot Framework listeners are the most powerful extension point in the framework. With a few lines of Python, you can integrate Robot into Slack, Jira, TestRail, Datadog, Prometheus, custom dashboards, and anything else your organization uses. They run alongside your tests without modifying them, so existing suites can be enhanced overnight. The combination of simple v2 API and powerful v3 API covers everything from one-off notifications to complex result modification.

Start with a Slack notifier - it's the highest-value listener you can write in an hour. Then layer in metrics, ticketing, and flake detection as needed. Within a sprint your CI runs will produce far more actionable signal. Explore the [skills directory](/skills) or read the [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) for adjacent topics.
`,
};
