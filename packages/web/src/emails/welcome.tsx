import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface WelcomeEmailProps {
  username: string;
  unsubscribeUrl?: string;
}

export default function WelcomeEmail({ username, unsubscribeUrl }: WelcomeEmailProps) {
  // UTM parameters for tracking email clicks
  const utmParams = '?utm_source=email&utm_medium=welcome&utm_campaign=user_onboarding';

  return (
    <Html>
      <Head />
      <Preview>Welcome to QASkills.sh - Your QA Skills Directory</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to QASkills.sh! 🎉</Heading>
          <Text style={text}>Hi {username},</Text>
          <Text style={text}>
            Thank you for joining QASkills.sh, the curated directory of QA testing skills for AI
            coding agents. We're excited to have you as part of our community!
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={`https://qaskills.sh/skills${utmParams}`}>
              Browse Skills
            </Button>
          </Section>

          <Text style={text}>Here's what you can do now:</Text>
          <ul style={list}>
            <li style={listItem}>
              <strong>Explore Skills:</strong> Browse 300+ curated QA testing skills for AI agents
            </li>
            <li style={listItem}>
              <strong>Install Skills:</strong> Use our CLI to add skills to your AI agent instantly
            </li>
            <li style={listItem}>
              <strong>View Packs:</strong> Get entire testing toolkits with one command
            </li>
            <li style={listItem}>
              <strong>Publish Skills:</strong> Share your own QA skills with the community
            </li>
          </ul>

          <Text style={text}>
            Need help getting started? Check out our{' '}
            <Link href={`https://qaskills.sh/getting-started${utmParams}`} style={link}>
              Getting Started Guide
            </Link>
            .
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            QASkills.sh - The Testing Academy
            <br />
            <Link href={`https://qaskills.sh/dashboard/preferences${utmParams}`} style={link}>
              Email Preferences
            </Link>{' '}
            |{' '}
            <Link href={`https://qaskills.sh${utmParams}`} style={link}>
              Visit Website
            </Link>
            {unsubscribeUrl && (
              <>
                {' '}
                |{' '}
                <Link href={unsubscribeUrl} style={link}>
                  Unsubscribe
                </Link>
              </>
            )}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 48px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 48px',
};

const list = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  paddingLeft: '48px',
  paddingRight: '48px',
};

const listItem = {
  marginBottom: '12px',
};

const buttonContainer = {
  padding: '27px 48px',
};

const button = {
  backgroundColor: '#007bff',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 48px',
};

const link = {
  color: '#007bff',
  textDecoration: 'underline',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 48px',
};
