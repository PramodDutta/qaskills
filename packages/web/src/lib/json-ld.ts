export function generateWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'QASkills.sh',
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
      url: 'https://qaskills.sh/logo.svg',
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
  averageRating?: number;
  version?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: skill.name,
    description: skill.description,
    image: `https://qaskills.sh/api/og?title=${encodeURIComponent(skill.name)}&description=${encodeURIComponent(skill.description)}&type=skill`,
    author: { '@type': 'Organization', name: skill.author },
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    ...(skill.reviewCount && skill.reviewCount > 0 && skill.averageRating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: skill.averageRating.toFixed(1),
            bestRating: '5',
            ratingCount: skill.reviewCount,
          },
        }
      : {}),
    ...(skill.version && { softwareVersion: skill.version }),
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
      logo: { '@type': 'ImageObject', url: 'https://qaskills.sh/logo.svg', width: 512, height: 512 },
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

export function generateCollectionPageJsonLd(page: {
  name: string;
  description: string;
  url: string;
  items?: Array<{ name: string; url: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: page.name,
    description: page.description,
    url: page.url,
    ...(page.items && page.items.length > 0 && {
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: page.items.length,
        itemListElement: page.items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          url: item.url,
        })),
      },
    }),
  };
}

export function generateArticleJsonLd(article: {
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.headline,
    description: article.description,
    url: article.url,
    ...(article.datePublished && { datePublished: article.datePublished }),
    ...(article.image && { image: article.image }),
    author: {
      '@type': 'Person',
      name: 'Pramod Dutta',
      url: 'https://youtube.com/@TheTestingAcademy',
    },
    publisher: {
      '@type': 'Organization',
      name: 'QASkills.sh',
      url: 'https://qaskills.sh',
      logo: {
        '@type': 'ImageObject',
        url: 'https://qaskills.sh/logo.svg',
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: article.url,
  };
}

export function generateFAQJsonLd(faqs: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function generateHowToJsonLd(howTo: {
  name: string;
  description: string;
  totalTime?: string;
  tool?: string[];
  steps: Array<{ name: string; text: string; url?: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: howTo.name,
    description: howTo.description,
    ...(howTo.totalTime && { totalTime: howTo.totalTime }),
    ...(howTo.tool && { tool: howTo.tool }),
    step: howTo.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      ...(s.url && { url: s.url }),
    })),
  };
}
