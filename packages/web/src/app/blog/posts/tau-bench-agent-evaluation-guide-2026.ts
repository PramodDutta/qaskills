import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "τ-bench (tau-bench) Agent Evaluation Guide (2026)",
  description: "A 2026 guide to tau-bench (τ-bench): how Sierra's tool-agent-user benchmark works across retail and airline domains, and how pass^k measures reliability.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# τ-bench (tau-bench) Agent Evaluation Guide (2026)

τ-bench (tau-bench) is an open-source benchmark from Sierra for evaluating tool-using LLM agents. Each task drops an agent into a domain (retail or airline) where it must talk to a user — itself simulated by an LLM — gather missing details, and call domain API tools that read and write a database, all while obeying a written policy. Success is judged on the **final world state**: tau-bench compares the database and required outputs against an annotated goal, not the conversation. Its headline metric, **pass^k**, measures whether an agent solves the same task on *every* one of k tries — reliability, not luck.

This guide explains tau-bench's three ingredients, why it grades outcomes instead of transcripts, the pass^k versus pass@k distinction, and how to run the eval yourself. tau-bench evolves quickly, so treat the commands as accurate usage patterns and confirm exact flags against the official \`sierra-research/tau-bench\` repository before pinning anything in CI.

## What tau-bench actually measures

Most LLM benchmarks ask a single question and grade a single answer. Real agents do something much harder: they hold a multi-turn conversation, decide which tools to call, mutate stateful systems (orders, bookings, refunds), and stay inside business rules the whole time. tau-bench was built to measure exactly that loop.

Introduced by **Sierra** (the conversational-AI company), tau-bench — written τ-bench, where the Greek letter τ stands for "tool-agent-user" — emulates the dynamic between three parties: a customer who wants something, an agent that can act on the customer's behalf, and a backend the agent operates through. The benchmark's own framing is that it evaluates "tool-agent-user interaction in real-world domains." That is the gap it fills versus single-turn Q&A evals.

If you have ever shipped a chatbot that demoed beautifully and then made inconsistent, policy-violating decisions on real traffic, tau-bench is designed to quantify that failure mode before it reaches customers. For a broader primer on how agent scoring works across tools, see our [AI agent evaluation overview](/blog).

## The three ingredients of a tau-bench task

Every tau-bench task is assembled from three components. Understanding how they fit together *is* the benchmark.

### 1. A user simulated by an LLM (with a hidden intent)

The "user" in tau-bench is not a fixed script — it is another language model given a scenario and a goal it must pursue through natural conversation. The agent does **not** see this hidden intent up front. It has to ask questions, interpret vague or incomplete requests, and extract the information it needs ("Which order? What's your email? Do you want a refund or an exchange?"), exactly as a human support agent would.

Because the user is an LLM, the same underlying task can be expressed in many different phrasings across runs. That is deliberate: it stresses the agent's ability to handle linguistic variation while the task's *semantics* stay constant. tau-bench lets you choose the user-simulator model and strategy independently from the agent model, which matters for fair comparisons (more on that below).

### 2. Domain tools that read and write a database

The agent is handed a set of domain API functions — the only way it can affect the world. These split into two kinds:

- **Read operations** — look up a user, find an order, check a flight's status, list a customer's reservations.
- **Write operations** — cancel or modify an order, issue a refund, change a booking, update an address.

Behind these tools sits a realistic, modular database. When the agent calls \`cancel_order\` or \`modify_reservation\`, it actually changes records in that database. This is what makes tau-bench *stateful*: the consequences of the agent's actions persist and accumulate, just like a production system. An agent cannot bluff its way through; it has to make the right tool calls in the right order with the right arguments.

### 3. A domain policy document the agent MUST follow

Each domain ships with a **policy document** — plain-language rules describing what the agent is and isn't allowed to do. Think: "you may only issue a refund if the order is within the return window," or "you must verify the customer's identity before modifying a booking," or "gift-card purchases cannot be refunded to a credit card." The agent receives this policy as context and is expected to obey it.

This is the part that separates tau-bench from a naive tool-use test. A model that calls the right API but *violates policy* (refunding an ineligible order, skipping identity verification) has failed the task even if the customer walks away happy. Encoding real business constraints is what makes the benchmark a meaningful proxy for production support work.

## The two domains: retail vs airline

tau-bench ships with two domains, each with its own database schema, tool set, policy document, and annotated tasks. They differ in complexity, which makes them useful as an easy/hard pair.

| Aspect | Retail (τ-retail) | Airline (τ-airline) |
|---|---|---|
| Scenario | E-commerce customer service | Airline booking & support |
| Typical user goals | Cancel/modify an order, return an item, get a refund, change shipping address | Change/cancel a flight, rebook, handle baggage, apply travel credits |
| Tool surface | Order, product, and user lookups + write actions (cancel, exchange, refund) | Reservation, flight, and passenger lookups + write actions (modify, cancel, rebook) |
| Policy flavor | Return windows, refund eligibility, payment-method rules | Fare rules, change fees, cabin/segment constraints, verification |
| Relative difficulty | More tractable | Generally harder — more interdependent rules and constraints |

The airline domain is widely treated as the tougher of the two: its policies interact in more complex ways, so an agent has to reason over several constraints at once before acting. Reporting results on **both** domains gives you a fuller picture than either alone — strong retail numbers can mask brittleness on airline's harder policy reasoning.

## Why tau-bench grades outcomes, not conversations

Here is the design decision that most distinguishes tau-bench: it does **not** grade the dialogue. It grades the result.

After the conversation ends, tau-bench compares the **final database state** (plus any required information the agent was supposed to convey to the user) against an **annotated goal state** for that task. If the records match what they should be — the order is cancelled, the refund is the correct amount, the booking reflects the requested change — and the required outputs were communicated, the task passes. Otherwise it fails. In Sierra's own words, the approach focuses on "evaluating agents on goal database state (as opposed to evaluating the conversation itself)," using a stateful scheme that "compares the database state after each task completion with the expected outcome."

Why outcome comparison instead of grading the transcript turn by turn? A few reasons:

- **There is no single "correct" conversation.** Two competent agents can reach the same correct result via wildly different dialogues. Grading the words would punish valid variation and reward verbose box-ticking.
- **State is objective and checkable.** "Is the order cancelled and was $42.00 refunded to the original payment method?" is a deterministic yes/no. "Was the conversation good?" is not — it would itself require an LLM judge, adding cost and noise.
- **It mirrors what the business cares about.** A customer doesn't care how polite the bot was if their refund never went through. The world state *is* the deliverable.
- **It's fast and faithful.** Deterministic state checks run quickly and reproducibly, with none of the flakiness of LLM-as-judge scoring.

This is the same instinct behind end-to-end testing in traditional QA: assert on the resulting system state, not on the exact clicks that got you there. If you care about how outcome-based grading compares to transcript- or rubric-based approaches across tools, see our [evaluation tool comparison hub](/compare).

## pass^k vs pass@k: the reliability metric that matters

tau-bench's signature contribution is popularizing **pass^k** (read "pass-hat-k") as a reliability metric, in deliberate contrast to the familiar **pass@k**.

The difference is everything:

| Metric | Definition | What it rewards | Question it answers |
|---|---|---|---|
| **pass@k** | Run a task k times; it counts as solved if **at least one** of the k runs passes | Best-case / any-of-k success | "Can the agent *ever* do this?" |
| **pass^k** | Run a task k times; it counts as solved only if **all k** runs pass | Worst-case / consistency | "Can the agent do this *every single time*?" |

Formally, for one task with per-trial success probability p, pass@k ≈ 1 − (1 − p)^k (it *rises* toward 1 as k grows, because more attempts give more chances), while pass^k ≈ p^k (it *falls* toward 0 as k grows, because every attempt must succeed). The benchmark reports **pass^k** as the fraction of tasks for which *every one* of the k independent trials passed.

The intuition for production: run the same task k times — same goal, different conversational phrasings from the simulated user — and pass^k is the share of tasks the agent nailed on **all** k attempts. That maps directly onto reality. A retail agent handling one return is task #1; the *next* customer with the *same* kind of return is an independent trial of that task. You don't ship an agent that resolves a refund once in five tries — you need it right for every customer, every time.

This is why a "70% one-shot agent" can be far worse than it sounds. If a task succeeds 70% of the time independently each run, the chance it succeeds on **8 consecutive** customers is roughly 0.70^8 ≈ 6%. Sierra observed exactly this collapse: in their reporting, a strong model's reliability dropped sharply from pass^1 down to a small fraction by pass^8 on τ-retail — a large degradation from running the *same* task repeatedly. pass^k surfaces the brittleness that pass@k and one-shot accuracy hide.

\`\`\`python
# Intuition for pass^k vs pass@k for a single task.
# results[i] = list of k boolean trial outcomes for task i.
results = [
    [True,  True,  True,  False],  # task 0: passed 3/4 trials
    [True,  True,  True,  True ],  # task 1: passed 4/4 trials
    [False, True,  False, True ],  # task 2: passed 2/4 trials
]

def pass_at_k(rows):   # any-of-k: at least one trial passes
    return sum(any(r) for r in rows) / len(rows)

def pass_hat_k(rows):  # all-of-k: every trial passes (reliability)
    return sum(all(r) for r in rows) / len(rows)

print(pass_at_k(results))   # 1.0  -> every task passed at least once
print(pass_hat_k(results))  # 0.33 -> only 1 of 3 tasks passed all 4 trials
\`\`\`

The takeaway: **pass@k flatters your agent; pass^k tells you whether to ship it.**

## How to run tau-bench

tau-bench is open source and driven from a single \`run.py\` entrypoint. The flow is: install it, set provider API keys, pick an agent model and a *separate* user-simulator model, choose a domain and a number of trials, run, then read the resulting reward (pass rate) and pass^k.

### 1. Install

\`\`\`bash
git clone https://github.com/sierra-research/tau-bench
cd tau-bench
pip install -e .
\`\`\`

### 2. Set provider API keys

tau-bench is provider-agnostic and reads credentials from environment variables. Set the keys for whichever providers you'll use for the agent **and** the user simulator:

\`\`\`bash
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
# Other providers (e.g. Google, Mistral) are supported too — set as needed.
\`\`\`

### 3. Run the evaluation

The core invocation specifies the agent strategy, the environment, the agent model and provider, the user-simulator model and provider, the user strategy, the task split, and how many trials to run per task. The exact flags (verified against the repo's \`run.py\`) are:

\`\`\`bash
python run.py \\
  --agent-strategy tool-calling \\
  --env retail \\
  --model gpt-4o \\
  --model-provider openai \\
  --user-model gpt-4o \\
  --user-model-provider openai \\
  --user-strategy llm \\
  --task-split test \\
  --num-trials 5 \\
  --max-concurrency 10
\`\`\`

Key flags, decoded:

- \`--agent-strategy\` — the agent scaffold. Choices include \`tool-calling\`, \`act\`, \`react\`, and \`few-shot\`. \`tool-calling\` uses the model's native function-calling; \`react\` interleaves reasoning and actions (ReAct).
- \`--env\` — the domain: \`retail\` or \`airline\`.
- \`--model\` / \`--model-provider\` — the **agent** model and where it's hosted.
- \`--user-model\` / \`--user-model-provider\` — the model that **simulates the customer**. Keep this fixed across comparisons so the agent is the only variable.
- \`--user-strategy\` — how the user is simulated (default \`llm\`; other strategies such as \`react\`, \`verify\`, and \`reflection\` exist).
- \`--task-split\` — which task set to run (\`test\`, \`train\`, or \`dev\`).
- \`--num-trials\` — how many independent runs per task. **You need more than one** to compute pass^k — set this to k (e.g. 5 or 8).
- \`--max-concurrency\` — parallel task execution to speed up large runs.

Because the user simulator and any LLM-as-judge components consume tokens *in addition to* the agent's own calls, a full multi-trial run across all tasks can be expensive. Start with a handful of \`--task-ids\` and a small \`--num-trials\` while you wire things up, then scale to the full split.

### 4. Read the results responsibly

A run prints a per-task **reward** (1 for a passing final state, 0 otherwise) and aggregate pass rates. To get pass^k you run with \`--num-trials k\` and look at the fraction of tasks where *all* k trials earned reward 1. Interpret the output with these guardrails:

- **Report both domains and the k.** "82% pass^1 on τ-retail" and "61% pass^4 on τ-airline" describe very different things. Always state the metric, the domain, and k.
- **Hold the user simulator constant.** If you change \`--user-model\` between two agent comparisons, the comparison is contaminated — a weaker simulated user can make a worse agent look better.
- **Watch the pass^k curve, not just one point.** The *shape* of pass^1 → pass^k reveals reliability. A model that starts high and decays gently is more production-ready than one that starts higher but collapses.
- **Don't over-index on a single seed.** Stochastic agents vary run to run; that variance is the *point* of pass^k, so don't "fix" it away with temperature 0 if your production system runs warmer.

A responsible summary looks like: "On τ-retail test split, agent X achieved Y% pass^1 and Z% pass^4 with a fixed gpt-4o user simulator at temperature 0" — never a bare, context-free percentage.

## A note on tau2-bench (τ²-bench) and beyond

tau-bench has successors. **tau2-bench (τ²-bench)** extends the original with a richer, more challenging setup and additional domains, and later iterations push further still — the repository now points users toward newer versions that add domains such as banking and even a voice evaluation modality. The conceptual core, though, is unchanged: a simulated user, domain tools over a stateful database, a policy to obey, outcome-based state comparison, and reliability measured with pass^k. If you're starting fresh in 2026, check which version the community is benchmarking on, but everything in this guide transfers directly.

## When to reach for tau-bench

Use tau-bench when you're building or evaluating an agent that **acts** — calls tools, mutates real systems, and must respect business rules over a multi-turn conversation — rather than one that merely answers questions. It's the right benchmark for customer-support agents, ops automation, and any "talk to the user, then do the thing" workflow where consistency is non-negotiable. If your agent is single-turn or read-only, a lighter Q&A eval will serve you better. To find install-ready evaluation and agent-testing skills for AI coding agents, browse [/skills](/skills).

## Frequently Asked Questions

### What is tau-bench (τ-bench)?

tau-bench (τ-bench) is an open-source benchmark from Sierra for evaluating tool-using LLM agents in realistic domains. Each task pairs the agent with an LLM-simulated user and a set of domain API tools that read and write a database, and requires the agent to complete the user's request while obeying a written policy document. Success is judged by comparing the final database state against an annotated goal, not by grading the conversation.

### What is pass^k in tau-bench, and how is it different from pass@k?

pass^k (pass-hat-k) is the probability that an agent solves the same task on **all** k independent trials — a measure of reliability and consistency. pass@k, by contrast, counts a task as solved if **any** of k trials succeed, rewarding best-case behavior. As k grows, pass@k rises toward 1 while pass^k falls toward 0, which is why pass^k exposes the brittleness that one-shot accuracy and pass@k hide.

### What domains does tau-bench include?

tau-bench ships with two domains: retail (τ-retail), an e-commerce customer-service setting, and airline (τ-airline), an airline booking-and-support setting. Each has its own database, tool set, policy document, and annotated tasks. The airline domain is generally considered harder because its policies interact in more complex ways, so reporting results on both gives a fuller picture of an agent's capabilities.

### Why does tau-bench evaluate the database state instead of the conversation?

Because there's no single correct dialogue — many different conversations can reach the same correct result — grading the transcript would punish valid variation and require a noisy LLM judge. Comparing the final database state against an annotated goal is objective, deterministic, fast, and reproducible, and it reflects what the business actually cares about: whether the refund was issued or the booking was changed correctly, not how the bot phrased things.

### How do I run tau-bench?

Clone \`sierra-research/tau-bench\`, run \`pip install -e .\`, and set provider keys like \`OPENAI_API_KEY\` and \`ANTHROPIC_API_KEY\`. Then run \`python run.py\` with flags such as \`--agent-strategy tool-calling\`, \`--env retail\`, \`--model\` and \`--model-provider\` for the agent, \`--user-model\` and \`--user-model-provider\` for the simulated user, \`--user-strategy llm\`, \`--task-split test\`, and \`--num-trials k\`. Set \`--num-trials\` greater than 1 to compute pass^k, and read the per-task reward and aggregate pass rates from the output.

### Is tau-bench free and open source?

Yes. tau-bench is open source and installable from its GitHub repository with \`pip install -e .\`. You still need API access to at least one model provider for both the agent and the user simulator, and those calls incur the provider's own token costs, which add up across multiple trials. Confirm the current license, supported providers, and exact CLI flags in the official tau-bench repository.
`,
};
