export interface BlogPost {
  title: string;
  description: string;
  date: string;
  category: string;
  content: string;
  image?: string;
  imageAlt?: string;
}

// Import all posts
import { post as mustHaveQaSkills } from './must-have-qa-skills-claude-code-2026';
import { post as aiAgentsChangingQa } from './how-ai-agents-changing-qa-testing';
import { post as playwrightGuide } from './playwright-e2e-complete-guide';
import { post as tddBestPractices } from './tdd-ai-agents-best-practices';
import { post as top10QaSkills } from './top-10-qa-skills-developers-2026';
import { post as cypressVsPlaywright } from './cypress-vs-playwright-2026';
import { post as fixFlakyTests } from './fix-flaky-tests-guide';
import { post as securityTestingAiCode } from './security-testing-ai-generated-code';
import { post as shiftLeftTesting } from './shift-left-testing-ai-agents';
import { post as apiTestingGuide } from './api-testing-complete-guide';
import { post as seleniumVsPlaywright } from './selenium-vs-playwright-2026';
import { post as jestVsVitest } from './jest-vs-vitest-2026';
import { post as playwrightTutorial } from './playwright-tutorial-beginners-2026';
import { post as cicdPipeline } from './cicd-testing-pipeline-github-actions';
import { post as aiTestAutomation } from './ai-test-automation-tools-2026';
import { post as vibeTestingGuide } from './vibe-testing-ai-first-qa-guide';
import { post as playwrightTestAgents } from './playwright-test-agents-claude-code';
import { post as testingAiGeneratedCode } from './testing-ai-generated-code-sdet-playbook';
import { post as autonomousTestingBuildVsBuy } from './autonomous-testing-agents-build-vs-buy';
import { post as mcpForQaEngineers } from './mcp-for-qa-engineers-guide';
import { post as k6VsJmeter } from './k6-vs-jmeter-performance-testing';
import { post as visualRegressionGuide } from './visual-regression-testing-guide';
import { post as apiContractTesting } from './api-contract-testing-microservices';
import { post as mobileTestingGuide } from './mobile-testing-automation-guide';
import { post as accessibilityTestingGuide } from './accessibility-testing-automation-guide';
import { post as mutationTestingGuide } from './mutation-testing-stryker-guide';
import { post as testDataManagement } from './test-data-management-strategies';
import { post as bddCucumberGuide } from './bdd-cucumber-testing-guide';
import { post as databaseTestingGuide } from './database-testing-automation-guide';
import { post as exploratoryTestingGuide } from './exploratory-testing-ai-agents-guide';
import { post as qaEngineerSkillsCareerGuide } from './qa-engineer-skills-career-guide-2026';
import { post as testingLegacyCodeGuide } from './testing-legacy-code-refactoring-guide';
import { post as playwrightVsPuppeteer } from './playwright-vs-puppeteer-2026';
import { post as testingInProduction } from './testing-in-production-strategies';
import { post as pytestGuide } from './pytest-testing-complete-guide';
import { post as seleniumGridDocker } from './selenium-grid-docker-parallel-testing';
import { post as postmanApiGuide } from './postman-api-testing-guide';
import { post as restAssuredGuide } from './rest-assured-java-api-testing';
import { post as regressionTestingGuide } from './regression-testing-strategies-guide';
import { post as smokeVsSanity } from './smoke-testing-vs-sanity-testing';
import { post as testCaseDesign } from './test-case-design-techniques-guide';
import { post as loadTestingGuide } from './load-testing-beginners-guide';
import { post as graphqlTestingGuide } from './graphql-testing-complete-guide';
import { post as chaosEngineeringGuide } from './chaos-engineering-resilience-testing';
import { post as websocketTestingGuide } from './websocket-testing-guide';
import { post as microservicesTestingGuide } from './microservices-testing-strategies';
import { post as testAutomationRoi } from './test-automation-roi-business-case';
import { post as crossBrowserGuide } from './cross-browser-testing-guide';
import { post as qaMetricsGuide } from './qa-metrics-kpis-dashboard-guide';
import { post as testPyramidGuide } from './test-pyramid-testing-strategy';
import { post as continuousTestingGuide } from './continuous-testing-devops-guide';
import { post as i18nTestingGuide } from './internationalization-testing-i18n-guide';
import { post as errorHandlingGuide } from './error-handling-testing-patterns';
import { post as apiMockingGuide } from './api-mocking-service-virtualization-guide';
import { post as testReportingGuide } from './test-reporting-allure-dashboards-guide';
import { post as performanceMonitoringGuide } from './performance-monitoring-testing-guide';
import { post as storybookTestingGuide } from './storybook-component-testing-guide';
import { post as testPlanningGuide } from './test-planning-strategy-guide';
import { post as codeReviewQaGuide } from './code-review-qa-testing-guide';
import { post as aiTestGenerationGuide } from './ai-test-generation-tools-guide';
import { post as testcontainersDockerGuide } from './testcontainers-docker-integration-testing';
import { post as aiAgentTestingWorkflows } from './ai-agent-testing-workflows-comparison';
import { post as reactNextjsTestingGuide } from './react-nextjs-testing-complete-guide';
import { post as testAutomationFrameworkArchitecture } from './test-automation-framework-architecture';
import { post as observabilityDrivenTestingGuide } from './observability-driven-testing-guide';
import { post as dockerTestingGuide } from './docker-testing-strategies-guide';
import { post as typescriptTestingGuide } from './typescript-testing-patterns-guide';
import { post as aiDebuggingGuide } from './ai-powered-debugging-testing-guide';
import { post as eventDrivenTestingGuide } from './event-driven-architecture-testing-guide';
import { post as serverlessTestingGuide } from './serverless-testing-complete-guide';
import { post as propertyBasedTestingGuide } from './property-based-testing-complete-guide';
import { post as designSystemsTestingGuide } from './testing-design-systems-component-libraries';
import { post as testEnvironmentGuide } from './test-environment-management-guide';
import { post as aiCodeReviewGuide } from './ai-code-review-qa-engineers-guide';
import { post as testingLlmAppsGuide } from './testing-llm-applications-guide';
import { post as cypressAiAgentsGuide } from './cypress-e2e-testing-ai-agents-guide';
import { post as seleniumAiAgentsGuide } from './selenium-testing-ai-agents-guide';
import { post as openapiContractTestingGuide } from './openapi-contract-testing-guide';
import { post as authzTestingGuide } from './authentication-authorization-testing-guide';
import { post as qaSkillPublisherGuide } from './how-to-write-high-quality-qa-skills';
import { post as stateOfAiTestingGuide } from './state-of-ai-powered-testing-2026';
import { post as cursorSkillsGuide } from './qa-skills-for-cursor-2026';
import { post as copilotSkillsGuide } from './qa-skills-for-github-copilot-2026';
import { post as windsurfSkillsGuide } from './qa-skills-for-windsurf-2026';
import { post as clineSkillsGuide } from './qa-skills-for-cline-2026';
import { post as webdriverioGuide } from './webdriverio-testing-complete-guide';
import { post as junit5Guide } from './junit5-testing-java-guide';
import { post as testngVsJunit5Guide } from './testng-vs-junit5-comparison';
import { post as mochaChaiGuide } from './mocha-chai-testing-guide';
import { post as robotFrameworkGuide } from './robot-framework-testing-guide';
import { post as rspecGuide } from './rspec-ruby-testing-guide';
import { post as phpunitGuide } from './phpunit-testing-complete-guide';
import { post as dotnetTestingGuide } from './dotnet-testing-xunit-nunit-guide';
import { post as bddComparisonGuide } from './bdd-frameworks-comparison-2026';
import { post as puppeteerVsPlaywrightGuide } from './puppeteer-vs-playwright-testing';
import { post as nightwatchGuide } from './nightwatchjs-testing-guide';
import { post as testcafeGuide } from './testcafe-e2e-testing-guide';
import { post as specflowGuide } from './specflow-bdd-dotnet-guide';
import { post as gaugeGuide } from './gauge-testing-complete-guide';
import { post as serenityBddGuide } from './serenity-bdd-testing-guide';
import { post as capybaraGuide } from './capybara-ruby-testing-guide';
import { post as selenideGuide } from './selenide-java-testing-guide';
import { post as laravelDuskGuide } from './laravel-testing-dusk-guide';
import { post as pythonUnittestVsPytestGuide } from './python-unittest-vs-pytest';
import { post as karmaJasmineGuide } from './karma-jasmine-angular-testing';
import { post as aiQaSkillsDirectoryGuide } from './ai-qa-skills-directory-2026';
import { post as migratingFrameworksGuide } from './migrating-test-frameworks-guide';
import { generatedSeoBatch2026Posts } from './generated-seo-batch-2026';
import { playwrightLongTail2026Posts } from './playwright-long-tail-batch-2026';
import { seoPriorityOverrides2026 } from './seo-priority-overrides-2026';
import { post as cypressTutorialBeginners } from './cypress-tutorial-beginners-2026';
import { post as seleniumPythonTutorial } from './selenium-python-tutorial-2026';
import { post as playwrightPythonGuide } from './playwright-python-testing-guide';
import { post as pomCompleteGuide } from './page-object-model-complete-guide';
import { post as dataDrivenTestingGuide } from './data-driven-testing-complete-guide';
import { post as agileTestingGuide } from './agile-testing-complete-guide';
import { post as apiAutomationFramework } from './api-automation-framework-guide';
import { post as perfTestingCompleteGuide } from './performance-testing-complete-guide';
import { post as securityTestingCompleteGuide } from './security-testing-complete-guide';
import { post as testManagementTools } from './test-management-tools-comparison-2026';
import { post as qaLeadInterview } from './qa-lead-interview-questions-2026';
import { post as frameworkDesignPatterns } from './automation-framework-design-patterns';
import { post as cucumberBddTutorial } from './cucumber-bdd-tutorial-beginners';
import { post as restAssuredVsKarate } from './restassured-vs-karate-api-testing';
import { post as seleniumGridTutorial } from './selenium-grid-tutorial-parallel-testing';
import { post as jiraForQaGuide } from './jira-for-qa-engineers-guide';
import { post as hybridFrameworkGuide } from './hybrid-automation-framework-guide';
import { post as devopsTestingGuide } from './devops-testing-strategy-guide';
import { post as testAutoRoadmap } from './test-automation-roadmap-2026';
import { post as pwVsCypressDetailed } from './playwright-vs-cypress-detailed-2026';
import { post as e2eBestPractices } from './end-to-end-testing-best-practices';
import { post as apiBestPractices } from './api-testing-best-practices-guide';
import { post as testMetricsKpis } from './test-automation-metrics-kpis-guide';
import { post as qaSalaryGuide } from './qa-salary-guide-worldwide-2026';
import { post as appiumMobileGuide } from './appium-mobile-testing-complete-guide';
import { post as testAutoInterviewQuestions } from './test-automation-interview-questions-2026';
import { post as playwrightMcpGuide } from './playwright-mcp-browser-automation-guide';
import { post as cypressSeleniumPlaywrightPerf } from './cypress-vs-selenium-vs-playwright-performance';
import { post as softwareTestingTypes } from './software-testing-types-complete-guide';
import { post as apiTestingToolsComparison } from './api-testing-tools-comparison-2026';
import { post as testAutoWithAi } from './test-automation-with-ai-complete-guide';
import { post as playwrightBestPractices2026 } from './playwright-best-practices-2026';
import { post as seleniumTutorialBeginners } from './selenium-tutorial-complete-beginners-2026';
import { post as manualToAutomation } from './manual-to-automation-testing-transition';
import { post as githubActionsTestingGuide } from './github-actions-testing-ci-cd-guide';
import { post as webTestingChecklist } from './web-testing-checklist-2026';
import { post as seleniumVsCypressVsPlaywright } from './selenium-vs-cypress-vs-playwright-2026';
import { post as bestTestFrameworks2026 } from './best-test-automation-frameworks-2026';
import { post as bestAiTestingTools } from './best-ai-testing-tools-2026';
import { post as installSkillsClaudeCode } from './how-to-install-skills-claude-code';
import { post as installSkillsCursor } from './how-to-install-skills-cursor';
import { post as playwrightAgentsGuide } from './playwright-agents-guide-2026';
import { post as agenticTestingGuide } from './agentic-testing-complete-guide';
import { post as mcpTestingGuide } from './mcp-testing-automation-guide';
import { post as sdetInterviewQuestions } from './sdet-interview-questions-2026';
import { post as qaToSdetRoadmap } from './qa-to-sdet-roadmap-2026';
import { post as vibeTestingToolsComparison } from './vibe-testing-tools-comparison';
import { post as skillMdFormatGuide } from './skill-md-format-guide';
import { post as aiAgentEvalGuide } from './ai-agent-eval-testing-guide';
import { post as playwrightVsSeleniumComplete } from './playwright-vs-selenium-complete-2026';
import { post as autonomousQaGuide } from './autonomous-qa-testing-guide';
import { post as pythonVsPytestExplained } from './python-vs-pytest-explained';
import { post as unittestVsPytest2026 } from './unittest-vs-pytest-2026';
import { post as playwrightTraceViewer } from './playwright-trace-viewer-complete-guide-2026';
import { post as playwrightStorageState } from './playwright-storagestate-authentication-reference';
import { post as playwrightSetInputFiles } from './playwright-setinputfiles-file-upload-guide';
import { post as playwrightVsCypress2026Detailed } from './playwright-vs-cypress-2026-detailed-comparison';
import { post as playwrightVsPuppeteer2026Deep } from './playwright-vs-puppeteer-2026-deep-dive';
import { post as playwrightVsSelenium2026Which } from './playwright-vs-selenium-2026-which-better';
import { post as playwrightMcpCursorSetup } from './playwright-mcp-cursor-ide-setup-2026';
import { post as playwrightMcpClaudeCodeSetup } from './playwright-mcp-claude-code-setup-2026';
import { post as openaiEvalsCompleteGuide } from './openai-evals-complete-guide-2026';
import { post as openaiEvalsBestPractices } from './openai-evals-best-practices-2026';
import { post as promptfooCompleteGuide } from './promptfoo-complete-guide-2026';
import { post as promptfooRedTeaming } from './promptfoo-red-teaming-llm-applications';
import { post as bestClaudeCodeSkillsTesting } from './best-claude-code-skills-for-testing-2026';
import { post as bestClaudeCodeSkillsAutomated } from './best-claude-code-skills-for-automated-testing';
import { post as seleniumNewsMay2026 } from './selenium-news-may-2026-updates';
import { post as seleniumWebdriverUpdates } from './selenium-webdriver-updates-2026-changelog';
import { post as cypressBestPractices2026 } from './cypress-best-practices-2026-guide';
import { post as cypress2026LatestFeatures } from './cypress-2026-latest-version-features';
import { post as k6VsJmeter2026Which } from './k6-vs-jmeter-2026-which-better';
import { post as testcontainersKafkaNode } from './testcontainers-kafka-node-complete-guide';
import { post as selenideAllureIntegration } from './selenide-allure-integration-complete-reference';
import { post as selenideShouldnotConditions } from './selenide-shouldnot-exist-conditions-reference';
import { post as robotFrameworkKeywordDriven } from './robot-framework-keyword-driven-testing-guide';
import { post as bestAiTestAutomationToolsDetailed } from './best-ai-test-automation-tools-detailed-2026';

import { post as aiDefectPredictionMachineLearningQa } from './ai-defect-prediction-machine-learning-qa';
import { post as aiTestDataGenerationTools2026 } from './ai-test-data-generation-tools-2026';
import { post as aiTestGenerationLlmPromptingGuide } from './ai-test-generation-llm-prompting-guide';
import { post as aiTestMaintenanceSelfHealingStrategies } from './ai-test-maintenance-self-healing-strategies';
import { post as aiderQaEngineersGuide } from './aider-qa-engineers-guide';
import { post as ampAiQaEngineersGuide } from './amp-ai-qa-engineers-guide';
import { post as apickliCucumberApiTestingGuide } from './apickli-cucumber-api-testing-guide';
import { post as applitoolsVisualAiTestingCompleteGuide } from './applitools-visual-ai-testing-complete-guide';
import { post as arizePhoenixLlmEvaluationGuide } from './arize-phoenix-llm-evaluation-guide';
import { post as artilleryNodeLoadTestingCompleteGuide } from './artillery-node-load-testing-complete-guide';
import { post as autonomousTestingMablFunctionizeApplitools } from './autonomous-testing-mabl-functionize-applitools';
import { post as bddTestDataManagementBestPractices } from './bdd-test-data-management-best-practices';
import { post as bddVsTddDecisionGuide } from './bdd-vs-tdd-decision-guide';
import { post as behavePythonBddCompleteTutorial } from './behave-python-bdd-complete-tutorial';
import { post as behavioralInterviewQuestionsQaEngineers } from './behavioral-interview-questions-qa-engineers';
import { post as brunoApiTestingCompleteGuide } from './bruno-api-testing-complete-guide';
import { post as chromaticStorybookVisualTestingGuide } from './chromatic-storybook-visual-testing-guide';
import { post as claudeCodeQaTestingWorkflows2026 } from './claude-code-qa-testing-workflows-2026';
import { post as claudeForQaEngineersCompleteGuide } from './claude-for-qa-engineers-complete-guide';
import { post as claudeQaAgentSetupGuide } from './claude-qa-agent-setup-guide';
import { post as clineQaEngineersCompleteGuide } from './cline-qa-engineers-complete-guide';
import { post as codexCliQaEngineersGuide } from './codex-cli-qa-engineers-guide';
import { post as comparingPopularBddFrameworks2026CompleteGuide } from './comparing-popular-bdd-frameworks-2026-complete-guide';
import { post as continueDevQaEngineersGuide } from './continue-dev-qa-engineers-guide';
import { post as cucumberJavaBddBestPractices2026 } from './cucumber-java-bdd-best-practices-2026';
import { post as cucumberJsToPlaywrightMigrationGuide } from './cucumber-js-to-playwright-migration-guide';
import { post as cucumberRubyBddCompleteGuide } from './cucumber-ruby-bdd-complete-guide';
import { post as cucumberTagsHooksCompleteReference } from './cucumber-tags-hooks-complete-reference';
import { post as cucumberVsBehavePythonBddComparison } from './cucumber-vs-behave-python-bdd-comparison';
import { post as cursorForQaEngineersCompleteGuide } from './cursor-for-qa-engineers-complete-guide';
import { post as cursorPlaywrightSkillSetupGuide } from './cursor-playwright-skill-setup-guide';
import { post as cursorSkillsMdBestPractices } from './cursor-skills-md-best-practices';
import { post as cypressApplitoolsVisualTestingGuide } from './cypress-applitools-visual-testing-guide';
import { post as cypressAxeAccessibilityTestingGuide } from './cypress-axe-accessibility-testing-guide';
import { post as cypressComponentTestingAngularGuide } from './cypress-component-testing-angular-guide';
import { post as cypressComponentTestingReactCompleteGuide } from './cypress-component-testing-react-complete-guide';
import { post as cypressComponentTestingVueCompleteGuide } from './cypress-component-testing-vue-complete-guide';
import { post as cypressCucumberBddPreprocessorGuide } from './cypress-cucumber-bdd-preprocessor-guide';
import { post as cypressCucumberPreprocessorBddGuide } from './cypress-cucumber-preprocessor-bdd-guide';
import { post as cypressCustomCommandsBestPractices } from './cypress-custom-commands-best-practices';
import { post as cypressCySessionAuthenticationGuide } from './cypress-cy-session-authentication-guide';
import { post as cypressEnvironmentsConfigBestPractices } from './cypress-environments-config-best-practices';
import { post as cypressFixturesDataManagementGuide } from './cypress-fixtures-data-management-guide';
import { post as cypressGithubActionsCiGuide2026 } from './cypress-github-actions-ci-guide-2026';
import { post as cypressImageSnapshotVisualGuide } from './cypress-image-snapshot-visual-guide';
import { post as cypressInterceptNetworkStubbingReference } from './cypress-intercept-network-stubbing-reference';
import { post as cypressMochawesomeAllureReporterGuide } from './cypress-mochawesome-allure-reporter-guide';
import { post as cypressPercyVisualTestingGuide } from './cypress-percy-visual-testing-guide';
import { post as cypressToPlaywrightMigrationCompleteGuide } from './cypress-to-playwright-migration-complete-guide';
import { post as deepevalPytestLlmTestingGuide } from './deepeval-pytest-llm-testing-guide';
import { post as dreddApiBlueprintTestingGuide } from './dredd-api-blueprint-testing-guide';
import { post as enzymeToReactTestingLibraryMigrationGuide } from './enzyme-to-react-testing-library-migration-guide';
import { post as evidentlyAiLlmTestingGuide } from './evidently-ai-llm-testing-guide';
import { post as gatlingScalaLoadTestingCompleteGuide } from './gatling-scala-load-testing-complete-guide';
import { post as gaugeVsCucumberBddFrameworks } from './gauge-vs-cucumber-bdd-frameworks';
import { post as geminiCliQaEngineersGuide } from './gemini-cli-qa-engineers-guide';
import { post as githubCopilotQaEngineersDeepGuide } from './github-copilot-qa-engineers-deep-guide';
import { post as heliconeLlmMonitoringCompleteGuide } from './helicone-llm-monitoring-complete-guide';
import { post as hoppscotchApiTestingCompleteGuide } from './hoppscotch-api-testing-complete-guide';
import { post as insomniaApiTestingCompleteGuide } from './insomnia-api-testing-complete-guide';
import { post as jasmineToJestMigrationGuide } from './jasmine-to-jest-migration-guide';
import { post as jestToVitestMigrationGuide } from './jest-to-vitest-migration-guide';
import { post as jmeterDistributedLoadTestingCompleteGuide } from './jmeter-distributed-load-testing-complete-guide';
import { post as jmeterVsLocustVsGatlingComparison } from './jmeter-vs-locust-vs-gatling-comparison';
import { post as junit4ToJunit5MigrationGuide } from './junit4-to-junit5-migration-guide';
import { post as k6BrowserRecorderTestBuilderGuide } from './k6-browser-recorder-test-builder-guide';
import { post as k6CloudGrafanaCloudCompleteGuide } from './k6-cloud-grafana-cloud-complete-guide';
import { post as k6ExtensionsXk6CompleteReference } from './k6-extensions-xk6-complete-reference';
import { post as karateBddApiTestingCompleteGuide } from './karate-bdd-api-testing-complete-guide';
import { post as karateDslBddApiTestingCompleteGuide } from './karate-dsl-bdd-api-testing-complete-guide';
import { post as karmaToJestMigrationGuide } from './karma-to-jest-migration-guide';
import { post as katalonStudioTestAutomationCompleteGuide } from './katalon-studio-test-automation-complete-guide';
import { post as langchainEvaluatorsCompleteGuide } from './langchain-evaluators-complete-guide';
import { post as langsmithEvaluationPlatformGuide } from './langsmith-evaluation-platform-guide';
import { post as livingDocumentationBddCucumber } from './living-documentation-bdd-cucumber';
import { post as llmEvalsComparisonOpenaiPromptfooRagas } from './llm-evals-comparison-openai-promptfoo-ragas';
import { post as locustPythonLoadTestingCompleteGuide } from './locust-python-load-testing-complete-guide';
import { post as mochaToJestMigrationGuide } from './mocha-to-jest-migration-guide';
import { post as mockoonApiMockingToolGuide } from './mockoon-api-mocking-tool-guide';
import { post as neoloadTricentisPerformanceTestingGuide } from './neoload-tricentis-performance-testing-guide';
import { post as nightwatchToPlaywrightMigrationGuide } from './nightwatch-to-playwright-migration-guide';
import { post as openaiAgentEvalsCompleteGuide2026 } from './openai-agent-evals-complete-guide-2026';
import { post as openaiEvalsDesignBestPractices } from './openai-evals-design-best-practices';
import { post as openaiEvalsGradersCompleteReference } from './openai-evals-graders-complete-reference';
import { post as pactContractTestingCompleteGuide2026 } from './pact-contract-testing-complete-guide-2026';
import { post as pactflowContractTestingBrokerGuide } from './pactflow-contract-testing-broker-guide';
import { post as percyVisualTestingCompleteGuide } from './percy-visual-testing-complete-guide';
import { post as playwrightAccessibilityTestingAxeCompleteGuide } from './playwright-accessibility-testing-axe-complete-guide';
import { post as playwrightApiTestingContextRequestGuide } from './playwright-api-testing-context-request-guide';
import { post as playwrightBestPracticesLocators2026 } from './playwright-best-practices-locators-2026';
import { post as playwrightBrowserContextsIsolationGuide } from './playwright-browser-contexts-isolation-guide';
import { post as playwrightCiGithubActionsCompleteGuide2026 } from './playwright-ci-github-actions-complete-guide-2026';
import { post as playwrightClockTimeControlTestingGuide } from './playwright-clock-time-control-testing-guide';
import { post as playwrightCodegenRecordingCompleteGuide } from './playwright-codegen-recording-complete-guide';
import { post as playwrightComponentTestingReactCompleteGuide } from './playwright-component-testing-react-complete-guide';
import { post as playwrightComponentTestingSvelteGuide } from './playwright-component-testing-svelte-guide';
import { post as playwrightComponentTestingVueCompleteGuide } from './playwright-component-testing-vue-complete-guide';
import { post as playwrightCucumberBddIntegrationGuide } from './playwright-cucumber-bdd-integration-guide';
import { post as playwrightDebugModeInspectorGuide } from './playwright-debug-mode-inspector-guide';
import { post as playwrightEmulationGeolocationPermissionsGuide } from './playwright-emulation-geolocation-permissions-guide';
import { post as playwrightFileDownloadHandlingGuide } from './playwright-file-download-handling-guide';
import { post as playwrightFixturesCompleteReference2026 } from './playwright-fixtures-complete-reference-2026';
import { post as playwrightIframeShadowDomGuide } from './playwright-iframe-shadow-dom-guide';
import { post as playwrightKeyboardMouseInteractionsReference } from './playwright-keyboard-mouse-interactions-reference';
import { post as playwrightLocatorStrategiesGetbyroleGuide } from './playwright-locator-strategies-getbyrole-guide';
import { post as playwrightMcpAccessibilitySnapshotsReference } from './playwright-mcp-accessibility-snapshots-reference';
import { post as playwrightMcpServerConfiguration2026 } from './playwright-mcp-server-configuration-2026';
import { post as playwrightMobileEmulationDevicesReference } from './playwright-mobile-emulation-devices-reference';
import { post as playwrightMultiPagePopupHandlingGuide } from './playwright-multi-page-popup-handling-guide';
import { post as playwrightNetworkMockingRouteHandlerGuide } from './playwright-network-mocking-route-handler-guide';
import { post as playwrightParallelShardingExecutionGuide } from './playwright-parallel-sharding-execution-guide';
import { post as playwrightRetriesFlakyTestHandlingGuide } from './playwright-retries-flaky-test-handling-guide';
import { post as playwrightScreenshotsVideosTracesCompleteGuide } from './playwright-screenshots-videos-traces-complete-guide';
import { post as playwrightTestAgentsPlannerGeneratorHealerGuide } from './playwright-test-agents-planner-generator-healer-guide';
import { post as playwrightTestConfigOptionsCompleteReference } from './playwright-test-config-options-complete-reference';
import { post as playwrightTestReportersHtmlAllureJunitGuide } from './playwright-test-reporters-html-allure-junit-guide';
import { post as playwrightUiModeComplete2026Guide } from './playwright-ui-mode-complete-2026-guide';
import { post as playwrightVisualComparisonSnapshotsGuide } from './playwright-visual-comparison-snapshots-guide';
import { post as promptfooVsOpenaiEvalsComparison2026 } from './promptfoo-vs-openai-evals-comparison-2026';
import { post as protractorToPlaywrightMigrationGuide } from './protractor-to-playwright-migration-guide';
import { post as puppeteerToPlaywrightMigrationGuide } from './puppeteer-to-playwright-migration-guide';
import { post as qaEngineerVsSdetVsTestArchitect } from './qa-engineer-vs-sdet-vs-test-architect';
import { post as ragasContextPrecisionRecallFaithfulnessGuide } from './ragas-context-precision-recall-faithfulness-guide';
import { post as ragasRagEvaluationMetricsCompleteGuide } from './ragas-rag-evaluation-metrics-complete-guide';
import { post as ranorexTestAutomation2026Guide } from './ranorex-test-automation-2026-guide';
import { post as restAssuredVsKarateDetailedComparison2026 } from './rest-assured-vs-karate-detailed-comparison-2026';
import { post as robotFrameworkApiTestingRequestsLibrary } from './robot-framework-api-testing-requests-library';
import { post as robotFrameworkAppiumMobileTestingGuide } from './robot-framework-appium-mobile-testing-guide';
import { post as robotFrameworkBrowserLibraryPlaywrightGuide } from './robot-framework-browser-library-playwright-guide';
import { post as robotFrameworkCiCdJenkinsGithubActions } from './robot-framework-ci-cd-jenkins-github-actions';
import { post as robotFrameworkCustomLibrariesPythonGuide } from './robot-framework-custom-libraries-python-guide';
import { post as robotFrameworkDataDrivenTestingCompleteGuide } from './robot-framework-data-driven-testing-complete-guide';
import { post as robotFrameworkDatabaseTestingLibraryGuide } from './robot-framework-database-testing-library-guide';
import { post as robotFrameworkListenersCompleteReference } from './robot-framework-listeners-complete-reference';
import { post as robotFrameworkPabotParallelExecutionGuide } from './robot-framework-pabot-parallel-execution-guide';
import { post as robotFrameworkPytestIntegrationGuide } from './robot-framework-pytest-integration-guide';
import { post as robotFrameworkRestInstanceLibraryGuide } from './robot-framework-rest-instance-library-guide';
import { post as robotFrameworkSeleniumLibraryCompleteReference } from './robot-framework-selenium-library-complete-reference';
import { post as robotFrameworkSmsOtpTestingCompleteGuide } from './robot-framework-sms-otp-testing-complete-guide';
import { post as robotFrameworkTagsTaggingBestPractices } from './robot-framework-tags-tagging-best-practices';
import { post as robotFrameworkWaitUntilKeywordSucceedsGuide } from './robot-framework-wait-until-keyword-succeeds-guide';
import { post as sdetMockInterviewQuestionsWithAnswers } from './sdet-mock-interview-questions-with-answers';
import { post as sdetRoadmapDayByDay90DayPlan } from './sdet-roadmap-day-by-day-90-day-plan';
import { post as selenideAllureselenideIncludeselenidestepsReference } from './selenide-allureselenide-includeselenidesteps-reference';
import { post as selenideCollectionShouldhaveReference } from './selenide-collection-shouldhave-reference';
import { post as selenideConditionCheatsheet2026 } from './selenide-condition-cheatsheet-2026';
import { post as selenideFileDownloadUploadGuide } from './selenide-file-download-upload-guide';
import { post as selenideGridParallelTestingGuide } from './selenide-grid-parallel-testing-guide';
import { post as selenideHeadlessChromiumFirefoxGuide } from './selenide-headless-chromium-firefox-guide';
import { post as selenideIframeHandlingCompleteGuide } from './selenide-iframe-handling-complete-guide';
import { post as selenideJunit5SpringBootIntegration } from './selenide-junit5-spring-boot-integration';
import { post as selenidePageFactoryCompleteGuide } from './selenide-page-factory-complete-guide';
import { post as selenidePageObjectPatternBestPractices } from './selenide-page-object-pattern-best-practices';
import { post as selenideScreenshotOnFailureGuide } from './selenide-screenshot-on-failure-guide';
import { post as selenideShadowDomElementsGuide } from './selenide-shadow-dom-elements-guide';
import { post as selenideSoftAssertionsCompleteReference } from './selenide-soft-assertions-complete-reference';
import { post as selenideVsSeleniumWebdriver2026 } from './selenide-vs-selenium-webdriver-2026';
import { post as selenideWaitStrategiesExplicitImplicit } from './selenide-wait-strategies-explicit-implicit';
import { post as seleniumAllureReportingJavaCompleteGuide } from './selenium-allure-reporting-java-complete-guide';
import { post as seleniumAzureDevopsPipelineGuide } from './selenium-azure-devops-pipeline-guide';
import { post as seleniumBidirectionalBidiProtocolGuide } from './selenium-bidirectional-bidi-protocol-guide';
import { post as seleniumCdpChromeDevtoolsProtocolGuide } from './selenium-cdp-chrome-devtools-protocol-guide';
import { post as seleniumCucumberJavaBddCompleteGuide } from './selenium-cucumber-java-bdd-complete-guide';
import { post as seleniumGrid3To4MigrationGuide } from './selenium-grid-3-to-4-migration-guide';
import { post as seleniumGrid4DockerKubernetesGuide } from './selenium-grid-4-docker-kubernetes-guide';
import { post as seleniumJavaTestngPageObjectGuide } from './selenium-java-testng-page-object-guide';
import { post as seleniumJenkinsPipelineCompleteGuide } from './selenium-jenkins-pipeline-complete-guide';
import { post as seleniumManagerBrowserDriver2026 } from './selenium-manager-browser-driver-2026';
import { post as seleniumPythonPytestIntegrationCompleteGuide } from './selenium-python-pytest-integration-complete-guide';
import { post as seleniumToPlaywrightMigrationGuide2026 } from './selenium-to-playwright-migration-guide-2026';
import { post as selfHealingTestAutomationToolsComparison2026 } from './self-healing-test-automation-tools-comparison-2026';
import { post as specflowNetBdd2026CompleteGuide } from './specflow-net-bdd-2026-complete-guide';
import { post as specflowVsCucumberDetailedComparison } from './specflow-vs-cucumber-detailed-comparison';
import { post as springCloudContractTestingGuide } from './spring-cloud-contract-testing-guide';
import { post as supertestNodeApiTestingCompleteGuide } from './supertest-node-api-testing-complete-guide';
import { post as swaggerOpenapiSpecValidationGuide } from './swagger-openapi-spec-validation-guide';
import { post as tavernPytestApiTestingCompleteGuide } from './tavern-pytest-api-testing-complete-guide';
import { post as testArchitectRoadmap2026 } from './test-architect-roadmap-2026';
import { post as testAutomationEngineerResumeTemplate } from './test-automation-engineer-resume-template';
import { post as testcafeToPlaywrightMigrationGuide } from './testcafe-to-playwright-migration-guide';
import { post as testcontainersBestPractices2026 } from './testcontainers-best-practices-2026';
import { post as testcontainersDotnetDatabaseTestingGuide } from './testcontainers-dotnet-database-testing-guide';
import { post as testcontainersElasticsearchNodeGuide } from './testcontainers-elasticsearch-node-guide';
import { post as testcontainersGoDatabaseTestingGuide } from './testcontainers-go-database-testing-guide';
import { post as testcontainersKafkaJavaSpringBootGuide } from './testcontainers-kafka-java-spring-boot-guide';
import { post as testcontainersLocalstackAwsMockingGuide } from './testcontainers-localstack-aws-mocking-guide';
import { post as testcontainersMongodbNodeIntegrationTesting } from './testcontainers-mongodb-node-integration-testing';
import { post as testcontainersMysqlNodeIntegrationTesting } from './testcontainers-mysql-node-integration-testing';
import { post as testcontainersPostgresJavaSpringBootGuide } from './testcontainers-postgres-java-spring-boot-guide';
import { post as testcontainersPostgresqlNodeCompleteGuide } from './testcontainers-postgresql-node-complete-guide';
import { post as testcontainersPythonPytestIntegrationGuide } from './testcontainers-python-pytest-integration-guide';
import { post as testcontainersRabbitmqNodeIntegrationTesting } from './testcontainers-rabbitmq-node-integration-testing';
import { post as testcontainersRedisNodeCompleteGuide } from './testcontainers-redis-node-complete-guide';
import { post as testcontainersRustIntegrationTestingGuide } from './testcontainers-rust-integration-testing-guide';
import { post as testcontainersSeleniumGridGuide } from './testcontainers-selenium-grid-guide';
import { post as testimVsMablVsFunctionizeComparison } from './testim-vs-mabl-vs-functionize-comparison';
import { post as testsigmaCodelessAutomationGuide } from './testsigma-codeless-automation-guide';
import { post as tricentisToscaCodelessTestingGuide } from './tricentis-tosca-codeless-testing-guide';
import { post as trulensLlmEvaluationFrameworkGuide } from './trulens-llm-evaluation-framework-guide';
import { post as webdriverioToPlaywrightMigrationGuide } from './webdriverio-to-playwright-migration-guide';
import { post as weightsBiasesLlmEvalsGuide } from './weights-biases-llm-evals-guide';
import { post as windsurfQaEngineersCompleteGuide } from './windsurf-qa-engineers-complete-guide';
import { post as wiremockApiMockingCompleteGuide } from './wiremock-api-mocking-complete-guide';
import { post as wrkWrk2HttpBenchmarkingGuide } from './wrk-wrk2-http-benchmarking-guide';
import { post as zedAiQaEngineersGuide } from './zed-ai-qa-engineers-guide';
import { post as whatIsPytestPythonExplained } from './what-is-pytest-python-explained';
import { post as pytestBestPractices2026 } from './pytest-best-practices-2026';
import { post as jestMockVsMockImplementationGuide } from './jest-mock-vs-mockimplementation-guide';
import { post as vitest4MigrationGuideBreakingChanges } from './vitest-4-migration-guide-breaking-changes';
import { post as testcontainersReuseWithReuseNodeGuide } from './testcontainers-reuse-withreuse-node-guide';
import { post as ragEvaluationMetricsComplete2026 } from './rag-evaluation-metrics-complete-2026';
import { post as ragRegressionTestingGuide } from './rag-regression-testing-guide';
import { post as openaiEvalsTraceGradingCompleteGuide } from './openai-evals-trace-grading-complete-guide';
import { post as agentBrowserCompleteGuide2026 } from './agent-browser-complete-guide-2026';
import { post as cursorSkillMdFrontmatterSchemaGuide } from './cursor-skill-md-frontmatter-schema-guide';

import { post as testrailVsZephyrScale2026 } from './testrail-vs-zephyr-scale-2026';
import { post as xrayTestManagementPricing2026 } from './xray-test-management-pricing-2026';
import { post as bestTestManagementToolsBeyondTestrail2026 } from './best-test-management-tools-beyond-testrail-2026';
import { post as playwrightVsCypressNextjsE2e2026 } from './playwright-vs-cypress-nextjs-e2e-2026';
import { post as playwrightVsRestAssuredApiTesting } from './playwright-vs-rest-assured-api-testing';
import { post as playwrightMultipleTabsWindowsGuide } from './playwright-multiple-tabs-windows-guide';
import { post as playwrightPageEvaluateCompleteGuide } from './playwright-page-evaluate-complete-guide';
import { post as playwrightTestStepAnnotationsGuide } from './playwright-test-step-annotations-guide';
import { post as playwrightLocatorFilterVisibleReference } from './playwright-locator-filter-visible-reference';
import { post as playwrightVsPuppeteerBundleSize2026 } from './playwright-vs-puppeteer-bundle-size-2026';
import { post as aiAccessibilityTestingTools2026 } from './ai-accessibility-testing-tools-2026';
import { post as aiMobileTestAutomation2026 } from './ai-mobile-test-automation-2026';
import { post as bestCheapAiE2eTestingTools2026 } from './best-cheap-ai-e2e-testing-tools-2026';
import { post as howToDetectAiGeneratedCode2026 } from './how-to-detect-ai-generated-code-2026';
import { post as migrateSeleniumToPlaywrightChecklist2026 } from './migrate-selenium-to-playwright-checklist-2026';

import { post as bddTestManagementTools2026 } from './bdd-test-management-tools-2026';
import { post as chromaticTurbosnapStorybookGuide } from './chromatic-turbosnap-storybook-guide';
import { post as cypressAliasesBeforeEachGuide } from './cypress-aliases-before-each-guide';
import { post as cypressComponentTestingReactRouterGuide } from './cypress-component-testing-react-router-guide';
import { post as insomniaTutorialCompleteEngineersGuide } from './insomnia-tutorial-complete-engineers-guide';
import { post as jmeterResponseAssertionJmxGuide } from './jmeter-response-assertion-jmx-guide';
import { post as keywordDrivenTestingPythonGuide } from './keyword-driven-testing-python-guide';
import { post as localstackBedrockMockTestingGuide } from './localstack-bedrock-mock-testing-guide';
import { post as mablVsPlaywrightComparison2026 } from './mabl-vs-playwright-comparison-2026';
import { post as pactConsumerDrivenContractReference2026 } from './pact-consumer-driven-contract-reference-2026';
import { post as percyPlaywrightVisualTestingGuide } from './percy-playwright-visual-testing-guide';
import { post as playwrightAllureAttachmentTraceGuide } from './playwright-allure-attachment-trace-guide';
import { post as playwrightApirequestcontextStoragestateGuide } from './playwright-apirequestcontext-storagestate-guide';
import { post as playwrightBlobReporterGuide } from './playwright-blob-reporter-guide';
import { post as playwrightBrowsersPathEnvGuide } from './playwright-browsers-path-env-guide';
import { post as playwrightCodegenCliFlagsReference } from './playwright-codegen-cli-flags-reference';
import { post as playwrightInstallProxyMirrorGuide } from './playwright-install-proxy-mirror-guide';
import { post as playwrightMcpCursorTroubleshootingGuide } from './playwright-mcp-cursor-troubleshooting-guide';
import { post as playwrightMcpJsonConfigurationReference } from './playwright-mcp-json-configuration-reference';
import { post as playwrightPythonAuthenticationStorageStateGuide } from './playwright-python-authentication-storage-state-guide';
import { post as playwrightPythonCodegenGuide } from './playwright-python-codegen-guide';
import { post as playwrightPythonFileUploadGuide } from './playwright-python-file-upload-guide';
import { post as playwrightTestingBestPractices2026 } from './playwright-testing-best-practices-2026';
import { post as robotFrameworkBuiltinKeywordsReference } from './robot-framework-builtin-keywords-reference';
import { post as robotFrameworkSeleniumlibraryLocatorsGuide } from './robot-framework-seleniumlibrary-locators-guide';
import { post as selenideConfigurationBaseurlGuide } from './selenide-configuration-baseurl-guide';
import { post as selenideCssclassConditionReference } from './selenide-cssclass-condition-reference';
import { post as seleniumCdpAddScriptEvaluateGuide } from './selenium-cdp-add-script-evaluate-guide';
import { post as seleniumWebdriverBidi2026Reference } from './selenium-webdriver-bidi-2026-reference';
import { post as testAutomationRoiBusinessValueGuide } from './test-automation-roi-business-value-guide';
import { post as twilioSmsOtpTestingPythonGuide } from './twilio-sms-otp-testing-python-guide';
import { post as webdriverioVisualServiceBlockoutGuide } from './webdriverio-visual-service-blockout-guide';
import { post as appium2MobileAutomationReference2026 } from './appium-2-mobile-automation-reference-2026';
import { post as cypressVsPlaywrightComponentTesting2026 } from './cypress-vs-playwright-component-testing-2026';
import { post as githubActionsE2eDeployedUrlTestingGuide } from './github-actions-e2e-deployed-url-testing-guide';
import { post as openaiMcpSupportGuide2026 } from './openai-mcp-support-guide-2026';
import { post as pytestOfficialReferenceCheatsheet2026 } from './pytest-official-reference-cheatsheet-2026';
import { post as testingOtpSmsPhoneFlowsCompleteGuide } from './testing-otp-sms-phone-flows-complete-guide';
import { post as playwrightNetworkInterceptionMockingGuide } from './playwright-network-interception-mocking-guide';
import { post as playwrightGlobalSetupTeardownGuide } from './playwright-global-setup-teardown-guide';
import { post as syntheticMonitoringPlaywrightGuide } from './synthetic-monitoring-playwright-guide';
import { post as pytestXdistParallelTestingGuide } from './pytest-xdist-parallel-testing-guide';
import { post as pytestAsyncioTestingGuide } from './pytest-asyncio-testing-guide';
import { post as promptfooVsDeepeval2026Comparison } from './promptfoo-vs-deepeval-2026-comparison';
import { post as langfuseVsLangsmith2026Comparison } from './langfuse-vs-langsmith-2026-comparison';
import { post as deepevalVsRagasRagEvaluation2026 } from './deepeval-vs-ragas-rag-evaluation-2026';
import { post as k6ThresholdsChecksCompleteGuide } from './k6-thresholds-checks-complete-guide';
import { post as cursorVsClaudeCodeTesting2026 } from './cursor-vs-claude-code-testing-2026';

import { post as playwrightAriaSnapshotTestingGuide } from './playwright-aria-snapshot-testing-guide';
import { post as playwrightLocatorDescribeTracingGroupGuide } from './playwright-locator-describe-tracing-group-guide';
import { post as playwrightClockApiTimeTestingGuide } from './playwright-clock-api-time-testing-guide';
import { post as pytestBenchmarkPerformanceTestingGuide } from './pytest-benchmark-performance-testing-guide';
import { post as pytestBddGherkinTutorial2026 } from './pytest-bdd-gherkin-tutorial-2026';
import { post as k6BrowserModuleTestingGuide } from './k6-browser-module-testing-guide';
import { post as claudeCodeSubagentsTestingWorkflow2026 } from './claude-code-subagents-testing-workflow-2026';
import { post as promptfooRedTeamingGuide2026 } from './promptfoo-red-teaming-guide-2026';
import { post as deepevalMetricsCompleteGuide2026 } from './deepeval-metrics-complete-guide-2026';
import { post as llmGuardrailsTestingGuide2026 } from './llm-guardrails-testing-guide-2026';

import { post as playwrightTestAgentsPlannerGeneratorHealer2026 } from './playwright-test-agents-planner-generator-healer-official-2026';
import { post as openaiEvalsGradersReference2026 } from './openai-evals-graders-complete-reference-2026';
import { post as openaiAgentEvalsDatasetsWorkflow2026 } from './openai-agent-evals-datasets-workflow-guide-2026';
import { post as ragasFaithfulnessContextPrecisionRecall2026 } from './ragas-faithfulness-answer-relevancy-context-precision-recall-reference-2026';
import { post as trulensRagTriad2026 } from './trulens-rag-triad-groundedness-context-relevance-2026';
import { post as deepevalRagEvaluationMetrics2026 } from './deepeval-rag-evaluation-metrics-reference-2026';
import { post as arizePhoenixLlmObservability2026 } from './arize-phoenix-llm-observability-tracing-evaluations-2026';
import { post as axeCorePlaywrightAccessibility2026 } from './axe-core-playwright-accessibility-testing-2026';
import { post as seleniumWebdriverBidi2026OfficialReference } from './selenium-webdriver-bidi-2026-official-reference';
import { post as seleniumManager46DriverManagement2026 } from './selenium-manager-4-6-driver-management-2026-guide';

import { post as pytestFixturesConftestCompleteGuide2026 } from './pytest-fixtures-conftest-complete-guide-2026';
import { post as pytestParametrizeCompleteGuide2026 } from './pytest-parametrize-complete-guide-2026';
import { post as pytestCoveragePytestCovGuide2026 } from './pytest-coverage-pytest-cov-guide-2026';
import { post as vitestMockingViMockCompleteGuide } from './vitest-mocking-vi-mock-complete-guide';
import { post as selenium4RelativeLocatorsGuide2026 } from './selenium-4-relative-locators-guide-2026';
import { post as playwrightSoftAssertionsExpectGuide } from './playwright-soft-assertions-expect-guide';
import { post as githubActionsPlaywrightMatrixGuide2026 } from './github-actions-playwright-matrix-guide-2026';
import { post as apiContractTestingSchemathesisGuide } from './api-contract-testing-schemathesis-guide';
import { post as llmAsJudgeEvaluationGuide2026 } from './llm-as-judge-evaluation-guide-2026';
import { post as promptInjectionTestingGuide2026 } from './prompt-injection-testing-guide-2026';
import { post as pwComponentTestingReact } from './playwright-component-testing-react-guide';
import { post as pwNetworkInterceptionRoute } from './playwright-network-interception-route-guide';
import { post as pytestFixturesScope } from './pytest-fixtures-scope-complete-guide';
import { post as vitestBrowserMode } from './vitest-browser-mode-complete-guide';
import { post as mswApiMocking } from './msw-api-mocking-complete-guide';
import { post as contractTestingPact } from './contract-testing-pact-complete-guide';
import { post as deepevalVsRagasVsPromptfoo } from './deepeval-vs-ragas-vs-promptfoo-2026';
import { post as selfHealingTestAutomation } from './self-healing-test-automation-2026';
import { post as mcpServerTesting } from './mcp-server-testing-guide-2026';
import { post as maestroMobileTesting } from './maestro-mobile-testing-guide-2026';
import { post as vitestVsJest2026 } from './vitest-vs-jest-2026';
import { post as playwrightVsSeleniumPython2026 } from './playwright-vs-selenium-python-2026';
import { post as appiumVsPlaywright2026 } from './appium-vs-playwright-2026';
import { post as webdriverioVsPlaywright2026 } from './webdriverio-vs-playwright-2026';
import { post as cucumberVsPlaywright2026 } from './cucumber-vs-playwright-2026';
import { post as robotFrameworkVsPlaywright2026 } from './robot-framework-vs-playwright-2026';
import { post as detoxVsAppium2026 } from './detox-vs-appium-2026';
import { post as playwrightVisualRegressionTesting } from './playwright-visual-regression-testing-guide';
import { post as stagehandAiBrowserAutomation2026 } from './stagehand-ai-browser-automation-guide-2026';
import { post as midsceneAiVisualTesting2026 } from './midscene-ai-visual-testing-guide-2026';
import { post as playwrightBrowsersPathRef } from './playwright-browsers-path-environment-variable-reference';
import { post as postmanVsPlaywright } from './postman-vs-playwright';
import { post as playwrightFileUploadSetInputFiles } from './playwright-file-upload-setinputfiles';
import { post as whatsNewPlaywright2026 } from './whats-new-in-playwright-2026';
import { post as playwrightMobileEmulation } from './playwright-mobile-emulation';
import { post as pyunitVsPytest } from './pyunit-vs-pytest';
import { post as testrigorVsPlaywright } from './testrigor-vs-playwright';
import { post as vitest3To4Migration } from './vitest-3-to-4-migration';
import { post as k6VsJmeter2026 } from './k6-vs-jmeter-2026';
import { post as unittestMockVsPytestMock } from './unittest-mock-vs-pytest-mock-guide';

import { post as playwrightBrowsersPathGuide } from './playwright-browsers-path-environment-variable-guide';
import { post as playwrightSetInputFilesGuide } from './playwright-file-upload-setinputfiles-guide';
import { post as playwright159AgenticRelease } from './playwright-1-59-agentic-release-features-guide';
import { post as playwrightAwaitUsingCleanup } from './playwright-await-using-automatic-cleanup-guide';
import { post as playwrightScreencastApiGuide } from './playwright-screencast-api-video-recording-guide';
import { post as chromeForTestingVsChromium } from './chrome-for-testing-vs-chromium-playwright';
import { post as selfHealingTestAutomation2026 } from './self-healing-test-automation-2026-guide';
import { post as aiAugmentedSoftwareTesting2026 } from './ai-augmented-software-testing-2026-guide';
import { post as k6GrafanaCloudLoadTesting2026 } from './k6-grafana-cloud-load-testing-tutorial-2026';
import { post as bidirectionalContractTestingPact2026 } from './bidirectional-contract-testing-pact-2026';
const seoPriorityOverrideSlugs = new Set(seoPriorityOverrides2026.map(({ slug }) => slug));
const remainingGeneratedSeoBatch2026Posts = generatedSeoBatch2026Posts.filter(
  ({ slug }) => !seoPriorityOverrideSlugs.has(slug)
);

// Original posts
const introducingQaskills: BlogPost = {
  title: 'Introducing QA Skills \u2014 Agent Skills for Testing',
  description:
    'Why we built the first QA-specific skills directory for AI coding agents.',
  date: '2026-02-10',
  category: 'Announcement',
  content: `
Among 49,000+ skills indexed on existing agent skill platforms, only a handful are dedicated to QA testing. We saw an opportunity.

## The Problem

AI coding agents like Claude Code, Cursor, and Copilot are incredibly powerful general-purpose tools. But when it comes to QA testing, they lack the specialized knowledge that experienced test engineers bring:

- **Framework-specific patterns**: Page Object Model for Playwright, custom commands for Cypress, fixtures for pytest
- **Testing strategy**: When to use E2E vs integration vs unit tests
- **Best practices**: Proper assertions, test isolation, flaky test prevention

## The Solution

QA Skills is a curated directory of testing-specific skills that you can install into any AI coding agent with a single command:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

This installs expert Playwright knowledge into your AI agent. Now when you ask it to write tests, it follows proven patterns and best practices.

## What's Available

We're launching with 20 curated skills covering:

- **E2E Testing**: Playwright, Cypress, Selenium
- **API Testing**: REST Assured, Postman, Playwright API
- **Performance**: k6, JMeter
- **Security**: OWASP patterns
- **And more**: Accessibility, visual regression, contract testing, BDD

## Get Started

Browse our skills directory at [qaskills.sh/skills](/skills) or install one now:

\`\`\`bash
npx @qaskills/cli search
\`\`\`
`,
};

const playwrightBestPractices: BlogPost = {
  title: 'Playwright E2E Best Practices for AI Agents',
  description:
    'How our Playwright E2E skill teaches AI agents to write robust, maintainable end-to-end tests.',
  date: '2026-02-08',
  category: 'Tutorial',
  content: `
Writing E2E tests that are fast, reliable, and maintainable is hard. Teaching an AI agent to do it well is even harder. Here's how the Playwright E2E skill approaches this challenge.

## Page Object Model

The skill teaches AI agents to always use the Page Object Model pattern. Instead of writing raw selectors in tests, it creates reusable page classes:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

Once installed, your AI agent structures every test with proper page objects, separating selectors from test logic.

## Auto-Waiting Locators

One of the most common mistakes in E2E testing is using fragile selectors and manual waits. The skill teaches agents to use Playwright's built-in auto-waiting locators like \`getByRole\`, \`getByText\`, and \`getByTestId\` instead of raw CSS selectors.

## Fixture-Based Setup

The skill guides agents to use Playwright's fixture system for test setup and teardown. This ensures tests are isolated and don't share state, which prevents flaky failures.

## Cross-Browser Testing

The skill includes patterns for configuring tests to run across Chromium, Firefox, and WebKit, with proper browser-specific handling when needed.

## What You Get

After installing the Playwright E2E skill:

- **Consistent patterns**: Every test follows the same structure
- **Better selectors**: Accessible, resilient locator strategies
- **Proper assertions**: Using Playwright's built-in expect assertions
- **Test isolation**: Each test runs independently with proper fixtures

Try it yourself:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`
`,
};

const aiAgentsRevolution: BlogPost = {
  title: 'The AI Agent Revolution in QA Testing',
  description:
    'How AI coding agents are transforming QA, and why they need specialized testing knowledge.',
  date: '2026-02-05',
  category: 'Industry',
  content: `
AI coding agents are changing how software gets built. But QA testing presents unique challenges that generic AI knowledge can't solve well. Here's why specialized QA skills matter.

## The State of AI in QA

AI agents can now write code, debug issues, and refactor applications with impressive accuracy. But when asked to write tests, they often produce:

- **Brittle selectors**: Using IDs and CSS paths that break on every UI change
- **Missing edge cases**: Only testing the happy path
- **Poor test structure**: Mixing setup, action, and assertion without clear separation
- **No test strategy**: Writing E2E tests where unit tests would suffice

## Why Specialized Knowledge Matters

A senior QA engineer brings years of hard-won knowledge about testing patterns, framework idioms, and testing strategy. This knowledge can't be learned from reading documentation alone \u2014 it comes from real-world experience debugging flaky tests, scaling test suites, and building reliable CI pipelines.

## The Skills Approach

QA Skills bridges this gap by encoding expert QA knowledge into installable skills. When you install a skill like \`playwright-e2e\`, your AI agent gains:

- **Framework expertise**: Deep knowledge of Playwright APIs, patterns, and idioms
- **Testing patterns**: Page Object Model, fixtures, factory patterns, and more
- **Strategy guidance**: When to use which testing approach
- **Best practices**: From real-world test suites and QA teams

## The Future

We believe the future of QA is AI agents augmented with specialized testing knowledge. Not replacing QA engineers, but amplifying their expertise across entire organizations.

## Try It Now

Give your AI agent QA superpowers:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

Browse all 450+ skills at [qaskills.sh/skills](/skills).
`,
};

import { keywordGapBatch20260615Posts } from './_keyword-gap-batch';
import { gapfillBatch20260619Posts } from './_gapfill-batch';

export const posts: Record<string, BlogPost> = {
  'introducing-qaskills': introducingQaskills,
  'playwright-e2e-best-practices': playwrightBestPractices,
  'ai-agents-qa-revolution': aiAgentsRevolution,
  'must-have-qa-skills-claude-code-2026': mustHaveQaSkills,
  'how-ai-agents-changing-qa-testing': aiAgentsChangingQa,
  'playwright-e2e-complete-guide': playwrightGuide,
  'tdd-ai-agents-best-practices': tddBestPractices,
  'top-10-qa-skills-developers-2026': top10QaSkills,
  'cypress-vs-playwright-2026': cypressVsPlaywright,
  'fix-flaky-tests-guide': fixFlakyTests,
  'security-testing-ai-generated-code': securityTestingAiCode,
  'shift-left-testing-ai-agents': shiftLeftTesting,
  'api-testing-complete-guide': apiTestingGuide,
  'selenium-vs-playwright-2026': seleniumVsPlaywright,
  'jest-vs-vitest-2026': jestVsVitest,
  'playwright-tutorial-beginners-2026': playwrightTutorial,
  'cicd-testing-pipeline-github-actions': cicdPipeline,
  'ai-test-automation-tools-2026': aiTestAutomation,
  'vibe-testing-ai-first-qa-guide': vibeTestingGuide,
  'playwright-test-agents-claude-code': playwrightTestAgents,
  'testing-ai-generated-code-sdet-playbook': testingAiGeneratedCode,
  'autonomous-testing-agents-build-vs-buy': autonomousTestingBuildVsBuy,
  'mcp-for-qa-engineers-guide': mcpForQaEngineers,
  'k6-vs-jmeter-performance-testing': k6VsJmeter,
  'visual-regression-testing-guide': visualRegressionGuide,
  'api-contract-testing-microservices': apiContractTesting,
  'mobile-testing-automation-guide': mobileTestingGuide,
  'accessibility-testing-automation-guide': accessibilityTestingGuide,
  'mutation-testing-stryker-guide': mutationTestingGuide,
  'test-data-management-strategies': testDataManagement,
  'bdd-cucumber-testing-guide': bddCucumberGuide,
  'database-testing-automation-guide': databaseTestingGuide,
  'exploratory-testing-ai-agents-guide': exploratoryTestingGuide,
  'qa-engineer-skills-career-guide-2026': qaEngineerSkillsCareerGuide,
  'testing-legacy-code-refactoring-guide': testingLegacyCodeGuide,
  'playwright-vs-puppeteer-2026': playwrightVsPuppeteer,
  'testing-in-production-strategies': testingInProduction,
  'pytest-testing-complete-guide': pytestGuide,
  'selenium-grid-docker-parallel-testing': seleniumGridDocker,
  'postman-api-testing-guide': postmanApiGuide,
  'rest-assured-java-api-testing': restAssuredGuide,
  'regression-testing-strategies-guide': regressionTestingGuide,
  'smoke-testing-vs-sanity-testing': smokeVsSanity,
  'test-case-design-techniques-guide': testCaseDesign,
  'load-testing-beginners-guide': loadTestingGuide,
  'graphql-testing-complete-guide': graphqlTestingGuide,
  'chaos-engineering-resilience-testing': chaosEngineeringGuide,
  'websocket-testing-guide': websocketTestingGuide,
  'microservices-testing-strategies': microservicesTestingGuide,
  'test-automation-roi-business-case': testAutomationRoi,
  'cross-browser-testing-guide': crossBrowserGuide,
  'qa-metrics-kpis-dashboard-guide': qaMetricsGuide,
  'test-pyramid-testing-strategy': testPyramidGuide,
  'continuous-testing-devops-guide': continuousTestingGuide,
  'internationalization-testing-i18n-guide': i18nTestingGuide,
  'error-handling-testing-patterns': errorHandlingGuide,
  'api-mocking-service-virtualization-guide': apiMockingGuide,
  'test-reporting-allure-dashboards-guide': testReportingGuide,
  'performance-monitoring-testing-guide': performanceMonitoringGuide,
  'storybook-component-testing-guide': storybookTestingGuide,
  'test-planning-strategy-guide': testPlanningGuide,
  'code-review-qa-testing-guide': codeReviewQaGuide,
  'ai-test-generation-tools-guide': aiTestGenerationGuide,
  'testcontainers-docker-integration-testing': testcontainersDockerGuide,
  'ai-agent-testing-workflows-comparison': aiAgentTestingWorkflows,
  'react-nextjs-testing-complete-guide': reactNextjsTestingGuide,
  'test-automation-framework-architecture': testAutomationFrameworkArchitecture,
  'observability-driven-testing-guide': observabilityDrivenTestingGuide,
  'docker-testing-strategies-guide': dockerTestingGuide,
  'typescript-testing-patterns-guide': typescriptTestingGuide,
  'ai-powered-debugging-testing-guide': aiDebuggingGuide,
  'event-driven-architecture-testing-guide': eventDrivenTestingGuide,
  'serverless-testing-complete-guide': serverlessTestingGuide,
  'property-based-testing-complete-guide': propertyBasedTestingGuide,
  'testing-design-systems-component-libraries': designSystemsTestingGuide,
  'test-environment-management-guide': testEnvironmentGuide,
  'ai-code-review-qa-engineers-guide': aiCodeReviewGuide,
  'testing-llm-applications-guide': testingLlmAppsGuide,
  'cypress-e2e-testing-ai-agents-guide': cypressAiAgentsGuide,
  'selenium-testing-ai-agents-guide': seleniumAiAgentsGuide,
  'openapi-contract-testing-guide': openapiContractTestingGuide,
  'authentication-authorization-testing-guide': authzTestingGuide,
  'how-to-write-high-quality-qa-skills': qaSkillPublisherGuide,
  'state-of-ai-powered-testing-2026': stateOfAiTestingGuide,
  'qa-skills-for-cursor-2026': cursorSkillsGuide,
  'qa-skills-for-github-copilot-2026': copilotSkillsGuide,
  'qa-skills-for-windsurf-2026': windsurfSkillsGuide,
  'qa-skills-for-cline-2026': clineSkillsGuide,
  'webdriverio-testing-complete-guide': webdriverioGuide,
  'junit5-testing-java-guide': junit5Guide,
  'testng-vs-junit5-comparison': testngVsJunit5Guide,
  'mocha-chai-testing-guide': mochaChaiGuide,
  'robot-framework-testing-guide': robotFrameworkGuide,
  'rspec-ruby-testing-guide': rspecGuide,
  'phpunit-testing-complete-guide': phpunitGuide,
  'dotnet-testing-xunit-nunit-guide': dotnetTestingGuide,
  'bdd-frameworks-comparison-2026': bddComparisonGuide,
  'puppeteer-vs-playwright-testing': puppeteerVsPlaywrightGuide,
  'nightwatchjs-testing-guide': nightwatchGuide,
  'testcafe-e2e-testing-guide': testcafeGuide,
  'specflow-bdd-dotnet-guide': specflowGuide,
  'gauge-testing-complete-guide': gaugeGuide,
  'serenity-bdd-testing-guide': serenityBddGuide,
  'capybara-ruby-testing-guide': capybaraGuide,
  'selenide-java-testing-guide': selenideGuide,
  'laravel-testing-dusk-guide': laravelDuskGuide,
  'python-unittest-vs-pytest': pythonUnittestVsPytestGuide,
  'karma-jasmine-angular-testing': karmaJasmineGuide,
  'ai-qa-skills-directory-2026': aiQaSkillsDirectoryGuide,
  'migrating-test-frameworks-guide': migratingFrameworksGuide,
  'cypress-tutorial-beginners-2026': cypressTutorialBeginners,
  'selenium-python-tutorial-2026': seleniumPythonTutorial,
  'playwright-python-testing-guide': playwrightPythonGuide,
  'page-object-model-complete-guide': pomCompleteGuide,
  'data-driven-testing-complete-guide': dataDrivenTestingGuide,
  'agile-testing-complete-guide': agileTestingGuide,
  'api-automation-framework-guide': apiAutomationFramework,
  'performance-testing-complete-guide': perfTestingCompleteGuide,
  'security-testing-complete-guide': securityTestingCompleteGuide,
  'test-management-tools-comparison-2026': testManagementTools,
  'qa-lead-interview-questions-2026': qaLeadInterview,
  'automation-framework-design-patterns': frameworkDesignPatterns,
  'cucumber-bdd-tutorial-beginners': cucumberBddTutorial,
  'restassured-vs-karate-api-testing': restAssuredVsKarate,
  'selenium-grid-tutorial-parallel-testing': seleniumGridTutorial,
  'jira-for-qa-engineers-guide': jiraForQaGuide,
  'hybrid-automation-framework-guide': hybridFrameworkGuide,
  'devops-testing-strategy-guide': devopsTestingGuide,
  'test-automation-roadmap-2026': testAutoRoadmap,
  'playwright-vs-cypress-detailed-2026': pwVsCypressDetailed,
  'end-to-end-testing-best-practices': e2eBestPractices,
  'api-testing-best-practices-guide': apiBestPractices,
  'test-automation-metrics-kpis-guide': testMetricsKpis,
  'qa-salary-guide-worldwide-2026': qaSalaryGuide,
  'appium-mobile-testing-complete-guide': appiumMobileGuide,
  'test-automation-interview-questions-2026': testAutoInterviewQuestions,
  'playwright-mcp-browser-automation-guide': playwrightMcpGuide,
  'cypress-vs-selenium-vs-playwright-performance': cypressSeleniumPlaywrightPerf,
  'software-testing-types-complete-guide': softwareTestingTypes,
  'api-testing-tools-comparison-2026': apiTestingToolsComparison,
  'test-automation-with-ai-complete-guide': testAutoWithAi,
  'playwright-best-practices-2026': playwrightBestPractices2026,
  'selenium-tutorial-complete-beginners-2026': seleniumTutorialBeginners,
  'manual-to-automation-testing-transition': manualToAutomation,
  'github-actions-testing-ci-cd-guide': githubActionsTestingGuide,
  'web-testing-checklist-2026': webTestingChecklist,
  'selenium-vs-cypress-vs-playwright-2026': seleniumVsCypressVsPlaywright,
  'best-test-automation-frameworks-2026': bestTestFrameworks2026,
  'best-ai-testing-tools-2026': bestAiTestingTools,
  'how-to-install-skills-claude-code': installSkillsClaudeCode,
  'how-to-install-skills-cursor': installSkillsCursor,
  'playwright-agents-guide-2026': playwrightAgentsGuide,
  'agentic-testing-complete-guide': agenticTestingGuide,
  'mcp-testing-automation-guide': mcpTestingGuide,
  'sdet-interview-questions-2026': sdetInterviewQuestions,
  'qa-to-sdet-roadmap-2026': qaToSdetRoadmap,
  'vibe-testing-tools-comparison': vibeTestingToolsComparison,
  'skill-md-format-guide': skillMdFormatGuide,
  'ai-agent-eval-testing-guide': aiAgentEvalGuide,
  'playwright-vs-selenium-complete-2026': playwrightVsSeleniumComplete,
  'autonomous-qa-testing-guide': autonomousQaGuide,
  'python-vs-pytest-explained': pythonVsPytestExplained,
  'unittest-vs-pytest-2026': unittestVsPytest2026,
  'playwright-trace-viewer-complete-guide-2026': playwrightTraceViewer,
  'playwright-storagestate-authentication-reference': playwrightStorageState,
  'playwright-setinputfiles-file-upload-guide': playwrightSetInputFiles,
  'playwright-vs-cypress-2026-detailed-comparison': playwrightVsCypress2026Detailed,
  'playwright-vs-puppeteer-2026-deep-dive': playwrightVsPuppeteer2026Deep,
  'playwright-vs-selenium-2026-which-better': playwrightVsSelenium2026Which,
  'playwright-mcp-cursor-ide-setup-2026': playwrightMcpCursorSetup,
  'playwright-mcp-claude-code-setup-2026': playwrightMcpClaudeCodeSetup,
  'openai-evals-complete-guide-2026': openaiEvalsCompleteGuide,
  'openai-evals-best-practices-2026': openaiEvalsBestPractices,
  'promptfoo-complete-guide-2026': promptfooCompleteGuide,
  'promptfoo-red-teaming-llm-applications': promptfooRedTeaming,
  'best-claude-code-skills-for-testing-2026': bestClaudeCodeSkillsTesting,
  'best-claude-code-skills-for-automated-testing': bestClaudeCodeSkillsAutomated,
  'selenium-news-may-2026-updates': seleniumNewsMay2026,
  'selenium-webdriver-updates-2026-changelog': seleniumWebdriverUpdates,
  'cypress-best-practices-2026-guide': cypressBestPractices2026,
  'cypress-2026-latest-version-features': cypress2026LatestFeatures,
  'k6-vs-jmeter-2026-which-better': k6VsJmeter2026Which,
  'testcontainers-kafka-node-complete-guide': testcontainersKafkaNode,
  'selenide-allure-integration-complete-reference': selenideAllureIntegration,
  'selenide-shouldnot-exist-conditions-reference': selenideShouldnotConditions,
  'robot-framework-keyword-driven-testing-guide': robotFrameworkKeywordDriven,
  'best-ai-test-automation-tools-detailed-2026': bestAiTestAutomationToolsDetailed,
  'ai-defect-prediction-machine-learning-qa': aiDefectPredictionMachineLearningQa,
  'ai-test-data-generation-tools-2026': aiTestDataGenerationTools2026,
  'ai-test-generation-llm-prompting-guide': aiTestGenerationLlmPromptingGuide,
  'ai-test-maintenance-self-healing-strategies': aiTestMaintenanceSelfHealingStrategies,
  'aider-qa-engineers-guide': aiderQaEngineersGuide,
  'amp-ai-qa-engineers-guide': ampAiQaEngineersGuide,
  'apickli-cucumber-api-testing-guide': apickliCucumberApiTestingGuide,
  'applitools-visual-ai-testing-complete-guide': applitoolsVisualAiTestingCompleteGuide,
  'arize-phoenix-llm-evaluation-guide': arizePhoenixLlmEvaluationGuide,
  'artillery-node-load-testing-complete-guide': artilleryNodeLoadTestingCompleteGuide,
  'autonomous-testing-mabl-functionize-applitools': autonomousTestingMablFunctionizeApplitools,
  'bdd-test-data-management-best-practices': bddTestDataManagementBestPractices,
  'bdd-vs-tdd-decision-guide': bddVsTddDecisionGuide,
  'behave-python-bdd-complete-tutorial': behavePythonBddCompleteTutorial,
  'behavioral-interview-questions-qa-engineers': behavioralInterviewQuestionsQaEngineers,
  'bruno-api-testing-complete-guide': brunoApiTestingCompleteGuide,
  'chromatic-storybook-visual-testing-guide': chromaticStorybookVisualTestingGuide,
  'claude-code-qa-testing-workflows-2026': claudeCodeQaTestingWorkflows2026,
  'claude-for-qa-engineers-complete-guide': claudeForQaEngineersCompleteGuide,
  'claude-qa-agent-setup-guide': claudeQaAgentSetupGuide,
  'cline-qa-engineers-complete-guide': clineQaEngineersCompleteGuide,
  'codex-cli-qa-engineers-guide': codexCliQaEngineersGuide,
  'comparing-popular-bdd-frameworks-2026-complete-guide': comparingPopularBddFrameworks2026CompleteGuide,
  'continue-dev-qa-engineers-guide': continueDevQaEngineersGuide,
  'cucumber-java-bdd-best-practices-2026': cucumberJavaBddBestPractices2026,
  'cucumber-js-to-playwright-migration-guide': cucumberJsToPlaywrightMigrationGuide,
  'cucumber-ruby-bdd-complete-guide': cucumberRubyBddCompleteGuide,
  'cucumber-tags-hooks-complete-reference': cucumberTagsHooksCompleteReference,
  'cucumber-vs-behave-python-bdd-comparison': cucumberVsBehavePythonBddComparison,
  'cursor-for-qa-engineers-complete-guide': cursorForQaEngineersCompleteGuide,
  'cursor-playwright-skill-setup-guide': cursorPlaywrightSkillSetupGuide,
  'cursor-skills-md-best-practices': cursorSkillsMdBestPractices,
  'cypress-applitools-visual-testing-guide': cypressApplitoolsVisualTestingGuide,
  'cypress-axe-accessibility-testing-guide': cypressAxeAccessibilityTestingGuide,
  'cypress-component-testing-angular-guide': cypressComponentTestingAngularGuide,
  'cypress-component-testing-react-complete-guide': cypressComponentTestingReactCompleteGuide,
  'cypress-component-testing-vue-complete-guide': cypressComponentTestingVueCompleteGuide,
  'cypress-cucumber-bdd-preprocessor-guide': cypressCucumberBddPreprocessorGuide,
  'cypress-cucumber-preprocessor-bdd-guide': cypressCucumberPreprocessorBddGuide,
  'cypress-custom-commands-best-practices': cypressCustomCommandsBestPractices,
  'cypress-cy-session-authentication-guide': cypressCySessionAuthenticationGuide,
  'cypress-environments-config-best-practices': cypressEnvironmentsConfigBestPractices,
  'cypress-fixtures-data-management-guide': cypressFixturesDataManagementGuide,
  'cypress-github-actions-ci-guide-2026': cypressGithubActionsCiGuide2026,
  'cypress-image-snapshot-visual-guide': cypressImageSnapshotVisualGuide,
  'cypress-intercept-network-stubbing-reference': cypressInterceptNetworkStubbingReference,
  'cypress-mochawesome-allure-reporter-guide': cypressMochawesomeAllureReporterGuide,
  'cypress-percy-visual-testing-guide': cypressPercyVisualTestingGuide,
  'cypress-to-playwright-migration-complete-guide': cypressToPlaywrightMigrationCompleteGuide,
  'deepeval-pytest-llm-testing-guide': deepevalPytestLlmTestingGuide,
  'dredd-api-blueprint-testing-guide': dreddApiBlueprintTestingGuide,
  'enzyme-to-react-testing-library-migration-guide': enzymeToReactTestingLibraryMigrationGuide,
  'evidently-ai-llm-testing-guide': evidentlyAiLlmTestingGuide,
  'gatling-scala-load-testing-complete-guide': gatlingScalaLoadTestingCompleteGuide,
  'gauge-vs-cucumber-bdd-frameworks': gaugeVsCucumberBddFrameworks,
  'gemini-cli-qa-engineers-guide': geminiCliQaEngineersGuide,
  'github-copilot-qa-engineers-deep-guide': githubCopilotQaEngineersDeepGuide,
  'helicone-llm-monitoring-complete-guide': heliconeLlmMonitoringCompleteGuide,
  'hoppscotch-api-testing-complete-guide': hoppscotchApiTestingCompleteGuide,
  'insomnia-api-testing-complete-guide': insomniaApiTestingCompleteGuide,
  'jasmine-to-jest-migration-guide': jasmineToJestMigrationGuide,
  'jest-to-vitest-migration-guide': jestToVitestMigrationGuide,
  'jmeter-distributed-load-testing-complete-guide': jmeterDistributedLoadTestingCompleteGuide,
  'jmeter-vs-locust-vs-gatling-comparison': jmeterVsLocustVsGatlingComparison,
  'junit4-to-junit5-migration-guide': junit4ToJunit5MigrationGuide,
  'k6-browser-recorder-test-builder-guide': k6BrowserRecorderTestBuilderGuide,
  'k6-cloud-grafana-cloud-complete-guide': k6CloudGrafanaCloudCompleteGuide,
  'k6-extensions-xk6-complete-reference': k6ExtensionsXk6CompleteReference,
  'karate-bdd-api-testing-complete-guide': karateBddApiTestingCompleteGuide,
  'karate-dsl-bdd-api-testing-complete-guide': karateDslBddApiTestingCompleteGuide,
  'karma-to-jest-migration-guide': karmaToJestMigrationGuide,
  'katalon-studio-test-automation-complete-guide': katalonStudioTestAutomationCompleteGuide,
  'langchain-evaluators-complete-guide': langchainEvaluatorsCompleteGuide,
  'langsmith-evaluation-platform-guide': langsmithEvaluationPlatformGuide,
  'living-documentation-bdd-cucumber': livingDocumentationBddCucumber,
  'llm-evals-comparison-openai-promptfoo-ragas': llmEvalsComparisonOpenaiPromptfooRagas,
  'locust-python-load-testing-complete-guide': locustPythonLoadTestingCompleteGuide,
  'mocha-to-jest-migration-guide': mochaToJestMigrationGuide,
  'mockoon-api-mocking-tool-guide': mockoonApiMockingToolGuide,
  'neoload-tricentis-performance-testing-guide': neoloadTricentisPerformanceTestingGuide,
  'nightwatch-to-playwright-migration-guide': nightwatchToPlaywrightMigrationGuide,
  'openai-agent-evals-complete-guide-2026': openaiAgentEvalsCompleteGuide2026,
  'openai-evals-design-best-practices': openaiEvalsDesignBestPractices,
  'openai-evals-graders-complete-reference': openaiEvalsGradersCompleteReference,
  'pact-contract-testing-complete-guide-2026': pactContractTestingCompleteGuide2026,
  'pactflow-contract-testing-broker-guide': pactflowContractTestingBrokerGuide,
  'percy-visual-testing-complete-guide': percyVisualTestingCompleteGuide,
  'playwright-accessibility-testing-axe-complete-guide': playwrightAccessibilityTestingAxeCompleteGuide,
  'playwright-api-testing-context-request-guide': playwrightApiTestingContextRequestGuide,
  'playwright-best-practices-locators-2026': playwrightBestPracticesLocators2026,
  'playwright-browser-contexts-isolation-guide': playwrightBrowserContextsIsolationGuide,
  'playwright-ci-github-actions-complete-guide-2026': playwrightCiGithubActionsCompleteGuide2026,
  'playwright-clock-time-control-testing-guide': playwrightClockTimeControlTestingGuide,
  'playwright-codegen-recording-complete-guide': playwrightCodegenRecordingCompleteGuide,
  'playwright-component-testing-react-complete-guide': playwrightComponentTestingReactCompleteGuide,
  'playwright-component-testing-svelte-guide': playwrightComponentTestingSvelteGuide,
  'playwright-component-testing-vue-complete-guide': playwrightComponentTestingVueCompleteGuide,
  'playwright-cucumber-bdd-integration-guide': playwrightCucumberBddIntegrationGuide,
  'playwright-debug-mode-inspector-guide': playwrightDebugModeInspectorGuide,
  'playwright-emulation-geolocation-permissions-guide': playwrightEmulationGeolocationPermissionsGuide,
  'playwright-file-download-handling-guide': playwrightFileDownloadHandlingGuide,
  'playwright-fixtures-complete-reference-2026': playwrightFixturesCompleteReference2026,
  'playwright-iframe-shadow-dom-guide': playwrightIframeShadowDomGuide,
  'playwright-keyboard-mouse-interactions-reference': playwrightKeyboardMouseInteractionsReference,
  'playwright-locator-strategies-getbyrole-guide': playwrightLocatorStrategiesGetbyroleGuide,
  'playwright-mcp-accessibility-snapshots-reference': playwrightMcpAccessibilitySnapshotsReference,
  'playwright-mcp-server-configuration-2026': playwrightMcpServerConfiguration2026,
  'playwright-mobile-emulation-devices-reference': playwrightMobileEmulationDevicesReference,
  'playwright-multi-page-popup-handling-guide': playwrightMultiPagePopupHandlingGuide,
  'playwright-network-mocking-route-handler-guide': playwrightNetworkMockingRouteHandlerGuide,
  'playwright-parallel-sharding-execution-guide': playwrightParallelShardingExecutionGuide,
  'playwright-retries-flaky-test-handling-guide': playwrightRetriesFlakyTestHandlingGuide,
  'playwright-screenshots-videos-traces-complete-guide': playwrightScreenshotsVideosTracesCompleteGuide,
  'playwright-test-agents-planner-generator-healer-guide': playwrightTestAgentsPlannerGeneratorHealerGuide,
  'playwright-test-config-options-complete-reference': playwrightTestConfigOptionsCompleteReference,
  'playwright-test-reporters-html-allure-junit-guide': playwrightTestReportersHtmlAllureJunitGuide,
  'playwright-ui-mode-complete-2026-guide': playwrightUiModeComplete2026Guide,
  'playwright-visual-comparison-snapshots-guide': playwrightVisualComparisonSnapshotsGuide,
  'promptfoo-vs-openai-evals-comparison-2026': promptfooVsOpenaiEvalsComparison2026,
  'protractor-to-playwright-migration-guide': protractorToPlaywrightMigrationGuide,
  'puppeteer-to-playwright-migration-guide': puppeteerToPlaywrightMigrationGuide,
  'qa-engineer-vs-sdet-vs-test-architect': qaEngineerVsSdetVsTestArchitect,
  'ragas-context-precision-recall-faithfulness-guide': ragasContextPrecisionRecallFaithfulnessGuide,
  'ragas-rag-evaluation-metrics-complete-guide': ragasRagEvaluationMetricsCompleteGuide,
  'ranorex-test-automation-2026-guide': ranorexTestAutomation2026Guide,
  'rest-assured-vs-karate-detailed-comparison-2026': restAssuredVsKarateDetailedComparison2026,
  'robot-framework-api-testing-requests-library': robotFrameworkApiTestingRequestsLibrary,
  'robot-framework-appium-mobile-testing-guide': robotFrameworkAppiumMobileTestingGuide,
  'robot-framework-browser-library-playwright-guide': robotFrameworkBrowserLibraryPlaywrightGuide,
  'robot-framework-ci-cd-jenkins-github-actions': robotFrameworkCiCdJenkinsGithubActions,
  'robot-framework-custom-libraries-python-guide': robotFrameworkCustomLibrariesPythonGuide,
  'robot-framework-data-driven-testing-complete-guide': robotFrameworkDataDrivenTestingCompleteGuide,
  'robot-framework-database-testing-library-guide': robotFrameworkDatabaseTestingLibraryGuide,
  'robot-framework-listeners-complete-reference': robotFrameworkListenersCompleteReference,
  'robot-framework-pabot-parallel-execution-guide': robotFrameworkPabotParallelExecutionGuide,
  'robot-framework-pytest-integration-guide': robotFrameworkPytestIntegrationGuide,
  'robot-framework-rest-instance-library-guide': robotFrameworkRestInstanceLibraryGuide,
  'robot-framework-selenium-library-complete-reference': robotFrameworkSeleniumLibraryCompleteReference,
  'robot-framework-sms-otp-testing-complete-guide': robotFrameworkSmsOtpTestingCompleteGuide,
  'robot-framework-tags-tagging-best-practices': robotFrameworkTagsTaggingBestPractices,
  'robot-framework-wait-until-keyword-succeeds-guide': robotFrameworkWaitUntilKeywordSucceedsGuide,
  'sdet-mock-interview-questions-with-answers': sdetMockInterviewQuestionsWithAnswers,
  'sdet-roadmap-day-by-day-90-day-plan': sdetRoadmapDayByDay90DayPlan,
  'selenide-allureselenide-includeselenidesteps-reference': selenideAllureselenideIncludeselenidestepsReference,
  'selenide-collection-shouldhave-reference': selenideCollectionShouldhaveReference,
  'selenide-condition-cheatsheet-2026': selenideConditionCheatsheet2026,
  'selenide-file-download-upload-guide': selenideFileDownloadUploadGuide,
  'selenide-grid-parallel-testing-guide': selenideGridParallelTestingGuide,
  'selenide-headless-chromium-firefox-guide': selenideHeadlessChromiumFirefoxGuide,
  'selenide-iframe-handling-complete-guide': selenideIframeHandlingCompleteGuide,
  'selenide-junit5-spring-boot-integration': selenideJunit5SpringBootIntegration,
  'selenide-page-factory-complete-guide': selenidePageFactoryCompleteGuide,
  'selenide-page-object-pattern-best-practices': selenidePageObjectPatternBestPractices,
  'selenide-screenshot-on-failure-guide': selenideScreenshotOnFailureGuide,
  'selenide-shadow-dom-elements-guide': selenideShadowDomElementsGuide,
  'selenide-soft-assertions-complete-reference': selenideSoftAssertionsCompleteReference,
  'selenide-vs-selenium-webdriver-2026': selenideVsSeleniumWebdriver2026,
  'selenide-wait-strategies-explicit-implicit': selenideWaitStrategiesExplicitImplicit,
  'selenium-allure-reporting-java-complete-guide': seleniumAllureReportingJavaCompleteGuide,
  'selenium-azure-devops-pipeline-guide': seleniumAzureDevopsPipelineGuide,
  'selenium-bidirectional-bidi-protocol-guide': seleniumBidirectionalBidiProtocolGuide,
  'selenium-cdp-chrome-devtools-protocol-guide': seleniumCdpChromeDevtoolsProtocolGuide,
  'selenium-cucumber-java-bdd-complete-guide': seleniumCucumberJavaBddCompleteGuide,
  'selenium-grid-3-to-4-migration-guide': seleniumGrid3To4MigrationGuide,
  'selenium-grid-4-docker-kubernetes-guide': seleniumGrid4DockerKubernetesGuide,
  'selenium-java-testng-page-object-guide': seleniumJavaTestngPageObjectGuide,
  'selenium-jenkins-pipeline-complete-guide': seleniumJenkinsPipelineCompleteGuide,
  'selenium-manager-browser-driver-2026': seleniumManagerBrowserDriver2026,
  'selenium-python-pytest-integration-complete-guide': seleniumPythonPytestIntegrationCompleteGuide,
  'selenium-to-playwright-migration-guide-2026': seleniumToPlaywrightMigrationGuide2026,
  'self-healing-test-automation-tools-comparison-2026': selfHealingTestAutomationToolsComparison2026,
  'specflow-net-bdd-2026-complete-guide': specflowNetBdd2026CompleteGuide,
  'specflow-vs-cucumber-detailed-comparison': specflowVsCucumberDetailedComparison,
  'spring-cloud-contract-testing-guide': springCloudContractTestingGuide,
  'supertest-node-api-testing-complete-guide': supertestNodeApiTestingCompleteGuide,
  'swagger-openapi-spec-validation-guide': swaggerOpenapiSpecValidationGuide,
  'tavern-pytest-api-testing-complete-guide': tavernPytestApiTestingCompleteGuide,
  'test-architect-roadmap-2026': testArchitectRoadmap2026,
  'test-automation-engineer-resume-template': testAutomationEngineerResumeTemplate,
  'testcafe-to-playwright-migration-guide': testcafeToPlaywrightMigrationGuide,
  'testcontainers-best-practices-2026': testcontainersBestPractices2026,
  'testcontainers-dotnet-database-testing-guide': testcontainersDotnetDatabaseTestingGuide,
  'testcontainers-elasticsearch-node-guide': testcontainersElasticsearchNodeGuide,
  'testcontainers-go-database-testing-guide': testcontainersGoDatabaseTestingGuide,
  'testcontainers-kafka-java-spring-boot-guide': testcontainersKafkaJavaSpringBootGuide,
  'testcontainers-localstack-aws-mocking-guide': testcontainersLocalstackAwsMockingGuide,
  'testcontainers-mongodb-node-integration-testing': testcontainersMongodbNodeIntegrationTesting,
  'testcontainers-mysql-node-integration-testing': testcontainersMysqlNodeIntegrationTesting,
  'testcontainers-postgres-java-spring-boot-guide': testcontainersPostgresJavaSpringBootGuide,
  'testcontainers-postgresql-node-complete-guide': testcontainersPostgresqlNodeCompleteGuide,
  'testcontainers-python-pytest-integration-guide': testcontainersPythonPytestIntegrationGuide,
  'testcontainers-rabbitmq-node-integration-testing': testcontainersRabbitmqNodeIntegrationTesting,
  'testcontainers-redis-node-complete-guide': testcontainersRedisNodeCompleteGuide,
  'testcontainers-rust-integration-testing-guide': testcontainersRustIntegrationTestingGuide,
  'testcontainers-selenium-grid-guide': testcontainersSeleniumGridGuide,
  'testim-vs-mabl-vs-functionize-comparison': testimVsMablVsFunctionizeComparison,
  'testsigma-codeless-automation-guide': testsigmaCodelessAutomationGuide,
  'tricentis-tosca-codeless-testing-guide': tricentisToscaCodelessTestingGuide,
  'trulens-llm-evaluation-framework-guide': trulensLlmEvaluationFrameworkGuide,
  'webdriverio-to-playwright-migration-guide': webdriverioToPlaywrightMigrationGuide,
  'weights-biases-llm-evals-guide': weightsBiasesLlmEvalsGuide,
  'windsurf-qa-engineers-complete-guide': windsurfQaEngineersCompleteGuide,
  'wiremock-api-mocking-complete-guide': wiremockApiMockingCompleteGuide,
  'wrk-wrk2-http-benchmarking-guide': wrkWrk2HttpBenchmarkingGuide,
  'zed-ai-qa-engineers-guide': zedAiQaEngineersGuide,
  'what-is-pytest-python-explained': whatIsPytestPythonExplained,
  'pytest-best-practices-2026': pytestBestPractices2026,
  'jest-mock-vs-mockimplementation-guide': jestMockVsMockImplementationGuide,
  'vitest-4-migration-guide-breaking-changes': vitest4MigrationGuideBreakingChanges,
  'testcontainers-reuse-withreuse-node-guide': testcontainersReuseWithReuseNodeGuide,
  'rag-evaluation-metrics-complete-2026': ragEvaluationMetricsComplete2026,
  'rag-regression-testing-guide': ragRegressionTestingGuide,
  'openai-evals-trace-grading-complete-guide': openaiEvalsTraceGradingCompleteGuide,
  'agent-browser-complete-guide-2026': agentBrowserCompleteGuide2026,
  'cursor-skill-md-frontmatter-schema-guide': cursorSkillMdFrontmatterSchemaGuide,
  'testrail-vs-zephyr-scale-2026': testrailVsZephyrScale2026,
  'xray-test-management-pricing-2026': xrayTestManagementPricing2026,
  'best-test-management-tools-beyond-testrail-2026': bestTestManagementToolsBeyondTestrail2026,
  'playwright-vs-cypress-nextjs-e2e-2026': playwrightVsCypressNextjsE2e2026,
  'playwright-vs-rest-assured-api-testing': playwrightVsRestAssuredApiTesting,
  'playwright-multiple-tabs-windows-guide': playwrightMultipleTabsWindowsGuide,
  'playwright-page-evaluate-complete-guide': playwrightPageEvaluateCompleteGuide,
  'playwright-test-step-annotations-guide': playwrightTestStepAnnotationsGuide,
  'playwright-locator-filter-visible-reference': playwrightLocatorFilterVisibleReference,
  'playwright-vs-puppeteer-bundle-size-2026': playwrightVsPuppeteerBundleSize2026,
  'ai-accessibility-testing-tools-2026': aiAccessibilityTestingTools2026,
  'ai-mobile-test-automation-2026': aiMobileTestAutomation2026,
  'best-cheap-ai-e2e-testing-tools-2026': bestCheapAiE2eTestingTools2026,
  'how-to-detect-ai-generated-code-2026': howToDetectAiGeneratedCode2026,
  'migrate-selenium-to-playwright-checklist-2026': migrateSeleniumToPlaywrightChecklist2026,
  'bdd-test-management-tools-2026': bddTestManagementTools2026,
  'chromatic-turbosnap-storybook-guide': chromaticTurbosnapStorybookGuide,
  'cypress-aliases-before-each-guide': cypressAliasesBeforeEachGuide,
  'cypress-component-testing-react-router-guide': cypressComponentTestingReactRouterGuide,
  'insomnia-tutorial-complete-engineers-guide': insomniaTutorialCompleteEngineersGuide,
  'jmeter-response-assertion-jmx-guide': jmeterResponseAssertionJmxGuide,
  'keyword-driven-testing-python-guide': keywordDrivenTestingPythonGuide,
  'localstack-bedrock-mock-testing-guide': localstackBedrockMockTestingGuide,
  'mabl-vs-playwright-comparison-2026': mablVsPlaywrightComparison2026,
  'pact-consumer-driven-contract-reference-2026': pactConsumerDrivenContractReference2026,
  'percy-playwright-visual-testing-guide': percyPlaywrightVisualTestingGuide,
  'playwright-allure-attachment-trace-guide': playwrightAllureAttachmentTraceGuide,
  'playwright-apirequestcontext-storagestate-guide': playwrightApirequestcontextStoragestateGuide,
  'playwright-blob-reporter-guide': playwrightBlobReporterGuide,
  'playwright-browsers-path-env-guide': playwrightBrowsersPathEnvGuide,
  'playwright-codegen-cli-flags-reference': playwrightCodegenCliFlagsReference,
  'playwright-install-proxy-mirror-guide': playwrightInstallProxyMirrorGuide,
  'playwright-mcp-cursor-troubleshooting-guide': playwrightMcpCursorTroubleshootingGuide,
  'playwright-mcp-json-configuration-reference': playwrightMcpJsonConfigurationReference,
  'playwright-python-authentication-storage-state-guide': playwrightPythonAuthenticationStorageStateGuide,
  'playwright-python-codegen-guide': playwrightPythonCodegenGuide,
  'playwright-python-file-upload-guide': playwrightPythonFileUploadGuide,
  'playwright-testing-best-practices-2026': playwrightTestingBestPractices2026,
  'robot-framework-builtin-keywords-reference': robotFrameworkBuiltinKeywordsReference,
  'robot-framework-seleniumlibrary-locators-guide': robotFrameworkSeleniumlibraryLocatorsGuide,
  'selenide-configuration-baseurl-guide': selenideConfigurationBaseurlGuide,
  'selenide-cssclass-condition-reference': selenideCssclassConditionReference,
  'selenium-cdp-add-script-evaluate-guide': seleniumCdpAddScriptEvaluateGuide,
  'selenium-webdriver-bidi-2026-reference': seleniumWebdriverBidi2026Reference,
  'test-automation-roi-business-value-guide': testAutomationRoiBusinessValueGuide,
  'twilio-sms-otp-testing-python-guide': twilioSmsOtpTestingPythonGuide,
  'webdriverio-visual-service-blockout-guide': webdriverioVisualServiceBlockoutGuide,
  'appium-2-mobile-automation-reference-2026': appium2MobileAutomationReference2026,
  'cypress-vs-playwright-component-testing-2026': cypressVsPlaywrightComponentTesting2026,
  'github-actions-e2e-deployed-url-testing-guide': githubActionsE2eDeployedUrlTestingGuide,
  'openai-mcp-support-guide-2026': openaiMcpSupportGuide2026,
  'pytest-official-reference-cheatsheet-2026': pytestOfficialReferenceCheatsheet2026,
  'testing-otp-sms-phone-flows-complete-guide': testingOtpSmsPhoneFlowsCompleteGuide,
  'playwright-network-interception-mocking-guide': playwrightNetworkInterceptionMockingGuide,
  'playwright-global-setup-teardown-guide': playwrightGlobalSetupTeardownGuide,
  'synthetic-monitoring-playwright-guide': syntheticMonitoringPlaywrightGuide,
  'pytest-xdist-parallel-testing-guide': pytestXdistParallelTestingGuide,
  'pytest-asyncio-testing-guide': pytestAsyncioTestingGuide,
  'promptfoo-vs-deepeval-2026-comparison': promptfooVsDeepeval2026Comparison,
  'langfuse-vs-langsmith-2026-comparison': langfuseVsLangsmith2026Comparison,
  'deepeval-vs-ragas-rag-evaluation-2026': deepevalVsRagasRagEvaluation2026,
  'k6-thresholds-checks-complete-guide': k6ThresholdsChecksCompleteGuide,
  'cursor-vs-claude-code-testing-2026': cursorVsClaudeCodeTesting2026,
  'playwright-aria-snapshot-testing-guide': playwrightAriaSnapshotTestingGuide,
  'playwright-locator-describe-tracing-group-guide': playwrightLocatorDescribeTracingGroupGuide,
  'playwright-clock-api-time-testing-guide': playwrightClockApiTimeTestingGuide,
  'pytest-benchmark-performance-testing-guide': pytestBenchmarkPerformanceTestingGuide,
  'pytest-bdd-gherkin-tutorial-2026': pytestBddGherkinTutorial2026,
  'k6-browser-module-testing-guide': k6BrowserModuleTestingGuide,
  'claude-code-subagents-testing-workflow-2026': claudeCodeSubagentsTestingWorkflow2026,
  'promptfoo-red-teaming-guide-2026': promptfooRedTeamingGuide2026,
  'deepeval-metrics-complete-guide-2026': deepevalMetricsCompleteGuide2026,
  'llm-guardrails-testing-guide-2026': llmGuardrailsTestingGuide2026,
  'playwright-test-agents-planner-generator-healer-official-2026': playwrightTestAgentsPlannerGeneratorHealer2026,
  'openai-evals-graders-complete-reference-2026': openaiEvalsGradersReference2026,
  'openai-agent-evals-datasets-workflow-guide-2026': openaiAgentEvalsDatasetsWorkflow2026,
  'ragas-faithfulness-answer-relevancy-context-precision-recall-reference-2026': ragasFaithfulnessContextPrecisionRecall2026,
  'trulens-rag-triad-groundedness-context-relevance-2026': trulensRagTriad2026,
  'deepeval-rag-evaluation-metrics-reference-2026': deepevalRagEvaluationMetrics2026,
  'arize-phoenix-llm-observability-tracing-evaluations-2026': arizePhoenixLlmObservability2026,
  'axe-core-playwright-accessibility-testing-2026': axeCorePlaywrightAccessibility2026,
  'selenium-webdriver-bidi-2026-official-reference': seleniumWebdriverBidi2026OfficialReference,
  'selenium-manager-4-6-driver-management-2026-guide': seleniumManager46DriverManagement2026,
  'pytest-fixtures-conftest-complete-guide-2026': pytestFixturesConftestCompleteGuide2026,
  'pytest-parametrize-complete-guide-2026': pytestParametrizeCompleteGuide2026,
  'pytest-coverage-pytest-cov-guide-2026': pytestCoveragePytestCovGuide2026,
  'vitest-mocking-vi-mock-complete-guide': vitestMockingViMockCompleteGuide,
  'selenium-4-relative-locators-guide-2026': selenium4RelativeLocatorsGuide2026,
  'playwright-soft-assertions-expect-guide': playwrightSoftAssertionsExpectGuide,
  'github-actions-playwright-matrix-guide-2026': githubActionsPlaywrightMatrixGuide2026,
  'api-contract-testing-schemathesis-guide': apiContractTestingSchemathesisGuide,
  'llm-as-judge-evaluation-guide-2026': llmAsJudgeEvaluationGuide2026,
  'prompt-injection-testing-guide-2026': promptInjectionTestingGuide2026,
  'playwright-component-testing-react-guide': pwComponentTestingReact,
  'playwright-network-interception-route-guide': pwNetworkInterceptionRoute,
  'pytest-fixtures-scope-complete-guide': pytestFixturesScope,
  'vitest-browser-mode-complete-guide': vitestBrowserMode,
  'msw-api-mocking-complete-guide': mswApiMocking,
  'contract-testing-pact-complete-guide': contractTestingPact,
  'deepeval-vs-ragas-vs-promptfoo-2026': deepevalVsRagasVsPromptfoo,
  'self-healing-test-automation-2026': selfHealingTestAutomation,
  'mcp-server-testing-guide-2026': mcpServerTesting,
  'maestro-mobile-testing-guide-2026': maestroMobileTesting,
  'vitest-vs-jest-2026': vitestVsJest2026,
  'playwright-vs-selenium-python-2026': playwrightVsSeleniumPython2026,
  'appium-vs-playwright-2026': appiumVsPlaywright2026,
  'webdriverio-vs-playwright-2026': webdriverioVsPlaywright2026,
  'cucumber-vs-playwright-2026': cucumberVsPlaywright2026,
  'robot-framework-vs-playwright-2026': robotFrameworkVsPlaywright2026,
  'detox-vs-appium-2026': detoxVsAppium2026,
  'playwright-visual-regression-testing-guide': playwrightVisualRegressionTesting,
  'stagehand-ai-browser-automation-guide-2026': stagehandAiBrowserAutomation2026,
  'midscene-ai-visual-testing-guide-2026': midsceneAiVisualTesting2026,
  'playwright-browsers-path-environment-variable-reference': playwrightBrowsersPathRef,
  'postman-vs-playwright': postmanVsPlaywright,
  'playwright-file-upload-setinputfiles': playwrightFileUploadSetInputFiles,
  'whats-new-in-playwright-2026': whatsNewPlaywright2026,
  'playwright-mobile-emulation': playwrightMobileEmulation,
  'pyunit-vs-pytest': pyunitVsPytest,
  'testrigor-vs-playwright': testrigorVsPlaywright,
  'vitest-3-to-4-migration': vitest3To4Migration,
  'k6-vs-jmeter-2026': k6VsJmeter2026,
  'unittest-mock-vs-pytest-mock-guide': unittestMockVsPytestMock,
  'playwright-browsers-path-environment-variable-guide': playwrightBrowsersPathGuide,
  'playwright-file-upload-setinputfiles-guide': playwrightSetInputFilesGuide,
  'playwright-1-59-agentic-release-features-guide': playwright159AgenticRelease,
  'playwright-await-using-automatic-cleanup-guide': playwrightAwaitUsingCleanup,
  'playwright-screencast-api-video-recording-guide': playwrightScreencastApiGuide,
  'chrome-for-testing-vs-chromium-playwright': chromeForTestingVsChromium,
  'self-healing-test-automation-2026-guide': selfHealingTestAutomation2026,
  'ai-augmented-software-testing-2026-guide': aiAugmentedSoftwareTesting2026,
  'k6-grafana-cloud-load-testing-tutorial-2026': k6GrafanaCloudLoadTesting2026,
  'bidirectional-contract-testing-pact-2026': bidirectionalContractTestingPact2026,
  ...Object.fromEntries(playwrightLongTail2026Posts.map(({ slug, post }) => [slug, post])),
  ...Object.fromEntries(generatedSeoBatch2026Posts.map(({ slug, post }) => [slug, post])),
  ...Object.fromEntries(seoPriorityOverrides2026.map(({ slug, post }) => [slug, post])),
  ...Object.fromEntries(keywordGapBatch20260615Posts.map(({ slug, post }) => [slug, post])),
  ...Object.fromEntries(gapfillBatch20260619Posts.map(({ slug, post }) => [slug, post])),
};

// Ordered list for the blog listing page (newest first)
export const postList = [
  {
    slug: 'cypress-tutorial-beginners-2026',
    ...cypressTutorialBeginners,
  },
  {
    slug: 'selenium-python-tutorial-2026',
    ...seleniumPythonTutorial,
  },
  {
    slug: 'playwright-python-testing-guide',
    ...playwrightPythonGuide,
  },
  {
    slug: 'page-object-model-complete-guide',
    ...pomCompleteGuide,
  },
  {
    slug: 'data-driven-testing-complete-guide',
    ...dataDrivenTestingGuide,
  },
  {
    slug: 'agile-testing-complete-guide',
    ...agileTestingGuide,
  },
  {
    slug: 'api-automation-framework-guide',
    ...apiAutomationFramework,
  },
  {
    slug: 'performance-testing-complete-guide',
    ...perfTestingCompleteGuide,
  },
  {
    slug: 'security-testing-complete-guide',
    ...securityTestingCompleteGuide,
  },
  {
    slug: 'test-management-tools-comparison-2026',
    ...testManagementTools,
  },
  {
    slug: 'qa-lead-interview-questions-2026',
    ...qaLeadInterview,
  },
  {
    slug: 'automation-framework-design-patterns',
    ...frameworkDesignPatterns,
  },
  {
    slug: 'cucumber-bdd-tutorial-beginners',
    ...cucumberBddTutorial,
  },
  {
    slug: 'restassured-vs-karate-api-testing',
    ...restAssuredVsKarate,
  },
  {
    slug: 'selenium-grid-tutorial-parallel-testing',
    ...seleniumGridTutorial,
  },
  {
    slug: 'jira-for-qa-engineers-guide',
    ...jiraForQaGuide,
  },
  {
    slug: 'hybrid-automation-framework-guide',
    ...hybridFrameworkGuide,
  },
  {
    slug: 'devops-testing-strategy-guide',
    ...devopsTestingGuide,
  },
  {
    slug: 'test-automation-roadmap-2026',
    ...testAutoRoadmap,
  },
  {
    slug: 'playwright-vs-cypress-detailed-2026',
    ...pwVsCypressDetailed,
  },
  {
    slug: 'end-to-end-testing-best-practices',
    ...e2eBestPractices,
  },
  {
    slug: 'api-testing-best-practices-guide',
    ...apiBestPractices,
  },
  {
    slug: 'test-automation-metrics-kpis-guide',
    ...testMetricsKpis,
  },
  {
    slug: 'qa-salary-guide-worldwide-2026',
    ...qaSalaryGuide,
  },
  {
    slug: 'appium-mobile-testing-complete-guide',
    ...appiumMobileGuide,
  },
  {
    slug: 'test-automation-interview-questions-2026',
    ...testAutoInterviewQuestions,
  },
  {
    slug: 'playwright-mcp-browser-automation-guide',
    ...playwrightMcpGuide,
  },
  {
    slug: 'cypress-vs-selenium-vs-playwright-performance',
    ...cypressSeleniumPlaywrightPerf,
  },
  {
    slug: 'software-testing-types-complete-guide',
    ...softwareTestingTypes,
  },
  {
    slug: 'api-testing-tools-comparison-2026',
    ...apiTestingToolsComparison,
  },
  {
    slug: 'test-automation-with-ai-complete-guide',
    ...testAutoWithAi,
  },
  {
    slug: 'playwright-best-practices-2026',
    ...playwrightBestPractices2026,
  },
  {
    slug: 'selenium-tutorial-complete-beginners-2026',
    ...seleniumTutorialBeginners,
  },
  {
    slug: 'manual-to-automation-testing-transition',
    ...manualToAutomation,
  },
  {
    slug: 'github-actions-testing-ci-cd-guide',
    ...githubActionsTestingGuide,
  },
  {
    slug: 'web-testing-checklist-2026',
    ...webTestingChecklist,
  },
  {
    slug: 'selenium-vs-cypress-vs-playwright-2026',
    ...seleniumVsCypressVsPlaywright,
  },
  {
    slug: 'best-test-automation-frameworks-2026',
    ...bestTestFrameworks2026,
  },
  {
    slug: 'best-ai-testing-tools-2026',
    ...bestAiTestingTools,
  },
  {
    slug: 'how-to-install-skills-claude-code',
    ...installSkillsClaudeCode,
  },
  {
    slug: 'how-to-install-skills-cursor',
    ...installSkillsCursor,
  },
  {
    slug: 'playwright-agents-guide-2026',
    ...playwrightAgentsGuide,
  },
  {
    slug: 'agentic-testing-complete-guide',
    ...agenticTestingGuide,
  },
  {
    slug: 'mcp-testing-automation-guide',
    ...mcpTestingGuide,
  },
  {
    slug: 'sdet-interview-questions-2026',
    ...sdetInterviewQuestions,
  },
  {
    slug: 'qa-to-sdet-roadmap-2026',
    ...qaToSdetRoadmap,
  },
  {
    slug: 'vibe-testing-tools-comparison',
    ...vibeTestingToolsComparison,
  },
  {
    slug: 'skill-md-format-guide',
    ...skillMdFormatGuide,
  },
  {
    slug: 'ai-agent-eval-testing-guide',
    ...aiAgentEvalGuide,
  },
  {
    slug: 'playwright-vs-selenium-complete-2026',
    ...playwrightVsSeleniumComplete,
  },
  {
    slug: 'autonomous-qa-testing-guide',
    ...autonomousQaGuide,
  },
  ...playwrightLongTail2026Posts.map(({ slug, post }) => ({
    slug,
    ...post,
  })),
  {
    slug: 'ai-qa-skills-directory-2026',
    ...aiQaSkillsDirectoryGuide,
  },
  {
    slug: 'migrating-test-frameworks-guide',
    ...migratingFrameworksGuide,
  },
  {
    slug: 'webdriverio-testing-complete-guide',
    ...webdriverioGuide,
  },
  {
    slug: 'junit5-testing-java-guide',
    ...junit5Guide,
  },
  {
    slug: 'testng-vs-junit5-comparison',
    ...testngVsJunit5Guide,
  },
  {
    slug: 'mocha-chai-testing-guide',
    ...mochaChaiGuide,
  },
  {
    slug: 'robot-framework-testing-guide',
    ...robotFrameworkGuide,
  },
  {
    slug: 'rspec-ruby-testing-guide',
    ...rspecGuide,
  },
  {
    slug: 'phpunit-testing-complete-guide',
    ...phpunitGuide,
  },
  {
    slug: 'dotnet-testing-xunit-nunit-guide',
    ...dotnetTestingGuide,
  },
  {
    slug: 'bdd-frameworks-comparison-2026',
    ...bddComparisonGuide,
  },
  {
    slug: 'puppeteer-vs-playwright-testing',
    ...puppeteerVsPlaywrightGuide,
  },
  {
    slug: 'nightwatchjs-testing-guide',
    ...nightwatchGuide,
  },
  {
    slug: 'testcafe-e2e-testing-guide',
    ...testcafeGuide,
  },
  {
    slug: 'specflow-bdd-dotnet-guide',
    ...specflowGuide,
  },
  {
    slug: 'gauge-testing-complete-guide',
    ...gaugeGuide,
  },
  {
    slug: 'serenity-bdd-testing-guide',
    ...serenityBddGuide,
  },
  {
    slug: 'capybara-ruby-testing-guide',
    ...capybaraGuide,
  },
  {
    slug: 'selenide-java-testing-guide',
    ...selenideGuide,
  },
  {
    slug: 'laravel-testing-dusk-guide',
    ...laravelDuskGuide,
  },
  {
    slug: 'python-unittest-vs-pytest',
    ...pythonUnittestVsPytestGuide,
  },
  {
    slug: 'karma-jasmine-angular-testing',
    ...karmaJasmineGuide,
  },
  {
    slug: 'state-of-ai-powered-testing-2026',
    ...stateOfAiTestingGuide,
  },
  ...seoPriorityOverrides2026.map(({ slug, post }) => ({
    slug,
    ...post,
  })),
  {
    slug: 'how-to-write-high-quality-qa-skills',
    ...qaSkillPublisherGuide,
  },
  {
    slug: 'cypress-e2e-testing-ai-agents-guide',
    ...cypressAiAgentsGuide,
  },
  {
    slug: 'selenium-testing-ai-agents-guide',
    ...seleniumAiAgentsGuide,
  },
  {
    slug: 'openapi-contract-testing-guide',
    ...openapiContractTestingGuide,
  },
  {
    slug: 'authentication-authorization-testing-guide',
    ...authzTestingGuide,
  },
  {
    slug: 'qa-skills-for-cursor-2026',
    ...cursorSkillsGuide,
  },
  {
    slug: 'qa-skills-for-github-copilot-2026',
    ...copilotSkillsGuide,
  },
  {
    slug: 'qa-skills-for-windsurf-2026',
    ...windsurfSkillsGuide,
  },
  {
    slug: 'qa-skills-for-cline-2026',
    ...clineSkillsGuide,
  },
  {
    slug: 'testing-llm-applications-guide',
    ...testingLlmAppsGuide,
  },
  {
    slug: 'ai-code-review-qa-engineers-guide',
    ...aiCodeReviewGuide,
  },
  {
    slug: 'test-environment-management-guide',
    ...testEnvironmentGuide,
  },
  {
    slug: 'testing-design-systems-component-libraries',
    ...designSystemsTestingGuide,
  },
  {
    slug: 'property-based-testing-complete-guide',
    ...propertyBasedTestingGuide,
  },
  {
    slug: 'serverless-testing-complete-guide',
    ...serverlessTestingGuide,
  },
  {
    slug: 'event-driven-architecture-testing-guide',
    ...eventDrivenTestingGuide,
  },
  {
    slug: 'ai-powered-debugging-testing-guide',
    ...aiDebuggingGuide,
  },
  {
    slug: 'typescript-testing-patterns-guide',
    ...typescriptTestingGuide,
  },
  {
    slug: 'docker-testing-strategies-guide',
    ...dockerTestingGuide,
  },
  {
    slug: 'observability-driven-testing-guide',
    ...observabilityDrivenTestingGuide,
  },
  {
    slug: 'test-automation-framework-architecture',
    ...testAutomationFrameworkArchitecture,
  },
  {
    slug: 'react-nextjs-testing-complete-guide',
    ...reactNextjsTestingGuide,
  },
  {
    slug: 'ai-agent-testing-workflows-comparison',
    ...aiAgentTestingWorkflows,
  },
  {
    slug: 'testcontainers-docker-integration-testing',
    ...testcontainersDockerGuide,
  },
  {
    slug: 'ai-test-generation-tools-guide',
    ...aiTestGenerationGuide,
  },
  {
    slug: 'code-review-qa-testing-guide',
    ...codeReviewQaGuide,
  },
  {
    slug: 'test-planning-strategy-guide',
    ...testPlanningGuide,
  },
  {
    slug: 'storybook-component-testing-guide',
    ...storybookTestingGuide,
  },
  {
    slug: 'performance-monitoring-testing-guide',
    ...performanceMonitoringGuide,
  },
  {
    slug: 'test-reporting-allure-dashboards-guide',
    ...testReportingGuide,
  },
  {
    slug: 'api-mocking-service-virtualization-guide',
    ...apiMockingGuide,
  },
  {
    slug: 'error-handling-testing-patterns',
    ...errorHandlingGuide,
  },
  {
    slug: 'internationalization-testing-i18n-guide',
    ...i18nTestingGuide,
  },
  {
    slug: 'continuous-testing-devops-guide',
    ...continuousTestingGuide,
  },
  {
    slug: 'test-pyramid-testing-strategy',
    ...testPyramidGuide,
  },
  {
    slug: 'qa-metrics-kpis-dashboard-guide',
    ...qaMetricsGuide,
  },
  {
    slug: 'cross-browser-testing-guide',
    ...crossBrowserGuide,
  },
  {
    slug: 'test-automation-roi-business-case',
    ...testAutomationRoi,
  },
  {
    slug: 'microservices-testing-strategies',
    ...microservicesTestingGuide,
  },
  {
    slug: 'websocket-testing-guide',
    ...websocketTestingGuide,
  },
  {
    slug: 'chaos-engineering-resilience-testing',
    ...chaosEngineeringGuide,
  },
  {
    slug: 'graphql-testing-complete-guide',
    ...graphqlTestingGuide,
  },
  {
    slug: 'load-testing-beginners-guide',
    ...loadTestingGuide,
  },
  {
    slug: 'test-case-design-techniques-guide',
    ...testCaseDesign,
  },
  {
    slug: 'smoke-testing-vs-sanity-testing',
    ...smokeVsSanity,
  },
  {
    slug: 'regression-testing-strategies-guide',
    ...regressionTestingGuide,
  },
  {
    slug: 'rest-assured-java-api-testing',
    ...restAssuredGuide,
  },
  {
    slug: 'postman-api-testing-guide',
    ...postmanApiGuide,
  },
  {
    slug: 'selenium-grid-docker-parallel-testing',
    ...seleniumGridDocker,
  },
  {
    slug: 'pytest-testing-complete-guide',
    ...pytestGuide,
  },
  {
    slug: 'testing-in-production-strategies',
    ...testingInProduction,
  },
  {
    slug: 'playwright-vs-puppeteer-2026',
    ...playwrightVsPuppeteer,
  },
  {
    slug: 'testing-legacy-code-refactoring-guide',
    ...testingLegacyCodeGuide,
  },
  {
    slug: 'qa-engineer-skills-career-guide-2026',
    ...qaEngineerSkillsCareerGuide,
  },
  {
    slug: 'mutation-testing-stryker-guide',
    ...mutationTestingGuide,
  },
  {
    slug: 'test-data-management-strategies',
    ...testDataManagement,
  },
  {
    slug: 'bdd-cucumber-testing-guide',
    ...bddCucumberGuide,
  },
  {
    slug: 'database-testing-automation-guide',
    ...databaseTestingGuide,
  },
  {
    slug: 'exploratory-testing-ai-agents-guide',
    ...exploratoryTestingGuide,
  },
  {
    slug: 'k6-vs-jmeter-performance-testing',
    ...k6VsJmeter,
  },
  {
    slug: 'visual-regression-testing-guide',
    ...visualRegressionGuide,
  },
  {
    slug: 'api-contract-testing-microservices',
    ...apiContractTesting,
  },
  {
    slug: 'mobile-testing-automation-guide',
    ...mobileTestingGuide,
  },
  {
    slug: 'accessibility-testing-automation-guide',
    ...accessibilityTestingGuide,
  },
  {
    slug: 'vibe-testing-ai-first-qa-guide',
    ...vibeTestingGuide,
  },
  {
    slug: 'playwright-test-agents-claude-code',
    ...playwrightTestAgents,
  },
  {
    slug: 'testing-ai-generated-code-sdet-playbook',
    ...testingAiGeneratedCode,
  },
  {
    slug: 'autonomous-testing-agents-build-vs-buy',
    ...autonomousTestingBuildVsBuy,
  },
  {
    slug: 'mcp-for-qa-engineers-guide',
    ...mcpForQaEngineers,
  },
  {
    slug: 'ai-test-automation-tools-2026',
    ...aiTestAutomation,
  },
  {
    slug: 'cicd-testing-pipeline-github-actions',
    ...cicdPipeline,
  },
  {
    slug: 'playwright-tutorial-beginners-2026',
    ...playwrightTutorial,
  },
  {
    slug: 'jest-vs-vitest-2026',
    ...jestVsVitest,
  },
  {
    slug: 'selenium-vs-playwright-2026',
    ...seleniumVsPlaywright,
  },
  {
    slug: 'api-testing-complete-guide',
    ...apiTestingGuide,
  },
  {
    slug: 'shift-left-testing-ai-agents',
    ...shiftLeftTesting,
  },
  {
    slug: 'security-testing-ai-generated-code',
    ...securityTestingAiCode,
  },
  {
    slug: 'fix-flaky-tests-guide',
    ...fixFlakyTests,
  },
  {
    slug: 'cypress-vs-playwright-2026',
    ...cypressVsPlaywright,
  },
  {
    slug: 'must-have-qa-skills-claude-code-2026',
    ...mustHaveQaSkills,
  },
  {
    slug: 'how-ai-agents-changing-qa-testing',
    ...aiAgentsChangingQa,
  },
  {
    slug: 'playwright-e2e-complete-guide',
    ...playwrightGuide,
  },
  {
    slug: 'tdd-ai-agents-best-practices',
    ...tddBestPractices,
  },
  {
    slug: 'top-10-qa-skills-developers-2026',
    ...top10QaSkills,
  },
  {
    slug: 'introducing-qaskills',
    ...introducingQaskills,
  },
  {
    slug: 'playwright-e2e-best-practices',
    ...playwrightBestPractices,
  },
  {
    slug: 'ai-agents-qa-revolution',
    ...aiAgentsRevolution,
  },
  { slug: 'python-vs-pytest-explained', ...pythonVsPytestExplained },
  { slug: 'unittest-vs-pytest-2026', ...unittestVsPytest2026 },
  { slug: 'playwright-trace-viewer-complete-guide-2026', ...playwrightTraceViewer },
  { slug: 'playwright-storagestate-authentication-reference', ...playwrightStorageState },
  { slug: 'playwright-setinputfiles-file-upload-guide', ...playwrightSetInputFiles },
  { slug: 'playwright-vs-cypress-2026-detailed-comparison', ...playwrightVsCypress2026Detailed },
  { slug: 'playwright-vs-puppeteer-2026-deep-dive', ...playwrightVsPuppeteer2026Deep },
  { slug: 'playwright-vs-selenium-2026-which-better', ...playwrightVsSelenium2026Which },
  { slug: 'playwright-mcp-cursor-ide-setup-2026', ...playwrightMcpCursorSetup },
  { slug: 'playwright-mcp-claude-code-setup-2026', ...playwrightMcpClaudeCodeSetup },
  { slug: 'openai-evals-complete-guide-2026', ...openaiEvalsCompleteGuide },
  { slug: 'openai-evals-best-practices-2026', ...openaiEvalsBestPractices },
  { slug: 'promptfoo-complete-guide-2026', ...promptfooCompleteGuide },
  { slug: 'promptfoo-red-teaming-llm-applications', ...promptfooRedTeaming },
  { slug: 'best-claude-code-skills-for-testing-2026', ...bestClaudeCodeSkillsTesting },
  { slug: 'best-claude-code-skills-for-automated-testing', ...bestClaudeCodeSkillsAutomated },
  { slug: 'selenium-news-may-2026-updates', ...seleniumNewsMay2026 },
  { slug: 'selenium-webdriver-updates-2026-changelog', ...seleniumWebdriverUpdates },
  { slug: 'cypress-best-practices-2026-guide', ...cypressBestPractices2026 },
  { slug: 'cypress-2026-latest-version-features', ...cypress2026LatestFeatures },
  { slug: 'k6-vs-jmeter-2026-which-better', ...k6VsJmeter2026Which },
  { slug: 'testcontainers-kafka-node-complete-guide', ...testcontainersKafkaNode },
  { slug: 'selenide-allure-integration-complete-reference', ...selenideAllureIntegration },
  { slug: 'selenide-shouldnot-exist-conditions-reference', ...selenideShouldnotConditions },
  { slug: 'robot-framework-keyword-driven-testing-guide', ...robotFrameworkKeywordDriven },
  { slug: 'best-ai-test-automation-tools-detailed-2026', ...bestAiTestAutomationToolsDetailed },
  { slug: 'ai-defect-prediction-machine-learning-qa', ...aiDefectPredictionMachineLearningQa },
  { slug: 'ai-test-data-generation-tools-2026', ...aiTestDataGenerationTools2026 },
  { slug: 'ai-test-generation-llm-prompting-guide', ...aiTestGenerationLlmPromptingGuide },
  { slug: 'ai-test-maintenance-self-healing-strategies', ...aiTestMaintenanceSelfHealingStrategies },
  { slug: 'aider-qa-engineers-guide', ...aiderQaEngineersGuide },
  { slug: 'amp-ai-qa-engineers-guide', ...ampAiQaEngineersGuide },
  { slug: 'apickli-cucumber-api-testing-guide', ...apickliCucumberApiTestingGuide },
  { slug: 'applitools-visual-ai-testing-complete-guide', ...applitoolsVisualAiTestingCompleteGuide },
  { slug: 'arize-phoenix-llm-evaluation-guide', ...arizePhoenixLlmEvaluationGuide },
  { slug: 'artillery-node-load-testing-complete-guide', ...artilleryNodeLoadTestingCompleteGuide },
  { slug: 'autonomous-testing-mabl-functionize-applitools', ...autonomousTestingMablFunctionizeApplitools },
  { slug: 'bdd-test-data-management-best-practices', ...bddTestDataManagementBestPractices },
  { slug: 'bdd-vs-tdd-decision-guide', ...bddVsTddDecisionGuide },
  { slug: 'behave-python-bdd-complete-tutorial', ...behavePythonBddCompleteTutorial },
  { slug: 'behavioral-interview-questions-qa-engineers', ...behavioralInterviewQuestionsQaEngineers },
  { slug: 'bruno-api-testing-complete-guide', ...brunoApiTestingCompleteGuide },
  { slug: 'chromatic-storybook-visual-testing-guide', ...chromaticStorybookVisualTestingGuide },
  { slug: 'claude-code-qa-testing-workflows-2026', ...claudeCodeQaTestingWorkflows2026 },
  { slug: 'claude-for-qa-engineers-complete-guide', ...claudeForQaEngineersCompleteGuide },
  { slug: 'claude-qa-agent-setup-guide', ...claudeQaAgentSetupGuide },
  { slug: 'cline-qa-engineers-complete-guide', ...clineQaEngineersCompleteGuide },
  { slug: 'codex-cli-qa-engineers-guide', ...codexCliQaEngineersGuide },
  { slug: 'comparing-popular-bdd-frameworks-2026-complete-guide', ...comparingPopularBddFrameworks2026CompleteGuide },
  { slug: 'continue-dev-qa-engineers-guide', ...continueDevQaEngineersGuide },
  { slug: 'cucumber-java-bdd-best-practices-2026', ...cucumberJavaBddBestPractices2026 },
  { slug: 'cucumber-js-to-playwright-migration-guide', ...cucumberJsToPlaywrightMigrationGuide },
  { slug: 'cucumber-ruby-bdd-complete-guide', ...cucumberRubyBddCompleteGuide },
  { slug: 'cucumber-tags-hooks-complete-reference', ...cucumberTagsHooksCompleteReference },
  { slug: 'cucumber-vs-behave-python-bdd-comparison', ...cucumberVsBehavePythonBddComparison },
  { slug: 'cursor-for-qa-engineers-complete-guide', ...cursorForQaEngineersCompleteGuide },
  { slug: 'cursor-playwright-skill-setup-guide', ...cursorPlaywrightSkillSetupGuide },
  { slug: 'cursor-skills-md-best-practices', ...cursorSkillsMdBestPractices },
  { slug: 'cypress-applitools-visual-testing-guide', ...cypressApplitoolsVisualTestingGuide },
  { slug: 'cypress-axe-accessibility-testing-guide', ...cypressAxeAccessibilityTestingGuide },
  { slug: 'cypress-component-testing-angular-guide', ...cypressComponentTestingAngularGuide },
  { slug: 'cypress-component-testing-react-complete-guide', ...cypressComponentTestingReactCompleteGuide },
  { slug: 'cypress-component-testing-vue-complete-guide', ...cypressComponentTestingVueCompleteGuide },
  { slug: 'cypress-cucumber-bdd-preprocessor-guide', ...cypressCucumberBddPreprocessorGuide },
  { slug: 'cypress-cucumber-preprocessor-bdd-guide', ...cypressCucumberPreprocessorBddGuide },
  { slug: 'cypress-custom-commands-best-practices', ...cypressCustomCommandsBestPractices },
  { slug: 'cypress-cy-session-authentication-guide', ...cypressCySessionAuthenticationGuide },
  { slug: 'cypress-environments-config-best-practices', ...cypressEnvironmentsConfigBestPractices },
  { slug: 'cypress-fixtures-data-management-guide', ...cypressFixturesDataManagementGuide },
  { slug: 'cypress-github-actions-ci-guide-2026', ...cypressGithubActionsCiGuide2026 },
  { slug: 'cypress-image-snapshot-visual-guide', ...cypressImageSnapshotVisualGuide },
  { slug: 'cypress-intercept-network-stubbing-reference', ...cypressInterceptNetworkStubbingReference },
  { slug: 'cypress-mochawesome-allure-reporter-guide', ...cypressMochawesomeAllureReporterGuide },
  { slug: 'cypress-percy-visual-testing-guide', ...cypressPercyVisualTestingGuide },
  { slug: 'cypress-to-playwright-migration-complete-guide', ...cypressToPlaywrightMigrationCompleteGuide },
  { slug: 'deepeval-pytest-llm-testing-guide', ...deepevalPytestLlmTestingGuide },
  { slug: 'dredd-api-blueprint-testing-guide', ...dreddApiBlueprintTestingGuide },
  { slug: 'enzyme-to-react-testing-library-migration-guide', ...enzymeToReactTestingLibraryMigrationGuide },
  { slug: 'evidently-ai-llm-testing-guide', ...evidentlyAiLlmTestingGuide },
  { slug: 'gatling-scala-load-testing-complete-guide', ...gatlingScalaLoadTestingCompleteGuide },
  { slug: 'gauge-vs-cucumber-bdd-frameworks', ...gaugeVsCucumberBddFrameworks },
  { slug: 'gemini-cli-qa-engineers-guide', ...geminiCliQaEngineersGuide },
  { slug: 'github-copilot-qa-engineers-deep-guide', ...githubCopilotQaEngineersDeepGuide },
  { slug: 'helicone-llm-monitoring-complete-guide', ...heliconeLlmMonitoringCompleteGuide },
  { slug: 'hoppscotch-api-testing-complete-guide', ...hoppscotchApiTestingCompleteGuide },
  { slug: 'insomnia-api-testing-complete-guide', ...insomniaApiTestingCompleteGuide },
  { slug: 'jasmine-to-jest-migration-guide', ...jasmineToJestMigrationGuide },
  { slug: 'jest-to-vitest-migration-guide', ...jestToVitestMigrationGuide },
  { slug: 'jmeter-distributed-load-testing-complete-guide', ...jmeterDistributedLoadTestingCompleteGuide },
  { slug: 'jmeter-vs-locust-vs-gatling-comparison', ...jmeterVsLocustVsGatlingComparison },
  { slug: 'junit4-to-junit5-migration-guide', ...junit4ToJunit5MigrationGuide },
  { slug: 'k6-browser-recorder-test-builder-guide', ...k6BrowserRecorderTestBuilderGuide },
  { slug: 'k6-cloud-grafana-cloud-complete-guide', ...k6CloudGrafanaCloudCompleteGuide },
  { slug: 'k6-extensions-xk6-complete-reference', ...k6ExtensionsXk6CompleteReference },
  { slug: 'karate-bdd-api-testing-complete-guide', ...karateBddApiTestingCompleteGuide },
  { slug: 'karate-dsl-bdd-api-testing-complete-guide', ...karateDslBddApiTestingCompleteGuide },
  { slug: 'karma-to-jest-migration-guide', ...karmaToJestMigrationGuide },
  { slug: 'katalon-studio-test-automation-complete-guide', ...katalonStudioTestAutomationCompleteGuide },
  { slug: 'langchain-evaluators-complete-guide', ...langchainEvaluatorsCompleteGuide },
  { slug: 'langsmith-evaluation-platform-guide', ...langsmithEvaluationPlatformGuide },
  { slug: 'living-documentation-bdd-cucumber', ...livingDocumentationBddCucumber },
  { slug: 'llm-evals-comparison-openai-promptfoo-ragas', ...llmEvalsComparisonOpenaiPromptfooRagas },
  { slug: 'locust-python-load-testing-complete-guide', ...locustPythonLoadTestingCompleteGuide },
  { slug: 'mocha-to-jest-migration-guide', ...mochaToJestMigrationGuide },
  { slug: 'mockoon-api-mocking-tool-guide', ...mockoonApiMockingToolGuide },
  { slug: 'neoload-tricentis-performance-testing-guide', ...neoloadTricentisPerformanceTestingGuide },
  { slug: 'nightwatch-to-playwright-migration-guide', ...nightwatchToPlaywrightMigrationGuide },
  { slug: 'openai-agent-evals-complete-guide-2026', ...openaiAgentEvalsCompleteGuide2026 },
  { slug: 'openai-evals-design-best-practices', ...openaiEvalsDesignBestPractices },
  { slug: 'openai-evals-graders-complete-reference', ...openaiEvalsGradersCompleteReference },
  { slug: 'pact-contract-testing-complete-guide-2026', ...pactContractTestingCompleteGuide2026 },
  { slug: 'pactflow-contract-testing-broker-guide', ...pactflowContractTestingBrokerGuide },
  { slug: 'percy-visual-testing-complete-guide', ...percyVisualTestingCompleteGuide },
  { slug: 'playwright-accessibility-testing-axe-complete-guide', ...playwrightAccessibilityTestingAxeCompleteGuide },
  { slug: 'playwright-api-testing-context-request-guide', ...playwrightApiTestingContextRequestGuide },
  { slug: 'playwright-best-practices-locators-2026', ...playwrightBestPracticesLocators2026 },
  { slug: 'playwright-browser-contexts-isolation-guide', ...playwrightBrowserContextsIsolationGuide },
  { slug: 'playwright-ci-github-actions-complete-guide-2026', ...playwrightCiGithubActionsCompleteGuide2026 },
  { slug: 'playwright-clock-time-control-testing-guide', ...playwrightClockTimeControlTestingGuide },
  { slug: 'playwright-codegen-recording-complete-guide', ...playwrightCodegenRecordingCompleteGuide },
  { slug: 'playwright-component-testing-react-complete-guide', ...playwrightComponentTestingReactCompleteGuide },
  { slug: 'playwright-component-testing-svelte-guide', ...playwrightComponentTestingSvelteGuide },
  { slug: 'playwright-component-testing-vue-complete-guide', ...playwrightComponentTestingVueCompleteGuide },
  { slug: 'playwright-cucumber-bdd-integration-guide', ...playwrightCucumberBddIntegrationGuide },
  { slug: 'playwright-debug-mode-inspector-guide', ...playwrightDebugModeInspectorGuide },
  { slug: 'playwright-emulation-geolocation-permissions-guide', ...playwrightEmulationGeolocationPermissionsGuide },
  { slug: 'playwright-file-download-handling-guide', ...playwrightFileDownloadHandlingGuide },
  { slug: 'playwright-fixtures-complete-reference-2026', ...playwrightFixturesCompleteReference2026 },
  { slug: 'playwright-iframe-shadow-dom-guide', ...playwrightIframeShadowDomGuide },
  { slug: 'playwright-keyboard-mouse-interactions-reference', ...playwrightKeyboardMouseInteractionsReference },
  { slug: 'playwright-locator-strategies-getbyrole-guide', ...playwrightLocatorStrategiesGetbyroleGuide },
  { slug: 'playwright-mcp-accessibility-snapshots-reference', ...playwrightMcpAccessibilitySnapshotsReference },
  { slug: 'playwright-mcp-server-configuration-2026', ...playwrightMcpServerConfiguration2026 },
  { slug: 'playwright-mobile-emulation-devices-reference', ...playwrightMobileEmulationDevicesReference },
  { slug: 'playwright-multi-page-popup-handling-guide', ...playwrightMultiPagePopupHandlingGuide },
  { slug: 'playwright-network-mocking-route-handler-guide', ...playwrightNetworkMockingRouteHandlerGuide },
  { slug: 'playwright-parallel-sharding-execution-guide', ...playwrightParallelShardingExecutionGuide },
  { slug: 'playwright-retries-flaky-test-handling-guide', ...playwrightRetriesFlakyTestHandlingGuide },
  { slug: 'playwright-screenshots-videos-traces-complete-guide', ...playwrightScreenshotsVideosTracesCompleteGuide },
  { slug: 'playwright-test-agents-planner-generator-healer-guide', ...playwrightTestAgentsPlannerGeneratorHealerGuide },
  { slug: 'playwright-test-config-options-complete-reference', ...playwrightTestConfigOptionsCompleteReference },
  { slug: 'playwright-test-reporters-html-allure-junit-guide', ...playwrightTestReportersHtmlAllureJunitGuide },
  { slug: 'playwright-ui-mode-complete-2026-guide', ...playwrightUiModeComplete2026Guide },
  { slug: 'playwright-visual-comparison-snapshots-guide', ...playwrightVisualComparisonSnapshotsGuide },
  { slug: 'promptfoo-vs-openai-evals-comparison-2026', ...promptfooVsOpenaiEvalsComparison2026 },
  { slug: 'protractor-to-playwright-migration-guide', ...protractorToPlaywrightMigrationGuide },
  { slug: 'puppeteer-to-playwright-migration-guide', ...puppeteerToPlaywrightMigrationGuide },
  { slug: 'qa-engineer-vs-sdet-vs-test-architect', ...qaEngineerVsSdetVsTestArchitect },
  { slug: 'ragas-context-precision-recall-faithfulness-guide', ...ragasContextPrecisionRecallFaithfulnessGuide },
  { slug: 'ragas-rag-evaluation-metrics-complete-guide', ...ragasRagEvaluationMetricsCompleteGuide },
  { slug: 'ranorex-test-automation-2026-guide', ...ranorexTestAutomation2026Guide },
  { slug: 'rest-assured-vs-karate-detailed-comparison-2026', ...restAssuredVsKarateDetailedComparison2026 },
  { slug: 'robot-framework-api-testing-requests-library', ...robotFrameworkApiTestingRequestsLibrary },
  { slug: 'robot-framework-appium-mobile-testing-guide', ...robotFrameworkAppiumMobileTestingGuide },
  { slug: 'robot-framework-browser-library-playwright-guide', ...robotFrameworkBrowserLibraryPlaywrightGuide },
  { slug: 'robot-framework-ci-cd-jenkins-github-actions', ...robotFrameworkCiCdJenkinsGithubActions },
  { slug: 'robot-framework-custom-libraries-python-guide', ...robotFrameworkCustomLibrariesPythonGuide },
  { slug: 'robot-framework-data-driven-testing-complete-guide', ...robotFrameworkDataDrivenTestingCompleteGuide },
  { slug: 'robot-framework-database-testing-library-guide', ...robotFrameworkDatabaseTestingLibraryGuide },
  { slug: 'robot-framework-listeners-complete-reference', ...robotFrameworkListenersCompleteReference },
  { slug: 'robot-framework-pabot-parallel-execution-guide', ...robotFrameworkPabotParallelExecutionGuide },
  { slug: 'robot-framework-pytest-integration-guide', ...robotFrameworkPytestIntegrationGuide },
  { slug: 'robot-framework-rest-instance-library-guide', ...robotFrameworkRestInstanceLibraryGuide },
  { slug: 'robot-framework-selenium-library-complete-reference', ...robotFrameworkSeleniumLibraryCompleteReference },
  { slug: 'robot-framework-sms-otp-testing-complete-guide', ...robotFrameworkSmsOtpTestingCompleteGuide },
  { slug: 'robot-framework-tags-tagging-best-practices', ...robotFrameworkTagsTaggingBestPractices },
  { slug: 'robot-framework-wait-until-keyword-succeeds-guide', ...robotFrameworkWaitUntilKeywordSucceedsGuide },
  { slug: 'sdet-mock-interview-questions-with-answers', ...sdetMockInterviewQuestionsWithAnswers },
  { slug: 'sdet-roadmap-day-by-day-90-day-plan', ...sdetRoadmapDayByDay90DayPlan },
  { slug: 'selenide-allureselenide-includeselenidesteps-reference', ...selenideAllureselenideIncludeselenidestepsReference },
  { slug: 'selenide-collection-shouldhave-reference', ...selenideCollectionShouldhaveReference },
  { slug: 'selenide-condition-cheatsheet-2026', ...selenideConditionCheatsheet2026 },
  { slug: 'selenide-file-download-upload-guide', ...selenideFileDownloadUploadGuide },
  { slug: 'selenide-grid-parallel-testing-guide', ...selenideGridParallelTestingGuide },
  { slug: 'selenide-headless-chromium-firefox-guide', ...selenideHeadlessChromiumFirefoxGuide },
  { slug: 'selenide-iframe-handling-complete-guide', ...selenideIframeHandlingCompleteGuide },
  { slug: 'selenide-junit5-spring-boot-integration', ...selenideJunit5SpringBootIntegration },
  { slug: 'selenide-page-factory-complete-guide', ...selenidePageFactoryCompleteGuide },
  { slug: 'selenide-page-object-pattern-best-practices', ...selenidePageObjectPatternBestPractices },
  { slug: 'selenide-screenshot-on-failure-guide', ...selenideScreenshotOnFailureGuide },
  { slug: 'selenide-shadow-dom-elements-guide', ...selenideShadowDomElementsGuide },
  { slug: 'selenide-soft-assertions-complete-reference', ...selenideSoftAssertionsCompleteReference },
  { slug: 'selenide-vs-selenium-webdriver-2026', ...selenideVsSeleniumWebdriver2026 },
  { slug: 'selenide-wait-strategies-explicit-implicit', ...selenideWaitStrategiesExplicitImplicit },
  { slug: 'selenium-allure-reporting-java-complete-guide', ...seleniumAllureReportingJavaCompleteGuide },
  { slug: 'selenium-azure-devops-pipeline-guide', ...seleniumAzureDevopsPipelineGuide },
  { slug: 'selenium-bidirectional-bidi-protocol-guide', ...seleniumBidirectionalBidiProtocolGuide },
  { slug: 'selenium-cdp-chrome-devtools-protocol-guide', ...seleniumCdpChromeDevtoolsProtocolGuide },
  { slug: 'selenium-cucumber-java-bdd-complete-guide', ...seleniumCucumberJavaBddCompleteGuide },
  { slug: 'selenium-grid-3-to-4-migration-guide', ...seleniumGrid3To4MigrationGuide },
  { slug: 'selenium-grid-4-docker-kubernetes-guide', ...seleniumGrid4DockerKubernetesGuide },
  { slug: 'selenium-java-testng-page-object-guide', ...seleniumJavaTestngPageObjectGuide },
  { slug: 'selenium-jenkins-pipeline-complete-guide', ...seleniumJenkinsPipelineCompleteGuide },
  { slug: 'selenium-manager-browser-driver-2026', ...seleniumManagerBrowserDriver2026 },
  { slug: 'selenium-python-pytest-integration-complete-guide', ...seleniumPythonPytestIntegrationCompleteGuide },
  { slug: 'selenium-to-playwright-migration-guide-2026', ...seleniumToPlaywrightMigrationGuide2026 },
  { slug: 'self-healing-test-automation-tools-comparison-2026', ...selfHealingTestAutomationToolsComparison2026 },
  { slug: 'specflow-net-bdd-2026-complete-guide', ...specflowNetBdd2026CompleteGuide },
  { slug: 'specflow-vs-cucumber-detailed-comparison', ...specflowVsCucumberDetailedComparison },
  { slug: 'spring-cloud-contract-testing-guide', ...springCloudContractTestingGuide },
  { slug: 'supertest-node-api-testing-complete-guide', ...supertestNodeApiTestingCompleteGuide },
  { slug: 'swagger-openapi-spec-validation-guide', ...swaggerOpenapiSpecValidationGuide },
  { slug: 'tavern-pytest-api-testing-complete-guide', ...tavernPytestApiTestingCompleteGuide },
  { slug: 'test-architect-roadmap-2026', ...testArchitectRoadmap2026 },
  { slug: 'test-automation-engineer-resume-template', ...testAutomationEngineerResumeTemplate },
  { slug: 'testcafe-to-playwright-migration-guide', ...testcafeToPlaywrightMigrationGuide },
  { slug: 'testcontainers-best-practices-2026', ...testcontainersBestPractices2026 },
  { slug: 'testcontainers-dotnet-database-testing-guide', ...testcontainersDotnetDatabaseTestingGuide },
  { slug: 'testcontainers-elasticsearch-node-guide', ...testcontainersElasticsearchNodeGuide },
  { slug: 'testcontainers-go-database-testing-guide', ...testcontainersGoDatabaseTestingGuide },
  { slug: 'testcontainers-kafka-java-spring-boot-guide', ...testcontainersKafkaJavaSpringBootGuide },
  { slug: 'testcontainers-localstack-aws-mocking-guide', ...testcontainersLocalstackAwsMockingGuide },
  { slug: 'testcontainers-mongodb-node-integration-testing', ...testcontainersMongodbNodeIntegrationTesting },
  { slug: 'testcontainers-mysql-node-integration-testing', ...testcontainersMysqlNodeIntegrationTesting },
  { slug: 'testcontainers-postgres-java-spring-boot-guide', ...testcontainersPostgresJavaSpringBootGuide },
  { slug: 'testcontainers-postgresql-node-complete-guide', ...testcontainersPostgresqlNodeCompleteGuide },
  { slug: 'testcontainers-python-pytest-integration-guide', ...testcontainersPythonPytestIntegrationGuide },
  { slug: 'testcontainers-rabbitmq-node-integration-testing', ...testcontainersRabbitmqNodeIntegrationTesting },
  { slug: 'testcontainers-redis-node-complete-guide', ...testcontainersRedisNodeCompleteGuide },
  { slug: 'testcontainers-rust-integration-testing-guide', ...testcontainersRustIntegrationTestingGuide },
  { slug: 'testcontainers-selenium-grid-guide', ...testcontainersSeleniumGridGuide },
  { slug: 'testim-vs-mabl-vs-functionize-comparison', ...testimVsMablVsFunctionizeComparison },
  { slug: 'testsigma-codeless-automation-guide', ...testsigmaCodelessAutomationGuide },
  { slug: 'tricentis-tosca-codeless-testing-guide', ...tricentisToscaCodelessTestingGuide },
  { slug: 'trulens-llm-evaluation-framework-guide', ...trulensLlmEvaluationFrameworkGuide },
  { slug: 'webdriverio-to-playwright-migration-guide', ...webdriverioToPlaywrightMigrationGuide },
  { slug: 'weights-biases-llm-evals-guide', ...weightsBiasesLlmEvalsGuide },
  { slug: 'windsurf-qa-engineers-complete-guide', ...windsurfQaEngineersCompleteGuide },
  { slug: 'wiremock-api-mocking-complete-guide', ...wiremockApiMockingCompleteGuide },
  { slug: 'wrk-wrk2-http-benchmarking-guide', ...wrkWrk2HttpBenchmarkingGuide },
  { slug: 'zed-ai-qa-engineers-guide', ...zedAiQaEngineersGuide },
  { slug: 'what-is-pytest-python-explained', ...whatIsPytestPythonExplained },
  { slug: 'pytest-best-practices-2026', ...pytestBestPractices2026 },
  { slug: 'jest-mock-vs-mockimplementation-guide', ...jestMockVsMockImplementationGuide },
  { slug: 'vitest-4-migration-guide-breaking-changes', ...vitest4MigrationGuideBreakingChanges },
  { slug: 'testcontainers-reuse-withreuse-node-guide', ...testcontainersReuseWithReuseNodeGuide },
  { slug: 'rag-evaluation-metrics-complete-2026', ...ragEvaluationMetricsComplete2026 },
  { slug: 'rag-regression-testing-guide', ...ragRegressionTestingGuide },
  { slug: 'openai-evals-trace-grading-complete-guide', ...openaiEvalsTraceGradingCompleteGuide },
  { slug: 'agent-browser-complete-guide-2026', ...agentBrowserCompleteGuide2026 },
  { slug: 'cursor-skill-md-frontmatter-schema-guide', ...cursorSkillMdFrontmatterSchemaGuide },
  { slug: 'testrail-vs-zephyr-scale-2026', ...testrailVsZephyrScale2026 },
  { slug: 'xray-test-management-pricing-2026', ...xrayTestManagementPricing2026 },
  { slug: 'best-test-management-tools-beyond-testrail-2026', ...bestTestManagementToolsBeyondTestrail2026 },
  { slug: 'playwright-vs-cypress-nextjs-e2e-2026', ...playwrightVsCypressNextjsE2e2026 },
  { slug: 'playwright-vs-rest-assured-api-testing', ...playwrightVsRestAssuredApiTesting },
  { slug: 'playwright-multiple-tabs-windows-guide', ...playwrightMultipleTabsWindowsGuide },
  { slug: 'playwright-page-evaluate-complete-guide', ...playwrightPageEvaluateCompleteGuide },
  { slug: 'playwright-test-step-annotations-guide', ...playwrightTestStepAnnotationsGuide },
  { slug: 'playwright-locator-filter-visible-reference', ...playwrightLocatorFilterVisibleReference },
  { slug: 'playwright-vs-puppeteer-bundle-size-2026', ...playwrightVsPuppeteerBundleSize2026 },
  { slug: 'ai-accessibility-testing-tools-2026', ...aiAccessibilityTestingTools2026 },
  { slug: 'ai-mobile-test-automation-2026', ...aiMobileTestAutomation2026 },
  { slug: 'best-cheap-ai-e2e-testing-tools-2026', ...bestCheapAiE2eTestingTools2026 },
  { slug: 'how-to-detect-ai-generated-code-2026', ...howToDetectAiGeneratedCode2026 },
  { slug: 'migrate-selenium-to-playwright-checklist-2026', ...migrateSeleniumToPlaywrightChecklist2026 },
  { slug: 'bdd-test-management-tools-2026', ...bddTestManagementTools2026 },
  { slug: 'chromatic-turbosnap-storybook-guide', ...chromaticTurbosnapStorybookGuide },
  { slug: 'cypress-aliases-before-each-guide', ...cypressAliasesBeforeEachGuide },
  { slug: 'cypress-component-testing-react-router-guide', ...cypressComponentTestingReactRouterGuide },
  { slug: 'insomnia-tutorial-complete-engineers-guide', ...insomniaTutorialCompleteEngineersGuide },
  { slug: 'jmeter-response-assertion-jmx-guide', ...jmeterResponseAssertionJmxGuide },
  { slug: 'keyword-driven-testing-python-guide', ...keywordDrivenTestingPythonGuide },
  { slug: 'localstack-bedrock-mock-testing-guide', ...localstackBedrockMockTestingGuide },
  { slug: 'mabl-vs-playwright-comparison-2026', ...mablVsPlaywrightComparison2026 },
  { slug: 'pact-consumer-driven-contract-reference-2026', ...pactConsumerDrivenContractReference2026 },
  { slug: 'percy-playwright-visual-testing-guide', ...percyPlaywrightVisualTestingGuide },
  { slug: 'playwright-allure-attachment-trace-guide', ...playwrightAllureAttachmentTraceGuide },
  { slug: 'playwright-apirequestcontext-storagestate-guide', ...playwrightApirequestcontextStoragestateGuide },
  { slug: 'playwright-blob-reporter-guide', ...playwrightBlobReporterGuide },
  { slug: 'playwright-browsers-path-env-guide', ...playwrightBrowsersPathEnvGuide },
  { slug: 'playwright-codegen-cli-flags-reference', ...playwrightCodegenCliFlagsReference },
  { slug: 'playwright-install-proxy-mirror-guide', ...playwrightInstallProxyMirrorGuide },
  { slug: 'playwright-mcp-cursor-troubleshooting-guide', ...playwrightMcpCursorTroubleshootingGuide },
  { slug: 'playwright-mcp-json-configuration-reference', ...playwrightMcpJsonConfigurationReference },
  { slug: 'playwright-python-authentication-storage-state-guide', ...playwrightPythonAuthenticationStorageStateGuide },
  { slug: 'playwright-python-codegen-guide', ...playwrightPythonCodegenGuide },
  { slug: 'playwright-python-file-upload-guide', ...playwrightPythonFileUploadGuide },
  { slug: 'playwright-testing-best-practices-2026', ...playwrightTestingBestPractices2026 },
  { slug: 'robot-framework-builtin-keywords-reference', ...robotFrameworkBuiltinKeywordsReference },
  { slug: 'robot-framework-seleniumlibrary-locators-guide', ...robotFrameworkSeleniumlibraryLocatorsGuide },
  { slug: 'selenide-configuration-baseurl-guide', ...selenideConfigurationBaseurlGuide },
  { slug: 'selenide-cssclass-condition-reference', ...selenideCssclassConditionReference },
  { slug: 'selenium-cdp-add-script-evaluate-guide', ...seleniumCdpAddScriptEvaluateGuide },
  { slug: 'selenium-webdriver-bidi-2026-reference', ...seleniumWebdriverBidi2026Reference },
  { slug: 'test-automation-roi-business-value-guide', ...testAutomationRoiBusinessValueGuide },
  { slug: 'twilio-sms-otp-testing-python-guide', ...twilioSmsOtpTestingPythonGuide },
  { slug: 'webdriverio-visual-service-blockout-guide', ...webdriverioVisualServiceBlockoutGuide },
  { slug: 'appium-2-mobile-automation-reference-2026', ...appium2MobileAutomationReference2026 },
  { slug: 'cypress-vs-playwright-component-testing-2026', ...cypressVsPlaywrightComponentTesting2026 },
  { slug: 'github-actions-e2e-deployed-url-testing-guide', ...githubActionsE2eDeployedUrlTestingGuide },
  { slug: 'openai-mcp-support-guide-2026', ...openaiMcpSupportGuide2026 },
  { slug: 'pytest-official-reference-cheatsheet-2026', ...pytestOfficialReferenceCheatsheet2026 },
  { slug: 'testing-otp-sms-phone-flows-complete-guide', ...testingOtpSmsPhoneFlowsCompleteGuide },
  { slug: 'playwright-network-interception-mocking-guide', ...playwrightNetworkInterceptionMockingGuide },
  { slug: 'playwright-global-setup-teardown-guide', ...playwrightGlobalSetupTeardownGuide },
  { slug: 'synthetic-monitoring-playwright-guide', ...syntheticMonitoringPlaywrightGuide },
  { slug: 'pytest-xdist-parallel-testing-guide', ...pytestXdistParallelTestingGuide },
  { slug: 'pytest-asyncio-testing-guide', ...pytestAsyncioTestingGuide },
  { slug: 'promptfoo-vs-deepeval-2026-comparison', ...promptfooVsDeepeval2026Comparison },
  { slug: 'langfuse-vs-langsmith-2026-comparison', ...langfuseVsLangsmith2026Comparison },
  { slug: 'deepeval-vs-ragas-rag-evaluation-2026', ...deepevalVsRagasRagEvaluation2026 },
  { slug: 'k6-thresholds-checks-complete-guide', ...k6ThresholdsChecksCompleteGuide },
  { slug: 'cursor-vs-claude-code-testing-2026', ...cursorVsClaudeCodeTesting2026 },
  { slug: 'playwright-aria-snapshot-testing-guide', ...playwrightAriaSnapshotTestingGuide },
  { slug: 'playwright-locator-describe-tracing-group-guide', ...playwrightLocatorDescribeTracingGroupGuide },
  { slug: 'playwright-clock-api-time-testing-guide', ...playwrightClockApiTimeTestingGuide },
  { slug: 'pytest-benchmark-performance-testing-guide', ...pytestBenchmarkPerformanceTestingGuide },
  { slug: 'pytest-bdd-gherkin-tutorial-2026', ...pytestBddGherkinTutorial2026 },
  { slug: 'k6-browser-module-testing-guide', ...k6BrowserModuleTestingGuide },
  { slug: 'claude-code-subagents-testing-workflow-2026', ...claudeCodeSubagentsTestingWorkflow2026 },
  { slug: 'promptfoo-red-teaming-guide-2026', ...promptfooRedTeamingGuide2026 },
  { slug: 'deepeval-metrics-complete-guide-2026', ...deepevalMetricsCompleteGuide2026 },
  { slug: 'llm-guardrails-testing-guide-2026', ...llmGuardrailsTestingGuide2026 },
  { slug: 'playwright-test-agents-planner-generator-healer-official-2026', ...playwrightTestAgentsPlannerGeneratorHealer2026 },
  { slug: 'openai-evals-graders-complete-reference-2026', ...openaiEvalsGradersReference2026 },
  { slug: 'openai-agent-evals-datasets-workflow-guide-2026', ...openaiAgentEvalsDatasetsWorkflow2026 },
  { slug: 'ragas-faithfulness-answer-relevancy-context-precision-recall-reference-2026', ...ragasFaithfulnessContextPrecisionRecall2026 },
  { slug: 'trulens-rag-triad-groundedness-context-relevance-2026', ...trulensRagTriad2026 },
  { slug: 'deepeval-rag-evaluation-metrics-reference-2026', ...deepevalRagEvaluationMetrics2026 },
  { slug: 'arize-phoenix-llm-observability-tracing-evaluations-2026', ...arizePhoenixLlmObservability2026 },
  { slug: 'axe-core-playwright-accessibility-testing-2026', ...axeCorePlaywrightAccessibility2026 },
  { slug: 'selenium-webdriver-bidi-2026-official-reference', ...seleniumWebdriverBidi2026OfficialReference },
  { slug: 'selenium-manager-4-6-driver-management-2026-guide', ...seleniumManager46DriverManagement2026 },
  { slug: 'pytest-fixtures-conftest-complete-guide-2026', ...pytestFixturesConftestCompleteGuide2026 },
  { slug: 'pytest-parametrize-complete-guide-2026', ...pytestParametrizeCompleteGuide2026 },
  { slug: 'pytest-coverage-pytest-cov-guide-2026', ...pytestCoveragePytestCovGuide2026 },
  { slug: 'vitest-mocking-vi-mock-complete-guide', ...vitestMockingViMockCompleteGuide },
  { slug: 'selenium-4-relative-locators-guide-2026', ...selenium4RelativeLocatorsGuide2026 },
  { slug: 'playwright-soft-assertions-expect-guide', ...playwrightSoftAssertionsExpectGuide },
  { slug: 'github-actions-playwright-matrix-guide-2026', ...githubActionsPlaywrightMatrixGuide2026 },
  { slug: 'api-contract-testing-schemathesis-guide', ...apiContractTestingSchemathesisGuide },
  { slug: 'llm-as-judge-evaluation-guide-2026', ...llmAsJudgeEvaluationGuide2026 },
  { slug: 'prompt-injection-testing-guide-2026', ...promptInjectionTestingGuide2026 },
  { slug: 'playwright-component-testing-react-guide', ...pwComponentTestingReact },
  { slug: 'playwright-network-interception-route-guide', ...pwNetworkInterceptionRoute },
  { slug: 'pytest-fixtures-scope-complete-guide', ...pytestFixturesScope },
  { slug: 'vitest-browser-mode-complete-guide', ...vitestBrowserMode },
  { slug: 'msw-api-mocking-complete-guide', ...mswApiMocking },
  { slug: 'contract-testing-pact-complete-guide', ...contractTestingPact },
  { slug: 'deepeval-vs-ragas-vs-promptfoo-2026', ...deepevalVsRagasVsPromptfoo },
  { slug: 'self-healing-test-automation-2026', ...selfHealingTestAutomation },
  { slug: 'mcp-server-testing-guide-2026', ...mcpServerTesting },
  { slug: 'maestro-mobile-testing-guide-2026', ...maestroMobileTesting },
  { slug: 'vitest-vs-jest-2026', ...vitestVsJest2026 },
  { slug: 'playwright-vs-selenium-python-2026', ...playwrightVsSeleniumPython2026 },
  { slug: 'appium-vs-playwright-2026', ...appiumVsPlaywright2026 },
  { slug: 'webdriverio-vs-playwright-2026', ...webdriverioVsPlaywright2026 },
  { slug: 'cucumber-vs-playwright-2026', ...cucumberVsPlaywright2026 },
  { slug: 'robot-framework-vs-playwright-2026', ...robotFrameworkVsPlaywright2026 },
  { slug: 'detox-vs-appium-2026', ...detoxVsAppium2026 },
  { slug: 'playwright-visual-regression-testing-guide', ...playwrightVisualRegressionTesting },
  { slug: 'stagehand-ai-browser-automation-guide-2026', ...stagehandAiBrowserAutomation2026 },
  { slug: 'midscene-ai-visual-testing-guide-2026', ...midsceneAiVisualTesting2026 },
  { slug: 'playwright-browsers-path-environment-variable-reference', ...playwrightBrowsersPathRef },
  { slug: 'postman-vs-playwright', ...postmanVsPlaywright },
  { slug: 'playwright-file-upload-setinputfiles', ...playwrightFileUploadSetInputFiles },
  { slug: 'whats-new-in-playwright-2026', ...whatsNewPlaywright2026 },
  { slug: 'playwright-mobile-emulation', ...playwrightMobileEmulation },
  { slug: 'pyunit-vs-pytest', ...pyunitVsPytest },
  { slug: 'testrigor-vs-playwright', ...testrigorVsPlaywright },
  { slug: 'vitest-3-to-4-migration', ...vitest3To4Migration },
  { slug: 'k6-vs-jmeter-2026', ...k6VsJmeter2026 },
  { slug: 'unittest-mock-vs-pytest-mock-guide', ...unittestMockVsPytestMock },
  { slug: 'playwright-browsers-path-environment-variable-guide', ...playwrightBrowsersPathGuide },
  { slug: 'playwright-file-upload-setinputfiles-guide', ...playwrightSetInputFilesGuide },
  { slug: 'playwright-1-59-agentic-release-features-guide', ...playwright159AgenticRelease },
  { slug: 'playwright-await-using-automatic-cleanup-guide', ...playwrightAwaitUsingCleanup },
  { slug: 'playwright-screencast-api-video-recording-guide', ...playwrightScreencastApiGuide },
  { slug: 'chrome-for-testing-vs-chromium-playwright', ...chromeForTestingVsChromium },
  { slug: 'self-healing-test-automation-2026-guide', ...selfHealingTestAutomation2026 },
  { slug: 'ai-augmented-software-testing-2026-guide', ...aiAugmentedSoftwareTesting2026 },
  { slug: 'k6-grafana-cloud-load-testing-tutorial-2026', ...k6GrafanaCloudLoadTesting2026 },
  { slug: 'bidirectional-contract-testing-pact-2026', ...bidirectionalContractTestingPact2026 },
  ...remainingGeneratedSeoBatch2026Posts.map(({ slug, post }) => ({
    slug,
    ...post,
  })),
  ...keywordGapBatch20260615Posts.map(({ slug, post }) => ({
    slug,
    ...post,
  })),
  ...gapfillBatch20260619Posts.map(({ slug, post }) => ({
    slug,
    ...post,
  })),
];
