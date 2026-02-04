import { logger } from './logger';

/**
 * Secure encryption utility for sensitive offline data
 * Uses Web Crypto API (AES-GCM) for encryption
 *
 * IMPORTANT: This provides encryption at rest for offline data.
 * The encryption key is derived from the user's session and stored securely.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Retrieve or create a per-session AES-GCM CryptoKey for encrypting and decrypting data.
 *
 * If a serialized key is present in sessionStorage under "caberu_crypto_key", this function
 * imports and returns it. If not present (or import fails), it generates a new 256-bit AES-GCM
 * key, exports and stores its raw bytes in sessionStorage, and returns the new key.
 *
 * @returns A CryptoKey usable for AES-GCM encryption and decryption.
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  // Check if we have a key stored in session
  const storedKeyData = sessionStorage.getItem('caberu_crypto_key');

  if (storedKeyData) {
    try {
      const keyData = JSON.parse(storedKeyData);
      return await crypto.subtle.importKey(
        'raw',
        new Uint8Array(keyData),
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      logger.warn('Failed to import stored key, generating new one:', error);
    }
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );

  // Export and store for session
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem('caberu_crypto_key', JSON.stringify(Array.from(new Uint8Array(exportedKey))));

  return key;
}

/**
 * Encrypts a UTF-8 string using the session-scoped AES-GCM key and returns a storable representation.
 *
 * The result is the IV concatenated with the ciphertext, encoded as a base64 string.
 *
 * @param data - Plaintext string to encrypt
 * @returns A base64 string containing the IV followed by the ciphertext
 * @throws Error when encryption fails
 */
export async function encrypt(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encodedData = new TextEncoder().encode(data);

    const encryptedData = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      encodedData
    );

    // Combine IV and encrypted data for storage
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    logger.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts a base64-encoded string that contains a prepended IV followed by AES-GCM ciphertext.
 *
 * @param encryptedData - Base64 string where the first 12 bytes are the IV and the remainder is the ciphertext
 * @returns The decrypted plaintext string
 * @throws Error when decryption fails
 */
export async function decrypt(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);

    const decryptedData = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    logger.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Create a shallow copy of the object with the specified fields replaced by their encrypted string values.
 *
 * @param obj - Source object whose fields may be encrypted
 * @param fieldsToEncrypt - Keys of `obj` to encrypt; non-string values are JSON-stringified before encryption. Fields with `null` or `undefined` are left unchanged.
 * @returns A new object with the same shape as `obj` where each specified field contains its encrypted string; other fields are unchanged.
 */
export async function encryptObject<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): Promise<T> {
  const result = { ...obj };

  for (const field of fieldsToEncrypt) {
    const value = obj[field];
    if (value !== null && value !== undefined) {
      // Convert to string if not already
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      result[field] = await encrypt(stringValue) as any;
    }
  }

  return result;
}

/**
 * Decrypts specified string fields of an object and returns a shallow copy with decrypted values.
 *
 * For each key in `fieldsToDecrypt`, if the corresponding value in `obj` is a string this function
 * attempts to decrypt it and replaces the field with the decrypted value. If decryption fails for
 * a field, the original value is retained and a warning is logged.
 *
 * @param fieldsToDecrypt - List of keys on `obj` to attempt decryption for
 * @returns A shallow copy of `obj` with successfully decrypted fields replaced by their decrypted values
 */
export async function decryptObject<T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[]
): Promise<T> {
  const result = { ...obj };

  for (const field of fieldsToDecrypt) {
    const value = obj[field];
    if (value && typeof value === 'string') {
      try {
        result[field] = await decrypt(value) as any;
      } catch (error) {
        logger.warn(`Failed to decrypt field ${String(field)}:`, error);
        // Keep original value if decryption fails
      }
    }
  }

  return result;
}

/**
 * Removes the per-session encryption key stored in sessionStorage.
 */
export function clearEncryptionKeys(): void {
  sessionStorage.removeItem('caberu_crypto_key');
  logger.info('Encryption keys cleared');
}

/**
 * Fields that should be encrypted for different data types
 * This ensures HIPAA compliance for PHI (Protected Health Information)
 */
export const ENCRYPTED_FIELDS = {
  // Patient data - all PHI
  patients: [
    'first_name',
    'last_name',
    'email',
    'phone',
    'address',
    'date_of_birth',
    'ssn',
    'insurance_id',
    'medical_history',
    'allergies',
    'medications',
  ],

  // Appointments - patient identifiable info
  appointments: [
    'patient_name',
    'notes',
    'reason',
  ],

  // Treatments - medical info
  treatments: [
    'diagnosis',
    'treatment_plan',
    'notes',
    'prescriptions',
  ],

  // Billing - financial info
  billing: [
    'patient_name',
    'credit_card_last4',
    'billing_address',
  ],
} as const;

/**
 * Encrypts the fields of a record that are defined for the given data type and returns the transformed record.
 *
 * @param record - The record whose fields will be selectively encrypted
 * @param dataType - Key identifying which predefined field list to encrypt (looks up fields in `ENCRYPTED_FIELDS`)
 * @returns The input record with the configured fields replaced by their encrypted string values
 */
export async function encryptRecordForStorage<T extends Record<string, any>>(
  record: T,
  dataType: keyof typeof ENCRYPTED_FIELDS
): Promise<T> {
  const fieldsToEncrypt = ENCRYPTED_FIELDS[dataType] || [];
  return await encryptObject(record, fieldsToEncrypt as (keyof T)[]);
}

/**
 * Decrypts the configured encrypted fields of a stored record for the given data type.
 *
 * @param record - The stored record whose fields may be encrypted
 * @param dataType - Key in `ENCRYPTED_FIELDS` that determines which fields to decrypt
 * @returns The same record object with the specified fields decrypted; fields not listed for the data type are left unchanged
 */
export async function decryptRecordFromStorage<T extends Record<string, any>>(
  record: T,
  dataType: keyof typeof ENCRYPTED_FIELDS
): Promise<T> {
  const fieldsToDecrypt = ENCRYPTED_FIELDS[dataType] || [];
  return await decryptObject(record, fieldsToDecrypt as (keyof T)[]);
}