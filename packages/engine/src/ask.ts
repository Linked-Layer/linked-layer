import type { RecallResult } from "@recall/core";
import { answerQuestionStream } from "@recall/distill";
import { listHolderNodes } from "@recall/db";
import { recall } from "./recall";

const MAX_CONNECTED_CHARS = 14_000;

/**
 * Build a block from the holder's connected sources (e.g. GitHub): an overview of
 * indexed files + READMEs, plus the retrieval hits from those sources. This is what
 * lets broad questions ("review my repo") work even when semantic retrieval is weak.
 */
async function buildConnectedContext(workspace: string, holder: string | undefined, retrieval: RecallResult): Promise<string> {
  const parts: string[] = [];
  if (holder) {
    try {
      const nodes = await listHolderNodes(workspace, holder, "github", 300);
      const files = nodes.filter((n) => (n.metadata?.type as string | undefined) === "file");
      if (files.length) {
        const fileList = files
          .map((n) => `- ${(n.metadata?.path as string | undefined) ?? n.title}`)
          .slice(0, 200)
          .join("\n");
        parts.push(`Indexed files in your connected GitHub repos:\n${fileList}`);
        const readmes = files.filter((n) => /readme/i.test(n.title)).slice(0, 3);
        for (const r of readmes) parts.push(`### ${r.title}\n${(r.body ?? "").slice(0, 4000)}`);
      }
    } catch {
      /* overview is best-effort */
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
