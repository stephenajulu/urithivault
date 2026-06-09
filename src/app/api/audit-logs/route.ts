import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retrieve audit logs for the current logged-in user
    const auditLogs = await db.auditLog.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // limit to latest 50 events
    });

    return NextResponse.json({ auditLogs });
  } catch (error) {
    console.error('Audit Logs API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
