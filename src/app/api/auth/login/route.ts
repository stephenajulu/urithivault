import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { setSessionCookie, setPreAuthCookie } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 400 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Audit failed login attempt
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'login_failed',
          details: 'Failed login attempt: Invalid password',
          ipAddress: req.headers.get('x-forwarded-for') || (req as any).ip || null,
        },
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 400 }
      );
    }

    const sessionPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      mfaVerified: false,
    };

    if (user.mfaEnabled) {
      // Save temporary pre-auth session
      await setPreAuthCookie(sessionPayload);

      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'login_initiated',
          details: 'MFA challenge triggered for login',
          ipAddress: req.headers.get('x-forwarded-for') || (req as any).ip || null,
        },
      });

      return NextResponse.json({
        mfaRequired: true,
        message: 'MFA code required to complete login',
      });
    }

    // Set full active session
    await setSessionCookie(sessionPayload);

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'login_success',
        details: 'Successfully logged in without MFA',
        ipAddress: req.headers.get('x-forwarded-for') || (req as any).ip || null,
      },
    });

    return NextResponse.json({
      mfaRequired: false,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      message: 'Logged in successfully',
    });
  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
