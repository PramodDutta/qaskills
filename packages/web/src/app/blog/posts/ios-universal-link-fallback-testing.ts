import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 755,
  slug: 'ios-universal-link-fallback-testing',
  campaignCluster: 'system-quality',
  title: 'Ios Universal Link Fallback Testing',
  description:
    'iOS universal link fallback testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'iOS universal link fallback testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify associated-domain failures fall back without loops or lost intent?',
  intentBoundary:
    'Owns iOS association and fallback behavior, not Android App Links or cold starts.',
  secondaryKeywords: [
    'apple-app-site-association failure',
    'Safari fallback loop',
    'universal link intent',
    'iOS universal link fallback testing checklist',
    'iOS universal link fallback testing CI strategy',
    'iOS universal link fallback testing failure diagnosis',
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
    'https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content',
    'https://developer.apple.com/documentation/xcode/supporting-associated-domains',
  ],
  codeExamples: [
    {
      title: 'Build the iOS universal link fallback testing baseline',
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
