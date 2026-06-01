import { BRAND } from "@recall/core";
import { getLlm } from "./llm";

export interface AnswerContext {
  question: string;
  /** Assembled context block (permission-filtered). */
  context: string;
  /** Source titles for citation. */
  sourceTitles: string[];
}

const ASK_SYSTEM = `You are "ask the company" for ${BRAND.name} — a Q&A interface over a team's shared memory.

Rules:
- Answer the user's question using ONLY the team context provided below. Cite the sources you use by their title in [brackets].
- Be concise and direct: a short paragraph at most. Reply in the user's language.
- If the team context is empty or doesn't contain enough to answer, reply with ONE short sentence asking for a more specific question, e.g. "I don't have enough in the team's memory for that — try asking about a specific decision, project, person, or status."
- NEVER ask the user to paste or send text, documents, or solutions. NEVER describe what context you were given, list what's available, or explain how you work. Just answer, or ask once for a more specific question.`;

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
