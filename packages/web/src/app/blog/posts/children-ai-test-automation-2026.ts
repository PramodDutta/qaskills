import type { SeoClusterArticle } from './seo-cluster-article';

const pillarSlug = 'ai-test-automation-tools-2026';

export const aiTestAutomationChildren2026: SeoClusterArticle[] = [
  {
    slug: 'istqb-ct-ai-v2-guide-2026',
    clusterId: 'ai-test-automation',
    post: {
      title: 'ISTQB CT-AI v2.0 Guide for QA Engineers: What Changed in 2026',
      description:
        'Understand the ISTQB CT-AI v2.0 scope, syllabus changes, exam facts, practical exercises, migration choices, and a focused study plan for QA engineers.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Certification',
      image: '/blog/pillars/ai-test-automation.png',
      imageAlt:
        'ISTQB CT-AI v2.0 lifecycle map from AI input data through model and system testing',
      primaryKeyword: 'istqb ct-ai v2',
      keywords: [
        'istqb ct-ai v2',
        'istqb ai testing certification',
        'ct-ai v2 syllabus',
        'ct-ai v2 exam',
        'ai testing certification 2026',
        'testing ai based systems',
        'istqb ct-ai v1 vs v2',
        'machine learning testing syllabus',
      ],
      contentKind: 'child',
      pillarSlug,
      relatedSlugs: [
        pillarSlug,
        'ai4testing-vs-testing-ai-guide-2026',
        'testing-ai-generated-code-sdet-playbook',
        'self-healing-test-automation-guide',
      ],
      sources: [
        'https://istqb.org/wp-content/uploads/2026/05/ISTQB-_CTAI_Syllabus_v2.0_Release.pdf',
        'https://istqb.org/istqb-releases-certified-tester-ai-testing-ct-ai-syllabus-version-2-0/',
        'https://istqb.org/certifications/certified-tester-ai-testing-ct-ai/',
        'https://istqb.org/help/ct-ai-v2/',
        'https://istqb.org/certifications/certified-tester-ai-testing-ct-ai-retiring/',
        'https://istqb.org/certifications/gen-ai/',
      ],
      content: `ISTQB CT-AI v2 is the 2026 specialist syllabus for **testing AI-based systems**, not for using AI to automate ordinary testing. Version 2.0 replaces the mixed scope of v1.0 with a seven-chapter, machine-learning-lifecycle path covering data, models, system testing, generative AI, and ML development. Existing v1.0 certificates remain valid, and the old exam has published sunset dates. For the wider tooling context, start with the [AI test automation pillar](/blog/ai-test-automation-tools-2026); this guide answers what changed, who should switch, and how a QA engineer can prepare without relying on exam dumps.

The source of truth is the [CT-AI v2.0 GA syllabus](https://istqb.org/wp-content/uploads/2026/05/ISTQB-_CTAI_Syllabus_v2.0_Release.pdf), dated April 17, 2026, plus ISTQB's April 21 [release announcement](https://istqb.org/istqb-releases-certified-tester-ai-testing-ct-ai-syllabus-version-2-0/). Treat course slides, practice sites, and summaries as secondary aids. They can lag the release or preserve v1 terminology after the scope changed.

## The 2026 Change in One Decision Table

| Question | CT-AI v1.0 | CT-AI v2.0 | Practical decision |
|---|---|---|---|
| What is in scope? | Testing AI-based systems and using AI in testing | Testing AI-based systems only | Choose v2 for ML, GenAI, data, and model quality work |
| How is the content organized? | 11 chapters spanning both directions | 7 chapters organized around the ML lifecycle | Rebuild notes by lifecycle; do not renumber old flashcards |
| Is GenAI testing explicit? | Predates today's dedicated treatment | Includes a dedicated GenAI and LLM testing section | Study exploratory testing, evaluation challenges, and red teaming |
| Is practical work emphasized? | Four-day accredited training minimum in the original release | Three-day recommended training with hands-on objectives | Practice calculations and test design, not definitions alone |
| What happened to AI-assisted testing? | Included | Removed from CT-AI | Use CT-GenAI or an implementation guide for AI4Testing |
| Must a v1 holder retake? | Certificate already awarded | No mandatory upgrade or bridging exam | Retake only if the new learning outcomes justify it |

The table reflects ISTQB's own [v2 FAQ](https://istqb.org/help/ct-ai-v2/), not an inferred curriculum comparison. The FAQ says the syllabus moved from 11 chapters to 7, recommended training moved from four days to three, v2 focuses exclusively on testing AI-based systems, and v1 certificates remain valid. It also says there is no bridging exam.

## Why ISTQB Split "Testing AI" from "AI for Testing"

The split is the most important fact in this ISTQB CT-AI v2 guide. "Testing AI" means evaluating an AI-based product or component: its input data, trained model, probabilistic behavior, robustness, bias, deployment behavior, or GenAI output. "AI for testing" means using an AI capability to help test conventional software: generating cases, exploring a UI, repairing a locator, or summarizing failures.

Version 1.0 deliberately covered both. The official [retiring v1.0 page](https://istqb.org/certifications/certified-tester-ai-testing-ct-ai-retiring/) still describes its audience as people testing AI-based systems and/or applying AI in testing. Version 2.0 removes the second direction so it can go deeper into the first. ISTQB now points candidates interested in using generative AI during testing toward [CT-GenAI](https://istqb.org/certifications/gen-ai/).

That boundary prevents a common preparation failure: spending weeks comparing test-generation products for an exam centered on data representativeness, model metrics, test oracles, metamorphic relations, drift, and ML deployment. The sibling guide on [AI4Testing versus Testing AI](/blog/ai4testing-vs-testing-ai-guide-2026) applies the distinction to team strategy. The two practices can coexist in one QA organization, but they need different risks, evidence, and skills.

## The Seven-Chapter Lifecycle Map

The syllabus has seven numbered content chapters. Appendices and references appear later in the document, so "seven chapters" does not mean the PDF has only seven sections or a short reading load.

### 1. Introduction to artificial intelligence

The opening chapter establishes the system vocabulary needed for testing. It differentiates AI-based and conventional systems, discusses categories of AI, introduces generative AI, and covers implementation choices such as hardware, model hosting, pretrained models, frameworks, and the effects of standards and regulation. A tester should leave this chapter able to identify where learned behavior enters a system and where ordinary deterministic testing remains applicable.

### 2. Quality characteristics for AI-based systems

This chapter connects behavior to AI-specific quality characteristics and acceptance criteria. The syllabus aligns its treatment with ISO/IEC 25059. That does not turn every characteristic into one universal score. A safety-related classifier, a recommendation service, and a writing assistant have different harms, tolerances, and evidence. Translate characteristics into observable acceptance criteria tied to the deployment context.

### 3. Machine learning foundations

QA engineers need enough ML literacy to challenge a test design. The chapter covers forms of learning, the ML workflow, data preparation, training/validation/test datasets, confusion-matrix metrics, neural-network basics, and neural-network coverage measures. One learning objective explicitly asks candidates to calculate common classification metrics from confusion-matrix data. Reading definitions without doing calculations leaves a real gap.

### 4. Testing AI-based systems

This is the bridge from foundations to test strategy. It covers locked versus adaptive systems, statistical testing, test-oracle problems, GenAI and LLM testing, red teaming, AI/ML-specific test levels, and risk-based testing. The official syllabus makes red teaming an application-level learning objective, not merely a term to recognize.

### 5. Input data testing

Input data is executable risk in an ML product. This chapter covers bias, data pipelines, representativeness, constraints, and label correctness. It also includes a hands-on objective to perform input data testing. A mature QA plan therefore asks who supplied the data, what populations and operating conditions it represents, which constraints must hold, and how label quality is established.

### 6. Model testing

The model chapter assembles techniques suited to learned behavior. The syllabus includes functional performance testing, adversarial testing, back-to-back testing, metamorphic testing, experience-based testing, drift testing, overfitting and underfitting detection, and A/B testing. These are not interchangeable synonyms. Each addresses a different missing oracle, threat, or comparison.

### 7. ML development testing

The final chapter looks at risks introduced by ML development, configuration, frameworks, data allocation, interfaces, and deployment targets. The syllabus names deployment concerns such as cross-device behavior and API handling. This matters to SDETs because a model that looks acceptable in a notebook can still fail through preprocessing differences, serialization, resource limits, interface contracts, or target hardware.

## Exam Facts That Changed and Facts That Did Not

According to the official [CT-AI v2 certification page](https://istqb.org/certifications/certified-tester-ai-testing-ct-ai/), CTFL remains a prerequisite. The listed structure is 40 multiple-choice questions, 44 total points, a passing score of 29 points, and 60 minutes. Candidates taking the exam in a non-native language receive the documented 25 percent additional time. Confirm booking, language, accessibility, and provider rules with the selected exam provider because local administration is outside the syllabus.

The v2 FAQ says the exam format remains unchanged even though questions now derive from v2 learning objectives. That distinction matters: familiar timing does not make old question banks aligned. The certification page links official sample questions and answers; at the time of this update it lists sample materials as v2.1. Use those to learn question style and diagnose weak topics. Do not use leaked items, "actual exam" collections, or memorized dumps. They are neither reliable evidence of competence nor a safe way to track a newly restructured syllabus.

English-language v1.0 training, exams, and retakes remain available until April 21, 2027; other languages remain available until October 21, 2027, according to the [official transition FAQ](https://istqb.org/help/ct-ai-v2/). After those dates, ISTQB says training and examinations will use v2. A certificate already earned under v1 remains valid.

## A Six-Week Study Plan for Working QA Engineers

Use learning objectives as the backlog and practical artifacts as the definition of done. Adjust hours to experience, but preserve the sequence because later techniques depend on the earlier data and metric concepts.

### Week 1: establish the boundary and vocabulary

Read the introduction, business outcomes, chapter 1, and chapter 2. Create a one-page system map for an AI product you know: conventional components, data pipeline, model, inference boundary, users, affected groups, and monitoring. For every quality characteristic, write one context-specific risk and one candidate acceptance criterion. If the criterion says only "high accuracy," it is not yet operational.

### Week 2: work through ML data and metrics

Study chapter 3. Build small confusion matrices and calculate the metrics required by the learning objectives. Explain why the same matrix can be acceptable in one risk context and unacceptable in another. Trace training, validation, and test sets through the workflow and state what decision each supports. Keep the held-out test set separate from tuning decisions.

### Week 3: design system and GenAI tests

Study chapter 4. Compare a locked model with an adaptive model, then list the observability and regression implications of each. Write oracle strategies for outputs without one exact expected answer: property checks, reference comparisons, human evaluation, statistical thresholds, and metamorphic relations. Design a bounded red-team exercise with explicit authorization and stop conditions.

### Week 4: test a dataset

Study chapter 5 and perform the hands-on work. Define schema, range, uniqueness, missingness, relationship, provenance, and label-agreement checks. Segment results across relevant populations rather than reporting only an aggregate. Record limitations when a subgroup is too small to support a confident conclusion.

### Week 5: test a model and deployment path

Study chapters 6 and 7. Select model techniques based on risk instead of trying every named technique. Run at least one metamorphic relation, one robustness or adversarial probe, and one deployment contract check. Explain what each result proves and, equally important, what it does not prove.

### Week 6: retrieve, practice, and correct

Use the official sample exam under timed conditions. Map every error back to a learning objective and the relevant syllabus paragraph. Reperform calculations without notes. Review hands-on artifacts as if another tester must reproduce them. Finish by explaining the complete lifecycle aloud, from input data risk to production drift, without collapsing it into a tool list.

The [QASkills directory](/skills) can supply reusable testing workflows for an AI coding agent, and the [Playwright CLI skill](/skills/Pramod/playwright-cli) can support browser-based practice. Those are AI4Testing resources, not CT-AI syllabus replacements. Keep the category boundary visible in your notes.

## Example 1: Turn "Representative Data" into Testable Work

Suppose a support-ticket classifier routes cases into billing, account access, product defect, or abuse queues. "The dataset is representative" is too vague to test. A practical input-data review can produce this artifact:

This tool-neutral contract makes a small part of the expectation executable without claiming to measure representativeness by itself:

\`\`\`yaml
datasetContract:
  requiredFields: [ticketId, submittedAt, region, language, text, queueLabel]
  allowedQueueLabels: [billing, account-access, product-defect, abuse]
  uniqueFields: [ticketId]
  prohibitedOverlap: [training, held-out-evaluation]
  reportsRequired: [class-distribution, region-language-segments, label-review]
\`\`\`

| Risk | Check | Evidence | Failure response |
|---|---|---|---|
| A newly launched region is absent | Compare dataset share and expected operating share by region and language | Versioned distribution report with source dates | Collect data or limit the documented deployment population |
| Old product taxonomy corrupts labels | Validate labels against the current allowed queue set | Constraint results and rejected rows | Relabel or map through an approved migration |
| Rare abuse cases disappear in aggregate metrics | Report class counts and per-class outcomes | Segmented evaluation report | Change sampling/evaluation; do not hide the class in overall accuracy |
| Two annotators disagree systematically | Measure agreement and adjudicate a sample | Annotation guide, agreement result, adjudication log | Clarify policy and relabel affected records |

The example applies chapter 5 concepts without pretending a universal representativeness percentage exists. The deployment context determines the comparison population and acceptable uncertainty. A passing schema check cannot establish fairness, and a balanced sample can still have incorrect labels.

## Example 2: Use a Metamorphic Relation When the Oracle Is Weak

Consider a model that assigns a fraud-risk score to a transaction. For many real transactions, the exact correct score is unknown. A domain-approved metamorphic relation can still test consistency: changing a formatting-only field, such as whitespace in an optional merchant note, should not materially change the score when preprocessing is specified to normalize that field.

The test procedure is concrete:

1. Select a versioned evaluation sample that includes normal and edge cases.
2. Generate a transformed sample by applying only the approved formatting change.
3. Run both through the same model, preprocessing code, configuration, and hardware path.
4. Compare outputs using a tolerance justified by the requirement, not one chosen after seeing failures.
5. Investigate violations as possible preprocessing, feature leakage, numerical, or model-stability defects.

The core relation can be expressed as pseudocode before choosing a test framework:

\`\`\`text
baseline = model(preprocess(original_sample))
variant = model(preprocess(formatting_only_transform(original_sample)))
require distance(baseline, variant) <= requirement_approved_tolerance
\`\`\`

This is not a claim that every score must be bit-identical. It tests a stated relation under controlled conditions. The CT-AI syllabus includes applying metamorphic testing to derive cases, but the product team still owns the relation and threshold.

## Concrete Failure Paths During Preparation and Practice

### You study AI test-generation tools instead of AI systems

Symptom: notes center on prompts, copilots, and locator healing. Cause: v1 content or broad "AI testing" search results were used. Recovery: return to the v2 learning objectives and move AI-assisted testing notes into a CT-GenAI or AI4Testing folder.

### You memorize metrics but cannot choose one

Symptom: precision and recall formulas are correct, but you cannot explain the cost of false positives or false negatives. Recovery: attach every calculation to a decision, affected user, and error cost. Rework examples with different class prevalence and risk tolerance.

### Your test set influenced model tuning

Symptom: the final reported performance was repeatedly consulted while changing features or hyperparameters. Recovery: record the leakage, create a new held-out evaluation where feasible, and document the limits of earlier results. Renaming the dataset does not restore independence.

### A GenAI check expects one exact paragraph

Symptom: every semantically valid variation fails. Recovery: separate deterministic constraints from rubric-based, statistical, adversarial, and human evaluation. Read the [testing LLM applications guide](/blog/testing-llm-applications-guide) for broader implementation patterns, while using the CT-AI syllabus for certification scope.

### You treat a certificate as production approval

Symptom: a team cites CT-AI completion instead of product evidence. Recovery: build a risk-based strategy for the actual system, data, users, and deployment. Certification establishes a shared body of knowledge; it does not certify a model or satisfy organization-specific assurance obligations.

## Should You Finish v1.0 or Switch to v2.0?

Stay with v1 if you are far into accredited preparation, intend to sit before the relevant sunset date, and value finishing the mixed curriculum. Move to v2 if you are starting now, work on AI-based products, or need the lifecycle, GenAI, data, and model emphasis. A valid v1 holder does not need to retake. A professional may still choose v2 training for learning value, but ISTQB explicitly says no bridging exam exists.

If your day-to-day goal is generating or repairing conventional tests with AI, compare [AI4Testing and Testing AI](/blog/ai4testing-vs-testing-ai-guide-2026), then use the [AI-generated code review playbook](/blog/testing-ai-generated-code-sdet-playbook) and [self-healing governance guide](/blog/self-healing-test-automation-guide). CT-AI v2 deliberately does not teach those operational workflows.

## Version and Scope Limitations

This guide is current to July 14, 2026 and references the CT-AI v2.0 GA syllabus dated April 17, the April 21 release, and the official pages available on the update date. ISTQB can revise sample materials, exam-structure documents, translations, and provider links without changing the syllabus version. Verify those assets before booking.

The syllabus summarizes referenced standards, including ISO/IEC 25059, but the standard's full text and an organization's regulatory obligations are separate sources. CT-AI also does not prescribe one production toolchain, one fairness metric, one red-team method, or one acceptance threshold. The examples here illustrate syllabus application; they are not exam questions and are not universal compliance controls.

## Frequently Asked Questions

### 1. What is ISTQB CT-AI v2.0?

It is ISTQB's current specialist certification syllabus for testing AI-based systems. It covers AI and ML foundations, AI quality characteristics, input data, model and system testing, GenAI/LLM testing, and ML development testing through a lifecycle-oriented structure.

### 2. What was removed from CT-AI v2?

Content about using AI to support software testing was removed. ISTQB directs candidates interested in generative AI applied to the testing process toward CT-GenAI. CT-AI v2 uses its narrower scope to deepen testing of AI-based systems.

### 3. Does a CT-AI v1 certificate expire when v1 exams retire?

No. ISTQB states that certificates obtained under v1 remain valid and there is no mandatory retake. The sunset dates govern availability of v1 training and exams, including retakes, rather than already issued certificates.

### 4. Is CTFL still required for the CT-AI v2 exam?

Yes. The official certification page lists ISTQB Certified Tester Foundation Level as the entry requirement. Confirm that your certificate and chosen provider satisfy booking requirements before paying.

### 5. How difficult is the CT-AI v2 exam?

Difficulty depends on the candidate's testing, data, and ML background. The learning objectives include understanding and application, including metric calculations, dataset constraints, metamorphic test design, red teaming, and hands-on work. A definitions-only study method is therefore incomplete.

### 6. Are exam dumps a good way to prepare?

No. Use the syllabus, learning objectives, accredited training if desired, and official sample questions and answers. Dumps can be unauthorized, inaccurate, or aligned to v1, and memorization does not build the practical reasoning emphasized by v2.

### 7. Does CT-AI v2 teach Playwright agents or self-healing tests?

No. Those are examples of AI used for conventional testing, outside the new CT-AI scope. Official Playwright agents can still be useful in a QA workflow, but they belong to AI4Testing rather than the CT-AI v2 body of knowledge.
`,
    },
  },
  {
    slug: 'ai4testing-vs-testing-ai-guide-2026',
    clusterId: 'ai-test-automation',
    post: {
      title: 'AI4Testing vs Testing AI: Two Different QA Strategies Explained',
      description:
        'Compare AI4Testing with Testing AI through scope, ownership, evidence, examples, risks, metrics, and a practical decision model for QA teams in 2026.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Strategy',
      image: '/blog/pillars/ai-test-automation.png',
      imageAlt:
        'Split QA strategy showing AI assisting conventional tests and testers evaluating an AI system',
      primaryKeyword: 'ai4testing vs testing ai',
      keywords: [
        'ai4testing vs testing ai',
        'ai for software testing',
        'testing ai systems',
        'ai assisted test automation',
        'ai testing strategy',
        'ai4testing examples',
        'machine learning system testing',
        'qa strategy for ai',
      ],
      contentKind: 'child',
      pillarSlug,
      relatedSlugs: [
        pillarSlug,
        'istqb-ct-ai-v2-guide-2026',
        'testing-ai-generated-code-sdet-playbook',
        'self-healing-test-automation-guide',
      ],
      sources: [
        'https://istqb.org/wp-content/uploads/2026/05/ISTQB-_CTAI_Syllabus_v2.0_Release.pdf',
        'https://istqb.org/istqb-releases-certified-tester-ai-testing-ct-ai-syllabus-version-2-0/',
        'https://istqb.org/certifications/gen-ai/',
        'https://playwright.dev/docs/test-agents',
        'https://airc.nist.gov/airmf-resources/airmf/5-sec-core/',
        'https://www.nist.gov/ai-test-evaluation-validation-and-verification-tevv',
        'https://dora.dev/research/2025/dora-report/',
        'https://dora.dev/ai/gen-ai-report/report/',
        'https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html',
      ],
      content: `AI4Testing vs Testing AI is a direction-of-use distinction. **AI4Testing uses AI to improve the testing process**: planning cases, generating automation, analyzing failures, or proposing repairs. **Testing AI evaluates an AI-based product**: its data, model, outputs, robustness, fairness, security, and behavior in operation. One is a test capability; the other is a test target. The [AI test automation tools pillar](/blog/ai-test-automation-tools-2026) covers the broader landscape. This guide gives QA leaders a clean boundary, an evidence model, and a way to run both strategies without confusing faster test creation with proof that an AI system is trustworthy.

The distinction became sharper in 2026. ISTQB's [CT-AI v2 release](https://istqb.org/istqb-releases-certified-tester-ai-testing-ct-ai-syllabus-version-2-0/) removed content about using AI for testing and now focuses exclusively on testing AI-based systems. ISTQB points the first use case toward [CT-GenAI](https://istqb.org/certifications/gen-ai/). This is a curriculum boundary, not a rule that one team cannot do both.

## Fast Boundary Check

| Decision question | AI4Testing | Testing AI | If both are present |
|---|---|---|---|
| What is the AI's role? | Assistant, generator, classifier, or repair mechanism in QA work | Component or behavior of the product under test | Draw two system boundaries and two risk registers |
| Primary outcome | Faster or more effective test work | Evidence that an AI-based system meets context-specific requirements | Never use productivity evidence as product assurance |
| Typical inputs | Requirements, code, DOM state, tests, logs, traces | Datasets, labels, prompts, model/version, configurations, user context | Control provenance and sensitive data separately |
| Typical oracle | Existing requirement, executable test, reviewer decision | Statistical threshold, property, relation, reference, human rubric | Preserve independent expected results |
| Main failure risk | Bad tests, missed defects, unsafe edits, false triage | Harmful, biased, insecure, drifting, or unreliable product behavior | Escalate failures to different owners |
| Core owner | QA automation or developer productivity team | Product, ML, data, safety, security, and QA jointly | Name one accountable owner for each decision |
| Release evidence | Review records, test quality, pipeline outcomes, tool audit trail | Versioned TEVV results tied to deployment context | Keep artifacts linked but not merged into one score |

Use the first row when terminology becomes vague: if removing the AI capability would remove only a QA helper, it is probably AI4Testing. If removing it would materially change the product's behavior for a user, it is Testing AI. An AI feature can also occupy both roles in one organization, but not in the same evidence claim.

## Strategy One: AI4Testing Improves How Tests Are Produced or Operated

AI4Testing applies an AI system inside the testing lifecycle. Examples include turning a requirement into a draft test plan, generating a Playwright test, classifying CI failures, clustering duplicate defects, proposing a locator repair, producing test data, or summarizing a trace. The application under test can be completely deterministic; the AI is in the QA toolchain.

Success is not "the model produced an answer." Success is an improvement in a test outcome with controlled risk. Useful outcome measures include review acceptance, escaped defects in the affected area, false triage decisions, time to reliable diagnosis, test mutation sensitivity, flaky-test rate, and changes to delivery stability. The measure must match the job. Counting generated test files rewards volume even when assertions are weak.

Official Playwright Test Agents are a concrete current example. The [Playwright agent documentation](https://playwright.dev/docs/test-agents) defines a planner that explores an application and writes a Markdown plan, a generator that turns a plan into Playwright tests while checking selectors and assertions live, and a healer that runs and repairs failing tests. These agents are AI4Testing because they change how conventional web tests are planned, implemented, and maintained.

AI4Testing still creates product risk. A generated test can assert the implementation instead of the requirement. A failure classifier can hide a regression as "infrastructure." A repair agent can weaken an assertion or skip a broken scenario. The SDET remains responsible for the test oracle, scope, evidence, and merge decision. Use the [AI-generated code review playbook](/blog/testing-ai-generated-code-sdet-playbook) when the assistant writes code, and the [self-healing governance guide](/blog/self-healing-test-automation-guide) when it proposes repair.

## Strategy Two: Testing AI Evaluates the AI-Based Product

Testing AI starts with a different system under test. A learned classifier, recommendation service, computer-vision component, adaptive control, LLM feature, RAG application, or tool-using agent influences user outcomes. The test strategy must account for data dependence, probabilistic or non-deterministic outputs, weak or expensive oracles, operational drift, and context-specific harm.

The [ISTQB CT-AI v2 syllabus](https://istqb.org/wp-content/uploads/2026/05/ISTQB-_CTAI_Syllabus_v2.0_Release.pdf) organizes this work across input data testing, model testing, system testing, GenAI and LLM testing, and ML development testing. It names techniques such as bias and label-correctness testing, statistical testing, red teaming, metamorphic testing, drift testing, back-to-back testing, A/B testing, and adversarial testing. The correct technique depends on risk; listing all of them is not a strategy.

NIST uses the broader term testing, evaluation, verification, and validation, or TEVV. Its [AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) calls for objective, repeatable, or scalable TEVV processes, documented test sets, metrics, tools, deployment-relevant conditions, production monitoring, and stated limits on generalizability. NIST's [TEVV program](https://www.nist.gov/ai-test-evaluation-validation-and-verification-tevv) also emphasizes that measurement changes with operating context. That means a benchmark score detached from users and deployment is insufficient product evidence.

Testing AI asks questions AI4Testing usually does not:

- Which people, conditions, languages, and edge cases are represented in the input and evaluation data?
- Which model, prompt, retrieval corpus, policy, tool set, and configuration produced this result?
- What variation is expected across repeated runs, and what variation is unacceptable?
- Which harms require adversarial, subgroup, safety, privacy, or security evaluation?
- How will drift, incidents, appeals, and feedback trigger reevaluation after release?

The [ISTQB CT-AI v2 guide](/blog/istqb-ct-ai-v2-guide-2026) maps those questions to the 2026 syllabus. For implementation beyond certification scope, the canonical [testing LLM applications guide](/blog/testing-llm-applications-guide) covers application-level evaluation patterns.

## Example A: AI4Testing with Playwright Planner, Generator, and Healer

Assume a conventional todo application uses deterministic application code. A team wants AI to accelerate browser-test creation without allowing autonomous merges. The executable example below uses Playwright's public TodoMVC demo rather than an invented application API.

First, generate the official agent definitions for the chosen client. Playwright says to regenerate them whenever Playwright is updated because the definitions contain current instructions and tools:

\`\`\`bash
npx playwright init-agents --loop=codex
\`\`\`

Then run a controlled sequence:

1. Give the planner a seed test, the todo behavior, the allowed public demo target, and a bounded request such as add, complete, and filter one item.
2. Review the Markdown plan for omitted negative paths, destructive actions, and incorrect expected results.
3. Let the generator produce tests only from the approved plan.
4. Review locators and assertions against Playwright's recommendation to test user-visible behavior and use resilient locators.
5. Run the suite in an isolated environment with trace and failure artifacts.
6. If the healer proposes a patch, compare intent before and after, inspect every changed file, and rerun the unmodified acceptance assertions.

The resulting test might contain:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('completed filter retains the completed item', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc/');
  const input = page.getByPlaceholder('What needs to be done?');
  await input.fill('Buy groceries');
  await input.press('Enter');

  const item = page.getByRole('listitem').filter({ hasText: 'Buy groceries' });
  await item.getByRole('checkbox').check();
  await page.getByRole('link', { name: 'Completed' }).click();

  await expect(item).toBeVisible();
  await expect(item.getByRole('checkbox')).toBeChecked();
});
\`\`\`

This is AI4Testing even if an agent planned and generated every line. The expected filter behavior comes from the application contract, not from the agent. A passing generated test is evidence about the todo behavior only after the team validates that the scenario and assertions represent the requirement.

## Example B: Testing an AI Ticket-Routing Model

Now assume the product itself predicts which support queue should receive a ticket. The AI changes a customer's wait path, so the test target includes data, model, integration, and operational behavior.

The team defines deployment-aware acceptance criteria before evaluating the model:

- A versioned held-out set reflects supported products, regions, languages, and ticket types.
- Results are reported per queue and critical subgroup, not only as one aggregate.
- High-risk abuse and account-access tickets have explicitly reviewed false-negative tolerances.
- A metamorphic check verifies that normalization-only changes, such as harmless surrounding whitespace, do not change routing.
- API tests reject unsupported schemas and preserve traceable model/version metadata.
- Production monitoring looks for input distribution and outcome changes that trigger review.

A test record should identify the dataset version, model artifact, preprocessing code, configuration, metric definitions, confidence or uncertainty treatment, and decision owner. If the model improves aggregate accuracy while degrading the account-access queue beyond its approved tolerance, it fails. A test-generation assistant may help create scripts for those checks, but that helper does not change the fact that this is Testing AI.

## Why the Evidence Models Must Stay Separate

AI4Testing evidence answers "Can we trust this assisted testing workflow enough for its permitted use?" Testing AI evidence answers "Does this AI-based product meet requirements and remain within risk tolerance in its deployment context?" They overlap in governance mechanics but not in conclusion.

For AI4Testing, preserve prompts or task instructions where policy permits, tool and model versions, input scope, proposed changes, reviewer decisions, test outcomes, and incidents such as unsafe edits. For Testing AI, preserve data/model lineage, evaluation design, reference decisions, segmented results, uncertainty, red-team findings, residual risks, release approval, and production feedback.

A common anti-pattern is circular assurance: an AI agent writes product code, writes the tests, repairs the tests, summarizes the run, and declares release readiness. OWASP's [Secure Coding with AI guidance](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html) warns that an agent can make CI green by weakening assertions, deleting tests, or testing the generated behavior rather than the correct behavior. Independent expected results and review break the circle.

## Build a Two-Lane QA Operating Model

### Lane A: govern AI-assisted testing as a toolchain capability

Inventory approved use cases. Define what data the assistant may receive, which repositories and commands it may access, whether output can be committed, and which changes always require specialists. Establish a small evaluation set of representative QA tasks and known traps. Measure outcomes, not prompt fluency.

The [QASkills directory](/skills) can provide explicit testing instructions for coding agents. The [Playwright CLI skill](/skills/Pramod/playwright-cli) supports auditable browser interaction. Skills improve task context; they do not grant correctness, permission, or independent review.

### Lane B: govern the product AI across its lifecycle

Map the intended purpose, affected users, foreseeable misuse, data and model supply chain, human decisions, and operational environment. Derive testable acceptance criteria from that map. Execute data, model, integration, system, adversarial, and production evaluations proportional to risk. Define rollback, fallback, incident, and reevaluation triggers before launch.

### Connect the lanes through controlled handoffs

An AI4Testing assistant may generate dataset checks or Playwright journeys for an AI product. Mark generated artifacts, review them against the Testing AI strategy, and execute them in the product evidence pipeline. The artifact can move between lanes; accountability does not. The product's release owner cannot cite "the assistant wrote 200 tests" as proof of quality.

## Use DORA as a Delivery Guardrail, Not an AI Scoreboard

DORA's [2025 State of AI-assisted Software Development](https://dora.dev/research/2025/dora-report/) describes AI as an amplifier of an organization's existing strengths and weaknesses. Its 2026 [Impact of Generative AI in Software Development](https://dora.dev/ai/gen-ai-report/report/) recommends strong, fast feedback loops including automated testing and code review because AI can generate large amounts of code rapidly.

For AI4Testing, track whether the capability improves reviewable throughput without degrading stability, rework, or escaped quality. For Testing AI, delivery metrics remain useful for the surrounding software process, but they do not replace model and system quality measures. A low change-failure rate says nothing by itself about subgroup harm or unsafe model outputs.

Run a balanced review monthly:

- Delivery: change lead time, deployment frequency, failed deployments, recovery, and rework in the affected service.
- Test capability: accepted versus rejected suggestions, false triage, flaky behavior, mutation sensitivity, and reviewer effort.
- Product AI: deployment-specific quality, safety, security, fairness, drift, incidents, and user feedback.

Correlate carefully. Do not claim causation from a short before/after window, and do not blend the categories into a single "AI quality" number.

## Concrete Failure Paths

### The team buys an AI test generator to solve model bias

The tool may help implement checks, but it cannot define represented populations, harm, or acceptance thresholds. Recovery: create a Testing AI risk and data strategy first, then use AI4Testing only for bounded execution support.

### A model benchmark becomes the release oracle

The benchmark may not reflect the product's data, workflows, or harms. Recovery: validate under deployment-like conditions, segment outcomes, test integrations, document generalization limits, and monitor operation as the NIST AI RMF recommends.

### A healer changes a failing expected result

The test becomes green by adopting current behavior. Recovery: block automatic assertion changes, compare against an independently approved requirement, inspect the diff, and treat changed product semantics as a defect or requirement decision.

### Every probabilistic variation is labeled flaky

Expected model variability and test-environment instability are different phenomena. Recovery: characterize repeated-run distributions, fix randomization controls where appropriate, define tolerances before execution, and keep infrastructure failures in a separate taxonomy.

### One "AI QA team" owns everything

The group becomes a bottleneck and lacks authority over data, product harm, security, and release. Recovery: use a cross-functional Testing AI model while keeping an enablement owner for AI4Testing tools. Assign accountability per decision, not per buzzword.

## A Practical Adoption Sequence

### Label one backlog before buying another tool

Take a representative sprint backlog and mark each AI-related item as **tool**, **target**, or **both**. "Generate checkout tests" is tool-side AI4Testing. "Evaluate recommendation diversity by user context" is target-side Testing AI. "Use an agent to generate those evaluation scripts" is both and needs a handoff. For every item, add an owner, expected evidence, prohibited data, independent oracle, and stop condition. Items that cannot be classified expose missing architecture or accountability. This exercise is more useful than debating terminology in isolation because it changes access, review, test design, and release evidence before implementation begins.

Start AI4Testing with a reversible, reviewable task such as drafting plans or summarizing traces. Establish a baseline, evaluate on representative tasks, require human approval, and expand permissions only when evidence supports it. Avoid beginning with autonomous test deletion, production data, or release decisions.

Start Testing AI at product discovery, not after model integration. Map intended use and harm, define data and evaluation needs, reserve independent test assets, instrument version lineage, and set production monitoring before release. The order matters because evaluation cannot recover missing provenance or an evaluation set repeatedly used for tuning.

When both begin together, create the two-lane artifact model on day one. Label which AI is the tool and which AI is the target in architecture diagrams, tickets, tests, dashboards, and incident records. That small naming discipline prevents expensive evidence confusion later.

## Version and Terminology Limitations

This comparison is current to July 14, 2026. "AI4Testing" and "Testing AI" are useful directional labels, but organizations and standards may use "AI for testing," "testing of AI," "AI-assisted testing," or TEVV. Define terms locally instead of assuming a vendor's category has the same boundary.

ISTQB CT-AI v2.0 is the current cited syllabus; v1.0 remains temporarily available under published sunset dates. NIST states that AI RMF 1.0 is voluntary and is being revised, so verify the current framework before using it in policy. Playwright's agent definitions evolve with releases; official documentation says to regenerate them whenever Playwright is updated. None of these sources supplies a universal acceptance threshold or removes applicable legal, safety, privacy, and domain obligations.

## Frequently Asked Questions

### 1. What is the simplest difference between AI4Testing and Testing AI?

AI4Testing makes testing work more capable or efficient by using AI. Testing AI examines an AI-based product or component. Ask whether AI is primarily inside the QA toolchain or inside the behavior delivered to users.

### 2. Is automated testing of an ML API AI4Testing or Testing AI?

It is Testing AI because the API under test exposes learned behavior. If an AI assistant generates the API tests, that generation step is also AI4Testing. One workflow can therefore contain both directions.

### 3. Are Playwright Test Agents an example of Testing AI?

Not when they plan, generate, or heal tests for a conventional web application. In that role they are AI4Testing. Testing the agents themselves for unsafe or incorrect behavior would be Testing AI.

### 4. Which strategy does ISTQB CT-AI v2 teach?

CT-AI v2 teaches testing AI-based systems. It removed AI used to support conventional testing. ISTQB points candidates interested in generative AI applied during testing toward CT-GenAI.

### 5. Can one QA engineer specialize in both directions?

Yes, but the competency mix differs. AI4Testing emphasizes automation architecture, review, tool governance, and feedback loops. Testing AI additionally requires data, statistical, model, socio-technical risk, adversarial, and production-monitoring skills.

### 6. Does a high automated-test count prove an AI product is safe?

No. Test count does not establish oracle quality, deployment relevance, subgroup coverage, robustness, security, or residual risk. Product assurance needs traceable, risk-based evidence and documented limitations.

### 7. Where should a QA team start in 2026?

For AI4Testing, start with a low-permission, reviewable task and measure an outcome against a baseline. For Testing AI, start by mapping intended use, affected people, failure impact, data, and deployment context before selecting techniques or tools.
`,
    },
  },
  {
    slug: 'testing-ai-generated-code-sdet-playbook',
    clusterId: 'ai-test-automation',
    post: {
      title: 'How to Test AI-Generated Code: A Practical SDET Review Playbook',
      description:
        'Review and test AI-generated code with a risk-based SDET workflow covering diff scope, independent oracles, security, Playwright checks, CI, and merge gates.',
      date: '2026-02-19',
      updated: '2026-07-14',
      category: 'Playbook',
      image: '/blog/pillars/ai-test-automation.png',
      imageAlt:
        'SDET review funnel for AI-generated code from diff inspection through security and merge gates',
      primaryKeyword: 'testing ai generated code',
      keywords: [
        'testing ai generated code',
        'ai generated code review',
        'sdet ai code testing',
        'secure coding with ai',
        'ai code quality checklist',
        'playwright ai generated tests',
        'testing coding agent output',
        'ai assisted development qa',
      ],
      contentKind: 'child',
      pillarSlug,
      relatedSlugs: [
        pillarSlug,
        'istqb-ct-ai-v2-guide-2026',
        'ai4testing-vs-testing-ai-guide-2026',
        'self-healing-test-automation-guide',
      ],
      sources: [
        'https://dora.dev/research/2025/dora-report/',
        'https://dora.dev/ai/gen-ai-report/report/',
        'https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html',
        'https://owasp.org/www-project-application-security-verification-standard/',
        'https://csrc.nist.gov/pubs/sp/800/218/final',
        'https://playwright.dev/docs/test-agents',
        'https://playwright.dev/docs/best-practices',
        'https://playwright.dev/docs/locators',
      ],
      content: `Testing AI generated code should treat every model-produced diff as untrusted implementation: recover the requirement, inspect the complete change, run cheap deterministic gates, add independent positive and negative tests, apply security controls proportional to risk, and require a human merge decision. Do not trust polished syntax, an agent summary, coverage alone, or tests written by the same agent as proof. The [AI test automation pillar](/blog/ai-test-automation-tools-2026) explains where coding agents fit; this playbook gives SDETs a repeatable review path from prompt to production evidence.

The process is deliberately stricter than "run the tests." OWASP's current [Secure Coding with AI Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html) warns that agents can delete tests, weaken assertions, add mocks that bypass the unit under test, or assert faulty behavior to make CI green. DORA's [2025 research](https://dora.dev/research/2025/dora-report/) characterizes AI as an amplifier of existing organizational strengths and weaknesses. Fast generation needs faster, higher-quality feedback, not a lower bar.

## Establish the Review Contract Before Reading the Diff

An SDET review needs four inputs: intended behavior, allowed scope, risk classification, and verifiable completion criteria. If the task says only "fix checkout," stop and recover the missing contract. An agent can produce a plausible change for an ambiguous request, but no reviewer can decide correctness without knowing which behavior was authorized.

Write a compact review contract:

- **Intent:** the user or system behavior that must change.
- **Non-goals:** behavior, files, data, and interfaces that must not change.
- **Invariants:** authorization, compatibility, financial, privacy, and reliability rules that remain true.
- **Evidence:** tests, static checks, traces, screenshots, migration proof, or threat checks required for acceptance.
- **Rollback:** how to disable or revert the behavior if production evidence is wrong.

Preserve the original request and any agent plan with the change record where policy permits. They help explain why code exists, but they are not the oracle. Requirements, contracts, threat models, and independently reviewed expected outcomes outrank the model's interpretation.

The [AI4Testing versus Testing AI guide](/blog/ai4testing-vs-testing-ai-guide-2026) clarifies that this workflow is AI4Testing governance: AI helps develop conventional software. If the generated code implements an AI feature, add the lifecycle and data/model controls in the [ISTQB CT-AI v2 guide](/blog/istqb-ct-ai-v2-guide-2026). If an agent repairs the generated tests later, apply the separate [self-healing governance guide](/blog/self-healing-test-automation-guide).

## Route the Change by Consequence

| Change class | Examples | Minimum independent evidence | Merge authority |
|---|---|---|---|
| Low | Copy, non-executable docs, isolated styling | Scope diff, render or link check, existing CI | Normal owner after review |
| Moderate | Pure business function, UI state, non-sensitive API client | Unit boundaries, integration behavior, regression test, static checks | Code owner plus normal QA gate |
| High | Authentication, authorization, money, personal data, migrations, concurrency | Threat-based negative tests, security requirements, integration/e2e, rollback proof | Domain and security owners as defined by policy |
| Critical | Deployment credentials, CI trust, cryptography, destructive data path, safety control | Specialist design review, isolated validation, recovery exercise, explicit approval | Named accountable specialist; no agent-only approval |

This table routes effort; it does not prove safety. A one-line authorization change can be higher risk than a thousand-line generated fixture. Classify by possible impact and reversibility, not line count or model confidence.

## Gate 0: Prove Provenance and Scope

Start from the repository, not the assistant's prose summary. Inspect every changed file, including tests, lockfiles, workflow files, generated artifacts, configuration, migrations, and deleted files. Compare the actual diff with the allowed scope. Out-of-scope edits are separate review items even when harmless.

A practical first pass is tool-neutral:

\`\`\`bash
git status --short
git diff --stat
git diff --name-status
git diff --check
git diff
\`\`\`

Ask concrete questions:

1. Did the agent modify its own instruction or rules files?
2. Did a dependency or lockfile change without an explicit need?
3. Were tests deleted, skipped, broadened, or made less specific?
4. Did permissions, network access, logging, telemetry, or secret handling change?
5. Is generated code copied from a package or API that actually exists at the pinned version?
6. Did formatting noise obscure a small semantic change?

OWASP identifies out-of-scope edits and review anchoring as a specific AI-assisted development risk. Review each file rather than approving from the pull-request description. If the diff is too large to understand, split it. Smaller batches improve both human review and diagnostic feedback.

## Gate 1: Reconstruct Behavior Before Running Anything

Read callers, data flow, error paths, tests, configuration, and external contracts around the change. AI output often looks locally coherent while violating a repository convention or distant invariant. Search for equivalent logic rather than accepting a duplicate helper. Verify units, time zones, encoding, rounding, nullability, transaction boundaries, and async cancellation explicitly.

For each changed branch, write the expected behavior in plain language before observing the implementation's output. This reduces anchoring. Include:

- normal path and boundary values;
- invalid, absent, malformed, oversized, and repeated input;
- unauthorized and cross-tenant access;
- dependency timeout, partial failure, duplicate delivery, and retry;
- concurrent requests or stale state where relevant;
- old clients, stored data, and rollback behavior;
- logs and errors that must not expose secrets or personal data.

If no one can explain the new behavior without reading generated tests, the oracle is not independent enough.

## Gate 2: Run Deterministic, Cheap Feedback First

Use the repository's documented commands for formatting, linting, type checking, build, tests, dependency checks, secret scanning, and static security analysis. Do not paste a generic CI stack into every project. A TypeScript compiler cannot validate a Python service, and a package audit cannot prove authorization.

Run narrow checks while iterating, then the required full gate before merge. Record tool versions and exact commands in CI. A clean result means only that the configured check found no blocking issue. It does not mean the behavior is correct or secure.

NIST's final [Secure Software Development Framework 1.1](https://csrc.nist.gov/pubs/sp/800/218/final) recommends integrating secure practices into the SDLC, reviewing designs against security requirements, testing executable code, and identifying residual vulnerabilities. Apply those practices to AI output through the existing engineering system rather than creating a weaker "generated code" lane.

## Gate 3: Add Tests the Generator Did Not Choose

Tests produced with the implementation are useful scaffolding, not independent assurance. The reviewer should add or select cases based on requirements and risk without asking the same generation context what it forgot.

Use multiple test levels deliberately:

- Unit tests isolate calculations, state transitions, and boundary rules.
- Property or invariant tests cover a range wider than hand-picked examples.
- Contract tests protect API, event, schema, and consumer expectations.
- Integration tests expose database, queue, cache, identity, and transaction behavior.
- End-to-end tests prove a few critical user outcomes through deployed boundaries.
- Exploratory checks target ambiguity, interruption, abuse, and surprising state combinations.

Coverage is navigation evidence, not oracle evidence. A line can execute under an assertion that checks nothing meaningful. Mutation testing can help reveal weak tests when supported by the project, but mutation score is also not a universal release threshold.

## Example 1: Independently Test a Generated Refund Function

Assume the approved rule says: amounts are integer cents; the refund is the captured amount minus a non-refundable fee; the result cannot be negative; invalid money input is rejected. An agent generates the implementation and its happy-path test. The SDET adds requirement-derived boundaries using the project's existing Vitest stack:

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { calculateRefund } from './calculate-refund';

describe('calculateRefund', () => {
  it.each([
    { captured: 10_00, fee: 1_00, expected: 9_00 },
    { captured: 1_00, fee: 1_00, expected: 0 },
    { captured: 50, fee: 1_00, expected: 0 },
  ])('applies the approved floor for $captured and $fee', ({ captured, fee, expected }) => {
    expect(calculateRefund(captured, fee)).toBe(expected);
  });

  it.each([
    { captured: -1, fee: 0 },
    { captured: 100.5, fee: 0 },
    { captured: Number.MAX_SAFE_INTEGER + 1, fee: 0 },
  ])('rejects invalid integer-cent input: %o', ({ captured, fee }) => {
    expect(() => calculateRefund(captured, fee)).toThrow();
  });
});
\`\`\`

The table is illustrative, not a universal refund policy. The key practice is that cases come from approved rules and domain risks. The reviewer should also inspect callers for currency mixing, duplicate refunds, authorization, persistence, and idempotency. A perfect pure-function test cannot prove the payment workflow.

## Gate 4: Apply Security Requirements, Not a Generic "Security Prompt"

Threat-model changed trust boundaries. Trace attacker-controlled input to interpreters, databases, HTML, files, shell commands, network requests, deserializers, templates, logs, and AI tool calls. Check authentication separately from authorization. Test object-level access, tenant isolation, role changes, expired sessions, replay, rate limits, and safe failure.

The [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/) is a primary, versioned source for web application security verification requirements. OWASP lists ASVS 5.0.0 as the current stable version and recommends version-qualified requirement identifiers because identifiers can change. Select requirements relevant to the application's verification level and architecture; do not claim "OWASP compliant" from a scanner pass.

For adjacent application techniques, the canonical [security testing for AI-generated code guide](/blog/security-testing-ai-generated-code) expands threat-driven checks, while the [QA engineer's AI code review guide](/blog/ai-code-review-qa-engineers-guide) covers review workflow. Those articles supplement, rather than replace, the primary controls cited here.

AI-specific development risks also need direct controls:

- Verify every new dependency, package name, version, license, and maintainer source rather than trusting a plausible import.
- Treat issues, pull-request comments, repository documents, fetched pages, and tool output as possible indirect prompt-injection inputs to an agent.
- Prevent secrets, personal data, proprietary code, and production records from entering unapproved model context.
- Restrict agent credentials, filesystem scope, network destinations, and destructive commands to the minimum task need.
- Require explicit review when tests, CI, deployment, access control, or agent rules change.

Security scanners provide findings, not final risk decisions. Triage false positives with evidence and preserve accepted residual risk through the organization's normal process.

## Example 2: Add a Negative Authorization Journey in Playwright

Assume an AI agent adds an invoice details page and a happy-path browser test. The requirement says a workspace member must never learn whether another workspace's invoice exists. In a test project whose authenticated fixture already signs in a normal member, add an independent cross-tenant journey:

\`\`\`typescript
import { test, expect } from './fixtures';

test('member cannot read another workspace invoice', async ({ memberPage }) => {
  await memberPage.goto('/workspaces/acme/invoices/invoice-from-rival');

  await expect(memberPage.getByRole('heading', { name: 'Not found' })).toBeVisible();
  await expect(memberPage.getByText(/invoice total/i)).toHaveCount(0);
  await expect(memberPage.getByText(/rival workspace/i)).toHaveCount(0);
});
\`\`\`

The fixture and URLs must be adapted to the real project; they are not Playwright product APIs. The Playwright calls shown are current documented APIs. Official [Playwright best practices](https://playwright.dev/docs/best-practices) recommend testing user-visible behavior, isolating tests, and using user-facing locators. The API or database layer still needs direct authorization tests because a UI journey alone cannot cover every object access path.

## Gate 5: Review AI-Generated Tests as Production Code

Inspect test intent, not just pass status. Reject tests that:

- copy implementation branches into expected logic;
- assert only status "not 500," truthiness, element presence, or non-null output when stronger behavior is known;
- use broad snapshots without reviewing meaningful change;
- mock the component or dependency whose contract is under test;
- depend on execution order, shared accounts, sleeps, or current wall-clock time;
- swallow errors, add retries to deterministic defects, or skip the broken scenario;
- hard-code secrets, unstable IDs, generated element references, or production data;
- pass alone but fail under repetition, parallelism, different order, or clean state.

Compare assertion strength before and after the diff. Review deleted and skipped tests explicitly. If an assertion changed, ask whether the requirement changed and where that decision is recorded.

For reusable agent guidance, browse [QA skills](/skills) or use the [Playwright CLI skill](/skills/Pramod/playwright-cli) for observable browser work. A skill can encode review expectations, but it cannot independently approve the code it helped create.

## Use Playwright Test Agents Without Creating a Closed Assurance Loop

The official [Playwright Test Agents](https://playwright.dev/docs/test-agents) provide planner, generator, and healer roles. Their artifact structure is useful: human-readable plans under \`specs/\`, generated tests under \`tests/\`, and seed tests for setup. Keep the plan reviewable and align tests one-to-one with approved scenarios where feasible.

Playwright documents that the generator can produce initial errors and the healer can replay failures, inspect the current UI, suggest patches, and rerun until success or guardrails stop the loop. It also says the healer's output can be a passing test or a skipped test if it believes functionality is broken. Therefore "the healer finished" is not a merge gate. Inspect whether the scenario was skipped, assertions changed, data altered, or product behavior masked.

A safer loop is:

1. Human approves requirement and planned scenarios.
2. Generator creates a candidate test.
3. CI executes unchanged acceptance assertions.
4. Healer proposes, but does not merge, a minimal patch.
5. Reviewer compares the patch with intent and checks all files.
6. CI reruns the target, neighboring tests, and required full suite.
7. A human records the merge or reject decision.

Regenerate agent definitions when Playwright is upgraded, as the official docs require, then review changes to those definitions like other tooling changes.

## Make the Merge Decision Explicit

The change is ready only when the reviewer can answer yes to all applicable questions:

- The complete diff matches authorized scope.
- The intended behavior and invariants are independently stated.
- Static, build, and test gates pass with recorded versions.
- New tests cover normal, boundary, error, and abuse paths proportional to risk.
- Existing tests were not silently weakened, deleted, or skipped.
- Dependencies and generated APIs are real, supported, and pinned appropriately.
- Security requirements and threat paths have evidence.
- Data, migration, compatibility, observability, and rollback are addressed.
- Residual risks and limitations have named owners.

Do not merge when the only explanation is "the agent says it fixed it." Ask for a smaller diff, stronger requirement, specialist review, or reproducible evidence.

## Concrete Failure Paths and Recovery

### The agent changes tests until CI passes

Freeze the product requirement and compare test assertions before and after. Revert unauthorized test changes through the normal review process, add an independent regression test, and fix the product or formally change the requirement. Passing CI after oracle drift is a false green.

### A plausible package does not exist or is not the intended dependency

Stop installation. Verify the package through the official registry and project source, inspect ownership and release history, and confirm the exact API for the pinned version. Treat a lookalike package as a supply-chain incident, not a typo to work around.

### The full suite is too slow, so only generated tests run

Use risk-based test selection for fast feedback but retain a required broader gate before merge or release. Track what was not run. Optimize the suite rather than redefining a narrow green run as complete evidence.

### Reviewers cannot understand the generated diff

Do not approve it. Split the change, remove unrelated refactors, require design notes, or replace generated sections with a maintainable implementation. Reviewability is a production quality attribute because future responders must diagnose and change the code.

### Production behavior fails despite high coverage

Reconstruct the missing condition and determine whether the oracle, environment, data, integration, or monitoring was absent. Add a test at the lowest effective level plus a production detection or recovery control. Do not respond by chasing a coverage percentage alone.

## Measure the System, Not Generated Lines

DORA's 2026 [Impact of Generative AI in Software Development](https://dora.dev/ai/gen-ai-report/report/) advises organizations to reinforce automated testing and fast code reviews as AI increases code output. Track whether the review system handles changes safely: batch size, review latency, rework, change failure, recovery, escaped defects, security findings, and test signal quality.

Generated lines, prompts, accepted completions, and test count are activity measures. They can help operate a tool but should not be presented as product value. Compare outcomes over enough time to see delayed rework, and segment high-risk generated changes from low-risk assistance.

## Version and Limitation Notes

This playbook is current to July 14, 2026. It cites OWASP ASVS 5.0.0, the current OWASP Secure Coding with AI Cheat Sheet, NIST SSDF 1.1 as the final publication, DORA's 2025 report and 2026 impact guidance, and current Playwright Test Agent documentation. NIST published an initial draft of SSDF 1.2 in late 2025; do not represent draft language as the final 1.1 standard, and check for a later final before adopting policy.

The TypeScript and Playwright examples illustrate review technique, not drop-in application APIs. Risk classification, approval, data handling, and security requirements must follow the product, jurisdiction, and organization. No combination of automated checks proves absence of defects or vulnerabilities.

## Frequently Asked Questions

### 1. Is AI-generated code inherently worse than human code?

This playbook does not assume a universal defect rate. It treats provenance as a reason for specific controls: rapid volume, context gaps, plausible nonexistent APIs, review anchoring, and tests generated by the same system. Human code still requires the normal quality and security gates.

### 2. Should every line of AI-generated code receive human review?

Executable changes should follow the organization's review policy, with human accountability and greater scrutiny for high-impact paths. Low-risk assistance can use lighter routing, but no agent summary should substitute for inspecting the actual diff.

### 3. Can tests written by the same AI agent be used?

Yes, as candidate tests. Their expected results, scope, assertion strength, mocks, deletions, and skips need independent review. Add cases derived from requirements and threats outside the generation context.

### 4. What is the first check an SDET should run?

Inspect status and the complete diff before running generated commands. Scope violations, deleted tests, lockfile changes, and CI edits can change the risk and the safe execution plan.

### 5. Does high code coverage make generated code safe?

No. Coverage shows execution, not that expectations are correct, security properties hold, or important conditions were represented. Combine it with requirement-based, negative, integration, and threat-driven evidence.

### 6. How should Playwright's healer be governed?

Treat its output as a proposed patch. Review intent, every changed file, locator and assertion strength, test data, and skipped status. Rerun the unchanged acceptance criteria and broader required suite before a human merge decision.

### 7. Which standards are useful for security review?

OWASP ASVS supplies versioned web security verification requirements, OWASP's Secure Coding with AI Cheat Sheet addresses AI-assisted development risks, and NIST SSDF provides secure-development practices. Select applicable controls through the product threat model rather than claiming blanket compliance.
`,
    },
  },
  {
    slug: 'self-healing-test-automation-guide',
    clusterId: 'ai-test-automation',
    post: {
      title: 'Self-Healing Test Automation Governance for Reliable QA Suites',
      description:
        'Govern self-healing test automation with eligibility rules, human review, audit evidence, stop conditions, safe examples, rollout phases, and reliability metrics.',
      date: '2026-07-02',
      updated: '2026-07-14',
      category: 'Governance',
      image: '/blog/pillars/ai-test-automation.png',
      imageAlt:
        'Governed self-healing test workflow with evidence capture, approval gates, and escalation paths',
      primaryKeyword: 'self healing test automation',
      keywords: [
        'self healing test automation',
        'self healing tests governance',
        'automated test repair',
        'playwright healer agent',
        'healenium governance',
        'test automation reliability',
        'locator healing policy',
        'ai test maintenance',
      ],
      contentKind: 'child',
      pillarSlug,
      relatedSlugs: [
        pillarSlug,
        'istqb-ct-ai-v2-guide-2026',
        'ai4testing-vs-testing-ai-guide-2026',
        'testing-ai-generated-code-sdet-playbook',
      ],
      sources: [
        'https://playwright.dev/docs/test-agents',
        'https://playwright.dev/docs/locators',
        'https://playwright.dev/docs/best-practices',
        'https://playwright.dev/docs/actionability',
        'https://playwright.dev/docs/trace-viewer-intro',
        'https://github.com/healenium/healenium',
        'https://www.selenium.dev/documentation/test_practices/encouraged/locators/',
        'https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html',
        'https://dora.dev/research/2025/dora-report/',
      ],
      content: `Self healing test automation is reliable only when healing produces a reviewable candidate, preserves the test's independently approved intent, captures before-and-after evidence, reruns the relevant suite, and stops when product behavior may have changed. Auto-accepting any patch that turns red into green can hide regressions. Start with resilient test design, then permit narrow locator or synchronization repairs under policy. The [AI test automation tools pillar](/blog/ai-test-automation-tools-2026) places healing among wider AI-assisted workflows; this guide defines governance, decision rights, failure paths, rollout controls, and audit records for production QA suites.

"Healing" is not one technology. A framework may retry a current locator against a fresh DOM, rank stored alternative selectors, propose a code patch from failure evidence, adjust test data, or ask an agent to replay a user flow. Those mechanisms have different authority and risk. A retry that observes the same intended button is not equivalent to changing an expected result or skipping a scenario.

This is AI used for testing, outside the narrowed CT-AI v2 certification scope. The [ISTQB CT-AI v2 guide](/blog/istqb-ct-ai-v2-guide-2026) explains that 2026 boundary for teams that also test AI-based products.

## Define Healing by What It May Change

A useful definition is: **controlled repair of test implementation after the original test can no longer execute its unchanged intent against an authorized product state**. Three constraints matter.

First, the expected behavior remains externally defined. Second, the repair changes test mechanics, not the product oracle. Third, the process leaves enough evidence for another person to reproduce and reject the decision.

Do not label these actions as healing:

- changing "access denied" to "access granted" because the application now grants access;
- deleting or skipping a failing security, payment, or safety scenario;
- increasing retries until a race passes often enough;
- mocking the dependency the test was intended to exercise;
- updating a visual baseline without inspecting the changed pixels and requirement;
- changing production data to match an assertion;
- broadening a locator until it clicks an arbitrary matching element.

OWASP's [Secure Coding with AI Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html) explicitly warns that AI agents can make CI green by deleting tests, weakening assertions, adding inappropriate mocks, or asserting buggy behavior. Healing governance exists to prevent that false-green path.

## Decide Eligibility Before a Failure Occurs

| Failure category | Automatic action allowed | Human-reviewed candidate allowed | Mandatory stop condition |
|---|---|---|---|
| Transient observation with unchanged state | Framework's documented auto-waiting within the existing timeout | Timing diagnosis or event-based wait patch | Repeated timeout, unknown state, or increased timeout without cause |
| Locator implementation drift | Re-resolve a lazy semantic locator | Minimal move from brittle DOM selector to approved role, label, or test contract | Ambiguous target, changed accessible meaning, or destructive action |
| Test data fixture drift | None unless data regeneration is deterministic and preapproved | Fixture update with schema and provenance evidence | Production data, changed business rule, privacy concern, or hidden dependency |
| Environment or dependency failure | Retry only under existing bounded infrastructure policy | Isolation, mock, or environment fix reviewed by owner | Product failure is indistinguishable from environment failure |
| Assertion or expected output mismatch | None | Requirement-owner decision followed by normal test change | Healer proposes changing, deleting, weakening, or skipping the oracle |
| Authorization, money, migration, security, safety | Evidence collection only | Specialist-reviewed minimal patch | Any behavior change, missing audit evidence, or uncertain blast radius |

The table is a starting control, not vendor configuration. Tailor it to consequence. A marketing-page locator can tolerate a different approval path from a button that transfers funds. Record eligibility per suite, tag, directory, or risk class so the policy is executable rather than tribal knowledge.

## Prevent Failures Before Adding a Healer

The cheapest heal is a failure that robust test design avoids. Playwright's official [locator guidance](https://playwright.dev/docs/locators) says locators are central to auto-waiting and retryability and recommends user-facing attributes or explicit test contracts. Its [best-practices guide](https://playwright.dev/docs/best-practices) recommends testing user-visible behavior, isolating tests, and preferring resilient locators over DOM implementation details.

Use this priority intentionally:

1. Accessible role and name for user interactions whose semantics matter.
2. Label, placeholder, visible text, or alternative text where appropriate.
3. A stable test ID as an explicit contract where user-facing semantics are insufficient.
4. Compact CSS only when no stronger contract is available.
5. Avoid long CSS and XPath chains tied to DOM structure.

Selenium's official [locator practice](https://www.selenium.dev/documentation/test_practices/encouraged/locators/) similarly recommends unique, predictable IDs when available, compact readable selectors, and avoiding expensive or difficult DOM traversal. Framework preferences differ, but both sources reward stable, understandable contracts over positional structure.

Also remove false timing failures before invoking AI. Playwright performs documented [actionability checks](https://playwright.dev/docs/actionability) before actions such as a click. Web-first assertions retry their condition. Adding a fixed sleep around those mechanisms usually increases duration while preserving the race. Diagnose network, animation, state, and event completion instead.

The canonical [Playwright best practices guide](/blog/playwright-best-practices-2026) provides broader suite design context, and [fixing flaky tests](/blog/fix-flaky-tests-guide) separates nondeterministic failures from repairable implementation drift. For a wider maintenance program beyond governance, continue to [AI test maintenance and self-healing strategies](/blog/ai-test-maintenance-self-healing-strategies).

## Example 1: A Safe Locator Repair Candidate

Suppose an old test uses a CSS class owned by the design system. A redesign changes wrappers and classes, but the requirement remains: a user saves a valid profile and sees confirmation.

Before:

\`\`\`typescript
await page.locator('.profile-actions > button.primary').click();
await expect(page.locator('.toast-success')).toHaveText('Profile saved');
\`\`\`

A repair candidate uses the unchanged user-visible contract:

\`\`\`typescript
await page.getByRole('button', { name: 'Save profile' }).click();
await expect(page.getByRole('status')).toHaveText('Profile saved');
\`\`\`

Approve only after the evidence shows one unique target, the action still submits the same profile operation, the confirmation semantics remain required, and neighboring save/cancel/error tests pass. The patch removes implementation coupling without weakening intent. It is still a code review, not an invisible runtime substitution.

If the application has two "Save profile" buttons in different forms, the candidate is ambiguous. Scope it through an approved dialog or form landmark, or add an explicit test contract. Never select \`.first()\` merely to make strictness errors disappear.

## Create a Tool-Neutral Healing Policy

Write policy before configuring a product. The following YAML is an internal governance example, **not a Playwright or Healenium API**:

\`\`\`yaml
policyVersion: 1
defaultMode: observe
eligibleChanges:
  - locator-mechanics
  - event-based-synchronization
forbiddenChanges:
  - assertions
  - test-skip-status
  - production-code
  - security-fixtures
approval:
  locator-mechanics: qa-owner
  high-risk-suite: qa-owner-and-domain-owner
limits:
  maxCandidateFiles: 1
  maxAttemptsPerFailure: 2
evidence:
  - original-error
  - trace-or-dom-state
  - proposed-diff
  - targeted-rerun
  - required-regression-run
\`\`\`

Numerical limits here illustrate bounded control, not universal best values. Choose them from suite risk and operating experience. Version the policy, review changes, and associate every decision with the version used.

The default mode should be **observe** during adoption: produce classification and evidence without modifying files or run outcomes. Move a narrow failure class to **propose** after reviewers agree classifications are useful. Use **auto-apply** only for deterministic, reversible changes whose unchanged assertions and required suite still run, and never equate auto-apply with auto-merge.

## Make the Healing Workflow a State Machine

### State 1: fail normally

Run the test without hidden rescue. Capture the original error, test identity, source revision, environment, browser/driver, data version, and attempt. Preserve the first failure because later retries can erase diagnostic state.

### State 2: classify

Determine whether the failure is product regression, test defect, data, environment, dependency, timing, locator drift, or unknown. Use evidence, not the healer's confidence label alone. Unknown and mixed failures escalate.

### State 3: check eligibility

Apply risk, suite, change-type, and environment policy. Confirm that the test intent and assertion are immutable for this healing attempt. Disallow repair when the product contract changed or ownership is unclear.

### State 4: propose a minimal candidate

The candidate should contain the smallest test-only change that restores execution. Include rationale and alternatives considered. Do not bundle refactoring, dependency updates, broad formatting, or product changes.

### State 5: verify independently

Rerun the target from clean state, relevant neighboring tests, and the policy-required regression set. Compare observables before and after. For browser failures, use traces, screenshots, network, console, and DOM/accessibility state. Playwright's [Trace Viewer](https://playwright.dev/docs/trace-viewer-intro) can inspect actions, snapshots, logs, errors, console, and network from a captured trace.

### State 6: approve, reject, or escalate

A named reviewer decides. Rejection should retain the candidate and reason so repeated bad proposals can improve policy. Approval creates a normal reviewed change. Escalation opens a product defect, requirement question, environment incident, or specialist review.

### State 7: monitor after merge

Track recurrence and nearby failures. A patch that moves breakage to another test is not a successful heal. Repeated healing in one component is feedback to improve application testability or selector contracts.

## The Minimum Audit Record

Every proposed repair should answer:

- Which source revision, test, project, environment, and data failed?
- What was the first unmodified failure and artifact location?
- How was the failure classified, with what uncertainty?
- Which policy version and eligibility rule permitted a proposal?
- What exact files, locators, waits, fixtures, or assertions changed?
- Did assertion count, text, snapshots, skip status, retries, or timeout change?
- Which targeted and regression runs executed, and what were their results?
- Who approved, rejected, or escalated, when, and why?
- What limitation or follow-up remains?

Store durable references rather than embedding secrets or sensitive page content in logs. Apply normal retention, access, and privacy rules to screenshots, traces, prompts, DOM snapshots, and test data.

## Example 2: A Failure the Healer Must Not Repair

A test requires permanent account deletion after reauthentication. The product now shows "Deactivate account," retains data, and omits reauthentication. A healer finds the new button, changes the expected confirmation to "Account deactivated," and passes.

That proposal changes three product semantics: reversibility, retention, and authorization friction. The correct flow is to stop, preserve artifacts, and open a requirement/security review. If the product intentionally changed, owners must update requirements, privacy behavior, threat analysis, and tests through the normal process. If it did not, the test found a regression.

The same stop rule applies when:

- a 403 becomes 200;
- a payment amount or currency changes;
- a validation error disappears;
- an audit event is absent;
- a destructive action targets a different object;
- the only passing route is to skip or weaken the assertion.

Confidence in element similarity cannot answer whether behavior is acceptable. The oracle owner must.

## Govern Official Playwright Test Agents Deliberately

Playwright's [Test Agent documentation](https://playwright.dev/docs/test-agents) defines planner, generator, and healer agents. The healer replays failing steps, inspects current UI, suggests a patch such as a locator, wait, or data fix, and reruns until the test passes or guardrails stop the loop. Its documented output can also be a skipped test if it believes functionality is broken.

That last outcome is a governance trigger. A skipped critical test can make a run appear less red while coverage disappears. CI should surface newly skipped tests, and reviewers should compare skip state before and after every healing attempt.

Use official agents safely:

1. Generate agent definitions with the documented \`npx playwright init-agents --loop=<client>\` command.
2. Regenerate definitions whenever Playwright is updated, as the docs instruct.
3. Keep human-readable plans and expected results under review.
4. Restrict healer write scope and credentials in the host agent.
5. Preserve the original failure and inspect every proposed file change.
6. Block assertion, skip, test deletion, and product-code changes by policy unless they enter a separate normal review.
7. Require clean-state target and regression reruns before approval.

The [testing AI-generated code playbook](/blog/testing-ai-generated-code-sdet-playbook) provides the diff and security review gates for these patches. For tool terminology, [AI4Testing versus Testing AI](/blog/ai4testing-vs-testing-ai-guide-2026) explains why Playwright's healer is AI4Testing even though the application under test may not contain AI.

## Understand Healenium's Different Architecture

The official [Healenium repository](https://github.com/healenium/healenium) describes an open-source self-healing framework for Selenium web tests. Its proxy approach sits between the client and Selenium server and uses services including PostgreSQL for reference selectors and reports, a proxy, backend, and selector imitator. This is a different repair surface from a coding agent that edits a Playwright test file.

Govern the runtime substitution and the persisted selector history. Capture which original selector failed, which candidate was selected, its score or rationale, the page state, and the eventual source-code update. A similarity score ranks candidates; it does not prove semantic equivalence. Disable healing for destructive, security-sensitive, or contract-defining actions unless a reviewed policy explicitly permits it.

As of this article's update, the repository lists release 2.2.1 dated March 31, 2026. Verify the latest release, supported Selenium topology, deployment dependencies, and project documentation before adoption. Do not copy Kubernetes or property examples from an unrelated version and assume they are stable product APIs.

## Roll Out in Four Controlled Phases

### Phase 1: baseline and observe

Classify a representative failure history without changing outcomes. Improve semantic locators, test isolation, data control, and waiting first. Establish current flaky rate, triage time, recurrence, skipped tests, and escaped regression signals.

### Phase 2: propose for one low-risk class

Permit locator-only candidates in a non-destructive suite. Require review of every proposal and record false candidates, ambiguity, reviewer time, and recurrence. Keep assertions immutable.

### Phase 3: bounded application with required review

Allow the system to apply a candidate on a temporary branch or workspace, never directly to the protected branch. Enforce file allowlists, attempt limits, clean reruns, diff checks, and named approval. Roll back the mode when bad classifications or hidden skips exceed the team's tolerance.

### Phase 4: selective automation

Automate only a proven, reversible class, such as updating a generated selector map under an explicit contract. Keep audit and post-run checks. High-risk, ambiguous, oracle, data, and product changes stay human-led. Reevaluate policy after framework, agent, application architecture, or risk changes.

The [QASkills directory](/skills) can encode organization-specific review steps, while the [Playwright CLI skill](/skills/Pramod/playwright-cli) supports observable browser inspection. Neither should receive broader permissions than the policy requires.

## Measure Whether Healing Improves Reliability

Do not report "healing rate" alone. A system can achieve a high rate by accepting dangerous substitutions. Use a balanced scorecard:

- **Candidate precision:** reviewed proposals accepted as intent-preserving.
- **False-green rate:** proposals later linked to masked defects or weakened coverage.
- **Recurrence:** the same test or component needing repair again.
- **Time to trustworthy signal:** from first failure to accepted classification or escalation.
- **Skip and assertion drift:** new skips, deletions, weakened expectations, and timeout/retry increases.
- **Suite reliability:** deterministic pass/fail behavior from controlled state.
- **Product signal:** regressions caught, escaped defects, and incidents in healed areas.
- **Change health:** review load, batch size, failed deployments, and recovery.

DORA's [2025 report](https://dora.dev/research/2025/dora-report/) frames AI as an amplifier. Apply that lesson here: a suite with clear contracts, ownership, fast CI, and good artifacts can use repair assistance effectively; a flaky, unowned suite can automate confusion. Compare trends over enough time to include delayed failures and rework.

## Concrete Failure Paths and Responses

### Healing loops consume CI without converging

Stop after the policy attempt limit, preserve each candidate, and classify the failure as unknown or non-healable. Infinite retries hide incidents and consume capacity. Escalate with the first failure, not only the last mutation.

### A candidate matches the wrong same-named control

Reject it and improve scope through role, landmark, form, or explicit test ID. Add an assertion on the resulting state. Similar text or visual position is insufficient for a destructive action.

### A healed test passes alone but fails in the suite

Investigate shared state, order, data, and concurrency. Do not approve based on the isolated rerun. Require the configured neighboring and full regression gates from clean state.

### Runtime healing never reaches source control

The suite depends on opaque historical substitutions and surprises local runs. Create reviewed source patches or a versioned selector contract, then retire stale runtime mappings. Audit history should explain behavior, not become the only implementation.

### The team cannot distinguish product and test defects

Move the item to unknown and stop repair. Improve traces, logs, version metadata, controlled data, and reproducibility. Forcing a label creates false confidence and corrupts healing metrics.

## Version and Limitation Notes

This guide is current to July 14, 2026. It references current Playwright documentation, including Test Agents originally introduced in Playwright 1.56, and Healenium repository release information available on that date. Agent definitions and repair behavior can change; regenerate and review definitions with upgrades. Verify Healenium's current release and deployment documentation before implementation.

Self-healing cannot establish a missing oracle, repair an actual product regression, decide a changed requirement, guarantee accessibility, or prove security. Locator confidence and passing reruns are limited evidence. The organization remains responsible for system-specific risk, data handling, approvals, and residual defects.

## Frequently Asked Questions

### 1. What is self healing test automation?

It is a controlled process that identifies a test implementation failure, proposes or applies an eligible repair, verifies the unchanged test intent, and records the decision. Reliable healing does not silently rewrite expected product behavior.

### 2. Should self-healed tests merge automatically?

Usually no. A narrow, proven, reversible class may eventually be auto-applied to a temporary branch, but protected-branch merge should follow normal policy. High-risk, ambiguous, assertion, skip, and product changes require human review.

### 3. Is Playwright auto-waiting the same as AI self-healing?

No. Auto-waiting is deterministic framework behavior that checks actionability and retries within a timeout. It prevents timing failures. An AI healer interprets failure evidence and may propose changes, which requires a different audit and approval model.

### 4. Can a healer update assertions?

Treat assertion changes as forbidden healing. If expected behavior changed, a requirement owner must approve that change through normal review. If it did not change, the mismatch may be a product defect.

### 5. What evidence should a locator heal preserve?

Keep the original selector and error, page or trace state, candidate selector, uniqueness and semantic rationale, exact diff, targeted and regression results, policy version, and reviewer decision.

### 6. How do Healenium and Playwright's healer differ?

Healenium documents a Selenium proxy and persisted selector/report services for runtime self-healing. Playwright's healer is a test agent that replays a failure and proposes patches. Their architecture, artifacts, permissions, and governance controls differ.

### 7. What is the best first step for an unreliable suite?

Do not add autonomous repair first. Baseline failure causes, replace brittle selectors, remove sleeps, isolate state, control data, improve artifacts, and assign ownership. Then observe healing candidates for one low-risk failure class.
`,
    },
  },
];
