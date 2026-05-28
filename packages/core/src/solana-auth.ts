import { createHmac, createPublicKey, timingSafeEqual, verify as edVerify } from "node:crypto";

/**
 * Solana wallet-ownership auth (Sign-In-with-Solana style) primitives:
 *  - base58 decode (for the wallet address / pubkey)
 *  - Ed25519 signature verification (Node crypto, no external deps)
 *  - a human-readable challenge message
 *  - HMAC-signed stateless session tokens
 */

const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58_MAP: Record<string, number> = {};
for (let i = 0; i < B58_ALPHABET.length; i++) B58_MAP[B58_ALPHABET[i]!] = i;

/** Decode a base58 string into bytes (throws on invalid characters). */
export function base58Decode(str: string): Uint8Array {
  const bytes: number[] = [];
  for (const ch of str) {
    let carry = B58_MAP[ch];
    if (carry === undefined) throw new Error(`Invalid base58 character: ${ch}`);
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j]! * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Each leading '1' encodes a leading zero byte.
  for (let k = 0; k < str.length && str[k] === "1"; k++) bytes.push(0);
  bytes.reverse();
  return new Uint8Array(bytes);
}

/** True iff `address` is a syntactically valid Solana public key (32 bytes). */
export function isValidSolanaAddress(address: string): boolean {
  try {
    return base58Decode(address).length === 32;
  } catch {
    return false;
  }
}

// SPKI/DER prefix wrapping a raw 32-byte Ed25519 public key.
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/** Verify an Ed25519 signature over `message` for a raw 32-byte public key. */
export function verifyEd25519(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean {
  if (publicKey.length !== 32 || signature.length !== 64) return false;
  try {
    const der = Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKey)]);
    const key = createPublicKey({ key: der, format: "der", type: "spki" });
    return edVerify(null, Buffer.from(message), key, Buffer.from(signature));
  } catch {
    return false;
  }
}

export interface SiwsParams {
  domain: string;
  address: string;
  nonce: string;
  issuedAt: string;
  statement?: string;
}

/** Build the exact human-readable message the wallet signs. Must be byte-stable. */
export function buildSiwsMessage(p: SiwsParams): string {
  return [
    `${p.domain} wants you to sign in with your Solana account:`,
    p.address,
    "",
    p.statement ?? "Sign to prove you own this wallet. This does not cost gas or move funds.",
    "",
    `Nonce: ${p.nonce}`,
    `Issued At: ${p.issuedAt}`,
  ].join("\n");
}

/** HMAC-SHA256 signed, base64url-encoded session token: `<body>.<sig>`. */
export function signSession(payload: Record<string, unknown>, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** Verify + decode a session token. Returns the payload, or null if tampered. */
export function verifySession<T = Record<string, unknown>>(token: string, secret: string): T | null {
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
