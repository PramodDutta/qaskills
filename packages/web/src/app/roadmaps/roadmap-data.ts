import { seoTopicClusters2026 } from '../blog/posts/seo-topic-plan-2026';

export type RoadmapAccent = 'violet' | 'amber' | 'cyan' | 'rose' | 'emerald';
export type RoadmapItemStatus = 'ready' | 'backlog';

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  schedule: string;
  href?: string;
  kind?: string;
  status?: RoadmapItemStatus;
  defaultCompleted?: boolean;
}

export interface RoadmapPhase {
  id: string;
  number: number;
  title: string;
  schedule: string;
  description: string;
  accent: RoadmapAccent;
  items: RoadmapItem[];
}

export interface RoadmapResource {
  title: string;
  description: string;
  href: string;
  label: string;
}

export interface RoadmapFaq {
  question: string;
  answer: string;
}

export interface RoadmapStat {
  value: string;
  label: string;
}

export interface Roadmap {
  slug: string;
  eyebrow: string;
  title: string;
  shortTitle: string;
  metadataTitle: string;
  description: string;
  intro: string;
  primaryKeyword: string;
  keywords: string[];
  audience: string;
  level: string;
  duration: string;
  timeRequired?: string;
  updatedAt: string;
  featured: boolean;
  stats: RoadmapStat[];
  outcomes: string[];
  phases: RoadmapPhase[];
  resources: RoadmapResource[];
  faqs: RoadmapFaq[];
}

const playwrightPhases: RoadmapPhase[] = [
  {
    id: 'javascript-typescript-foundations',
    number: 1,
    title: 'JavaScript and TypeScript Foundations',
    schedule: 'Days 1-21',
    description:
      'Build the language fluency needed to read, write, debug, and organize dependable browser automation.',
    accent: 'violet',
    items: [
      {
        id: 'pw-js-runtime-basics',
        title: 'Set up Node.js and learn JavaScript runtime basics',
        description:
          'Variables, primitive types, operators, template literals, and console debugging.',
        schedule: 'Days 1-3',
      },
      {
        id: 'pw-control-flow-functions',
        title: 'Control flow, loops, and reusable functions',
        description: 'Conditionals, for loops, forEach, function parameters, and return values.',
        schedule: 'Days 4-6',
      },
      {
        id: 'pw-collections',
        title: 'Work confidently with arrays, objects, maps, and sets',
        description:
          'Practice map, filter, reduce, object access, spread syntax, and destructuring.',
        schedule: 'Days 7-9',
      },
      {
        id: 'pw-modules-errors-classes',
        title: 'Modules, classes, and error handling',
        description: 'Use imports, exports, classes, try/catch, and small reusable utilities.',
        schedule: 'Days 10-12',
      },
      {
        id: 'pw-typescript-core',
        title: 'Add TypeScript types and interfaces',
        description: 'Configure TypeScript and model test data with types, unions, and interfaces.',
        schedule: 'Days 13-15',
      },
      {
        id: 'pw-async-typescript',
        title: 'Master promises, async/await, and safe TypeScript',
        description:
          'Understand the event loop, asynchronous errors, generics, and optional chaining.',
        schedule: 'Days 16-18',
      },
      {
        id: 'pw-language-capstone',
        title: 'Build a typed data-processing mini project',
        description:
          'Read JSON, transform records, validate inputs, and write unit-tested helpers.',
        schedule: 'Days 19-21',
      },
    ],
  },
  {
    id: 'playwright-fundamentals',
    number: 2,
    title: 'Playwright Fundamentals',
    schedule: 'Days 22-48',
    description:
      'Learn the complete browser-testing loop, from project setup and locators to evidence, network control, and cross-browser execution.',
    accent: 'amber',
    items: [
      {
        id: 'pw-install-first-test',
        title: 'Install Playwright and run the first test',
        description:
          'Configure VS Code, browsers, playwright.config.ts, and a first reliable spec.',
        schedule: 'Days 22-24',
      },
      {
        id: 'pw-browser-page-navigation',
        title: 'Understand browser, context, page, and navigation',
        description:
          'Use browser contexts, pages, URLs, history, reloads, and Playwright auto-waiting.',
        schedule: 'Days 25-27',
      },
      {
        id: 'pw-locators-assertions',
        title: 'Write resilient locators and web-first assertions',
        description:
          'Prefer roles and labels, understand strictness, and avoid brittle timing waits.',
        schedule: 'Days 28-30',
        href: '/blog/playwright-locators-best-practices-2026',
      },
      {
        id: 'pw-fixtures-api-test-data',
        title: 'Use fixtures, APIRequestContext, and test data',
        description:
          'Create isolated setup, seed data through APIs, and keep test state deterministic.',
        schedule: 'Days 31-33',
      },
      {
        id: 'pw-browser-flows',
        title: 'Handle tabs, dialogs, uploads, and downloads',
        description: 'Coordinate page events and verify real multi-window and file workflows.',
        schedule: 'Days 34-36',
      },
      {
        id: 'pw-browser-state-dom',
        title: 'Test browser state and complex DOM boundaries',
        description:
          'Cover cookies, local storage, persistent contexts, iframes, SVG, and Shadow DOM.',
        schedule: 'Days 37-39',
      },
      {
        id: 'pw-network-api',
        title: 'Mock networks and combine UI with API testing',
        description:
          'Inspect requests, fulfill routes, test failures, and prepare authenticated state.',
        schedule: 'Days 40-42',
      },
      {
        id: 'pw-debug-evidence',
        title: 'Debug with Inspector, codegen, traces, screenshots, and video',
        description: 'Capture useful evidence and diagnose failures locally and in CI.',
        schedule: 'Days 43-45',
      },
      {
        id: 'pw-fundamentals-capstone',
        title: 'Deliver a cross-browser end-to-end project',
        description: 'Automate one complete user journey in Chromium, Firefox, and WebKit.',
        schedule: 'Days 46-48',
      },
    ],
  },
  {
    id: 'framework-ci-cd',
    number: 3,
    title: 'Advanced Framework and CI/CD',
    schedule: 'Days 49-72',
    description:
      'Turn individual tests into a maintainable framework with clear architecture, fast feedback, reports, and production-grade delivery.',
    accent: 'cyan',
    items: [
      {
        id: 'pw-runner-architecture',
        title: 'Design the test runner structure',
        description:
          'Organize projects, suites, tags, annotations, configuration, and test ownership.',
        schedule: 'Days 49-51',
      },
      {
        id: 'pw-fixtures-parallel-retries',
        title: 'Scale fixtures, hooks, retries, and parallel execution',
        description: 'Choose worker and test scope deliberately while preserving test isolation.',
        schedule: 'Days 52-54',
      },
      {
        id: 'pw-pom-components',
        title: 'Create page objects and component objects',
        description:
          'Model user behavior without hiding assertions or coupling tests to page internals.',
        schedule: 'Days 55-57',
      },
      {
        id: 'pw-config-data-utils',
        title: 'Build configuration, test data, and utility layers',
        description: 'Manage environments, secrets, factories, logging, and shared helpers.',
        schedule: 'Days 58-60',
      },
      {
        id: 'pw-reports-observability',
        title: 'Create useful reports and failure observability',
        description:
          'Configure HTML reports, traces, attachments, screenshots, and visual baselines.',
        schedule: 'Days 61-63',
      },
      {
        id: 'pw-github-actions',
        title: 'Run Playwright in GitHub Actions',
        description:
          'Install browsers, cache dependencies, use matrices, and retain failure artifacts.',
        schedule: 'Days 64-66',
      },
      {
        id: 'pw-sharding-docker',
        title: 'Add sharding, Docker, and reliable pipelines',
        description: 'Split suites safely, merge reports, and run repeatably in containers.',
        schedule: 'Days 67-69',
      },
      {
        id: 'pw-framework-capstone',
        title: 'Publish a production-style automation framework',
        description:
          'Combine architecture, CI, documentation, reports, and a working end-to-end flow.',
        schedule: 'Days 70-72',
      },
    ],
  },
  {
    id: 'playwright-ai',
    number: 4,
    title: 'Playwright with AI Agents',
    schedule: 'Days 73-90',
    description:
      'Use Playwright CLI, MCP, and test agents as controlled accelerators while keeping assertions, review, and quality gates deterministic.',
    accent: 'rose',
    items: [
      {
        id: 'pw-cli',
        title: 'Automate browsers with Playwright CLI',
        description:
          'Use snapshots, element references, named sessions, traces, and video receipts.',
        schedule: 'Days 73-75',
        href: '/blog/playwright-cli-complete-guide-2026',
      },
      {
        id: 'pw-mcp',
        title: 'Connect Playwright MCP to an AI client',
        description:
          'Configure tools, profiles, permissions, browser isolation, and security boundaries.',
        schedule: 'Days 76-78',
        href: '/blog/playwright-mcp-browser-automation-guide',
      },
      {
        id: 'pw-agents',
        title: 'Use Planner, Generator, and Healer agents',
        description:
          'Separate planning, test generation, and repair with human-review checkpoints.',
        schedule: 'Days 79-81',
        href: '/blog/playwright-test-agents-planner-generator-healer',
      },
      {
        id: 'pw-ai-review-guardrails',
        title: 'Convert natural language into reviewed test code',
        description:
          'Write precise prompts and reject weak locators, false assertions, and unsafe actions.',
        schedule: 'Days 82-84',
      },
      {
        id: 'pw-ai-data-evaluation',
        title: 'Build data-driven AI testing workflows',
        description:
          'Generate cases, evaluate outputs, track regressions, and keep deterministic gates.',
        schedule: 'Days 85-87',
      },
      {
        id: 'pw-ai-capstone',
        title: 'Ship an AI-assisted Playwright capstone',
        description:
          'Plan, generate, review, run, debug, and document one complete production flow.',
        schedule: 'Days 88-90',
      },
    ],
  },
];

const seoAccents: RoadmapAccent[] = ['violet', 'amber', 'cyan', 'rose', 'emerald'];

const seoPhases: RoadmapPhase[] = seoTopicClusters2026.map((cluster, clusterIndex) => ({
  id: cluster.id,
  number: clusterIndex + 1,
  title: cluster.name,
  schedule: `Cluster ${clusterIndex + 1} of ${seoTopicClusters2026.length}`,
  description: `${cluster.audience}. ${cluster.rationale}`,
  accent: seoAccents[clusterIndex % seoAccents.length],
  items: cluster.topics.map((topic) => ({
    id: `seo-${topic.slug}`,
    title: topic.title,
    description: `Primary keyword: ${topic.primaryKeyword}. Search intent: ${topic.intent}.`,
    schedule: topic.publicationWave === 1 ? 'Wave 1' : 'Wave 2',
    href: topic.publicationWave === 1 ? `/blog/${topic.slug}` : undefined,
    kind: topic.role === 'pillar' ? 'Pillar' : 'Child guide',
    status: topic.publicationWave === 1 ? 'ready' : 'backlog',
    defaultCompleted: topic.publicationWave === 1,
  })),
}));

export const roadmaps: Roadmap[] = [
  {
    slug: 'playwright-automation-90-day-roadmap',
    eyebrow: '90-day learning path',
    title: 'Playwright Automation Roadmap with JavaScript, TypeScript, and AI',
    shortTitle: '90-Day Playwright Automation Roadmap',
    metadataTitle: 'Playwright Roadmap: 90-Day JavaScript, TypeScript & AI Plan',
    description:
      'Follow a practical 90-day Playwright roadmap covering JavaScript, TypeScript, browser automation, framework design, CI/CD, CLI, MCP, and AI agents.',
    intro:
      'This Playwright automation roadmap turns 90 days into four practical phases: JavaScript and TypeScript foundations, Playwright fundamentals, framework and CI/CD engineering, and AI-assisted browser testing. Complete one three-day milestone at a time, build the phase projects, and use the interactive checklist to track progress in this browser.',
    primaryKeyword: 'Playwright roadmap',
    keywords: [
      'Playwright roadmap',
      'Playwright learning path',
      'Playwright automation roadmap',
      'JavaScript Playwright roadmap',
      'TypeScript Playwright roadmap',
      'Playwright AI agents',
      'Playwright MCP',
      'Playwright CLI',
    ],
    audience: 'QA engineers, SDETs, developers, and automation testers',
    level: 'Beginner to advanced',
    duration: '90 days at 2-3 hours per day',
    timeRequired: 'P90D',
    updatedAt: '2026-07-14',
    featured: true,
    stats: [
      { value: '90', label: 'Days' },
      { value: '4', label: 'Phases' },
      { value: '30', label: 'Milestones' },
      { value: '2-3h', label: 'Daily practice' },
    ],
    outcomes: [
      'Write maintainable Playwright tests in TypeScript using resilient locators and web-first assertions.',
      'Build an isolated, parallel, cross-browser framework with useful traces, reports, and test data.',
      'Run the suite in CI with browser caching, sharding, Docker, and retained failure evidence.',
      'Use Playwright CLI, MCP, and test agents with explicit review and safety guardrails.',
      'Publish a portfolio-ready capstone that demonstrates a complete quality engineering workflow.',
    ],
    phases: playwrightPhases,
    resources: [
      {
        title: 'Install the Playwright CLI skill',
        description: 'Give your coding agent a structured Playwright CLI browser workflow.',
        href: '/skills/Pramod/playwright-cli',
        label: 'View skill',
      },
      {
        title: 'Playwright testing complete guide',
        description: 'Use the long-form guide as the technical reference for phases two and three.',
        href: '/blog/playwright-e2e-complete-guide',
        label: 'Read guide',
      },
      {
        title: 'Playwright CLI complete guide',
        description: 'Learn terminal-driven browser automation, sessions, snapshots, and traces.',
        href: '/blog/playwright-cli-complete-guide-2026',
        label: 'Read guide',
      },
      {
        title: 'Playwright MCP browser automation',
        description:
          'Configure MCP clients, browser capabilities, profiles, and security controls.',
        href: '/blog/playwright-mcp-browser-automation-guide',
        label: 'Read guide',
      },
    ],
    faqs: [
      {
        question: 'Can a beginner complete this Playwright roadmap?',
        answer:
          'Yes. The first 21 days teach the JavaScript and TypeScript concepts needed later. A complete beginner may extend the plan to 120 days and keep the same phase order.',
      },
      {
        question: 'How much time should I spend each day?',
        answer:
          'Plan for two to three focused hours per day. Spend roughly one third learning, one third coding, and one third debugging or documenting what you built.',
      },
      {
        question: 'Should I learn JavaScript or TypeScript for Playwright?',
        answer:
          'Learn JavaScript fundamentals first, then use TypeScript for the automation framework. TypeScript makes fixtures, page objects, test data, and configuration safer to maintain.',
      },
      {
        question: 'When should I start Playwright CLI and MCP?',
        answer:
          'Start them after you can independently write and debug a Playwright test. That foundation helps you review generated actions and detect weak selectors, assertions, or unsafe agent behavior.',
      },
      {
        question: 'Does this roadmap include CI/CD?',
        answer:
          'Yes. Days 64 through 72 cover GitHub Actions, browser installation, caching, matrices, sharding, Docker, artifact retention, and a production-style framework capstone.',
      },
      {
        question: 'Is roadmap progress saved to my QASkills account?',
        answer:
          'No. Progress is stored only in this browser with local storage. It works without signing in and does not write to the QASkills database.',
      },
    ],
  },
  {
    slug: 'qa-seo-content-roadmap-2026',
    eyebrow: '100-topic publishing plan',
    title: 'QA SEO Content Roadmap for Playwright, AI Testing, RAG, and MCP',
    shortTitle: '100-Topic QA SEO Content Roadmap',
    metadataTitle: 'QA SEO Content Roadmap: 100 Testing Topics for 2026',
    description:
      'Explore the QASkills 2026 SEO roadmap: 100 intent-mapped QA topics across Playwright, AI testing, DeepEval, Promptfoo, RAG evaluation, and MCP security.',
    intro:
      'This QA SEO content roadmap organizes 100 unique search topics into ten hub-and-spoke clusters. Wave one contains ten pillar guides and forty supporting articles that are ready locally for editorial approval. Wave two preserves fifty distinct long-tail opportunities for later publication without creating duplicate or cannibalizing pages.',
    primaryKeyword: 'QA SEO content roadmap',
    keywords: [
      'QA SEO content roadmap',
      'software testing content strategy',
      'Playwright SEO topics',
      'AI testing keywords',
      'RAG testing topics',
      'MCP testing content',
      'QA blog topic clusters',
      'test automation SEO',
    ],
    audience: 'QA content teams, technical writers, founders, and SEO editors',
    level: 'Editorial and technical SEO',
    duration: 'Two controlled publishing waves',
    updatedAt: '2026-07-14',
    featured: true,
    stats: [
      { value: '100', label: 'Unique topics' },
      { value: '10', label: 'Pillar clusters' },
      { value: '50', label: 'Ready locally' },
      { value: '50', label: 'Wave 2 backlog' },
    ],
    outcomes: [
      'Build ten clear topic clusters around high-value QA and AI testing search intent.',
      'Protect existing search equity by upgrading canonical URLs instead of creating duplicates.',
      'Connect every child guide to its pillar, related QASkills, and primary documentation.',
      'Publish wave one only after content, schema, build, and browser quality gates pass.',
      'Use the second-wave backlog to expand topical authority without keyword cannibalization.',
    ],
    phases: seoPhases,
    resources: [
      {
        title: 'Browse the QA testing article library',
        description:
          'Review existing guides and the first-wave pillar content on the QASkills blog.',
        href: '/blog',
        label: 'Browse blog',
      },
      {
        title: 'Playwright CLI pillar guide',
        description: 'See the canonical pillar for terminal browser automation and coding agents.',
        href: '/blog/playwright-cli-complete-guide-2026',
        label: 'Read pillar',
      },
      {
        title: 'RAG evaluation pillar guide',
        description: 'Review the metrics, datasets, regression strategy, and linked child guides.',
        href: '/blog/rag-evaluation-metrics-complete-2026',
        label: 'Read pillar',
      },
      {
        title: 'Connect content to installable QA skills',
        description: 'Use relevant skill pages as practical next steps from educational content.',
        href: '/skills',
        label: 'Browse skills',
      },
    ],
    faqs: [
      {
        question: 'How were the 100 QA SEO topics selected?',
        answer:
          'The plan combines QASkills Search Console opportunities, existing content coverage, current official product changes, distinct search intent, and strong relevance to QA engineers and AI-agent users.',
      },
      {
        question: 'Why are only 50 articles in the first publishing wave?',
        answer:
          'A controlled first wave makes editorial review, internal linking, schema validation, and cannibalization checks practical. Each cluster launches with one pillar and four focused child guides.',
      },
      {
        question: 'Are the first 50 articles already published?',
        answer:
          'No. They are implemented and verified locally, but production publication remains a separate approval and deployment step. The roadmap labels them Ready locally to make that distinction explicit.',
      },
      {
        question: 'How does the roadmap avoid keyword cannibalization?',
        answer:
          'Every page has a unique primary keyword and search job. Existing strong URLs are upgraded, duplicate aliases redirect to one canonical page, and child pages link back to their pillar.',
      },
      {
        question: 'What topics are covered in the ten clusters?',
        answer:
          'The clusters cover core Playwright, Playwright CLI, Playwright MCP, Playwright test agents, AI test automation, LLM and agent testing, DeepEval, Promptfoo, RAG evaluation, and MCP testing and security.',
      },
      {
        question: 'Does checking an item publish or change an article?',
        answer:
          'No. The checklist is a browser-local planning aid. It does not edit source files, update the database, or trigger a production deployment.',
      },
    ],
  },
];

export const roadmapSlugs = roadmaps.map((roadmap) => roadmap.slug);

export function getRoadmapBySlug(slug: string): Roadmap | undefined {
  return roadmaps.find((roadmap) => roadmap.slug === slug);
}

export function getRoadmapItemCount(roadmap: Roadmap): number {
  return roadmap.phases.reduce((total, phase) => total + phase.items.length, 0);
}

export function getDefaultCompletedItemIds(roadmap: Roadmap): string[] {
  return roadmap.phases.flatMap((phase) =>
    phase.items.filter((item) => item.defaultCompleted).map((item) => item.id),
  );
}
