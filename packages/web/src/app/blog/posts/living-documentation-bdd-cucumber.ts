import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Living Documentation with BDD Cucumber 2026',
  description:
    'Living documentation patterns with BDD and Cucumber. Generate stakeholder-ready docs from feature files, integrate with Confluence, Notion, and SharePoint, and keep docs in sync with code in 2026.',
  date: '2026-05-15',
  category: 'BDD',
  content: `
# Living Documentation with BDD Cucumber 2026

Most product documentation goes stale within weeks of being written. A new feature ships, the doc is forgotten, and three months later the wiki shows behavior that no longer matches the running code. Living documentation solves this by making the documentation executable: the same Gherkin feature files that run as automated tests also serve as the canonical specification of what the product does. When the code changes, the tests update, the documentation updates, and stakeholders read truth instead of fiction.

In 2026, living documentation with BDD Cucumber has matured into a real engineering practice. Tools like Cluecumber, Reqnroll LivingDoc, Pickles, Allure, and CukeDocs generate stakeholder-ready HTML, PDF, and Confluence pages directly from feature files and test results. Combined with AI agents that author scenarios and CI pipelines that publish the docs automatically, the result is a documentation system that genuinely stays in sync with the product.

This guide is a complete walkthrough for setting up living documentation with Cucumber in 2026: tool selection, feature file conventions, glossaries and tags, publishing pipelines, integration with Confluence and Notion, and the common pitfalls that derail living documentation initiatives.

## Key Takeaways

- **Living documentation makes specifications executable** -- the source of truth is the same as the test.
- **Cluecumber and LivingDoc** produce stakeholder-ready HTML reports.
- **Feature files double as user stories** when written in business language.
- **Publish to Confluence or Notion** for stakeholder access without engineering knowledge.
- **CI pipelines regenerate docs on every merge** to keep them current.

---

## 1. What Living Documentation Means

Traditional documentation is written once and decays. Living documentation has three properties:

1. **Executable**: the documentation can be run as a test.
2. **Current**: the documentation regenerates on every merge.
3. **Authoritative**: the source of truth is the documentation, not separate Confluence pages.

BDD with Gherkin is the most popular implementation of living documentation. The feature file is both the spec and the test. Tools then render the feature file as HTML, PDF, or Confluence content.

## 2. Feature Files as Documentation

A well-written Gherkin file is readable as documentation:

\`\`\`gherkin
Feature: Customer can transfer money between accounts

  As a registered customer,
  I want to move funds between my own accounts,
  so that I can manage my finances without contacting a teller.

  Rules:
  - Both accounts must belong to the same customer
  - The source account must have sufficient funds
  - Transfers are logged in the audit log for compliance

  Background:
    Given a customer "Alice" with a checking account holding 1500.00 and a savings account holding 250.00

  @critical-path
  Scenario: Successful transfer between own accounts
    When Alice transfers 500.00 from "Checking" to "Savings"
    Then the "Checking" account holds 1000.00
    And the "Savings" account holds 750.00
    And the transfer appears in the audit log

  @validation
  Scenario Outline: Transfers fail when invalid
    When Alice attempts to transfer <amount> from "Checking" to "Savings"
    Then the transfer fails with reason "<reason>"

    Examples:
      | amount   | reason                  |
      | 0.00     | Amount must be positive |
      | -50.00   | Amount must be positive |
      | 10000.00 | Insufficient funds      |
\`\`\`

A product manager can read this and confirm the rules. A QA engineer can see exactly what's covered. A developer can find the relevant step definitions. The same artifact serves three audiences.

## 3. Tool Selection

In 2026 the main living documentation tools:

| Tool | Framework | Output | Notes |
|---|---|---|---|
| Cluecumber | Cucumber-JVM | HTML | Most polished JVM option |
| Reqnroll LivingDoc | Reqnroll | HTML | Native .NET integration |
| Pickles | Multi (XML) | HTML, PDF, Confluence | Cross-language |
| CukeDocs | Cucumber-JVM | HTML | Lightweight |
| Allure | All | HTML | Test report + docs |
| MasterTheBoss | Custom | HTML, PDF | Java-only |

## 4. Cluecumber Setup

Add the Maven plugin:

\`\`\`xml
<plugin>
  <groupId>com.trivago.rta</groupId>
  <artifactId>cluecumber-maven</artifactId>
  <version>3.10.0</version>
  <executions>
    <execution>
      <id>report</id>
      <phase>post-integration-test</phase>
      <goals><goal>reporting</goal></goals>
    </execution>
  </executions>
  <configuration>
    <sourceJsonReportDirectory>target/cucumber-json</sourceJsonReportDirectory>
    <generatedHtmlReportDirectory>target/cluecumber</generatedHtmlReportDirectory>
    <customCss>cluecumber.css</customCss>
    <customStatusColorPassed>#34d399</customStatusColorPassed>
    <customStatusColorFailed>#f87171</customStatusColorFailed>
    <customStatusColorSkipped>#fbbf24</customStatusColorSkipped>
  </configuration>
</plugin>
\`\`\`

Run:

\`\`\`bash
mvn -B verify
\`\`\`

Output: target/cluecumber/index.html with feature/scenario navigation, tag filtering, history, and screenshots.

## 5. Reqnroll LivingDoc

\`\`\`bash
dotnet tool install --global Reqnroll.LivingDoc.CLI
reqnroll-livingdoc test-assembly ./bin/Debug/net9.0/MyApp.Tests.dll \\
  --test-execution-json TestExecution.json \\
  --output ./LivingDoc.html
\`\`\`

## 6. Publishing to Confluence

A simple pipeline that pushes Cluecumber output to Confluence:

\`\`\`yaml
- name: Generate living docs
  run: mvn cluecumber:reporting

- name: Push to Confluence
  uses: rohit-gohri/confluence-publish@v1
  with:
    confluence-url: https://example.atlassian.net/wiki
    user: \${{ secrets.CONFLUENCE_USER }}
    api-token: \${{ secrets.CONFLUENCE_TOKEN }}
    space: ENG
    parent: 'Living Documentation'
    title: 'Feature Specifications (auto-generated)'
    file: target/cluecumber/index.html
\`\`\`

## 7. Publishing to Notion

Notion's API + a simple converter script:

\`\`\`typescript
import { Client } from "@notionhq/client";
import * as fs from "fs/promises";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function publishFeature(featurePath: string, pageId: string) {
  const content = await fs.readFile(featurePath, "utf-8");
  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      { type: "code", code: { language: "gherkin", rich_text: [{ text: { content } }] } },
    ],
  });
}
\`\`\`

## 8. Glossary and Domain Terms

Living documentation works only if the language stays consistent. Maintain a glossary in the repo, referenced from CONTRIBUTING.md:

\`\`\`markdown
| Term | Definition |
|---|---|
| Customer | A person with a registered account |
| Account | A balance-bearing entity owned by a Customer |
| Transfer | Movement of funds between two Accounts |
| Audit Log | Append-only record of all transfers, write-once |
\`\`\`

Use the same vocabulary across all feature files. Tools like Cucumber Studio enforce this with tag validation.

## 9. Tags as Documentation Metadata

Beyond execution filters, tags carry documentation metadata:

| Tag | Meaning |
|---|---|
| @critical-path | High business impact |
| @compliance-required | Required by regulation |
| @release-1.5 | Shipped in release 1.5 |
| @epic-12345 | Belongs to epic |
| @deprecated-2026-Q3 | Removal scheduled |

Cluecumber filters by tag in the rendered HTML.

## 10. CI-Driven Regeneration

A canonical pipeline:

\`\`\`yaml
on:
  push:
    branches: [main]

jobs:
  docs:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 21 }
      - run: mvn -B verify
      - run: mvn cluecumber:reporting
      - name: Deploy to docs site
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: target/cluecumber
\`\`\`

Now docs at https://docs.example.com regenerate on every merge.

## 11. Stakeholder Onboarding

The living documentation site becomes the canonical entry point for non-engineering staff:

1. Product Managers: read scenarios to confirm requirements.
2. Customer Support: look up product behavior to answer tickets.
3. Compliance: audit scenarios tagged @compliance-required.
4. Sales Engineering: find scenarios that match prospect requirements.

A short README in the docs site explaining how to read Gherkin closes the gap.

## 12. AI-Assisted Living Documentation

In 2026, AI agents like Claude can author scenarios from acceptance criteria and reverse-engineer scenarios from existing code. The [QASkills directory](/skills) has SKILL.md packs that teach AI agents to write in your house style. See [claude-code-qa-testing-workflows-2026](/blog).

## 13. Common Anti-Patterns

- **Imperative scenarios**: describing button clicks instead of business behavior.
- **Inconsistent vocabulary**: "user" vs "customer" vs "account holder" interchangeably.
- **Orphan scenarios**: features deleted from product but scenarios remain.
- **Stakeholders unaware**: docs exist but no one reads them.

## Conclusion

Living documentation transforms BDD from a developer practice into a cross-functional collaboration tool. With Cluecumber, LivingDoc, and CI-driven regeneration, the docs stay current without effort. See [cucumber-java-bdd-best-practices-2026](/blog) and [bdd-test-data-management-best-practices](/blog) for adjacent practices.
`,
};
