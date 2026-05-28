import { resolveWalletSession } from "@recall/engine";
import type { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    /** Verified wallet address from a Sign-In-with-Solana session, if present. */
    walletHolder?: string;
  }
}

/**
 * If a valid `x-linked-session` token is present, pin the proven wallet as the
 * gating holder. Invalid/expired tokens are ignored (no holder set).
 */
export async function resolveSession(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const h = req.headers["x-linked-session"];
  const token = Array.isArray(h) ? h[0] : h;
  const holder = resolveWalletSession(token);
  if (holder) req.walletHolder = holder;
}
