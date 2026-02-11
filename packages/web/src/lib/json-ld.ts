export function generateWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'QA Skills',
    url: 'https://qaskills.sh',
    description: 'The curated QA skills directory for AI coding agents',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://qaskills.sh/skills?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'The Testing Academy',
    url: 'https://qaskills.sh',
    sameAs: ['https://youtube.com/@TheTestingAcademy'],
  };
}

export function generateSkillJsonLd(skill: {
  name: string;
  description: string;
  author: string;
  installCount: number;
  qualityScore: number;
  slug: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: skill.name,
    description: skill.description,
    author: { '@type': 'Organization', name: skill.author },
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: (skill.qualityScore / 20).toFixed(1),
      bestRating: '5',
      ratingCount: skill.installCount,
    },
    url: `https://qaskills.sh/skills/thetestingacademy/${skill.slug}`,
  };
}

export function generateBlogPostJsonLd(post: {
  title: string;
  description: string;
  date: string;
  slug: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'The Testing Academy' },
    publisher: { '@type': 'Organization', name: 'QA Skills' },
    url: `https://qaskills.sh/blog/${post.slug}`,
  };
}
