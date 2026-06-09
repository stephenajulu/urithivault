import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not defined');
}

const key = new TextEncoder().encode(JWT_SECRET);

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  mfaVerified: boolean;
  [key: string]: any;
}

/**
 * Sign a new JWT token
 */
export async function encryptSession(payload: SessionPayload, expiresAt: Date): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key);
}

/**
 * Verify a JWT token
 */
export async function decryptSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as SessionPayload;
  } catch (error) {
    console.error('Session decryption failed:', error);
    return null;
  }
}

/**
 * Save user session to a cookie (for final authenticated sessions)
 */
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const token = await encryptSession(payload, expiresAt);
  const cookieStore = await cookies();
  
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

/**
 * Save temporary pre-authentication session (used before MFA verification)
 */
export async function setPreAuthCookie(payload: SessionPayload): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const token = await encryptSession(payload, expiresAt);
  const cookieStore = await cookies();
  
  cookieStore.set('pre_auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

/**
 * Retrieve current active session
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  return await decryptSession(token);
}

/**
 * Retrieve temporary pre-auth session
 */
export async function getPreAuthSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('pre_auth')?.value;
  if (!token) return null;
  return await decryptSession(token);
}

/**
 * Clear all auth cookies (Logout / Reset)
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  cookieStore.delete('pre_auth');
}
