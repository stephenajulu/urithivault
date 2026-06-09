import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const beneficiaries = await db.beneficiary.findMany({
      where: { ownerId: session.userId },
      orderBy: { email: 'asc' },
      include: {
        accesses: {
          select: {
            assetId: true,
            encryptedShareKey: true,
          },
        },
      },
    });

    return NextResponse.json({ beneficiaries });
  } catch (error) {
    console.error('Beneficiary List API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
