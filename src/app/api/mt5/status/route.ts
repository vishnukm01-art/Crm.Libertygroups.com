import { NextResponse } from 'next/server';
import { mt5Status } from '@/lib/mt5';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(mt5Status());
}
