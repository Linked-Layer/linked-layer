import { BRAND } from "@recall/core";
import { getLlm } from "./llm";

export interface AnswerContext {
  question: string;
  /** Assembled context block (permission-filtered). */
  context: string;
  /** Source titles for citation. */
  sourceTitles: string[];
}

const ASK_SYSTEM = `You are "ask the company" for ${BRAND.name}. Answer the user's question using ONLY the
provided team context. Cite sources by their title in [brackets]. If the context does not contain
the answer, say so plainly. Be concise.`;

function userPrompt(c: AnswerContext): string {
  return `Question: ${c.question}\n\nTeam context:\n${c.context}\n\nSources available: ${c.sourceTitles.join("; ")}`;
}

/** Stream an answer token-by-token. Falls back to an extractive answer with no API key. */
export async function* answerQuestionStream(c: AnswerContext): AsyncGenerator<string> {
  const llm = getLlm();
  if (!llm) {
    yield fallbackAnswer(c);
    return;
  }
  try {
    let emitted = false;
    for await (const token of llm.stream({ system: ASK_SYSTEM, user: userPrompt(c), maxTokens: 1024 })) {
      emitted = true;
      yield token;
    }
    if (!emitted) yield fallbackAnswer(c);
  } catch (err) {
    console.warn(`[ask] LLM stream failed (${llm.provider}), using fallback:`, (err as Error).message);
    yield fallbackAnswer(c);
  }
}

/** Non-streaming convenience wrapper. */
export async function answerQuestion(c: AnswerContext): Promise<string> {
  let out = "";
  for await (const chunk of answerQuestionStream(c)) out += chunk;
  return out;
}

function fallbackAnswer(c: AnswerContext): string {
  if (!c.context.trim()) {
    return `I don't have anything in memory about "${c.question}".`;
  }
  const cites = c.sourceTitles.length ? ` Sources: ${c.sourceTitles.map((t) => `[${t}]`).join(" ")}.` : "";
  return `Based on team memory:\n${c.context.slice(0, 800)}${cites}`;
}
