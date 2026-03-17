'use client';

import Link from 'next/link';
import { Trophy, TrendingUp, Flame, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { trackEvent } from '@/lib/analytics';

const iconMap = {
  Trophy,
  TrendingUp,
  Flame,
  Clock,
} as const;

export type TabIcon = keyof typeof iconMap;

export interface Tab {
  id: string;
  label: string;
  icon: TabIcon;
}

interface FilterTabsProps {
  tabs: Tab[];
  activeFilter: string;
}

export function FilterTabs({ tabs, activeFilter }: FilterTabsProps) {
  return (
    <div className="mb-6 flex gap-2">
      {tabs.map((tab) => {
        const isActive = activeFilter === tab.id;
        const href = tab.id === 'all' ? '/leaderboard' : `/leaderboard?filter=${tab.id}`;
        const Icon = iconMap[tab.icon];
        return (
          <Link
            key={tab.id}
            href={href}
            onClick={() => {
              trackEvent('leaderboard_filter_click', { filter: tab.id });
            }}
          >
            <Badge
              variant={isActive ? 'default' : 'outline'}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5"
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}
