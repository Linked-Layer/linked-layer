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

/**
 * GitHub connector (token-based). Ingests issues + PRs (and their comments) for
 * the configured repos, incrementally by `updated_at`.
 *
 * config: { repos: ["owner/repo", ...], tokenEnv?: "GITHUB_TOKEN", apiBase?: "https://api.github.com", maxComments?: 20 }
 * cursor: { since?: ISO8601 }
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

    return { items, cursor: latest ? { since: latest } : ctx.cursor };
  }

  private async fetchJson<T>(url: string, headers: Record<string, string>): Promise<T> {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`GitHub API ${res.status} for ${url}: ${(await res.text()).slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }
}
