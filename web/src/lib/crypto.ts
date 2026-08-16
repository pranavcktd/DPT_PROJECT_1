import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * AES-256-GCM encryption for values that must be stored at rest (currently
 * just the SMTP password) but recovered exactly for later use - unlike
 * password_hash (bcrypt, one-way), this must be reversible.
 * Key is derived from AUTH_SECRET (already required, already private) via
 * scrypt rather than requiring a second secret in .env.
 */
function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set - cannot encrypt/decrypt stored credentials.");
  return scryptSync(secret, "dpt-smtp-settings", 32);
}

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSecret(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed encrypted value.");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return plain.toString("utf8");
}
