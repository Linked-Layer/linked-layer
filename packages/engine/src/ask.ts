import type { RecallResult } from "@recall/core";
import { answerQuestionStream } from "@recall/distill";
import { listHolderNodes } from "@recall/db";
import { recall } from "./recall";

const MAX_CONNECTED_CHARS = 18_000;
const CONNECTED_SOURCES = ["github", "notion"] as const;

/**
 * Build a block from the holder's connected sources (GitHub repos, Notion pages, …):
 * an overview of indexed items + their content, plus the retrieval hits from those
 * sources. This is what lets broad questions ("review my repo", "rate my Notion")
 * work — the user's OWN data is always present, even when semantic retrieval is weak.
 */
async function buildConnectedContext(workspace: string, holder: string | undefined, retrieval: RecallResult): Promise<string> {
  const parts: string[] = [];
  if (holder) {
    for (const src of CONNECTED_SOURCES) {
      const nodes = await listHolderNodes(workspace, holder, src, 300).catch(() => []);
      if (!nodes.length) continue;
      const label = src === "github" ? "GitHub repos" : src === "notion" ? "Notion pages" : src;
      const titles = nodes
        .slice(0, 150)
        .map((n) => `- ${n.title}`)
        .join("\n");
      parts.push(`Your connected ${label} — indexed items (${nodes.length}):\n${titles}`);
      // Include the content of items (READMEs/pages first), within a per-source budget.
      const prioritized =
        src === "github"
          ? [...nodes].sort((a, b) => (/readme/i.test(b.title) ? 1 : 0) - (/readme/i.test(a.title) ? 1 : 0))
          : nodes;
      let used = 0;
      const budget = Math.floor(MAX_CONNECTED_CHARS * 0.55);
      for (const n of prioritized) {
        if (used >= budget) break;
        const body = (n.body ?? "").trim();
        if (!body) continue;
        const chunk = `### ${n.title}\n${body.slice(0, 3000)}`;
        parts.push(chunk);
        used += chunk.length;
      }
    }
  }
  // Retrieval hits that came from the user's own connected sources (not the Linked Layer demo).
  const connectedHits = retrieval.sources.filter((s) => s.sourceType && s.sourceType !== "sample");
  if (connectedHits.length) {
    parts.push(connectedHits.map((s) => `## ${s.title}\n${s.snippet}`).join("\n\n"));
  }
  return parts.join("\n\n").slice(0, MAX_CONNECTED_CHARS);
}

export interface AskParams {
  question: string;
  workspace: string;
  holder?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  attachments?: { name: string; content: string }[];
}

export interface AskHandle {
  /** Permission-filtered context used to ground the answer. */
  retrieval: RecallResult;
  /** Streamed answer tokens. */
  stream: AsyncGenerator<string>;
}

/**
 * "Ask the company": retrieve grounded context, then stream an LLM answer with
 * citations. Returns the retrieval immediately so callers can emit sources first.
 */
export async function ask(params: AskParams): Promise<AskHandle> {
  const retrieval = await recall({
    query: params.question,
    scope: { workspace: params.workspace },
    holder: params.holder,
  });

  // The user's connected sources (GitHub) are authoritative primary material; the
  // Linked Layer demo content (sourceType "sample") stays a reference used only when asked.
  const connectedContext = await buildConnectedContext(params.workspace, params.holder, retrieval);
  const mnemoContext = retrieval.sources
    .filter((s) => !s.sourceType || s.sourceType === "sample")
    .map((s) => `## ${s.title}\n${s.snippet}`)
    .join("\n\n");

  const stream = answerQuestionStream({
    question: params.question,
    context: mnemoContext,
    connectedContext,
    sourceTitles: retrieval.sources.map((s) => s.title),
    history: params.history,
    attachments: params.attachments,
  });

  return { retrieval, stream };
}
