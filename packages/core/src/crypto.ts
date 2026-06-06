import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Symmetric secret encryption (AES-256-GCM) for at-rest storage of user-supplied
 * tokens (e.g. GitHub PATs). The key is derived from a server secret; ciphertext is
 * self-describing ("iv.tag.ct", base64url) and authenticated (tampering → throw).
 */
function keyFrom(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest(); // 32 bytes
}

export function encryptSecret(plaintext: string, secret: string): string {
  if (!secret) throw new Error("encryptSecret: missing server secret");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(secret), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptSecret(token: string, secret: string): string {
  if (!secret) throw new Error("decryptSecret: missing server secret");
  const [ivB, tagB, ctB] = token.split(".");
  if (!ivB || !tagB || !ctB) throw new Error("decryptSecret: malformed ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", keyFrom(secret), Buffer.from(ivB, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ctB, "base64url")), decipher.final()]).toString("utf8");
}
