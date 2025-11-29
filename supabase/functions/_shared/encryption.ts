/**
 * AES-256-GCM Encryption Utility
 * 
 * Provides secure encryption/decryption for sensitive data using Web Crypto API.
 * - AES-256-GCM algorithm
 * - Random 12-byte IV per operation
 * - Format: base64(IV + ciphertext + authTag)
 * - Fallback for legacy plaintext data
 */

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');

if (!ENCRYPTION_KEY) {
  console.error('[Encryption] ENCRYPTION_KEY not configured');
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Get CryptoKey from environment variable
 */
async function getKey(): Promise<CryptoKey> {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured');
  }
  
  // Support both hex and base64 encoded keys
  let keyBytes: Uint8Array;
  
  try {
    // Try hex first
    keyBytes = hexToBytes(ENCRYPTION_KEY);
  } catch {
    // Fallback to base64
    keyBytes = Uint8Array.from(atob(ENCRYPTION_KEY), c => c.charCodeAt(0));
  }
  
  if (keyBytes.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits)');
  }
  
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plaintext string using AES-256-GCM
 * @param plaintext - Text to encrypt
 * @returns Base64 encoded string containing IV + ciphertext + authTag
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.trim() === '') {
    return plaintext;
  }
  
  try {
    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await getKey();
    const encoded = new TextEncoder().encode(plaintext);
    
    // Encrypt with AES-GCM (includes authentication tag)
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    
    // Concatenate IV + ciphertext (authTag is included in encrypted)
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), iv.length);
    
    // Return as base64
    return btoa(String.fromCharCode(...result));
  } catch (error) {
    console.error('[Encryption] Failed to encrypt:', error.message);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt ciphertext string using AES-256-GCM
 * @param ciphertext - Base64 encoded encrypted data
 * @returns Decrypted plaintext string
 */
export async function decrypt(ciphertext: string): Promise<string> {
  if (!ciphertext || ciphertext.trim() === '') {
    return ciphertext;
  }
  
  try {
    // Decode base64
    const data = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    
    // Extract IV (first 12 bytes)
    const iv = data.slice(0, 12);
    // Extract ciphertext + authTag (remaining bytes)
    const encrypted = data.slice(12);
    
    const key = await getKey();
    
    // Decrypt with AES-GCM
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    // Fallback: assume it's legacy plaintext data
    console.log('[Encryption] Legacy plaintext detected, returning as-is');
    return ciphertext;
  }
}

/**
 * Encrypt specific fields in an object
 * @param obj - Object containing fields to encrypt
 * @param fields - Array of field names to encrypt
 * @returns Object with encrypted fields
 */
export async function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): Promise<T> {
  const result = { ...obj };
  
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = await encrypt(result[field] as string) as T[keyof T];
    }
  }
  
  return result;
}

/**
 * Decrypt specific fields in an object
 * @param obj - Object containing fields to decrypt
 * @param fields - Array of field names to decrypt
 * @returns Object with decrypted fields
 */
export async function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): Promise<T> {
  const result = { ...obj };
  
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = await decrypt(result[field] as string) as T[keyof T];
    }
  }
  
  return result;
}

/**
 * Check if a string appears to be encrypted
 * @param value - String to check
 * @returns True if value appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  // Encrypted values are base64 and longer than 40 characters
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(value) && value.length > 40;
}
