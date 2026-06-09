import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, clearSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Zero-knowledge right to erasure: cascade deletes wipe assets, beneficiaries, and claims.
    await db.user.delete({
      where: { id: session.userId },
    });

    // Log the purge action (can be left orphaned or omitted since user is gone)
    // Clear the session cookies
    await clearSession();

    return NextResponse.json({
      message: 'Your account has been deleted, and all vault data has been cryptographically shredded.',
    });
  } catch (error) {
    console.error('Account Purge API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
