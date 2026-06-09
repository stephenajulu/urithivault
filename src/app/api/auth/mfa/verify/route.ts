import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, getPreAuthSession, setSessionCookie, clearSession } from '@/lib/session';
import { verifyMfaToken } from '@/lib/totp';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    // 1. Check if there is an active pre-auth session (Login Flow Step 2)
    const preAuthSession = await getPreAuthSession();
    if (preAuthSession) {
      const user = await db.user.findUnique({
        where: { id: preAuthSession.userId },
      });

      if (!user || !user.mfaSecret) {
        return NextResponse.json({ error: 'User or MFA configuration not found' }, { status: 404 });
      }

      const isValid = verifyMfaToken(code, user.mfaSecret);
      if (!isValid) {
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'mfa_verify_failed',
            details: 'MFA verification failed during login login',
            ipAddress: req.headers.get('x-forwarded-for') || (req as any).ip || null,
          },
        });

        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
      }

      // MFA is valid. Issue full session and clear pre-auth.
      await clearSession(); // Clears both pre_auth and any old session
      await setSessionCookie({
        userId: user.id,
        email: user.email,
        role: user.role,
        mfaVerified: true,
      });

      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'login_success_mfa',
          details: 'Successfully logged in with MFA verification',
          ipAddress: req.headers.get('x-forwarded-for') || (req as any).ip || null,
        },
      });

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        message: 'MFA verified and logged in successfully',
      });
    }

    // 2. Check if there is an active standard session (Enabling MFA Flow)
    const session = await getSession();
    if (session) {
      const user = await db.user.findUnique({
        where: { id: session.userId },
      });

      if (!user || !user.mfaSecret) {
        return NextResponse.json({ error: 'MFA setup has not been initiated' }, { status: 400 });
      }

      const isValid = verifyMfaToken(code, user.mfaSecret);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
      }

      // Mark MFA as enabled in DB
      await db.user.update({
        where: { id: user.id },
        data: {
          mfaEnabled: true,
        },
      });

      // Update current session cookie to reflect mfaVerified: true
      await setSessionCookie({
        userId: user.id,
        email: user.email,
        role: user.role,
        mfaVerified: true,
      });

      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'mfa_enabled',
          details: 'Successfully verified and enabled MFA for user account',
          ipAddress: req.headers.get('x-forwarded-for') || (req as any).ip || null,
        },
      });

      return NextResponse.json({
        message: 'Multi-Factor Authentication enabled successfully',
      });
    }

    return NextResponse.json({ error: 'Unauthorized or session expired' }, { status: 401 });
  } catch (error) {
    console.error('MFA Verify API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
