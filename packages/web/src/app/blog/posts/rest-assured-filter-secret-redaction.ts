import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 996,
  slug: 'rest-assured-filter-secret-redaction',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Rest Assured Filter Secret Redaction',
  description:
    'REST Assured filter secret redaction: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'REST Assured filter secret redaction',
  intent: 'how-to',
  coreQuestion:
    'How should a REST Assured filter redact authorization, cookies, and secrets while retaining useful failure diagnostics?',
  intentBoundary:
    'The nearest page covers a broader rest workflow. This candidate owns secret-safe diagnostic filtering.',
  secondaryKeywords: [
    'REST Assured filter redaction',
    'hide authorization test logs',
    'REST Assured logging filter',
    'redact API secrets Java',
    'safe request response logging',
  ],
  repoEvidence: [
    'seed-skills/restassured-api-framework/SKILL.md',
    'seed-skills/rest-assured-api/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/api-testing',
    '/blog/rest-assured-java-api-testing',
    '/blog/rest-assured-json-schema-validation-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
  ],
  relatedSlugs: [
    'rest-assured-java-api-testing',
    'rest-assured-json-schema-validation-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
  ],
  sources: [
    'https://github.com/rest-assured/rest-assured/wiki/Usage',
    'https://www.rfc-editor.org/info/rfc9110',
    'https://www.rfc-editor.org/info/rfc7578',
  ],
  codeExamples: [
    {
      title: 'Build the REST Assured filter secret redaction baseline',
      language: 'text',
      path: 'seed-skills/restassured-api-framework/SKILL.md',
      snippet:
        'src/\n  main/java/com/thetestingacademy/\n    endpoints/\n      APIConstants.java               # Base URL and endpoint paths\n    modules/\n      PayloadManager.java             # Payload creation and response parsing\n    pojos/\n      request/\n        Auth.java                     # Authentication POJO\n        Booking.java                  # Booking request POJO\n        Bookingdates.java             # Nested dates POJO\n      reponse/\n        BookingResponse.java          # Booking response POJO\n        TokenResponse.java            # Token response POJO\n  test/java/com/thetestingacademy/\n    base/\n      BaseTest.java                   # Setup, teardown, token helper\n    asserts/',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/rest-assured-api/SKILL.md',
      snippet:
        'AuthHelper.java\n      TestDataHelper.java\n  test/java/com/example/\n    tests/\n      BaseApiTest.java\n      UsersApiTest.java\n      ProductsApiTest.java\n      AuthApiTest.java\n    schemas/\n      user-schema.json\n      product-schema.json\n      error-schema.json\n  test/resources/\n    test-data/\n      users.json\n    config.properties\npom.xml',
    },
  ],
});
