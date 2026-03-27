import { NextRequest, NextResponse } from 'next/server';
import { mt5CreateAccount } from '@/lib/mt5';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { name, email, group, leverage, password } = body;

    if (!name || !group || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: name, group, password' },
        { status: 400 }
      );
    }

    const result = await mt5CreateAccount({
      name,
      email: email || '',
      group,
      leverage: leverage || 200,
      password,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create MT5 account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      account: result.data,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
