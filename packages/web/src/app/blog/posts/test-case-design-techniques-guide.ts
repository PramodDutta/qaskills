import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Case Design Techniques -- Equivalence Partitioning, Boundary Values, and More',
  description:
    'Complete guide to test case design techniques. Covers equivalence partitioning, boundary value analysis, decision tables, state transition testing, and pairwise testing.',
  date: '2026-02-23',
  category: 'Guide',
  content: `
Designing effective test cases is the single most important skill a tester can develop. Without a systematic approach, you either test too much -- wasting time on redundant cases that add no new information -- or test too little, leaving critical defects hiding in untested corners of the application. **Test case design techniques** provide the intellectual framework for choosing the right inputs, the right combinations, and the right sequences to maximize defect detection with the minimum number of test cases. These techniques have been refined over decades by the testing community and form the foundation of the ISTQB certification syllabus. Whether you are testing a simple form validation or a complex business rules engine, mastering these techniques transforms your testing from guesswork into engineering.

## Key Takeaways

- **Equivalence partitioning** divides input data into groups where every value in a group should behave identically -- one test per partition is sufficient to represent the entire group
- **Boundary value analysis** targets the edges of partitions where the majority of defects cluster -- testing at min, max, and their immediate neighbors catches off-by-one errors
- **Decision table testing** systematically covers every combination of conditions and their expected outcomes, making it ideal for complex business rules
- **State transition testing** verifies that a system moves correctly between states in response to events, catching illegal transitions and missing error handling
- **Pairwise testing** reduces combinatorial explosion by ensuring every pair of parameter values appears in at least one test case -- often reducing hundreds of combinations to under a dozen
- **Combining multiple techniques** on the same feature delivers comprehensive coverage that no single technique can achieve alone

---

## Why Systematic Test Design Matters

Most teams fall into one of two traps. The first is **ad hoc testing** -- picking inputs at random, following intuition, and hoping to stumble onto bugs. This approach has poor coverage, is not repeatable, and gives false confidence. The second trap is **exhaustive testing** -- attempting to test every possible input, combination, and sequence. For a single text field that accepts 100 characters, testing every possible string would require more test cases than atoms in the universe. Exhaustive testing is mathematically impossible for any nontrivial system.

Systematic test case design techniques solve both problems. They give you a **principled way to select a small subset of tests** that provides maximum coverage. The core insight is that not all inputs are equally interesting. Defects tend to cluster around specific patterns: boundaries between valid and invalid ranges, combinations of conditions that interact in unexpected ways, and transitions between system states. By focusing your testing on these high-value areas, you achieve better defect detection with fewer test cases.

The **ISTQB Foundation Level syllabus** organizes these techniques into three categories:

| Category | Techniques | When to Use |
|---|---|---|
| **Black-box** | Equivalence partitioning, boundary value analysis, decision tables, state transition | You test based on requirements without seeing source code |
| **White-box** | Statement coverage, branch coverage, path coverage | You test based on code structure |
| **Experience-based** | Error guessing, exploratory testing, checklist-based | You leverage domain expertise and intuition |

This guide focuses on the black-box and experience-based techniques that deliver the highest return on investment for most testing scenarios.

---

## Equivalence Partitioning

**Equivalence partitioning** (EP) is the foundation of all systematic test design. The idea is simple but powerful: divide the input domain into groups -- called **partitions** or **equivalence classes** -- where every value within a group is expected to be processed identically by the system. If one value in the partition works correctly, every value in that partition should also work. If one value fails, every value should fail the same way.

This means you only need **one test case per partition** to represent the entire group. Instead of testing thousands of values, you test a handful of representatives.

Consider an age input field on a registration form with these business rules:

- Users aged 0--17 are minors (restricted access)
- Users aged 18--64 are standard adults (full access)
- Users aged 65+ are seniors (discount applied)
- Negative numbers are invalid
- Non-numeric input is invalid

Here are the equivalence partitions:

| Partition | Range | Type | Expected Behavior |
|---|---|---|---|
| **P1** | Less than 0 | Invalid | Error: "Age cannot be negative" |
| **P2** | 0 to 17 | Valid | Minor account with restricted access |
| **P3** | 18 to 64 | Valid | Standard adult account |
| **P4** | 65 to 150 | Valid | Senior account with discount |
| **P5** | Greater than 150 | Invalid | Error: "Age out of realistic range" |
| **P6** | Non-numeric (e.g., "abc") | Invalid | Error: "Please enter a valid number" |

You would select **one representative value from each partition**:

- P1: \`-5\` (negative number)
- P2: \`10\` (minor)
- P3: \`30\` (standard adult)
- P4: \`70\` (senior)
- P5: \`200\` (unrealistic age)
- P6: \`"hello"\` (non-numeric)

That is **six test cases** to cover the entire input domain. Without equivalence partitioning, a tester might randomly pick values like 20, 25, 30, 35, 40 -- all from the same partition, all exercising the same code path, all providing zero additional coverage beyond the first.

**Key rules for equivalence partitioning:**

- **Always include invalid partitions.** Testing only valid inputs means you never verify error handling
- **Each value belongs to exactly one partition.** Partitions must not overlap
- **Partitions must cover the entire input domain.** No gaps allowed
- **One representative per partition is sufficient** for minimum coverage, though you may add more for high-risk partitions

---

## Boundary Value Analysis

If equivalence partitioning tells you *which groups* to test, **boundary value analysis** (BVA) tells you *which values within those groups* matter most. The empirical observation driving BVA is that **defects cluster at the boundaries between partitions**. An off-by-one error in a condition like \`if (age >= 18)\` will not be caught by testing age 30 -- it will only be caught by testing ages 17 and 18.

For each boundary between two partitions, BVA tests the values on both sides. The **two-value BVA** approach (ISTQB Foundation) tests the boundary value and the value just outside:

Building on our age field example, here are the boundary values:

| Boundary | Values to Test | Why |
|---|---|---|
| **P1/P2 boundary (0)** | \`-1\`, \`0\` | Does the system correctly reject -1 but accept 0? |
| **P2/P3 boundary (18)** | \`17\`, \`18\` | Does the system correctly classify 17 as minor and 18 as adult? |
| **P3/P4 boundary (65)** | \`64\`, \`65\` | Does the system correctly classify 64 as adult and 65 as senior? |
| **P4/P5 boundary (150)** | \`150\`, \`151\` | Does the system correctly accept 150 but reject 151? |

The **three-value BVA** approach (used in rigorous testing) adds one more value on each side: min-1, min, min+1 at the lower boundary, and max-1, max, max+1 at the upper boundary. For the P2/P3 boundary, that means testing \`16\`, \`17\`, \`18\`, and \`19\`.

**When to use three-value BVA over two-value:**

- **Safety-critical systems** (medical devices, aviation, financial) where boundary errors have severe consequences
- **Complex calculations** where rounding or floating-point precision could introduce off-by-one errors at multiple points
- **Legacy code** without unit tests, where the boundary logic may be fragile

Combining EP and BVA for our age field, you would have approximately **10--12 test cases** that thoroughly cover the entire input domain -- far fewer than testing dozens of random values, yet far more effective at finding real defects.

---

## Decision Table Testing

Equivalence partitioning and boundary value analysis work well for single-input fields. But what happens when **multiple conditions interact** to determine the system behavior? This is where **decision table testing** shines.

A decision table maps every combination of input conditions to the expected action or outcome. It is essentially a truth table for your business rules.

Consider a discount calculation with these rules:

- **Premium members** get 10% off
- **Orders over \$100** get 5% off
- **Valid coupon** gives 15% off
- Discounts stack (are additive)
- Non-premium members with orders under \$100 and no coupon get 0% off

Here is the decision table:

| Rule | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
|---|---|---|---|---|---|---|---|---|
| **Premium member?** | Y | Y | Y | Y | N | N | N | N |
| **Order > \$100?** | Y | Y | N | N | Y | Y | N | N |
| **Valid coupon?** | Y | N | Y | N | Y | N | Y | N |
| **Discount** | 30% | 15% | 25% | 10% | 20% | 5% | 15% | 0% |

Each column becomes a test case:

- **R1:** Premium member, order \$150, valid coupon -- expect 30% discount (10 + 5 + 15)
- **R2:** Premium member, order \$150, no coupon -- expect 15% discount (10 + 5)
- **R3:** Premium member, order \$50, valid coupon -- expect 25% discount (10 + 15)
- **R4:** Premium member, order \$50, no coupon -- expect 10% discount (10)
- **R5:** Non-premium, order \$150, valid coupon -- expect 20% discount (5 + 15)
- **R6:** Non-premium, order \$150, no coupon -- expect 5% discount (5)
- **R7:** Non-premium, order \$50, valid coupon -- expect 15% discount (15)
- **R8:** Non-premium, order \$50, no coupon -- expect 0% discount

With 3 binary conditions, you get 2^3 = 8 combinations. This is manageable. But with 5 conditions, you would have 32 combinations; with 10 conditions, over 1,000. In practice, you can often **collapse the table** by identifying rules that produce the same outcome regardless of one condition's value. For example, if the coupon discount applies regardless of membership status, you might merge columns.

**When to use decision table testing:**

- **Business rules with multiple interacting conditions** (pricing, eligibility, access control)
- **Compliance requirements** where every combination must be explicitly verified
- **API endpoints** that behave differently based on combinations of parameters, headers, or user roles

---

## State Transition Testing

Many systems behave differently depending on their **current state** and the **sequence of events** that led there. A login system that locks after three failed attempts, a shopping cart that transitions from empty to checkout to payment, a workflow engine that moves documents through approval stages -- these all have stateful behavior that EP and BVA cannot adequately test.

**State transition testing** models the system as a finite state machine and derives test cases from the transitions between states.

Consider a login system with these rules:

- Start in the **Logged Out** state
- Valid credentials transition to **Logged In**
- Invalid credentials increment a failure counter
- After **3 consecutive failures**, the account moves to **Locked**
- A locked account can be unlocked by an admin, returning to **Logged Out**
- A logged-in user can log out, returning to **Logged Out**

The state transition table:

| Current State | Event | Condition | Next State | Action |
|---|---|---|---|---|
| Logged Out | Login attempt | Valid credentials | Logged In | Reset failure counter |
| Logged Out | Login attempt | Invalid, failures < 3 | Logged Out | Increment failure counter |
| Logged Out | Login attempt | Invalid, failures = 3 | Locked | Display lock message |
| Logged In | Logout | -- | Logged Out | End session |
| Logged In | Session timeout | -- | Logged Out | Display timeout message |
| Locked | Admin unlock | -- | Logged Out | Reset failure counter |
| Locked | Login attempt | Any | Locked | Display lock message |

From this table, you derive test cases that cover every transition:

\`\`\`
Test 1: Logged Out -> valid login -> Logged In (happy path)
Test 2: Logged Out -> invalid login -> Logged Out (failure counter = 1)
Test 3: Logged Out -> invalid x3 -> Locked (account lockout)
Test 4: Logged In -> logout -> Logged Out (normal logout)
Test 5: Logged In -> timeout -> Logged Out (session expiry)
Test 6: Locked -> admin unlock -> Logged Out (recovery path)
Test 7: Locked -> login attempt -> Locked (stays locked)
\`\`\`

For deeper coverage, you can test **sequences of transitions** (called N-switch coverage). A **1-switch** test covers pairs of consecutive transitions:

\`\`\`
Test 8: Logged Out -> valid login -> Logged In -> logout -> Logged Out
Test 9: Logged Out -> invalid x3 -> Locked -> admin unlock -> Logged Out -> valid login -> Logged In
Test 10: Logged Out -> invalid x2 -> valid login -> Logged In (failure counter resets)
\`\`\`

Here is a code example that tests the state transitions:

\`\`\`typescript
describe('Login State Machine', () => {
  let loginSystem: LoginSystem;

  beforeEach(() => {
    loginSystem = new LoginSystem();
  });

  it('should transition from LoggedOut to LoggedIn on valid credentials', () => {
    expect(loginSystem.state).toBe('LoggedOut');
    loginSystem.login('admin', 'correct-password');
    expect(loginSystem.state).toBe('LoggedIn');
  });

  it('should lock account after 3 consecutive failures', () => {
    loginSystem.login('admin', 'wrong');
    loginSystem.login('admin', 'wrong');
    loginSystem.login('admin', 'wrong');
    expect(loginSystem.state).toBe('Locked');
  });

  it('should remain locked when attempting login on locked account', () => {
    // Force lock state
    for (let i = 0; i < 3; i++) {
      loginSystem.login('admin', 'wrong');
    }
    loginSystem.login('admin', 'correct-password');
    expect(loginSystem.state).toBe('Locked');
  });

  it('should reset failure counter on successful login', () => {
    loginSystem.login('admin', 'wrong');
    loginSystem.login('admin', 'wrong');
    loginSystem.login('admin', 'correct-password');
    expect(loginSystem.state).toBe('LoggedIn');
    expect(loginSystem.failureCount).toBe(0);
  });
});
\`\`\`

**State transition testing is essential for:**

- Authentication and authorization flows
- Payment processing pipelines
- Order management systems
- Any feature with sequential logic, retries, or lockout mechanisms

---

## Pairwise Testing (All-Pairs)

The techniques above work beautifully for individual inputs or small sets of conditions. But modern software has **many configuration parameters** that interact in complex ways. Consider a web application that must work across:

- **3 browsers:** Chrome, Firefox, Safari
- **3 operating systems:** Windows, macOS, Linux
- **3 languages:** English, Spanish, Japanese

Testing every combination requires 3 x 3 x 3 = **27 test cases**. That is manageable. But add a few more parameters:

- **3 browsers** x **3 OS** x **3 languages** x **3 screen sizes** x **2 authentication methods** = **162 combinations**

And in real-world systems, you might have 10+ parameters with 3--5 values each, producing **thousands or millions of combinations**. This is the **combinatorial explosion** problem.

**Pairwise testing** (also called **all-pairs testing**) offers an elegant solution. Research has shown that most defects are triggered by the interaction of **at most two parameters**. Pairwise testing generates a test set where **every pair of parameter values appears in at least one test case**, dramatically reducing the number of tests while maintaining high defect detection.

For our 3 x 3 x 3 example, pairwise reduces 27 combinations to just **9 test cases**:

| Test | Browser | OS | Language |
|---|---|---|---|
| 1 | Chrome | Windows | English |
| 2 | Chrome | macOS | Spanish |
| 3 | Chrome | Linux | Japanese |
| 4 | Firefox | Windows | Spanish |
| 5 | Firefox | macOS | Japanese |
| 6 | Firefox | Linux | English |
| 7 | Safari | Windows | Japanese |
| 8 | Safari | macOS | English |
| 9 | Safari | Linux | Spanish |

Notice that every pair appears at least once: Chrome+Windows, Chrome+macOS, Chrome+English, Chrome+Spanish, Firefox+Linux, Safari+Japanese, and so on. You have covered all two-way interactions with only 9 tests instead of 27.

The reduction becomes more dramatic with more parameters. A system with **10 parameters, each having 3 values**, would require 59,049 exhaustive tests but only about **15--20 pairwise test cases**.

**Tools for generating pairwise test sets:**

- **PICT** (Microsoft's Pairwise Independent Combinatorial Testing) -- free, command-line tool, supports constraints between parameters
- **allpairspy** -- Python library for generating pairwise combinations programmatically
- **Jenny** -- C-based combinatorial test case generator
- **Hexawise** -- commercial web-based tool with visualization

Example using allpairspy in Python:

\`\`\`python
from allpairspy import AllPairs

parameters = [
    ["Chrome", "Firefox", "Safari"],
    ["Windows", "macOS", "Linux"],
    ["English", "Spanish", "Japanese"],
]

for i, pair in enumerate(AllPairs(parameters)):
    print(f"Test {i + 1}: Browser={pair[0]}, OS={pair[1]}, Language={pair[2]}")
\`\`\`

**When to use pairwise testing:**

- Configuration testing across browsers, OS, devices, and locales
- API testing with multiple optional parameters
- Feature flag combinations
- Any situation where full combinatorial coverage is impractical

---

## Error Guessing and Fault Injection

The techniques covered so far are **specification-based** -- they derive test cases from requirements and rules. **Error guessing** is an **experience-based** technique where testers draw on their knowledge of common programming mistakes, typical failure modes, and domain-specific pitfalls to design targeted test cases.

While it lacks the mathematical rigor of equivalence partitioning or decision tables, error guessing is extremely effective in practice. Experienced testers know that developers make predictable mistakes, and testing for those mistakes catches bugs that systematic techniques miss.

**Common error categories to target:**

| Category | Examples |
|---|---|
| **Null and empty values** | null, undefined, empty string, empty array, 0 |
| **Special characters** | \`<script>alert(1)</script>\`, \`'; DROP TABLE users;--\`, \`../../../etc/passwd\` |
| **Boundary overflow** | Integer max (2147483647), max + 1, very long strings (10,000+ chars) |
| **Type mismatches** | String where number expected, float where integer expected, object where array expected |
| **Concurrency** | Double-click submit, rapid repeated requests, race conditions |
| **Unicode and encoding** | Emoji, right-to-left text, zero-width characters, multi-byte sequences |
| **Date and time** | Leap year (Feb 29), DST transitions, midnight rollover, timezone boundaries |
| **Network conditions** | Timeout, connection reset, partial response, slow connection |

A **systematic error guessing checklist** for any input field:

1. Enter **nothing** (empty submission)
2. Enter only **whitespace** (spaces, tabs, newlines)
3. Enter the **minimum valid value** and one below it
4. Enter the **maximum valid value** and one above it
5. Enter **special characters**: \`!@#\$%^&*()_+-=[]{}|;:'"<>?,./\`
6. Enter a **very long string** (paste 10,000 characters)
7. Enter **SQL injection** payloads: \`' OR 1=1 --\`
8. Enter **XSS payloads**: \`<img src=x onerror=alert(1)>\`
9. Enter **Unicode edge cases**: emoji, RTL text, null bytes
10. Submit the form **twice rapidly** (double submission)

**Fault injection** takes error guessing further by deliberately introducing failures into the system's dependencies -- killing database connections, injecting network latency, corrupting file system writes -- to verify that the application handles failures gracefully. Tools like **Chaos Monkey**, **Toxiproxy**, and **Gremlin** automate fault injection at infrastructure level.

---

## Combining Techniques

No single test case design technique is sufficient for comprehensive coverage. Each technique targets a different type of defect. The art of effective test design is knowing **which technique to apply in which situation** -- and then layering multiple techniques on the same feature.

| Situation | Recommended Technique(s) |
|---|---|
| Single input field with defined ranges | Equivalence partitioning + boundary value analysis |
| Complex business rules with multiple conditions | Decision table testing |
| Workflow or sequential process | State transition testing |
| Configuration or compatibility testing | Pairwise testing |
| Security-sensitive input | Error guessing + fault injection |
| New or unfamiliar feature | Exploratory testing + error guessing |
| Regulatory compliance | Decision table + full combinatorial |

**Example: combining techniques on a registration form.**

Start with **equivalence partitioning** to identify the valid and invalid input classes for each field (name, email, age, password). Apply **boundary value analysis** to the age and password length fields. Build a **decision table** for the business rules (e.g., age + country determines which terms of service to show). Use **error guessing** to test special characters in the name field, SQL injection in email, and Unicode edge cases throughout. If the form has a multi-step wizard, apply **state transition testing** to verify navigation between steps, back button behavior, and session timeout handling.

This layered approach gives you a test suite that is **minimal in size but maximal in coverage**. Each technique catches a different class of defects, and together they form a safety net that random testing could never match.

---

## Automate Test Design with AI Agents

Applying these test case design techniques manually is time-consuming. You need to identify partitions, calculate boundaries, build decision tables, and generate pairwise combinations -- all before writing a single test. **AI coding agents** can accelerate this process dramatically when equipped with the right QA skills.

Install specialized skills that encode these techniques directly into your AI agent:

\`\`\`bash
npx @qaskills/cli add boundary-value-generator
\`\`\`

This skill teaches your AI agent to automatically identify boundaries in requirements and generate BVA test cases for any input specification you provide.

\`\`\`bash
npx @qaskills/cli add pairwise-test-generator
\`\`\`

Give your agent the ability to take a set of parameters and values, calculate pairwise combinations, and output a reduced test matrix.

\`\`\`bash
npx @qaskills/cli add negative-test-generator
\`\`\`

This skill focuses on error guessing -- it generates negative test cases targeting null values, boundary overflows, injection attacks, and common failure modes for any feature you describe.

Browse all available testing skills at [/skills](/skills) or get started with the CLI at [/getting-started](/getting-started). For a complementary guide on testing without predefined scripts, see our post on [exploratory testing with AI agents](/blog/exploratory-testing-ai-agents-guide).

---

## Frequently Asked Questions

### What is the difference between equivalence partitioning and boundary value analysis?

**Equivalence partitioning** divides the input domain into groups (partitions) where all values are expected to behave the same, and you select one representative from each group. **Boundary value analysis** builds on this by focusing specifically on the edges of those partitions -- the minimum, maximum, and values immediately adjacent to the boundary. EP tells you *which groups* to test; BVA tells you *which specific values* within those groups are most likely to reveal defects. In practice, you almost always use them together.

### How many test cases does pairwise testing produce compared to exhaustive testing?

The reduction depends on the number of parameters and their values. As a rough guide, pairwise testing typically reduces the test set by **70--90%** compared to exhaustive combinations. For example, 4 parameters with 3 values each produces 81 exhaustive combinations but only about 9--12 pairwise test cases. The mathematical minimum for pairwise coverage is approximately N^2, where N is the largest number of values for any single parameter, though real-world results vary based on constraints and parameter counts.

### When should I use decision table testing instead of equivalence partitioning?

Use **equivalence partitioning** when you are testing a single input or parameter in isolation. Use **decision table testing** when the expected outcome depends on the **combination of multiple conditions**. If changing one condition changes the outcome regardless of other conditions, EP is sufficient. If the outcome depends on specific combinations -- for example, "premium members with orders over \$100 who also have a coupon get 30% off" -- you need a decision table to ensure every meaningful combination is covered.

### Can AI agents reliably generate test cases using these techniques?

Yes, but with an important caveat. AI agents are excellent at the **mechanical aspects** of test design -- computing boundary values, generating pairwise combinations, and filling out decision tables. Where they need human guidance is in **identifying the right partitions and conditions** from ambiguous requirements. The most effective approach is to have a human tester define the partitions and business rules, then let the AI agent generate the specific test cases, data, and automation code. QA skills from [QASkills.sh](/skills) encode this structured approach so your agent applies techniques correctly.

### What is the ISTQB recommended order for learning test design techniques?

The **ISTQB Foundation Level** syllabus introduces techniques in this order: equivalence partitioning first (as the simplest and most fundamental), then boundary value analysis (as an extension of EP), then decision table testing, then state transition testing. Experience-based techniques like error guessing are covered last. This progression makes sense because each technique builds on the concepts of the previous one. Start with EP and BVA -- they will cover the majority of your test design needs -- then add decision tables and state transition testing as you encounter more complex systems.
`,
};
