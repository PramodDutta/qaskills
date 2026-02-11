import { notFound } from 'next/navigation';
import { Download, Package, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkillCard } from '@/components/skills/skill-card';
import { formatNumber } from '@/lib/utils';
import { db } from '@/db';
import { users, skills } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';

interface UserPageProps {
  params: Promise<{ username: string }>;
}

async function getUserData(username: string) {
  try {
    // First try to find the user in the users table
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    // Query skills authored by this username
    const userSkills = await db
      .select({
        id: skills.id,
        name: skills.name,
        slug: skills.slug,
        description: skills.description,
        authorName: skills.authorName,
        qualityScore: skills.qualityScore,
        installCount: skills.installCount,
        testingTypes: skills.testingTypes,
        frameworks: skills.frameworks,
        featured: skills.featured,
        verified: skills.verified,
      })
      .from(skills)
      .where(eq(skills.authorName, username));

    // Calculate total installs from actual skills
    const totalInstalls = userSkills.reduce((sum, s) => sum + s.installCount, 0);

    if (dbUser) {
      return {
        user: {
          username: dbUser.username,
          name: dbUser.name || dbUser.username,
          avatar: dbUser.avatar || '',
          bio: dbUser.bio || '',
          githubHandle: dbUser.githubHandle || '',
          verifiedPublisher: dbUser.verifiedPublisher,
          totalInstalls: totalInstalls > 0 ? totalInstalls : dbUser.totalInstalls,
          skillsPublished: userSkills.length > 0 ? userSkills.length : dbUser.skillsPublished,
          joinDate: dbUser.createdAt,
        },
        skills: userSkills.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          description: s.description,
          author: s.authorName,
          qualityScore: s.qualityScore,
          installCount: s.installCount,
          testingTypes: s.testingTypes as string[],
          frameworks: s.frameworks as string[],
          featured: s.featured,
          verified: s.verified,
        })),
      };
    }

    // No user row found — try matching against skills.authorName
    if (userSkills.length > 0) {
      return {
        user: {
          username,
          name: username,
          avatar: '',
          bio: '',
          githubHandle: '',
          verifiedPublisher: false,
          totalInstalls,
          skillsPublished: userSkills.length,
          joinDate: null,
        },
        skills: userSkills.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          description: s.description,
          author: s.authorName,
          qualityScore: s.qualityScore,
          installCount: s.installCount,
          testingTypes: s.testingTypes as string[],
          frameworks: s.frameworks as string[],
          featured: s.featured,
          verified: s.verified,
        })),
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch user data from DB:', error);
    return null;
  }
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { username } = await params;

  let title = `${username} — QA Skills Publisher`;
  let description = `View ${username}'s published QA testing skills for AI coding agents on QASkills.sh.`;

  try {
    const data = await getUserData(username);
    if (data) {
      title = `${data.user.name} (@${data.user.username}) — QA Skills Publisher`;
      description = data.user.bio || `View ${data.user.name}'s ${data.user.skillsPublished} published QA skills with ${formatNumber(data.user.totalInstalls)} total installs.`;
    }
  } catch {
    // Fall through to default
  }

  const ogImageUrl = `/api/og?title=${encodeURIComponent(username)}&description=${encodeURIComponent('QA Skills Publisher')}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://qaskills.sh/users/${username}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function UserProfilePage({ params }: UserPageProps) {
  const { username } = await params;

  const data = await getUserData(username);

  if (!data) {
    notFound();
  }

  const { user, skills: userSkills } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Profile header */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{user.name}</h1>
                {user.verifiedPublisher && <Badge variant="success">Verified</Badge>}
              </div>
              <p className="text-muted-foreground">@{user.username}</p>
              {user.bio && <p className="mt-2 text-sm">{user.bio}</p>}
              {user.githubHandle && (
                <a
                  href={`https://github.com/${user.githubHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm text-muted-foreground hover:text-primary"
                >
                  github.com/{user.githubHandle}
                </a>
              )}
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
      {userSkills.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userSkills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No skills published yet.</p>
      )}
    </div>
  );
}
