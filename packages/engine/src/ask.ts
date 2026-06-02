import type { RecallResult } from "@recall/core";
import { answerQuestionStream } from "@recall/distill";
import { recall } from "./recall";

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

  const stream = answerQuestionStream({
    question: params.question,
    context: retrieval.context,
    sourceTitles: retrieval.sources.map((s) => s.title),
    history: params.history,
    attachments: params.attachments,
  });

  return { retrieval, stream };
}
