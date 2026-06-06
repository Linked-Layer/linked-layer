import { RecallError, config, decryptSecret, encryptSecret, signSession, verifySession } from "@recall/core";
import type { SourceType } from "@recall/core";
import { getConnector } from "@recall/connectors";
import {
  countHolderSourceNodes,
  deleteUserConnector,
  ensureWorkspace,
  getUserConnector,
  getWorkspaceIdBySlug,
  insertRawItems,
  purgeUserSourceData,
  setUserConnectorRepos,
  updateUserConnectorCursor,
  upsertUserConnector,
  upsertUserConnectorToken,
} from "@recall/db";

const GH_API = "https://api.github.com";
const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

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
  /** OAuth/PAT token stored (the user authorized) — but maybe no repos picked yet. */
  authorized: boolean;
  /** Authorized AND at least one repo selected → actively indexed. */
  connected: boolean;
  repos: string[];
  lastSyncAt: string | null;
  /** Number of items indexed so far (diagnostic: confirms the sync actually pulled data). */
  indexed: number;
  /** Whether one-click GitHub OAuth is configured on the server. */
  oauthEnabled: boolean;
}

export async function getUserConnectorStatus(holder: string, sourceType: SourceType): Promise<UserConnectorStatus> {
  const oauthEnabled = !!config.github.oauthClientId;
  const row = await getUserConnector(holder, sourceType);
  if (!row) return { authorized: false, connected: false, repos: [], lastSyncAt: null, indexed: 0, oauthEnabled };
  const repos = (row.repos as string[]) ?? [];
  const indexed = await countHolderSourceNodes(row.workspaceSlug, holder, sourceType).catch(() => 0);
  return {
    authorized: true,
    connected: row.enabled && repos.length > 0,
    repos,
    lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
    indexed,
    oauthEnabled,
  };
}

// ---- one-click OAuth (GitHub OAuth App) ----

interface OauthState {
  h: string; // holder
  w: string; // workspace slug
  exp: number;
  k: "ghoauth";
}

function ghRedirectUri(): string {
  return `${config.github.appBaseUrl}/v1/connectors/github/oauth/callback`;
}

/** Build the GitHub authorize URL with a signed state carrying the wallet identity. */
export function buildGithubAuthorizeUrl(holder: string, workspaceSlug: string): string {
  const clientId = config.github.oauthClientId;
  if (!clientId) throw new RecallError("GitHub OAuth is not configured on the server", { status: 503, code: "github_oauth_unconfigured" });
  const state = signSession({ h: holder, w: workspaceSlug, exp: Date.now() + 10 * 60_000, k: "ghoauth" } satisfies OauthState, secret());
  const u = new URL("https://github.com/login/oauth/authorize");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", ghRedirectUri());
  u.searchParams.set("scope", config.github.oauthScope);
  u.searchParams.set("state", state);
  u.searchParams.set("allow_signup", "false");
  return u.toString();
}

/** Exchange the OAuth code for a token (verifying the signed state), store it encrypted. */
export async function handleGithubCallback(code: string, state: string): Promise<{ holder: string }> {
  const payload = verifySession<OauthState>(state, secret());
  if (!payload || payload.k !== "ghoauth" || !payload.h || typeof payload.exp !== "number" || Date.now() > payload.exp) {
    throw new RecallError("Invalid or expired OAuth state", { status: 400, code: "github_oauth_state" });
  }
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: config.github.oauthClientId,
      client_secret: config.github.oauthClientSecret,
      code,
      redirect_uri: ghRedirectUri(),
    }),
  }).catch(() => null);
  const data = (res && res.ok ? await res.json().catch(() => null) : null) as { access_token?: string } | null;
  if (!data?.access_token) throw new RecallError("GitHub authorization failed", { status: 400, code: "github_oauth_failed" });

  await upsertUserConnectorToken({
    holder: payload.h,
    sourceType: "github",
    workspaceSlug: payload.w,
    tokenEnc: encryptSecret(data.access_token, secret()),
  });
  return { holder: payload.h };
}

export interface GithubRepoOption {
  fullName: string;
  private: boolean;
}

/** List the repos the user's stored token can see (for the post-OAuth picker). */
export async function listGithubRepos(holder: string): Promise<GithubRepoOption[]> {
  const row = await getUserConnector(holder, "github");
  if (!row) throw new RecallError("Connect GitHub first", { status: 400, code: "github_not_authorized" });
  const token = decryptSecret(row.tokenEnc, secret());
  const res = await fetch(`${GH_API}/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "recall-connector" },
  });
  if (!res.ok) throw new RecallError(`Could not list repos (HTTP ${res.status})`, { status: 400, code: "github_repos_failed" });
  const repos = (await res.json()) as Array<{ full_name: string; private: boolean }>;
  return repos.map((r) => ({ fullName: r.full_name, private: r.private }));
}

/** Save the user's chosen repos to index (validates owner/repo format). */
export async function setGithubRepos(holder: string, repos: string[]): Promise<{ repos: string[] }> {
  const row = await getUserConnector(holder, "github");
  if (!row) throw new RecallError("Connect GitHub first", { status: 400, code: "github_not_authorized" });
  const bad = repos.filter((r) => !REPO_RE.test(r));
  if (repos.length === 0) throw new RecallError("Pick at least one repo", { status: 400, code: "github_no_repos" });
  if (bad.length) throw new RecallError(`Bad repo names: ${bad.join(", ")}`, { status: 400, code: "github_bad_repos" });
  await setUserConnectorRepos(holder, "github", repos);
  return { repos };
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
