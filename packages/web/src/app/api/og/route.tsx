import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'QASkills.sh';
  const description =
    searchParams.get('description') || 'The QA Skills Directory for AI Agents';
  const type = searchParams.get('type') || 'default';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          padding: '60px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          <span style={{ fontSize: '36px', fontWeight: 'bold' }}>
            QA
          </span>
          <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#6366f1' }}>
            Skills
          </span>
          <span style={{ fontSize: '28px', color: '#a1a1aa' }}>.sh</span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '56px',
            fontWeight: 'bold',
            textAlign: 'center',
            maxWidth: '900px',
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: '24px',
            color: '#a1a1aa',
            textAlign: 'center',
            maxWidth: '700px',
            marginTop: '20px',
            lineHeight: 1.4,
          }}
        >
          {description}
        </p>

        {/* Terminal decoration for skill type */}
        {type === 'skill' && (
          <div
            style={{
              display: 'flex',
              marginTop: '40px',
              padding: '16px 32px',
              background: '#18181b',
              borderRadius: '12px',
              border: '1px solid #27272a',
            }}
          >
            <code style={{ fontSize: '22px', color: '#6366f1' }}>
              $ npx qaskills add ...
            </code>
          </div>
        )}

        {/* Bottom tag */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '18px',
            color: '#71717a',
          }}
        >
          qaskills.sh — by The Testing Academy
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
