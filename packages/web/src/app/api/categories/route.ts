import { NextResponse } from 'next/server';
import { TESTING_TYPES, FRAMEWORKS, LANGUAGES, DOMAINS } from '@qaskills/shared';

export async function GET() {
  return NextResponse.json({
    testingTypes: TESTING_TYPES,
    frameworks: FRAMEWORKS,
    languages: LANGUAGES,
    domains: DOMAINS,
  });
}
