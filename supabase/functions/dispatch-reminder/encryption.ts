import crypto from "node:crypto";
import { Buffer } from "node:buffer";

const ALGORITHM = "aes-256-gcm";

export function decrypt(encryptedText: string, encryptionKey: string): string {
  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY is not set");
  }

  const keyBuffer = Buffer.from(encryptionKey, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)");
  }

  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
