'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { parseSkillMd, serializeSkillMd } from '@qaskills/shared';
import { skillFrontmatterSchema } from '@qaskills/shared';
import type { SkillFrontmatter } from '@qaskills/shared';
import { SkillDescription } from '@/components/skills/skill-description';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Eye,
  Code,
} from 'lucide-react';
import Link from 'next/link';

const STARTER_TEMPLATE = (username: string) => `---
name: "My QA Skill"
description: "A concise description of what this skill does (10-500 chars)."
version: "1.0.0"
author: "${username}"
license: "MIT"
tags:
  - example
testingTypes:
  - e2e
frameworks:
  - playwright
languages:
  - typescript
domains:
  - web
agents:
  - claude-code
  - cursor
  - github-copilot
---

# My QA Skill

You are an expert QA engineer. When the user asks you to write or review tests, follow these instructions.

## Core Principles

1. **Write reliable tests** -- Tests should be deterministic and not flaky.
2. **Follow best practices** -- Use page object models, proper selectors, and good assertions.

## When to Use

- Writing end-to-end tests for web applications
- Reviewing existing test suites for improvements

## Example

\`\`\`typescript
test('user can log in', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
\`\`\`
`;

interface ParseResult {
  frontmatter: SkillFrontmatter | null;
  content: string;
  errors: string[];
}

function useDebouncedParse(raw: string, delay: number): ParseResult {
  const [result, setResult] = useState<ParseResult>({
    frontmatter: null,
    content: '',
    errors: [],
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!raw.trim()) {
        setResult({ frontmatter: null, content: '', errors: ['Editor is empty'] });
        return;
      }
      try {
        const parsed = parseSkillMd(raw);
        const validation = skillFrontmatterSchema.safeParse(parsed.frontmatter);
        if (!validation.success) {
          const msgs = validation.error.issues.map(
            (i) => `${i.path.join('.')}: ${i.message}`,
          );
          setResult({ frontmatter: parsed.frontmatter, content: parsed.content, errors: msgs });
        } else {
          setResult({ frontmatter: parsed.frontmatter, content: parsed.content, errors: [] });
        }
      } catch (e) {
        setResult({
          frontmatter: null,
          content: '',
          errors: [e instanceof Error ? e.message : 'Failed to parse SKILL.md'],
        });
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [raw, delay]);

  return result;
}

export function SkillCreator() {
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const { user } = useUser();
  const cloneParam = searchParams.get('clone');

  const [editorContent, setEditorContent] = useState('');
  const [loading, setLoading] = useState(!!cloneParam);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publishedAuthor, setPublishedAuthor] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const username = user?.username || user?.firstName || 'your-username';

  const { frontmatter, content, errors } = useDebouncedParse(editorContent, 300);
  const isValid = errors.length === 0 && frontmatter !== null;

  // Load content: clone or blank template
  useEffect(() => {
    if (cloneParam) {
      const slug = cloneParam.includes('/') ? cloneParam.split('/').pop() : cloneParam;
      if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
        setEditorContent(STARTER_TEMPLATE(username));
        setLoading(false);
        return;
      }
      fetch(`/api/skills/${encodeURIComponent(slug)}/content`)
        .then((res) => {
          if (!res.ok) throw new Error('Skill not found');
          return res.text();
        })
        .then((md) => {
          // Replace author with current user and append (Fork) to name
          try {
            const parsed = parseSkillMd(md);
            const fm = parsed.frontmatter;
            const originalAuthor = fm.author;
            fm.author = username;
            if (!fm.name.includes('(Fork)')) {
              fm.name = `${fm.name} (Fork)`;
            }

            // Rebuild the SKILL.md with updated frontmatter
            let body = parsed.content;
            // Add fork attribution
            body = `> Forked from [${originalAuthor}/${slug}](https://qaskills.sh/skills/${originalAuthor}/${slug})\n\n${body}`;
            setEditorContent(serializeSkillMd(fm, body));
          } catch {
            // Fallback: just load the raw content
            setEditorContent(md);
          }
          setLoading(false);
        })
        .catch(() => {
          setEditorContent(STARTER_TEMPLATE(username));
          setLoading(false);
        });
    } else {
      setEditorContent(STARTER_TEMPLATE(username));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePublish = useCallback(async () => {
    if (!isValid || !frontmatter) return;
    setPublishing(true);
    setPublishError(null);

    try {
      const token = await getToken();

      const body = {
        name: frontmatter.name,
        description: frontmatter.description,
        fullDescription: content,
        version: frontmatter.version || '1.0.0',
        license: frontmatter.license || 'MIT',
        testingTypes: frontmatter.testingTypes || [],
        frameworks: frontmatter.frameworks || [],
        languages: frontmatter.languages || [],
        domains: frontmatter.domains || [],
        agents: frontmatter.agents || [],
        tags: frontmatter.tags || [],
        githubUrl: '',
      };

      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setPublishError(data.error || 'Failed to publish skill');
      } else {
        setPublishedSlug(data.skill.slug);
        setPublishedAuthor(data.skill.authorName);
        window?.datafast?.('publish_skill_editor', { slug: data.skill.slug });
      }
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setPublishing(false);
    }
  }, [isValid, frontmatter, content, getToken]);

  // Success state
  if (publishedSlug) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Skill Published!</h1>
        <p className="text-muted-foreground mb-6">
          Your skill is now live in the QASkills directory.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link href={`/skills/${publishedAuthor || username}/${publishedSlug}`}>View Skill</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Loading skill content...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {cloneParam ? 'Clone & Edit Skill' : 'Create Skill'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Edit raw SKILL.md with live preview
            </p>
          </div>
        </div>
        <Button onClick={handlePublish} disabled={!isValid || publishing}>
          {publishing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {publishing ? 'Publishing...' : 'Publish'}
        </Button>
      </div>

      {/* Mobile tab switcher */}
      <div className="flex gap-2 mb-4 lg:hidden">
        <Button
          variant={mobileTab === 'editor' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMobileTab('editor')}
        >
          <Code className="h-4 w-4" /> Editor
        </Button>
        <Button
          variant={mobileTab === 'preview' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMobileTab('preview')}
        >
          <Eye className="h-4 w-4" /> Preview
        </Button>
      </div>

      {/* Split pane */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ minHeight: '70vh' }}>
        {/* Editor */}
        <div className={`flex flex-col ${mobileTab !== 'editor' ? 'hidden lg:flex' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">SKILL.md</span>
            <span className="text-xs text-muted-foreground">
              {editorContent.split('\n').length} lines
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            aria-label="SKILL.md editor content"
            className="flex-1 w-full rounded-md border border-border bg-muted/30 p-4 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            spellCheck={false}
          />
        </div>

        {/* Preview */}
        <div className={`flex flex-col ${mobileTab !== 'preview' ? 'hidden lg:flex' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Preview</span>
          </div>
          <Card className="flex-1 overflow-auto p-6">
            {frontmatter ? (
              <div className="space-y-6">
                {/* Metadata */}
                <div>
                  <h2 className="text-2xl font-bold">{frontmatter.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    by {frontmatter.author}
                    {' '}&middot;{' '}
                    v{frontmatter.version}
                  </p>
                  <p className="mt-3 text-muted-foreground">{frontmatter.description}</p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {frontmatter.testingTypes.map((t) => (
                    <Badge key={`tt-${t}`} variant="default">{t}</Badge>
                  ))}
                  {frontmatter.frameworks.map((f) => (
                    <Badge key={`fw-${f}`} variant="secondary">{f}</Badge>
                  ))}
                  {frontmatter.languages.map((l) => (
                    <Badge key={`lang-${l}`} variant="outline">{l}</Badge>
                  ))}
                  {frontmatter.domains.map((d) => (
                    <Badge key={`dom-${d}`} variant="outline">{d}</Badge>
                  ))}
                </div>

                {/* Markdown body */}
                {content && (
                  <div className="border-t border-border pt-4">
                    <SkillDescription content={content} />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Start typing in the editor to see a preview
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* Validation bar */}
      <div className="mt-4">
        {publishError && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-4 py-2 mb-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {publishError}
          </div>
        )}
        {errors.length > 0 ? (
          <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-4 py-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              {errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          </div>
        ) : frontmatter ? (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-md px-4 py-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Valid SKILL.md — ready to publish
          </div>
        ) : null}
      </div>
    </div>
  );
}
