export const TESTING_TYPES = [
  { id: 'e2e', name: 'E2E Testing', slug: 'e2e', description: 'End-to-end browser and UI testing', icon: '🔄', color: '#3B82F6' },
  { id: 'api', name: 'API Testing', slug: 'api', description: 'REST, GraphQL, and gRPC API testing', icon: '🔌', color: '#10B981' },
  { id: 'unit', name: 'Unit Testing', slug: 'unit', description: 'Isolated function and component testing', icon: '🧪', color: '#8B5CF6' },
  { id: 'integration', name: 'Integration Testing', slug: 'integration', description: 'Multi-component integration testing', icon: '🔗', color: '#F59E0B' },
  { id: 'performance', name: 'Performance Testing', slug: 'performance', description: 'Load, stress, and performance testing', icon: '⚡', color: '#EF4444' },
  { id: 'security', name: 'Security Testing', slug: 'security', description: 'OWASP, penetration, and vulnerability testing', icon: '🛡️', color: '#DC2626' },
  { id: 'accessibility', name: 'Accessibility Testing', slug: 'accessibility', description: 'WCAG compliance and a11y testing', icon: '♿', color: '#06B6D4' },
  { id: 'mobile', name: 'Mobile Testing', slug: 'mobile', description: 'iOS and Android app testing', icon: '📱', color: '#D946EF' },
  { id: 'visual', name: 'Visual Regression', slug: 'visual', description: 'Screenshot comparison and visual diff testing', icon: '👁️', color: '#F97316' },
  { id: 'contract', name: 'Contract Testing', slug: 'contract', description: 'API consumer-driven contract testing', icon: '📜', color: '#14B8A6' },
  { id: 'load', name: 'Load Testing', slug: 'load', description: 'Scalability and load capacity testing', icon: '📊', color: '#EC4899' },
  { id: 'chaos', name: 'Chaos Testing', slug: 'chaos', description: 'Chaos engineering and resilience testing', icon: '💥', color: '#78716C' },
  { id: 'bdd', name: 'BDD Testing', slug: 'bdd', description: 'Behavior-driven development with Gherkin', icon: '📝', color: '#84CC16' },
  { id: 'database', name: 'Database Testing', slug: 'database', description: 'Data integrity and migration testing', icon: '🗄️', color: '#A855F7' },
  { id: 'compliance', name: 'Compliance Testing', slug: 'compliance', description: 'Regulatory and standards compliance', icon: '✅', color: '#22C55E' },
] as const;

export const TESTING_TYPE_IDS = TESTING_TYPES.map((t) => t.id);
export type TestingTypeId = (typeof TESTING_TYPES)[number]['id'];
