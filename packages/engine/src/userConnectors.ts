import { RecallError, config, decryptSecret, encryptSecret } from "@recall/core";
import type { SourceType } from "@recall/core";
import { getConnector } from "@recall/connectors";
import {
  deleteUserConnector,
  ensureWorkspace,
  getUserConnector,
  getWorkspaceIdBySlug,
  insertRawItems,
  purgeUserSourceData,
  updateUserConnectorCursor,
  upsertUserConnector,
} from "@recall/db";

/** Secret used to encrypt user tokens at rest (a stable server secret in prod). */
function secret(): string {
  const s = config.wallet.sessionSecret;
  if (!s) throw new RecallError("Connectors are not configured on the server", { status: 503, code: "connectors_unconfigured" });
  return s;
}

const GH_HEADERS = (token: string) => ({
  authorization: `Bearer ${token}`,
  accept: "application/vnd.github+json",
  "x-github-api-version": "2022-11-28",
  "user-agent": "recall-connector",
});

export interface LinkGithubParams {
  holder: string;
  workspaceSlug: string;
  token: string;
  repos: string[];
}

/**
 * Validate a user's GitHub PAT + repo access, then store the connection (token
 * encrypted). Throws a 400 with a helpful message if the token or any repo is bad.
 */
export async function linkGithub(p: LinkGithubParams): Promise<{ repos: string[] }> {
  const enc = secret();
  if (p.repos.length === 0) throw new RecallError("Add at least one repo (owner/repo)", { status: 400, code: "github_no_repos" });

  // 1) token valid?
  const who = await fetch("https://api.github.com/user", { headers: GH_HEADERS(p.token) }).catch(() => null);
  if (!who || who.status === 401) throw new RecallError("That GitHub token is invalid or expired", { status: 400, code: "github_bad_token" });
  if (!who.ok) throw new RecallError(`GitHub rejected the token (HTTP ${who?.status})`, { status: 400, code: "github_bad_token" });

  // 2) each repo readable with this token?
  const bad: string[] = [];
  for (const repo of p.repos) {
    const r = await fetch(`https://api.github.com/repos/${repo}`, { headers: GH_HEADERS(p.token) }).catch(() => null);
    if (!r || !r.ok) bad.push(repo);
  }
  if (bad.length > 0) {
    throw new RecallError(`Can't access: ${bad.join(", ")}. Check the name and that the token has access.`, {
      status: 400,
      code: "github_repo_unreadable",
    });
  }

  await upsertUserConnector({
    holder: p.holder,
    sourceType: "github",
    workspaceSlug: p.workspaceSlug,
    repos: p.repos,
    tokenEnc: encryptSecret(p.token, enc),
  });
  return { repos: p.repos };
}

export interface UserSyncResult {
  pulled: number;
  workspaceSlug: string | null;
}

/** Pull a user's connected source with their (decrypted) token, scoped to their wallet. */
export async function syncUserConnector(holder: string, sourceType: SourceType): Promise<UserSyncResult> {
  const row = await getUserConnector(holder, sourceType);
  if (!row || !row.enabled) return { pulled: 0, workspaceSlug: null };

  const token = decryptSecret(row.tokenEnc, secret());
  const workspaceId = await ensureWorkspace(row.workspaceSlug, row.workspaceSlug);
  const connector = getConnector(sourceType);
  const result = await connector.pull({
    workspace: row.workspaceSlug,
    config: {
      repos: row.repos as string[],
      token,
      audience: [holder], // private to this wallet
      externalIdPrefix: `${holder}:`, // isolate from other users' same-repo items
    },
    cursor: row.cursor as Record<string, unknown>,
  });
  const pulled = await insertRawItems(workspaceId, result.items);
  await updateUserConnectorCursor(row.id, result.cursor ?? (row.cursor as Record<string, unknown>), new Date());
  return { pulled, workspaceSlug: row.workspaceSlug };
}

export interface UserConnectorStatus {
  connected: boolean;
  repos: string[];
  lastSyncAt: string | null;
}

export async function getUserConnectorStatus(holder: string, sourceType: SourceType): Promise<UserConnectorStatus> {
  const row = await getUserConnector(holder, sourceType);
  if (!row) return { connected: false, repos: [], lastSyncAt: null };
  return {
    connected: row.enabled,
    repos: (row.repos as string[]) ?? [],
    lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
  };
}

/** Disconnect a source: delete the connection AND purge the user's ingested data. */
export async function unlinkUserConnector(holder: string, sourceType: SourceType): Promise<void> {
  const row = await getUserConnector(holder, sourceType);
  if (row) {
    const workspaceId = await getWorkspaceIdBySlug(row.workspaceSlug);
    if (workspaceId) await purgeUserSourceData(workspaceId, holder, sourceType);
  }
  await deleteUserConnector(holder, sourceType);
}
