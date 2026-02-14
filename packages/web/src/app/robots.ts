import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/sign-in/', '/sign-up/', '/unsubscribe'],
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/sign-in/', '/sign-up/', '/unsubscribe'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/sign-in/', '/sign-up/', '/unsubscribe'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/sign-in/', '/sign-up/', '/unsubscribe'],
      },
      {
        userAgent: 'Amazonbot',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/sign-in/', '/sign-up/', '/unsubscribe'],
      },
    ],
    sitemap: 'https://qaskills.sh/sitemap.xml',
  };
}
