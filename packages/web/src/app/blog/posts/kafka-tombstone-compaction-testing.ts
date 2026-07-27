import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 771,
  slug: 'kafka-tombstone-compaction-testing',
  campaignCluster: 'system-quality',
  title: 'Kafka Tombstone Compaction Testing',
  description:
    'Kafka tombstone compaction testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Kafka tombstone compaction testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify deleted keys disappear after retention without resurrecting stale values?',
  intentBoundary:
    'Owns compacted-topic tombstones, not database soft deletes or event retention generally.',
  secondaryKeywords: [
    'null value tombstone',
    'delete retention interval',
    'compaction resurrection bug',
    'Kafka tombstone compaction testing checklist',
    'Kafka tombstone compaction testing CI strategy',
    'Kafka tombstone compaction testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/kafka-event-driven-testing/SKILL.md',
    'seed-skills/data-pipeline-testing/SKILL.md',
    'packages/web/src/app/blog/posts/data-contract-testing-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/database-testing-automation-guide',
    '/blog/data-contract-testing-guide-2026',
    '/blog/event-driven-architecture-testing-guide',
    '/blog/api-testing-best-practices-guide',
  ],
  relatedSlugs: [
    'database-testing-automation-guide',
    'data-contract-testing-guide-2026',
    'event-driven-architecture-testing-guide',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html',
    'https://kafka.apache.org/documentation/#compaction',
  ],
  codeExamples: [
    {
      title: 'Build the Kafka tombstone compaction testing baseline',
      language: 'java',
      path: 'seed-skills/kafka-event-driven-testing/SKILL.md',
      snippet:
        '// JUnit 5 + Testcontainers (same pattern exists for Python and Node)\n@Testcontainers\nclass OrderEventsIT {\n  @Container\n  static KafkaContainer kafka = new KafkaContainer(\n      DockerImageName.parse("confluentinc/cp-kafka:7.6.0"));\n\n  KafkaProducer<String, String> producer;\n  KafkaConsumer<String, String> consumer;\n\n  @BeforeEach\n  void setup() {\n    producer = new KafkaProducer<>(Map.of(\n        BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers(),\n        KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class,\n        VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class,\n        ACKS_CONFIG, "all"));                      // test with prod-like acks\n  }',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/data-pipeline-testing/SKILL.md',
      snippet: '',
    },
  ],
});
