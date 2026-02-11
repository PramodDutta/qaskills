export const FRAMEWORKS = [
  { id: 'playwright', name: 'Playwright', slug: 'playwright', description: 'Cross-browser E2E testing by Microsoft', icon: '🎭', color: '#2EAD33' },
  { id: 'cypress', name: 'Cypress', slug: 'cypress', description: 'JavaScript E2E and component testing', icon: '🌲', color: '#17202C' },
  { id: 'selenium', name: 'Selenium', slug: 'selenium', description: 'Cross-browser automation framework', icon: '🌐', color: '#43B02A' },
  { id: 'appium', name: 'Appium', slug: 'appium', description: 'Mobile app testing automation', icon: '📱', color: '#662D91' },
  { id: 'jest', name: 'Jest', slug: 'jest', description: 'JavaScript testing framework by Meta', icon: '🃏', color: '#C21325' },
  { id: 'pytest', name: 'Pytest', slug: 'pytest', description: 'Python testing framework', icon: '🐍', color: '#3776AB' },
  { id: 'k6', name: 'k6', slug: 'k6', description: 'Modern load testing by Grafana', icon: '⚡', color: '#7D64FF' },
  { id: 'jmeter', name: 'JMeter', slug: 'jmeter', description: 'Apache load testing tool', icon: '🔨', color: '#D22128' },
  { id: 'postman', name: 'Postman', slug: 'postman', description: 'API development and testing platform', icon: '📮', color: '#FF6C37' },
  { id: 'rest-assured', name: 'REST Assured', slug: 'rest-assured', description: 'Java REST API testing library', icon: '☕', color: '#5B8C00' },
  { id: 'cucumber', name: 'Cucumber', slug: 'cucumber', description: 'BDD testing with Gherkin syntax', icon: '🥒', color: '#23D96C' },
  { id: 'axe-core', name: 'Axe-core', slug: 'axe-core', description: 'Accessibility testing engine', icon: '♿', color: '#4B2E83' },
  { id: 'pact', name: 'Pact', slug: 'pact', description: 'Contract testing framework', icon: '🤝', color: '#08B7AA' },
  { id: 'gatling', name: 'Gatling', slug: 'gatling', description: 'Scala-based load testing', icon: '🎯', color: '#FF6600' },
  { id: 'locust', name: 'Locust', slug: 'locust', description: 'Python load testing framework', icon: '🦗', color: '#46962B' },
] as const;

export const FRAMEWORK_IDS = FRAMEWORKS.map((f) => f.id);
export type FrameworkId = (typeof FRAMEWORKS)[number]['id'];
