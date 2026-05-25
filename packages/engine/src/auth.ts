import {
  type ApiScope,
  type AuthContext,
  AuthError,
  DEFAULT_SCOPES,
  NotFoundError,
  generateApiKey,
  hashApiKey,
  keyPrefix,
} from "@recall/core";
import {
  ensureWorkspace,
  findActiveApiKeyByHash,
  getWorkspaceSlugById,
  insertApiKey,
  listApiKeys,
  revokeApiKey,
  touchApiKey,
} from "@recall/db";

export interface IssueKeyParams {
  workspaceSlug: string;
  workspaceName?: string;
  name: string;
  holder: string;
  scopes?: ApiScope[];
}

export interface IssuedKey {
  /** Plaintext key — returned ONCE, never stored. */
  key: string;
  id: string;
  prefix: string;
  workspaceSlug: string;
  holder: string;
  scopes: ApiScope[];
}

/** Mint a new API key for a workspace (creates the workspace if needed). */
export async function issueApiKey(params: IssueKeyParams): Promise<IssuedKey> {
  const workspaceId = await ensureWorkspace(params.workspaceSlug, params.workspaceName ?? params.workspaceSlug);
  const scopes = params.scopes ?? DEFAULT_SCOPES;
  const key = generateApiKey();
  const row = await insertApiKey({
    workspaceId,
    name: params.name,
    keyHash: hashApiKey(key),
    prefix: keyPrefix(key),
    holder: params.holder,
    scopes,
  });
  return { key, id: row.id, prefix: row.prefix, workspaceSlug: params.workspaceSlug, holder: params.holder, scopes };
}

/** Resolve a Bearer key into an AuthContext, or throw AuthError. */
export async function authenticateBearer(key: string | undefined): Promise<AuthContext> {
  if (!key) throw new AuthError("Missing Bearer API key");
  const row = await findActiveApiKeyByHash(hashApiKey(key));
  if (!row) throw new AuthError("Invalid or revoked API key");
  const slug = await getWorkspaceSlugById(row.workspaceId);
  if (!slug) throw new AuthError("Key references a missing workspace");
  // best-effort usage stamp (don't block the request on it)
  void touchApiKey(row.id);
  return {
    apiKeyId: row.id,
    workspaceId: row.workspaceId,
    workspaceSlug: slug,
    holder: row.holder,
    scopes: row.scopes as ApiScope[],
  };
}

export async function listWorkspaceKeys(workspaceSlug: string): Promise<
  { id: string; name: string; prefix: string; holder: string; scopes: ApiScope[]; revoked: boolean }[]
> {
  const workspaceId = await ensureWorkspace(workspaceSlug, workspaceSlug);
  const rows = await listApiKeys(workspaceId);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    holder: r.holder,
    scopes: r.scopes as ApiScope[],
    revoked: r.revoked,
  }));
}

export async function revokeWorkspaceKey(id: string): Promise<void> {
  const ok = await revokeApiKey(id);
  if (!ok) throw new NotFoundError(`API key ${id} not found`);
}
