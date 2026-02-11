import { notFound } from 'next/navigation';
import { Download, Package, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkillCard } from '@/components/skills/skill-card';
import { formatNumber } from '@/lib/utils';
import type { Metadata } from 'next';

interface UserPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username} — QA Skills Publisher`,
    description: `View ${username}'s published QA skills`,
  };
}

export default async function UserProfilePage({ params }: UserPageProps) {
  const { username } = await params;

  // TODO: Fetch from database
  const user = {
    username,
    name: 'The Testing Academy',
    avatar: '',
    bio: 'Building the world\'s largest QA skills directory for AI coding agents. 189K+ YouTube subscribers.',
    githubHandle: 'TheTestingAcademy',
    verifiedPublisher: true,
    totalInstalls: 11280,
    skillsPublished: 20,
  };

  const userSkills = [
    { id: '1', name: 'Playwright E2E Testing', slug: 'playwright-e2e', description: 'Comprehensive Playwright end-to-end testing patterns', author: username, qualityScore: 92, installCount: 1250, testingTypes: ['e2e', 'visual'], frameworks: ['playwright'], featured: true, verified: true },
    { id: '12', name: 'Jest Unit Testing', slug: 'jest-unit', description: 'Jest unit testing patterns with mocking and spies', author: username, qualityScore: 91, installCount: 980, testingTypes: ['unit'], frameworks: ['jest'], featured: true, verified: true },
    { id: '3', name: 'Cypress E2E Testing', slug: 'cypress-e2e', description: 'Cypress end-to-end testing with custom commands', author: username, qualityScore: 90, installCount: 1100, testingTypes: ['e2e'], frameworks: ['cypress'], featured: true, verified: true },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Profile header */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{user.name}</h1>
                {user.verifiedPublisher && <Badge variant="success">Verified</Badge>}
              </div>
              <p className="text-muted-foreground">@{user.username}</p>
              <p className="mt-2 text-sm">{user.bio}</p>
              <div className="mt-4 flex gap-6 text-sm">
                <span className="flex items-center gap-1">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <strong>{formatNumber(user.totalInstalls)}</strong> installs
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <strong>{user.skillsPublished}</strong> skills
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Published skills */}
      <h2 className="text-xl font-semibold mb-4">Published Skills</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {userSkills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </div>
    </div>
  );
}
