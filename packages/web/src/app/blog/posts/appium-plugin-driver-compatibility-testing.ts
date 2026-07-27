import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 947,
  slug: 'appium-plugin-driver-compatibility-testing',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Appium Plugin Driver Compatibility Testing',
  description:
    'Appium plugin driver compatibility testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Appium plugin driver compatibility testing',
  intent: 'troubleshooting',
  coreQuestion:
    'How can teams verify an Appium driver and plugin combination before a server upgrade reaches CI?',
  intentBoundary:
    'The nearest page covers a broader appium workflow. This candidate owns driver-plugin-server compatibility contracts.',
  secondaryKeywords: [
    'Appium plugin compatibility test',
    'Appium driver version matrix',
    'plugin server upgrade check',
    'Appium extension compatibility',
    'mobile grid plugin validation',
  ],
  repoEvidence: ['seed-skills/appium-mobile/SKILL.md', 'seed-skills/mobile-device-farm/SKILL.md'],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/appium-mobile-testing-complete-guide',
    '/blog/appium-3-migration-guide-2026',
    '/blog/mobile-testing-automation-guide',
    '/blog/test-automation-framework-architecture',
  ],
  relatedSlugs: [
    'appium-mobile-testing-complete-guide',
    'appium-3-migration-guide-2026',
    'mobile-testing-automation-guide',
    'test-automation-framework-architecture',
  ],
  sources: [
    'https://appium.io/docs/en/latest/guides/caps/',
    'https://appium.io/docs/en/latest/guides/context/',
    'https://appium.io/docs/en/latest/ecosystem/',
    'https://www.w3.org/TR/webdriver2/',
  ],
  codeExamples: [
    {
      title: 'Build the Appium plugin driver compatibility testing baseline',
      language: 'text',
      path: 'seed-skills/appium-mobile/SKILL.md',
      snippet:
        'src/\n  main/java/com/example/\n    pages/\n      BasePage.java\n      LoginPage.java\n      HomePage.java\n    utils/\n      DriverFactory.java\n      GestureHelper.java\n      WaitHelper.java\n      CapabilityBuilder.java\n    config/\n      AppConfig.java\n  test/java/com/example/\n    tests/\n      BaseTest.java\n      LoginTest.java\n      HomeTest.java',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/mobile-device-farm/SKILL.md',
      snippet: '',
    },
  ],
});
