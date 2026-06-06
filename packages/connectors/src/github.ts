import type { RawItem } from "@recall/core";
import { type Connector, ConnectorConfigError, type PullContext, type PullResult, resolveToken } from "./base";

interface GithubUser {
  login: string;
}
interface GithubIssue {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  user: GithubUser | null;
  updated_at: string;
  comments: number;
  comments_url: string;
  pull_request?: unknown;
}
interface GithubComment {
  user: GithubUser | null;
  body: string | null;
}
interface GithubRepoMeta {
  default_branch: string;
}
interface GithubTreeEntry {
  path: string;
  type: string; // "blob" | "tree"
  sha: string;
  size?: number;
}
interface GithubTree {
  sha: string;
  tree: GithubTreeEntry[];
  truncated?: boolean;
}
interface GithubBlob {
  content: string;
  encoding: string;
}

// Text/code files we ingest as searchable docs (README, source, configs, markdown).
const TEXT_FILE_RE =
  /\.(txt|md|markdown|mdx|rst|adoc|csv|tsv|json|ya?ml|toml|ini|env|xml|html?|css|scss|less|js|jsx|ts|tsx|mjs|cjs|py|rb|go|rs|java|kt|kts|swift|c|cc|cpp|h|hpp|cs|php|pl|lua|sh|bash|zsh|sql|graphql|gql|vue|svelte|dart|r|scala|clj|ex|exs|proto|gradle|dockerfile|makefile|properties|gitignore|tf|hcl)$/i;
// Paths we never ingest (vendored / generated / lockfiles / binaries-by-folder).
const IGNORE_PATH_RE =
  /(^|\/)(node_modules|dist|build|out|coverage|vendor|\.git|\.next|\.turbo|\.cache|__pycache__|target)(\/|$)|\.(lock|min\.js|min\.css|map)$|(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|poetry\.lock|cargo\.lock)$/i;

function isIngestableFile(path: string, size: number | undefined, maxBytes: number): boolean {
  if (IGNORE_PATH_RE.test(path)) return false;
  if ((size ?? 0) > maxBytes) return false;
  const base = path.split("/").pop() ?? path;
  if (/^(readme|license|dockerfile|makefile)$/i.test(base)) return true; // extensionless but useful
  return TEXT_FILE_RE.test(path);
}

/**
 * GitHub connector (token-based). Ingests issues + PRs (and their comments) for
 * the configured repos incrementally by `updated_at`, AND the repo's code/docs
 * (README, source, configs) incrementally by the default branch's tree SHA.
 *
 * config: { repos: ["owner/repo", ...], tokenEnv?, apiBase?, maxComments?,
 *           includeCode?: true, maxFileBytes?: 100000, maxFileChars?: 20000, maxFilesPerRepo?: 300 }
 * cursor: { since?: ISO8601, trees?: { "owner/repo": treeSha } }
 */
export class GithubConnector implements Connector {
  readonly sourceType = "github" as const;

  async pull(ctx: PullContext): Promise<PullResult> {
    const repos = (ctx.config.repos as string[] | undefined) ?? [];
    if (repos.length === 0) throw new ConnectorConfigError("github connector requires config.repos: ['owner/repo']");
    const token = resolveToken(ctx.config, "GITHUB_TOKEN");
    const apiBase = (ctx.config.apiBase as string | undefined) ?? "https://api.github.com";
    const maxComments = (ctx.config.maxComments as number | undefined) ?? 20;
    const since = ctx.cursor?.since as string | undefined;
    // Per-user connectors scope items to the owner's wallet and namespace the
    // externalId so two users connecting the same repo get isolated nodes.
    const audience = (ctx.config.audience as string[] | undefined) ?? ["*"];
    const idPrefix = (ctx.config.externalIdPrefix as string | undefined) ?? "";
    // Code/file ingestion (README, source, docs). On by default; tuneable via config.
    const includeCode = ctx.config.includeCode !== false;
    const maxFileBytes = (ctx.config.maxFileBytes as number | undefined) ?? 100_000;
    const maxFileChars = (ctx.config.maxFileChars as number | undefined) ?? 20_000;
    const maxFilesPerRepo = (ctx.config.maxFilesPerRepo as number | undefined) ?? 300;
    const treeCursor = (ctx.cursor?.trees as Record<string, string> | undefined) ?? {};
    const newTrees: Record<string, string> = { ...treeCursor };

    const headers = {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "recall-connector",
    };

    const items: RawItem[] = [];
    let latest = since ?? "";

    for (const repo of repos) {
      const url = new URL(`${apiBase}/repos/${repo}/issues`);
      url.searchParams.set("state", "all");
      url.searchParams.set("sort", "updated");
      url.searchParams.set("direction", "asc");
      url.searchParams.set("per_page", "50");
      if (since) url.searchParams.set("since", since);

      const issues = await this.fetchJson<GithubIssue[]>(url.toString(), headers);

      for (const issue of issues) {
        const isPr = issue.pull_request != null;
        let body = issue.body ?? "";
        if (issue.comments > 0) {
          const comments = await this.fetchJson<GithubComment[]>(
            `${issue.comments_url}?per_page=${maxComments}`,
            headers,
          ).catch(() => [] as GithubComment[]);
          const rendered = comments.map((c) => `@${c.user?.login ?? "unknown"}: ${c.body ?? ""}`).join("\n");
          if (rendered) body += `\n\n--- comments ---\n${rendered}`;
        }

        items.push({
          externalId: `github:${idPrefix}${repo}#${issue.number}`,
          sourceType: "github",
          kind: "thread",
          title: `[${repo}#${issue.number}] ${issue.title}`,
          body,
          metadata: {
            url: issue.html_url,
            author: issue.user?.login ?? null,
            state: issue.state,
            number: issue.number,
            repo,
            type: isPr ? "pull_request" : "issue",
            updated_at: issue.updated_at,
          },
          // ACL: per-user connectors pass [wallet] (private); server connectors use ["*"].
          audience,
        });

        if (issue.updated_at > latest) latest = issue.updated_at;
      }
    }

    // ---- repo code/files (incremental by the default branch's tree SHA) ----
    if (includeCode) {
      for (const repo of repos) {
        try {
          const meta = await this.fetchJson<GithubRepoMeta>(`${apiBase}/repos/${repo}`, headers);
          const branch = meta.default_branch;
          const tree = await this.fetchJson<GithubTree>(
            `${apiBase}/repos/${repo}/git/trees/${branch}?recursive=1`,
            headers,
          );
          newTrees[repo] = tree.sha;
          if (treeCursor[repo] === tree.sha) continue; // unchanged since last sync → skip files

          const files = (tree.tree ?? [])
            .filter((e) => e.type === "blob" && isIngestableFile(e.path, e.size, maxFileBytes))
            .slice(0, maxFilesPerRepo);

          for (const f of files) {
            const blob = await this.fetchJson<GithubBlob>(`${apiBase}/repos/${repo}/git/blobs/${f.sha}`, headers).catch(
              () => null,
            );
            if (!blob || blob.encoding !== "base64") continue;
            const content = Buffer.from(blob.content, "base64").toString("utf8");
            if (!content.trim()) continue;
            items.push({
              externalId: `github:${idPrefix}${repo}:file:${f.path}`,
              sourceType: "github",
              kind: "source_object",
              title: `[${repo}] ${f.path}`,
              body: content.slice(0, maxFileChars),
              metadata: {
                url: `https://github.com/${repo}/blob/${branch}/${f.path}`,
                repo,
                path: f.path,
                type: "file",
              },
              audience,
            });
          }
        } catch {
          /* repo unreadable / API error → skip its files, keep going */
        }
      }
    }

    return { items, cursor: { since: latest || since, trees: newTrees } };
  }

  private async fetchJson<T>(url: string, headers: Record<string, string>): Promise<T> {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`GitHub API ${res.status} for ${url}: ${(await res.text()).slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }
}
