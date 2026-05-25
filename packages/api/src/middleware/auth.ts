import { type ApiScope, type AuthContext, AuthError, ForbiddenError, config, safeEqual } from "@recall/core";
import { authenticateBearer } from "@recall/engine";
import type { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

function bearer(req: FastifyRequest): string | undefined {
  const h = req.headers.authorization;
  const raw = Array.isArray(h) ? h[0] : h;
  if (!raw) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  return m ? m[1] : raw;
}

/** Resolve the Bearer key into req.auth. No-op when AUTH_ENABLED=false (dev mode). */
export async function authenticate(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!config.auth.enabled) return;
  req.auth = await authenticateBearer(bearer(req));
}

/** Require a given scope on the authenticated key (admin implies all). No-op in dev mode. */
export function requireScope(scope: ApiScope) {
  return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!config.auth.enabled) return;
    const scopes = req.auth?.scopes ?? [];
    if (!scopes.includes(scope) && !scopes.includes("admin")) {
      throw new ForbiddenError(`API key missing required scope: ${scope}`, { required: scope, have: scopes });
    }
  };
}

/** Guard key-management endpoints with the admin token (disabled if unset). */
export async function requireAdmin(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const configured = config.auth.adminToken;
  if (!configured) {
    throw new ForbiddenError("Key management is disabled (set ADMIN_TOKEN, or use the keygen CLI)");
  }
  const h = req.headers["x-admin-token"];
  const provided = Array.isArray(h) ? h[0] : h;
  if (!provided || !safeEqual(provided, configured)) {
    throw new AuthError("Invalid admin token");
  }
}

/**
 * Tenant-safe workspace resolver. When authenticated, the key's workspace ALWAYS
 * wins (a key can only ever touch its own tenant); the requested value is ignored.
 * In dev mode, falls back to the requested workspace.
 */
export function resolveWorkspace(req: FastifyRequest, requested: string | undefined): string {
  if (req.auth) return req.auth.workspaceSlug;
  if (!requested) throw new AuthError("workspace is required");
  return requested;
}
