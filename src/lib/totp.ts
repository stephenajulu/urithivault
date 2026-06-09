import { authenticator } from 'otplib';
import QRCode from 'qrcode';

// Configure otplib options
authenticator.options = {
  window: 1, // Allow 1 step before/after (30 seconds window tolerance)
};

/**
 * Generate a new random secret key for a user (base32 encoded)
 */
export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate a QR code data URL (Base64 PNG) for a user to scan with Authenticator apps
 */
export async function generateQrCode(email: string, secret: string): Promise<string> {
  const label = encodeURIComponent(email);
  const issuer = encodeURIComponent('UrithiVault');
  const otpauthUrl = authenticator.keyuri(label, issuer, secret);
  return QRCode.toDataURL(otpauthUrl);
}

/**
 * Verify a 6-digit TOTP code entered by the user
 */
export function verifyMfaToken(token: string, secret: string): boolean {
  try {
    return authenticator.check(token, secret);
  } catch (error) {
    console.error('Error verifying MFA token:', error);
    return false;
  }
}
