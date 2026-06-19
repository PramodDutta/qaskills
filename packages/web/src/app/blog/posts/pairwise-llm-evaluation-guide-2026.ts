import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Pairwise LLM Evaluation Guide: Elo & Bias (2026)",
  description: "Pairwise LLM evaluation in 2026: side-by-side preference judging, Bradley-Terry and Elo ranking, position bias mitigation, and a working code example.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# Pairwise LLM Evaluation Guide: Elo & Bias (2026)

**Pairwise LLM evaluation** judges two model outputs side by side and asks which is better, rather than scoring each one on an absolute scale. You collect many of these A-vs-B comparisons — from humans or from an LLM judge — and convert the win/loss record into a ranking using a model like **Bradley-Terry** or an **Elo** rating. This is how the LMSYS Chatbot Arena leaderboard works. Pairwise comparison is the gold standard when "quality" is hard to put a number on, because humans (and judges) are far more reliable at saying "B is better than A" than at assigning "A is a 7.2/10."

This guide covers why pairwise beats absolute scoring, how to run a comparison, how to turn wins into ratings with Bradley-Terry and Elo, and how to defeat position bias and the other failure modes that quietly corrupt results.

## Why pairwise instead of absolute scoring

Absolute scoring (rate this answer 1–10) is seductive but unreliable. Different judges anchor differently — one person's 7 is another's 9 — and the same judge drifts over a session. Scores cluster (everything lands 6–8), so they fail to separate close systems. And LLM judges asked for an absolute number are notoriously inconsistent run to run.

Pairwise comparison sidesteps all of that. The judge only has to make a *relative* decision — which of these two is better — which is cognitively easier and far more stable. You do not need a calibrated scale; you need a consistent preference. The cost is that you must aggregate many pairwise outcomes into a global ranking, which is exactly what Bradley-Terry and Elo do.

| Property | Absolute scoring | Pairwise comparison |
|---|---|---|
| Judge task | Assign a number on a scale | Pick the better of two |
| Reliability | Lower — anchoring and drift | Higher — relative is easier |
| Separates close systems | Poorly — scores cluster | Well — small edges accumulate |
| Output | A score per output | A ranking across systems |
| Cost | One judgment per output | Many comparisons to rank N systems |

If you are choosing between evaluation strategies for a real project, our [comparison guides](/compare) lay out when absolute scoring is still the right call (e.g. pass/fail correctness checks).

## Step 1: Collect comparisons

For each test prompt, generate an output from each system you are comparing, then present pairs to a judge. The judge returns a verdict: A wins, B wins, or tie. With humans, build a simple side-by-side UI. With an LLM judge, prompt a strong model:

\`\`\`python
JUDGE_PROMPT = """You are comparing two AI assistant responses to the same prompt.
Decide which response is better overall: more helpful, accurate, and clear.

PROMPT:
{prompt}

RESPONSE A:
{response_a}

RESPONSE B:
{response_b}

Reply with strict JSON: {{"winner": "A" | "B" | "tie", "reason": "<one sentence>"}}"""
\`\`\`

Record every comparison as a row: \`(prompt_id, system_a, system_b, winner)\`. This log is your raw data; the ranking is derived from it.

## Step 2: Rank with Bradley-Terry

The **Bradley-Terry model** assigns each system a latent strength parameter and models the probability that system i beats system j as:

\`\`\`
P(i beats j) = strength_i / (strength_i + strength_j)
\`\`\`

Equivalently, with β = log(strength), P(i beats j) = sigmoid(βᵢ − βⱼ). You fit the β values by maximum likelihood over all observed comparisons — it is a logistic regression where each comparison is a data point and the features are "which two systems played." The fitted βs give you a stable, order-consistent ranking, and you can bootstrap the comparison set to get confidence intervals on each rating.

A compact fit using logistic regression:

\`\`\`python
import numpy as np
from sklearn.linear_model import LogisticRegression

systems = ["model_a", "model_b", "model_c"]
idx = {s: i for i, s in enumerate(systems)}

# Each comparison -> a one-hot difference row: +1 for winner, -1 for loser
X, y = [], []
for a, b, winner in comparisons:  # winner is a or b (drop ties or split)
    row = np.zeros(len(systems))
    row[idx[a]] = 1
    row[idx[b]] = -1
    X.append(row)
    y.append(1 if winner == a else 0)

clf = LogisticRegression(fit_intercept=False, C=1e6).fit(np.array(X), np.array(y))
ratings = dict(zip(systems, clf.coef_[0]))
for s, r in sorted(ratings.items(), key=lambda kv: -kv[1]):
    print(f"{s}: {r:.3f}")
\`\`\`

Bradley-Terry is the principled choice when you have a *fixed* set of systems and all the comparisons up front — it uses every comparison jointly and gives well-calibrated relative strengths.

## Step 3: Or rank with Elo

**Elo** (from chess) is the streaming alternative: each system has a rating, and after every comparison the winner takes points from the loser, scaled by how surprising the result was. Beating a much stronger system gains more points than beating a weaker one.

\`\`\`python
def update_elo(rating_a, rating_b, score_a, k=32):
    """score_a: 1.0 if A won, 0.0 if B won, 0.5 for a tie."""
    expected_a = 1 / (1 + 10 ** ((rating_b - rating_a) / 400))
    new_a = rating_a + k * (score_a - expected_a)
    new_b = rating_b + k * ((1 - score_a) - (1 - expected_a))
    return new_a, new_b

ratings = {s: 1000.0 for s in systems}  # conventional start
for a, b, winner in comparisons:
    sa = 1.0 if winner == a else 0.0 if winner == b else 0.5
    ratings[a], ratings[b] = update_elo(ratings[a], ratings[b], sa)
\`\`\`

Elo is great for *online* settings where comparisons arrive continuously (a live arena) and for letting new systems join without refitting everything. Its catch: results depend on the *order* of comparisons (the K-factor controls volatility), so two runs over the same data in different orders give slightly different ratings. For a fixed offline dataset, Bradley-Terry's order-independent fit is usually preferable; shuffle-and-average Elo if you must use it offline.

**Bradley-Terry vs Elo, in short:** Bradley-Terry fits all comparisons jointly and is order-independent — best for a fixed offline set. Elo updates incrementally and is order-dependent — best for streaming/online ranking. They agree closely on large, balanced datasets.

## Step 4: Defeat position bias and the other failure modes

This is where most pairwise evaluations go wrong. The judge's verdict can be corrupted by *where* an answer appears, not just its quality.

**Position bias** is the big one: LLM judges (and humans) systematically favor the response shown first (sometimes the last). If you always put your candidate in slot A, you inflate its win rate for free. **The fix is to evaluate every pair twice with the order swapped (A,B) and (B,A), and only count a win if the same response wins both orderings; disagreements become ties.** This single mitigation removes most position bias.

\`\`\`python
def debiased_compare(judge, prompt, resp_x, resp_y):
    v1 = judge(prompt, resp_x, resp_y)  # X in slot A
    v2 = judge(prompt, resp_y, resp_x)  # X in slot A's opponent (swapped)
    x_wins_1 = v1 == "A"
    x_wins_2 = v2 == "B"  # swapped, so X is now B
    if x_wins_1 and x_wins_2:
        return "X"
    if (not x_wins_1) and (not x_wins_2):
        return "Y"
    return "tie"  # judge disagreed across orderings -> unreliable
\`\`\`

Other biases to control:

- **Verbosity / length bias** — judges favor longer answers. Watch whether the winner is consistently longer; if so, instruct the judge to ignore length and reward concision, and check the length distribution of winners.
- **Self-preference bias** — an LLM judge favors outputs from its own model family. Use a judge from a different family than the systems under test, or use an ensemble of judges.
- **Self-enhancement / style bias** — judges over-reward confident tone or markdown formatting. Tighten the rubric to the dimensions you actually care about.
- **Stale tie handling** — decide up front whether ties are dropped, counted as half a win (Elo), or modeled explicitly; inconsistent tie handling skews ratings.

Always validate your LLM judge against a sample of human comparisons before trusting it at scale — measure agreement, and if it is low, the judge is the wrong tool for that task. Ready-made judge and eval setups are catalogued in the [skills directory](/skills).

## End-to-end example

A realistic offline pairwise evaluation looks like this:

1. Pick 200 representative prompts.
2. Generate one response per system for each prompt.
3. For every pair of systems on every prompt, run the **order-swapped** debiased comparison with your LLM judge.
4. Drop or split ties consistently.
5. Fit Bradley-Terry over all comparisons to get ratings.
6. Bootstrap the comparison set (resample with replacement, refit) to get 95% confidence intervals — overlapping intervals mean the systems are statistically tied.
7. Report ratings *with* intervals, the judge model used, and the de-biasing method.

That confidence interval is the honest part most write-ups skip: a 12-point rating gap inside overlapping intervals is not a real win.

## Frequently Asked Questions

### What is pairwise LLM evaluation?
Pairwise LLM evaluation compares two model outputs side by side and asks which is better, instead of scoring each one on an absolute scale. You collect many of these A-vs-B verdicts from humans or an LLM judge, then convert the win/loss record into a ranking using Bradley-Terry or Elo. It is the method behind the LMSYS Chatbot Arena and is preferred because relative judgments are far more reliable than absolute scores.

### What is the difference between Bradley-Terry and Elo for ranking models?
Bradley-Terry fits a strength parameter for every system jointly over all comparisons via maximum likelihood, so it is order-independent and ideal for a fixed offline dataset. Elo updates ratings incrementally after each comparison, so it suits streaming or online settings and lets new systems join without refitting, but its results depend on comparison order. On large balanced datasets the two agree closely.

### How do I fix position bias in pairwise evaluation?
Evaluate every pair twice with the order swapped — once as (A, B) and once as (B, A) — and only count a response as the winner if it wins in both orderings, treating disagreements as ties. This removes most of the systematic preference judges show for the first (or last) position. Randomizing order alone is not enough; the swap-and-confirm method is what makes results trustworthy.

### Why is pairwise comparison better than absolute scoring?
Absolute scoring is unreliable because judges anchor their scales differently and drift over time, and scores tend to cluster so closely that they fail to separate similar systems. Pairwise comparison only requires a relative "which is better" decision, which is cognitively easier and far more consistent for both humans and LLM judges. The trade-off is that you must aggregate many comparisons into a ranking.

### What biases affect LLM judges in pairwise evaluation?
The main ones are position bias (favoring the first or last response), verbosity bias (favoring longer answers), and self-preference bias (favoring outputs from the judge's own model family). Mitigate them by swapping order and confirming, instructing the judge to ignore length while checking the winners' length distribution, and using a judge from a different model family or an ensemble of judges. Always validate the judge against human comparisons first.

### How many comparisons do I need to rank LLMs reliably?
There is no fixed number, but you need enough comparisons per pair that the confidence intervals around each rating do not overlap for systems you claim are different. Bootstrap the comparison set — resample with replacement and refit — to estimate those intervals. Many hundreds to thousands of comparisons are typical for separating close models; if intervals overlap, the systems are statistically tied regardless of the raw rating gap.
`,
};
