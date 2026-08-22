// Internal-link balancing for the blog graph.
//
// Related posts are scored by category and title-token overlap, which leaves
// topically unusual articles with few or no inbound links: 137 canonical posts
// had zero and another 293 had one or two, so Google could only reach them
// through the sitemap. Search Console currently lists 368 URLs as discovered
// but not crawled and 525 as crawled but not indexed, which is the shape a
// weak internal-link graph produces. This map guarantees every canonical post
// is linked from at least three others by reserving up to two related-post
// slots on the listed donor pages.
//
// Generated, not hand-edited. Regenerate after a large publishing batch.
// Donors: 575, edges: 855.

export const RELATED_POST_BOOSTS: Record<string, readonly string[]> = {
  'ab-testing-llm-prompts-guide': [
    'ai-defect-prediction-machine-learning-qa',
    'langchain-evaluators-complete-guide',
  ],
  'accelq-codeless-test-automation-guide-2026': [
    'manual-to-automation-testing-transition',
    'ranorex-test-automation-2026-guide',
  ],
  'accessibility-testing-autocomplete-attributes': [
    'testrigor-ai-testing-guide',
    'tricentis-tosca-codeless-testing-guide',
  ],
  'accessibility-testing-automation-guide': [
    'manual-to-automation-testing-transition',
    'ranorex-test-automation-2026-guide',
  ],
  'accessibility-testing-color-contrast-automation': [
    'manual-to-automation-testing-transition',
    'ranorex-test-automation-2026-guide',
  ],
  'accessibility-testing-data-table-semantics': [
    'testrigor-ai-testing-guide',
    'tricentis-tosca-codeless-testing-guide',
  ],
  'accessibility-testing-focus-order-guide': [
    'testing-elasticsearch-search-typo-tolerance',
    'tricentis-tosca-codeless-testing-guide',
  ],
  'accessibility-testing-form-error-announcement': [
    'capybara-waiting-synchronization-guide',
    'testing-live-region-toast-notifications',
  ],
  'accessibility-testing-language-attributes': [
    'capybara-waiting-synchronization-guide',
    'testing-live-region-toast-notifications',
  ],
  'accessibility-testing-modal-dialog-aria': [
    'mocha-test-coverage-c8-nyc-guide',
    'trace-based-testing-opentelemetry-2026',
  ],
  'accessibility-testing-reduced-motion': [
    'testing-otp-sms-phone-flows-complete-guide',
    'timezone-dst-testing-guide',
  ],
  'accessibility-testing-skip-links-landmarks': [
    'timezone-dst-testing-guide',
    'wave-accessibility-testing-guide-2026',
  ],
  'accessibility-testing-status-role-announcements': [
    'testing-live-region-toast-notifications',
    'timezone-dst-testing-guide',
  ],
  'accessibility-testing-video-captions-audio': [
    'qa-for-ai-support-copilots-guide-2026',
    'wave-accessibility-testing-guide-2026',
  ],
  'agent-browser-complete-guide-2026': [
    'qa-for-ai-support-copilots-guide-2026',
    'testing-infinite-scroll-screen-reader-announcements',
  ],
  'agent-skill-security-review-checklist': [
    'human-in-the-loop-ai-testing-guide-2026',
    'qa-for-ai-support-copilots-guide-2026',
  ],
  'agent-skills-open-standard-portability': ['introducing-qaskills', 'qa-okr-examples-guide'],
  'agent-testing-human-handoff-escalation': [
    'ai-defect-prediction-machine-learning-qa',
    'langchain-evaluators-complete-guide',
  ],
  'agent-testing-memory-persistence-across-sessions': [
    'ai-defect-prediction-machine-learning-qa',
    'langchain-evaluators-complete-guide',
  ],
  'agent-testing-multi-turn-state-drift': [
    'google-adk-agent-testing-guide',
    'testing-agent-permission-boundary-violations',
  ],
  'agent-testing-parallel-tool-call-safety': [
    'google-adk-agent-testing-guide',
    'testing-agent-permission-boundary-violations',
  ],
  'agent-testing-step-budget-enforcement': [
    'google-adk-agent-testing-guide',
    'testing-agent-permission-boundary-violations',
  ],
  'agent-testing-tool-selection-accuracy': [
    'autonomous-testing-mabl-functionize-applitools',
    'domain-specific-ai-red-team-playbook-guide',
  ],
  'agent-tool-use-regression-testing-guide-2026': [
    'domain-specific-ai-red-team-playbook-guide',
    'testing-llm-function-call-argument-validation',
  ],
  'agent-trajectory-evaluation-guide-2026': [
    'inspect-ai-evals-tutorial-2026',
    'patronus-ai-evaluation-guide-2026',
  ],
  'agentic-ai-testing-guide-2026': [
    'mabl-active-coverage-agentic-testing-2026',
    'mabl-ai-test-automation-guide',
  ],
  'agentic-qa-workflows-mcp-guide-2026': [
    'mabl-active-coverage-agentic-testing-2026',
    'observability-testing-trace-assertion',
  ],
  'agentic-testing-complete-guide': [
    'mabl-active-coverage-agentic-testing-2026',
    'selenium-testing-ai-agents-guide',
  ],
  'agentops-agent-monitoring-guide-2026': [
    'inspect-ai-evals-tutorial-2026',
    'pyrit-ai-red-teaming-framework-guide-2026',
  ],
  'agents-md-complete-guide-ai-coding-agents': [
    'jmeter-response-assertion-jmx-guide',
    'qa-okr-examples-guide',
  ],
  'agents-rag-integration-testing-guide-2026': [
    'microfrontend-integration-testing-guide',
    'selenium-testing-ai-agents-guide',
  ],
  'aggregate-driven-synthetic-test-data-without-production-rows': [
    'metamorphic-testing-data-pipelines-guide',
    'qa-data-quality-ai-systems-2026',
  ],
  'agile-testing-complete-guide': [
    'fintech-qa-compliance-testing-guide',
    'healthcare-qa-compliance-testing-guide',
  ],
  'ai-accessibility-testing-tools-2026': [
    'how-to-detect-ai-generated-code-2026',
    'mobile-accessibility-testing-guide',
  ],
  'ai-agent-eval-testing-guide': [
    'fintech-qa-compliance-testing-guide',
    'how-to-detect-ai-generated-code-2026',
  ],
  'ai-agent-testing-non-deterministic-guide': [
    'cypress-e2e-testing-ai-agents-guide',
    'selenium-testing-ai-agents-guide',
  ],
  'ai-agent-testing-workflows-comparison': [
    'how-to-detect-ai-generated-code-2026',
    'observability-testing-trace-assertion',
  ],
  'ai-agents-in-testing-tutorial-2026': [
    'karma-jasmine-angular-testing',
    'libfuzzer-c-cpp-testing-guide',
  ],
  'ai-bug-reproduction-guide-2026': [
    'bug-bash-facilitation-guide',
    'langsmith-evaluation-guide-2026',
  ],
  'ai-code-review-qa-engineers-guide': [
    'human-in-the-loop-ai-testing-guide-2026',
    'rag-poisoning-testing-guide-2026',
  ],
  'ai-code-review-test-coverage-gaps': [
    'finalrun-ai-mobile-testing-guide',
    'qa-wolf-ai-testing-guide-2026',
  ],
  'ai-coding-agents-test-planning-guide-2026': [
    'cypress-e2e-testing-ai-agents-guide',
    'katalon-true-platform-ai-agents-2026',
  ],
  'ai-defect-prediction-machine-learning-qa': ['finalrun-ai-mobile-testing-guide'],
  'ai-guardrails-vs-evals-qa-guide-2026': [
    'mocha-test-coverage-c8-nyc-guide',
    'trace-based-testing-opentelemetry-2026',
  ],
  'ai-guardrails-vs-llm-evals-2026': [
    'giskard-llm-testing-guide-2026',
    'rhesis-ai-llm-testing-guide',
  ],
  'ai-mobile-test-automation-2026': [
    'mabl-ai-test-automation-guide',
    'mobile-accessibility-testing-guide',
  ],
  'ai-observability-qa-teams-guide-2026': [
    'observability-testing-log-schema-validation',
    'observability-testing-trace-assertion',
  ],
  'ai-powered-debugging-testing-guide': [
    'katalon-true-platform-ai-agents-2026',
    'playwright-test-info-retry-aware-logging',
  ],
  'ai-qa-skills-directory-2026': [
    'introducing-qaskills',
    'security-testing-idor-enumeration-guide',
  ],
  'ai-release-guardian-human-control-boundary': ['human-in-the-loop-ai-testing-guide-2026'],
  'ai-release-readiness-scorecard-2026': [
    'european-accessibility-act-testing-guide',
    'rag-qa-checklist-production-2026',
  ],
  'ai-test-automation-tools-2026': ['playwright-cli-coding-agents-guide'],
  'ai-test-data-generation-guide-2026': [
    'metamorphic-testing-data-pipelines-guide',
    'qa-data-quality-ai-systems-2026',
  ],
  'ai-test-data-generation-tools-2026': ['synthetic-eval-data-generation-guide'],
  'ai-test-failure-triage-auto-tfa-2026': ['octomind-ai-testing-guide-2026'],
  'ai-test-generation-llm-prompting-guide': [
    'testing-llm-function-call-argument-validation',
    'weights-biases-llm-evals-guide',
  ],
  'ai-test-generation-playwright-2026': [
    'playwright-chrome-extension-testing-manifest-v3-2026',
    'playwright-test-step-annotations-guide',
  ],
  'ai-test-generation-playwright-copilot': [
    'playwright-test-project-dependencies-setup',
    'playwright-test-step-annotations-guide',
  ],
  'ai-test-generation-review-checklist': [
    'qa-wolf-ai-testing-guide-2026',
    'testing-rag-no-answer-abstention',
  ],
  'ai-test-maintenance-self-healing-strategies': [
    'pact-broker-setup-guide-2026',
    'visual-testing-animation-freeze-strategies',
  ],
  'ai-testing-engineer-salary-skills-2026': [
    'qa-okr-examples-guide',
    'webdriverio-visual-service-blockout-guide',
  ],
  'aider-conventions-file-testing-guide': [
    'hurl-http-testing-cli-guide-2026',
    'vitest-setup-files-vs-global-setup',
  ],
  'aider-qa-engineers-guide': ['windsurf-qa-engineers-complete-guide', 'zed-ai-qa-engineers-guide'],
  'amp-ai-qa-engineers-guide': [
    'windsurf-qa-engineers-complete-guide',
    'zed-ai-qa-engineers-guide',
  ],
  'api-automation-framework-guide': [
    'mabl-ai-test-automation-guide',
    'test-environment-management-guide',
  ],
  'api-contract-testing-interview-scenarios': [
    'pact-consumer-driven-contract-reference-2026',
    'webdriverio-visual-service-blockout-guide',
  ],
  'api-contract-testing-microservices': [
    'karma-jasmine-angular-testing',
    'libfuzzer-c-cpp-testing-guide',
  ],
  'api-contract-testing-schemathesis-guide': [
    'contract-testing-spring-cloud-contract-2026',
    'qase-test-management-guide-2026',
  ],
  'api-mocking-service-virtualization-guide': [
    'karma-jasmine-angular-testing',
    'libfuzzer-c-cpp-testing-guide',
  ],
  'api-security-testing-checklist-2026': ['localization-testing-checklist-guide'],
  'api-testing-batch-request-ordering': [
    'apickli-cucumber-api-testing-guide',
    'hoppscotch-api-testing-complete-guide',
  ],
  'api-testing-best-practices-guide': [
    'qa-salary-guide-worldwide-2026',
    'top-10-qa-skills-developers-2026',
  ],
  'api-testing-bulk-endpoint-partial-failure': [
    'apickli-cucumber-api-testing-guide',
    'hoppscotch-api-testing-complete-guide',
  ],
  'api-testing-complete-guide': [
    'mailpit-email-testing-guide',
    'toxiproxy-network-failure-testing-guide',
  ],
  'api-testing-conditional-requests-etag-guide': [
    'apickli-cucumber-api-testing-guide',
    'selenium-news-may-2026-updates',
  ],
  'api-testing-content-negotiation-accept': [
    'hoppscotch-api-testing-complete-guide',
    'insomnia-api-testing-complete-guide',
  ],
  'api-testing-deprecation-sunset-headers': [
    'insomnia-api-testing-complete-guide',
    'tavern-pytest-api-testing-complete-guide',
  ],
  'api-testing-error-envelope-contract': [
    'insomnia-api-testing-complete-guide',
    'spring-cloud-contract-testing-guide',
  ],
  'api-testing-idempotency-key-patterns': [
    'tavern-pytest-api-testing-complete-guide',
    'testing-problem-details-rfc-9457-errors',
  ],
  'api-testing-json-schema-validation-guide': [
    'spring-cloud-contract-testing-guide',
    'tavern-pytest-api-testing-complete-guide',
  ],
  'api-testing-long-polling-timeout-behavior': [
    'testing-problem-details-rfc-9457-errors',
    'testing-signed-url-expiration-api',
  ],
  'api-testing-multipart-upload-validation': [
    'testing-problem-details-rfc-9457-errors',
    'testing-signed-url-expiration-api',
  ],
  'api-testing-openapi-spec-drift-detection': [
    'pactflow-can-i-deploy-ci-guide',
    'testing-signed-url-expiration-api',
  ],
  'api-testing-optimistic-concurrency-headers': [
    'pactflow-can-i-deploy-ci-guide',
    'selenium-news-may-2026-updates',
  ],
  'api-testing-pagination-cursor-vs-offset': ['lambda-api-testing-guide', 'sse-testing-guide'],
  'api-testing-partial-update-patch-semantics': ['lambda-api-testing-guide', 'sse-testing-guide'],
  'api-testing-tools-comparison-2026': [
    'playwright-test-project-dependencies-setup',
    'playwright-test-step-annotations-guide',
  ],
  'apickli-cucumber-api-testing-guide': [
    'lambda-api-testing-guide',
    'sqs-message-processing-testing-guide',
  ],
  'appium-3-migration-guide-2026': [
    'test-management-migration-plan-guide-2026',
    'testing-embedding-model-migration-regression',
  ],
  'appium-mobile-testing-complete-guide': ['espresso-android-testing-guide'],
  'appium-vs-playwright-2026': [
    'test-data-builder-vs-object-mother',
    'testim-vs-mabl-vs-functionize-comparison',
  ],
  'applitools-visual-ai-testing-complete-guide': ['autonomous-testing-mabl-functionize-applitools'],
  'applitools-visual-ai-testing-guide': ['visual-testing-font-loading-flake'],
  'argos-visual-testing-guide-2026': [
    'promptfoo-source-attribution-testing-guide-2026',
    'rhesis-ai-llm-testing-guide',
  ],
  'arize-phoenix-llm-evaluation-guide': [
    'langsmith-evaluation-platform-guide',
    'weights-biases-llm-evals-guide',
  ],
  'arize-phoenix-llm-evaluation-guide-2026': [
    'electron-app-testing-guide',
    'mailpit-email-testing-guide',
  ],
  'artillery-load-testing-nodejs-complete-2026': [
    'testing-database-connection-pool-exhaustion',
    'xk6-extensions-load-testing',
  ],
  'artillery-load-testing-nodejs-guide': [
    'k6-extensions-xk6-complete-reference',
    'wrk-wrk2-http-benchmarking-guide',
  ],
  'artillery-node-load-testing-complete-guide': [
    'k6-extensions-xk6-complete-reference',
    'wrk-wrk2-http-benchmarking-guide',
  ],
  'assertj-vs-hamcrest-junit-assertions-2026': [
    'ci-test-retries-vs-job-retries',
    'test-data-builder-vs-object-mother',
  ],
  'asyncapi-contract-testing-kafka-guide': [
    'spring-cloud-contract-testing-guide',
    'sqs-message-processing-testing-guide',
  ],
  'asyncapi-event-driven-testing-guide-2026': [
    'testing-api-eventual-consistency-polling',
    'testing-offset-pagination-duplicate-records',
  ],
  'atheris-python-fuzzing-guide': ['electron-app-testing-guide', 'mailpit-email-testing-guide'],
  'authentication-authorization-testing-guide': [
    'testing-totp-two-factor-authentication-clock-skew',
    'testmo-test-management-guide-2026',
  ],
  'autify-aximo-autonomous-testing-2026': ['memory-testing-ai-agents-guide-2026'],
  'automation-framework-design-patterns': [
    'error-handling-testing-patterns',
    'test-case-design-techniques-guide',
  ],
  'autonomous-qa-testing-guide': [
    'mocha-test-coverage-c8-nyc-guide',
    'test-datasets-for-ai-agents-guide-2026',
  ],
  'autonomous-testing-agents-build-vs-buy': [
    'ci-test-retries-vs-job-retries',
    'test-data-builder-vs-object-mother',
  ],
  'axe-core-playwright-accessibility-testing-2026': [
    'playwright-keyboard-mouse-interactions-reference',
    'playwright-multiple-tabs-windows-guide',
  ],
  'axe-devtools-accessibility-testing-guide-2026': [
    'accessibility-testing-touch-target-size',
    'testing-autocomplete-keyboard-accessibility',
  ],
  'bdd-cucumber-testing-guide': [
    'electron-app-testing-guide',
    'stagehand-ai-browser-automation-guide-2026',
  ],
  'bdd-frameworks-comparison-2026': [
    'best-test-automation-frameworks-2026',
    'gauge-spec-design-refactoring-guide',
  ],
  'bdd-living-documentation-reports': [
    'karate-bdd-api-testing-complete-guide',
    'serenity-screenplay-pattern-guide',
  ],
  'bdd-scenario-outline-data-tables': [
    'karate-bdd-api-testing-complete-guide',
    'serenity-screenplay-pattern-guide',
  ],
  'bdd-step-definition-organization': [
    'serenity-screenplay-pattern-guide',
    'specflow-net-bdd-2026-complete-guide',
  ],
  'bdd-tag-based-execution-strategy': ['specflow-net-bdd-2026-complete-guide'],
  'bdd-test-management-tools-2026': [
    'katalon-studio-test-automation-complete-guide',
    'practitest-test-management-guide-2026',
  ],
  'behave-python-bdd-complete-tutorial': [
    'phpunit-testing-complete-guide',
    'serenity-bdd-testing-guide',
  ],
  'best-cheap-ai-e2e-testing-tools-2026': [
    'ci-test-retries-vs-job-retries',
    'mockito-vs-easymock-vs-powermock-2026',
  ],
  'best-claude-code-skills-for-automated-testing': [
    'test-strategy-legacy-code-characterization',
    'testcollab-mcp-test-management-claude-2026',
  ],
  'best-claude-code-skills-for-testing-2026': [
    'test-strategy-legacy-code-characterization',
    'testcollab-mcp-test-management-claude-2026',
  ],
  'best-test-automation-frameworks-2026': ['testsigma-codeless-automation-guide'],
  'best-test-management-tools-beyond-testrail-2026': [
    'mockito-vs-easymock-vs-powermock-2026',
    'testify-vs-ginkgo-gomega-go-testing-2026',
  ],
  'bfcl-berkeley-function-calling-leaderboard-guide-2026': [
    'mcp-tool-poisoning-testing-guide-2026',
    'pyrit-ai-red-teaming-framework-guide-2026',
  ],
  'bidirectional-contract-testing-pact-2026': ['pact-broker-setup-guide-2026'],
  'bind-release-evidence-to-head-sha': [
    'k6-grafana-cloud-load-testing-tutorial-2026',
    'testing-stripe-payment-intent-3d-secure-flow',
  ],
  'bleu-rouge-bertscore-llm-metrics-reference-2026': [
    'golden-dataset-llm-testing-guide-2026',
    'owasp-llm-top-10-testing-checklist-2026',
  ],
  'blinqio-ai-test-automation-guide': ['playwright-cli-coding-agents-guide'],
  'boundary-value-analysis-equivalence-partitioning-guide': [
    'mountebank-service-virtualization-guide',
    'vitest-3-to-4-migration-guide',
  ],
  'braintrust-llm-evaluation-guide-2026': [
    'owasp-llm-top-10-testing-checklist-2026',
    'patronus-ai-evaluation-guide-2026',
  ],
  'braintrust-vs-langfuse': [
    'mockito-vs-easymock-vs-powermock-2026',
    'testify-vs-ginkgo-gomega-go-testing-2026',
  ],
  'browser-use-ai-agent-testing-guide': [
    'openai-agent-evals-complete-guide-2026',
    'testing-agent-stops-after-goal-completion',
  ],
  'browserstack-vs-saucelabs-vs-lambdatest-2026': [
    'database-seeding-per-test-vs-per-suite',
    'testify-vs-ginkgo-gomega-go-testing-2026',
  ],
  'bruno-api-testing-complete-guide': [
    'testing-json-patch-api-operations',
    'testing-offset-pagination-duplicate-records',
  ],
  'bruno-vs-postman-api-testing-2026': [
    'msw-vs-nock-for-node-api-tests',
    'zephyr-squad-vs-xray-test-management-2026',
  ],
  'build-custom-llm-benchmark-guide-2026': ['owasp-llm-top-10-testing-checklist-2026'],
  'buildkite-test-pipeline-guide-2026': ['observability-testing-log-schema-validation'],
  'burp-suite-for-qa-engineers-guide-2026': [
    'regression-testing-suite-pruning-strategy',
    'security-testing-subdomain-takeover',
  ],
  'burp-suite-vs-owasp-zap-2026': [
    'database-seeding-per-test-vs-per-suite',
    'moq-vs-nsubstitute-vs-fakeiteasy-2026',
  ],
  'canary-release-validation-testing-guide': [
    'database-testing-json-column-query-validation',
    'observability-testing-alert-rule-validation',
  ],
  'capybara-ruby-testing-guide': [
    'testing-stripe-payment-intent-3d-secure-flow',
    'testing-stripe-subscription-proration-webhooks',
  ],
  'chai-assertions-cheat-sheet-expect-should-assert': [
    'test-strategy-document-template-guide-2026',
  ],
  'changed-line-coverage-diff-hunks-gate': [
    'puppeteer-request-interception-testing-guide',
    'testing-soft-delete-query-filters',
  ],
  'chaos-engineering-resilience-testing': [
    'error-handling-testing-patterns',
    'security-testing-prototype-pollution-node',
  ],
  'chaos-mesh-kubernetes-testing-guide': ['vercel-functions-testing-guide'],
  'chaos-testing-clock-skew-injection': [
    'qa-data-quality-ai-systems-2026',
    'testing-totp-two-factor-authentication-clock-skew',
  ],
  'chaos-testing-dependency-failure-injection': ['monorepo-testing-dependency-graph-ordering'],
  'chaos-testing-network-partition-simulation': ['webdriverio-service-testing-advanced-guide'],
  'checkly-playwright-synthetic-monitoring-guide': [
    'playwright-1-58-speedboard-timeline-report-guide',
    'zerostep-playwright-natural-language',
  ],
  'chromatic-visual-testing-storybook-turbosnap-2026': ['chromatic-turbosnap-storybook-guide'],
  'chrome-devtools-mcp-performance-testing-guide': [
    'k6-extensions-xk6-complete-reference',
    'wrk-wrk2-http-benchmarking-guide',
  ],
  'chrome-for-testing-vs-chromium-playwright': [
    'playwright-ai-agents-vs-ai-native-platforms-2026',
    'playwright-har-update-mode-minimal-vs-full',
  ],
  'ci-cache-pnpm-store-github-actions': ['redis-cache-testing-guide'],
  'ci-composite-action-shared-steps': ['gemini-cli-gemini-md-configuration-guide'],
  'ci-concurrency-groups-deploy-safety': ['testcontainers-init-script-ordering'],
  'ci-detect-tests-affected-by-changed-files': [
    'exploratory-testing-session-charter-templates',
    'xk6-extensions-load-testing',
  ],
  'ci-docker-layer-cache-test-images': [
    'cypress-environments-config-best-practices',
    'redis-cache-testing-guide',
  ],
  'ci-ephemeral-preview-environment-e2e-tests': [
    'cypress-environments-config-best-practices',
    'test-environment-management-guide',
  ],
  'ci-fail-build-on-new-coverage-regression': [
    'pdf-regression-testing-guide',
    'security-testing-subdomain-takeover',
  ],
  'ci-matrix-strategy-parallel-test-jobs-guide': [
    'exploratory-testing-session-charter-templates',
    'turborepo-test-strategy-guide',
  ],
  'ci-secrets-rotation-testing-pipeline': ['ci-mask-secrets-in-test-logs'],
  'ci-test-impact-caching-strategy': [
    'test-pyramid-testing-strategy',
    'turborepo-test-strategy-guide',
  ],
  'ci-test-retries-vs-job-retries': ['moq-vs-nsubstitute-vs-fakeiteasy-2026'],
  'cicd-testing-pipeline-github-actions': [
    'chaos-mesh-kubernetes-testing-guide',
    'lighthouse-ci-accessibility-testing-guide-2026',
  ],
  'circleci-cache-playwright-browser-binaries': [
    'how-to-test-debounced-search-in-playwright',
    'stagehand-ai-browser-automation-guide-2026',
  ],
  'circleci-rerun-failed-tests-workflow': [
    'gitlab-ci-cache-pnpm-store-for-tests',
    'rspec-system-tests-capybara-guide',
  ],
  'circleci-split-playwright-tests-by-timing': [
    'how-to-test-debounced-search-in-playwright',
    'how-to-test-websocket-reconnection-in-playwright',
  ],
  'circleci-store-playwright-trace-artifacts': [
    'how-to-test-debounced-search-in-playwright',
    'how-to-test-websocket-reconnection-in-playwright',
  ],
  'circleci-test-automation-guide-2026': [
    'owasp-zap-dast-testing-guide-2026',
    'qase-test-reporting-integrations-guide-2026',
  ],
  'claude-code-custom-slash-commands-guide': ['nightwatch-page-objects-custom-commands-guide'],
  'claude-code-plugin-skills-marketplace-guide': ['progressive-disclosure-agent-skill-design'],
  'claude-code-subagents-testing-guide-2026': ['qa-skills-for-windsurf-2026'],
  'claude-code-test-automation-guide': [
    'playwright-mcp-troubleshooting-guide-2026',
    'playwright-mcp-website-audits-guide-2026',
  ],
  'claude-for-qa-engineers-complete-guide': [
    'windsurf-qa-engineers-complete-guide',
    'zed-ai-qa-engineers-guide',
  ],
  'claude-qa-agent-setup-guide': ['openai-trace-grading-tutorial-2026'],
  'claude-skill-description-frontmatter-triggering-guide': [
    'claude-skill-not-triggering-troubleshooting',
  ],
  'claude-skills-test-suite-generation': ['synthetic-eval-data-generation-guide'],
  'cleanup-orphaned-test-data-after-ci-failure': ['testing-websocket-presence-reconnection'],
  'cline-qa-engineers-complete-guide': ['llm-testing-interview-questions-for-qa'],
  'code-coverage-branch-vs-mutation-tradeoff': ['testing-in-production-shift-right-guide'],
  'code-coverage-types-line-branch-mutation-explained': [
    'mountebank-service-virtualization-guide',
    'vitest-3-to-4-migration-guide',
  ],
  'code-review-qa-testing-guide': [
    'qa-checklist-ai-launches-2026',
    'rag-qa-checklist-production-2026',
  ],
  'codex-cli-qa-engineers-guide': ['gemini-cli-qa-engineers-guide'],
  'comet-opik-llm-evaluation-guide-2026': [
    'giskard-llm-testing-guide-2026',
    'mlflow-llm-evaluation-guide-2026',
  ],
  'comparing-popular-bdd-frameworks-2026-complete-guide': [
    'karate-bdd-api-testing-complete-guide',
    'playwright-cucumber-bdd-integration-guide',
  ],
  'composite-unique-constraint-test-data-matrix': [
    'openapi-oneof-discriminator-negative-test-data',
  ],
  'contract-testing-consumer-version-matrix': [
    'step-ci-api-testing-guide-2026',
    'testing-etag-if-match-concurrency-control',
  ],
  'contract-testing-message-queue-pacts': [
    'sqs-message-processing-testing-guide',
    'testing-etag-if-match-concurrency-control',
  ],
  'contract-testing-pact-python-guide': ['mutmut-python-mutation-testing-guide'],
  'contract-testing-provider-state-management': [
    'newman-postman-ci-automation-guide-2026',
    'rabbitmq-contract-testing-guide',
  ],
  'contract-testing-schema-evolution-compat': [
    'grpc-testing-metadata-propagation',
    'rabbitmq-contract-testing-guide',
  ],
  'copilot-test-generation-review-workflow': [
    'embedding-drift-monitoring-tests-guide',
    'qa-wolf-ai-testing-guide-2026',
  ],
  'core-web-vitals-testing-guide-2026': [
    'speedcurve-synthetic-monitoring-guide-2026',
    'testing-llm-time-to-first-token-sla',
  ],
  'cosmic-ray-python-mutation-testing-guide': ['mutmut-python-mutation-testing-guide'],
  'cross-browser-testing-guide': ['visual-testing-cross-browser-baselines'],
  'cucumber-bdd-tutorial-beginners': [
    'owasp-zap-dast-testing-guide-2026',
    'qase-test-reporting-integrations-guide-2026',
  ],
  'cucumber-java-bdd-best-practices-2026': [
    'playwright-cucumber-bdd-integration-guide',
    'specflow-vs-cucumber-detailed-comparison',
  ],
  'cucumber-js-to-playwright-migration-guide': [
    'testing-embedding-model-migration-regression',
    'webdriverio-to-playwright-migration-guide',
  ],
  'cucumber-jvm-java-step-definitions-guide-2026': ['testng-dataprovider-parallel-guide-2026'],
  'cucumber-ruby-bdd-complete-guide': [
    'playwright-cucumber-bdd-integration-guide',
    'specflow-vs-cucumber-detailed-comparison',
  ],
  'cucumber-vs-playwright-2026': [
    'playwright-ai-agents-vs-ai-native-platforms-2026',
    'smoke-testing-vs-sanity-testing',
  ],
  'cursor-playwright-skill-setup-guide': [
    'how-to-test-websocket-reconnection-in-playwright',
    'playwright-test-infinite-scroll-until-last-item',
  ],
  'cypress-2026-latest-version-features': [
    'cypress-test-file-download-content',
    'testing-optimistic-locking-version-column',
  ],
  'cypress-applitools-visual-testing-guide': [
    'cypress-cy-prompt-ai-testing-guide',
    'cypress-intercept-streaming-response-limitations',
  ],
  'cypress-axe-accessibility-testing-guide': [
    'cypress-cy-prompt-ai-testing-guide',
    'cypress-intercept-streaming-response-limitations',
  ],
  'cypress-best-practices-2026-guide': [
    'cypress-shadow-dom-include-shadow-dom',
    'cypress-test-websocket-messages',
  ],
  'cypress-clock-tick-time-travel': [
    'cypress-cy-prompt-ai-testing-guide',
    'testing-totp-two-factor-authentication-clock-skew',
  ],
  'cypress-cucumber-bdd-preprocessor-guide': [
    'cypress-intercept-streaming-response-limitations',
    'cypress-mochawesome-allure-reporter-guide',
  ],
  'cypress-custom-command-typescript-types': ['cypress-mochawesome-allure-reporter-guide'],
  'cypress-drag-drop-html5-data-transfer': ['playwright-html5-drag-and-drop-data-transfer'],
  'cypress-element-detached-from-dom-fix': ['security-testing-prototype-pollution-node'],
  'cypress-fixtures-data-management-guide': ['practitest-test-management-guide-2026'],
  'cypress-image-snapshot-visual-guide': ['snapshot-testing-governance-guide'],
  'cypress-multi-domain-session-guide': [
    'multi-tenant-saas-testing-guide',
    'testcontainers-network-aliases-guide',
  ],
  'cypress-network-stubbing-fixtures-guide': ['testcontainers-network-aliases-guide'],
  'cypress-origin-cross-domain-authentication': ['testcafe-role-based-authentication-guide'],
  'cypress-retry-ability-custom-commands': ['gitlab-ci-retry-only-runner-system-failures'],
  'cypress-session-cache-across-specs': ['playwright-merge-blob-reports-across-operating-systems'],
  'cypress-timed-out-retrying-after-4000ms-fix': ['testing-websocket-presence-reconnection'],
  'cypress-to-playwright-migration-complete-guide': [
    'testing-embedding-model-migration-regression',
    'webdriverio-to-playwright-migration-guide',
  ],
  'cypress-viewport-responsive-assertions': [
    'testcafe-smart-assertions-waits-guide',
    'testing-cookie-consent-regional-behavior',
  ],
  'cypress-vs-playwright-2026': [
    'playwright-locator-or-vs-filter-for-fallback-elements',
    'playwright-route-fallback-vs-continue',
  ],
  'cypress-vs-playwright-ci-cost-2026': [
    'octomind-playwright-ai-testing',
    'playwright-locator-or-vs-filter-for-fallback-elements',
  ],
  'cypress-vs-selenium-vs-playwright-performance': [
    'pytest-benchmark-performance-testing-guide',
    'selenium-4-relative-locators-guide-2026',
  ],
  'data-driven-testing-complete-guide': ['incident-driven-test-creation-guide'],
  'database-migration-rolling-deploy-compatibility-gate': ['postgres-migration-testing-guide'],
  'database-testing-cascade-delete-behavior': ['testing-cookie-consent-regional-behavior'],
  'database-testing-index-regression-detection': [
    'pdf-regression-testing-guide',
    'security-testing-subdomain-takeover',
  ],
  'database-testing-migration-rollback-safety': ['postgres-migration-testing-guide'],
  'database-testing-sequence-gap-handling': ['security-testing-session-fixation'],
  'dbt-tests-data-quality-guide-2026': ['great-expectations-data-quality-testing-guide'],
  'decision-table-testing-guide-examples': [
    'mountebank-service-virtualization-guide',
    'vitest-3-to-4-migration-guide',
  ],
  'deepchecks-llm-testing-guide-2026': [
    'approval-testing-golden-master-guide',
    'weave-llm-evaluation-tracing-guide-2026',
  ],
  'deepeval-3-to-4-migration-guide-2026': [
    'deepeval-tool-correctness-testing-guide-2026',
    'postgres-migration-testing-guide',
  ],
  'deepeval-agent-metrics-tutorial-2026': ['openai-trace-grading-tutorial-2026'],
  'deepeval-conversational-multiturn-metrics-guide': ['langfuse-trace-quality-testing-guide'],
  'deepeval-llm-testing-guide': [
    'openai-trace-grading-tutorial-2026',
    'pytest-raises-match-regex-exception-message',
  ],
  'deepeval-rag-metrics-guide-2026': ['rag-integration-testing-guide-2026'],
  'deepeval-skill-codex-claude-cursor-install-2026': ['jest-test-rejected-promise-error-code'],
  'deepeval-task-completion-metric-agent': ['trace-based-testing-opentelemetry-2026'],
  'deepeval-tool-correctness-metric-example': ['promptfoo-custom-javascript-assertion-example'],
  'deepeval-vs-ragas-rag-evaluation-2026': ['robot-framework-libraries-comparison-2026'],
  'deleted-tests-weakened-assertions-release-risk': ['testcafe-smart-assertions-waits-guide'],
  'devops-testing-strategy-guide': [
    'continuous-testing-devops-guide',
    'turborepo-test-strategy-guide',
  ],
  'dotnet-testing-xunit-nunit-guide': [
    'moq-tutorial-dotnet-mocking-guide-2026',
    'xunit-vs-nunit-vs-mstest-2026',
  ],
  'dredd-api-blueprint-testing-guide': [
    'bruno-api-testing-complete-guide',
    'step-ci-api-testing-guide-2026',
  ],
  'enzyme-to-react-testing-library-migration-guide': [
    'selenium-grid-3-to-4-migration-guide',
    'test-management-migration-plan-guide-2026',
  ],
  'eval-dataset-versioning-guide-2026': ['weights-biases-llm-evals-guide'],
  'event-driven-architecture-testing-guide': ['event-sourcing-cqrs-testing-guide'],
  'exploratory-testing-ai-agents-guide': ['exploratory-testing-heuristics-cheatsheet'],
  'exploratory-testing-bug-triage-workflow': [
    'bug-bash-facilitation-guide',
    'exploratory-testing-heuristics-cheatsheet',
  ],
  'factory-bot-rails-test-data-guide-2026': [
    'pairwise-combinatorial-testing-guide-2026',
    'pest-php-testing-tutorial-2026',
  ],
  'factory-boy-test-data-guide-2026': [
    'owasp-zap-dast-testing-guide-2026',
    'qase-test-reporting-integrations-guide-2026',
  ],
  'faker-test-data-generation-guide-2026': [
    'pairwise-combinatorial-testing-guide-2026',
    'pest-php-testing-tutorial-2026',
  ],
  'faker-test-data-strategies-guide-2026': ['testing-legacy-code-refactoring-guide'],
  'fast-check-property-based-testing-typescript-guide': [
    'testcafe-role-based-authentication-guide',
    'webdriverio-page-objects-typescript-guide',
  ],
  'feature-flag-testing-combinatorial-coverage': ['qa-checklist-ai-launches-2026'],
  'feature-flag-testing-rollback-safety': ['vitest-concurrent-tests-race-safety'],
  'feature-flag-testing-strategies-guide-2026': [
    'pairwise-combinatorial-testing-guide-2026',
    'pest-php-testing-tutorial-2026',
  ],
  'finalrun-ai-mobile-testing-guide': ['perfecto-self-healing-testing'],
  'fintech-qa-compliance-testing-guide': ['healthcare-qa-compliance-testing-guide'],
  'fix-flaky-tests-guide': ['vitest-concurrent-tests-race-safety'],
  'flaky-test-quarantine-test-impact-analysis-guide-2026': [
    'state-transition-testing-guide-examples',
    'test-smells-anti-patterns-guide-2026',
  ],
  'foreign-key-graph-relational-test-data-builder': ['testcontainers-redis-key-expiration-testing'],
  'function-calling-regression-suite-guide': ['helicone-cost-regression-testing-guide'],
  'gaia-benchmark-ai-agents-explained-2026': ['patronus-ai-evaluation-guide-2026'],
  'galileo-ai-llm-evaluation-guide-2026': [
    'conversation-evaluation-guide-2026',
    'weave-llm-evaluation-tracing-guide-2026',
  ],
  'gatling-feeder-data-strategies': [
    'speedcurve-synthetic-monitoring-guide-2026',
    'testing-llm-time-to-first-token-sla',
  ],
  'gatling-scala-load-testing-complete-guide': [
    'speedcurve-synthetic-monitoring-guide-2026',
    'testing-llm-time-to-first-token-sla',
  ],
  'gatling-scenario-injection-profiles': [
    'k6-browser-recorder-test-builder-guide',
    'k6-custom-metrics-trend-counter',
  ],
  'gauge-testing-complete-guide': [
    'serenity-bdd-testing-guide',
    'testcafe-role-based-authentication-guide',
  ],
  'git-diff-behavior-risk-blast-radius-map': ['testing-cookie-consent-regional-behavior'],
  'github-actions-cache-playwright-browsers': [
    'playwright-canvas-pixel-assertion-testing',
    'playwright-test-infinite-scroll-until-last-item',
  ],
  'github-actions-comment-test-summary-on-pull-request': [
    'lighthouse-ci-accessibility-testing-guide-2026',
    'puppeteer-request-interception-testing-guide',
  ],
  'github-actions-merge-playwright-reports-artifact-v4': [
    'playwright-canvas-pixel-assertion-testing',
    'playwright-test-infinite-scroll-until-last-item',
  ],
  'github-actions-shard-playwright-by-test-duration': [
    'playwright-canvas-pixel-assertion-testing',
    'playwright-codegen-tutorial-2026',
  ],
  'gitlab-ci-junit-report-flaky-tests': ['gitlab-ci-cache-pnpm-store-for-tests'],
  'gitlab-ci-merge-playwright-blob-reports': [
    'playwright-codegen-tutorial-2026',
    'pytest-playwright-plugin-complete-guide',
  ],
  'gitlab-ci-parallel-matrix-playwright-shards': [
    'playwright-clipboard-read-write-permissions',
    'playwright-codegen-tutorial-2026',
  ],
  'gitlab-ci-quality-gates-guide-2026': ['nuclei-security-testing-ci-guide-2026'],
  'golden-dataset-llm-evaluation-guide': [
    'approval-testing-golden-master-guide',
    'conversation-evaluation-guide-2026',
  ],
  'google-adk-agent-testing-guide': [
    'openai-agent-evals-complete-guide-2026',
    'testing-agent-infinite-loop-detection',
  ],
  'graphql-contract-testing-guide': [
    'testing-graphql-persisted-queries',
    'testing-graphql-subscription-reconnect',
  ],
  'graphql-federation-contract-testing-guide': [
    'testing-graphql-persisted-queries',
    'testing-graphql-subscription-reconnect',
  ],
  'graphql-subscriptions-testing-guide': [
    'testing-graphql-persisted-queries',
    'testing-graphql-subscription-reconnect',
  ],
  'graphql-testing-complete-guide': ['testing-timezone-sensitive-database-queries'],
  'graphql-testing-directive-skip-include': ['testing-graphql-partial-data-errors'],
  'gremlin-chaos-engineering-tutorial-2026': [
    'k6-custom-metrics-trend-counter',
    'toxiproxy-fault-injection-testing-guide-2026',
  ],
  'grpc-api-testing-complete-guide-2026': [
    'bruno-api-testing-complete-guide',
    'step-ci-api-testing-guide-2026',
  ],
  'grpc-bidirectional-stream-cancellation-testing': ['nats-event-stream-testing-guide'],
  'grpc-testing-streaming-deadline-guide': ['scalar-openapi-testing-workflow-guide-2026'],
  'grpcurl-api-testing-guide-2026': [
    'testing-api-eventual-consistency-polling',
    'testing-json-patch-api-operations',
  ],
  'hallucination-detection-pipeline-guide': ['testing-agent-infinite-loop-detection'],
  'healenium-selenium-self-healing-guide': [
    'selenium-4-relative-locators-guide-2026',
    'selenium-tutorial-complete-beginners-2026',
  ],
  'hoppscotch-api-testing-complete-guide': [
    'testing-cursor-pagination-api-boundaries',
    'tusk-drift-traffic-replay-testing',
  ],
  'hoppscotch-vs-postman-2026': ['msw-vs-nock-for-node-api-tests'],
  'how-ai-agents-changing-qa-testing': ['ai-agents-qa-revolution'],
  'how-to-test-and-evolve-agent-skills': ['puppeteer-pdf-regression-testing-guide'],
  'how-to-test-debounced-search-in-playwright': [
    'playwright-clipboard-read-write-permissions',
    'playwright-wait-for-response-with-dynamic-url',
  ],
  'how-to-test-websocket-reconnection-in-playwright': [
    'playwright-bypass-csp-testing-third-party-widgets',
    'playwright-wait-for-response-with-dynamic-url',
  ],
  'insomnia-api-testing-complete-guide': ['testing-slack-event-api-retries'],
  'jacoco-code-coverage-java-guide-2026': ['testng-dataprovider-parallel-guide-2026'],
  'jasmine-to-jest-migration-guide': ['test-management-migration-plan-guide-2026'],
  'javascript-testing-frameworks-complete-guide-2026': [
    'chai-as-promised-testing-promises-guide',
    'vitest-vi-hoisted-complete-guide',
  ],
  'jest-cannot-log-after-tests-are-done-fix': ['testing-websocket-presence-reconnection'],
  'jest-coverage-ignore-generated-files': [
    'jest-to-have-been-called-with-partial-object',
    'supertest-node-api-testing-guide',
  ],
  'jest-custom-matchers-guide': ['supertest-node-api-testing-guide'],
  'jest-mock-fetch-abort-controller': ['pytest-mock-async-context-manager'],
  'jest-mock-vs-mockimplementation-guide': ['localstack-bedrock-mock-testing-guide'],
  'jest-module-isolation-resetmodules-guide': ['terraform-module-testing-guide'],
  'jest-module-name-mapper-path-alias-fix': ['terraform-module-testing-guide'],
  'jest-snapshot-obsolete-cleanup-ci': ['snapshot-testing-governance-guide'],
  'jest-spy-on-getter-property': ['vitest-spy-on-class-constructor-method'],
  'jest-vs-vitest-2026': ['vitest-vs-jest-2026'],
  'jest-worker-encountered-four-child-process-exceptions-fix': ['jest-worker-memory-leak-heap-fix'],
  'jira-for-qa-engineers-guide': [
    'bug-bash-facilitation-guide',
    'practitest-test-management-guide-2026',
  ],
  'jmeter-5-6-3-response-assertion-jmx-xml-reference': ['jmeter-response-assertion-jmx-guide'],
  'jmeter-distributed-load-testing-complete-guide': [
    'load-vs-stress-vs-soak-vs-spike-testing-2026',
    'toxiproxy-fault-injection-testing-guide-2026',
  ],
  'jmeter-distributed-load-testing-guide': [
    'jmeter-correlation-dynamic-tokens',
    'load-vs-stress-vs-soak-vs-spike-testing-2026',
  ],
  'jmeter-vs-locust-vs-gatling-comparison': ['jmeter-correlation-dynamic-tokens'],
  'junit4-to-junit5-migration-guide': ['selenide-junit5-spring-boot-integration'],
  'junit5-parameterized-tests-guide-2026': [
    'selenide-junit5-spring-boot-integration',
    'testng-dataprovider-parallel-guide-2026',
  ],
  'k6-browser-module-testing-guide': [
    'pytest-benchmark-performance-testing-guide',
    'terraform-module-testing-guide',
  ],
  'k6-browser-module-web-vitals-capture': ['k6-browser-recorder-test-builder-guide'],
  'k6-execution-segments-distributed': ['load-vs-stress-vs-soak-vs-spike-testing-2026'],
  'k6-grafana-cloud-load-testing-tutorial-2026': ['k6-load-testing-guide-2026'],
  'k6-thresholds-per-endpoint-guide': [
    'performance-testing-database-query-plan-regression',
    'puppeteer-performance-tracing-guide',
  ],
  'katalon-state-of-quality-report-2026': [
    'state-of-js-2025-testing-frameworks-results',
    'world-quality-report-2026-qa',
  ],
  'katalon-studio-test-automation-complete-guide': ['katalon-ai-testing-guide'],
  'keyword-driven-testing-python-guide': ['selenium-tutorial-complete-beginners-2026'],
  'kif-ios-testing-guide-2026': ['semgrep-for-qa-engineers-guide-2026'],
  'langfuse-llm-observability-guide-2026': ['langfuse-self-hosting-tracing-guide-2026'],
  'laravel-testing-dusk-guide': ['phpunit-testing-complete-guide'],
  'lighthouse-ci-budgets-assertions-guide': [
    'performance-testing-database-query-plan-regression',
    'puppeteer-performance-tracing-guide',
  ],
  'lighthouse-ci-performance-budget-gates-guide-2026': [
    'performance-testing-database-query-plan-regression',
    'puppeteer-performance-tracing-guide',
  ],
  'lighthouse-ci-performance-budgets-guide-2026': [
    'neoload-tricentis-performance-testing-guide',
    'performance-testing-websocket-concurrency-limits',
  ],
  'llm-as-a-judge-evaluation-guide': ['mlflow-llm-evaluation-guide-2026'],
  'llm-eval-cost-budget-ci-gate': ['llm-cost-budget-ci-guide'],
  'llm-eval-harness-production-guide-2026': [
    'promptfoo-cli-tutorial-2026',
    'testing-read-replica-lag-behavior',
  ],
  'llm-eval-judge-model-drift-detection': ['hallucination-detection-pipeline-guide'],
  'llm-eval-prompt-injection-canary-tokens': [
    'domain-specific-ai-red-team-playbook-guide',
    'hallucination-detection-pipeline-guide',
  ],
  'llm-eval-sample-size-confidence-intervals': [
    'rebuff-prompt-injection-testing-guide',
    'testing-prompt-version-rollback-safety',
  ],
  'llm-evals-comparison-openai-promptfoo-ragas': [
    'openai-evals-best-practices-2026',
    'promptfoo-vs-openai-evals-comparison-2026',
  ],
  'llm-evaluation-ci-cd-quality-gates': ['patronus-ai-llm-evaluation-guide'],
  'llm-guardrails-testing-guide-2026': ['promptfoo-guardrails-testing-guide-2026'],
  'llm-non-determinism-flaky-eval-guide-2026': ['inspect-ai-evals-tutorial-2026'],
  'llm-output-evaluation-metrics-explained-2026': ['langsmith-evaluation-guide-2026'],
  'llm-regression-testing-guide-2026': ['pdf-regression-testing-guide'],
  'llm-testing-function-calling-schema-drift': ['testing-llm-function-call-argument-validation'],
  'llm-testing-refusal-rate-calibration': ['testing-guardrail-false-positive-rate'],
  'llm-testing-streaming-partial-json': ['testing-llm-streaming-chunk-order'],
  'llm-unit-testing-tutorial-2026': ['promptfoo-cli-tutorial-2026'],
  'load-testing-beginners-guide': [
    'pytest-benchmark-performance-testing-guide',
    'testing-database-connection-pool-exhaustion',
  ],
  'load-testing-ci-cd-integration-guide': [
    'neoload-tricentis-performance-testing-guide',
    'performance-testing-websocket-concurrency-limits',
  ],
  'localstack-sns-to-sqs-filter-policy-testing': ['localstack-sqs-visibility-timeout-testing'],
  'locust-custom-load-shapes-guide': ['k6-custom-metrics-trend-counter'],
  'locust-load-testing-python-guide': ['k6-grafana-cloud-load-testing-tutorial-2026'],
  'long-term-agent-memory-evaluation-guide': ['testing-agent-memory-cross-user-leakage'],
  'lost-pixel-visual-regression-testing-guide-2026': ['puppeteer-pdf-regression-testing-guide'],
  'maestro-mobile-ui-testing-guide': ['testing-otp-sms-phone-flows-complete-guide'],
  'mcp-server-testing-error-propagation': ['mcp-testing-resource-subscription-updates'],
  'mcp-server-testing-tool-schema-validation': ['mcp-testing-resource-subscription-updates'],
  'mcp-testing-prompt-template-arguments': [
    'mcp-testing-resource-subscription-updates',
    'promptfoo-variable-matrix-prompt-versions',
  ],
  'meticulous-ai-visual-testing-guide': ['testing-rtl-layout-visual-regression'],
  'microservices-testing-strategies': ['testing-in-production-shift-right-guide'],
  'migrate-selenium-to-playwright-checklist-2026': ['selenium-4-relative-locators-guide-2026'],
  'mobile-testing-app-permissions-flows': ['testing-otp-sms-phone-flows-complete-guide'],
  'mobile-testing-deep-link-validation': [
    'testing-passwordless-email-magic-link-flow',
    'testing-push-notification-deep-links',
  ],
  'mobile-testing-orientation-change-state': ['mobile-testing-background-foreground-lifecycle'],
  'mobile-testing-push-notification-flows': [
    'testing-passwordless-email-magic-link-flow',
    'testing-push-notification-deep-links',
  ],
  'mockoon-api-mocking-tool-guide': ['wiremock-api-mocking-complete-guide'],
  'monorepo-testing-shared-fixture-strategy': ['pytest-autouse-fixture-ordering-gotchas'],
  'moq-tutorial-dotnet-mocking-guide-2026': ['xunit-vs-nunit-vs-mstest-2026'],
  'mountebank-service-virtualization-guide': [
    'state-transition-testing-guide-examples',
    'test-smells-anti-patterns-guide-2026',
  ],
  'msw-api-mocking-complete-guide': [
    'vitest-mocking-vi-mock-vi-fn-vi-spyon',
    'webdriverio-service-testing-advanced-guide',
  ],
  'natural-language-test-automation-2026': ['zerostep-playwright-natural-language'],
  'neoload-tricentis-performance-testing-guide': ['performance-testing-memory-baseline-drift'],
  'nightwatch-to-playwright-migration-guide': ['webdriverio-to-playwright-migration-guide'],
  'observability-testing-log-schema-validation': ['observability-testing-alert-rule-validation'],
  'openai-agent-evals-datasets-workflow-guide-2026': ['openai-evals-best-practices-2026'],
  'openai-docs-mcp-qa-guide-2026': ['openai-mcp-support-guide-2026'],
  'openai-evals-design-best-practices': ['openai-evals-best-practices-2026'],
  'openai-promptfoo-acquisition-explained-2026': [
    'promptfoo-custom-javascript-assertion-example',
    'testing-rag-citation-source-alignment',
  ],
  'openapi-contract-testing-guide': ['regression-testing-suite-pruning-strategy'],
  'openapi-spec-to-test-suite-generation': ['scalar-openapi-testing-workflow-guide-2026'],
  'pact-consumer-driven-contract-reference-2026': ['openapi-nullable-vs-optional-contract-tests'],
  'pact-contract-testing-complete-guide-2026': ['pact-provider-state-data-cleanup'],
  'pactflow-contract-testing-broker-guide': ['pactflow-can-i-deploy-ci-guide'],
  'page-object-model-complete-guide': ['qa-guild-operating-model-guide'],
  'pairwise-combinatorial-testing-guide-2026': [
    'rust-proptest-property-testing-guide-2026',
    'test-smells-anti-patterns-guide-2026',
  ],
  'partial-unique-index-negative-tests-soft-delete': ['testing-soft-delete-query-filters'],
  'performance-test-percentiles-p95-p99-guide': [
    'performance-testing-memory-baseline-drift',
    'performance-testing-websocket-concurrency-limits',
  ],
  'pest-php-testing-tutorial-2026': [
    'rust-proptest-property-testing-guide-2026',
    'shift-right-testing-observability-guide-2026',
  ],
  'phoenix-rag-tracing-evaluation-guide': [
    'rag-testing-index-freshness-staleness',
    'testing-rag-deleted-document-tombstones',
  ],
  'playwright-1-59-screencast-api-guide-2026': [
    'playwright-codegen-recording-complete-guide',
    'playwright-learning-path-for-api-testers',
  ],
  'playwright-1-60-release-features': [
    'playwright-keyboard-mouse-interactions-reference',
    'playwright-multiple-tabs-windows-guide',
  ],
  'playwright-1-60-release-guide-2026': [
    'playwright-locator-filter-visible-reference',
    'playwright-multiple-tabs-windows-guide',
  ],
  'playwright-1-61-web-storage-api-guide-2026': [
    'playwright-bypass-csp-testing-third-party-widgets',
    'testing-optimistic-locking-version-column',
  ],
  'playwright-1-61-webauthn-passkeys-guide-2026': [
    'playwright-download-saveas-random-filename',
    'playwright-nested-iframe-locator-recipe',
  ],
  'playwright-allure-attachment-trace-guide': [
    'playwright-test-step-box-timeout-example',
    'playwright-vs-puppeteer-bundle-size-2026',
  ],
  'playwright-api-testing-context-request-guide': ['playwright-learning-path-for-api-testers'],
  'playwright-api-testing-tutorial-2026': [
    'playwright-nested-iframe-locator-recipe',
    'playwright-webauthn-virtual-authenticator-testing',
  ],
  'playwright-apirequestcontext-storage-state-guide': [
    'playwright-vs-puppeteer-bundle-size-2026',
    'state-of-js-2025-testing-frameworks-results',
  ],
  'playwright-apirequestcontext-storagestate-guide': [
    'playwright-framelocator-cross-origin-iframe-guide',
  ],
  'playwright-aria-snapshot-testing-guide': ['snapshot-testing-governance-guide'],
  'playwright-aria-snapshots-accessibility-tree-guide': [
    'playwright-aria-snapshots-tomatcharia-guide-2026',
  ],
  'playwright-assert-css-computed-style': ['playwright-emulate-media-print-styles'],
  'playwright-assert-sorted-table-column': ['testing-optimistic-locking-version-column'],
  'playwright-auto-healing-locators': ['octomind-ai-testing-guide-2026'],
  'playwright-browser-context-guide-2026': ['playwright-parallel-testing-best-practices-2026'],
  'playwright-browser-context-permissions-geolocation': [
    'playwright-test-info-retry-aware-logging',
  ],
  'playwright-clock-fast-forward-polling-ui': [
    'playwright-emulate-media-print-styles',
    'testcafe-smart-assertions-waits-guide',
  ],
  'playwright-codegen-cli-flags-reference': ['playwright-codegen-smart-detection-2026'],
  'playwright-component-testing-vue-guide': ['security-testing-rate-limit-bypass'],
  'playwright-custom-fixture-composition-guide': ['playwright-test-shard-balancing-uneven-suites'],
  'playwright-cypress-selenium-comparison-2026': ['selenide-vs-selenium-2026'],
  'playwright-debug-mode-inspector-2026': ['playwright-test-step-box-timeout-example'],
  'playwright-expect-configure-custom-timeout': ['capybara-waiting-synchronization-guide'],
  'playwright-file-upload-setinputfiles': ['playwright-setinputfiles-file-upload-reference'],
  'playwright-file-upload-setinputfiles-guide': ['playwright-setinputfiles-file-upload-reference'],
  'playwright-file-upload-testing-guide-2026': ['security-testing-file-upload-polyglot'],
  'playwright-forbidonly-ci-error-fix': ['pytest-import-file-mismatch-error-fix'],
  'playwright-geolocation-change-during-test': ['testing-read-replica-lag-behavior'],
  'playwright-global-setup-teardown-patterns': ['webdriverio-mobile-gestures-actions'],
  'playwright-graphql-operation-name-network-mock': [
    'pytest-mock-async-context-manager',
    'toxiproxy-network-failure-testing-guide',
  ],
  'playwright-iframe-shadow-dom-guide': ['selenium-shadow-dom-piercing'],
  'playwright-intercept-graphql-batch-requests': ['testing-http-range-requests-file-download'],
  'playwright-locator-best-practices-web-first-assertions-2026': [
    'playwright-locator-filter-visible-reference',
  ],
  'playwright-locator-or-vs-filter-for-fallback-elements': [
    'playwright-route-fallback-vs-continue',
  ],
  'playwright-locator-scroll-into-view-lazy-lists': [
    'testing-infinite-scroll-screen-reader-announcements',
  ],
  'playwright-mcp-accessibility-tree-guide-2026': [
    'playwright-mcp-website-audits-guide-2026',
    'wave-accessibility-testing-guide-2026',
  ],
  'playwright-mcp-browser-automation-guide': [
    'playwright-mcp-troubleshooting-guide-2026',
    'playwright-mcp-website-audits-guide-2026',
  ],
  'playwright-mcp-browser-extension-guide-2026': [
    'playwright-chrome-extension-testing-manifest-v3-2026',
    'playwright-mcp-troubleshooting-guide-2026',
  ],
  'playwright-mcp-cursor-ide-setup-2026': ['playwright-mock-server-sent-events-stream'],
  'playwright-mcp-github-copilot-tutorial-2026': [
    'playwright-ai-test-generation-copilot-guide-2026',
  ],
  'playwright-mcp-profile-modes-guide-2026': [
    'playwright-chrome-extension-testing-manifest-v3-2026',
  ],
  'playwright-network-har-replay-testing': ['testcontainers-network-aliases-guide'],
  'playwright-offline-mode-cache-testing': ['testing-read-replica-lag-behavior'],
  'playwright-parallel-sharding-execution-guide': [
    'robot-framework-pabot-parallel-execution-guide',
  ],
  'playwright-projects-multi-browser-guide-2026': ['playwright-test-project-dependencies-setup'],
  'playwright-python-handle-file-downloads': ['playwright-download-saveas-random-filename'],
  'playwright-python-upload-files-guide': ['playwright-upload-multiple-files-memory-buffer'],
  'playwright-request-context-dispose-leaks': ['webdriverio-mobile-gestures-actions'],
  'playwright-retry-only-specific-error-types': [
    'gitlab-ci-retry-only-runner-system-failures',
    'playwright-test-info-retry-aware-logging',
  ],
  'playwright-screenshots-pdf-guide-2026': ['playwright-screenshot-animation-caret-disable'],
  'playwright-screenshots-videos-traces-complete-guide': [
    'playwright-screenshot-animation-caret-disable',
  ],
  'playwright-storage-state-multiple-roles-setup': [
    'playwright-refresh-expired-storage-state-token',
  ],
  'playwright-test-fail-annotation-expected-failures': ['webdriverio-mobile-gestures-actions'],
  'playwright-test-reporters-html-allure-junit-guide': [
    'playwright-1-58-speedboard-timeline-report-guide',
  ],
  'playwright-test-timeout-exceeded-after-hook-fix': ['mocha-hooks-before-after-beforeeach-guide'],
  'playwright-to-pass-retry-block-assertions': ['testing-database-deadlock-retry-logic'],
  'playwright-trace-attach-allure-export-guide': ['selenium-jenkins-pipeline-complete-guide'],
  'playwright-trace-merge-sharded-reports-guide': ['playwright-blob-reporter-guide'],
  'playwright-tracing-group-custom-steps': ['webdriverio-service-custom-plugin'],
  'playwright-video-recording-guide-2026': [
    'playwright-codegen-recording-complete-guide',
    'playwright-webkit-specific-failures-debugging',
  ],
  'playwright-visual-compare-single-element-mask': ['storybook-component-testing-guide'],
  'playwright-visual-comparison-snapshots-guide': ['visual-testing-cross-browser-baselines'],
  'playwright-visual-regression-testing-guide': ['testing-rtl-layout-visual-regression'],
  'playwright-vs-cypress-2026-detailed-comparison': ['testim-vs-mabl-vs-functionize-comparison'],
  'playwright-vs-pytest-api-testing': [
    'msw-vs-nock-for-node-api-tests',
    'pytest-capsys-vs-capfd-subprocess-output',
  ],
  'playwright-vs-selenium-2026-which-better': ['selenide-vs-selenium-2026'],
  'playwright-vs-selenium-python-2026': ['selenide-vs-selenium-2026'],
  'postman-vs-playwright': ['postman-vs-playwright-2026'],
  'postman-vs-playwright-api-testing': ['postman-vs-playwright-2026'],
  'postman-vs-playwright-api-testing-2026': [
    'playwright-har-update-mode-minimal-vs-full',
    'postman-vs-playwright-2026',
  ],
  'prompt-injection-testing-guide-2026': [
    'prompt-engineering-qa-automation-guide-2026',
    'rag-prompt-injection-testing-checklist-2026',
  ],
  'prompt-regression-golden-set-diff-threshold': [
    'prompt-testing-system-prompt-regression',
    'testing-rag-answer-relevance-thresholds',
  ],
  'prompt-regression-testing-guide-2026': [
    'testing-guardrail-false-negative-jailbreaks',
    'testing-prompt-version-rollback-safety',
  ],
  'prompt-testing-few-shot-example-drift': ['hallucination-detection-pipeline-guide'],
  'promptfoo-complete-guide-2026': ['promptfoo-source-attribution-testing-guide-2026'],
  'promptfoo-json-schema-structured-output-tests': ['testing-structured-output-repair-fallback'],
  'promptfoo-mcp-provider-security-testing-2026': [
    'nuclei-security-testing-ci-guide-2026',
    'rag-red-teaming-tutorial-2026',
  ],
  'promptfoo-rag-poisoning-testing-guide-2026': ['rag-poisoning-testing-guide-2026'],
  'promptfoo-source-attribution-testing-guide-2026': ['rag-source-attribution-testing-guide-2026'],
  'promptfoo-vs-deepeval-2026': ['promptfoo-vs-openai-evals-comparison-2026'],
  'pytest-approx-nested-dictionary-floats': [
    'pytest-monkeypatch-environment-variable-restoration',
    'pytest-raises-match-regex-exception-message',
  ],
  'pytest-asyncio-event-loop-is-closed-fix': ['event-sourcing-cqrs-testing-guide'],
  'pytest-bdd-gherkin-tutorial-2026': [
    'pytest-monkeypatch-environment-variable-restoration',
    'pytest-raises-match-regex-exception-message',
  ],
  'pytest-fixture-not-found-conftest-fix': [
    'pytest-autouse-fixture-ordering-gotchas',
    'vitest-no-test-suite-found-fix',
  ],
  'pytest-official-reference-cheatsheet-2026': ['world-quality-report-2026-qa'],
  'pytest-playwright-python-e2e-tutorial': ['pytest-playwright-plugin-complete-guide'],
  'pytest-yield-fixture-cleanup-on-failure': ['toxiproxy-network-failure-testing-guide'],
  'python-playwright-install-fix-browser-errors': ['vitest-unhandled-errors-detected-fix'],
  'python-skills-for-sdet-automation-roles': ['qa-skills-for-windsurf-2026'],
  'pyunit-vs-pytest': ['pytest-capsys-vs-capfd-subprocess-output'],
  'qa-engineer-skills-career-guide-2026': ['qa-engineer-to-ai-testing-engineer-roadmap'],
  'qa-metrics-escaped-defect-analysis': ['qa-metrics-lead-time-defect-correlation'],
  'qa-metrics-test-effectiveness-scoring': ['qa-metrics-flake-rate-trending'],
  'qa-skills-for-cline-2026': ['qa-skills-for-cursor-2026'],
  'qaskills-mcp-server-guide': ['introducing-qaskills'],
  'quality-engineering-operating-model-guide-2026': [
    'qa-guild-operating-model-guide',
    'qa-metrics-escaped-defect-analysis',
  ],
  'rag-answer-relevance-testing-guide-2026': ['retrieval-relevance-testing-guide-2026'],
  'rag-chunk-size-regression-testing-guide': [
    'rag-testing-index-freshness-staleness',
    'testing-rag-deleted-document-tombstones',
  ],
  'rag-chunking-qa-guide-2026': ['retrieval-relevance-testing-guide-2026'],
  'rag-evaluation-interview-questions': [
    'rag-testing-index-freshness-staleness',
    'testing-rag-deleted-document-tombstones',
  ],
  'rag-evaluation-metrics-complete-2026': ['retrieval-relevance-testing-guide-2026'],
  'rag-high-relevance-low-faithfulness-diagnosis-2026': [
    'ragas-faithfulness-answer-relevancy-guide',
  ],
  'rag-synthetic-testset-generation-ragas-guide-2026': ['rag-red-teaming-tutorial-2026'],
  'rag-testing-chunk-size-ablation': ['testing-rag-answer-relevance-thresholds'],
  'rag-testing-citation-accuracy-scoring': ['testing-rag-citation-source-alignment'],
  'rag-testing-hybrid-retrieval-tuning': ['testing-rag-hybrid-search-weighting'],
  'rag-testing-negative-context-poisoning': [
    'rebuff-prompt-injection-testing-guide',
    'testing-guardrail-false-negative-jailbreaks',
  ],
  'ragas-context-precision-recall-faithfulness-guide': ['testing-vector-search-recall-at-k'],
  'regression-testing-golden-file-management': ['testmo-test-management-guide-2026'],
  'reviewing-ai-generated-tests-checklist-2026': [
    'rust-mockall-mocking-guide-2026',
    'shift-right-testing-observability-guide-2026',
  ],
  'robot-framework-api-testing-requests-library': ['testing-http-range-requests-file-download'],
  'robot-framework-appium-mobile-testing-guide': ['robot-framework-pabot-parallel-execution-guide'],
  'robot-framework-pytest-integration-guide': ['microfrontend-integration-testing-guide'],
  'robot-framework-seleniumlibrary-link-locator-keyword-driven-2026': [
    'testing-passwordless-email-magic-link-flow',
  ],
  'robot-framework-tags-tagging-best-practices': ['cucumber-tags-hooks-complete-reference'],
  'robot-framework-testing-guide': ['robot-framework-keyword-driven-testing-guide'],
  'robot-framework-vs-playwright-2026': ['robot-framework-libraries-comparison-2026'],
  'robot-framework-wait-until-keyword-succeeds-builtin-2026': [
    'robot-framework-wait-until-keyword-succeeds-guide',
    'selenide-wait-strategies-explicit-implicit',
  ],
  'sast-triage-false-positive-workflow': ['visual-testing-animation-freeze-strategies'],
  'security-testing-graphql-introspection-exposure': ['security-testing-cors-misconfiguration'],
  'security-testing-mass-assignment-api': ['security-testing-idor-enumeration-guide'],
  'security-testing-open-redirect-patterns': ['security-testing-ssrf-payload-patterns'],
  'selenide-allureselenide-includeselenidesteps-reference': [
    'selenide-wait-strategies-explicit-implicit',
  ],
  'selenide-collection-shouldhave-reference': ['selenide-wait-strategies-explicit-implicit'],
  'selenide-shadow-dom-elements-guide': ['selenium-shadow-dom-piercing'],
  'selenium-azure-devops-pipeline-guide': ['selenium-jenkins-pipeline-complete-guide'],
  'selenium-grid-docker-parallel-testing': ['selenium-webdriver-updates-2026-changelog'],
  'selenium-grid-docker-scaling-guide': ['testcontainers-selenium-grid-guide'],
  'selenium-grid-tutorial-parallel-testing': [
    'chaos-mesh-kubernetes-testing-guide',
    'selenium-webdriver-updates-2026-changelog',
  ],
  'selenium-mcp-server-guide-2026': ['stagehand-ai-browser-automation-guide-2026'],
  'selenium-to-playwright-migration-guide-2026': ['selenium-grid-3-to-4-migration-guide'],
  'serverless-testing-complete-guide': [
    'cloudflare-workers-testing-guide',
    'vercel-functions-testing-guide',
  ],
  'skill-md-vs-mcp-server-when-to-use-which': ['smoke-testing-vs-sanity-testing'],
  'smoke-testing-dependency-health-checks': [
    'ci-required-checks-branch-protection',
    'smoke-testing-synthetic-user-journey',
  ],
  'smoke-testing-post-deploy-canary': ['smoke-testing-synthetic-user-journey'],
  'specflow-bdd-dotnet-guide': ['moq-tutorial-dotnet-mocking-guide-2026'],
  'sse-testing-reconnect-last-event-id': [
    'sse-testing-guide',
    'websocket-testing-reconnect-backoff',
  ],
  'stoplight-prism-api-mocking-guide-2026': ['mockoon-api-mocking-tool-guide'],
  'stripe-test-mode-automation-guide': [
    'newman-postman-ci-automation-guide-2026',
    'testing-stripe-webhooks-locally-signature',
  ],
  'test-automation-framework-architecture': ['test-automation-roadmap-2026'],
  'test-automation-roi-business-case': ['test-case-automation-roi-calculator-guide'],
  'test-data-multi-tenant-isolation': ['multi-tenant-saas-testing-guide'],
  'test-management-tools-comparison-2026': ['testrail-test-management-guide-2026'],
  'test-strategy-risk-based-prioritization': ['test-strategy-microservice-test-boundaries'],
  'testcontainers-docker-integration-testing': [
    'testcontainers-rabbitmq-dead-letter-queue-testing',
    'testcontainers-redis-key-expiration-testing',
  ],
  'testcontainers-dotnet-database-testing-guide': ['testcontainers-go-database-testing-guide'],
  'testcontainers-elasticsearch-node-guide': [
    'testcontainers-reuse-withreuse-node-guide',
    'testing-elasticsearch-search-typo-tolerance',
  ],
  'testcontainers-go-guide': [
    'microfrontend-integration-testing-guide',
    'testcontainers-rust-integration-testing-guide',
  ],
  'testcontainers-junit5-integration-guide': ['selenide-junit5-spring-boot-integration'],
  'testcontainers-kafka-consumer-groups': ['xk6-extensions-load-testing'],
  'testcontainers-kafka-consumer-rebalance-testing': [
    'testcontainers-redis-key-expiration-testing',
  ],
  'testcontainers-reusable-containers-speed': ['testcontainers-init-script-ordering'],
  'testing-agent-plan-recovery-after-tool-failure': ['testing-agent-stops-after-goal-completion'],
  'testing-api-retry-after-header-backoff': ['testing-content-negotiation-accept-header'],
  'testing-async-code-mocha-chai-guide': ['chai-as-promised-testing-promises-guide'],
  'testing-autocomplete-keyboard-accessibility': [
    'testing-data-grid-keyboard-navigation-accessibility',
  ],
  'testing-aws-lambda-dlq-locally': [
    'testcontainers-rabbitmq-dead-letter-queue-testing',
    'testing-s3-event-notifications-locally',
  ],
  'testing-graphql-query-complexity-limits': ['websocket-testing-backpressure-limits'],
  'testing-modal-focus-trap-accessibility': ['vitest-vi-hoisted-complete-guide'],
  'testing-multipart-file-upload-size-limits': [
    'testing-resumable-file-upload-api',
    'websocket-testing-backpressure-limits',
  ],
  'testing-oauth2-pkce-token-exchange': ['oauth2-pkce-flow-testing-guide'],
  'testing-postgres-row-level-security-policies': ['nuclei-security-testing-ci-guide-2026'],
  'testing-rag-answer-relevance-thresholds': ['testing-rag-no-answer-abstention'],
  'testing-stripe-payment-intent-3d-secure-flow': [
    'testing-stripe-subscription-proration-webhooks',
  ],
  'testrail-vs-zephyr-scale-2026': ['zephyr-squad-vs-xray-test-management-2026'],
  'testsigma-vs-mabl-2026': ['testim-vs-mabl-vs-functionize-comparison'],
  'vector-database-recall-testing-guide': ['testing-vector-search-recall-at-k'],
  'vector-search-testing-guide-2026': ['testing-elasticsearch-search-typo-tolerance'],
  'vibe-testing-tools-comparison': ['testrigor-ai-testing-guide'],
  'visual-testing-animation-freeze-strategies': ['visual-testing-font-loading-flake'],
  'vitest-browser-mode-mock-service-worker': ['vitest-spy-on-class-constructor-method'],
  'vitest-coverage-threshold-per-file': ['vitest-spy-on-class-constructor-method'],
  'vitest-environment-jsdom-vs-happy-dom': ['vitest-setup-files-vs-global-setup'],
  'vitest-inline-snapshot-migration-guide': ['vitest-snapshot-serializers-custom-guide'],
  'vitest-mock-hoisting-reference-error-fix': ['vitest-vi-hoisted-complete-guide'],
  'vitest-mock-import-meta-env-values': ['vitest-in-source-testing-import-meta-vitest'],
  'vitest-mocking-vi-mock-complete-guide': ['vitest-mocking-vi-mock-vi-fn-vi-spyon'],
  'vitest-msw-component-api-mocking-guide': ['storybook-component-testing-guide'],
  'vitest-typecheck-mode-type-tests': ['database-testing-partition-pruning-verification'],
  'whats-new-in-playwright-2026': ['selenium-news-may-2026-updates'],
};
