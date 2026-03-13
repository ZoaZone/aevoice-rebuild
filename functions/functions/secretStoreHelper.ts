/**
 * secretStoreHelper.ts
 *
 * Provides AES-GCM encryption/decryption for storing sensitive data like API keys.
 * Uses the SECRET_ENCRYPTION_KEY environment variable as the master encryption key.
 *
 * @module secretStoreHelper
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { logger } from "./lib/infra/logger.js";

const ENCRYPTION_KEY_ENV = "SECRET_ENCRYPTION_KEY";
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Get or generate encryption key from environment
 * @returns {Promise<CryptoKey>} The encryption key
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get(ENCRYPTION_KEY_ENV);

  if (!keyString) {
    throw new Error(`${ENCRYPTION_KEY_ENV} environment variable not set`);
  }

  // Decode base64 key - using TextEncoder for better compatibility
  let keyData: Uint8Array;
  try {
    // Try native atob for Deno/browser environments
    keyData = Uint8Array.from(atob(keyString), (c) => c.charCodeAt(0));
  } catch (error) {
    // Fallback to manual base64 decoding if atob fails
    const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const bytes: number[] = [];
    for (let i = 0; i < keyString.length; i += 4) {
      const encoded = [
        base64Chars.indexOf(keyString[i]),
        base64Chars.indexOf(keyString[i + 1]),
        base64Chars.indexOf(keyString[i + 2]),
        base64Chars.indexOf(keyString[i + 3]),
      ];
      bytes.push((encoded[0] << 2) | (encoded[1] >> 4));
      if (encoded[2] !== -1) {
        bytes.push(((encoded[1] & 15) << 4) | (encoded[2] >> 2));
      }
      if (encoded[3] !== -1) bytes.push(((encoded[2] & 3) << 6) | encoded[3]);
    }
    keyData = new Uint8Array(bytes);
  }

  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a secret value using AES-GCM
 * @param {string} plaintext - The secret to encrypt
 * @returns {Promise<{encrypted: string, iv: string, authTag: string}>} Encrypted data
 */
async function encryptSecret(plaintext: string): Promise<{
  encrypted: string;
  iv: string;
  authTag: string;
}> {
  try {
    const key = await getEncryptionKey();

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encode plaintext
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Encrypt with AES-GCM
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data,
    );

    // AES-GCM includes auth tag in the encrypted buffer (last 16 bytes)
    const encrypted = new Uint8Array(encryptedBuffer);
    const ciphertext = encrypted.slice(0, encrypted.length - 16);
    const authTag = encrypted.slice(encrypted.length - 16);

    return {
      encrypted: btoa(String.fromCharCode(...ciphertext)),
      iv: btoa(String.fromCharCode(...iv)),
      authTag: btoa(String.fromCharCode(...authTag)),
    };
  } catch (error) {
    logger.error("Encryption failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error("Failed to encrypt secret");
  }
}

/**
 * Decrypt a secret value using AES-GCM
 * @param {string} encrypted - Base64 encrypted data
 * @param {string} iv - Base64 initialization vector
 * @param {string} authTag - Base64 authentication tag
 * @returns {Promise<string>} Decrypted plaintext
 */
async function decryptSecret(
  encrypted: string,
  iv: string,
  authTag: string,
): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // Decode base64 inputs
    const ciphertext = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
    const authTagBytes = Uint8Array.from(atob(authTag), (c) => c.charCodeAt(0));

    // Combine ciphertext and auth tag for AES-GCM
    const combined = new Uint8Array(ciphertext.length + authTagBytes.length);
    combined.set(ciphertext);
    combined.set(authTagBytes, ciphertext.length);

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: ivBytes },
      key,
      combined,
    );

    // Decode to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    logger.error("Decryption failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error("Failed to decrypt secret");
  }
}

/**
 * Store an encrypted secret in the database
 * @param {Object} base44 - Base44 client instance
 * @param {string} ownerType - Type of owner (agency, affiliate, client)
 * @param {string} ownerId - UUID of the owner
 * @param {string} keyName - Name/type of the secret
 * @param {string} secretValue - The secret to store
 * @returns {Promise<string>} UUID of the stored secret
 */
export async function storeSecret(
  base44: any,
  ownerType: string,
  ownerId: string,
  keyName: string,
  secretValue: string,
): Promise<string> {
  const { encrypted, iv, authTag } = await encryptSecret(secretValue);

  // Check if secret already exists
  const existing = await base44.asServiceRole.db.query(
    `SELECT id FROM encrypted_secrets 
     WHERE owner_type = $1 AND owner_id = $2 AND key_name = $3`,
    [ownerType, ownerId, keyName],
  );

  if (existing.rows.length > 0) {
    // Update existing
    await base44.asServiceRole.db.query(
      `UPDATE encrypted_secrets 
       SET encrypted_value = $1, iv = $2, auth_tag = $3, updated_at = NOW()
       WHERE id = $4`,
      [encrypted, iv, authTag, existing.rows[0].id],
    );

    logger.info("Secret updated", {
      owner_type: ownerType,
      owner_id: ownerId,
      key_name: keyName,
    });

    return existing.rows[0].id;
  } else {
    // Insert new
    const result = await base44.asServiceRole.db.query(
      `INSERT INTO encrypted_secrets (owner_type, owner_id, key_name, encrypted_value, iv, auth_tag)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [ownerType, ownerId, keyName, encrypted, iv, authTag],
    );

    logger.info("Secret stored", {
      owner_type: ownerType,
      owner_id: ownerId,
      key_name: keyName,
    });

    return result.rows[0].id;
  }
}

/**
 * Retrieve and decrypt a secret by ID
 * @param {Object} base44 - Base44 client instance
 * @param {string} secretId - UUID of the secret
 * @returns {Promise<string>} Decrypted secret value
 */
export async function getSecretById(
  base44: any,
  secretId: string,
): Promise<string> {
  const result = await base44.asServiceRole.db.query(
    `SELECT encrypted_value, iv, auth_tag FROM encrypted_secrets WHERE id = $1`,
    [secretId],
  );

  if (result.rows.length === 0) {
    throw new Error("Secret not found");
  }

  const { encrypted_value, iv, auth_tag } = result.rows[0];
  return await decryptSecret(encrypted_value, iv, auth_tag);
}

/**
 * Retrieve and decrypt a secret for a specific owner
 * @param {Object} base44 - Base44 client instance
 * @param {string} ownerType - Type of owner (agency, affiliate, client)
 * @param {string} ownerId - UUID of the owner
 * @param {string} keyName - Name/type of the secret
 * @returns {Promise<string|null>} Decrypted secret value or null if not found
 */
export async function getSecretForOwner(
  base44: any,
  ownerType: string,
  ownerId: string,
  keyName: string,
): Promise<string | null> {
  const result = await base44.asServiceRole.db.query(
    `SELECT encrypted_value, iv, auth_tag FROM encrypted_secrets 
     WHERE owner_type = $1 AND owner_id = $2 AND key_name = $3`,
    [ownerType, ownerId, keyName],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const { encrypted_value, iv, auth_tag } = result.rows[0];
  return await decryptSecret(encrypted_value, iv, auth_tag);
}

/**
 * Delete a secret
 * @param {Object} base44 - Base44 client instance
 * @param {string} secretId - UUID of the secret to delete
 * @returns {Promise<void>}
 */
export async function deleteSecret(
  base44: any,
  secretId: string,
): Promise<void> {
  await base44.asServiceRole.db.query(
    `DELETE FROM encrypted_secrets WHERE id = $1`,
    [secretId],
  );

  logger.info("Secret deleted", { secret_id: secretId });
}
