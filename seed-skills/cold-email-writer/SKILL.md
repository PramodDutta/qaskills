---
name: Cold Email Writer
description: Write personalized cold outreach emails to hiring managers and founders - specific, human, not a pitch deck
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [networking, career, outreach, job-search]
testingTypes: [career]
frameworks: []
languages: [markdown]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Cold Email Writer

## When to Use This Skill

Use this skill when the user wants to:
- Write a cold outreach email to a hiring manager, founder, or recruiter
- Reach out about a job opening they weren't referred to
- Introduce themselves to a company they want to work at
- Mentions: "cold email", "reach out", "intro email", "outreach", "contact hiring manager"

## Core Principle

Cold emails fail because they sound like cover letters. The goal is to sound like a smart person who genuinely noticed something specific about the company -> not a candidate broadcasting their credentials.

**The email should feel like:** A colleague mentioning something interesting they read, not a sales pitch.

## The Template Structure

### Subject
```
Quick intro -> [First Name Last Name]
```
Simple. No clickbait. No role title. Just a name.

### Opening -> The Hook (2-3 sentences)
Start with what genuinely pulled the candidate in. Must be specific to this company -> not a generic compliment.

```
I just came across [Company] and ended up spending more time on it than I expected.
[One specific thing that caught their attention -> a stat, a product decision, a market insight from the JD or website]
```

**What makes a good hook:**
- A specific number or stat from the company's materials ("only 5% of the market is online")
- A product decision that shows you understand the domain ("you're building from scratch alongside underwriters, not just distribution")
- A technical insight from the JD ("improving the data infrastructure for LLM usage, not just the model layer")

**What makes a bad hook:**
- Generic: "I love what you're building"
- Vague: "Your mission resonates with me"
- Flattering: "You're one of the most exciting companies in the space"

### Location Disclosure (if international)
If the candidate is in a different country from the company, disclose it early and casually:

```
Before you read further, I should mention I'm based in [country]. But if we both
feel there's a strong fit, I'd be open to figuring things out.
```

### Experience Gap (if applicable)
If the role lists more years than the candidate has, acknowledge it briefly and redirect:

```
The role mentions [X] years of experience -> I'm at [Y], but the work I've
shipped is production-facing and I'd rather you judge that directly.
```

### The Body -> Who They Are (3-5 sentences)
Current role → relevant past → one or two projects. Keep it contextual, not a list.

```
A bit about me: I currently work at [Company], [one line on what the company does],
where I [what they actually do there -> not a job title]. Before that I worked
with teams in [region], mostly around [relevant domain].

On the side I've been building [Project] ([link if applicable]) -> [one line: what
it is and one proof point like "got to paying clients" or "20K downloads"].
```

**Rules:**
- Mention work as context, not as proof of greatness
- No achievement listings ("I increased X by Y%") -> let the project speak
- If current company is remote with a European/international team, say so explicitly
- Keep project mentions to one or two max -> the most relevant ones only

### The Connection (1-2 sentences)
Bridge between their background and the specific role. Should feel like an observation, not a claim.

```
I think you're looking for [what the role actually wants] -> that's the kind of
work I've been doing, and honestly I feel like I'd be a strong fit.
```

Or more specific:
```
My stack maps naturally to yours -> [specific tech overlap]. But more than the
stack, it's the [domain/problem] that I'm genuinely interested in.
```

### Portfolio Link
```
More about me: [portfolio URL]
```

One line. No elaboration.

### Closing
End with low-pressure, confident energy. Not desperate, not corporate.

```
I'm currently at [Company] and open to what's next. I think my experience lends
nicely to what you're building -> so I think we'd both get something out of a
conversation.

[First Name]
[email]
```

**Avoid:**
- "I look forward to hearing from you"
- "Please find attached my resume"
- "I would love the opportunity to..."
- "I am excited to potentially join..."

## Research Before Writing

Before writing the email, gather:
1. **Company angle** -> read their website, JD, or About page. Find one specific thing worth mentioning.
2. **Recipient name** -> LinkedIn, team page, or AngelList. "Hi [Name]" beats "Hi Hiring Manager" every time.
3. **Relevant projects** -> match the candidate's most relevant work to the role domain.
4. **Stack overlap** -> mention it only if there's a genuine match.

If the user provides a JD but no company website, ask for it or fetch it before writing.

## Length Guidelines

- **Ideal:** 200-300 words
- **Maximum:** 400 words
- **Minimum:** 150 words (don't strip out substance for brevity)

Longer is fine if every sentence earns its place. Cut anything that could apply to any company.

## Output Format

Always wrap the final email in a plain code block for clean copy-paste:

```
Subject: Quick intro -> [Name]

Hi [Name],

[Email body]

[First Name]
[email]
```

## Common Mistakes to Avoid

**Too confident:**
❌ "I would be an exceptional addition to your team"
❌ "My background uniquely positions me for this role"
✅ "I feel like I'd be a strong fit" -> states a belief, doesn't claim certainty

**Too humble:**
❌ "I know I may not have all the experience you're looking for, but..."
❌ "I'm just reaching out on the off chance..."
✅ Acknowledge gaps directly and move on -> don't apologize

**Too long:**
❌ Three paragraphs listing every achievement
✅ One paragraph on background, one on the connection

**Too generic:**
❌ Opening with "I am writing to express my interest in..."
✅ Opening with what specifically pulled them to this company

**No research:**
❌ "I love your product and mission"
✅ "The 5% stat -> only 5% of a $25B market online -> doesn't feel like a feature gap, it feels like an entire industry that hasn't digitised"

## Example Email

```
Subject: Quick intro -> Sarah Chen

Hi Marcus,

I just came across Meridian and spent more time on your site than I planned.
What pulled me in was the framing around your data infrastructure -> you're not
just building an LLM layer on top of existing records, you're rethinking how
clinical data flows through the system in the first place. That's a harder
problem and a more interesting one.

I'm based in India, flagging that upfront. Happy to figure out the rest if
there's a real fit.

I currently work at Lune, a London-based climate intelligence company, where I
build event-driven data pipelines and agentic AI workflows for emissions
compliance -> regulated, data-intensive systems where reliability isn't optional.
I also built Memos, a RAG system from scratch: hybrid retrieval, reranking,
ChromaDB, FastAPI. And InframetAI, an SDK for LLM cost and latency
observability that came out of seeing what breaks when the data layer isn't
designed around how models actually work.

I think you're looking for engineers who've actually built AI systems end to
end, not just wrapped APIs. That's the work I've been doing.

More about me: yourportfolio.com/about

I'm currently at Lune and open to what's next. I think my experience maps
closely to what you're building -> so I think we'd both get something out of
a conversation.

Sarah
sarah@email.com
```

## For QA and Testing Roles

Cold outreach works unusually well in QA because you can attach proof nobody else sends: a short bug report. Spend twenty minutes with the company's product, find one real defect or UX papercut, and write it up properly (steps, expected vs actual, impact). "I found this in your signup flow; here is the reproduction" gets replies that "I am passionate about quality" never will. Keep it respectful (no security probing without authorization, no public disclosure) and make the ask small: fifteen minutes with whoever owns quality.

---

### License and attribution

Adapted for QA professionals by The Testing Academy (thetestingacademy) from
[Resume Skills](https://github.com/Paramchoudhary/ResumeSkills). The original work
is used under the MIT License, reproduced in full below. Modifications to this file
are released under the same license.

```
MIT License

Copyright (c) 2026 Resume Skills

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
