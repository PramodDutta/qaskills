export const DOMAINS = [
  { id: 'web', name: 'Web', slug: 'web', description: 'Web application testing', icon: '🌐', color: '#3B82F6' },
  { id: 'mobile', name: 'Mobile', slug: 'mobile', description: 'iOS and Android testing', icon: '📱', color: '#D946EF' },
  { id: 'api', name: 'API', slug: 'api', description: 'Backend API and service testing', icon: '🔌', color: '#10B981' },
  { id: 'desktop', name: 'Desktop', slug: 'desktop', description: 'Desktop application testing', icon: '🖥️', color: '#6366F1' },
  { id: 'cloud', name: 'Cloud', slug: 'cloud', description: 'Cloud infrastructure testing', icon: '☁️', color: '#06B6D4' },
  { id: 'devops', name: 'DevOps', slug: 'devops', description: 'CI/CD and pipeline testing', icon: '🔧', color: '#F59E0B' },
] as const;

export const DOMAIN_IDS = DOMAINS.map((d) => d.id);
export type DomainId = (typeof DOMAINS)[number]['id'];
