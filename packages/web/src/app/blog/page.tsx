import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { generateBreadcrumbJsonLd } from '@/lib/json-ld';
import { postList } from './posts';

export const metadata = {
  title: 'QA Testing Blog: Tutorials, Guides & AI Agent Tips',
  description:
    'Expert QA testing tutorials, framework comparisons, and AI agent guides. Playwright, Cypress, Selenium, Jest, pytest, and 100+ testing topics. By The Testing Academy.',
};

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'QASkills.sh Blog',
            description: 'QA testing insights, tutorials, and guides for AI coding agents.',
            url: 'https://qaskills.sh/blog',
            publisher: {
              '@type': 'Organization',
              name: 'QASkills.sh',
              url: 'https://qaskills.sh',
            },
            blogPost: postList.map((post) => ({
              '@type': 'BlogPosting',
              headline: post.title,
              datePublished: post.date,
              url: `https://qaskills.sh/blog/${post.slug}`,
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([
              { name: 'Home', url: 'https://qaskills.sh' },
              { name: 'Blog', url: 'https://qaskills.sh/blog' },
            ])
          ),
        }}
      />
      <div className="mb-12">
        <h1 className="text-4xl font-bold">Blog</h1>
        <p className="mt-2 text-muted-foreground">QA testing insights, AI agent tips, and skill development guides</p>
      </div>

      <div className="space-y-6">
        {postList.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{post.category}</Badge>
                  <span className="text-sm text-muted-foreground">{post.date}</span>
                </div>
                <CardTitle className="text-xl">{post.title}</CardTitle>
                <CardDescription className="text-base">{post.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
