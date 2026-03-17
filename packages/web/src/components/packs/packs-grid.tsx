'use client';

import { useAuth } from '@clerk/nextjs';
import { Package, Download } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InstallButton } from '@/components/skills/install-button';
import { SignupGate } from '@/components/auth/signup-gate';
import { formatNumber } from '@/lib/utils';
import { trackPackAction } from '@/lib/analytics';

interface Pack {
  name: string;
  slug: string;
  description: string;
  skills: string[];
  skillCount: number;
  installs: number;
  featured: boolean;
}

interface PacksGridProps {
  packs: Pack[];
}

function PackCard({ pack }: { pack: Pack }) {
  return (
    <Card
      key={pack.slug}
      className="flex flex-col"
      onClick={() => {
        trackPackAction('view', pack.slug);
      }}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {pack.featured && (
              <Badge variant="success" className="text-xs">
                Featured
              </Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Download className="h-3 w-3" /> {formatNumber(pack.installs)}
          </span>
        </div>
        <CardTitle className="mt-2">{pack.name}</CardTitle>
        <CardDescription>{pack.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {pack.skillCount} Skills Included
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pack.skills.map((s) => (
              <Badge key={s} variant="outline" className="text-xs">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-3">
        <InstallButton skillSlug={pack.slug} />
      </CardFooter>
    </Card>
  );
}

const FREE_PACK_COUNT = 2;

export function PacksGrid({ packs }: PacksGridProps) {
  const { isSignedIn, isLoaded } = useAuth();

  const freePacks = packs.slice(0, FREE_PACK_COUNT);
  const gatedPacks = packs.slice(FREE_PACK_COUNT);

  // While auth is loading, show free packs + skeleton placeholders for gated ones
  if (!isLoaded) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {freePacks.map((pack) => (
          <PackCard key={pack.slug} pack={pack} />
        ))}
        {gatedPacks.map((pack) => (
          <div key={pack.slug} className="animate-pulse rounded-lg border bg-muted p-6">
            <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2" />
            <div className="h-4 bg-muted-foreground/20 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // Signed in: show all packs
  if (isSignedIn) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {packs.map((pack) => (
          <PackCard key={pack.slug} pack={pack} />
        ))}
      </div>
    );
  }

  // Not signed in: show free packs, then gate the rest
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {freePacks.map((pack) => (
          <PackCard key={pack.slug} pack={pack} />
        ))}
      </div>

      <SignupGate
        feature="packs_page"
        title="Sign in to view all skill packs"
        description="Create a free account to browse and install all curated skill packs."
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {gatedPacks.map((pack) => (
            <PackCard key={pack.slug} pack={pack} />
          ))}
        </div>
      </SignupGate>
    </div>
  );
}
