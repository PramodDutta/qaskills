'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Upload, Check, Github } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const steps = ['Repository', 'Parse SKILL.md', 'Categories', 'Preview', 'Publish'];

export default function PublishPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [repoUrl, setRepoUrl] = useState('');

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

      {/* Step content */}
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
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
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
              <Button onClick={() => setCurrentStep(1)} disabled={!repoUrl}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Parsing SKILL.md</CardTitle>
            <CardDescription>We found and validated your SKILL.md file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <div className="flex items-center gap-2 mb-3">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">SKILL.md found and validated</span>
              </div>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span> My QA Skill</div>
                <div><span className="text-muted-foreground">Description:</span> A skill for testing</div>
                <div><span className="text-muted-foreground">Content:</span> 150 lines</div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setCurrentStep(2)}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                {['E2E', 'API', 'Unit', 'Integration', 'Performance', 'Security'].map((t) => (
                  <Badge key={t} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">{t}</Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Frameworks</label>
              <div className="flex flex-wrap gap-2">
                {['Playwright', 'Cypress', 'Jest', 'Pytest', 'Selenium', 'k6'].map((f) => (
                  <Badge key={f} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">{f}</Badge>
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

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Review how your skill will appear in the directory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border p-4">
              <h3 className="font-semibold text-lg">My QA Skill</h3>
              <p className="text-sm text-muted-foreground mt-1">A skill for testing</p>
              <div className="mt-3 flex gap-2">
                <Badge>E2E</Badge>
                <Badge variant="secondary">Playwright</Badge>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setCurrentStep(4)}>
                <Upload className="h-4 w-4" /> Publish
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Skill Published!</h3>
            <p className="mt-2 text-muted-foreground">Your skill is now live in the directory.</p>
            <div className="mt-6 flex gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild>
                <Link href="/skills">View in Directory</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
