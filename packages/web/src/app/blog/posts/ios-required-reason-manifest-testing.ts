import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 823,
  slug: 'ios-required-reason-manifest-testing',
  campaignCluster: 'system-quality',
  title: 'Ios Required Reason Manifest Testing',
  description:
    'iOS required reason manifest testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'iOS required reason manifest testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify required-reason APIs and collected-data declarations match shipped code?',
  intentBoundary: 'Owns privacy manifest artifact accuracy, not runtime consent screens.',
  secondaryKeywords: [
    'required reason API',
    'PrivacyInfo.xcprivacy merge',
    'SDK privacy declaration',
    'iOS required reason manifest testing checklist',
    'iOS required reason manifest testing CI strategy',
    'iOS required reason manifest testing failure diagnosis',
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
    'https://developer.apple.com/documentation/bundleresources/privacy-manifest-files',
    'https://developer.apple.com/documentation/technotes/tn3181-debugging-invalid-privacy-manifest',
  ],
  codeExamples: [
    {
      title: 'Build the iOS required reason manifest testing baseline',
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
