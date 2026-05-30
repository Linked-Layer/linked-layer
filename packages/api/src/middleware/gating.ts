import { BRAND, GatingError, RecallError, config } from "@recall/core";
import { getTokenGate } from "@recall/gating";
import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Subject identity for ACL/gating. A verified wallet session (Sign-In-with-Solana)
 * wins — it cryptographically proves the caller owns the address whose balance is
 * gated. Otherwise: the authenticated key's holder, else the dev header.
 */
export function getHolder(req: FastifyRequest): string | undefined {
  if (req.walletHolder) return req.walletHolder;
  if (req.auth) return req.auth.holder;
  const h = req.headers["x-recall-holder"];
  return Array.isArray(h) ? h[0] : h;
}

/**
 * Hold-to-use gating preHandler. Rejects with 403 (GatingError) unless the
 * caller holds at least the configured minimum $RECALL balance.
 */
export async function requireToken(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!config.gating.enabled) return;
  const holder = getHolder(req);
  await getTokenGate().requireBalance(holder, config.gating.minBalance);
}

/** True once a real on-chain mint is configured (i.e. the token has launched). */
function mintLive(): boolean {
  return !!config.gating.tokenMint && config.gating.tokenMint !== "stub-mint-address";
}

// Free-preview usage per verified wallet. In-memory: resets on restart/redeploy —
// fine for a low-stakes "try it" teaser (move to Redis/DB for hard guarantees).
const freePreviewUsed = new Map<string, number>();

/**
 * Gate for the public "ask the company" chat with a FREE PREVIEW:
 *   - holders of ≥ minBalance $LINKED → unlimited (once the token is live);
 *   - everyone else (incl. pre-token) → `freeTrialCalls` answers per verified wallet,
 *     then hold-to-use. A verified wallet (Sign-In-with-Solana) is required either way.
 */
export async function gateAskFreeTrial(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!config.gating.enabled) return;
  const holder = getHolder(req);
  if (!holder) {
    throw new GatingError("Connect and verify a Solana wallet to chat", {
      minBalance: config.gating.minBalance,
    });
  }

  // Token live → holders above the threshold get unlimited access.
  if (mintLive()) {
    let balance: number;
    try {
      balance = await getTokenGate().balanceOf(holder);
    } catch (err) {
      throw new RecallError(`Could not verify ${BRAND.symbol} balance on-chain`, {
        status: 502,
        code: "gating_verification_failed",
        details: { holder, reason: (err as Error).message },
      });
    }
    if (balance >= config.gating.minBalance) return;
  }

  // Free preview path.
  const limit = config.gating.freeTrialCalls;
  const used = freePreviewUsed.get(holder) ?? 0;
  if (used >= limit) {
    throw new GatingError(
      mintLive()
        ? `Free preview used (${limit} questions). Hold ${config.gating.minBalance.toLocaleString()} ${BRAND.symbol} to keep chatting.`
        : `Free preview used (${limit} questions). ${BRAND.symbol} launches soon — hold to unlock unlimited chat.`,
      { holder, minBalance: config.gating.minBalance, freeUsed: used, freeLimit: limit, preview: true },
    );
  }
  freePreviewUsed.set(holder, used + 1);
}
