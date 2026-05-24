import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SDET Mock Interview Questions with Answers 2026',
  description:
    'Practice SDET interview questions with detailed answers and code. Cover coding, framework design, debugging, automation strategy, and system design questions.',
  date: '2026-05-22',
  category: 'Career',
  content: `
# SDET Mock Interview Questions with Answers 2026

SDET interviews in 2026 are technical and rigorous. Expect 4-6 rounds covering coding problems, framework design, debugging scenarios, automation strategy, and system design. Many companies blend these so a single round might touch all five. Strong candidates prepare for each category and practice articulating their thinking out loud, not just arriving at answers.

This guide presents 30 common SDET interview questions across five categories with detailed sample answers and code. We cover coding challenges (data structures, algorithms), framework design (architecture, patterns), debugging (root cause analysis), automation strategy (where to test what), and system design (test infrastructure). For complete career preparation see [SDET 90-day plan](/blog/sdet-roadmap-day-by-day-90-day-plan), [test automation resume template](/blog/test-automation-engineer-resume-template), and [behavioral interview questions](/blog/behavioral-interview-questions-qa-engineers). Browse the [skills directory](/skills).

## Category 1: Coding Problems

### Q1: Find duplicates in a list

\`\`\`python
# Question: Given a list of integers, return all elements that appear more than once.

def find_duplicates(nums):
    seen = set()
    duplicates = set()
    for n in nums:
        if n in seen:
            duplicates.add(n)
        else:
            seen.add(n)
    return list(duplicates)

# Test
assert sorted(find_duplicates([1, 2, 3, 2, 4, 3, 5])) == [2, 3]
assert find_duplicates([1, 2, 3]) == []
assert find_duplicates([]) == []
\`\`\`

**What the interviewer evaluates:** Did you ask about input constraints? Did you discuss time/space complexity (O(n) time, O(n) space)? Did you write test cases?

### Q2: Reverse a string

\`\`\`python
# Question: Reverse a string without using built-in reverse functions.

def reverse_string(s):
    chars = list(s)
    left, right = 0, len(chars) - 1
    while left < right:
        chars[left], chars[right] = chars[right], chars[left]
        left += 1
        right -= 1
    return ''.join(chars)

# Tests
assert reverse_string("hello") == "olleh"
assert reverse_string("") == ""
assert reverse_string("a") == "a"
\`\`\`

**Edge cases to mention:** Empty string, single char, Unicode characters (technically tricky).

### Q3: Word frequency counter

\`\`\`python
# Question: Given a text, return a dict mapping each word to its count.
# Treat words case-insensitively and ignore punctuation.

import re
from collections import Counter

def word_frequency(text):
    words = re.findall(r"\\w+", text.lower())
    return dict(Counter(words))

# Tests
assert word_frequency("The cat and the dog") == {"the": 2, "cat": 1, "and": 1, "dog": 1}
\`\`\`

### Q4: Validate balanced parentheses

\`\`\`python
def is_balanced(s):
    stack = []
    pairs = {')': '(', ']': '[', '}': '{'}
    for char in s:
        if char in '([{':
            stack.append(char)
        elif char in ')]}':
            if not stack or stack.pop() != pairs[char]:
                return False
    return len(stack) == 0

assert is_balanced("()") == True
assert is_balanced("([{}])") == True
assert is_balanced("(]") == False
assert is_balanced("(") == False
\`\`\`

### Q5: Test data anonymization

\`\`\`python
# Question: Given a dict of user data, anonymize fields like email and SSN.

import re

def anonymize(data):
    result = data.copy()
    if 'email' in result:
        local, domain = result['email'].split('@')
        result['email'] = f"{local[0]}***@{domain}"
    if 'ssn' in result:
        result['ssn'] = re.sub(r'\\d', '*', result['ssn'])[:-4] + result['ssn'][-4:]
    return result

user = {'name': 'Alice', 'email': 'alice@example.com', 'ssn': '123-45-6789'}
print(anonymize(user))
# {'name': 'Alice', 'email': 'a***@example.com', 'ssn': '***-**-6789'}
\`\`\`

## Category 2: Framework Design

### Q6: Design a Page Object for a login page

**Answer:**

\`\`\`python
# I would design with these principles:
# - Encapsulate locators
# - Provide high-level actions, not low-level clicks
# - Return either self (for chaining) or the next page object
# - No assertions inside the page (those live in tests)

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class LoginPage:
    URL = "https://app.example.com/login"

    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)
        self._email = (By.ID, "email")
        self._password = (By.ID, "password")
        self._submit = (By.ID, "submit")
        self._error = (By.CSS_SELECTOR, ".error")

    def navigate(self):
        self.driver.get(self.URL)
        return self

    def login_as(self, email, password):
        self._enter(self._email, email)
        self._enter(self._password, password)
        self.wait.until(EC.element_to_be_clickable(self._submit)).click()
        # Return next page based on success/failure
        try:
            self.wait.until(EC.url_contains("/dashboard"))
            from .dashboard_page import DashboardPage
            return DashboardPage(self.driver)
        except:
            return self  # Login failed; stay on page

    def get_error(self):
        return self.wait.until(EC.visibility_of_element_located(self._error)).text

    def _enter(self, locator, text):
        el = self.wait.until(EC.presence_of_element_located(locator))
        el.clear()
        el.send_keys(text)
\`\`\`

**Discussion points:** Locator strategy (IDs preferred), explicit wait pattern, return type (self vs next page), error handling.

### Q7: How would you structure a multi-language test framework?

**Answer:** "I would not. Multi-language frameworks add complexity for little benefit. Pick one language matching your engineering org's primary language. If your backend is Java, write tests in Java. If your stack is Python-heavy, use Python.

If the question is multi-test-tool (UI + API + perf), I would use a single language with multiple libraries. Example: Python + Playwright (UI) + pytest (API via requests) + Locust (perf). All Python, consistent fixtures, shared utilities.

The cost of multi-language is real: separate CI configs, separate dependencies, separate developer onboarding. Stick with one."

### Q8: How do you organize shared test data?

**Answer:** "Three layers:

1. **Static fixtures.** JSON or YAML files for data that never changes (canned users, sample products). Committed to git.

2. **Factory methods.** Python builders that produce realistic objects with random IDs. Used for data that needs uniqueness per test.

3. **API-generated data.** Tests call setup endpoints to create real data via the system under test. Most realistic; also slowest.

I prefer factories + cleanup over static fixtures because they survive schema changes better. Static fixtures rot when the API contract changes."

\`\`\`python
# Example factory
from faker import Faker
import uuid

faker = Faker()

class UserFactory:
    @staticmethod
    def create(role='standard', **overrides):
        defaults = {
            'id': str(uuid.uuid4()),
            'email': faker.email(),
            'name': faker.name(),
            'role': role,
            'created_at': faker.date_time(),
        }
        defaults.update(overrides)
        return defaults

# Usage in test
def test_admin_can_delete_user(api_client):
    admin = UserFactory.create(role='admin')
    target = UserFactory.create(role='standard')
    api_client.create_user(admin)
    api_client.create_user(target)
    response = api_client.delete_user(target['id'], as_user=admin)
    assert response.status_code == 204
\`\`\`

## Category 3: Debugging

### Q9: A test passes locally but fails in CI. What do you do?

**Answer:** "I work through possibilities systematically:

1. **Environment differences.** Compare versions: OS, browser, Python, dependencies. Locally I might have Chrome 124; CI has 123.

2. **Timing.** CI is often slower than local. Are there race conditions in the test? Add explicit waits.

3. **Test isolation.** Does the test depend on state from other tests? Check if test order matters.

4. **Resource constraints.** CI has less RAM/CPU. Headless browsers behave slightly differently.

5. **Network.** Local has direct access; CI may have proxies, DNS issues, rate limits.

6. **Data.** Different database state between local and CI.

I would reproduce the failure by matching CI conditions locally: same browser version, headless mode, same environment variables. If still passing locally, I would SSH/exec into a CI container during a failure and inspect."

### Q10: A test is flaky. It passes 80% of the time. What is your approach?

**Answer:** "Flakiness has root causes; ignoring it makes the suite useless. My process:

1. **Reproduce.** Run the test 50 times in a loop locally. Confirm flakiness rate.

2. **Add observability.** Screenshots on failure, browser console logs, network HAR, video.

3. **Identify the failure pattern.** Always at the same step? Always after a specific other test? Sometimes random?

4. **Fix the cause.**
   - Race condition: add explicit wait
   - Test pollution: improve setup/teardown
   - Environment dependence: containerize
   - Real bug: file and prioritize

5. **Verify the fix.** Run 100x without failure.

6. **Track.** Add to a flakiness dashboard. If something else surfaces later we can correlate."

### Q11: Tests are slow. The full suite takes 4 hours. What do you optimize?

**Answer:** "I profile first, then optimize. Steps:

1. **Measure per-test duration.** Pytest with --durations=20 shows the slowest.

2. **Categorize.**
   - Pure compute time (unavoidable)
   - Setup/teardown time (often optimizable)
   - Wait time for external dependencies (look for opportunities to mock)
   - Network time (cache or mock)

3. **Parallelize.** xdist for pytest, threads for JUnit. Aim for 4-16 parallel.

4. **Reduce scope.** Do you really need full E2E for all 500 tests, or are 200 unit tests + 100 integration + 50 E2E better?

5. **Smarter selection.** Only run tests affected by code changes (via pytest-testmon or similar).

Order of impact: parallelization > scope reduction > individual optimization."

## Category 4: Automation Strategy

### Q12: Where do you draw the line between unit, integration, and E2E tests?

**Answer:** "I follow the testing pyramid with practical refinements:

- **Unit (60-70% of tests):** Test pure functions, isolated classes. No I/O. Fast (sub-millisecond).
- **Integration (20-30%):** Test that components work together. Database, message queue, internal APIs. Real but mocked external dependencies.
- **E2E (5-15%):** Test full user journeys through real UI or API. Slow, fragile. Used sparingly for critical paths.

The key is to write tests at the lowest layer that gives you confidence. Don't write an E2E test for arithmetic; don't write a unit test for an HTTP round-trip."

### Q13: How do you test microservices?

**Answer:** "Multiple layers:

1. **Unit tests** for business logic.
2. **Service-level integration tests** with the real database, mocked external services.
3. **Contract tests** (Pact) to verify provider-consumer compatibility.
4. **End-to-end tests** for top user journeys only (5-10 max).
5. **Performance tests** on hot endpoints.

The contract test is the underrated one. Without it, breaking a downstream consumer goes undetected until staging or worse."

### Q14: How do you decide what to automate vs leave manual?

**Answer:** "Automate when:
- The test runs often (every PR, every release)
- The test is deterministic (same input always produces same output)
- The cost to automate is less than 4x the cost to run manually over a year

Don't automate when:
- The test runs rarely (compliance audits once a year)
- The test requires human judgment (visual aesthetics)
- The flow changes frequently (early-stage product)
- The test is exploratory (creative bug hunting)"

## Category 5: System Design

### Q15: Design test infrastructure for a 500-engineer org

**Answer:** "I would design with these layers:

1. **CI runner pool.** Self-hosted on Kubernetes with KEDA autoscaling. Each PR gets a pod with isolated browsers.

2. **Selenium Grid.** Kubernetes-based with 50-100 nodes auto-scaling. Browser images pinned to specific versions.

3. **Test data platform.** API-driven data generation service backed by Postgres. Each test gets unique data; cleanup runs nightly.

4. **Mock service hub.** WireMock or similar serving as a stand-in for external services (Stripe, Auth0). Versioned mock definitions per test.

5. **Results store.** S3 for artifacts (screenshots, videos, HAR). Postgres for structured results (pass/fail, durations).

6. **Dashboards.** Allure or self-built showing trends, flakiness, ownership.

7. **Alerting.** Slack notifications for build failures, flaky test detection, infrastructure issues.

8. **Documentation.** Internal docs site with framework guides, runbooks, FAQs.

Total infrastructure cost is roughly $50-100k/year cloud. Team to maintain: 3-5 SDETs and one tech lead."

### Q16: Design a flaky test detector

**Answer:** "Components:

1. **Result ingestion.** Parse JUnit XML or other CI test output. Store every run in a database with test name, branch, commit, status, duration.

2. **Flakiness analysis.** Nightly job computes flakiness score per test: percentage of runs with mixed results on the same commit.

3. **Reporting.** Dashboard sorted by flakiness score. Top 20 get assigned to owners.

4. **Auto-quarantine.** Tests above N% flakiness automatically marked as @flaky in code; CI continues to run them but doesn't fail builds on them. Owner must opt back in after fixing.

5. **Trends.** Charts showing org-wide flakiness over time. Use as a KPI for the SDET team."

\`\`\`python
# Sketch of detection logic
import sqlite3
from collections import defaultdict

def compute_flakiness(db_path):
    conn = sqlite3.connect(db_path)
    by_test_commit = defaultdict(list)

    for row in conn.execute("SELECT test_name, commit_sha, status FROM runs"):
        by_test_commit[(row[0], row[1])].append(row[2])

    flakiness = {}
    for (test, commit), statuses in by_test_commit.items():
        if 'pass' in statuses and 'fail' in statuses:
            flakiness.setdefault(test, 0)
            flakiness[test] += 1

    return sorted(flakiness.items(), key=lambda x: -x[1])
\`\`\`

### Q17: How would you load test a checkout flow?

**Answer:** "Approach:

1. **Define success.** What latency at what RPS is acceptable? Get this from product/business.

2. **Build the scenario.** k6 or Locust script that simulates: login -> browse -> add to cart -> checkout -> payment. Use realistic think times.

3. **Set thresholds.** p95 latency < 2s, error rate < 0.5%, throughput >= target.

4. **Ramp profile.** 5 min warm-up, 10 min sustained at target load, 5 min spike to 2x, cool-down.

5. **Execute.** Run from cloud-hosted load generators (k6 Cloud or Grafana Cloud k6). Multiple regions if your users are global.

6. **Observe.** Dashboards for latency, throughput, errors, plus backend (CPU, GC, DB connection pool).

7. **Analyze.** Identify the bottleneck (DB? cache? gateway?). File issues, retest after fixes."

### Remaining 13 Questions

For brevity, here are 13 more questions with brief answer pointers:

- **Q18: What's the difference between mock, stub, and fake?** Mock verifies interactions; stub returns canned answers; fake is a working but simplified implementation.
- **Q19: How do you test code you can't change?** Characterization tests pin current behavior, then refactor incrementally.
- **Q20: When would you use BDD?** When business stakeholders engage with tests; otherwise pure code-style tests are faster.
- **Q21: Explain test pyramid.** Many fast unit tests, fewer integration tests, fewest E2E tests.
- **Q22: How do you handle test environment dependencies?** Mock external services, run real database in container, control time and randomness.
- **Q23: What's a test smell?** Pattern indicating poorly designed tests: long setup, conditional logic, magic numbers, etc.
- **Q24: How do you test eventual consistency?** Polling with timeout, plus retries with backoff.
- **Q25: What's contract testing?** Verifying that consumer and provider services agree on API shape, without running both end-to-end.
- **Q26: How do you decide CI vs nightly?** Fast tests (under 5 min) on every PR; slow tests (over 10 min) nightly.
- **Q27: What's a flaky test?** A test that passes and fails non-deterministically on the same code.
- **Q28: How do you measure test value?** ROI: bugs caught vs time invested. Prioritize tests that catch frequently.
- **Q29: How do you onboard a new SDET?** Shadow for week 1, pair on real tasks week 2-3, independent work week 4+, regular check-ins.
- **Q30: What's the difference between integration and E2E?** Integration tests components together with mocked externals; E2E tests through real UI and real backend.

## Final Tips

Five things to remember in interviews:

1. **Think out loud.** The interviewer wants to see your process, not just the answer.
2. **Ask clarifying questions.** "What are the constraints?" "What's the expected input size?"
3. **Discuss tradeoffs.** Every solution has them. Naming them shows maturity.
4. **Write tests.** Even for code questions, add unit tests. Especially for SDET interviews.
5. **Be honest.** "I haven't used that exact tool, but here's how I would approach it" is fine.

## Conclusion

SDET interviews test the breadth of the role: coding ability, framework design judgment, debugging intuition, automation strategy thinking, and system design. Prepare across all five categories. Practice articulating your thinking out loud. Use this guide's questions as practice prompts.

For broader career prep see [SDET 90-day plan](/blog/sdet-roadmap-day-by-day-90-day-plan), [test automation resume template](/blog/test-automation-engineer-resume-template), and [behavioral interview questions](/blog/behavioral-interview-questions-qa-engineers). Browse the [skills directory](/skills) for AI agent skills that demonstrate competency.
`,
};
