import { NextResponse } from 'next/server';

/* Temporary diagnostic route - lists which env var NAMES (never values) are
   visible to the deployed function, so we can see exactly what the Neon/
   Vercel integration actually set without guessing at casing from
   screenshots. Delete this route once the database connection is sorted. */
export async function GET() {
  const relevant = Object.keys(process.env)
    .filter((k) => /database|postgres|neon/i.test(k))
    .sort();
  return NextResponse.json({ relevantEnvVarNames: relevant });
}
