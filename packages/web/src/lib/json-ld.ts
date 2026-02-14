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
    logo: {
      '@type': 'ImageObject',
      url: 'https://qaskills.sh/logo.png',
      width: 512,
      height: 512,
    },
    founder: {
      '@type': 'Person',
      name: 'Pramod Dutta',
      url: 'https://youtube.com/@TheTestingAcademy',
    },
    sameAs: [
      'https://youtube.com/@TheTestingAcademy',
      'https://github.com/PramodDutta/qaskills',
    ],
  };
}

export function generateSkillJsonLd(skill: {
  name: string;
  description: string;
  author: string;
  installCount: number;
  qualityScore: number;
  slug: string;
  reviewCount?: number;
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
      ratingCount: skill.reviewCount || Math.max(1, Math.floor(skill.installCount / 100)),
    },
    url: `https://qaskills.sh/skills/${skill.author}/${skill.slug}`,
  };
}

export function generateBlogPostJsonLd(post: {
  title: string;
  description: string;
  date: string;
  slug: string;
  dateModified?: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.dateModified || post.date,
    ...(post.image && { image: post.image }),
    author: {
      '@type': 'Person',
      name: 'Pramod Dutta',
      url: 'https://youtube.com/@TheTestingAcademy',
    },
    publisher: {
      '@type': 'Organization',
      name: 'QASkills.sh',
      url: 'https://qaskills.sh',
      logo: { '@type': 'ImageObject', url: 'https://qaskills.sh/logo.png' },
    },
    url: `https://qaskills.sh/blog/${post.slug}`,
    mainEntityOfPage: `https://qaskills.sh/blog/${post.slug}`,
  };
}

export function generateBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
