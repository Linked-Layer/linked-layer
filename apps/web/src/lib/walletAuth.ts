import { config } from "./config";

/**
 * Client side of the Sign-In-with-Solana flow:
 *   challenge → wallet signs → verify (server checks signature + on-chain balance)
 *   → store the returned session token, sent as `x-linked-session` on gated calls.
 */

const KEY = "linked_session";

export interface StoredSession {
  token: string;
  holder: string;
  balance: number;
  expiresAt: number;
}

export function getSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    if (!s.token || Date.now() > s.expiresAt) {
      localStorage.removeItem(KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function getSessionToken(): string | null {
  return getSession()?.token ?? null;
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const j = (await res.json()) as { error?: { message?: string } };
    return j?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Run the full ownership proof. `signMessage` comes from the connected wallet.
 * Throws an Error with a human-readable message on failure (e.g. insufficient balance).
 */
export async function verifyOwnership(
  address: string,
  signMessage: (message: string) => Promise<Uint8Array>,
): Promise<StoredSession> {
  if (!config.apiUrl) throw new Error("Backend not configured");

  // 1. Get a challenge to sign.
  const chRes = await fetch(`${config.apiUrl}/v1/wallet/challenge`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!chRes.ok) throw new Error(await errorMessage(chRes, "Could not start verification"));
  const ch = (await chRes.json()) as { message: string; nonce: string };

  // 2. Sign it with the wallet.
  const signature = await signMessage(ch.message);

  // 3. Verify signature + balance server-side.
  const vRes = await fetch(`${config.apiUrl}/v1/wallet/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, signature: bytesToBase64(signature), nonce: ch.nonce }),
  });
  if (!vRes.ok) throw new Error(await errorMessage(vRes, "Verification failed"));
  const v = (await vRes.json()) as { token: string; holder: string; balance: number; expiresAt: number };

  const session: StoredSession = {
    token: v.token,
    holder: v.holder,
    balance: v.balance,
    expiresAt: v.expiresAt,
  };
  localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}
