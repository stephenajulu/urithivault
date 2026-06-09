import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { generateMfaSecret, generateQrCode } from '@/lib/totp';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate secret and QR code URL
    const secret = generateMfaSecret();
    const qrCodeUrl = await generateQrCode(user.email, secret);

    // Save the secret temporarily, but do not set mfaEnabled to true yet.
    // It will be set to true only when they successfully verify their first code.
    await db.user.update({
      where: { id: user.id },
      data: {
        mfaSecret: secret,
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'mfa_setup_initiated',
        details: 'MFA secret generated and QR code requested',
        ipAddress: req.headers.get('x-forwarded-for') || (req as any).ip || null,
      },
    });

    return NextResponse.json({
      secret,
      qrCodeUrl,
    });
  } catch (error) {
    console.error('MFA Setup API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
