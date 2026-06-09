// Cryptographic helper functions using the Web Crypto API (supported on both browser and modern Node.js runtimes)

/**
 * Helper: Convert a Base64 string to a Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Helper: Convert a Uint8Array to a Base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper: Convert string to Uint8Array
 */
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Helper: Convert Uint8Array to string
 */
function uint8ArrayToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Helper: Convert Hex string to Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9A-Fa-f]/g, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Helper: Convert Uint8Array to Hex string
 */
function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a random 256-bit symmetric key (Vault Data Key)
 * Returns key encoded as a Base64 string.
 */
export function generateVdk(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return uint8ArrayToBase64(bytes);
}

/**
 * Generate a random 16-byte salt (as a Hex string) for password key derivation
 */
export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return uint8ArrayToHex(bytes);
}

/**
 * Derive an encryption key from a password and salt using PBKDF2
 * Returns key encoded as a Base64 string.
 */
export async function deriveKeyFromPassword(password: string, saltHex: string): Promise<string> {
  const passwordBytes = stringToUint8Array(password);
  const saltBytes = hexToUint8Array(saltHex);

  // Import raw password as a key-producing material
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBytes as any,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive a 256-bit AES-GCM key
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  const exportedKey = await crypto.subtle.exportKey('raw', derivedKey);
  return uint8ArrayToBase64(new Uint8Array(exportedKey));
}

/**
 * Encrypt plaintext using a Base64-encoded AES key
 * Returns the encrypted string formatted as "Base64(IV):Base64(Ciphertext)"
 */
export async function encryptPayload(plaintext: string, keyBase64: string): Promise<string> {
  const keyBytes = base64ToUint8Array(keyBase64);
  const plaintextBytes = stringToUint8Array(plaintext);

  // Generate 12-byte initialization vector (IV) for AES-GCM
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes as any,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    cryptoKey,
    plaintextBytes as any
  );

  const ciphertext = new Uint8Array(ciphertextBuffer);
  
  const ivBase64 = uint8ArrayToBase64(iv);
  const ciphertextBase64 = uint8ArrayToBase64(ciphertext);

  return `${ivBase64}:${ciphertextBase64}`;
}

/**
 * Decrypt ciphertext string formatted as "Base64(IV):Base64(Ciphertext)" using a Base64-encoded AES key
 */
export async function decryptPayload(encryptedStr: string, keyBase64: string): Promise<string> {
  const parts = encryptedStr.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted payload format');
  }

  const ivBytes = base64ToUint8Array(parts[0]);
  const ciphertextBytes = base64ToUint8Array(parts[1]);
  const keyBytes = base64ToUint8Array(keyBase64);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes as any,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes as any,
    },
    cryptoKey,
    ciphertextBytes as any
  );

  return uint8ArrayToString(new Uint8Array(decryptedBuffer));
}
