'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Upload, Check, Github, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const steps = ['Repository', 'Parse SKILL.md', 'Categories', 'Preview', 'Publish'];

// Available options for category selection
const TESTING_TYPES = ['E2E', 'API', 'Unit', 'Integration', 'Performance', 'Security', 'Accessibility', 'Visual'];
const FRAMEWORKS = ['Playwright', 'Cypress', 'Jest', 'Pytest', 'Selenium', 'k6', 'WebdriverIO', 'TestCafe'];
const LANGUAGES = ['TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'Ruby', 'C#'];
const DOMAINS = ['Web', 'Mobile', 'API', 'Database', 'CI/CD', 'DevOps', 'Cloud'];
const AGENTS = ['Claude', 'GPT-4', 'Gemini', 'Copilot', 'Cursor', 'Codex'];

interface FormData {
  name: string;
  description: string;
  fullDescription: string;
  githubUrl: string;
  version: string;
  license: string;
  testingTypes: string[];
  frameworks: string[];
  languages: string[];
  domains: string[];
  agents: string[];
  tags: string[];
}

interface PublishResult {
  skill: {
    id: string;
    name: string;
    slug: string;
    description: string;
    qualityScore: number;
  };
}

export default function PublishPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    fullDescription: '',
    githubUrl: '',
    version: '1.0.0',
    license: 'MIT',
    testingTypes: [],
    frameworks: [],
    languages: [],
    domains: [],
    agents: [],
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);

  // Toggle item in a string array field
  function toggleArrayItem(field: keyof FormData, item: string) {
    setFormData((prev) => {
      const arr = prev[field] as string[];
      const next = arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];
      return { ...prev, [field]: next };
    });
  }

  // Add a tag from the input
  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  }

  // Validate that the minimum required fields for each step are filled
  function canProceedFromStep(step: number): boolean {
    switch (step) {
      case 0:
        return formData.githubUrl.length > 0;
      case 1:
        return formData.name.length > 0 && formData.description.length >= 10;
      case 2:
        return true; // Categories are optional but helpful
      case 3:
        return true; // Preview step, just review
      default:
        return false;
    }
  }

  // Submit skill to the API
  async function handlePublish() {
    setIsSubmitting(true);
    setPublishError(null);

    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          fullDescription: formData.fullDescription,
          githubUrl: formData.githubUrl,
          version: formData.version,
          license: formData.license,
          testingTypes: formData.testingTypes,
          frameworks: formData.frameworks,
          languages: formData.languages,
          domains: formData.domains,
          agents: formData.agents,
          tags: formData.tags,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setPublishError(json.error || `Failed to publish skill (${res.status})`);
        return;
      }

      setPublishResult(json as PublishResult);
      setCurrentStep(4);
    } catch (err) {
      setPublishError(
        err instanceof Error ? err.message : 'Network error. Please check your connection and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link href="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Publish a Skill</h1>
        <p className="mt-1 text-muted-foreground">Share your QA skill with the community</p>
      </div>

      {/* Steps indicator */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                i <= currentStep
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`hidden sm:block text-sm ${i <= currentStep ? 'font-medium' : 'text-muted-foreground'}`}>
              {step}
            </span>
            {i < steps.length - 1 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 0: Repository */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" /> Link GitHub Repository
            </CardTitle>
            <CardDescription>
              Enter the URL of your GitHub repository containing a SKILL.md file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">GitHub Repository URL</label>
              <Input
                placeholder="https://github.com/username/my-qa-skill"
                value={formData.githubUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, githubUrl: e.target.value }))}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Your repository should contain a <code className="rounded bg-muted px-1 py-0.5">SKILL.md</code> file at the root with:</p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>YAML frontmatter with name, description, testing types, frameworks</li>
                <li>Markdown body with skill instructions for AI agents</li>
              </ul>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setCurrentStep(1)} disabled={!canProceedFromStep(0)}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Parse SKILL.md — manual entry of skill metadata */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Skill Details</CardTitle>
            <CardDescription>Enter the details from your SKILL.md file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Playwright E2E Login Tests"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Description <span className="text-red-500">*</span>
                <span className="text-xs text-muted-foreground ml-1">(min 10 characters)</span>
              </label>
              <Input
                placeholder="A concise description of what this skill does"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Full Description</label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Detailed description of your skill including usage instructions, prerequisites, and examples..."
                value={formData.fullDescription}
                onChange={(e) => setFormData((prev) => ({ ...prev, fullDescription: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Version</label>
                <Input
                  placeholder="1.0.0"
                  value={formData.version}
                  onChange={(e) => setFormData((prev) => ({ ...prev, version: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">License</label>
                <Input
                  placeholder="MIT"
                  value={formData.license}
                  onChange={(e) => setFormData((prev) => ({ ...prev, license: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag} &times;
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setCurrentStep(2)} disabled={!canProceedFromStep(1)}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Categories */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Assign Categories</CardTitle>
            <CardDescription>Help users find your skill with the right categories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Testing Types</label>
              <div className="flex flex-wrap gap-2">
                {TESTING_TYPES.map((t) => (
                  <Badge
                    key={t}
                    variant={formData.testingTypes.includes(t) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => toggleArrayItem('testingTypes', t)}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Frameworks</label>
              <div className="flex flex-wrap gap-2">
                {FRAMEWORKS.map((f) => (
                  <Badge
                    key={f}
                    variant={formData.frameworks.includes(f) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => toggleArrayItem('frameworks', f)}
                  >
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Languages</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <Badge
                    key={l}
                    variant={formData.languages.includes(l) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => toggleArrayItem('languages', l)}
                  >
                    {l}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Domains</label>
              <div className="flex flex-wrap gap-2">
                {DOMAINS.map((d) => (
                  <Badge
                    key={d}
                    variant={formData.domains.includes(d) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => toggleArrayItem('domains', d)}
                  >
                    {d}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Compatible Agents</label>
              <div className="flex flex-wrap gap-2">
                {AGENTS.map((a) => (
                  <Badge
                    key={a}
                    variant={formData.agents.includes(a) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => toggleArrayItem('agents', a)}
                  >
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setCurrentStep(3)}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Review how your skill will appear in the directory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border p-4 space-y-3">
              <h3 className="font-semibold text-lg">{formData.name || 'Untitled Skill'}</h3>
              <p className="text-sm text-muted-foreground">{formData.description || 'No description'}</p>
              {formData.fullDescription && (
                <p className="text-sm text-muted-foreground border-t border-border pt-2 mt-2">
                  {formData.fullDescription.length > 200
                    ? `${formData.fullDescription.slice(0, 200)}...`
                    : formData.fullDescription}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {formData.testingTypes.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
                {formData.frameworks.map((f) => (
                  <Badge key={f} variant="secondary">{f}</Badge>
                ))}
                {formData.languages.map((l) => (
                  <Badge key={l} variant="outline">{l}</Badge>
                ))}
              </div>
              {formData.agents.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Compatible agents: {formData.agents.join(', ')}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t border-border pt-2">
                <div>Version: {formData.version}</div>
                <div>License: {formData.license}</div>
                {formData.githubUrl && <div className="col-span-2 truncate">Repo: {formData.githubUrl}</div>}
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {formData.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded">#{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Error message */}
            {publishError && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{publishError}</span>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handlePublish} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Publishing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Publish
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Success */}
      {currentStep === 4 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Skill Published!</h3>
            <p className="mt-2 text-muted-foreground">
              Your skill is now live in the directory
              {publishResult?.skill.qualityScore != null && (
                <> with a quality score of <strong>{publishResult.skill.qualityScore}/100</strong></>
              )}
              .
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              {publishResult?.skill.slug ? (
                <Button asChild>
                  <Link href={`/skills/${publishResult.skill.slug}`}>View Skill</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/skills">View in Directory</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
