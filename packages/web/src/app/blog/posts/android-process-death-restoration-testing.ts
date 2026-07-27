import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 813,
  slug: 'android-process-death-restoration-testing',
  campaignCluster: 'system-quality',
  title: 'Android Process Death Restoration Testing',
  description:
    'Android process death restoration testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Android process death restoration testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify saved UI and domain state restore after Android kills the process?',
  intentBoundary: 'Owns OS process recreation, not rotation-only configuration changes.',
  secondaryKeywords: [
    'saved state handle',
    'process recreation test',
    'pending navigation restoration',
    'Android process death restoration testing checklist',
    'Android process death restoration testing CI strategy',
    'Android process death restoration testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/espresso-android/SKILL.md',
    'seed-skills/appium-mobile/SKILL.md',
    'packages/web/src/app/blog/posts/mobile-testing-automation-guide.ts',
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
    'https://developer.android.com/guide/components/activities/process-lifecycle',
    'https://developer.android.com/topic/libraries/architecture/saving-states',
  ],
  codeExamples: [
    {
      title: 'Build the Android process death restoration testing baseline',
      language: 'kotlin',
      path: 'seed-skills/espresso-android/SKILL.md',
      snippet:
        '// Example espresso pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/appium-mobile/SKILL.md',
      snippet:
        'CapabilityBuilder.java\n    config/\n      AppConfig.java\n  test/java/com/example/\n    tests/\n      BaseTest.java\n      LoginTest.java\n      HomeTest.java\n    data/\n      TestDataProvider.java\n  test/resources/\n    apps/\n      app-debug.apk\n      app-release.ipa\n    config/\n      android.properties\n      ios.properties\npom.xml',
    },
  ],
});
