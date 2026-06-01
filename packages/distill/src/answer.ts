import { BRAND } from "@recall/core";
import { type ChatTurn, getLlm } from "./llm";

export interface AnswerContext {
  question: string;
  /** Assembled context block (permission-filtered). */
  context: string;
  /** Source titles for citation. */
  sourceTitles: string[];
  /** Prior conversation turns (oldest→newest) so follow-ups keep context. */
  history?: ChatTurn[];
}

const ASK_SYSTEM = `You are a helpful, knowledgeable assistant for ${BRAND.name}. Answer the user's question directly, accurately and concisely.

You also have access to the team's shared memory, provided as CONTEXT below — use it as a tool, not a cage:
- If the question is about ${BRAND.name}, this team, or its decisions/projects, ground your answer in that context and cite the sources you actually use as [Title].
- For ANYTHING else — another project, a link or repo the user shares, code, or a general question — just answer it normally and helpfully using your own knowledge. Do NOT force the team context in, and do NOT cite it when it wasn't used.
- Greetings or small talk (e.g. "hi", "привет", "thanks"): reply with one short friendly sentence, no citations.
- Reply in the user's language. Keep it concise. Never describe what context you were given or explain how you work.`;

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
    for await (const token of llm.stream({ system: ASK_SYSTEM, user: userPrompt(c), history: c.history, maxTokens: 1024 })) {
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
