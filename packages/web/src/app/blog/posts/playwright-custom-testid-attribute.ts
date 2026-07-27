import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 564,
  slug: 'playwright-custom-testid-attribute',
  campaignCluster: 'browser-e2e',
  title: 'Playwright Custom Testid Attribute',
  description:
    'playwright custom testid attribute: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'playwright custom testid attribute',
  intent: 'how-to',
  coreQuestion:
    'How do you configure Playwright getByTestId to use data-qa or another project-specific test attribute?',
  intentBoundary:
    'Targets configuration and migration of the attribute contract, not general locator ranking.',
  secondaryKeywords: [
    'playwright testidattribute config',
    'playwright data qa locator',
    'custom getbytestid attribute',
    'data test id naming',
    'playwright locator test contract',
    'codegen custom test id',
  ],
  repoEvidence: [
    'seed-skills/selenium-to-playwright-migration/SKILL.md',
    'packages/web/e2e/post-flow.e2e.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/playwright-locator-strategies-getbyrole-guide',
    '/blog/playwright-best-practices-locators-2026',
    '/blog/playwright-codegen-recording-complete-guide',
    '/blog/playwright-e2e-complete-guide',
  ],
  relatedSlugs: [
    'playwright-locator-strategies-getbyrole-guide',
    'playwright-best-practices-locators-2026',
    'playwright-codegen-recording-complete-guide',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://playwright.dev/docs/locators#locate-by-test-id',
    'https://playwright.dev/docs/api/class-selectors#selectors-set-test-id-attribute',
    'https://playwright.dev/docs/test-configuration',
  ],
  codeExamples: [
    {
      title: 'Build the playwright custom testid attribute baseline',
      language: 'java',
      path: 'seed-skills/selenium-to-playwright-migration/SKILL.md',
      snippet:
        '// LoginTest.java - typical Selenium with explicit waits\nimport org.openqa.selenium.*;\nimport org.openqa.selenium.chrome.ChromeDriver;\nimport org.openqa.selenium.support.ui.*;\nimport java.time.Duration;\nimport org.junit.jupiter.api.*;\nimport static org.junit.jupiter.api.Assertions.*;\n\npublic class LoginTest {\n    WebDriver driver;\n    WebDriverWait wait;\n\n    @BeforeEach\n    void setUp() {\n        driver = new ChromeDriver();\n        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));\n        wait = new WebDriverWait(driver, Duration.ofSeconds(10));\n    }',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/e2e/post-flow.e2e.ts',
      snippet:
        "},\n  {\n    slug: 'playwright-multiple-tabs-popups-tutorial-2026',\n    title: 'Playwright Multiple Tabs and Popups Tutorial for Real Browser Flows',\n  },\n  {\n    slug: 'playwright-file-upload-testing-guide-2026',\n    title: 'Playwright File Upload Testing Guide with setInputFiles and FileChooser',\n  },\n  {\n    slug: 'playwright-file-download-testing-guide-2026',\n    title: 'Playwright File Download Testing Guide with waitForEvent and saveAs',\n  },\n  {\n    slug: 'playwright-evaluate-tutorial-2026',\n    title: 'Playwright page.evaluate() Tutorial: Execute Browser JavaScript Safely',\n  },\n  {",
    },
  ],
});
