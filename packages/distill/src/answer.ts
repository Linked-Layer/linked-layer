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

Follow the conversation:
- The prior messages are the source of truth for what the user is talking about. Resolve references like "it", "this", "the project", "him" from earlier turns and stay on the user's current topic.

Using the Linked Layer reference:
- A block of ${BRAND.name}'s own team memory may be attached to the question. Use it (and cite the parts you use as [Title]) ONLY when the user is actually asking about ${BRAND.name} — its product, team, token, or decisions.
- If the conversation is about ANYTHING else — the user's own project, another repo or link, code, or a general question — IGNORE that reference entirely (do not mention it, do not cite it) and answer from the conversation and your own knowledge.

Other rules:
- Greetings or small talk (e.g. "hi", "привет", "thanks"): reply with one short friendly sentence, no citations.
- Reply in the user's language. Keep it concise. Never describe what context you were given or explain how you work.`;

function userPrompt(c: AnswerContext): string {
  const ref = c.context.trim()
    ? `\n\n---\n${BRAND.name} reference (use ONLY if the question is about ${BRAND.name}, otherwise ignore):\n${c.context}`
    : "";
  return `Question: ${c.question}${ref}`;
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
