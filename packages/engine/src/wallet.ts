import { randomBytes } from "node:crypto";
import {
  AuthError,
  BRAND,
  GatingError,
  RecallError,
  ValidationError,
  base58Decode,
  buildSiwsMessage,
  config,
  isValidSolanaAddress,
  signSession,
  verifyEd25519,
  verifySession,
} from "@recall/core";
import { getTokenGate } from "@recall/gating";

/**
 * Wallet ownership flow (Sign-In-with-Solana):
 *   1. createWalletChallenge(address)        → message for the wallet to sign
 *   2. verifyWalletAndIssueSession({...})     → checks signature + on-chain balance,
 *                                               returns a signed session token
 *   3. resolveWalletSession(token)            → verified holder for gating
 */

// Effective HMAC secret: configured, or an ephemeral per-process one for dev.
const SESSION_SECRET = (() => {
  if (config.wallet.sessionSecret) return config.wallet.sessionSecret;
  console.warn(
    "[wallet] No SESSION_SECRET/ADMIN_TOKEN set — using an ephemeral session secret (sessions reset on restart).",
  );
  return randomBytes(32).toString("hex");
})();

interface ChallengeRecord {
  nonce: string;
  issuedAt: string;
  expiresAt: number;
}

// Single-use nonce store. In-memory → fine for one instance; move to Redis for HA.
const challenges = new Map<string, ChallengeRecord>();

function sweepExpired(): void {
  const now = Date.now();
  for (const [addr, rec] of challenges) if (now > rec.expiresAt) challenges.delete(addr);
}

export interface WalletChallenge {
  address: string;
  message: string;
  nonce: string;
  expiresAt: number;
}

/** Issue a one-time challenge message for `address` to sign. */
export function createWalletChallenge(address: string): WalletChallenge {
  if (!isValidSolanaAddress(address)) throw new ValidationError("Invalid Solana wallet address");
  sweepExpired();
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date().toISOString();
  const expiresAt = Date.now() + config.wallet.challengeTtlMs;
  challenges.set(address, { nonce, issuedAt, expiresAt });
  const message = buildSiwsMessage({ domain: config.wallet.siwsDomain, address, nonce, issuedAt });
  return { address, message, nonce, expiresAt };
}

export interface WalletSession {
  token: string;
  holder: string;
  balance: number;
  minBalance: number;
  expiresAt: number;
}

export interface VerifyWalletParams {
  address: string;
  /** Ed25519 signature of the challenge message, base64-encoded. */
  signatureBase64: string;
  nonce: string;
}

/**
 * Verify the wallet signed the challenge (proves ownership), then confirm it holds
 * the required balance. On success, returns a signed session token usable for gated
 * calls via the `x-linked-session` header.
 */
export async function verifyWalletAndIssueSession(p: VerifyWalletParams): Promise<WalletSession> {
  const rec = challenges.get(p.address);
  if (!rec || rec.nonce !== p.nonce) throw new AuthError("Unknown challenge — request a new one");
  if (Date.now() > rec.expiresAt) {
    challenges.delete(p.address);
    throw new AuthError("Challenge expired — request a new one");
  }
  challenges.delete(p.address); // single-use, even on failure below

  const message = buildSiwsMessage({
    domain: config.wallet.siwsDomain,
    address: p.address,
    nonce: rec.nonce,
    issuedAt: rec.issuedAt,
  });

  let signature: Buffer;
  try {
    signature = Buffer.from(p.signatureBase64, "base64");
  } catch {
    throw new AuthError("Malformed signature");
  }
  const pubkey = base58Decode(p.address);
  if (!verifyEd25519(Buffer.from(message), signature, pubkey)) {
    throw new AuthError("Signature does not match wallet — ownership not proven");
  }

  // Ownership proven → check the (real, on-chain when GATING_PROVIDER=solana) balance.
  const minBalance = config.gating.minBalance;
  let balance: number;
  try {
    balance = await getTokenGate().balanceOf(p.address);
  } catch (err) {
    throw new RecallError(`Could not verify ${BRAND.symbol} balance on-chain`, {
      status: 502,
      code: "gating_verification_failed",
      details: { holder: p.address, reason: (err as Error).message },
    });
  }
  if (balance < minBalance) {
    throw new GatingError(`Hold at least ${minBalance} ${BRAND.symbol} to unlock`, {
      holder: p.address,
      balance,
      minBalance,
    });
  }

  const expiresAt = Date.now() + config.wallet.sessionTtlMs;
  const token = signSession({ holder: p.address, exp: expiresAt }, SESSION_SECRET);
  return { token, holder: p.address, balance, minBalance, expiresAt };
}

/** Resolve a session token to its verified holder address, or null if invalid/expired. */
export function resolveWalletSession(token: string | undefined): string | null {
  if (!token) return null;
  const payload = verifySession<{ holder?: string; exp?: number }>(token, SESSION_SECRET);
  if (!payload?.holder || typeof payload.exp !== "number") return null;
  if (Date.now() > payload.exp) return null;
  return payload.holder;
}
