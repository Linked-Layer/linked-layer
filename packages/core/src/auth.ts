import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type ApiScope = "recall" | "search" | "ask" | "write" | "admin";

export const ALL_SCOPES: ApiScope[] = ["recall", "search", "ask", "write", "admin"];
export const DEFAULT_SCOPES: ApiScope[] = ["recall", "search", "ask", "write"];

/** Authenticated principal resolved from a Bearer key. */
export interface AuthContext {
  apiKeyId: string;
  workspaceId: string;
  workspaceSlug: string;
  holder: string;
  scopes: ApiScope[];
}

const KEY_PREFIX = "rcl";

/** Generate a fresh plaintext API key. Shown to the user exactly once. */
export function generateApiKey(): string {
  return `${KEY_PREFIX}_${randomBytes(24).toString("base64url")}`;
}

/** sha256 hex of the full key — what we store and look up by. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Non-secret display prefix, e.g. "rcl_ab12cd34". */
export function keyPrefix(key: string): string {
  return key.slice(0, 12);
}

/** Constant-time compare for admin tokens etc. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
