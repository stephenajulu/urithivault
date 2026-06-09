import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { encryptedVdk, vdkSalt } = await req.json();

    if (!encryptedVdk || !vdkSalt) {
      return NextResponse.json(
        { error: 'Encrypted VDK and salt are required' },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: session.userId },
      data: {
        encryptedVdk,
        vdkSalt,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'vault_edit',
        details: 'Initialized Zero-Knowledge Vault Encryption Keys',
        ipAddress: req.headers.get('x-forwarded-for') || (req as any).ip || null,
      },
    });

    return NextResponse.json({ message: 'Vault keys initialized successfully' });
  } catch (error) {
    console.error('VDK Setup API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
