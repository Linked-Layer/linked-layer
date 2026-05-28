import { config } from "@recall/core";
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
