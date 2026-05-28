import { config } from "./config";
import { getSessionToken } from "./walletAuth";

export interface RecallSource {
  nodeId: string;
  title: string;
  url: string | null;
  snippet: string;
  score: number;
}

export interface AskCallbacks {
  onSources?: (sources: RecallSource[]) => void;
  onToken?: (token: string) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}

/**
 * Stream an answer from the backend "ask the company" endpoint (SSE).
 * Parses `event:`/`data:` frames from the response body.
 */
export async function streamAsk(question: string, cb: AskCallbacks, signal?: AbortSignal): Promise<void> {
  const session = getSessionToken();
  const res = await fetch(`${config.apiUrl}/v1/ask`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      ...(config.demoKey ? { authorization: `Bearer ${config.demoKey}` } : {}),
      ...(session ? { "x-linked-session": session } : {}),
    },
    body: JSON.stringify({ question, scope: { workspace: config.demoWorkspace } }),
  });

  if (!res.ok || !res.body) {
    cb.onError?.(`Request failed (${res.status})`);
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
