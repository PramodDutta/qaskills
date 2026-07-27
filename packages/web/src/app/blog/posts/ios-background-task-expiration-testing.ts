import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 754,
  slug: 'ios-background-task-expiration-testing',
  campaignCluster: 'system-quality',
  title: 'Ios Background Task Expiration Testing',
  description:
    'iOS background task expiration testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'iOS background task expiration testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify work stops, saves state, and reports completion before iOS expiration?',
  intentBoundary: 'Owns background-task expiry handlers, not push notification delivery.',
  secondaryKeywords: [
    'BGTask expiration handler',
    'background save deadline',
    'task completion flag',
    'iOS background task expiration testing checklist',
    'iOS background task expiration testing CI strategy',
    'iOS background task expiration testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/appium-mobile/SKILL.md',
    'seed-skills/mobile-device-farm/SKILL.md',
    'packages/web/src/app/blog/posts/earlgrey-ios-ui-testing-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/mobile-testing-automation-guide',
    '/blog/appium-mobile-testing-complete-guide',
    '/blog/mobile-device-farm-testing-strategy-2026',
    '/blog/api-testing-best-practices-guide',
  ],
  relatedSlugs: [
    'mobile-testing-automation-guide',
    'appium-mobile-testing-complete-guide',
    'mobile-device-farm-testing-strategy-2026',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://developer.apple.com/documentation/backgroundtasks',
    'https://developer.apple.com/documentation/uikit/extending-your-app-s-background-execution-time',
  ],
  codeExamples: [
    {
      title: 'Build the iOS background task expiration testing baseline',
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
