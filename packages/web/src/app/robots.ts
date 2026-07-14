import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const allow = ['/', '/api/og'];
  const disallow = ['/dashboard/', '/api/', '/unsubscribe'];

  return {
    rules: [
      {
        userAgent: '*',
        allow,
        disallow,
      },
      {
        userAgent: 'GPTBot',
        allow,
        disallow,
      },
      {
        userAgent: 'ClaudeBot',
        allow,
        disallow,
      },
      {
        userAgent: 'PerplexityBot',
        allow,
        disallow,
      },
      {
        userAgent: 'Amazonbot',
        allow,
        disallow,
      },
    ],
    sitemap: 'https://qaskills.sh/sitemap.xml',
  };
}
