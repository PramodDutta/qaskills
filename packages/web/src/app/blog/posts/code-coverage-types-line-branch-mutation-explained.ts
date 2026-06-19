import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Code Coverage Types: Line, Branch & Mutation Explained",
  description: "Line vs branch vs statement vs function vs mutation coverage explained — what each metric actually tells you, where each lies, and which to enforce in CI.",
  date: "2026-06-15",
  category: "Testing",
  content: `# Code Coverage Types: Line, Branch & Mutation Explained

Code coverage measures how much of your code your tests execute, but "coverage" is not one number — it's a family of metrics that measure different things. **Line/statement coverage** tells you which lines ran. **Branch coverage** tells you whether both sides of every decision (\`if\`/\`else\`, \`&&\`, \`?:\`) were tested. **Function coverage** tells you which functions were called. **Condition coverage** drills into individual boolean sub-expressions. And **mutation coverage** — the strictest — tells you whether your tests would actually *catch a bug*. Line coverage is the easiest to hit and the easiest to fake; mutation coverage is the only one that measures test *quality* rather than test *reach*. This guide explains each type, what it reveals, where it lies, and which to enforce.

## The core distinction: reach vs quality

Every coverage type except mutation answers the same kind of question: *"did a test cause this code to run?"* That's **reach**. None of them ask the harder question: *"would a test fail if this code were wrong?"* That's **quality**, and only mutation testing measures it.

This matters because reach-based coverage is trivially gameable. A test that calls a function, asserts nothing, and exits gives you 100% line coverage of that function while testing literally nothing. High line coverage is necessary but nowhere near sufficient. Keep this reach-vs-quality split in mind as we go through each metric.

## Statement / line coverage

**What it measures:** the percentage of executable statements (or source lines) that ran at least once during your tests.

\`\`\`javascript
function applyDiscount(price, isMember) {
  let final = price;          // line 1
  if (isMember) {             // line 2
    final = price * 0.9;      // line 3
  }
  return final;               // line 4
}
\`\`\`

A single test with \`applyDiscount(100, true)\` runs lines 1, 2, 3, and 4 — **100% line coverage**. Looks perfect. But you never tested the non-member path where \`isMember\` is false. Line coverage reported 100% while a whole behavior went untested.

**What it tells you:** which code never runs at all — genuinely useful for finding dead code and completely untested files.

**Where it lies:** it counts a line as covered if *any* path through it executed. It says nothing about untaken branches, edge values, or whether assertions exist. It's the most optimistic metric.

Statement and line coverage are nearly the same; the tiny difference is that one physical line can contain multiple statements (\`a(); b();\`). Most tools report them interchangeably.

## Branch coverage

**What it measures:** the percentage of decision *outcomes* exercised — both the true and false side of every \`if\`, every \`case\`, every \`&&\`/\`||\`, every ternary.

Back to the example: \`applyDiscount(100, true)\` covers the \`if (isMember)\` **true** branch but never the **false** branch. So line coverage is 100% but **branch coverage is 50%**. Adding \`applyDiscount(100, false)\` brings branch coverage to 100%.

\`\`\`java
// Both branches needed for full branch coverage:
int categorize(int score) {
    if (score >= 90) return 1;   // branch A
    if (score >= 50) return 2;   // branch B
    return 3;                     // implicit else of both
}
\`\`\`

Testing only \`categorize(95)\` leaves branches B and the final fall-through untested even though one return line ran.

**What it tells you:** whether your tests exercise the program's *logic*, not just its lines. This is the single most valuable cheap metric and the one you should usually gate on. A jump from "100% line / 60% branch" to "100% line / 90% branch" is a real improvement in test thoroughness.

**Where it lies:** it still doesn't check assertions, and it treats a compound condition as one branch unless you use condition coverage. It also can't tell whether you tested the *right* values within a branch — only that you entered it.

## Function / method coverage

**What it measures:** the percentage of functions or methods that were called at least once.

**What it tells you:** which functions are completely untested — a fast, coarse signal. If function coverage is low, you have whole units nobody exercises.

**Where it lies:** it's the coarsest of all. A function counts as "covered" the instant it's called once, regardless of how many of its lines or branches ran. Use it as a smoke check, never as your primary gate.

## Condition and MC/DC coverage

**What it measures:** condition coverage looks at each boolean *sub-expression* independently. For \`if (a && b)\`, branch coverage only needs the whole condition to be true once and false once; condition coverage wants \`a\` to be both true and false *and* \`b\` to be both true and false.

**MC/DC** (Modified Condition/Decision Coverage) is the rigorous version required in safety-critical domains like avionics (DO-178C). It demands that each condition independently affect the decision's outcome.

\`\`\`c
if (engineOn && (altitude > 1000 || override)) { deploy(); }
\`\`\`

Branch coverage is satisfied with two tests. Condition/MC/DC coverage needs several more to prove each of \`engineOn\`, \`altitude > 1000\`, and \`override\` independently changes the result.

**What it tells you:** that compound boolean logic is exhaustively tested. Essential for safety-critical code; usually overkill for typical web/business applications.

**Where it lies:** even MC/DC doesn't verify your assertions are correct — it verifies your *inputs* exercise the logic. You can satisfy MC/DC and still assert the wrong expected value.

## Mutation coverage (mutation score)

**What it measures:** test *effectiveness*. A mutation testing tool makes tiny changes ("mutants") to your code — flipping \`>\` to \`>=\`, changing \`+\` to \`-\`, replacing \`true\` with \`false\`, deleting a statement — then reruns your tests. If a test *fails*, the mutant is **killed** (good — your tests caught the bug). If all tests still *pass*, the mutant **survived** (bad — a real bug would slip through). Your **mutation score** is the percentage of mutants killed.

\`\`\`python
def is_adult(age):
    return age >= 18

# A mutation testing tool changes >= to >
def is_adult(age):
    return age > 18   # mutant!

# Test: assert is_adult(18) == True
# Original returns True; mutant returns False -> test FAILS -> mutant KILLED. Good.
# But if your only test is is_adult(25), both return True -> mutant SURVIVES.
# Your test never probed the boundary, so it can't catch off-by-one bugs.
\`\`\`

**What it tells you:** the thing every other metric can't — whether your tests would actually *detect* defects. A surviving mutant is a precise, actionable gap: "if this exact bug existed, no test would notice." This is the only metric that measures test quality directly.

**Where it lies:** rarely on quality, but it has costs. It's **slow** (every mutant reruns the suite), it produces **equivalent mutants** (changes that don't alter behavior and can never be killed — false gaps that need manual triage), and a high score still can't catch missing requirements. Tools mitigate the speed problem with incremental analysis and by only mutating changed lines.

Popular mutation tools by language: **PIT (pitest)** for Java/JVM, **Stryker** for JavaScript/TypeScript/C#/Scala, **mutmut** and **cosmic-ray** for Python, **go-mutesting** for Go. For automating these checks with AI coding agents, browse the [testing skills directory](/skills).

## Side-by-side: what each metric catches

| Coverage type | Question it answers | Gameable? | Best used as |
|---|---|---|---|
| Statement / line | Did this line run? | Very easily | Dead-code detection, baseline |
| Function | Was this function called? | Easily | Coarse smoke check |
| Branch | Were both sides of each decision tested? | Harder | Primary CI gate |
| Condition / MC/DC | Was each boolean sub-expression tested? | Hard | Safety-critical code |
| Mutation | Would a bug be caught? | Very hard | Test-quality audit |

## Which to enforce in CI

A pragmatic 2026 strategy:

1. **Gate on branch coverage**, not line coverage. Branch is the cheapest metric that reflects real logic testing. Set a sane floor (e.g. 70–80%) and gate on *patch* coverage so new code must be tested without forcing legacy backfill. See how coverage services express this in our [Codecov vs Coveralls comparison](/compare).
2. **Report line and function coverage** for context, but don't make them the bar — they're too easy to satisfy without testing anything.
3. **Run mutation testing periodically or on changed files**, not on every commit (it's slow). Use it to audit *how good* your tests are, especially for critical business logic. A high line/branch number with a low mutation score is a red flag that your tests run code without asserting on it.
4. **Reserve condition/MC/DC** for safety-critical or regulated code where it's mandated.

The trap to avoid: treating any single percentage as "done." 100% line coverage with no assertions is worthless; 80% branch coverage with strong assertions and a healthy mutation score is genuinely solid. Tool-specific setup lives in our [JaCoCo guide](/blog) for Java and the [Istanbul/nyc guide](/blog) for JavaScript.

## Frequently Asked Questions

### What is the difference between line coverage and branch coverage?

Line (statement) coverage counts whether each line executed at least once; branch coverage counts whether both outcomes of every decision — the true and false side of each \`if\`, \`case\`, or \`&&\` — were tested. You can have 100% line coverage with only 50% branch coverage, because a single test can run every line while only taking one side of a conditional. Branch coverage is the more meaningful metric because it reflects whether your tests exercise the code's logic.

### Is 100% code coverage good?

Not necessarily. 100% line coverage only means every line ran during tests — it says nothing about whether your assertions are correct or whether edge cases were probed. A test that calls code but asserts nothing still produces "coverage." Aim for high branch coverage with strong assertions, and use mutation testing to confirm your tests would actually catch bugs, rather than chasing a perfect line-coverage number.

### What is mutation testing and how is it different from code coverage?

Mutation testing introduces small deliberate bugs ("mutants") into your code and reruns your tests; if a test fails, the mutant is "killed" and your tests are effective for that change. Ordinary coverage measures *reach* (did code run?), while mutation testing measures *quality* (would a bug be caught?). It's the only metric that directly evaluates how good your tests are, at the cost of being significantly slower to run.

### Which code coverage type should I enforce in CI?

Enforce **branch coverage** as your primary gate — it's the cheapest metric that reflects real logic testing, unlike line coverage which is easy to satisfy without testing anything. Gate on patch/diff coverage so new code must be tested without forcing legacy backfill. Report line and function coverage for context, and run mutation testing periodically to audit test quality rather than on every commit.

### What is MC/DC coverage and when do I need it?

Modified Condition/Decision Coverage (MC/DC) is a rigorous metric requiring each boolean condition in a compound expression to independently affect the decision's outcome. It's mandated in safety-critical domains such as avionics (DO-178C) and some automotive and medical software standards. For typical web and business applications it's overkill — branch coverage plus mutation testing gives a better return on effort.

### Why does my code show 100% coverage but still have bugs?

Because reach-based coverage only proves code ran, not that it ran correctly or with the right assertions. Tests can execute every line while asserting nothing, missing edge cases, or checking the wrong expected values. Mutation testing exposes this gap directly: a high line-coverage number paired with a low mutation score means your tests touch the code but wouldn't catch the bugs hiding in it.
`,
};
