import { BRAND } from "@recall/core";
import { type ChatTurn, getLlm } from "./llm";

export interface AnswerContext {
  question: string;
  /** Assembled context block (permission-filtered) — the Linked Layer demo reference. */
  context: string;
  /** The user's OWN connected sources (GitHub, etc.) — authoritative primary material. */
  connectedContext?: string;
  /** Source titles for citation. */
  sourceTitles: string[];
  /** Prior conversation turns (oldest→newest) so follow-ups keep context. */
  history?: ChatTurn[];
  /** Text contents of files the user attached (for the LLM, not retrieval). */
  attachments?: { name: string; content: string }[];
}

const ASK_SYSTEM = `You are a helpful, knowledgeable assistant for ${BRAND.name}. Answer the user's question directly, accurately and concisely.

Follow the conversation:
- The prior messages are the source of truth for what the user is talking about. Resolve references like "it", "this", "the project", "him" from earlier turns and stay on the user's current topic.

Your connected sources (the user's own data):
- The user can connect their own tools (e.g. their GitHub repos). When a "Connected sources" block is attached, it IS the user's repositories — their code, files, READMEs, issues and PRs. Treat it as authoritative primary material: answer about their repo/code/project directly from it, summarize it, review it, cite parts you use as [Title]. Never say you can't see their repo when this block is present.

Using the Linked Layer reference:
- A separate block of ${BRAND.name}'s own team memory may also be attached. Use it (cite as [Title]) ONLY when the user is actually asking about ${BRAND.name} — its product, team, token, or decisions.
- If the conversation is about ANYTHING else, IGNORE the Linked Layer reference (do not mention or cite it) and answer from the connected sources, the conversation, and your own knowledge.

Attached files:
- If the user attached files, treat them as the primary material and answer about their contents directly (the Linked Layer reference does not apply to them).

Other rules:
- Greetings or small talk (e.g. "hi", "привет", "thanks"): reply with one short friendly sentence, no citations.
- Reply in the user's language. Keep it concise. Never describe what context you were given or explain how you work.`;

function userPrompt(c: AnswerContext): string {
  const files = (c.attachments ?? []).length
    ? `\n\nAttached files:\n${c.attachments!.map((a) => `--- ${a.name} ---\n${a.content}`).join("\n\n")}`
    : "";
  const connected = c.connectedContext?.trim()
    ? `\n\n---\nConnected sources (the user's own repos/code/data — primary material, use to answer about their project):\n${c.connectedContext}`
    : "";
  const ref = c.context.trim()
    ? `\n\n---\n${BRAND.name} reference (use ONLY if the question is about ${BRAND.name}, otherwise ignore):\n${c.context}`
    : "";
  return `Question: ${c.question}${files}${connected}${ref}`;
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
  const ctx = (c.connectedContext?.trim() ? c.connectedContext : c.context).trim();
  if (!ctx) {
    return `I don't have anything in memory about "${c.question}".`;
  }
  const cites = c.sourceTitles.length ? ` Sources: ${c.sourceTitles.map((t) => `[${t}]`).join(" ")}.` : "";
  return `Based on the connected sources:\n${ctx.slice(0, 800)}${cites}`;
}
