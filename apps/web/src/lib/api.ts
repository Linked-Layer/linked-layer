import { config } from "./config";
import { getSessionToken } from "./walletAuth";

export interface RecallSource {
  nodeId: string;
  title: string;
  url: string | null;
  snippet: string;
  score: number;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface Attachment {
  name: string;
  content: string;
}

/** Authenticated JSON fetch against the backend, carrying the wallet session. */
async function authedFetch(path: string, init: RequestInit): Promise<unknown> {
  const session = getSessionToken();
  const res = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(config.demoKey ? { authorization: `Bearer ${config.demoKey}` } : {}),
      ...(session ? { "x-linked-session": session } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = (await res.json()) as { error?: { message?: string } };
      if (err?.error?.message) message = err.error.message;
    } catch {
      /* non-JSON */
    }
    throw new Error(message);
  }
  return res.status === 204 ? null : res.json();
}

export interface GithubStatus {
  authorized: boolean;
  connected: boolean;
  repos: string[];
  lastSyncAt: string | null;
  indexed: number;
  oauthEnabled: boolean;
}
export interface GithubRepoOption {
  fullName: string;
  private: boolean;
}

/** Connect the user's own GitHub: one-click OAuth, or PAT fallback. */
export const githubStatus = () => authedFetch("/v1/connectors/github", { method: "GET" }) as Promise<GithubStatus>;
export const githubOauthStart = () =>
  authedFetch(`/v1/connectors/github/oauth/start?workspace=${encodeURIComponent(config.demoWorkspace)}`, { method: "GET" }) as Promise<{
    url: string;
  }>;
export const githubListRepos = () =>
  (authedFetch("/v1/connectors/github/repos", { method: "GET" }) as Promise<{ repos: GithubRepoOption[] }>).then((r) => r.repos);
export const githubSetRepos = (repos: string[]) =>
  authedFetch("/v1/connectors/github/repos", {
    method: "POST",
    body: JSON.stringify({ repos, workspace: config.demoWorkspace }),
  }) as Promise<{ repos: string[] }>;
export const githubLink = (token: string, repos: string[]) =>
  authedFetch("/v1/connectors/github/link", {
    method: "POST",
    body: JSON.stringify({ token, repos, workspace: config.demoWorkspace }),
  }) as Promise<{ connected: boolean; repos: string[] }>;
export const githubSync = () =>
  authedFetch("/v1/connectors/github/sync", { method: "POST", body: JSON.stringify({ workspace: config.demoWorkspace }) });
export const githubUnlink = () => authedFetch("/v1/connectors/github", { method: "DELETE" });

/** Notion (one-click OAuth; Notion shows its own page picker during authorize). */
export const notionStatus = () => authedFetch("/v1/connectors/notion", { method: "GET" }) as Promise<GithubStatus>;
export const notionOauthStart = () =>
  authedFetch(`/v1/connectors/notion/oauth/start?workspace=${encodeURIComponent(config.demoWorkspace)}`, { method: "GET" }) as Promise<{
    url: string;
  }>;
export const notionSync = () =>
  authedFetch("/v1/connectors/notion/sync", { method: "POST", body: JSON.stringify({ workspace: config.demoWorkspace }) });
export const notionUnlink = () => authedFetch("/v1/connectors/notion", { method: "DELETE" });

export interface AskCallbacks {
  onSources?: (sources: RecallSource[]) => void;
  onToken?: (token: string) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}

/**
 * Stream an answer from the backend "ask the company" endpoint (SSE).
 * `history` carries prior turns (oldest→newest) so follow-ups keep context.
 * Parses `event:`/`data:` frames from the response body.
 */
export async function streamAsk(
  question: string,
  history: ChatTurn[],
  attachments: Attachment[],
  cb: AskCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const session = getSessionToken();
  const res = await fetch(`${config.apiUrl}/v1/ask`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      ...(config.demoKey ? { authorization: `Bearer ${config.demoKey}` } : {}),
      ...(session ? { "x-linked-session": session } : {}),
    },
    body: JSON.stringify({
      question,
      scope: { workspace: config.demoWorkspace },
      history,
      ...(attachments.length ? { attachments } : {}),
    }),
  });

  if (!res.ok || !res.body) {
    // Surface the backend's message (e.g. "Free preview used … hold $LINKED") instead of a bare status.
    let message = `Request failed (${res.status})`;
    try {
      const err = (await res.json()) as { error?: { message?: string } };
      if (err?.error?.message) message = err.error.message;
    } catch {
      /* non-JSON body */
    }
    cb.onError?.(message);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const ev = /^event:\s*(.+)$/m.exec(frame)?.[1]?.trim();
      const dataLine = /^data:\s*(.+)$/m.exec(frame)?.[1];
      if (!ev || dataLine == null) continue;
      let data: unknown;
      try {
        data = JSON.parse(dataLine);
      } catch {
        data = dataLine;
      }
      if (ev === "sources") cb.onSources?.(data as RecallSource[]);
      else if (ev === "token") cb.onToken?.(String(data));
      else if (ev === "done") cb.onDone?.();
      else if (ev === "error") cb.onError?.((data as { message?: string })?.message ?? "stream error");
    }
  }
  cb.onDone?.();
}
