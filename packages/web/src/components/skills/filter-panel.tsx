'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { TESTING_TYPES, FRAMEWORKS, LANGUAGES, DOMAINS } from '@qaskills/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  activeFacets?: {
    testingTypes?: string[];
    frameworks?: string[];
    languages?: string[];
    domains?: string[];
  };
}

export function FilterPanel({ activeFacets }: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const toggleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll(key);
    if (current.includes(value)) {
      params.delete(key);
      current.filter((v) => v !== value).forEach((v) => params.append(key, v));
    } else {
      params.append(key, value);
    }
    params.set('page', '1');
    router.push(`/skills?${params.toString()}`);
  };

  const isActive = (key: string, value: string) => {
    return searchParams.getAll(key).includes(value);
  };

  return (
    <aside className="space-y-6">
      <FilterSection
        title="Testing Type"
        items={TESTING_TYPES.map((t) => ({ id: t.id, name: t.name }))}
        filterKey="testingType"
        isActive={isActive}
        onToggle={toggleFilter}
      />
      <FilterSection
        title="Framework"
        items={FRAMEWORKS.map((f) => ({ id: f.id, name: f.name }))}
        filterKey="framework"
        isActive={isActive}
        onToggle={toggleFilter}
      />
      <FilterSection
        title="Language"
        items={LANGUAGES.map((l) => ({ id: l.id, name: l.name }))}
        filterKey="language"
        isActive={isActive}
        onToggle={toggleFilter}
      />
      <FilterSection
        title="Domain"
        items={DOMAINS.map((d) => ({ id: d.id, name: d.name }))}
        filterKey="domain"
        isActive={isActive}
        onToggle={toggleFilter}
      />
    </aside>
  );
}

function FilterSection({
  title,
  items,
  filterKey,
  isActive,
  onToggle,
}: {
  title: string;
  items: { id: string; name: string }[];
  filterKey: string;
  isActive: (key: string, value: string) => boolean;
  onToggle: (key: string, value: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge
            key={item.id}
            variant={isActive(filterKey, item.id) ? 'default' : 'outline'}
            className={cn('cursor-pointer transition-colors', isActive(filterKey, item.id) && 'bg-primary')}
            onClick={() => onToggle(filterKey, item.id)}
          >
            {item.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
