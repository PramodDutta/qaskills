import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SDET Roadmap Day-by-Day 90 Day Plan for 2026',
  description:
    'A day-by-day 90-day plan to become a Software Development Engineer in Test. Daily learning objectives, exercises, projects, and milestones to land your first SDET role.',
  date: '2026-05-21',
  category: 'Career',
  content: `
# SDET Roadmap Day-by-Day 90 Day Plan for 2026

The Software Development Engineer in Test (SDET) role has become one of the most demanded and well-compensated specializations in QA over the last five years. Companies hire SDETs to do what traditional manual testers can't: write production-grade test code, automate at scale across UI, API, and data layers, integrate test pipelines into CI, and contribute to test infrastructure and frameworks. The path from manual tester or junior developer to SDET is steep but well-defined.

This guide presents a 90-day plan to acquire core SDET skills, build a portfolio, and prepare for SDET interviews. It assumes you start with basic programming knowledge (loops, conditionals, functions in any language) and the willingness to commit 2-3 hours per day. The plan covers Python or Java fundamentals, web automation with Playwright or Selenium, API testing, CI/CD, performance testing fundamentals, and interview preparation. Each day has specific learning objectives and exercises. For other career paths see [QA Engineer vs SDET vs Test Architect](/blog/qa-engineer-vs-sdet-vs-test-architect) and browse the [skills directory](/skills) for curated AI agent skills.

## Phase Overview

The 90 days split into three phases. Days 1-30 build programming and automation fundamentals. Days 31-60 build framework skills and a portfolio project. Days 61-90 cover advanced topics, interview prep, and applications. Adjust the pace to your background; absolute beginners might extend each phase by 30%.

| Phase | Days | Focus | Output |
|---|---|---|---|
| Foundation | 1-30 | Programming, basic web/API automation | 3 small projects |
| Framework | 31-60 | Page Object Model, CI, scalable patterns | Portfolio project |
| Mastery | 61-90 | System design, advanced topics, interviews | Job-ready |

## Phase 1: Foundation (Days 1-30)

### Days 1-7: Programming Fundamentals

Pick one language and stick to it. Python and Java are the most demanded in SDET roles. JavaScript/TypeScript is growing rapidly. Pick the one most used in your target industry.

| Day | Topic | Exercise |
|---|---|---|
| 1 | Setup environment, hello world, variables | Solve 5 easy LeetCode problems |
| 2 | Lists, dicts, control flow | Build a number guesser CLI |
| 3 | Functions, modules | Refactor day 2 into modules |
| 4 | Classes and OOP | Build an inventory system class |
| 5 | Exception handling | Add error handling to day 4 |
| 6 | File I/O and JSON | Read/write a JSON config |
| 7 | Mini-project: Todo CLI | Build a CLI with add/list/done |

By end of week 1 you should be comfortable writing 50-line programs without reference.

### Days 8-14: Web Automation Basics

\`\`\`python
# Day 8: First Playwright script
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto("https://practice.qaskills.sh")
    page.fill("#email", "demo@example.com")
    page.click("button[type=submit]")
    assert page.url.endswith("/dashboard")
    browser.close()
\`\`\`

| Day | Topic | Exercise |
|---|---|---|
| 8 | Install Playwright, first page navigation | Navigate to 3 sites, take screenshots |
| 9 | Selectors: CSS, text, role | Find 10 elements by different selectors |
| 10 | Form filling, clicks | Automate a login form |
| 11 | Assertions and waits | Add assertions to day 10 |
| 12 | Multiple pages, tabs | Test a multi-page checkout flow |
| 13 | Screenshots, videos, traces | Capture and review a failure |
| 14 | Mini-project: Login + dashboard test | Working end-to-end test |

### Days 15-21: API Testing

\`\`\`python
# Day 15: First API test with pytest + requests
import requests

def test_get_users():
    response = requests.get("https://api.example.com/users")
    assert response.status_code == 200
    users = response.json()
    assert isinstance(users, list)
    assert len(users) > 0

def test_create_user():
    response = requests.post(
        "https://api.example.com/users",
        json={"name": "Alice", "email": "alice@example.com"}
    )
    assert response.status_code == 201
    assert response.json()["id"] is not None
\`\`\`

| Day | Topic | Exercise |
|---|---|---|
| 15 | HTTP fundamentals, GET requests | Test 3 public APIs |
| 16 | POST, PUT, DELETE | Build a CRUD test for a mock API |
| 17 | Status codes, headers | Verify response headers and status |
| 18 | JSON parsing and assertions | Assert specific JSON fields |
| 19 | Auth: API keys, Bearer tokens | Test an auth-protected endpoint |
| 20 | Test data setup and teardown | Create and clean up test data |
| 21 | Mini-project: REST API test suite | 20+ tests for a public API |

### Days 22-30: pytest and Test Organization

\`\`\`python
# Day 22: First pytest fixture
import pytest

@pytest.fixture
def authenticated_client():
    client = ApiClient()
    client.login("user@example.com", "demo")
    yield client
    client.logout()

def test_get_profile(authenticated_client):
    response = authenticated_client.get("/profile")
    assert response.status_code == 200
\`\`\`

| Day | Topic | Exercise |
|---|---|---|
| 22 | pytest fixtures | Refactor day 21 with fixtures |
| 23 | pytest parametrize | Add data-driven tests |
| 24 | pytest markers and selection | Tag tests, run subsets |
| 25 | conftest.py and shared fixtures | Centralize fixtures |
| 26 | Test reports (HTML, Allure) | Generate reports |
| 27 | Mocking with unittest.mock | Mock external services |
| 28 | Code coverage with pytest-cov | Measure coverage |
| 29-30 | End-of-phase 1 portfolio refactor | Polish 3 projects on GitHub |

## Phase 2: Framework (Days 31-60)

### Days 31-37: Page Object Model

Move from script-style tests to structured frameworks.

\`\`\`python
# Day 31: First Page Object
class LoginPage:
    def __init__(self, page):
        self.page = page
        self.email_input = page.locator("#email")
        self.password_input = page.locator("#password")
        self.submit_button = page.locator("button[type=submit]")

    def navigate(self):
        self.page.goto("https://practice.qaskills.sh/login")
        return self

    def login(self, email, password):
        self.email_input.fill(email)
        self.password_input.fill(password)
        self.submit_button.click()
        return DashboardPage(self.page)
\`\`\`

| Day | Topic | Exercise |
|---|---|---|
| 31 | Page Object pattern intro | Build LoginPage |
| 32 | Inheriting BasePage | Build 3 pages |
| 33 | Fluent return-self pattern | Chain page actions |
| 34 | Component objects | Extract a Header component |
| 35 | Locator strategies | Replace brittle selectors |
| 36 | Page assertions vs test assertions | Decide where logic lives |
| 37 | Refactor portfolio: POM | Apply to login + checkout |

### Days 38-44: Test Data and Configuration

| Day | Topic | Exercise |
|---|---|---|
| 38 | Config files (JSON, YAML, env) | Externalize URLs and creds |
| 39 | Test data: fixtures vs builders | Build a user factory |
| 40 | Faker.js / Python Faker | Generate random test data |
| 41 | Database setup for tests | Seed and clean a DB |
| 42 | Test isolation strategies | Each test in its own state |
| 43 | Parallel-safe test design | Run tests in parallel |
| 44 | Refactor portfolio: data | Make data-driven |

### Days 45-51: CI/CD Integration

| Day | Topic | Exercise |
|---|---|---|
| 45 | Git fundamentals refresher | Clean branch workflow |
| 46 | GitHub Actions basics | First workflow that runs lint |
| 47 | Workflow for running pytest | CI runs tests on push |
| 48 | Caching dependencies | Speed up CI |
| 49 | Matrix strategy: multi-browser | Run on Chrome and Firefox |
| 50 | Publishing test reports | Allure or HTML in artifacts |
| 51 | Refactor portfolio: CI | Green CI on every push |

### Days 52-60: Build Portfolio Project

A real portfolio project demonstrates everything together. Pick a public website with rich functionality (a demo e-commerce site, a SaaS dashboard, etc.) and build a comprehensive test suite.

\`\`\`
my-sdet-portfolio/
├── README.md
├── pyproject.toml
├── pytest.ini
├── .github/workflows/ci.yml
├── conftest.py
├── tests/
│   ├── ui/
│   │   ├── test_login.py
│   │   ├── test_search.py
│   │   ├── test_checkout.py
│   │   └── test_account.py
│   ├── api/
│   │   ├── test_products.py
│   │   └── test_orders.py
│   └── integration/
│       └── test_e2e_purchase.py
├── pages/
│   ├── base_page.py
│   ├── login_page.py
│   └── ...
├── utils/
│   ├── api_client.py
│   ├── data_factory.py
│   └── config.py
└── data/
    ├── users.json
    └── products.csv
\`\`\`

Spend days 52-60 building this. Document everything in the README. Include CI badge, coverage badge, screenshots. This becomes your interview talking piece.

## Phase 3: Mastery (Days 61-90)

### Days 61-67: Performance Testing Basics

\`\`\`javascript
// Day 61: First k6 script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const res = http.get('https://api.example.com/products');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
\`\`\`

| Day | Topic | Exercise |
|---|---|---|
| 61 | k6 install, first script | Test a public API |
| 62 | Thresholds and SLOs | Add SLO-based pass/fail |
| 63 | Stages and ramping | Build a realistic ramp |
| 64 | Scenarios and arrival rate | Open vs closed model |
| 65 | Result analysis | Read p95, p99 |
| 66 | k6 in CI | Add to portfolio |
| 67 | Mini-project: load test API | 5+ scenarios |

### Days 68-74: Advanced Topics

| Day | Topic | Exercise |
|---|---|---|
| 68 | Mocking services (MSW, WireMock) | Mock a backend |
| 69 | Contract testing (Pact) | Provider-consumer test |
| 70 | Visual regression (Playwright snapshots) | Add to portfolio |
| 71 | Accessibility (axe-core) | Audit a page |
| 72 | Mobile basics (Appium intro) | First Appium script |
| 73 | Docker for tests | Containerize test runs |
| 74 | Kubernetes basics | Deploy a test job |

### Days 75-81: System Design and Architecture

| Day | Topic | Exercise |
|---|---|---|
| 75 | Test pyramid revisited | Document portfolio's pyramid |
| 76 | When to test at each layer | Justify decisions |
| 77 | Test environment strategies | Document staging vs prod |
| 78 | Data management at scale | Design test data flow |
| 79 | Parallel execution patterns | Optimize portfolio run time |
| 80 | Flaky test management | Identify and fix 3 flakies |
| 81 | Practice: design a test strategy | Write a 5-page doc |

### Days 82-90: Interview Prep and Applications

| Day | Topic | Exercise |
|---|---|---|
| 82 | Resume polish | Apply [resume template](/blog/test-automation-engineer-resume-template) |
| 83 | LinkedIn optimization | Update profile |
| 84 | Mock interview: coding | LeetCode easy/medium |
| 85 | Mock interview: SDET-specific | See [mock interview](/blog/sdet-mock-interview-questions-with-answers) |
| 86 | Behavioral prep | See [behavioral interview](/blog/behavioral-interview-questions-qa-engineers) |
| 87 | System design prep | See [test framework architecture guide](/blog/test-automation-framework-architecture) |
| 88-89 | Apply to 20 positions | Networking + applications |
| 90 | Reflect and continue | Plan next 90 days |

## Resume Bullet Examples

After 90 days, sample resume bullets you can write:

- "Built end-to-end test framework using Python, Playwright, and pytest covering 80+ scenarios with parallel execution in CI"
- "Achieved 95% test reliability by implementing explicit waits, retry policies, and proper test isolation patterns"
- "Designed Page Object Model architecture reducing duplication 60% and cutting maintenance time per feature"
- "Implemented k6 performance test suite for REST APIs with SLO-backed thresholds and CI pipeline integration"
- "Integrated test pipelines with GitHub Actions matrix strategy running Chrome and Firefox in parallel"

## Common Pitfalls

Five mistakes 90-day SDET students make:

1. **Trying too many tools.** Pick one stack and go deep. You can always learn alternatives later.
2. **No portfolio.** Without a GitHub repo with real code, your resume is just claims.
3. **Skipping CI.** SDETs live in CI. Without CI experience you're a tester who codes, not an SDET.
4. **Not networking.** 70% of jobs are filled through referrals. Network from day 1.
5. **Quitting at day 85.** The last week of interviews and applications matters most. Push through.

## Salary Expectations

Entry-level SDET salaries vary significantly by region:

| Region | Junior SDET (0-2 yrs) | Mid SDET (2-5 yrs) | Senior SDET (5+ yrs) |
|---|---|---|---|
| US (SF/NYC) | $90k-$130k | $130k-$180k | $180k-$250k |
| US (other) | $70k-$110k | $100k-$140k | $130k-$200k |
| EU (London) | £45k-£70k | £70k-£100k | £100k-£140k |
| India | INR 8-15L | INR 15-30L | INR 30-60L |
| Remote (US-based) | $80k-$120k | $120k-$160k | $160k-$220k |

For more on roles see [QA Engineer vs SDET vs Test Architect](/blog/qa-engineer-vs-sdet-vs-test-architect).

## Conclusion

The 90-day SDET plan is intense but achievable for committed learners. The key is daily progress and a tangible portfolio. By day 90 you should have three GitHub projects, a polished CI pipeline, a portfolio website or LinkedIn presence, and 20+ applications in flight.

Browse the [skills directory](/skills) for AI agent skills that accelerate your learning. Read the related [SDET mock interview questions](/blog/sdet-mock-interview-questions-with-answers), [test automation engineer resume template](/blog/test-automation-engineer-resume-template), and [test architect roadmap](/blog/test-architect-roadmap-2026) for next steps.
`,
};
