import { config } from "@recall/core";
import { getTokenGate } from "@recall/gating";
import type { FastifyReply, FastifyRequest } from "fastify";

/** Subject identity carried by the caller (mirrors source permissions). */
export function getHolder(req: FastifyRequest): string | undefined {
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
