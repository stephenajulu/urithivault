import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assets = await db.asset.findMany({
      where: { ownerId: session.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        metadataTags: true,
        encryptedPayload: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Asset List API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
