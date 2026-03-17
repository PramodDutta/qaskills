import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'AI-Powered Code Review for QA Engineers: Catching Bugs Before They Ship',
  description:
    'Complete guide to AI-powered code review for QA engineers. Covers automated PR review with AI agents, testability analysis, security review patterns, accessibility checks, and building custom review rules with GitHub Actions.',
  date: '2026-03-17',
  category: 'Guide',
  content: `
AI-powered code review is transforming how QA engineers contribute to software quality. Instead of waiting for bugs to surface in testing environments, QA professionals can now catch defects **at the pull request stage** -- before code ever reaches a build. By combining traditional review checklists with AI agents like **Claude Code**, **GitHub Copilot**, **CodeRabbit**, and **Sourcery**, QA engineers can shift left in ways that were previously impossible.

This guide covers everything you need to know about integrating AI code review into your QA workflow: from choosing the right tools, to building custom review rules, to measuring the impact on defect escape rates.

## Key Takeaways

- **AI code review catches 30-60% of defects** that traditional manual review misses, particularly around edge cases, error handling gaps, and security vulnerabilities
- **QA engineers bring a unique perspective** to code review that developers often lack -- thinking about failure modes, boundary conditions, and real-world user behavior
- **Tools like CodeRabbit, Claude Code, and GitHub Copilot** can automate repetitive review tasks while QA engineers focus on high-value testability and design feedback
- **Custom review rules** encoded as GitHub Actions, ESLint plugins, or AI skill files can enforce team-specific quality standards automatically
- **Security, accessibility, and performance reviews** are natural extensions of QA-focused code review that AI agents handle exceptionally well
- **QA skills from qaskills.sh** can encode your team's review standards into reusable, installable skill files that any AI agent can consume

---

## 1. Why QA Engineers Should Care About Code Review

Traditionally, code review has been a developer-to-developer activity. QA engineers enter the picture after code is merged, deployed to a staging environment, and ready for testing. This creates a fundamental problem: **the later a defect is found, the more expensive it is to fix**.

### The Cost Multiplier

Research consistently shows that defects found during code review cost **5-10x less** to fix than defects found during QA testing, and **50-100x less** than defects found in production. When QA engineers participate in code review, they bring domain knowledge that developers often lack:

- **User journey awareness**: QA engineers know how features interact across the application. A developer might not realize that changing a date format in one component breaks a downstream report.
- **Edge case intuition**: Years of exploratory testing build a mental model of how users actually behave -- including the unexpected paths.
- **Regression sensitivity**: QA engineers know which areas of the codebase are historically fragile and deserve extra scrutiny.
- **Testability assessment**: Only someone who will write tests against the code can evaluate whether the code is actually testable.

### What QA Engineers Should Review

Not every PR needs QA review. Focus on:

| PR Type | QA Review Value | Why |
|---------|----------------|-----|
| New features | **High** | Testability, edge cases, acceptance criteria coverage |
| Bug fixes | **High** | Root cause correctness, regression potential |
| Refactors | **Medium** | Behavioral preservation, test updates needed |
| Dependency updates | **Medium** | Breaking changes, compatibility |
| Config changes | **Low** | Unless it affects test environments |
| Documentation | **Low** | Unless it documents test procedures |

---

## 2. AI Code Review Tools Landscape

The AI code review ecosystem has matured significantly in 2026. Here is how the major tools compare for QA-focused workflows.

### GitHub Copilot PR Review

GitHub Copilot now includes native pull request review capabilities. It analyzes diffs and posts inline comments highlighting potential issues.

**Strengths for QA:**
- Integrated directly into GitHub -- no additional setup
- Understands repository context from existing code
- Can identify missing test coverage for changed lines
- Suggests test cases for new functions

**Limitations:**
- Generic suggestions that may not match your team's testing standards
- No persistent configuration for QA-specific review rules
- Limited ability to understand cross-file impacts

### CodeRabbit

CodeRabbit is a dedicated AI code review tool that posts detailed review comments on every PR. It supports custom review instructions and learns from your codebase over time.

**Strengths for QA:**
- Deep contextual analysis across the entire PR
- Configurable review profiles (you can create a "QA Review" profile)
- Tracks review patterns and learns team preferences
- Supports custom instructions in a \`.coderabbit.yaml\` file

\`\`\`yaml
# .coderabbit.yaml
reviews:
  profile: "qa-focused"
  instructions: |
    Focus on:
    - Error handling completeness
    - Input validation for all user-facing endpoints
    - Missing test coverage for edge cases
    - Accessibility attributes on new UI components
    - Security implications of data handling changes
  auto_review:
    enabled: true
    drafts: false
\`\`\`

### Sourcery

Sourcery focuses on code quality improvements and can identify anti-patterns, complexity issues, and maintainability concerns.

**Strengths for QA:**
- Identifies overly complex code that is hard to test
- Suggests simplifications that improve testability
- Tracks code quality metrics over time
- Custom rule definitions

### Claude Code

Claude Code brings a unique advantage for QA teams: **installable QA skills from qaskills.sh** that encode expert review knowledge directly into the agent's context. Unlike other tools that rely on generic instructions, Claude Code can load structured SKILL.md files containing domain-specific review patterns.

\`\`\`bash
# Install code review expertise as a skill
npx @qaskills/cli add code-review-excellence

# Install security review patterns
npx @qaskills/cli add security-testing-owasp

# Install accessibility review knowledge
npx @qaskills/cli add accessibility-a11y
\`\`\`

When Claude Code loads these skills, it gains deep understanding of what to look for during review -- framework-specific anti-patterns, testing gaps, security vulnerabilities, and accessibility issues.

---

## 3. Setting Up AI Code Review in Your Pipeline

The most effective AI code review setup runs automatically on every PR. Here is how to configure it with GitHub Actions.

### Basic AI Review Action

\`\`\`yaml
# .github/workflows/ai-code-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get changed files
        id: changed
        run: |
          echo "files=\$(git diff --name-only origin/main...HEAD | tr '\\n' ' ')" >> \$GITHUB_OUTPUT

      - name: Run AI review
        uses: your-org/ai-review-action@v2
        with:
          files: \${{ steps.changed.outputs.files }}
          review-profile: qa-focused
          github-token: \${{ secrets.GITHUB_TOKEN }}
          ai-api-key: \${{ secrets.AI_API_KEY }}
\`\`\`

### PR Automation with Review Checks

For teams that want AI review as a required check before merging:

\`\`\`yaml
# .github/workflows/qa-gate.yml
name: QA Review Gate

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  qa-review-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install QA skills
        run: |
          npx @qaskills/cli add code-review-excellence --agent github-actions
          npx @qaskills/cli add security-testing-owasp --agent github-actions

      - name: Analyze changed files
        id: analysis
        run: |
          CHANGED=\$(git diff --name-only origin/main...HEAD)
          echo "Analyzing files: \$CHANGED"

          # Check for test files accompanying source changes
          SRC_CHANGES=\$(echo "\$CHANGED" | grep -v '__tests__\\|.test.\\|.spec.' | grep -c '.ts\$\\|.tsx\$' || true)
          TEST_CHANGES=\$(echo "\$CHANGED" | grep -c '__tests__\\|.test.\\|.spec.' || true)

          if [ "\$SRC_CHANGES" -gt 0 ] && [ "\$TEST_CHANGES" -eq 0 ]; then
            echo "warning=Source files changed without corresponding test updates" >> \$GITHUB_OUTPUT
          fi

      - name: Post review summary
        if: steps.analysis.outputs.warning
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.pulls.createReview({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number,
              event: 'COMMENT',
              body: '**QA Review Notice:** \${{ steps.analysis.outputs.warning }}'
            });
\`\`\`

---

## 4. QA-Focused Review Checklist

AI tools are most effective when given specific instructions about what to look for. Here is a comprehensive QA-focused review checklist organized by concern.

### Error Handling

\`\`\`typescript
// BAD: Silent error swallowing
async function fetchUser(id: string) {
  try {
    const response = await fetch(\\\`/api/users/\\\${id}\\\`);
    return response.json();
  } catch {
    return null; // What went wrong? No one will ever know.
  }
}

// GOOD: Explicit error handling with context
async function fetchUser(id: string): Promise<User | null> {
  try {
    const response = await fetch(\\\`/api/users/\\\${id}\\\`);
    if (!response.ok) {
      throw new Error(
        \\\`Failed to fetch user \\\${id}: \\\${response.status} \\\${response.statusText}\\\`
      );
    }
    return response.json();
  } catch (error) {
    logger.error('fetchUser failed', { userId: id, error });
    throw error; // Let the caller decide how to handle it
  }
}
\`\`\`

### Edge Cases to Flag

When reviewing PRs, look for these common edge case gaps:

- **Empty arrays/collections**: Does the code handle \`[]\` gracefully?
- **Null/undefined inputs**: Are optional parameters validated?
- **Boundary values**: What happens at \`0\`, \`-1\`, \`Number.MAX_SAFE_INTEGER\`?
- **Unicode and special characters**: Can usernames contain emojis? Can search handle CJK characters?
- **Concurrent access**: What happens if two users modify the same resource simultaneously?
- **Network failures**: Are timeouts, retries, and offline states handled?

### Input Validation

\`\`\`typescript
// BAD: Trusting user input
app.post('/api/skills', (req, res) => {
  const { name, description, tags } = req.body;
  db.insert(skills).values({ name, description, tags });
});

// GOOD: Validating with Zod schema
import { z } from 'zod';

const CreateSkillSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().min(10).max(500).trim(),
  tags: z.array(z.string().max(50)).min(1).max(20),
  version: z.string().regex(/^\\d+\\.\\d+\\.\\d+\$/),
});

app.post('/api/skills', (req, res) => {
  const result = CreateSkillSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten() });
  }
  db.insert(skills).values(result.data);
});
\`\`\`

### Testability Assessment

Ask these questions for every PR:

1. **Can this code be unit tested in isolation?** Are dependencies injectable or hard-coded?
2. **Are side effects separated from business logic?** Pure functions are easier to test.
3. **Are there clear boundaries between layers?** Service functions that call the database directly are harder to test than those that accept a repository interface.
4. **Is the public API surface minimal?** Fewer public methods means fewer test scenarios needed.

---

## 5. Reviewing Test Code with AI

AI code review is not just for production code -- reviewing test code itself is equally important. Poor tests create false confidence.

### Test Quality Indicators

\`\`\`typescript
// BAD: Test that tests nothing meaningful
test('renders component', () => {
  render(<SkillCard skill={mockSkill} />);
  expect(document.body).toBeTruthy(); // This always passes
});

// GOOD: Test that verifies meaningful behavior
test('displays skill name and description', () => {
  render(<SkillCard skill={mockSkill} />);
  expect(screen.getByRole('heading', { name: mockSkill.name })).toBeVisible();
  expect(screen.getByText(mockSkill.description)).toBeVisible();
});

// GOOD: Test that verifies user interaction
test('calls onInstall when install button is clicked', async () => {
  const onInstall = vi.fn();
  render(<SkillCard skill={mockSkill} onInstall={onInstall} />);

  await userEvent.click(screen.getByRole('button', { name: /install/i }));
  expect(onInstall).toHaveBeenCalledWith(mockSkill.slug);
});
\`\`\`

### Coverage Gap Detection

AI agents excel at identifying missing test scenarios. When reviewing a PR that adds a new function, ask the AI to enumerate all the test cases that should exist:

\`\`\`typescript
// Given this function in the PR:
function calculateQualityScore(skill: Skill): number {
  let score = 0;
  if (skill.description.length > 100) score += 10;
  if (skill.tags.length >= 3) score += 15;
  if (skill.testingTypes.length >= 2) score += 20;
  if (skill.frameworks.length >= 1) score += 10;
  if (skill.fullDescription && skill.fullDescription.length > 500) score += 25;
  if (skill.githubUrl) score += 10;
  if (skill.version && /^\\d+\\.\\d+\\.\\d+\$/.test(skill.version)) score += 10;
  return Math.min(score, 100);
}

// AI should flag these missing test cases:
// - Empty/minimal skill object (all fields at minimum values)
// - Skill with all fields maximized (score capped at 100)
// - Skill with null/undefined optional fields
// - Boundary: description exactly 100 chars vs 101 chars
// - Boundary: exactly 3 tags vs 2 tags
// - Invalid version string formats
// - fullDescription that is exactly 500 chars
\`\`\`

### Assertion Quality

Watch for these assertion anti-patterns in test PRs:

- **Snapshot overuse**: Snapshots are brittle and hard to review. Prefer explicit assertions.
- **Loose matchers**: Using \`toEqual\` when \`toStrictEqual\` is more appropriate.
- **Missing negative tests**: Only testing the happy path.
- **No async handling**: Missing \`await\` on async assertions causes tests to pass vacuously.
- **Shared mutable state**: Tests that modify shared objects without cleanup.

### Flaky Test Patterns

AI can identify patterns that lead to flaky tests:

\`\`\`typescript
// FLAKY: Depends on timing
test('shows loading then data', async () => {
  render(<SkillList />);
  expect(screen.getByText('Loading...')).toBeVisible();
  await new Promise((r) => setTimeout(r, 1000)); // Arbitrary wait
  expect(screen.getByText('Playwright E2E')).toBeVisible();
});

// STABLE: Uses proper async utilities
test('shows loading then data', async () => {
  render(<SkillList />);
  expect(screen.getByText('Loading...')).toBeVisible();
  await waitFor(() => {
    expect(screen.getByText('Playwright E2E')).toBeVisible();
  });
});
\`\`\`

---

## 6. Security Review Patterns for QA

Security review is a natural extension of QA code review. AI agents are particularly effective at spotting security patterns because they can cross-reference against databases like OWASP.

### OWASP Top 10 in Code Review

| OWASP Category | What to Look For in PRs |
|----------------|------------------------|
| **Injection** | String concatenation in SQL/NoSQL queries, unsanitized HTML rendering |
| **Broken Auth** | Missing auth checks on new endpoints, hardcoded credentials |
| **Sensitive Data Exposure** | Logging PII, returning sensitive fields in API responses |
| **XXE** | XML parsing without disabling external entities |
| **Broken Access Control** | Missing authorization after authentication, IDOR vulnerabilities |
| **Misconfiguration** | Debug mode enabled, default credentials, permissive CORS |
| **XSS** | Using \`dangerouslySetInnerHTML\`, unescaped user content in templates |
| **Insecure Deserialization** | Deserializing untrusted data without validation |
| **Known Vulnerabilities** | Outdated dependencies with CVEs |
| **Insufficient Logging** | Security-relevant actions without audit logs |

### Injection Prevention

\`\`\`typescript
// VULNERABLE: SQL injection via string interpolation
async function getSkill(slug: string) {
  const result = await db.execute(
    \\\`SELECT * FROM skills WHERE slug = '\\\${slug}'\\\`
  );
  return result.rows[0];
}

// SAFE: Parameterized query with Drizzle ORM
async function getSkill(slug: string) {
  const result = await db
    .select()
    .from(skills)
    .where(eq(skills.slug, slug))
    .limit(1);
  return result[0] ?? null;
}
\`\`\`

### Auth Bypass Detection

During review, verify that every new API route has appropriate auth checks:

\`\`\`typescript
// MISSING AUTH: Anyone can delete skills
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  await db.delete(skills).where(eq(skills.id, params.id));
  return NextResponse.json({ success: true });
}

// SECURE: Auth required, ownership verified
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const skill = await db
    .select()
    .from(skills)
    .where(eq(skills.id, params.id))
    .limit(1);

  if (!skill[0] || skill[0].authorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.delete(skills).where(eq(skills.id, params.id));
  return NextResponse.json({ success: true });
}
\`\`\`

### Secrets in Code

AI agents are excellent at detecting accidentally committed secrets:

- API keys in source files (even in comments)
- Database connection strings in config files
- JWT secrets in environment examples
- Private keys or certificates
- Hardcoded passwords in test fixtures that match production patterns

---

## 7. Performance Review from a QA Perspective

QA engineers often discover performance issues during testing. Catching them during code review is far more efficient.

### N+1 Query Detection

\`\`\`typescript
// N+1 PROBLEM: One query per skill for categories
async function getSkillsWithCategories() {
  const allSkills = await db.select().from(skills);

  // This executes N additional queries!
  return Promise.all(
    allSkills.map(async (skill) => ({
      ...skill,
      categories: await db
        .select()
        .from(skillCategories)
        .where(eq(skillCategories.skillId, skill.id)),
    }))
  );
}

// FIXED: Single query with join
async function getSkillsWithCategories() {
  return db
    .select()
    .from(skills)
    .leftJoin(skillCategories, eq(skills.id, skillCategories.skillId))
    .leftJoin(categories, eq(skillCategories.categoryId, categories.id));
}
\`\`\`

### Memory Leak Patterns

Watch for these in React component PRs:

\`\`\`typescript
// LEAK: Event listener never cleaned up
function SearchComponent() {
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    // Missing cleanup!
  }, []);

  // FIXED: Cleanup on unmount
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
}
\`\`\`

### Bundle Size Impact

Flag PRs that import large libraries unnecessarily:

\`\`\`typescript
// BAD: Imports entire lodash (70KB+ gzipped)
import _ from 'lodash';
const sorted = _.sortBy(skills, 'name');

// GOOD: Import only what you need (2KB)
import sortBy from 'lodash/sortBy';
const sorted = sortBy(skills, 'name');

// BETTER: Use native JavaScript
const sorted = [...skills].sort((a, b) => a.name.localeCompare(b.name));
\`\`\`

---

## 8. Accessibility Review in PRs

Accessibility defects are among the most costly to fix after release. Catching them during code review is essential.

### Semantic HTML

\`\`\`typescript
// BAD: Div soup with click handler
<div className="card" onClick={handleClick}>
  <div className="title">{skill.name}</div>
  <div className="desc">{skill.description}</div>
</div>

// GOOD: Semantic HTML with proper roles
<article className="card">
  <h3>{skill.name}</h3>
  <p>{skill.description}</p>
  <button onClick={handleClick} aria-label={\\\`View details for \\\${skill.name}\\\`}>
    View Details
  </button>
</article>
\`\`\`

### ARIA Attributes

Flag missing or incorrect ARIA usage:

- **Missing labels**: Interactive elements without accessible names
- **Invalid roles**: Using roles that do not match the element's behavior
- **Missing live regions**: Dynamic content updates without \`aria-live\`
- **Incorrect hierarchy**: \`aria-expanded\` without a corresponding collapsible region

\`\`\`typescript
// BAD: Icon button with no accessible name
<button onClick={onClose}>
  <XIcon />
</button>

// GOOD: Screen reader accessible
<button onClick={onClose} aria-label="Close dialog">
  <XIcon aria-hidden="true" />
</button>
\`\`\`

### Keyboard Navigation

Every interactive element must be operable via keyboard:

\`\`\`typescript
// BAD: Only handles mouse click
<div
  className="skill-tag"
  onClick={() => onTagSelect(tag)}
>
  {tag}
</div>

// GOOD: Keyboard accessible
<button
  className="skill-tag"
  onClick={() => onTagSelect(tag)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTagSelect(tag);
    }
  }}
>
  {tag}
</button>
\`\`\`

### Color Contrast

During review, flag hardcoded colors that may not meet WCAG contrast ratios:

- **Normal text**: Minimum contrast ratio of 4.5:1
- **Large text (18px+ or 14px+ bold)**: Minimum ratio of 3:1
- **UI components and graphics**: Minimum ratio of 3:1

AI agents can analyze Tailwind classes and flag potential contrast issues:

\`\`\`typescript
// POTENTIAL ISSUE: Light gray on white may fail contrast
<p className="text-gray-300 bg-white">Low contrast text</p>

// BETTER: Ensure sufficient contrast
<p className="text-gray-700 bg-white">Readable text</p>
\`\`\`

---

## 9. Building Custom Review Rules

Generic AI review is good. Custom rules tailored to your team are great.

### ESLint Custom Rules

Create ESLint rules that enforce your QA standards automatically:

\`\`\`typescript
// eslint-rules/require-error-boundary.ts
import type { Rule } from 'eslint';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require ErrorBoundary wrapper in page components',
    },
    messages: {
      missingBoundary:
        'Page components should be wrapped in an ErrorBoundary for graceful error handling.',
    },
  },
  create(context) {
    let hasErrorBoundary = false;

    return {
      JSXOpeningElement(node: any) {
        if (node.name.name === 'ErrorBoundary') {
          hasErrorBoundary = true;
        }
      },
      'Program:exit'() {
        const filename = context.getFilename();
        if (filename.includes('/app/') && filename.endsWith('page.tsx') && !hasErrorBoundary) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'missingBoundary',
          });
        }
      },
    };
  },
};

export default rule;
\`\`\`

### Custom GitHub Actions for Review

Build specialized review checks that run on every PR:

\`\`\`yaml
# .github/workflows/qa-custom-checks.yml
name: QA Custom Checks

on:
  pull_request:
    paths:
      - 'src/**/*.ts'
      - 'src/**/*.tsx'

jobs:
  check-test-coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check new files have tests
        run: |
          NEW_SRC=\$(git diff --name-only --diff-filter=A origin/main...HEAD | grep -E '\\.(ts|tsx)\$' | grep -v '\\.test\\.|__tests__|\\.spec\\.')
          MISSING_TESTS=""

          for file in \$NEW_SRC; do
            TEST_FILE=\$(echo "\$file" | sed 's/\\.ts\$/.test.ts/' | sed 's/\\.tsx\$/.test.tsx/')
            ALT_TEST_FILE=\$(echo "\$file" | sed 's|/\\([^/]*\\)\\.ts\$|/__tests__/\\1.test.ts|')

            if [ ! -f "\$TEST_FILE" ] && [ ! -f "\$ALT_TEST_FILE" ]; then
              MISSING_TESTS="\$MISSING_TESTS\\n- \$file"
            fi
          done

          if [ -n "\$MISSING_TESTS" ]; then
            echo "::warning::New source files without tests:\$MISSING_TESTS"
          fi

      - name: Check for console.log in production code
        run: |
          VIOLATIONS=\$(git diff origin/main...HEAD -- '*.ts' '*.tsx' | grep '^+' | grep -v '^+++' | grep 'console\\.log' | head -20 || true)
          if [ -n "\$VIOLATIONS" ]; then
            echo "::warning::console.log statements found in PR diff. Consider using a proper logger."
          fi
\`\`\`

### AI-Powered Custom Checks

Combine QA skills with custom review logic:

\`\`\`typescript
// scripts/ai-review-check.ts
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

interface ReviewFinding {
  file: string;
  line: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  category: string;
}

function getChangedFiles(): string[] {
  const output = execSync('git diff --name-only origin/main...HEAD').toString();
  return output.trim().split('\\n').filter(Boolean);
}

function analyzeFile(filePath: string): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\\n');

  lines.forEach((line, index) => {
    // Check for hardcoded URLs
    if (line.match(/https?:\\/\\/(?!localhost|127\\.0\\.0\\.1|example\\.com)/)) {
      findings.push({
        file: filePath,
        line: index + 1,
        severity: 'warning',
        message: 'Hardcoded URL detected. Consider using environment variables.',
        category: 'configuration',
      });
    }

    // Check for TODO/FIXME without issue references
    if (line.match(/\\/\\/ (TODO|FIXME)(?!.*#\\d)/)) {
      findings.push({
        file: filePath,
        line: index + 1,
        severity: 'info',
        message: 'TODO/FIXME without issue reference. Link to a tracking issue.',
        category: 'maintainability',
      });
    }

    // Check for any type usage
    if (line.match(/:\\s*any\\b/) || line.match(/as any\\b/)) {
      findings.push({
        file: filePath,
        line: index + 1,
        severity: 'warning',
        message: 'Usage of "any" type. Use a specific type for better type safety.',
        category: 'type-safety',
      });
    }
  });

  return findings;
}

const files = getChangedFiles();
const allFindings = files.flatMap(analyzeFile);

if (allFindings.length > 0) {
  console.log(\\\`Found \\\${allFindings.length} review findings:\\n\\\`);
  allFindings.forEach((f) => {
    console.log(\\\`[\\\${f.severity.toUpperCase()}] \\\${f.file}:\\\${f.line} - \\\${f.message}\\\`);
  });
}
\`\`\`

---

## 10. Measuring Code Review Effectiveness

What gets measured gets improved. Track these metrics to understand whether your AI-powered code review process is actually catching bugs.

### Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Defect Escape Rate** | Percentage of defects found after code review vs. before | < 15% |
| **Review Coverage** | Percentage of PRs that receive AI review | > 95% |
| **Time to Review** | Average time from PR open to first review comment | < 30 minutes |
| **False Positive Rate** | Percentage of AI comments that are incorrect or unhelpful | < 20% |
| **Actionable Comment Rate** | Percentage of AI comments that lead to code changes | > 40% |
| **Defect Density** | Number of defects found per 1000 lines reviewed | Track trend |

### Feedback Loops

Build a feedback loop between your review findings and test improvements:

1. **Track review-found defects**: When AI review catches a bug, categorize it (logic error, security, performance, etc.)
2. **Map to test gaps**: For each review-found defect, determine what test would have caught it
3. **Write that test**: Add the test to prevent regression
4. **Update review rules**: If a pattern recurs, create a custom rule to catch it automatically
5. **Measure improvement**: Track whether defect escape rate decreases over time

### Defect Escape Rate Calculation

\`\`\`typescript
interface DefectMetrics {
  foundInReview: number;
  foundInQA: number;
  foundInProduction: number;
}

function calculateEscapeRate(metrics: DefectMetrics): {
  reviewEscapeRate: number;
  qaEscapeRate: number;
  totalEscapeRate: number;
} {
  const total = metrics.foundInReview + metrics.foundInQA + metrics.foundInProduction;

  return {
    reviewEscapeRate: total > 0 ? (metrics.foundInQA + metrics.foundInProduction) / total : 0,
    qaEscapeRate: total > 0 ? metrics.foundInProduction / total : 0,
    totalEscapeRate:
      total > 0 ? metrics.foundInProduction / total : 0,
  };
}

// Example: If you find 50 bugs in review, 15 in QA, and 5 in production:
// Review escape rate: (15 + 5) / 70 = 28.6%
// QA escape rate: 5 / 70 = 7.1%
\`\`\`

---

## 11. AI-Assisted Code Review with QASkills

The **qaskills.sh** ecosystem provides a structured way to encode review knowledge that AI agents can consume and apply consistently.

### Installing Code Review Skills

\`\`\`bash
# Install the comprehensive code review skill
npx @qaskills/cli add code-review-excellence

# Search for review-related skills
npx @qaskills/cli search "code review"
npx @qaskills/cli search "security review"
npx @qaskills/cli search "accessibility"

# Install multiple complementary skills
npx @qaskills/cli add security-testing-owasp
npx @qaskills/cli add accessibility-a11y
npx @qaskills/cli add api-testing-rest
\`\`\`

### How Skills Enhance AI Review

When an AI agent like Claude Code has QA skills loaded, its review capabilities transform:

**Without skills**: The agent provides generic review comments based on its training data. Comments like "consider adding error handling" or "this could use a test."

**With skills**: The agent applies framework-specific, team-specific patterns. It knows your exact testing conventions, your preferred assertion library, your error handling patterns, and your security checklist. Comments become actionable: "This Playwright selector uses a CSS class which is brittle -- use \`data-testid\` or \`getByRole\` per your project's testing conventions."

### Creating a Custom Review Skill

You can create your own review skill that encodes your team's standards:

\`\`\`yaml
---
name: our-team-review-standards
version: 1.0.0
description: Custom code review standards for our QA team
author: your-team
tags:
  - code-review
  - team-standards
testingTypes:
  - code-review
  - static-analysis
frameworks:
  - react
  - next.js
  - playwright
languages:
  - typescript
---

# Our Team's Code Review Standards

## Required for All PRs

1. Every new API endpoint must have:
   - Input validation with Zod schemas
   - Authentication check (unless explicitly public)
   - Rate limiting consideration
   - Error response in standard format
   - Corresponding integration test

2. Every new UI component must have:
   - TypeScript props interface (no \\\`any\\\` types)
   - Accessibility attributes (aria-label, role, etc.)
   - Responsive design (test at 320px, 768px, 1024px)
   - Loading and error states
   - Unit test with React Testing Library

3. Every database change must have:
   - Migration file
   - Rollback strategy documented
   - Index analysis for new queries
   - Seed data update if applicable
\`\`\`

---

## 12. Ten Best Practices for AI Code Review

1. **Start with a clear review scope.** Configure your AI tool to focus on QA-relevant concerns rather than style or formatting issues that linters already handle.

2. **Combine AI review with human review.** AI catches pattern-based issues quickly. Humans catch design problems, business logic errors, and subtle architectural concerns.

3. **Customize your review instructions.** Generic AI review is noisy. Provide specific instructions about your team's standards, preferred patterns, and known problem areas.

4. **Review test code with the same rigor as production code.** Bad tests are worse than no tests because they create false confidence. AI agents are excellent at identifying weak assertions and missing test scenarios.

5. **Track review metrics over time.** Measure defect escape rate, false positive rate, and actionable comment rate. Use these metrics to tune your AI review configuration.

6. **Install domain-specific QA skills.** Use \`npx @qaskills/cli add\` to install skills that encode expert knowledge about your testing frameworks, security requirements, and accessibility standards.

7. **Create custom review rules for recurring issues.** If the same type of bug keeps appearing in review, codify the check as an ESLint rule, GitHub Action, or custom AI skill.

8. **Review PRs early and often.** Smaller PRs get better reviews -- both from humans and AI. Encourage developers to open draft PRs early so QA can provide feedback before the implementation is locked in.

9. **Document review decisions.** When you decide to accept or reject an AI suggestion, leave a brief comment explaining why. This builds institutional knowledge and helps tune future reviews.

10. **Iterate on your review process quarterly.** Review your defect metrics, adjust your AI configuration, add new custom rules, and retire rules that no longer provide value.

---

## 13. Eight Anti-Patterns to Avoid

### Anti-Pattern 1: Rubber-Stamp Reviews

Approving PRs after a cursory glance because "the AI already reviewed it." AI review supplements human judgment -- it does not replace it.

### Anti-Pattern 2: Ignoring AI Suggestions Without Explanation

Dismissing every AI comment as a false positive. If AI consistently flags something, investigate whether there is a real concern, and if not, tune the rules to reduce noise.

### Anti-Pattern 3: Review Comment Overload

Configuring AI to flag every possible issue creates review fatigue. Prioritize: focus on correctness, security, and testability. Let formatters and linters handle style.

### Anti-Pattern 4: Reviewing Only the Diff

AI tools that only analyze the changed lines miss context. The most dangerous bugs often arise from interactions between the changed code and existing code. Use tools that understand the full file context.

### Anti-Pattern 5: Skipping Test Reviews

Reviewing production code but not the accompanying tests. Poor test code leads to flaky CI, false confidence, and maintenance burden.

### Anti-Pattern 6: One-Size-Fits-All Review Configuration

Using the same AI review profile for frontend components, backend APIs, database migrations, and infrastructure code. Each domain has different quality concerns and should be reviewed accordingly.

### Anti-Pattern 7: Not Updating Review Rules

Setting up AI review once and never revisiting the configuration. As your codebase evolves, your review standards should evolve too. New frameworks, new patterns, new vulnerability classes -- all require rule updates.

### Anti-Pattern 8: Treating AI Review as a Gate Rather Than a Guide

Using AI review as a hard blocker where every comment must be resolved before merging. This slows down delivery without improving quality. Instead, treat AI findings as suggestions that warrant investigation, with human judgment making the final call.

---

## Conclusion

AI-powered code review represents a fundamental shift in how QA engineers contribute to software quality. By participating in code review with AI assistance, QA professionals can catch defects earlier, enforce testability standards, and build a culture of quality that starts at the pull request.

The key is to approach AI code review as a **toolset, not a replacement**. The best results come from combining AI pattern detection with human QA expertise -- the AI catches the patterns it has been trained to recognize, while the QA engineer provides the contextual judgment that no model can replicate.

Start by installing a code review skill and experimenting with one of the tools covered in this guide:

\`\`\`bash
npx @qaskills/cli add code-review-excellence
\`\`\`

Then gradually expand your review scope to include security, accessibility, and performance concerns. Track your metrics, iterate on your rules, and watch your defect escape rate drop.

The PRs your team ships will be better for it.
`,
};
