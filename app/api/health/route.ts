import { NextResponse } from 'next/server';
import { dbHealth } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Post-deploy health check. A 200 with source HYPERDRIVE means the database hop
// is wired correctly; 503 with DATABASE_URL means the binding is missing.
export async function GET() {
  const health = await dbHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
