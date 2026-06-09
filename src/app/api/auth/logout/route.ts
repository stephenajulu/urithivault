import { NextRequest, NextResponse } from 'next/server';
import { clearSession, getSession } from '@/lib/session';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    
    if (session) {
      // Create Audit Log before clearing session
      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: 'logout',
          details: 'User logged out',
          ipAddress: req.headers.get('x-forwarded-for') || (req as any).ip || null,
        },
      });
    }

    // Clear cookies
    await clearSession();

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
