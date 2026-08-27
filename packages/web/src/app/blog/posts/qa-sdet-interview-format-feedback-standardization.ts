import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QA and SDET Interview Format: Standardizing Rubrics and Feedback',
  description:
    'A standardized QA and SDET interview loop: the four rounds, a scoring rubric with observable anchors, a feedback template, and the calibration process that keeps bars consistent.',
  date: '2026-08-23',
  category: 'Guide',
  content: `
# QA and SDET Interview Format: Standardizing Rubrics and Feedback

Standardizing a QA or SDET interview means three concrete artifacts: a **fixed round structure** where every candidate is assessed on the same competencies, a **rubric with observable anchors** so two interviewers watching the same answer score it the same way, and a **feedback template** that forces evidence before conclusion. Without all three, you have a hiring process whose outcome depends mostly on which interviewers a candidate happened to draw.

The failure this solves is specific and common: one interviewer rejects for "not strong enough on automation" while another passes a weaker candidate because the conversation went well. Both write two sentences of feedback. Neither decision can be audited, and neither can be improved, because nothing was measured.

This guide gives you the four-round structure, the rubric anchors, the feedback template, and the calibration loop that keeps them honest.

## The four rounds and what each one owns

Each competency is assessed **once**, by one round that owns it. Overlap is what makes debriefs go in circles, because two interviewers argue about the same evidence from different angles.

| Round | Duration | Owns | Does not assess |
|---|---|---|---|
| Screen | 30 min | Experience verification, stack depth, motivation | Coding ability |
| Test design | 60 min | Decomposition, risk thinking, edge cases | Coding syntax |
| Technical build | 60 min | Coding, framework structure, debugging | Product judgment |
| Behavioral | 45 min | Collaboration, advocacy, handling failure | Technical depth |

The rounds most teams get wrong are the middle two. "Test design" and "technical build" collapse into one long session where the candidate writes some Selenium and talks about edge cases, and the scores end up measuring typing speed under observation.

**Test design** should require no IDE. Give a feature and ask how they would approach testing it. What you are watching for is whether they clarify scope before answering, whether they name categories before listing cases, and whether risk drives their ordering.

**Technical build** should be a small, real task with a working environment: write tests against an existing API, or fix a flaky test in a provided repository. Whiteboard algorithms measure something, but it is not the job.

## Rubric anchors that two people can agree on

A rubric fails when its levels are adjectives. "Strong test design" means whatever the reader wants. Anchors must be **observable behaviors**, phrased so that an interviewer is recording what happened rather than forming an impression.

### Test design

| Score | Observable behavior |
|---|---|
| 1 | Lists cases with no structure; misses the happy path or the primary error path |
| 2 | Covers functional cases; no boundaries, no negative cases, no non-functional thinking |
| 3 | Names techniques (boundary, equivalence, state transition) and applies at least two; covers error paths |
| 4 | Prioritizes by risk without prompting; asks clarifying questions before designing; identifies non-functional concerns |
| 5 | All of 4, plus articulates what they would deliberately not test and why |

Level 5 is the one that separates senior candidates. Anyone can add more test cases. Deciding what to leave out, and defending it, is the judgment you are hiring for.

### Automation and coding

| Score | Observable behavior |
|---|---|
| 1 | Cannot produce working code in a familiar language |
| 2 | Writes tests that pass; no structure, hardcoded waits, brittle locators |
| 3 | Uses page objects or equivalent; stable locator strategy; explicit waits |
| 4 | Designs for reuse and data setup; explains a tradeoff they made |
| 5 | Discusses parallelism, flake management, or CI integration unprompted |

### Debugging

| Score | Observable behavior |
|---|---|
| 1 | Guesses and changes things at random |
| 2 | Reads the error; tries one plausible fix |
| 3 | Forms a hypothesis, tests it, narrows systematically |
| 4 | Distinguishes test defect from product defect before fixing |
| 5 | Identifies the class of problem and proposes a preventive change |

### Collaboration and advocacy

| Score | Observable behavior |
|---|---|
| 1 | Blames developers or process for quality outcomes |
| 2 | Describes escalation without describing resolution |
| 3 | Gives a concrete example of resolving disagreement about a defect |
| 4 | Describes changing a team practice, with the outcome |
| 5 | Describes a case where they were wrong and what they changed |

That last anchor is deliberate. A candidate with no failure story either has not operated with real responsibility or is not being candid, and either reading matters.

## The feedback template

The template's job is to make evidence come before judgment. Interviewers who write the recommendation first tend to assemble evidence that supports it.

\`\`\`markdown
## Candidate: [name]    Round: [round]    Interviewer: [name]

### What I asked
[One line per question or task.]

### What they did
[Observable actions only. What they said, what they wrote, what they asked.
No interpretation in this section.]

### Scores
| Competency | Score | Evidence |
|---|---|---|
| Test design | 3 | Named boundary and equivalence, applied both to the date field |
| Automation | 2 | Wrote passing tests; used a fixed 3s wait after login |
| Debugging | 4 | Checked the API response before touching the test |

### Recommendation
[Hire / No hire / Lean, with the single strongest reason.]

### What I could not assess
[Anything the round did not cover. Prevents others assuming it was covered.]
\`\`\`

The last section is the most-skipped and most useful. When a debrief says "nobody probed their API testing," that is a gap in the loop, not a reason to reject.

## Anti-patterns in QA interviews specifically

| Anti-pattern | Why it fails | Replace with |
|---|---|---|
| "How would you test a pen?" | Signals nothing about software testing | Test a real feature from your product |
| Trivia on framework APIs | Measures memorization, not judgment | Give docs and watch them use them |
| Whiteboard algorithms for a manual QA role | Not the job | Test design on a real scenario |
| "Write a test framework" in 45 minutes | Impossible; measures panic | Extend an existing framework |
| Unstructured "tell me about yourself" | Unscoreable | Behavioral questions mapped to anchors |
| Asking for a bug count from a past job | Rewards inflated numbers | Ask about one bug in depth |

The pen question deserves its own note. It is meant to probe systematic thinking, and it does, weakly. But it disadvantages candidates who have not seen the trick, rewards those who memorized a checklist, and produces answers you cannot compare across candidates. A real feature from your own product tests the same skill with better signal and gives the candidate a realistic view of the work.

## Calibration, which is where standardization actually happens

A rubric that nobody calibrates against drifts within weeks. Three mechanisms keep it real.

**Shadow before scoring.** New interviewers observe two loops and score independently without their scores counting. Compare against the primary interviewer and discuss gaps. Most disagreements at this stage come from different readings of an anchor, which is exactly what you want to surface early.

**Score before debrief.** Every interviewer submits scores before the group discusses. Without this, the first person to speak sets the anchor and the rest of the room converges on it. This one rule does more for consistency than any amount of rubric wording.

**Quarterly review of the spread.** Pull scores per interviewer and look at distributions.

| Signal | Likely cause | Action |
|---|---|---|
| One interviewer never scores above 3 | Applying a personal bar above the rubric | Recalibrate against anchors |
| One interviewer never scores below 3 | Avoiding conflict, or unclear on anchors | Shadow again |
| A competency is always 3 | Round is not eliciting differentiation | Redesign the question |
| Scores cluster tightly on one round | Question is too easy or too hard | Adjust difficulty |

The third row is common and easy to miss. If every candidate scores 3 on debugging, that round has stopped distinguishing anyone and is costing an hour per candidate for no information.

## Making the loop fair as well as consistent

Standardization is what makes fairness auditable, but a few practices matter beyond the rubric.

1. **Same questions, same order, same time budget** for every candidate at a given level. Variation is what makes comparisons meaningless.
2. **Publish the format in advance.** Telling candidates the four rounds and what each assesses does not weaken signal; it removes the advantage held by people who happen to know someone at the company.
3. **Allow documentation.** Nobody writes framework code from memory. Watching someone navigate real docs is more informative than watching them recall an API.
4. **Separate scoring from decision.** Interviewers score; the hiring manager or committee decides. Merging them invites interviewers to score toward the outcome they want.
5. **Write feedback within an hour.** Recall degrades fast, and delayed feedback drifts toward the general impression the rubric exists to replace.

## Encoding the rubric so it cannot drift

A rubric that lives in a slide deck gets edited by whoever presents it last. Keep it in version control next to the interview kits, so changes are reviewed like any other change.

\`\`\`yaml
# hiring/rubrics/sdet.yml
role: sdet
level: mid
minimums:
  test_design: 3
  automation: 3
  debugging: 3
  collaboration: 3

competencies:
  test_design:
    owner_round: test-design
    anchors:
      1: "Lists cases with no structure; misses happy path or primary error path"
      2: "Functional cases only; no boundaries, negatives, or non-functional"
      3: "Names and applies at least two techniques; covers error paths"
      4: "Prioritizes by risk unprompted; clarifies scope before designing"
      5: "Articulates what they would deliberately not test, and why"
  automation:
    owner_round: technical-build
    anchors:
      1: "Cannot produce working code in a familiar language"
      2: "Tests pass; hardcoded waits, brittle locators, no structure"
      3: "Page objects or equivalent; stable locators; explicit waits"
      4: "Designs for reuse and data setup; explains a tradeoff"
      5: "Raises parallelism, flake management, or CI unprompted"
\`\`\`

The \`minimums\` block is what stops averaging. A candidate scoring 5 on test design and 2 on automation does not clear a \`minimums\` gate that requires 3 on both, even though the mean looks fine.

\`\`\`python
# hiring/decide.py
import yaml

def meets_bar(scores: dict[str, int], rubric_path: str) -> tuple[bool, list[str]]:
    """Return whether scores clear every per-competency minimum."""
    rubric = yaml.safe_load(open(rubric_path))
    minimums = rubric["minimums"]

    missing = [c for c in minimums if c not in scores]
    if missing:
        # An unscored competency is not a pass; it is an incomplete loop.
        raise ValueError(f"no score recorded for: {', '.join(sorted(missing))}")

    below = [c for c, floor in minimums.items() if scores[c] < floor]
    return (len(below) == 0, below)
\`\`\`

Raising on a missing score rather than defaulting it is the important line. Treating an unscored competency as a pass is how loops quietly stop assessing things.

## Measuring the loop itself

Once scores are structured data, the calibration review is a query rather than an argument.

\`\`\`python
# hiring/calibration.py
import statistics
from collections import defaultdict

def interviewer_spread(records):
    """records: iterable of dicts with interviewer, competency, score."""
    by_person = defaultdict(list)
    for r in records:
        by_person[r["interviewer"]].append(r["score"])

    rows = []
    for person, scores in sorted(by_person.items()):
        rows.append({
            "interviewer": person,
            "n": len(scores),
            "mean": round(statistics.mean(scores), 2),
            "stdev": round(statistics.pstdev(scores), 2) if len(scores) > 1 else 0.0,
            "max": max(scores),
            "min": min(scores),
        })
    return rows
\`\`\`

Two patterns are worth acting on. A \`stdev\` near zero means that interviewer is scoring everyone the same and contributing no differentiation. A \`mean\` more than roughly one point from the group mean means their personal bar has replaced the rubric.

\`\`\`bash
python -m hiring.calibration --since 2026-05-01 --role sdet
\`\`\`

Run it quarterly, not weekly. Small samples produce noisy spreads, and reacting to noise teaches interviewers to score toward the average rather than toward the anchors.

## A debrief that takes fifteen minutes

With scores submitted in advance, the debrief has a fixed agenda:

\`\`\`text
1. Read out scores per competency. No discussion yet.        (2 min)
2. Identify disagreements of 2 or more points.               (1 min)
3. For each: both interviewers state their evidence.         (8 min)
4. Note any competency nobody assessed.                      (2 min)
5. Hiring manager states the decision and the reason.        (2 min)
\`\`\`

Step 3 is the whole point. Two people who scored a candidate 2 and 4 on automation are usually describing different observations, not the same observation weighted differently, and hearing both is how the anchors get sharper. Skipping straight to a vote loses that information permanently.

## A realistic failure: the loop that measured confidence

Symptom: a team's SDET hires were performing below expectations despite a structured loop with rubrics. Post-hire reviews said the new engineers struggled with framework design, which the loop supposedly assessed.

Diagnosis: the technical round asked candidates to *describe* how they would structure a test framework. Confident, articulate candidates scored 4 and 5 by narrating a clean architecture. The score measured how well they could talk about framework design, which is a different skill from doing it, and the two correlate less than anyone expects.

The fix was to change the task, not the rubric. Candidates were given a small repository with three tests and asked to add a fourth that required a new page object and shared data setup. Scores immediately spread out, and the anchors for level 4 ("designs for reuse and data setup") became something you could observe directly rather than infer from a description.

The general rule: for every anchor, ask what artifact proves it. If the only evidence is what the candidate said about themselves, the round is measuring self-presentation.

## Rolling it out without a rewrite

You do not need to redesign hiring in one pass. In order:

1. **Week one:** write the rubric anchors for the competencies you already assess. Change nothing else.
2. **Week two:** adopt the feedback template, including the "what I could not assess" section.
3. **Week three:** introduce score-before-debrief. Expect the first few debriefs to be noisier, because real disagreement becomes visible.
4. **Month two:** review the spread and fix the round with the least differentiation.
5. **Month three:** revisit anchors using the language that came up in real debriefs.

Anchors written from real debriefs beat anchors written in the abstract, because they use the distinctions your team actually makes.

Candidates preparing for this format will recognize the structure from the other side; the [SDET interview questions guide](/blog/sdet-interview-questions-2026) covers what each round tends to ask, and the [behavioral interview questions for QA engineers](/blog/behavioral-interview-questions-qa-engineers) covers the fourth round in depth.

Ready-made QA skills install from qaskills.sh with the qaskills CLI, including skills that help draft interview scenarios from a real feature spec.

## Adapting the loop by level

The same four rounds work across levels; what changes is the bar and the depth of the prompt, not the structure. Keeping the structure fixed is what makes cross-level comparison possible when you are deciding which level to make an offer at.

| Competency | Junior floor | Mid floor | Senior floor |
|---|---|---|---|
| Test design | 2 | 3 | 4 |
| Automation | 2 | 3 | 4 |
| Debugging | 2 | 3 | 4 |
| Collaboration | 2 | 3 | 4 |

A candidate interviewing for mid who scores at senior floors across the board is a signal to reconsider the level rather than simply to hire. That decision is only available because every candidate was measured on the same scale.

For senior and lead roles, add depth inside the existing rounds instead of adding a fifth. In the technical build, ask the candidate to review an existing framework and name the two changes they would make first, with reasons. That elicits architectural judgment without the artificial pressure of building something new in an hour.

## What people get wrong

The most common mistake is writing a rubric with adjective levels and calling the loop standardized. "Good", "strong", and "excellent" are placeholders for the judgment the rubric was supposed to make explicit, so scores stay as subjective as before and now carry false authority because they are numbers. Every level needs a behavior an observer could have written down.

The second is standardizing the questions but not the debrief. If the room discusses before anyone commits to a score, the loop's consistency is decided by whoever speaks first and most confidently. Score-before-debrief is a single procedural rule, it costs nothing, and it protects the value of everything else.

## Frequently Asked Questions

### How many rounds should a QA or SDET loop have?

Four is the practical maximum for most roles: a screen, a test design round, a technical build round, and a behavioral round. Beyond that, each additional round adds scheduling delay and candidate drop-off without adding much signal, because the competencies start repeating. If you feel you need five, check whether two rounds are assessing the same thing. For junior roles you can often merge the screen and behavioral rounds; for senior roles, add depth to the existing rounds rather than adding another one.

### Should candidates see the rubric in advance?

Share the structure and the competencies, not the anchor wording. Telling candidates that the loop has four rounds and that the technical round assesses framework structure and debugging lets them prepare appropriately, which improves signal rather than degrading it: you learn what they can do prepared, which is the working condition. Publishing the exact anchors invites answers written to hit them, which is closer to reciting than demonstrating. The practical benefit of publishing the format is fairness, since it removes the edge held by candidates with inside contacts.

### How do we stop one interviewer's bar from dominating?

Two mechanisms. Require every interviewer to submit scores before the debrief begins, so the discussion starts from independent judgments rather than converging on the first opinion voiced. Then review score distributions per interviewer quarterly: an interviewer who never scores above 3, or never below 3, is applying a personal bar rather than the rubric, and the fix is recalibration against the anchors rather than a conversation about being tougher or softer.

### What if a candidate is strong in test design but weak in coding?

That is a role-fit question, and the rubric should answer it by weighting rather than by averaging. A manual or functional QA role can legitimately hire someone scoring 4 on test design and 2 on automation; an SDET role generally cannot. Define the minimum per competency for each role before you start interviewing, and record it. Averaging scores into a single number hides exactly this pattern, which is how teams end up hiring candidates who are adequate everywhere and strong at nothing the role actually needs.
`,
};
