import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 420,
  slug: 'email-template-accessible-cta-tests',
  campaignCluster: 'web-platform',
  title: 'Email Template Accessible Cta Tests',
  description:
    'email template accessible CTA tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'email template accessible CTA tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify email template accessible CTA in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns email template accessible CTA as implemented by the cited QASkills files. It excludes broad email client initialization, template data, and normalized delivery results guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test email template accessible CTA',
    'email template accessible CTA edge cases',
    'email template accessible CTA integration coverage',
    'email template accessible CTA Playwright assertions',
    'email template accessible CTA fallback behavior',
    'email template accessible CTA regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/emails/welcome.tsx',
    'packages/web/src/emails/new-skill-alert.tsx',
    'packages/web/src/emails/weekly-digest.tsx',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/packs',
    '/faq',
    '/contact',
    '/blog/react-nextjs-testing-complete-guide',
    '/blog/api-testing-complete-guide',
    '/blog/database-testing-automation-guide',
    '/blog/authentication-authorization-testing-guide',
  ],
  relatedSlugs: [
    'react-nextjs-testing-complete-guide',
    'api-testing-complete-guide',
    'database-testing-automation-guide',
    'authentication-authorization-testing-guide',
  ],
  sources: [
    'https://resend.com/docs/api-reference/emails/send-email',
    'https://resend.com/docs/knowledge-base/template-emails-with-react-email',
    'https://react.email/docs/introduction',
  ],
  codeExamples: [
    {
      title: 'Build the email template accessible CTA tests baseline',
      language: 'typescript',
      path: 'packages/web/src/emails/welcome.tsx',
      snippet:
        "export default function WelcomeEmail({ username, unsubscribeUrl }: WelcomeEmailProps) {\n  // UTM parameters for tracking email clicks\n  const utmParams = '?utm_source=email&utm_medium=welcome&utm_campaign=user_onboarding';\n\n  return (\n    <Html>\n      <Head />\n      <Preview>Welcome to QASkills.sh - Your QA Skills Directory</Preview>\n      <Body style={main}>\n        <Container style={container}>\n          <Heading style={h1}>Welcome to QASkills.sh! </Heading>\n          <Text style={text}>Hi {username},</Text>\n          <Text style={text}>\n            Thank you for joining QASkills.sh, the curated directory of QA testing skills for AI\n            coding agents. We're excited to have you as part of our community!\n          </Text>\n\n          <Section style={buttonContainer}>",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/emails/new-skill-alert.tsx',
      snippet:
        'return (\n    <Html>\n      <Head />\n      <Preview>New QA Skill: {skillName}</Preview>\n      <Body style={main}>\n        <Container style={container}>\n          <Heading style={h1}>New QA Skill Available </Heading>\n\n          <Text style={text}>A new skill has been published on QASkills.sh:</Text>\n\n          <Section style={skillCard}>\n            <Heading style={skillTitle}>{skillName}</Heading>\n            <Text style={skillDescriptionStyle}>{skillDescription}</Text>\n            <Text style={skillAuthorStyle}>by {authorName}</Text>\n          </Section>\n\n          <Section style={buttonContainer}>\n            <Button style={button} href={skillUrl}>',
    },
  ],
});
